from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor
from database import get_db_connection

router = APIRouter()

@router.get("/api/admin/stats")
async def get_admin_stats():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    cur = None # กำหนดตัวแปรไว้ล่วงหน้าเพื่อความปลอดภัยใน block finally
    try:
        # ใช้ RealDictCursor เพื่อให้ผลลัพธ์เป็น Dictionary
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. นับจำนวนผู้ใช้งานทั้งหมด
        cur.execute("SELECT COUNT(*) as total_users FROM users;")
        user_data = cur.fetchone()
        
        # 2. นับจำนวนแบบฝึกหัดทั้งหมด
        # ตรวจสอบชื่อตารางในฐานข้อมูลของคุณ (เช่น 'exercises' หรือ 'assignments')
        cur.execute("SELECT COUNT(*) as total_exercises FROM exercises;")
        exercise_data = cur.fetchone()
        
        # ส่งค่ากลับในรูปแบบ JSON
        return {
            "totalUsers": user_data['total_users'] if user_data else 0,
            "totalExercises": exercise_data['total_exercises'] if exercise_data else 0
        }
        
    except Exception as e:
       
        print(f"Error in get_admin_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        
        if cur:
            cur.close()
        if conn:
            conn.close()