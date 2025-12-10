import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests
from flask_cors import CORS

# --- CONFIG DATABASE ---
DB_HOST = "localhost"
DB_NAME = "grader_db"
DB_USER = "postgres"
DB_PASS = "zxc123456"
DB_PORT = "5432"

CLIENT_ID = "673421095892-krkp5se2jipkdpmbdfohbk39etq1klcb.apps.googleusercontent.com"

app = Flask(__name__)
CORS(app)

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
@app.route("/auth/google", methods=["POST"])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    
    # ⭐️ เพิ่มบรรทัดนี้เพื่อดู Token ที่ได้รับใน Terminal
    print(f"Token ที่ได้รับ: {token}")

    if not token:
        return jsonify({"success": False, "error": "No token provided"}), 400

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
                cur.close()
                conn.close()
                print(f"✅ User saved/checked: {email}")

            return jsonify({"success": True, "email": email}), 200
        else:
            return jsonify({
                "success": False, 
                "error": f"อนุญาตเฉพาะอีเมลโดเมน: {', '.join(ALLOWED_DOMAINS)}"
            }), 403
            
    except ValueError as e:
        print(f"❌ Token Verification Error: {e}") 
        return jsonify({"success": False, "error": f"Invalid token: {str(e)}"}), 400
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/users", methods=["GET"])
def get_users():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users ORDER BY id DESC;")
    users = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(users), 200

@app.route("/api/classes", methods=["GET"])
def get_classes():
    conn = get_db_connection()
    if conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM classes;')
        classes = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(classes), 200
    else:
        return jsonify([]), 500

if __name__ == "__main__":
    print("✅ Backend running on http://localhost:3000")
    app.run(port=3000, debug=True)