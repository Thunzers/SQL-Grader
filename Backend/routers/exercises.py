from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
from database import get_db_connection
from utils import serialize_row, run_sql_on_sandbox, evaluate_test_cases
import json

router = APIRouter()

# Get exercises for an assignment
@router.get("/api/assignments/{assign_id}/exercises")
def get_exercises(assign_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT e.*, d.name as dataset_name
            FROM exercises e
            LEFT JOIN datasets d ON e.dataset_id = d.dataset_id
            WHERE e.assign_id = %s
            ORDER BY e.order_num ASC, e.exercise_id ASC
        """, (assign_id,))
        exercises = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(ex) for ex in exercises], status_code=200)
    except Exception as e:
        print(f"Error fetching exercises: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# Get single exercise
@router.get("/api/exercises/{exercise_id}")
def get_exercise(exercise_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT e.*, d.name as dataset_name, d.schema_sql, d.seed_data_sql
            FROM exercises e
            LEFT JOIN datasets d ON e.dataset_id = d.dataset_id
            WHERE e.exercise_id = %s
        """, (exercise_id,))
        exercise = cur.fetchone()
        cur.close()
        conn.close()

        if not exercise:
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        return JSONResponse(serialize_row(exercise), status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Create exercise
@router.post("/api/assignments/{assign_id}/exercises")
async def create_exercise(assign_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    title = data.get("title")
    description = data.get("description")
    expected_query = data.get("expected_query")
    dataset_id = data.get("dataset_id")
    points = data.get("points", 10)
    difficulty = data.get("difficulty", "medium")
    order_num = data.get("order_num", 0)
    hint = data.get("hint")
    show_solution = data.get("show_solution", False)

    if not all([title, description, expected_query]):
        return JSONResponse({"error": "Required fields: title, description, expected_query"}, status_code=400)

    if difficulty not in ["easy", "medium", "hard"]:
        return JSONResponse({"error": "difficulty must be: easy, medium, or hard"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify assignment exists
        cur.execute("SELECT assign_id FROM assignments WHERE assign_id = %s", (assign_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return JSONResponse({"error": "Assignment not found"}, status_code=404)

        cur.execute("""
            INSERT INTO exercises (assign_id, dataset_id, title, description, expected_query, points, difficulty, order_num, hint, show_solution)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (assign_id, dataset_id, title, description, expected_query, points, difficulty, order_num, hint, show_solution))
        new_exercise = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "exercise": serialize_row(new_exercise)}, status_code=201)
    except Exception as e:
        print(f"Error creating exercise: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Update exercise
@router.put("/api/exercises/{exercise_id}")
async def update_exercise(exercise_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        update_fields = []
        values = []

        if "title" in data:
            update_fields.append("title = %s")
            values.append(data["title"])
        if "description" in data:
            update_fields.append("description = %s")
            values.append(data["description"])
        if "expected_query" in data:
            update_fields.append("expected_query = %s")
            values.append(data["expected_query"])
        if "dataset_id" in data:
            update_fields.append("dataset_id = %s")
            values.append(data["dataset_id"])
        if "points" in data:
            update_fields.append("points = %s")
            values.append(data["points"])
        if "difficulty" in data:
            if data["difficulty"] not in ["easy", "medium", "hard"]:
                return JSONResponse({"error": "difficulty must be: easy, medium, or hard"}, status_code=400)
            update_fields.append("difficulty = %s")
            values.append(data["difficulty"])
        if "order_num" in data:
            update_fields.append("order_num = %s")
            values.append(data["order_num"])
        if "hint" in data:
            update_fields.append("hint = %s")
            values.append(data["hint"])
        if "show_solution" in data:
            update_fields.append("show_solution = %s")
            values.append(data["show_solution"])

        if not update_fields:
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        values.append(exercise_id)
        query = f"UPDATE exercises SET {', '.join(update_fields)} WHERE exercise_id = %s RETURNING *"

        cur.execute(query, values)
        updated = cur.fetchone()

        if not updated:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "exercise": serialize_row(updated)}, status_code=200)
    except Exception as e:
        print(f"Error updating exercise: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Delete exercise
@router.delete("/api/exercises/{exercise_id}")
async def delete_exercise(exercise_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM exercises WHERE exercise_id = %s RETURNING exercise_id", (exercise_id,))
        deleted = cur.fetchone()

        if not deleted:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "message": "Exercise deleted successfully"}, status_code=200)
    except Exception as e:
        print(f"Error deleting exercise: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Get test cases for an exercise
@router.get("/api/exercises/{exercise_id}/test-cases")
def get_test_cases(exercise_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT * FROM test_cases
            WHERE exercise_id = %s
            ORDER BY case_id ASC
        """, (exercise_id,))
        test_cases = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(tc) for tc in test_cases], status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Create test case
@router.post("/api/exercises/{exercise_id}/test-cases")
async def create_test_case(exercise_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    case_name = data.get("case_name", "Test Case")
    expected_output = data.get("expected_output")
    points = data.get("points", 1)
    is_hidden = data.get("is_hidden", False)

    if not expected_output:
        return JSONResponse({"error": "expected_output is required"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify exercise exists
        cur.execute("SELECT exercise_id FROM exercises WHERE exercise_id = %s", (exercise_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        # Convert expected_output to JSON string if it's a dict
        if isinstance(expected_output, dict):
            expected_output_json = json.dumps(expected_output)
        else:
            expected_output_json = expected_output

        cur.execute("""
            INSERT INTO test_cases (exercise_id, case_name, expected_output, points, is_hidden)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (exercise_id, case_name, expected_output_json, points, is_hidden))
        new_test_case = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "test_case": serialize_row(new_test_case)}, status_code=201)
    except Exception as e:
        print(f"Error creating test case: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Update test case
@router.put("/api/test-cases/{case_id}")
async def update_test_case(case_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        update_fields = []
        values = []

        if "case_name" in data:
            update_fields.append("case_name = %s")
            values.append(data["case_name"])
        if "expected_output" in data:
            update_fields.append("expected_output = %s")
            if isinstance(data["expected_output"], dict):
                values.append(json.dumps(data["expected_output"]))
            else:
                values.append(data["expected_output"])
        if "points" in data:
            update_fields.append("points = %s")
            values.append(data["points"])
        if "is_hidden" in data:
            update_fields.append("is_hidden = %s")
            values.append(data["is_hidden"])

        if not update_fields:
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        values.append(case_id)
        query = f"UPDATE test_cases SET {', '.join(update_fields)} WHERE case_id = %s RETURNING *"

        cur.execute(query, values)
        updated = cur.fetchone()

        if not updated:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Test case not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "test_case": serialize_row(updated)}, status_code=200)
    except Exception as e:
        print(f"Error updating test case: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Delete test case
@router.delete("/api/test-cases/{case_id}")
async def delete_test_case(case_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM test_cases WHERE case_id = %s RETURNING case_id", (case_id,))
        deleted = cur.fetchone()

        if not deleted:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Test case not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "message": "Test case deleted"}, status_code=200)
    except Exception as e:
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Run SQL query (for testing)
@router.post("/api/run-sql")
async def run_sql(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    query = data.get("query")
    dataset_id = data.get("dataset_id")
    schema_sql = data.get("schema_sql", "")
    # Accept both seed_sql and seed_data_sql for compatibility
    seed_sql = data.get("seed_sql") or data.get("seed_data_sql", "")

    if not query:
        return JSONResponse({"error": "query is required"}, status_code=400)

    # If dataset_id provided, fetch schema and seed from database
    if dataset_id:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT schema_sql, seed_data_sql FROM datasets WHERE dataset_id = %s", (dataset_id,))
            dataset = cur.fetchone()
            cur.close()
            conn.close()

            if dataset:
                schema_sql = dataset["schema_sql"] or ""
                seed_sql = dataset["seed_data_sql"] or ""

    result = run_sql_on_sandbox(schema_sql, seed_sql, query)

    if "error" in result:
        return JSONResponse({"success": False, "error": result["error"]}, status_code=400)

    # Return flat structure for frontend compatibility
    return JSONResponse({
        "success": True,
        "columns": result.get("columns", []),
        "rows": [dict(zip(result["columns"], row)) for row in result.get("rows", [])],
        "row_count": result.get("row_count", 0)
    }, status_code=200)

# Run SQL and Test (Dry Run - No Submit)
@router.post("/api/exercises/{exercise_id}/run")
async def run_exercise_test(exercise_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    query = data.get("query")
    if not query:
        return JSONResponse({"error": "query is required"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get exercise with dataset
        cur.execute("""
            SELECT e.*, d.schema_sql, d.seed_data_sql
            FROM exercises e
            LEFT JOIN datasets d ON e.dataset_id = d.dataset_id
            WHERE e.exercise_id = %s
        """, (exercise_id,))
        exercise = cur.fetchone()

        if not exercise:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        # Get test cases
        cur.execute("""
            SELECT * FROM test_cases
            WHERE exercise_id = %s
            ORDER BY case_id
        """, (exercise_id,))
        test_cases = cur.fetchall()

        cur.close()
        conn.close()

        schema_sql = exercise.get("schema_sql") or ""
        seed_sql = exercise.get("seed_data_sql") or ""

        # Run student's query
        student_result = run_sql_on_sandbox(schema_sql, seed_sql, query)

        if "error" in student_result:
            return JSONResponse({"success": False, "error": student_result["error"]}, status_code=400)

        # Evaluate test cases
        test_results = evaluate_test_cases(student_result, test_cases)

        # Return combined result
        return JSONResponse({
            "success": True,
            "query_result": {
                "columns": student_result.get("columns", []),
                "rows": [dict(zip(student_result["columns"], row)) for row in student_result.get("rows", [])],
                "row_count": student_result.get("row_count", 0)
            },
            "test_results": test_results
        }, status_code=200)

    except Exception as e:
        print(f"Error running exercise test: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# Generate test case from expected_query
@router.post("/api/exercises/{exercise_id}/generate-test-case")
async def generate_test_case(exercise_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    case_name = data.get("case_name", "Auto-generated Test")
    points = data.get("points", 10)
    is_hidden = data.get("is_hidden", False)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get exercise with dataset info
        cur.execute("""
            SELECT e.*, d.schema_sql, d.seed_data_sql
            FROM exercises e
            LEFT JOIN datasets d ON e.dataset_id = d.dataset_id
            WHERE e.exercise_id = %s
        """, (exercise_id,))
        exercise = cur.fetchone()

        if not exercise:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        expected_query = exercise.get("expected_query")
        schema_sql = exercise.get("schema_sql") or ""
        seed_sql = exercise.get("seed_data_sql") or ""

        if not expected_query:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise has no expected_query"}, status_code=400)

        # Run the expected query on sandbox
        result = run_sql_on_sandbox(schema_sql, seed_sql, expected_query)

        if "error" in result:
            cur.close()
            conn.close()
            return JSONResponse({"success": False, "error": result["error"]}, status_code=400)

        # Save as test case
        import json
        expected_output_json = json.dumps(result)

        cur.execute("""
            INSERT INTO test_cases (exercise_id, case_name, expected_output, points, is_hidden)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (exercise_id, case_name, expected_output_json, points, is_hidden))

        new_test_case = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "test_case": serialize_row(new_test_case),
            "result": result
        }, status_code=201)

    except Exception as e:
        print(f"Error generating test case: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Submit Exercise Solution
@router.post("/api/exercises/{exercise_id}/submit")
async def submit_exercise(exercise_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    query = data.get("query")
    student_id = data.get("student_id")

    if not query:
        return JSONResponse({"error": "query is required"}, status_code=400)
    if not student_id:
        return JSONResponse({"error": "student_id is required"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get exercise with dataset and test cases
        cur.execute("""
            SELECT e.*, d.schema_sql, d.seed_data_sql
            FROM exercises e
            LEFT JOIN datasets d ON e.dataset_id = d.dataset_id
            WHERE e.exercise_id = %s
        """, (exercise_id,))
        exercise = cur.fetchone()

        if not exercise:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Exercise not found"}, status_code=404)

        # Get test cases
        cur.execute("""
            SELECT * FROM test_cases
            WHERE exercise_id = %s
            ORDER BY case_id
        """, (exercise_id,))
        test_cases = cur.fetchall()

        if not test_cases:
            cur.close()
            conn.close()
            return JSONResponse({"error": "No test cases found for this exercise"}, status_code=400)

        schema_sql = exercise.get("schema_sql") or ""
        seed_sql = exercise.get("seed_data_sql") or ""

        # Run student's query
        student_result = run_sql_on_sandbox(schema_sql, seed_sql, query)

        if "error" in student_result:
            # Save failed submission
            import json
            submission_result = {
                "is_correct": False,
                "total_score": 0,
                "max_score": sum(tc.get("points", 0) for tc in test_cases),
                "error_message": student_result["error"],
                "results": []
            }

            cur.execute("""
                INSERT INTO submissions (exercise_id, student_id, submitted_query, is_correct, total_score, max_score, error_message, results)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING submit_id, submitted_at
            """, (exercise_id, student_id, query, False, 0, submission_result["max_score"], student_result["error"], json.dumps(submission_result)))

            submission = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()

            return JSONResponse({
                "success": False,
                "submit_id": submission["submit_id"],
                "submitted_at": submission["submitted_at"].isoformat() if submission["submitted_at"] else None,
                **submission_result
            }, status_code=200)

        # Compare with test cases
        import json
        
        # Use existing helper
        test_evaluation = evaluate_test_cases(student_result, test_cases)
        
        all_passed = test_evaluation["is_correct"]
        total_score = test_evaluation["total_score"]
        max_score = test_evaluation["max_score"]
        results = test_evaluation["results"]

        # Save submission
        submission_result = {
            "is_correct": all_passed,
            "total_score": total_score,
            "max_score": max_score,
            "results": results
        }

        cur.execute("""
            INSERT INTO submissions (exercise_id, student_id, submitted_query, is_correct, total_score, max_score, results)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING submit_id, submitted_at
        """, (exercise_id, student_id, query, all_passed, total_score, max_score, json.dumps(submission_result)))

        submission = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "submit_id": submission["submit_id"],
            "submitted_at": submission["submitted_at"].isoformat() if submission["submitted_at"] else None,
            **submission_result
        }, status_code=200)

    except Exception as e:
        print(f"Error submitting exercise: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)
