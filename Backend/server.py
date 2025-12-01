from flask import Flask, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests
from flask_cors import CORS

# กำหนด Client ID ของคุณ
CLIENT_ID = "34276681645-qljcgh9b3fgub935akbstuduj3f43p5v.apps.googleusercontent.com"

app = Flask(__name__)
# อนุญาต CORS สำหรับทุกโดเมน (เพื่อให้เหมือนกับ Express `cors()`)
CORS(app)

# สร้าง request object สำหรับการตรวจสอบ Token
request_google = requests.Request()

@app.route("/auth/google", methods=["POST"])
def google_auth():
    """ตรวจสอบ Google ID Token และจำกัดอีเมลเฉพาะ @silpakorn.edu"""
    
    # 1. ตรวจสอบว่ามี JSON payload และ 'token' อยู่ใน body หรือไม่
    data = request.get_json()
    if not data or 'token' not in data:
        return jsonify({
            "success": False, 
            "error": "ไม่พบ ID Token ในคำขอ"
        }), 400

    token = data['token']

    try:
        # 2. ตรวจสอบ ID Token
        # ตรวจสอบ ID Token โดยใช้ Client ID ที่กำหนดไว้
        # `id_token.verify_oauth2_token` จะตรวจสอบลายเซ็น, หมดอายุ, และ audience (client_id)
        payload = id_token.verify_oauth2_token(
            token, 
            request_google, 
            CLIENT_ID
        )

        # 3. ดึงอีเมลจาก Payload
        email = payload.get('email')
        
        if not email:
             return jsonify({
                "success": False, 
                "error": "ไม่พบอีเมลใน Token"
            }), 400

        # 4. ตรวจอีเมลให้ถูกต้อง (จำกัดเฉพาะ @silpakorn.edu)
        if email.endswith("@silpakorn.edu"):
            # อนุญาต
            return jsonify({
                "success": True, 
                "email": email
            }), 200
        else:
            # ไม่อนุญาต
            return jsonify({
                "success": False,
                "error": "อนุญาตเฉพาะอีเมล @silpakorn.edu เท่านั้น"
            }), 403
            
    except ValueError as error:
        # 5. จัดการข้อผิดพลาดในการตรวจสอบ Token
        # เช่น Token ไม่ถูกต้อง, หมดอายุ, หรือ Client ID ไม่ตรง
        print(f"Token Verification Error: {error}")
        return jsonify({
            "success": False, 
            "error": "Token ไม่ถูกต้อง"
        }), 400
    except Exception as e:
        # จัดการข้อผิดพลาดอื่น ๆ ที่ไม่คาดคิด
        print(f"Unexpected Error: {e}")
        return jsonify({
            "success": False, 
            "error": "เกิดข้อผิดพลาดภายใน"
        }), 500


if __name__ == "__main__":
    # รัน Flask server บน http://localhost:3000
    print("✅ Backend running on http://localhost:3000")
    app.run(port=3000)