# 📘 Schema Migration Guide - Users Table

## ⚠️ สำคัญมาก - อ่านก่อนทำการ Migrate!

การ migrate นี้จะ **ลบข้อมูลผู้ใช้ทั้งหมดในตาราง users** กรุณา backup ข้อมูลก่อนดำเนินการ

---

## 📊 สรุปการเปลี่ยนแปลง Schema

### Schema เดิม
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Schema ใหม่
```sql
CREATE TABLE users (
    student_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'student' NOT NULL
);
```

### สิ่งที่เปลี่ยนแปลง

| เดิม | ใหม่ | หมายเหตุ |
|------|------|----------|
| `id` (SERIAL) | `student_id` (VARCHAR) | เปลี่ยน Primary Key จาก auto-increment เป็น รหัสนักศึกษา |
| - | `name` (VARCHAR) | เพิ่มฟิลด์ชื่อ |
| - | `surname` (VARCHAR) | เพิ่มฟิลด์นามสกุล |
| `email` | `email` | ไม่เปลี่ยนแปลง |
| `role` | `role` | เปลี่ยน data type เป็น VARCHAR(20) |
| `created_at` | - | ลบฟิลด์นี้ออก |

---

## 🚀 ขั้นตอนการ Migrate

### ขั้นที่ 1: Backup ข้อมูลเดิม (สำคัญ!)

```bash
# เชื่อมต่อกับ PostgreSQL
psql -U postgres -d Grader_SQL

# Backup ตาราง users
CREATE TABLE users_backup AS SELECT * FROM users;

# ตรวจสอบ backup
SELECT * FROM users_backup;

# Export เป็นไฟล์ (ถ้าต้องการ)
\copy users_backup TO 'C:/backup/users_backup.csv' CSV HEADER;
```

### ขั้นที่ 2: รัน Migration Script

```bash
# เชื่อมต่อกับ PostgreSQL
psql -U postgres -d Grader_SQL

# รัน migration script
\i Backend/Database/migration_users_new_schema.sql

# หรือ copy-paste SQL จากไฟล์ migration_users_new_schema.sql
```

### ขั้นที่ 3: เพิ่มข้อมูล Admin User แรก

```sql
INSERT INTO users (student_id, name, surname, email, role)
VALUES ('ADMIN001', 'Admin', 'System', 'your_admin_email@silpakorn.edu', 'admin')
ON CONFLICT (email) DO NOTHING;
```

**⚠️ เปลี่ยน `your_admin_email@silpakorn.edu` เป็นอีเมลของคุณ!**

### ขั้นที่ 4: ตรวจสอบผลลัพธ์

```sql
-- ตรวจสอบโครงสร้างตาราง
\d users

-- ตรวจสอบข้อมูล
SELECT * FROM users;

-- ตรวจสอบ indexes
\di users*
```

---

## 📝 ข้อมูลที่ต้องมีสำหรับผู้ใช้ใหม่

หลังจาก migrate แล้ว ผู้ใช้ทุกคนต้องมีข้อมูลดังนี้:

1. **student_id** (รหัสนักศึกษา/รหัสบุคลากร) - ห้ามซ้ำ
2. **name** (ชื่อ)
3. **surname** (นามสกุล)
4. **email** (อีเมล) - ห้ามซ้ำ
5. **role** (บทบาท) - student, teacher, หรือ admin

---

## 🔄 การอัปเดตโค้ดที่เกี่ยวข้อง

### Backend API Endpoints ที่เปลี่ยน

| Endpoint เดิม | Endpoint ใหม่ | หมายเหตุ |
|---------------|---------------|----------|
| `PUT /api/users/{id}/role` | `PUT /api/users/{student_id}/role` | เปลี่ยนจาก id เป็น student_id |
| `DELETE /api/users/{id}` | `DELETE /api/users/{student_id}` | เปลี่ยนจาก id เป็น student_id |
| - | `POST /api/users/register` | Endpoint ใหม่สำหรับ complete registration |

### Request Body ที่เปลี่ยน

**POST /api/users/add (เดิม):**
```json
{
  "email": "student@silpakorn.edu",
  "role": "student"
}
```

**POST /api/users/add (ใหม่):**
```json
{
  "student_id": "6512345678",
  "name": "สมชาย",
  "surname": "ใจดี",
  "email": "student@silpakorn.edu",
  "role": "student"
}
```

### Excel/CSV Template ใหม่

**ไฟล์เดิม:**
```csv
email,role
student@silpakorn.edu,student
```

**ไฟล์ใหม่:**
```csv
student_id,name,surname,email,role
6512345678,สมชาย,ใจดี,student@silpakorn.edu,student
```

---

## 🧪 การทดสอบหลัง Migrate

### 1. ทดสอบ Backend API

```bash
# ทดสอบ GET users
curl http://localhost:5000/api/users

# ทดสอบ Add User
curl -X POST http://localhost:5000/api/users/add \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "6512345678",
    "name": "Test",
    "surname": "User",
    "email": "test@silpakorn.edu",
    "role": "student"
  }'

# ทดสอบ Update Role
curl -X PUT http://localhost:5000/api/users/6512345678/role \
  -H "Content-Type: application/json" \
  -d '{"role": "teacher"}'

# ทดสอบ Delete User
curl -X DELETE http://localhost:5000/api/users/6512345678
```

### 2. ทดสอบ Frontend

1. เปิด Browser ไปที่ http://localhost:5173
2. Login ด้วย Admin account
3. ทดสอบ User Management:
   - เปิด Modal User Management
   - ตรวจสอบว่าแสดงคอลัมน์: Student ID, Name, Surname, Email, Role
   - คลิก "เพิ่มผู้ใช้" - ต้องมีฟิลด์ครบ 5 ฟิลด์
   - คลิก "อัปโหลด Excel" - ทดสอบอัปโหลดไฟล์ template ใหม่
   - ทดสอบเปลี่ยน Role
   - ทดสอบลบผู้ใช้

### 3. ทดสอบ Bulk Upload

1. ใช้ไฟล์ `Backend/user_upload_template_new.csv`
2. อัปโหลดผ่าน UI
3. ตรวจสอบผลลัพธ์

---

## ❗ ปัญหาที่อาจพบและวิธีแก้

### ปัญหา 1: Migration ล้มเหลว
**สาเหตุ:** ตาราง users มี Foreign Key constraints

**วิธีแก้:**
```sql
-- ลบ Foreign Key constraints ก่อน
ALTER TABLE [table_name] DROP CONSTRAINT [constraint_name];

-- จากนั้นรัน migration ใหม่
```

### ปัญหา 2: Cannot login after migration
**สาเหตุ:** User data ถูกลบหมด

**วิธีแก้:**
1. เพิ่ม Admin user ใหม่ (ดูขั้นที่ 3)
2. Login ด้วย Google
3. ระบบจะขอให้ complete registration
4. กรอกข้อมูล student_id, name, surname

### ปัญหา 3: Bulk upload ล้มเหลว
**สาเหตุ:** ใช้ template เก่า

**วิธีแก้:**
- ใช้ `user_upload_template_new.csv` แทน
- ตรวจสอบว่ามีคอลัมน์ครบ: student_id, name, surname, email, role

### ปัญหา 4: Frontend แสดง "undefined" ในบางฟิลด์
**สาเหตุ:** Frontend ยังใช้ `user.id` แทน `user.student_id`

**วิธีแก้:**
- ตรวจสอบไฟล์ AdminDashboard.jsx
- ต้องใช้ `user.student_id`, `user.name`, `user.surname`

---

## 📚 ไฟล์ที่ถูกแก้ไข

### Backend
- ✅ `Backend/server.py` - ทุก API endpoints
- ✅ `Backend/Database/migration_users_new_schema.sql` - Migration script
- ✅ `Backend/user_upload_template_new.csv` - Template ใหม่

### Frontend
- ✅ `Frontend/src/components/AdminDashboard.jsx` - User Management UI
- ⚠️ `Frontend/src/components/Login.jsx` - **ต้องเพิ่ม registration flow**

---

## 🔐 Google Login Flow ใหม่

### สำหรับ User ที่มีอยู่แล้ว
1. Login ด้วย Google
2. ระบบตรวจสอบ email
3. ถ้ามี user แล้ว → Login สำเร็จ
4. Redirect ไปหน้า Dashboard ตาม role

### สำหรับ User ใหม่
1. Login ด้วย Google
2. ระบบตรวจสอบ email
3. ถ้ายังไม่มี user → แสดงฟอร์มลงทะเบียน
4. กรอก: student_id, name, surname
5. กด Submit → สร้าง user ใหม่
6. Redirect ไปหน้า Dashboard

**หมายเหตุ:** ต้องอัปเดต Login.jsx เพื่อรองรับ flow นี้

---

## 🎯 Checklist ก่อนใช้งาน Production

- [ ] Backup ข้อมูลเดิมแล้ว
- [ ] รัน Migration script สำเร็จ
- [ ] เพิ่ม Admin user แรกแล้ว
- [ ] ทดสอบ Login ด้วย Admin account สำเร็จ
- [ ] ทดสอบ User Management ทุกฟีเจอร์
- [ ] ทดสอบ Bulk Upload สำเร็จ
- [ ] อัปเดต Login.jsx เพื่อรองรับ registration flow
- [ ] ทดสอบ Google Login flow สำหรับ user ใหม่
- [ ] แจ้งผู้ใช้ทุกคนให้ login ใหม่และกรอกข้อมูล

---

## 📞 หากมีปัญหา

1. ตรวจสอบ Backend logs: Terminal ที่รัน `python server.py`
2. ตรวจสอบ Frontend console: Browser DevTools (F12)
3. ตรวจสอบ Database: `psql -U postgres -d Grader_SQL`

---

**เวอร์ชัน:** 2.0
**อัปเดตล่าสุด:** 25 ธันวาคม 2025
**ผู้จัดทำ:** SQL Grader Development Team
