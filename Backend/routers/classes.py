from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
from database import get_db_connection
from utils import serialize_row

router = APIRouter()


# ---------- Classes CRUD (minimal) ----------

@router.get("/api/classes")
def list_classes():
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.*,
                   (SELECT COUNT(*) FROM class_students   cs WHERE cs.class_id = c.class_id) AS student_count,
                   (SELECT COUNT(*) FROM class_teachers   ct WHERE ct.class_id = c.class_id) AS teacher_count,
                   (SELECT COUNT(*) FROM class_assignments ca WHERE ca.class_id = c.class_id) AS assignment_count
            FROM classes c
            ORDER BY c.class_id ASC
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/classes")
async def create_class(request: Request):
    data = await request.json()
    code = (data.get("code") or "").strip()
    name = (data.get("name") or "").strip()
    semester = data.get("semester")
    if not code or not name:
        return JSONResponse({"error": "code and name are required"}, status_code=400)
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "INSERT INTO classes (code, name, semester) VALUES (%s, %s, %s) RETURNING *",
            (code, name, semester),
        )
        row = cur.fetchone(); conn.commit()
        cur.close(); conn.close()
        return JSONResponse(serialize_row(row), status_code=201)
    except Exception as e:
        try: conn.rollback(); conn.close()
        except Exception: pass
        if "unique" in str(e).lower():
            return JSONResponse({"error": "Class code already exists"}, status_code=409)
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/api/classes/{class_id}")
def delete_class(class_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM classes WHERE class_id = %s RETURNING class_id", (class_id,))
        deleted = cur.fetchone(); conn.commit()
        cur.close(); conn.close()
        if not deleted:
            return JSONResponse({"error": "Class not found"}, status_code=404)
        return JSONResponse({"success": True}, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ---------- Members of a class ----------

@router.get("/api/classes/{class_id}/students")
def list_class_students(class_id: int):
    """Students currently enrolled in a class."""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT u.user_id, u.name, u.surname, u.email, cs.enrolled_at
            FROM   class_students cs
            JOIN   users u ON u.user_id = cs.user_id AND u.role = 'student'
            WHERE  cs.class_id = %s
            ORDER  BY u.user_id
        """, (class_id,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/classes/{class_id}/teachers")
def list_class_teachers(class_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT u.user_id, u.name, u.surname, u.email, ct.role_in_class
            FROM   class_teachers ct
            JOIN   users u ON u.user_id = ct.user_id AND u.role = 'teacher'
            WHERE  ct.class_id = %s
            ORDER  BY u.user_id
        """, (class_id,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/classes/{class_id}/students")
async def enroll_student(class_id: int, request: Request):
    """Enroll an existing student (users.role='student') into a class."""
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    user_id = (data.get("user_id") or "").strip()
    if not user_id:
        return JSONResponse({"error": "user_id is required"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Validate class exists
        cur.execute("SELECT class_id FROM classes WHERE class_id = %s", (class_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return JSONResponse({"error": "Class not found"}, status_code=404)

        # Validate user exists AND role = 'student'
        cur.execute("SELECT user_id, role FROM users WHERE user_id = %s", (user_id,))
        u = cur.fetchone()
        if not u:
            cur.close(); conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)
        if u["role"] != "student":
            cur.close(); conn.close()
            return JSONResponse(
                {"error": f"User {user_id} has role '{u['role']}', not 'student'"},
                status_code=400,
            )

        # Already enrolled?
        cur.execute(
            "SELECT 1 FROM class_students WHERE class_id = %s AND user_id = %s",
            (class_id, user_id),
        )
        if cur.fetchone():
            cur.close(); conn.close()
            return JSONResponse({"error": "Student already enrolled in this class"}, status_code=409)

        cur.execute(
            """INSERT INTO class_students (class_id, user_id)
               VALUES (%s, %s) RETURNING class_id, user_id, enrolled_at""",
            (class_id, user_id),
        )
        row = cur.fetchone()
        # Keep per-teacher roster in sync: every current teacher of
        # this class gets the student in their teacher_students list.
        cur.execute(
            """INSERT INTO teacher_students (teacher_id, student_id)
               SELECT ct.user_id, %s FROM class_teachers ct
               WHERE ct.class_id = %s
               ON CONFLICT DO NOTHING""",
            (user_id, class_id),
        )
        conn.commit()
        cur.close(); conn.close()
        return JSONResponse(
            {"success": True, "enrollment": serialize_row(row)},
            status_code=201,
        )
    except Exception as e:
        try: conn.rollback(); conn.close()
        except Exception: pass
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/api/classes/{class_id}/students/{user_id}")
def unenroll_student(class_id: int, user_id: str):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM class_students WHERE class_id = %s AND user_id = %s RETURNING user_id",
            (class_id, user_id),
        )
        deleted = cur.fetchone(); conn.commit()
        cur.close(); conn.close()
        if not deleted:
            return JSONResponse({"error": "Enrollment not found"}, status_code=404)
        return JSONResponse({"success": True}, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/classes/{class_id}/teachers")
async def add_teacher(class_id: int, request: Request):
    data = await request.json()
    user_id = (data.get("user_id") or "").strip()
    role_in_class = data.get("role_in_class", "owner")
    if not user_id:
        return JSONResponse({"error": "user_id is required"}, status_code=400)

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
        r = cur.fetchone()
        if not r:
            cur.close(); conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)
        if r[0] != "teacher":
            cur.close(); conn.close()
            return JSONResponse({"error": f"User {user_id} is not a teacher"}, status_code=400)

        cur.execute(
            """INSERT INTO class_teachers (class_id, user_id, role_in_class)
               VALUES (%s, %s, %s) ON CONFLICT DO NOTHING""",
            (class_id, user_id, role_in_class),
        )
        conn.commit(); cur.close(); conn.close()
        return JSONResponse({"success": True}, status_code=201)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/classes/{class_id}/assignments")
def list_class_assignments(class_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT a.assign_id, a.title, a.description, a.is_active,
                   a.start_date, a.due_date, a.created_by, a.category_id,
                   cat.name AS category_name
            FROM class_assignments ca
            JOIN assignments a ON a.assign_id = ca.assign_id
            LEFT JOIN categories cat ON cat.category_id = a.category_id
            WHERE ca.class_id = %s
            ORDER BY a.assign_id DESC
            """,
            (class_id,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/classes/{class_id}/assignments")
async def link_assignment_to_class(class_id: int, request: Request):
    data = await request.json()
    assign_id = data.get("assign_id")
    if not assign_id:
        return JSONResponse({"error": "assign_id is required"}, status_code=400)
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM classes WHERE class_id = %s", (class_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return JSONResponse({"error": "Class not found"}, status_code=404)
        cur.execute("SELECT 1 FROM assignments WHERE assign_id = %s", (assign_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return JSONResponse({"error": "Assignment not found"}, status_code=404)
        cur.execute(
            "INSERT INTO class_assignments (class_id, assign_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (class_id, assign_id),
        )
        conn.commit(); cur.close(); conn.close()
        return JSONResponse({"success": True}, status_code=201)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/api/classes/{class_id}/assignments/{assign_id}")
def unlink_assignment_from_class(class_id: int, assign_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM class_assignments WHERE class_id = %s AND assign_id = %s RETURNING class_id",
            (class_id, assign_id),
        )
        deleted = cur.fetchone(); conn.commit()
        cur.close(); conn.close()
        if not deleted:
            return JSONResponse({"error": "Link not found"}, status_code=404)
        return JSONResponse({"success": True}, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ---------- Core queries requested (Req 1-3) ----------

@router.get("/api/students/{student_id}/assignments")
def get_student_assignments(student_id: str):
    """Req #3: exams the student must complete (class + individual)."""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT a.assign_id, a.title, a.description,
                   a.start_date, a.due_date, a.max_attempts,
                   src.source, src.class_code,
                   STRING_AGG(DISTINCT t.name || ' ' || t.surname, ', ') AS teachers
            FROM assignments a
            JOIN (
                SELECT ca.assign_id, 'class'::text AS source,
                       c.class_id, c.code AS class_code
                FROM class_students cs
                JOIN classes c ON c.class_id = cs.class_id
                JOIN class_assignments ca ON ca.class_id = c.class_id
                JOIN users u ON u.user_id = cs.user_id AND u.role = 'student'
                WHERE cs.user_id = %s

                UNION

                SELECT asg.assign_id, 'individual'::text AS source,
                       NULL::int AS class_id, NULL::varchar AS class_code
                FROM assignment_students asg
                JOIN users u ON u.user_id = asg.user_id AND u.role = 'student'
                WHERE asg.user_id = %s
            ) src ON src.assign_id = a.assign_id
            LEFT JOIN class_teachers ct ON ct.class_id = src.class_id
            LEFT JOIN users t ON t.user_id = ct.user_id AND t.role = 'teacher'
            WHERE a.is_active = TRUE
              AND (a.start_date IS NULL OR a.start_date <= now())
            GROUP BY a.assign_id, a.title, a.description, a.start_date,
                     a.due_date, a.max_attempts, src.source, src.class_code
            ORDER BY a.due_date NULLS LAST, a.assign_id
            """,
            (student_id, student_id),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/students/{student_id}/teachers")
def get_teachers_of_student(student_id: str):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT DISTINCT t.user_id, t.name, t.surname,
                   c.class_id, c.code AS class_code, c.name AS class_name,
                   ct.role_in_class
            FROM class_students cs
            JOIN class_teachers ct ON ct.class_id = cs.class_id
            JOIN users t ON t.user_id = ct.user_id AND t.role = 'teacher'
            JOIN users s ON s.user_id = cs.user_id AND s.role = 'student'
            JOIN classes c ON c.class_id = cs.class_id
            WHERE cs.user_id = %s
            ORDER BY c.class_id, t.user_id
            """,
            (student_id,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/assignments/{assign_id}/teachers")
def get_teachers_of_assignment(assign_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT DISTINCT t.user_id, t.name, t.surname,
                   c.class_id, c.code AS class_code,
                   ct.role_in_class
            FROM class_assignments ca
            JOIN class_teachers ct ON ct.class_id = ca.class_id
            JOIN users t ON t.user_id = ct.user_id AND t.role = 'teacher'
            JOIN classes c ON c.class_id = ca.class_id
            WHERE ca.assign_id = %s
            ORDER BY c.class_id, t.user_id
            """,
            (assign_id,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/teachers/{teacher_id}/students")
def get_students_of_teacher(teacher_id: str):
    """Teacher's private roster (teacher_students)."""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT s.user_id, s.name, s.surname, s.email, ts.added_at
            FROM   teacher_students ts
            JOIN   users s ON s.user_id = ts.student_id AND s.role = 'student'
            JOIN   users t ON t.user_id = ts.teacher_id AND t.role = 'teacher'
            WHERE  ts.teacher_id = %s
            ORDER  BY ts.added_at DESC, s.user_id
            """,
            (teacher_id,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/teachers/{teacher_id}/students/available")
def get_available_students_for_teacher(teacher_id: str):
    """All registered students NOT yet in this teacher's roster
    (used by the "add to my roster" picker)."""
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT s.user_id, s.name, s.surname, s.email
            FROM   users s
            WHERE  s.role = 'student'
              AND  NOT EXISTS (
                  SELECT 1 FROM teacher_students ts
                  WHERE  ts.teacher_id = %s
                    AND  ts.student_id = s.user_id
              )
            ORDER  BY s.user_id
            """,
            (teacher_id,),
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return JSONResponse([serialize_row(r) for r in rows], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/teachers/{teacher_id}/students")
async def add_student_to_teacher_roster(teacher_id: str, request: Request):
    data = await request.json()
    student_id = (data.get("student_id") or "").strip()
    if not student_id:
        return JSONResponse({"error": "student_id is required"}, status_code=400)
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT role FROM users WHERE user_id = %s", (teacher_id,))
        t = cur.fetchone()
        if not t or t["role"] != "teacher":
            cur.close(); conn.close()
            return JSONResponse({"error": "teacher_id is not a teacher"}, status_code=400)
        cur.execute("SELECT role FROM users WHERE user_id = %s", (student_id,))
        s = cur.fetchone()
        if not s or s["role"] != "student":
            cur.close(); conn.close()
            return JSONResponse({"error": "student_id is not a student"}, status_code=400)
        cur.execute(
            "INSERT INTO teacher_students (teacher_id, student_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING RETURNING teacher_id",
            (teacher_id, student_id),
        )
        inserted = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        if not inserted:
            return JSONResponse({"error": "Already in roster"}, status_code=409)
        return JSONResponse({"success": True}, status_code=201)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/api/teachers/{teacher_id}/students/{student_id}")
def remove_student_from_teacher_roster(teacher_id: str, student_id: str):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM teacher_students WHERE teacher_id = %s AND student_id = %s "
            "RETURNING teacher_id",
            (teacher_id, student_id),
        )
        deleted = cur.fetchone(); conn.commit()
        cur.close(); conn.close()
        if not deleted:
            return JSONResponse({"error": "Not in roster"}, status_code=404)
        return JSONResponse({"success": True}, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
