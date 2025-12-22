# คู่มือการจัดการผู้ใช้งาน (User Management)

## ภาพรวม
ฟีเจอร์การจัดการผู้ใช้งานสำหรับ Admin ในระบบ SQL Grader ช่วยให้สามารถเพิ่มผู้ใช้งานเข้าสู่ระบบได้สองวิธี:
1. เพิ่มรายบุคคล (Single User)
2. เพิ่มแบบจำนวนมากผ่าน Excel (Bulk Upload)

## โครงสร้างฐานข้อมูล

### ตาราง `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` (PK) - รหัสผู้ใช้ที่สร้างอัตโนมัติ
- `email` - อีเมลของผู้ใช้ (ต้องไม่ซ้ำ)
- `role` - บทบาทของผู้ใช้ (student, teacher, admin) - ค่าเริ่มต้นคือ student
- `created_at` - วันที่สร้างผู้ใช้

### การ Migrate ฐานข้อมูล
หากต้องการอัปเดตโครงสร้างฐานข้อมูล:

```bash
# เชื่อมต่อกับ PostgreSQL
psql -U postgres -d Grader_SQL

# รัน migration script
\i Backend/Database/migration_users_table.sql
```

## API Endpoints

### 1. เพิ่มผู้ใช้รายคน
**Endpoint:** `POST /api/users/add`

**Request Body:**
```json
{
  "email": "student@silpakorn.edu",
  "role": "student"
}
```

**Response (สำเร็จ):**
```json
{
  "success": true,
  "message": "User added successfully",
  "user": {
    "id": 123,
    "email": "student@silpakorn.edu",
    "role": "student",
    "created_at": "2025-12-22T10:30:00"
  }
}
```

**Response (อีเมลซ้ำ):**
```json
{
  "error": "User with this email already exists"
}
```

### 2. อัปโหลดผู้ใช้จาก Excel
**Endpoint:** `POST /api/users/bulk-upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` - ไฟล์ Excel (.xlsx หรือ .xls)

**Response:**
```json
{
  "success": true,
  "message": "Bulk upload completed",
  "summary": {
    "total_processed": 10,
    "added": 8,
    "skipped": 1,
    "errors": 1
  },
  "added_users": [
    {
      "id": 101,
      "email": "student1@silpakorn.edu",
      "role": "student"
    }
  ],
  "skipped_users": [
    {
      "email": "existing@silpakorn.edu",
      "reason": "Already exists"
    }
  ],
  "errors": [
    {
      "email": "invalid-email",
      "error": "Invalid email format"
    }
  ]
}
```

### 3. ดึงข้อมูลผู้ใช้ทั้งหมด
**Endpoint:** `GET /api/users`

**Response:**
```json
[
  {
    "id": 1,
    "email": "admin@silpakorn.edu",
    "role": "admin",
    "created_at": "2025-01-01T00:00:00"
  }
]
```

### 4. เปลี่ยน Role ผู้ใช้
**Endpoint:** `PUT /api/users/{id}/role`

**Request Body:**
```json
{
  "role": "teacher"
}
```

### 5. ลบผู้ใช้
**Endpoint:** `DELETE /api/users/{id}`

**Response (สำเร็จ):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deleted_user": {
    "id": 123,
    "email": "student@silpakorn.edu"
  }
}
```

**Response (ไม่พบผู้ใช้):**
```json
{
  "error": "User not found"
}
```

## การใช้งานผ่าน Frontend

### เข้าสู่หน้า User Management
1. Login ด้วยบัญชี Admin
2. คลิกที่การ์ด "Manage Users" ในหน้า Dashboard
3. Modal User Management จะเปิดขึ้น

### เพิ่มผู้ใช้รายคน
1. คลิกปุ่ม **"เพิ่มผู้ใช้"** (สีเขียว) ที่มุมซ้ายบน
2. กรอกข้อมูล:
   - **อีเมล** (บังคับ) - เช่น student@silpakorn.edu
   - **บทบาท** (เลือกจาก dropdown) - student, teacher, หรือ admin
3. คลิก **"เพิ่มผู้ใช้"**
4. รอการยืนยัน
5. ปิด Modal

### อัปโหลดผู้ใช้แบบจำนวนมาก (Bulk Upload)
1. คลิกปุ่ม **"อัปโหลด Excel"** (สีน้ำเงิน) ที่มุมซ้ายบน
2. อ่านคำแนะนำในกล่องสีฟ้า
3. เตรียมไฟล์ Excel ตามรูปแบบที่กำหนด
4. คลิก **"เลือกไฟล์ Excel"**
5. เลือกไฟล์ .xlsx หรือ .xls
6. คลิก **"อัปโหลด"**
7. ดูผลลัพธ์:
   - สรุปจำนวนที่เพิ่มสำเร็จ
   - รายการที่ข้าม (อีเมลซ้ำ)
   - ข้อผิดพลาด (ถ้ามี)

### ลบผู้ใช้
1. ในตาราง User Management จะมีปุ่ม **"ลบ"** (สีแดง) ในคอลัมน์สุดท้าย
2. คลิกปุ่ม **"ลบ"** ที่แถวของผู้ใช้ที่ต้องการลบ
3. Modal ยืนยันการลบจะปรากฏขึ้น พร้อมแสดง:
   - คำเตือนว่าการลบไม่สามารถย้อนกลับได้
   - ข้อมูลผู้ใช้ที่จะลบ (ID, Email, Role)
4. ตรวจสอบข้อมูลให้แน่ใจ
5. คลิก **"ยืนยันลบ"** เพื่อลบผู้ใช้
6. หรือคลิก **"ยกเลิก"** เพื่อยกเลิกการลบ

**หมายเหตุ:** การลบผู้ใช้จะลบข้อมูลออกจากฐานข้อมูลอย่างถาวร ไม่สามารถกู้คืนได้

### รูปแบบไฟล์ Excel

**คอลัมน์ที่จำเป็น:**
- `email` (บังคับ) - อีเมลของผู้ใช้

**คอลัมน์เสริม:**
- `role` (ไม่บังคับ) - ถ้าไม่ระบุจะเป็น "student" โดยอัตโนมัติ

**ตัวอย่างไฟล์:**

| email | role |
|-------|------|
| student1@silpakorn.edu | student |
| student2@silpakorn.edu | student |
| teacher1@silpakorn.edu | teacher |
| admin1@silpakorn.edu | admin |

**ไฟล์ Template:**
ดาวน์โหลดไฟล์ตัวอย่าง: `Backend/user_upload_template.csv`

## การติดตั้งและรัน

### Backend
```bash
cd Backend

# ติดตั้ง dependencies
python -m pip install -r requirements.txt

# รันเซิร์ฟเวอร์
python server.py
```

เซิร์ฟเวอร์จะรันที่: http://localhost:5000

### Frontend
```bash
cd Frontend

# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
```

Frontend จะรันที่: http://localhost:5173

## กฎการตรวจสอบข้อมูล (Validation)

### Backend Validation:
1. **อีเมล:**
   - ต้องมีรูปแบบที่ถูกต้อง (มี @)
   - ต้องไม่ซ้ำกับที่มีในฐานข้อมูล

2. **Role:**
   - ต้องเป็นหนึ่งใน: student, teacher, admin
   - ตัวพิมพ์เล็ก-ใหญ่ไม่สำคัญ (จะแปลงเป็นตัวพิมพ์เล็กอัตโนมัติ)

3. **Excel Upload:**
   - ไฟล์ต้องเป็น .xlsx หรือ .xls
   - ต้องมีคอลัมน์ 'email'
   - อีเมลที่ซ้ำภายในไฟล์เดียวกันจะถูกลบออก
   - อีเมลที่ไม่มี @ จะถูกกรองออก

### Frontend Validation:
1. Input type="email" สำหรับการป้อนอีเมล
2. Select dropdown สำหรับ role (ป้องกันค่าที่ไม่ถูกต้อง)
3. File input accept=".xlsx,.xls" (จำกัดประเภทไฟล์)

## การจัดการข้อผิดพลาด

### ข้อผิดพลาดที่เป็นไปได้:

1. **อีเมลซ้ำ (409 Conflict):**
   - ผู้ใช้จะได้รับแจ้งเตือนว่าอีเมลนี้มีอยู่แล้ว
   - ในกรณี bulk upload จะข้ามและแสดงในรายการ "skipped_users"

2. **Role ไม่ถูกต้อง (400 Bad Request):**
   - ระบบจะแจ้งว่า role ต้องเป็น student, teacher, หรือ admin

3. **ไฟล์ Excel ไม่ถูกต้อง:**
   - ไม่มีคอลัมน์ email
   - ไฟล์เสียหาย
   - ไม่ใช่ไฟล์ Excel

4. **การเชื่อมต่อฐานข้อมูลล้มเหลว (500 Internal Server Error):**
   - ตรวจสอบว่า PostgreSQL กำลังรัน
   - ตรวจสอบ credentials ในไฟล์ server.py

## Security Notes

⚠️ **คำเตือน:** ปัจจุบันระบบยังไม่มีการตรวจสอบสิทธิ์ (Authorization) ที่ Backend

**ควรเพิ่ม:**
1. Middleware สำหรับตรวจสอบ JWT Token
2. ตรวจสอบว่าผู้ใช้ที่เรียก API มี role เป็น admin
3. Rate limiting สำหรับ API endpoints
4. Input sanitization เพื่อป้องกัน SQL Injection

**ตัวอย่างการเพิ่ม Authorization:**
```python
from fastapi import Depends, HTTPException, Header

async def verify_admin(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    # Verify token and check role
    # ... implementation

    return user_data

@app.post("/api/users/add", dependencies=[Depends(verify_admin)])
async def add_single_user(request: Request):
    # ... existing code
```

## การทดสอบ

### ทดสอบด้วย cURL:

**เพิ่มผู้ใช้:**
```bash
curl -X POST http://localhost:5000/api/users/add \
  -H "Content-Type: application/json" \
  -d '{"email":"test@silpakorn.edu","role":"student"}'
```

**อัปโหลด Excel:**
```bash
curl -X POST http://localhost:5000/api/users/bulk-upload \
  -F "file=@users.xlsx"
```

**ดึงข้อมูลผู้ใช้:**
```bash
curl http://localhost:5000/api/users
```

**ลบผู้ใช้:**
```bash
curl -X DELETE http://localhost:5000/api/users/123
```

## Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อ Backend
**แก้ไข:** ตรวจสอบว่า Backend รันอยู่ที่ port 5000

### ปัญหา: CORS Error
**แก้ไข:** ตรวจสอบว่า Backend มีการเปิด CORS (ควรมีอยู่แล้วในโค้ด)

### ปัญหา: ไฟล์ Excel อ่านไม่ได้
**แก้ไข:**
- ตรวจสอบว่าไฟล์เป็น .xlsx หรือ .xls
- ตรวจสอบว่ามีคอลัมน์ 'email'
- ลองสร้างไฟล์ใหม่จาก template

### ปัญหา: Database Connection Error
**แก้ไข:**
```bash
# ตรวจสอบว่า PostgreSQL รัน
pg_isready

# หรือเริ่ม PostgreSQL ใหม่
# Windows: services.msc -> PostgreSQL
# Linux: sudo systemctl start postgresql
```

## เพิ่มเติม

- ตรวจสอบ logs ใน terminal ที่รัน Backend
- ใช้ Browser DevTools (F12) เพื่อดู Network requests
- ตรวจสอบ Database โดยตรงผ่าน psql หรือ pgAdmin

---

**เวอร์ชัน:** 1.0
**อัปเดตล่าสุด:** 22 ธันวาคม 2025
**ผู้พัฒนา:** SQL Grader Team
