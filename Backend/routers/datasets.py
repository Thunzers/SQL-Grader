from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
from database import get_db_connection
from utils import serialize_row

router = APIRouter()

@router.get("/api/datasets")
def get_datasets():
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT dataset_id, name, description, schema_sql, seed_data_sql, created_by, created_at
            FROM datasets
            ORDER BY created_at DESC
        """)
        datasets = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(d) for d in datasets], status_code=200)
    except Exception as e:
        print(f"Error fetching datasets: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM datasets WHERE dataset_id = %s", (dataset_id,))
        dataset = cur.fetchone()
        cur.close()
        conn.close()

        if not dataset:
            return JSONResponse({"error": "Dataset not found"}, status_code=404)

        return JSONResponse(serialize_row(dataset), status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/api/datasets")
async def create_dataset(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    name = data.get("name")
    description = data.get("description", "")
    schema_sql = data.get("schema_sql")
    seed_data_sql = data.get("seed_data_sql")
    created_by = data.get("created_by")

    if not all([name, schema_sql, seed_data_sql]):
        return JSONResponse({"error": "Required fields: name, schema_sql, seed_data_sql"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO datasets (name, description, schema_sql, seed_data_sql, created_by)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (name, description, schema_sql, seed_data_sql, created_by))
        new_dataset = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "dataset": serialize_row(new_dataset)}, status_code=201)
    except Exception as e:
        print(f"Error creating dataset: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/api/datasets/{dataset_id}")
async def update_dataset(dataset_id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    name = data.get("name")
    description = data.get("description", "")
    schema_sql = data.get("schema_sql")
    seed_data_sql = data.get("seed_data_sql")

    if not all([name, schema_sql, seed_data_sql]):
        return JSONResponse({"error": "Required fields: name, schema_sql, seed_data_sql"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE datasets
            SET name = %s, description = %s, schema_sql = %s, seed_data_sql = %s
            WHERE dataset_id = %s
            RETURNING *
        """, (name, description, schema_sql, seed_data_sql, dataset_id))

        updated_dataset = cur.fetchone()
        if not updated_dataset:
            conn.close()
            return JSONResponse({"error": "Dataset not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "dataset": serialize_row(updated_dataset)}, status_code=200)
    except Exception as e:
        print(f"Error updating dataset: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        # Check if dataset exists
        cur.execute("SELECT dataset_id FROM datasets WHERE dataset_id = %s", (dataset_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return JSONResponse({"error": "Dataset not found"}, status_code=404)

        # Delete the dataset
        cur.execute("DELETE FROM datasets WHERE dataset_id = %s", (dataset_id,))
        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"success": True, "message": "Dataset deleted successfully"}, status_code=200)
    except Exception as e:
        print(f"Error deleting dataset: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)
