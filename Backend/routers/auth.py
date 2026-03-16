from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from google.oauth2 import id_token
from google.auth.transport import requests
from psycopg2.extras import RealDictCursor
from database import get_db_connection

router = APIRouter()

CLIENT_ID = "673421095892-krkp5se2jipkdpmbdfohbk39etq1klcb.apps.googleusercontent.com"
ALLOWED_DOMAINS = ["@silpakorn.edu"]
request_google = requests.Request()

@router.post("/auth/google")
async def google_auth(request: Request):
    
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
            clock_skew_in_seconds=60
        )

        email = payload.get('email')
        is_allowed = not ALLOWED_DOMAINS or any(email.endswith(domain) for domain in ALLOWED_DOMAINS)

        if email and is_allowed:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Check if user exists
                cur.execute("SELECT user_id, name, surname, email, role FROM users WHERE email = %s", (email,))
                user_data = cur.fetchone()

                if user_data:
                    # User exists, return their data
                    cur.close()
                    conn.close()

                    return JSONResponse({
                        "success": True,
                        "user_exists": True,
                        "user_id": user_data['user_id'],
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

@router.post("/api/users/register")
async def complete_registration(request: Request):
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
        existing = cur.fetchone()

        if existing:
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
            "message": "Registration completed successfully",
            "user": {
                "user_id": new_user[0],
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
