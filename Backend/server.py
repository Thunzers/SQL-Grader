import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, date, time
from decimal import Decimal

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

if __name__ == "__main__":
    import uvicorn

    print("Backend running ")
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True)