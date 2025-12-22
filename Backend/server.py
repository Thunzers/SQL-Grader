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

    # ดู Token ที่ได้รับใน Terminal
    print(f"Token ที่ได้รับ: {token}")

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
                cur = conn.cursor()


                sql = """
                    INSERT INTO users (email, role)
                    VALUES (%s, 'student')
                    ON CONFLICT (email) DO NOTHING;
                """
                cur.execute(sql, (email,))
                conn.commit()


                cur.execute("SELECT role FROM users WHERE email = %s", (email,))
                user_data = cur.fetchone()
                role = user_data[0] if user_data else "student"

                cur.close()
                conn.close()

                print(f"User saved/checked: {email} | Role: {role}")

                return JSONResponse({
                    "success": True,
                    "email": email,
                    "role": role,
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

@app.get("/api/users")
def get_users():
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database error"}, status_code=500)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users ORDER BY id DESC;")
    users = cur.fetchall()
    cur.close()
    conn.close()
    # Convert DB types (datetime, date, time, Decimal) to JSON-serializable
    serial = []
    for row in users:
        r = dict(row)
        for k, v in list(r.items()):
            if isinstance(v, (datetime, date, time)):
                r[k] = v.isoformat()
            elif isinstance(v, Decimal):
                # convert Decimal to float when possible
                try:
                    r[k] = float(v)
                except Exception:
                    r[k] = str(v)
        serial.append(r)
    return JSONResponse(serial, status_code=200)

# Update User Role
@app.put("/api/users/{id}/role")
async def update_user_role(id: int, request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    new_role = (data or {}).get("role")

    if not new_role:
        return JSONResponse({"error": "Role is required"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, id))
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

    email = data.get("email")
    role = data.get("role", "student")

    if not email:
        return JSONResponse({"error": "Email is required"}, status_code=400)
    
    # Validate role
    valid_roles = ["student", "teacher", "admin"]
    if role not in valid_roles:
        return JSONResponse({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}, status_code=400)
    conn = get_db_connection()

    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    
    try:
        cur = conn.cursor()
        # Check if email already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = cur.fetchone()

        if existing_user:
            cur.close()
            conn.close()
            return JSONResponse({"error": "User with this email already exists"}, status_code=409)
        # Insert new user
        cur.execute(
            "INSERT INTO users (email, role) VALUES (%s, %s) RETURNING id, email, role, created_at",
            (email, role)
        )

        new_user = cur.fetchone()
        conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": "User added successfully",
            "user": {
                "id": new_user[0],
                "email": new_user[1],
                "role": new_user[2],
                "created_at": new_user[3].isoformat() if new_user[3] else None
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
    if not file.filename.endswith(('.xlsx', '.xls')):
        return JSONResponse({"error": "File must be an Excel file (.xlsx or .xls)"}, status_code=400)
    try:
        # Read Excel file
        contents = await file.read()

        df = pd.read_excel(io.BytesIO(contents))

 

        # Validate required columns

        required_columns = ['email']

        if not all(col in df.columns for col in required_columns):
            return JSONResponse({
                "error": f"Excel file must contain at least 'email' column. Optional: 'role'"
            }, status_code=400)
            
        # Clean and prepare data
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
 
        # Remove duplicates within the file
        df = df.drop_duplicates(subset=['email'])
        
        # Filter out invalid emails (basic validation)
        df = df[df['email'].str.contains('@', na=False)]
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
            email = row['email']
            role = row['role']

            try:
                # Check if user already exists
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                existing = cur.fetchone()

                if existing:
                    skipped_users.append({
                        "email": email,
                        "reason": "Already exists"
                    })
                    continue

                # Insert new user
                cur.execute(
                    "INSERT INTO users (email, role) VALUES (%s, %s) RETURNING id",
                    (email, role)
                )

                user_id = cur.fetchone()[0]
                conn.commit()

                added_users.append({
                    "id": user_id,
                    "email": email,
                    "role": role
                })

            except Exception as e:
                errors.append({
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
@app.delete("/api/users/{id}")
async def delete_user(id: int):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)
    try:
        cur = conn.cursor()
        # Check if user exists
        cur.execute("SELECT id, email FROM users WHERE id = %s", (id,))
        user = cur.fetchone()
        if not user:
            cur.close()
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)
        # Delete user
        cur.execute("DELETE FROM users WHERE id = %s", (id,))
        conn.commit()
        cur.close()
        conn.close()
        return JSONResponse({
            "success": True,
            "message": "User deleted successfully",
            "deleted_user": {
                "id": user[0],
                "email": user[1]
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
@app.get("/api/classes")
def get_classes():
    conn = get_db_connection()
    if conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM classes;')
        classes = cur.fetchall()
        cur.close()
        conn.close()
        return JSONResponse(classes, status_code=200)
    else:
        return JSONResponse([], status_code=500)

if __name__ == "__main__":
    import uvicorn

    print("Backend running ")
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True)