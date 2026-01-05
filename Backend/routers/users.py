from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
import pandas as pd
import io
from database import get_db_connection
from utils import serialize_row

router = APIRouter()

@router.get("/api/users")
def get_users():
    conn = get_db_connection()
    if not conn:
        return JSONResponse({"error": "Database error"}, status_code=500)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT student_id, name, surname, email, role FROM users ORDER BY student_id ASC;")
    users = cur.fetchall()
    cur.close()
    conn.close()

    return JSONResponse([serialize_row(u) for u in users], status_code=200)

@router.put("/api/users/{student_id}/role")
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

@router.post("/api/users/add")
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

@router.post("/api/users/bulk-upload")
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

@router.delete("/api/users/{student_id}")
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
