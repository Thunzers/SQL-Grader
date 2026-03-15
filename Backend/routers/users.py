from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
import pandas as pd
import io
from database import get_db_connection
from utils import serialize_row

router = APIRouter()

@router.get("/api/users")
def get_users(role: str = None):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database error"}, status_code=500)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if role:
        cur.execute("SELECT user_id, name, surname, email, role FROM users WHERE role = %s ORDER BY user_id ASC;", (role,))
    else:
        cur.execute("SELECT user_id, name, surname, email, role FROM users ORDER BY user_id ASC;")
        
    users = cur.fetchall()
    cur.close()
    conn.close()

    return JSONResponse([serialize_row(u) for u in users], status_code=200)

@router.get("/api/users/profile")
def get_user_profile(email: str):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database error"}, status_code=500)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT user_id, name, surname, email, role FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if user:
        return JSONResponse({"success": True, "user": serialize_row(user)}, status_code=200)
    else:
        return JSONResponse({"error": "User not found"}, status_code=404)

@router.put("/api/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request):
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
        cur.execute("UPDATE users SET role = %s WHERE user_id = %s", (new_role, user_id))

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

@router.post("/api/users/add")
async def add_single_user(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    user_id = data.get("user_id")
    name = data.get("name")
    surname = data.get("surname")
    email = data.get("email")
    role = data.get("role", "student")

    # Validation
    if not all([user_id, name, surname, email]):
        return JSONResponse({"error": "All fields are required: user_id, name, surname, email"}, status_code=400)

    # Validate role
    valid_roles = ["student", "teacher", "admin"]
    if role not in valid_roles:
        return JSONResponse({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}, status_code=400)

    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()

        # Check if user_id or email already exists
        cur.execute("SELECT user_id FROM users WHERE user_id = %s OR email = %s", (user_id, email))
        existing_user = cur.fetchone()

        if existing_user:
            cur.close()
            conn.close()
            return JSONResponse({"error": "Student ID or Email already exists"}, status_code=409)

        # Insert new user
        cur.execute("""
            INSERT INTO users (user_id, name, surname, email, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id, name, surname, email, role
        """, (user_id, name, surname, email, role))

        new_user = cur.fetchone()
        conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": "User added successfully",
            "user": {
                "user_id": new_user[0],
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

@router.post("/api/users/bulk-upload")
async def bulk_upload_users(file: UploadFile = File(...), force_student: bool = False):
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
        required_columns = ['user_id', 'name', 'surname', 'email']

        if not all(col in df.columns for col in required_columns):
            return JSONResponse({
                "error": f"Excel file must contain columns: {', '.join(required_columns)}. Optional: 'role'"
            }, status_code=400)

        # Clean and prepare data
        df['user_id'] = df['user_id'].astype(str).str.strip()
        df['name'] = df['name'].astype(str).str.strip()
        df['surname'] = df['surname'].astype(str).str.strip()
        df['email'] = df['email'].astype(str).str.strip().str.lower()

        # Set default role if not provided or force_student is true
        if force_student:
            df['role'] = 'student'
        elif 'role' not in df.columns:
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

        # Remove duplicates within the file (by user_id)
        df = df.drop_duplicates(subset=['user_id'])

        # Filter out invalid emails (basic validation)
        df = df[df['email'].str.contains('@', na=False)]

        # Filter out empty user_id, name, or surname
        df = df.dropna(subset=['user_id', 'name', 'surname'])

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
            user_id = row['user_id']
            name = row['name']
            surname = row['surname']
            email = row['email']
            role = row['role']

            try:
                # Check if user already exists
                cur.execute("SELECT user_id FROM users WHERE user_id = %s OR email = %s", (user_id, email))
                existing = cur.fetchone()

                if existing:
                    skipped_users.append({
                        "user_id": user_id,
                        "email": email,
                        "reason": "User ID or Email already exists"
                    })
                    continue

                # Insert new user
                cur.execute("""
                    INSERT INTO users (user_id, name, surname, email, role)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING user_id
                """, (user_id, name, surname, email, role))

                new_user_id = cur.fetchone()[0]
                conn.commit()

                added_users.append({
                    "user_id": new_user_id,
                    "name": name,
                    "surname": surname,
                    "email": email,
                    "role": role
                })

            except Exception as e:
                errors.append({
                    "user_id": user_id,
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

@router.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database connection failed"}, status_code=500)

    try:
        cur = conn.cursor()

        # Check if user exists
        cur.execute("SELECT user_id, name, surname, email FROM users WHERE user_id = %s", (user_id,))
        user = cur.fetchone()

        if not user:
            cur.close()
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        # Delete user
        cur.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "success": True,
            "message": "User deleted successfully",
            "deleted_user": {
                "user_id": user[0],
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
