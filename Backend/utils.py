from datetime import datetime, date, time
from decimal import Decimal
import psycopg2
from database import get_db_connection, DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT
import uuid
import json

def get_user_role(cur, user_id):
    """Return users.role for user_id, or None if not found."""
    if not user_id:
        return None
    cur.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
    r = cur.fetchone()
    if not r:
        return None
    # support both RealDictCursor and tuple cursor
    return r["role"] if isinstance(r, dict) or hasattr(r, "keys") else r[0]


def user_can_access_assignment(cur, user_id, assign_id):
    """
    Strict access control for an assignment, mirroring /api/assignments
    list visibility rules:
      - admin / unknown role : full access (returns True)
      - teacher              : created the assignment OR teaches a class
                               that the assignment is linked to
      - student              : assignment is active AND linked to a class
                               they are enrolled in, OR directly assigned
                               via assignment_students
    Returns (allowed: bool, role: str|None).
    """
    role = get_user_role(cur, user_id)
    if role in (None, "admin"):
        return True, role

    if role == "teacher":
        cur.execute(
            """
            SELECT 1
            FROM assignments a
            WHERE a.assign_id = %s
              AND (a.created_by = %s
                   OR EXISTS (
                       SELECT 1
                       FROM class_teachers ct
                       JOIN class_assignments ca ON ca.class_id = ct.class_id
                       WHERE ct.user_id = %s
                         AND ca.assign_id = a.assign_id
                   ))
            LIMIT 1
            """,
            (assign_id, user_id, user_id),
        )
        return cur.fetchone() is not None, role

    if role == "student":
        cur.execute(
            """
            SELECT 1
            FROM assignments a
            WHERE a.assign_id = %s
              AND a.is_active = TRUE
              AND (EXISTS (
                       SELECT 1
                       FROM class_students cs
                       JOIN class_assignments ca ON ca.class_id = cs.class_id
                       WHERE cs.user_id = %s
                         AND ca.assign_id = a.assign_id
                   )
                   OR EXISTS (
                       SELECT 1
                       FROM assignment_students asg
                       WHERE asg.user_id = %s
                         AND asg.assign_id = a.assign_id
                   ))
            LIMIT 1
            """,
            (assign_id, user_id, user_id),
        )
        return cur.fetchone() is not None, role

    return False, role


def serialize_row(row):
    """Helper function to serialize database row"""
    if not row:
        return None
    r = dict(row)
    for k, v in list(r.items()):
        if isinstance(v, (datetime, date, time)):
            r[k] = v.isoformat()
        elif isinstance(v, Decimal):
            try:
                r[k] = float(v)
            except Exception:
                r[k] = str(v)
    return r

def run_sql_on_sandbox(schema_sql: str, seed_sql: str, query: str):
    """
    Run SQL query on a temporary sandbox and return results
    """
    # สร้าง sandbox database ที่มีชื่อเฉพาะ 
    sandbox_name = f"sandbox_{uuid.uuid4().hex[:8]}"

    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}

    try:
        conn.autocommit = True
        cur = conn.cursor()

        # สร้าง sandbox database
        cur.execute(f'CREATE DATABASE "{sandbox_name}"')
        cur.close()
        conn.close()

        # เชื่อมต่อ sandbox
        sandbox_conn = psycopg2.connect(
            host=DB_HOST, database=sandbox_name, user=DB_USER, password=DB_PASS, port=DB_PORT
        )
        sandbox_cur = sandbox_conn.cursor()

        # Run schema SQL
        if schema_sql:
            sandbox_cur.execute(schema_sql)
            sandbox_conn.commit()

        # Run seed SQL
        if seed_sql:
            sandbox_cur.execute(seed_sql)
            sandbox_conn.commit()

        # Run query
        sandbox_cur.execute(query)

        if sandbox_cur.description:
            # Get column names
            columns = [desc[0] for desc in sandbox_cur.description]
            
            # Get rows
            rows = sandbox_cur.fetchall()
        else:

            columns = ["Message"]
            rows = [("Executed successfully.",)]

        # Convert to serializable format (simple version)
        serialized_rows = []
        for row in rows:
            serialized_row = []
            for val in row:
                if isinstance(val, (datetime, date, time)):
                    serialized_row.append(val.isoformat())
                elif isinstance(val, Decimal):
                    serialized_row.append(float(val))
                else:
                    serialized_row.append(val)
            serialized_rows.append(serialized_row)

        result = {
            "columns": columns,
            "rows": serialized_rows,
            "row_count": len(rows)
        }

        sandbox_cur.close()
        sandbox_conn.close()

    except Exception as e:
        result = {"error": str(e)}

    finally:
        # Drop sandbox database
        try:
            cleanup_conn = psycopg2.connect(
                host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT
            )
            cleanup_conn.autocommit = True
            cleanup_cur = cleanup_conn.cursor()

            # สั่งปิด connection ของ sandbox
            cleanup_cur.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{sandbox_name}'
            """)

            # Drop sandbox
            cleanup_cur.execute(f'DROP DATABASE IF EXISTS "{sandbox_name}"')
            cleanup_cur.close()
            cleanup_conn.close()
        except Exception as cleanup_error:
            print(f"Error cleaning up sandbox: {cleanup_error}")

    return result

def execute_query_on_persistent_sandbox(sandbox_name: str, schema_sql: str, seed_sql: str, query: str):
    """
    Run SQL query on a persistent sandbox. 
    Creates the database and runs seed data ONLY if it doesn't already exist.
    """
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}

    db_created = False
    try:
        conn.autocommit = True
        cur = conn.cursor()

        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (sandbox_name,))
        exists = cur.fetchone()

        if not exists:
            cur.execute(f'CREATE DATABASE "{sandbox_name}"')
            db_created = True

        cur.close()
        conn.close()

        sandbox_conn = psycopg2.connect(
            host=DB_HOST, database=sandbox_name, user=DB_USER, password=DB_PASS, port=DB_PORT
        )
        sandbox_cur = sandbox_conn.cursor()

        if db_created:
            if schema_sql:
                sandbox_cur.execute(schema_sql)
                sandbox_conn.commit()

            if seed_sql:
                sandbox_cur.execute(seed_sql)
                sandbox_conn.commit()
                
            # Install sqlcheck functions into the sandbox database
            from install_sqlcheck import SQLCHECK_FUNCTIONS
            try:
                sandbox_cur.execute(SQLCHECK_FUNCTIONS)
                sandbox_conn.commit()
            except Exception as func_err:
                print(f"Error installing sqlcheck functions in sandbox: {func_err}")
                sandbox_conn.rollback()

        # Run query
        sandbox_cur.execute(query)
        sandbox_conn.commit()

        if sandbox_cur.description:
            columns = [desc[0] for desc in sandbox_cur.description]
            rows = sandbox_cur.fetchall()
        else:
            columns = ["Message"]
            rows = [("Executed successfully.",)]

        serialized_rows = []
        for row in rows:
            serialized_row = []
            for val in row:
                if isinstance(val, (datetime, date, time)):
                    serialized_row.append(val.isoformat())
                elif isinstance(val, Decimal):
                    serialized_row.append(float(val))
                else:
                    serialized_row.append(val)
            serialized_rows.append(serialized_row)

        result = {
            "columns": columns,
            "rows": serialized_rows,
            "row_count": len(rows)
        }

        sandbox_cur.close()
        sandbox_conn.close()

    except Exception as e:
        result = {"error": str(e)}

    return result

def drop_persistent_sandbox(sandbox_name: str):
    """
    Drops a persistent sandbox database.
    """
    try:
        cleanup_conn = psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT
        )
        cleanup_conn.autocommit = True
        cleanup_cur = cleanup_conn.cursor()

        cleanup_cur.execute(f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{sandbox_name}'
        """)

        cleanup_cur.execute(f'DROP DATABASE IF EXISTS "{sandbox_name}"')
        cleanup_cur.close()
        cleanup_conn.close()
        return True
    except Exception as cleanup_error:
        print(f"Error cleaning up sandbox {sandbox_name}: {cleanup_error}")
        return False

import re

def check_required_keywords(query, required_keywords):
    """
    Check if the student's SQL query contains all required keywords.
    Returns { passed: bool, missing: list }
    """
    if not required_keywords:
        return {"passed": True, "missing": []}
    
    # Normalize query: uppercase, collapse whitespace
    normalized = re.sub(r'\s+', ' ', query.upper().strip())
    
    missing = []
    for kw in required_keywords:
        # แปลง SQL ให้เป็น format เดียวกัน
        kw_upper = re.sub(r'\s+', ' ', kw.upper().strip())
        if kw_upper not in normalized:
            missing.append(kw)
    
    return {"passed": len(missing) == 0, "missing": missing}


def evaluate_golden_query(student_query, golden_query, check_order=False, required_keywords=None, exercise_points=0, sandbox_name=None):
    """
    Evaluate a student's SQL query against a golden (expected) query using
    the sqlcheck extension for equivalence checking.

    Returns the same shape as the old evaluate_test_cases for backward
    compatibility with the frontend:
      { is_correct, total_score, max_score, results: [...] }
    """
    max_score = exercise_points
    is_passed = True
    error_msg = None

    try:
        if not golden_query:
            return {
                "is_correct": False,
                "total_score": 0,
                "max_score": max_score,
                "results": [{
                    "case_name": "Golden Query Equivalence",
                    "is_passed": False,
                    "points_earned": 0,
                    "max_points": max_score,
                    "error": "No golden query defined for this exercise"
                }]
            }

        if not sandbox_name:
            return {
                "is_correct": False,
                "total_score": 0,
                "max_score": max_score,
                "results": [{
                    "case_name": "Golden Query Equivalence",
                    "is_passed": False,
                    "points_earned": 0,
                    "max_points": max_score,
                    "error": "No sandbox available for equivalence check"
                }]
            }

        # Run sqlcheck equivalence on the sandbox
        try:
            sc_conn = psycopg2.connect(
                host=DB_HOST, database=sandbox_name, user=DB_USER, password=DB_PASS, port=DB_PORT
            )
            sc_cur = sc_conn.cursor()
            sc_cur.execute("SET statement_timeout = '10s'")

            if check_order:
                sc_cur.execute(
                    "SELECT equivalent, mismatched_positions, message "
                    "FROM sqlcheck.check_query_equivalence_ordered(%s, %s)",
                    (student_query, golden_query),
                )
                res = sc_cur.fetchone()
                is_passed = res[0]
                if not is_passed:
                    msg = res[2] or "ข้อมูลต่างกัน หรือเกิดข้อผิดพลาด"
                    err_val = res[1]
                    if err_val is not None:
                        error_msg = f"ผิดพลาด: ลำดับแถวไม่ตรงกัน {err_val} แถว"
                    else:
                        error_msg = f"ผิดพลาด: {msg}"
            else:
                sc_cur.execute(
                    "SELECT equivalent, q1_minus_q2_count, q2_minus_q1_count, message "
                    "FROM sqlcheck.check_query_equivalence(%s, %s)",
                    (student_query, golden_query),
                )
                res = sc_cur.fetchone()
                is_passed = res[0]
                if not is_passed:
                    diff_msg = []
                    msg = res[3]
                    q1_count = res[1]
                    q2_count = res[2]

                    if q1_count is None or q2_count is None:
                        diff_msg.append(f"เกิดข้อผิดพลาด: {msg}")
                    else:
                        if q1_count > 0:
                            sc_cur.execute(
                                "SELECT row_data FROM sqlcheck.show_query_diff(%s, %s, 'q1_minus_q2', true, 3)",
                                (student_query, golden_query),
                            )
                            extra_rows = [str(r[0]) for r in sc_cur.fetchall()]
                            diff_msg.append(f"ผลลัพธ์ที่พิมพ์มาเกิน: {extra_rows}")
                        if q2_count > 0:
                            sc_cur.execute(
                                "SELECT row_data FROM sqlcheck.show_query_diff(%s, %s, 'q2_minus_q1', true, 3)",
                                (student_query, golden_query),
                            )
                            miss_rows = [str(r[0]) for r in sc_cur.fetchall()]
                            diff_msg.append(f"ผลลัพธ์ที่ขาดหายไป: {miss_rows}")

                    error_msg = " | ".join(diff_msg) if diff_msg else "ข้อมูลไม่ตรงกัน"

            sc_cur.close()
            sc_conn.close()
        except Exception as e:
            is_passed = False
            error_msg = f"SQL Equivalence Error: {str(e)}"

        # Keyword check
        if is_passed and student_query and required_keywords:
            keyword_check = check_required_keywords(student_query, required_keywords)
            if not keyword_check["passed"]:
                is_passed = False
                missing_str = ", ".join(keyword_check["missing"])
                error_msg = f"Missing required SQL keywords: {missing_str}"

    except Exception as e:
        is_passed = False
        error_msg = f"Evaluation error: {str(e)}"

    total_score = exercise_points if is_passed else 0

    return {
        "is_correct": is_passed,
        "total_score": total_score,
        "max_score": max_score,
        "results": [{
            "case_name": "Golden Query Equivalence",
            "is_passed": is_passed,
            "points_earned": total_score,
            "max_points": max_score,
            "error": error_msg
        }]
    }
