from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
from database import get_db_connection
from utils import serialize_row, user_can_access_assignment

router = APIRouter()

@router.get("/api/classes")
def get_classes():
    conn = get_db_connection()
    if conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM classes;')
        classes = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(c) for c in classes], status_code=200)
    else:
        return JSONResponse([], status_code=500)

from pydantic import BaseModel

class CategoryCreate(BaseModel):
    name: str

@router.get("/api/categories")
def get_categories():
    """Get all categories from the categories table"""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM categories ORDER BY name")
        categories = cur.fetchall()
        cur.close()
        conn.close()
        return JSONResponse([serialize_row(c) for c in categories], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/api/categories")
def create_category(category: CategoryCreate):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING *", (category.name,))
        new_cat = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return JSONResponse(serialize_row(new_cat), status_code=201)
    except Exception as e:
        if "unique constraint" in str(e).lower():
            return JSONResponse({"error": "Category already exists"}, status_code=400)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/api/categories/{category_id}")
def delete_category(category_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor()
        # Check if used
        cur.execute("SELECT COUNT(*) FROM assignments WHERE category_id = %s", (category_id,))
        if cur.fetchone()[0] > 0:
            return JSONResponse({"error": "Cannot delete category in use by assignments"}, status_code=400)
            
        cur.execute("DELETE FROM categories WHERE category_id = %s RETURNING category_id", (category_id,))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not deleted:
             return JSONResponse({"error": "Category not found"}, status_code=404)
        return JSONResponse({"message": "Category deleted successfully"}, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/api/categories/{category_id}")
def update_category(category_id: int, category: CategoryCreate):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("UPDATE categories SET name = %s WHERE category_id = %s RETURNING *", (category.name, category_id))
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if not updated:
            return JSONResponse({"error": "Category not found"}, status_code=404)
            
        return JSONResponse(serialize_row(updated), status_code=200)
    except Exception as e:
        if "unique constraint" in str(e).lower():
            return JSONResponse({"error": "Category name already exists"}, status_code=400)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/assignments")
def get_assignments(category: str = None, user_id: str = None):
    """
    Strict, fail-closed visibility:
      - no user_id  : unrestricted (internal / admin tooling).
      - admin       : unrestricted.
      - teacher     : only assignments they created OR assignments linked
                      to classes they teach (class_teachers → class_assignments).
      - student     : only is_active assignments linked to classes they are
                      enrolled in (class_students → class_assignments) OR
                      individually assigned (assignment_students).
      - unknown uid / unsupported role : 403 Forbidden (never fall back to "all").
    """
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # -- 1) Resolve role (fail-closed on missing user) ----------------
        user_role = None
        if user_id:
            cur.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return JSONResponse(
                    {"error": f"Unknown user_id '{user_id}'"},
                    status_code=403,
                )
            user_role = row["role"]
            if user_role not in ("student", "teacher", "admin"):
                cur.close(); conn.close()
                return JSONResponse(
                    {"error": f"Unsupported role '{user_role}'"},
                    status_code=403,
                )
            print(f"[/api/assignments] user_id={user_id} role={user_role}")

        # -- 2) Build access + active filter strictly per role ------------
        params = {}
        if user_id:
            params["access_uid"] = user_id
            params["sub_uid"]    = user_id
        if category:
            params["cat_id"] = int(category)

        if user_role == "student":
            access_sql = """
                AND a.assign_id IN (
                    SELECT ca.assign_id
                      FROM class_students cs
                      JOIN class_assignments ca ON ca.class_id = cs.class_id
                     WHERE cs.user_id = %(access_uid)s
                    UNION
                    SELECT asg.assign_id
                      FROM assignment_students asg
                     WHERE asg.user_id = %(access_uid)s
                )
            """
            active_sql = "AND a.is_active = TRUE"
        elif user_role == "teacher":
            access_sql = """
                AND (a.created_by = %(access_uid)s
                     OR a.assign_id IN (
                         SELECT ca.assign_id
                           FROM class_teachers ct
                           JOIN class_assignments ca ON ca.class_id = ct.class_id
                          WHERE ct.user_id = %(access_uid)s
                     ))
            """
            active_sql = ""  # teachers may see their own drafts
        else:
            # admin or no user_id -> unrestricted
            access_sql = ""
            active_sql = ""

        category_sql = "AND a.category_id = %(cat_id)s" if category else ""

        # -- 3) CTE base --------------------------------------------------
        cte_sql = f"""
            WITH AssignInfo AS (
                SELECT a.*, c.name as category_name,
                       COUNT(e.exercise_id) as exercise_count,
                       COALESCE(SUM(e.points), 0) as max_score
                FROM assignments a
                LEFT JOIN categories c ON a.category_id = c.category_id
                LEFT JOIN exercises  e ON a.assign_id   = e.assign_id
                WHERE 1=1
                  {active_sql}
                  {category_sql}
                  {access_sql}
                GROUP BY a.assign_id, c.name
            )
        """

        # -- 4) Projection ------------------------------------------------
        if user_id:
            query = cte_sql + """
                SELECT ai.*,
                       COALESCE(sub.user_score, 0) as user_score,
                       COALESCE(sub.completed_exercises, 0) as completed_exercises
                FROM AssignInfo ai
                LEFT JOIN (
                    SELECT
                        e.assign_id,
                        SUM(s.total_score)     as user_score,
                        COUNT(s.exercise_id)   as completed_exercises
                    FROM (
                        SELECT exercise_id,
                               MAX(total_score) as total_score,
                               bool_or(is_correct) as is_correct
                          FROM submissions
                         WHERE user_id = %(sub_uid)s
                         GROUP BY exercise_id
                    ) s
                    JOIN exercises e ON s.exercise_id = e.exercise_id
                    WHERE s.total_score > 0 OR s.is_correct = TRUE
                    GROUP BY e.assign_id
                ) sub ON ai.assign_id = sub.assign_id
                ORDER BY ai.created_at DESC
            """
        else:
            query = cte_sql + """
                SELECT * FROM AssignInfo
                ORDER BY created_at DESC
            """

        cur.execute(query, params)
        assignments = cur.fetchall()
        cur.close(); conn.close()

        return JSONResponse([serialize_row(a) for a in assignments], status_code=200)
    except Exception as e:
        print(f"Error fetching assignments: {e}")
        try: conn.close()
        except Exception: pass
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/assignments/{assign_id}")
def get_assignment(assign_id: int, user_id: str = None):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Strict access control: hide assignments the caller is not allowed to see.
        if user_id:
            allowed, _role = user_can_access_assignment(cur, user_id, assign_id)
            if not allowed:
                cur.close(); conn.close()
                return JSONResponse({"error": "Forbidden"}, status_code=403)

        if user_id:
            cur.execute("""
                WITH AssignInfo AS (
                    SELECT a.*, c.name as category_name,
                           COUNT(e.exercise_id) as exercise_count,
                           COALESCE(SUM(e.points), 0) as max_score
                    FROM assignments a
                    LEFT JOIN categories c ON a.category_id = c.category_id
                    LEFT JOIN exercises e ON a.assign_id = e.assign_id
                    WHERE a.assign_id = %s AND a.is_active = TRUE
                    GROUP BY a.assign_id, c.name
                )
                SELECT ai.*,
                       COALESCE(sub.user_score, 0) as user_score,
                       COALESCE(sub.completed_exercises, 0) as completed_exercises
                FROM AssignInfo ai
                LEFT JOIN (
                    SELECT 
                        e.assign_id,
                        SUM(s.total_score) as user_score,
                        COUNT(s.exercise_id) as completed_exercises
                    FROM (
                        SELECT exercise_id, MAX(total_score) as total_score, bool_or(is_correct) as is_correct
                        FROM submissions
                        WHERE user_id = %s
                        GROUP BY exercise_id
                    ) s
                    JOIN exercises e ON s.exercise_id = e.exercise_id
                    WHERE s.total_score > 0 OR s.is_correct = TRUE
                    GROUP BY e.assign_id
                ) sub ON ai.assign_id = sub.assign_id
            """, (assign_id, user_id))
        else:
            cur.execute("""
                SELECT a.*, c.name as category_name,
                       (SELECT COUNT(*) FROM exercises e WHERE e.assign_id = a.assign_id) as exercise_count,
                       (SELECT COALESCE(SUM(points), 0) FROM exercises e WHERE e.assign_id = a.assign_id) as max_score
                FROM assignments a
                LEFT JOIN categories c ON a.category_id = c.category_id
                WHERE a.assign_id = %s
            """, (assign_id,))
            
        assignment = cur.fetchone()
        cur.close()
        conn.close()

        if not assignment:
            return JSONResponse({"error": "Assignment not found"}, status_code=404)

        return JSONResponse(serialize_row(assignment), status_code=200)
    except Exception as e:
        print(f"Error fetching assignment: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/assignments/{assign_id}/student-progress")
def get_assignment_student_progress(assign_id: int):
    """Get progress of all students for a specific assignment"""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get assignment details (total exercises, max score)
        cur.execute("""
            SELECT 
                COUNT(exercise_id) as total_exercises,
                COALESCE(SUM(points), 0) as max_score
            FROM exercises
            WHERE assign_id = %s
        """, (assign_id,))
        assignment_stats = cur.fetchone()
        
        # If no exercises, return empty array
        if not assignment_stats or assignment_stats['total_exercises'] == 0:
            cur.close()
            conn.close()
            return JSONResponse([], status_code=200)
            
        # Get students and their progress for this assignment
        cur.execute("""
            SELECT 
                u.user_id,
                u.name as student_name,
                u.surname,
                u.email,
                COALESCE(sub.user_score, 0) as user_score,
                COALESCE(sub.completed_exercises, 0) as completed_exercises,
                %s as total_exercises,
                %s as max_score,
                sub.last_submission_time
            FROM users u
            LEFT JOIN (
                SELECT 
                    s.user_id,
                    SUM(s.total_score) as user_score,
                    COUNT(s.exercise_id) as completed_exercises,
                    MAX(s.last_submission_at) as last_submission_time
                FROM (
                    -- Get highest score and latest submission per exercise per student
                    SELECT 
                        subm.user_id, 
                        subm.exercise_id, 
                        MAX(subm.total_score) as total_score,
                        MAX(subm.submitted_at) as last_submission_at
                    FROM submissions subm
                    JOIN exercises ex ON subm.exercise_id = ex.exercise_id
                    WHERE ex.assign_id = %s
                    GROUP BY subm.user_id, subm.exercise_id
                ) s
                -- Only count >0 scores as completed
                WHERE s.total_score > 0
                GROUP BY s.user_id
            ) sub ON u.user_id = sub.user_id
            WHERE u.role = 'student'
            ORDER BY sub.user_score DESC NULLS LAST, sub.completed_exercises DESC NULLS LAST, u.user_id ASC
        """, (assignment_stats['total_exercises'], assignment_stats['max_score'], assign_id))
        
        progress = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(row) for row in progress], status_code=200)
    except Exception as e:
        print(f"Error fetching student progress: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/api/assignments")
async def create_assignment(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    category_id = data.get("category_id")
    title = data.get("title")
    description = data.get("description", "")
    start_date = data.get("start_date")
    due_date = data.get("due_date")
    max_attempts = data.get("max_attempts", 0)
    is_active = data.get("is_active", True)
    created_by = data.get("created_by")

    if not all([category_id, title]):
        return JSONResponse({"error": "Required fields: category_id, title"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO assignments (category_id, title, description, start_date, due_date, max_attempts, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (category_id, title, description, start_date, due_date, max_attempts, is_active, created_by))
        new_assignment = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "assignment": serialize_row(new_assignment)}, status_code=201)
    except Exception as e:
        print(f"Error creating assignment: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/api/assignments/{assign_id}")
async def update_assignment(assign_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Build update query dynamically
        update_fields = []
        values = []

        if "category_id" in data:
            update_fields.append("category_id = %s")
            values.append(data["category_id"])
        if "title" in data:
            update_fields.append("title = %s")
            values.append(data["title"])
        if "description" in data:
            update_fields.append("description = %s")
            values.append(data["description"])
        if "start_date" in data:
            update_fields.append("start_date = %s")
            values.append(data["start_date"])
        if "due_date" in data:
            update_fields.append("due_date = %s")
            values.append(data["due_date"])
        if "max_attempts" in data:
            update_fields.append("max_attempts = %s")
            values.append(data["max_attempts"])
        if "is_active" in data:
            update_fields.append("is_active = %s")
            values.append(data["is_active"])

        if not update_fields:
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        values.append(assign_id)
        query = f"UPDATE assignments SET {', '.join(update_fields)} WHERE assign_id = %s RETURNING *"

        cur.execute(query, values)
        updated = cur.fetchone()

        if not updated:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Assignment not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "assignment": serialize_row(updated)}, status_code=200)
    except Exception as e:
        print(f"Error updating assignment: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/api/assignments/{assign_id}")
async def delete_assignment(assign_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM assignments WHERE assign_id = %s RETURNING assign_id", (assign_id,))
        deleted = cur.fetchone()

        if not deleted:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Assignment not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "message": "Assignment deleted successfully"}, status_code=200)
    except Exception as e:
        print(f"Error deleting assignment: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)
