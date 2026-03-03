from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
from database import get_db_connection
from utils import serialize_row

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

@router.get("/api/categories")
def get_categories():
    """Get distinct categories from assignments"""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT category FROM assignments ORDER BY category")
        categories = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()

        # Add default categories if empty
        if not categories:
            categories = ["SELECT", "JOIN", "GROUP BY", "Subquery", "DDL", "DML"]

        return JSONResponse(categories, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/assignments")
def get_assignments(category: str = None, student_id: str = None):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Base CTE to get assignment info + total max score from exercises
        cte_sql = """
            WITH AssignInfo AS (
                SELECT a.*,
                       COUNT(e.exercise_id) as exercise_count,
                       COALESCE(SUM(e.points), 0) as max_score
                FROM assignments a
                LEFT JOIN exercises e ON a.assign_id = e.assign_id
                WHERE a.is_active = TRUE
                {category_filter}
                GROUP BY a.assign_id
            )
        """
        
        # If student_id is provided, calculate their progress
        if student_id:
            query = cte_sql + """
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
                    -- Get highest score per exercise for this student
                    SELECT exercise_id, MAX(total_score) as total_score, bool_or(is_correct) as is_correct
                    FROM submissions
                    WHERE student_id = %s
                    GROUP BY exercise_id
                ) s
                JOIN exercises e ON s.exercise_id = e.exercise_id
                -- Only count exercises where they got some points or completed them
                WHERE s.total_score > 0 OR s.is_correct = TRUE
                GROUP BY e.assign_id
            ) sub ON ai.assign_id = sub.assign_id
            ORDER BY ai.created_at DESC
            """
            
            category_filter = "AND a.category = %s" if category else ""
            query = query.format(category_filter=category_filter)
            
            params = [student_id]
            if category:
                params.insert(0, category)
                
            cur.execute(query, tuple(params))
        else:
            query = cte_sql + """
            SELECT * FROM AssignInfo
            ORDER BY created_at DESC
            """
            
            category_filter = "AND a.category = %s" if category else ""
            query = query.format(category_filter=category_filter)
            
            if category:
                cur.execute(query, (category,))
            else:
                cur.execute(query)

        assignments = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(a) for a in assignments], status_code=200)
    except Exception as e:
        print(f"Error fetching assignments: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/assignments/{assign_id}")
def get_assignment(assign_id: int, student_id: str = None):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if student_id:
            cur.execute("""
                WITH AssignInfo AS (
                    SELECT a.*,
                           COUNT(e.exercise_id) as exercise_count,
                           COALESCE(SUM(e.points), 0) as max_score
                    FROM assignments a
                    LEFT JOIN exercises e ON a.assign_id = e.assign_id
                    WHERE a.assign_id = %s
                    GROUP BY a.assign_id
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
                        WHERE student_id = %s
                        GROUP BY exercise_id
                    ) s
                    JOIN exercises e ON s.exercise_id = e.exercise_id
                    WHERE s.total_score > 0 OR s.is_correct = TRUE
                    GROUP BY e.assign_id
                ) sub ON ai.assign_id = sub.assign_id
            """, (assign_id, student_id))
        else:
            cur.execute("""
                SELECT a.*,
                       (SELECT COUNT(*) FROM exercises e WHERE e.assign_id = a.assign_id) as exercise_count,
                       (SELECT COALESCE(SUM(points), 0) FROM exercises e WHERE e.assign_id = a.assign_id) as max_score
                FROM assignments a
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
                u.student_id,
                u.name as student_name,
                u.email,
                COALESCE(sub.user_score, 0) as user_score,
                COALESCE(sub.completed_exercises, 0) as completed_exercises,
                %s as total_exercises,
                %s as max_score,
                sub.last_submission_time
            FROM users u
            LEFT JOIN (
                SELECT 
                    s.student_id,
                    SUM(s.total_score) as user_score,
                    COUNT(s.exercise_id) as completed_exercises,
                    MAX(s.last_submission_at) as last_submission_time
                FROM (
                    -- Get highest score and latest submission per exercise per student
                    SELECT 
                        subm.student_id, 
                        subm.exercise_id, 
                        MAX(subm.total_score) as total_score,
                        MAX(subm.submitted_at) as last_submission_at
                    FROM submissions subm
                    JOIN exercises ex ON subm.exercise_id = ex.exercise_id
                    WHERE ex.assign_id = %s
                    GROUP BY subm.student_id, subm.exercise_id
                ) s
                -- Only count >0 scores as completed
                WHERE s.total_score > 0
                GROUP BY s.student_id
            ) sub ON u.student_id = sub.student_id
            WHERE u.role = 'student'
            ORDER BY sub.user_score DESC NULLS LAST, sub.completed_exercises DESC NULLS LAST, u.student_id ASC
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

    category = data.get("category")
    title = data.get("title")
    description = data.get("description", "")
    start_date = data.get("start_date")
    due_date = data.get("due_date")
    max_attempts = data.get("max_attempts", 0)
    is_active = data.get("is_active", True)
    created_by = data.get("created_by")

    if not all([category, title]):
        return JSONResponse({"error": "Required fields: category, title"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO assignments (category, title, description, start_date, due_date, max_attempts, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (category, title, description, start_date, due_date, max_attempts, is_active, created_by))
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

        if "category" in data:
            update_fields.append("category = %s")
            values.append(data["category"])
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
