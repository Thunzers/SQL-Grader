from datetime import datetime, date, time
from decimal import Decimal
import psycopg2
from database import get_db_connection, DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT
import uuid
import json

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


def evaluate_test_cases(student_result, test_cases, required_keywords=None, student_query=None, exercise_points=0, sandbox_name=None):
    results = []
    total_score = 0
    max_score = exercise_points
    all_passed = True
    
    for tc in test_cases:
        max_points = exercise_points # not used individually anymore, but keep the variable
        
        try:
            is_passed = True
            error_msg = None
            
            golden_query = tc.get("golden_query")
            check_order = tc.get("check_order", False)
            
            if golden_query and sandbox_name:
                # Use server-side query equivalence checking
                try:
                    sc_conn = psycopg2.connect(
                        host=DB_HOST, database=sandbox_name, user=DB_USER, password=DB_PASS, port=DB_PORT
                    )
                    sc_cur = sc_conn.cursor()
                    
                    if check_order:
                        sc_cur.execute("SELECT equivalent, mismatched_positions, message FROM sqlcheck.check_query_equivalence_ordered(%s, %s)", (student_query, golden_query))
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
                        sc_cur.execute("SELECT equivalent, q1_minus_q2_count, q2_minus_q1_count, message FROM sqlcheck.check_query_equivalence(%s, %s)", (student_query, golden_query))
                        res = sc_cur.fetchone()
                        is_passed = res[0]
                        if not is_passed:
                            diff_msg = []
                            msg = res[3]  # message is column 3 in 0-index
                            q1_count = res[1]
                            q2_count = res[2]
                            
                            if q1_count is None or q2_count is None:
                                diff_msg.append(f"เกิดข้อผิดพลาด: {msg}")
                            else:
                                if q1_count > 0: # q1 is student
                                    sc_cur.execute("SELECT row_data FROM sqlcheck.show_query_diff(%s, %s, 'q1_minus_q2', true, 3)", (student_query, golden_query))
                                    extra_rows = [str(r[0]) for r in sc_cur.fetchall()]
                                    diff_msg.append(f"ผลลัพธ์ที่พิมพ์มาเกิน: {extra_rows}")
                                if q2_count > 0: # q2 is expected
                                    sc_cur.execute("SELECT row_data FROM sqlcheck.show_query_diff(%s, %s, 'q2_minus_q1', true, 3)", (student_query, golden_query))
                                    miss_rows = [str(r[0]) for r in sc_cur.fetchall()]
                                    diff_msg.append(f"ผลลัพธ์ที่ขาดหายไป: {miss_rows}")
                                    
                            error_msg = " | ".join(diff_msg) if diff_msg else "ข้อมูลไม่ตรงกัน"
                            
                    sc_cur.close()
                    sc_conn.close()
                except Exception as e:
                    is_passed = False
                    error_msg = f"SQL Equivalence Error: {str(e)}"
                    
            else:
                # Fallback to older JSON serialization approach
                expected_output = tc.get("expected_output")
                if expected_output:
                    if isinstance(expected_output, str):
                        expected_output = json.loads(expected_output)

                    # Check columns match
                    if "columns" in student_result and "columns" in expected_output and set(student_result.get("columns", [])) != set(expected_output.get("columns", [])):
                        is_passed = False
                        error_msg = f"Column mismatch. Expected: {expected_output.get('columns')}, Got: {student_result.get('columns')}"

                    # Check row count
                    elif student_result.get("row_count") != expected_output.get("row_count"):
                        is_passed = False
                        error_msg = f"Row count mismatch. Expected: {expected_output.get('row_count')}, Got: {student_result.get('row_count')}"

                    # Check row data
                    elif is_passed:
                        try:
                            # Normalize rows to tuples
                            def normalize_row(row, columns):
                                if isinstance(row, dict):
                                    return tuple(row.get(col) for col in columns)
                                elif isinstance(row, (list, tuple)):
                                    return tuple(row)
                                else:
                                    return (row,)

                            columns = student_result.get("columns", [])
                            student_rows = [normalize_row(row, columns) for row in student_result.get("rows", [])]
                            expected_rows = [normalize_row(row, columns) for row in expected_output.get("rows", [])]

                            if check_order:
                                if student_rows != expected_rows:
                                    is_passed = False
                                    for i, (s, e) in enumerate(zip(student_rows, expected_rows)):
                                        if s != e:
                                            error_msg = f"Row order mismatch at position {i+1}. Expected: {e}, Got: {s}"
                                            break
                                    else:
                                        error_msg = "Row data mismatch (different lengths after ordering)"
                            else:
                                student_set = set(student_rows)
                                expected_set = set(expected_rows)
                                if student_set != expected_set:
                                    is_passed = False
                                    missing = list(expected_set - student_set)
                                    extra = list(student_set - expected_set)
                                    msg_parts = []
                                    if missing:
                                        msg_parts.append(f"Missing (first 3): {missing[:3]}")
                                    if extra:
                                        msg_parts.append(f"Extra (first 3): {extra[:3]}")
                                    error_msg = "Row data mismatch. " + "; ".join(msg_parts)
                        except Exception as e:
                            is_passed = False
                            error_msg = f"Error comparing rows: {str(e)}"

            # Per-test-case keyword check
            if is_passed and student_query:
                tc_keywords = tc.get("required_keywords") or []
                if isinstance(tc_keywords, str):
                    tc_keywords = json.loads(tc_keywords)
                effective_keywords = tc_keywords if tc_keywords else (required_keywords or [])
                if effective_keywords:
                    keyword_check = check_required_keywords(student_query, effective_keywords)
                    if not keyword_check["passed"]:
                        is_passed = False
                        missing_str = ", ".join(keyword_check["missing"])
                        error_msg = f"Missing required SQL keywords: {missing_str}"

            points_earned = max_points if is_passed else 0

            if not is_passed:
                all_passed = False

            results.append({
                "case_id": tc.get("case_id"),
                "case_name": tc.get("case_name"),
                "is_passed": is_passed,
                "points_earned": points_earned,
                "max_points": max_points,
                "error": error_msg
            })

        except Exception as e:
            all_passed = False
            results.append({
                "case_id": tc.get("case_id"),
                "case_name": tc.get("case_name"),
                "is_passed": False,
                "points_earned": 0,
                "max_points": max_points,
                "error": f"Evaluation error: {str(e)}"
            })

    # All-or-Nothing Scoring
    if all_passed:
        total_score = exercise_points
    else:
        total_score = 0

    return {
        "is_correct": all_passed,
        "total_score": total_score,
        "max_score": max_score,
        "results": results
    }
