================================================================================
  SQL-Grader — โครงสร้างไฟล์ Backend และ Frontend
================================================================================

Backend/  — FastAPI (Python) + PostgreSQL
------------------------------------------
├── server.py             รวม API จาก routers/ แล้วรันเซิร์ฟเวอร์ 
├── database.py           เชื่อมต่อฐานข้อมูล PostgreSQL
├── utils.py              ฟังก์ชันกลาง: รัน SQL ใน sandbox, ตรวจคำตอบเทียบเฉลย,
│                         ตรวจสิทธิ์ผู้ใช้
├── requirements.txt      รายการไลบรารี Python
│
├── routers/              API endpoints แยกตามหน้าที่
│   ├── auth.py           Login/Logout + Google OAuth
│   ├── users.py          จัดการผู้ใช้ (เพิ่ม/แก้/ลบ/อัปโหลด CSV)
│   ├── classes.py        จัดการห้องเรียน + ผูกครู-นักเรียน
│   ├── assignments.py    จัดการชุดงาน/การบ้าน
│   ├── exercises.py      โจทย์ SQL: รับคำตอบ, ตรวจเทียบ golden query
│   ├── datasets.py       จัดการ dataset ที่ใช้ในโจทย์
│   └── statistic.py      สถิติ/คะแนน/รายงาน
│
└── migrations/           SQL migration scripts (รันตามลำดับเลขไฟล์)


Frontend/  — React (Vite) + TailwindCSS
---------------------------------------
└── src/
    ├── App.jsx                   Root: จัดการ session + routing ตาม role
    │
    └── components/
        ├── Login.jsx             หน้าเข้าสู่ระบบ
        ├── Navbars.jsx           แถบนำทางด้านบน
        ├── Dashboard.jsx         Dashboard กลาง
        │
        ├── StudentMenu.jsx       หน้าหลักนักเรียน (ดู/ทำ assignment)
        ├── TeacherMenu.jsx       หน้าหลักครู (สร้าง assignment, ดูคะแนน)
        ├── ClassManagement.jsx   จัดการห้องเรียน (สำหรับครู)
        │
        ├── AssignmentDetail.jsx  รายละเอียด assignment + รายการ exercise
        ├── ExerciseSolve.jsx     หน้าทำโจทย์ SQL (พิมพ์ → รัน → ส่ง)
        ├── MonacoSQLEditor.jsx   ตัวแก้ไข SQL (Monaco + autocomplete)
        │
        ├── SubmitResultModal.jsx ป๊อปอัปแสดงผลคำตอบ (ถูก/ผิด)
        ├── ConfirmModal.jsx      ป๊อปอัปยืนยันการทำงาน
        ├── Notification.jsx      ระบบแจ้งเตือน
        │
        └── admin/                ส่วนของผู้ดูแลระบบ
            ├── AdminMenu.jsx             หน้าหลักแอดมิน
            ├── UserManagementModal.jsx   จัดการผู้ใช้ทั้งระบบ
            ├── AddUserModal.jsx          เพิ่มผู้ใช้ทีละคน
            └── BulkUploadModal.jsx       อัปโหลดผู้ใช้เป็นกลุ่มจาก CSV
================================================================================
