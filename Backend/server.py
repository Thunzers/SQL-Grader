import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, date, time
from decimal import Decimal
import pandas as pd
import io

# --- CONFIG DATABASE ---
DB_HOST = "localhost"
DB_NAME = "Grader_SQL"
DB_USER = "postgres"
DB_PASS = "tonkla2010"
DB_PORT = "5432"

CLIENT_ID = "673421095892-krkp5se2jipkdpmbdfohbk39etq1klcb.apps.googleusercontent.com"

app = FastAPI()

# Allow CORS from any origin by default (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

request_google = requests.Request()

ALLOWED_DOMAINS = ["@silpakorn.edu"]

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT
        )
        return conn
    except Exception as e:
        print("Database connection failed:", e)
        return None

# --- API 1: Google Login ---
@app.post("/auth/google")
async def google_auth(request: Request):
    # parse JSON body asynchronously
    try:
        data = await request.json()
    except Exception:
        data = {}

    token = (data or {}).get('token')


    if not token:
        return JSONResponse({"success": False, "error": "No token provided"}, status_code=400)

    try:
        payload = id_token.verify_oauth2_token(
            token,
            request_google,
            CLIENT_ID,
            clock_skew_in_seconds=10
        )

        email = payload.get('email')
        is_allowed = not ALLOWED_DOMAINS or any(email.endswith(domain) for domain in ALLOWED_DOMAINS)

        if email and is_allowed:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Check if user exists
                cur.execute("SELECT student_id, name, surname, email, role FROM users WHERE email = %s", (email,))
                user_data = cur.fetchone()

                if user_data:
                    # User exists, return their data
                    cur.close()
                    conn.close()

                    return JSONResponse({
                        "success": True,
                        "user_exists": True,
                        "student_id": user_data['student_id'],
                        "name": user_data['name'],
                        "surname": user_data['surname'],
                        "email": user_data['email'],
                        "role": user_data['role'],
                    }, status_code=200)
                else:
                    # New user - need to register with additional info
                    cur.close()
                    conn.close()

                    return JSONResponse({
                        "success": True,
                        "user_exists": False,
                        "email": email,
                        "message": "Please complete registration"
                    }, status_code=200)
        else:
            return JSONResponse({
                "success": False,
                "error": f"อนุญาตเฉพาะอีเมลโดเมน: {', '.join(ALLOWED_DOMAINS)}",
            }, status_code=403)

    except ValueError as e:
        print(f"Token Verification Error: {e}")
        return JSONResponse({"success": False, "error": f"Invalid token: {str(e)}"}, status_code=400)

    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

# Complete user registration (for new Google login users)
@app.post("/api/users/register")
async def complete_registration(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    student_id = data.get("student_id")
    name = data.get("name")
    surname = data.get("surname")
    email = data.get("email")
    role = data.get("role", "student")

    # Validation
    if not all([student_id, name, surname, email]):
        return JSONResponse({"error": "All fields are required: student_id, name, surname, email"}, status_code=400)

    # Validate role
    valid_roles = ["student", "teacher", "admin"]
    if role not in valid_roles:
        return JSONResponse({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()

        # Check if student_id or email already exists
        cur.execute("SELECT student_id FROM users WHERE student_id = %s OR email = %s", (student_id, email))
        existing = cur.fetchone()

        if existing:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Student ID or Email already exists"}, status_code=409)

        # Insert new user
        cur.execute("""
            INSERT INTO users (student_id, name, surname, email, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING student_id, name, surname, email, role
        """, (student_id, name, surname, email, role))

        new_user = cur.fetchone()
        conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": "Registration completed successfully",
            "user": {
                "student_id": new_user[0],
                "name": new_user[1],
                "surname": new_user[2],
                "email": new_user[3],
                "role": new_user[4]
            }
        }, status_code=201)

    except Exception as e:
        print(f"Error completing registration: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Get all users
@app.get("/api/users")
def get_users():
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database error"}, status_code=500)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT student_id, name, surname, email, role FROM users ORDER BY student_id ASC;")
    users = cur.fetchall()
    cur.close()
    conn.close()

    # Convert to list of dicts
    serial = []
    for row in users:
        r = dict(row)
        for k, v in list(r.items()):
            if isinstance(v, (datetime, date, time)):
                r[k] = v.isoformat()
            elif isinstance(v, Decimal):
                try:
                    r[k] = float(v)
                except Exception:
                    r[k] = str(v)
        serial.append(r)
    return JSONResponse(serial, status_code=200)

# Update User Role
@app.put("/api/users/{student_id}/role")
async def update_user_role(student_id: str, request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    new_role = (data or {}).get("role")

    if not new_role:
        return JSONResponse({"error": "Role is required"}, status_code=400)

    # Validate role
    valid_roles = ["student", "teacher", "admin"]
    if new_role not in valid_roles:
        return JSONResponse({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET role = %s WHERE student_id = %s", (new_role, student_id))

        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        conn.commit()
        cur.close()
        conn.close()

        return JSONResponse({"message": "Role updated successfully", "success": True}, status_code=200)
    except Exception as e:
        print(f"Error updating role: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Add Single User
@app.post("/api/users/add")
async def add_single_user(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    student_id = data.get("student_id")
    name = data.get("name")
    surname = data.get("surname")
    email = data.get("email")
    role = data.get("role", "student")

    # Validation
    if not all([student_id, name, surname, email]):
        return JSONResponse({"error": "All fields are required: student_id, name, surname, email"}, status_code=400)

    # Validate role
    valid_roles = ["student", "teacher", "admin"]
    if role not in valid_roles:
        return JSONResponse({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()

        # Check if student_id or email already exists
        cur.execute("SELECT student_id FROM users WHERE student_id = %s OR email = %s", (student_id, email))
        existing_user = cur.fetchone()

        if existing_user:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Student ID or Email already exists"}, status_code=409)

        # Insert new user
        cur.execute("""
            INSERT INTO users (student_id, name, surname, email, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING student_id, name, surname, email, role
        """, (student_id, name, surname, email, role))

        new_user = cur.fetchone()
        conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": "User added successfully",
            "user": {
                "student_id": new_user[0],
                "name": new_user[1],
                "surname": new_user[2],
                "email": new_user[3],
                "role": new_user[4]
            }
        }, status_code=201)

    except Exception as e:
        print(f"Error adding user: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Bulk Upload Users via Excel
@app.post("/api/users/bulk-upload")
async def bulk_upload_users(file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        return JSONResponse({"error": "File must be an Excel file (.xlsx, .xls) or CSV (.csv)"}, status_code=400)

    try:
        # Read file
        contents = await file.read()

        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        # Validate required columns
        required_columns = ['student_id', 'name', 'surname', 'email']

        if not all(col in df.columns for col in required_columns):
            return JSONResponse({
                "error": f"Excel file must contain columns: {', '.join(required_columns)}. Optional: 'role'"
            }, status_code=400)

        # Clean and prepare data
        df['student_id'] = df['student_id'].astype(str).str.strip()
        df['name'] = df['name'].astype(str).str.strip()
        df['surname'] = df['surname'].astype(str).str.strip()
        df['email'] = df['email'].astype(str).str.strip().str.lower()

        # Set default role if not provided
        if 'role' not in df.columns:
            df['role'] = 'student'
        else:
            df['role'] = df['role'].fillna('student').astype(str).str.strip().str.lower()

        # Validate roles
        valid_roles = ['student', 'teacher', 'admin']
        invalid_roles = df[~df['role'].isin(valid_roles)]
        if not invalid_roles.empty:
            return JSONResponse({
                "error": f"Invalid roles found. All roles must be: {', '.join(valid_roles)}",
                "invalid_rows": invalid_roles.to_dict('records')
            }, status_code=400)

        # Remove duplicates within the file (by student_id)
        df = df.drop_duplicates(subset=['student_id'])

        # Filter out invalid emails (basic validation)
        df = df[df['email'].str.contains('@', na=False)]

        # Filter out empty student_id, name, or surname
        df = df.dropna(subset=['student_id', 'name', 'surname'])

        if df.empty:
            return JSONResponse({"error": "No valid users to add"}, status_code=400)

        conn = get_db_connection()
        if not conn:
            return JSONResponse({"error": "Database connection failed"}, status_code=500)

        cur = conn.cursor()

        added_users = []
        skipped_users = []
        errors = []

        for index, row in df.iterrows():
            student_id = row['student_id']
            name = row['name']
            surname = row['surname']
            email = row['email']
            role = row['role']

            try:
                # Check if user already exists
                cur.execute("SELECT student_id FROM users WHERE student_id = %s OR email = %s", (student_id, email))
                existing = cur.fetchone()

                if existing:
                    skipped_users.append({
                        "student_id": student_id,
                        "email": email,
                        "reason": "Student ID or Email already exists"
                    })
                    continue

                # Insert new user
                cur.execute("""
                    INSERT INTO users (student_id, name, surname, email, role)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING student_id
                """, (student_id, name, surname, email, role))

                new_student_id = cur.fetchone()[0]
                conn.commit()

                added_users.append({
                    "student_id": new_student_id,
                    "name": name,
                    "surname": surname,
                    "email": email,
                    "role": role
                })

            except Exception as e:
                errors.append({
                    "student_id": student_id,
                    "email": email,
                    "error": str(e)
                })
                conn.rollback()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": f"Bulk upload completed",
            "summary": {
                "total_processed": len(df),
                "added": len(added_users),
                "skipped": len(skipped_users),
                "errors": len(errors)
            },
            "added_users": added_users,
            "skipped_users": skipped_users,
            "errors": errors
        }, status_code=200)

    except Exception as e:
        print(f"Error in bulk upload: {e}")
        return JSONResponse({"error": f"Failed to process file: {str(e)}"}, status_code=500)

# Delete user
@app.delete("/api/users/{student_id}")
async def delete_user(student_id: str):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()

        # Check if user exists
        cur.execute("SELECT student_id, name, surname, email FROM users WHERE student_id = %s", (student_id,))
        user = cur.fetchone()

        if not user:
            cur.close()
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        # Delete user
        cur.execute("DELETE FROM users WHERE student_id = %s", (student_id,))
        conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": "User deleted successfully",
            "deleted_user": {
                "student_id": user[0],
                "name": user[1],
                "surname": user[2],
                "email": user[3]
            }
        }, status_code=200)

    except Exception as e:
        print(f"Error deleting user: {e}")
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"error": str(e)}, status_code=500)

# Get all classes
@app.get("/api/classes")
def get_classes():
    conn = get_db_connection()
    if conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM classes;')
        classes = cur.fetchall()
        cur.close()
        conn.close()

        # serialize DB types
        serial = []
        for row in classes:
            r = dict(row)
            for k, v in list(r.items()):
                if isinstance(v, (datetime, date, time)):
                    r[k] = v.isoformat()
                elif isinstance(v, Decimal):
                    try:
                        r[k] = float(v)
                    except Exception:
                        r[k] = str(v)
            serial.append(r)
        return JSONResponse(serial, status_code=200)
    else:
        return JSONResponse([], status_code=500)


# ========================================
# DATASET APIs
# ========================================

def serialize_row(row):
    """Helper function to serialize database row"""
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

# Get all datasets
@app.get("/api/datasets")
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

# Get single dataset
@app.get("/api/datasets/{dataset_id}")
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

# Create dataset
@app.post("/api/datasets")
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


# Update dataset
@app.put("/api/datasets/{dataset_id}")
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


# Delete dataset
@app.delete("/api/datasets/{dataset_id}")
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


# ========================================
# ASSIGNMENT APIs
# ========================================

# Get all assignments
@app.get("/api/assignments")
def get_assignments(category: str = None):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if category:
            cur.execute("""
                SELECT a.*,
                       (SELECT COUNT(*) FROM exercises e WHERE e.assign_id = a.assign_id) as exercise_count
                FROM assignments a
                WHERE a.category = %s AND a.is_active = TRUE
                ORDER BY a.created_at DESC
            """, (category,))
        else:
            cur.execute("""
                SELECT a.*,
                       (SELECT COUNT(*) FROM exercises e WHERE e.assign_id = a.assign_id) as exercise_count
                FROM assignments a
                WHERE a.is_active = TRUE
                ORDER BY a.created_at DESC
            """)

        assignments = cur.fetchall()
        cur.close()
        conn.close()

        return JSONResponse([serialize_row(a) for a in assignments], status_code=200)
    except Exception as e:
        print(f"Error fetching assignments: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# Get single assignment
@app.get("/api/assignments/{assign_id}")
def get_assignment(assign_id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT a.*,
                   (SELECT COUNT(*) FROM exercises e WHERE e.assign_id = a.assign_id) as exercise_count
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
        return JSONResponse({"error": str(e)}, status_code=500)

# Create assignment
@app.post("/api/assignments")
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

# Update assignment
@app.put("/api/assignments/{assign_id}")
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

# Delete assignment
@app.delete("/api/assignments/{assign_id}")
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


# ========================================
# EXERCISE APIs
# ========================================

# Get exercises for an assignment
@app.get("/api/assignments/{assign_id}/exercises")
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
@app.get("/api/exercises/{exercise_id}")
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
@app.post("/api/assignments/{assign_id}/exercises")
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
@app.put("/api/exercises/{exercise_id}")
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
@app.delete("/api/exercises/{exercise_id}")
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


# ========================================
# CATEGORY API (for dropdown)
# ========================================
@app.get("/api/categories")
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


# ========================================
# TEST CASE APIs
# ========================================

# Get test cases for an exercise
@app.get("/api/exercises/{exercise_id}/test-cases")
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
@app.post("/api/exercises/{exercise_id}/test-cases")
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
        import json
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
@app.put("/api/test-cases/{case_id}")
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
            import json
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
@app.delete("/api/test-cases/{case_id}")
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


# ========================================
# SQL EXECUTION (Sandbox)
# ========================================

def run_sql_on_sandbox(schema_sql: str, seed_sql: str, query: str):
    """
    Run SQL query on a temporary sandbox and return results
    """
    import uuid
    import json

    # Create unique sandbox database name
    sandbox_name = f"sandbox_{uuid.uuid4().hex[:8]}"

    # Connect to postgres to create sandbox DB
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}

    try:
        conn.autocommit = True
        cur = conn.cursor()

        # Create sandbox database
        cur.execute(f'CREATE DATABASE "{sandbox_name}"')
        cur.close()
        conn.close()

        # Connect to sandbox
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

        # Run the query
        sandbox_cur.execute(query)

        # Get column names
        columns = [desc[0] for desc in sandbox_cur.description] if sandbox_cur.description else []

        # Get rows
        rows = sandbox_cur.fetchall()

        # Convert to serializable format
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

            # Terminate connections to sandbox
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


# Run SQL query (for testing)
@app.post("/api/run-sql")
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


# Helper: Evaluate test cases
def evaluate_test_cases(student_result, test_cases):
    import json
    results = []
    total_score = 0
    max_score = 0
    all_passed = True

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

            points_earned = max_points if is_passed else 0
            total_score += points_earned

            if not is_passed:
                all_passed = False

            results.append({
                "case_id": tc.get("case_id"),
                "case_name": tc.get("case_name", "Test Case"),
                "is_passed": is_passed,
                "points_earned": points_earned,
                "max_points": max_points,
                "error": error_msg
            })

        except Exception as e:
            all_passed = False
            results.append({
                "case_id": tc.get("case_id"),
                "case_name": tc.get("case_name", "Test Case"),
                "is_passed": False,
                "points_earned": 0,
                "max_points": max_points,
                "error": f"Error evaluating test case: {str(e)}"
            })
            
    return {
        "is_correct": all_passed,
        "total_score": total_score,
        "max_score": max_score,
        "results": results
    }


# Run SQL and Test (Dry Run - No Submit)
@app.post("/api/exercises/{exercise_id}/run")
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
@app.post("/api/exercises/{exercise_id}/generate-test-case")
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
@app.post("/api/exercises/{exercise_id}/submit")
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


if __name__ == "__main__":
    import uvicorn

    print("Backend running on http://0.0.0.0:5000")
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True)
