import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests
from flask_cors import CORS

# DATABASE 
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

# Google Login 
@app.route("/auth/google", methods=["POST"])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    
  
    print(f"Token = : {token}")

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
                
                # Insert 
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
                
                print(f"✅ User saved/checked: {email} | Role: {role}")

                
                return jsonify({
                    "success": True, 
                    "email": email, 
                    "role": role 
                }), 200
        else:
            return jsonify({
                "success": False, 
                "error": f"อนุญาตเฉพาะอีเมลโดเมน: {', '.join(ALLOWED_DOMAINS)}"
            }), 403
            
    except ValueError as e:
        print(f"Token Verification Error: {e}") 
        return jsonify({"success": False, "error": f"Invalid token: {str(e)}"}), 400
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Get All Users 
@app.route("/api/users", methods=["GET"])
def get_users():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users ORDER BY id ASC;") 
    users = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(users), 200

# Update User Role 
@app.route("/api/users/<int:id>/role", methods=["PUT"])
def update_user_role(id):
    data = request.get_json()
    new_role = data.get("role")

    if not new_role:
        return jsonify({"error": "Role is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, id))
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({"message": "Role updated successfully", "success": True}), 200
    except Exception as e:
        print(f"Error updating role: {e}")
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500


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
    print("Backend running on http://localhost:5000")
    app.run(port=5000, debug=True)