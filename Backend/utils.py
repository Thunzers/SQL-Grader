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


def evaluate_test_cases(student_result, test_cases, required_keywords=None, student_query=None):
    results = []
    total_score = 0
    max_score = 0
    all_passed = True
    
    # Check required keywords once (applies to all test cases)
    keyword_check = None
    if required_keywords and student_query:
        keyword_check = check_required_keywords(student_query, required_keywords)

    for tc in test_cases:
        max_points = tc.get("points", 0)
        max_score += max_points

        try:
            expected_output = tc.get("expected_output")
            if isinstance(expected_output, str):
                expected_output = json.loads(expected_output)

            # Compare results
            is_passed = True
            error_msg = None

            # Check columns match
            if set(student_result.get("columns", [])) != set(expected_output.get("columns", [])):
                is_passed = False
                error_msg = f"Column mismatch. Expected: {expected_output.get('columns')}, Got: {student_result.get('columns')}"

            # Check row count
            elif student_result.get("row_count") != expected_output.get("row_count"):
                is_passed = False
                error_msg = f"Row count mismatch. Expected: {expected_output.get('row_count')}, Got: {student_result.get('row_count')}"

                # Check row data (convert to set of tuples for comparison)
            elif is_passed:
                try:
                    # Normalize rows to tuples (handle both dict and list formats)
                    def normalize_row(row, columns):
                        if isinstance(row, dict):
                            # If row is dict, extract values in column order
                            return tuple(row.get(col) for col in columns)
                        elif isinstance(row, (list, tuple)):
                            # If row is already list/tuple, convert to tuple
                            return tuple(row)
                        else:
                            # Fallback: wrap in tuple
                            return (row,)

                    columns = student_result.get("columns", [])
                    student_rows = [normalize_row(row, columns) for row in student_result.get("rows", [])]
                    expected_rows = [normalize_row(row, columns) for row in expected_output.get("rows", [])]

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

            # If output matches but keywords are missing, fail the test case
            if is_passed and keyword_check and not keyword_check["passed"]:
                is_passed = False
                missing_str = ", ".join(keyword_check["missing"])
                error_msg = f"Missing required SQL keywords: {missing_str}"

            points_earned = max_points if is_passed else 0
            total_score += points_earned

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

    return {
        "is_correct": all_passed,
        "total_score": total_score,
        "max_score": max_score,
        "results": results
    }
