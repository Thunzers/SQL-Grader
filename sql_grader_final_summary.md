# SQL-Grader Project Summary (Final Version)
## สรุปสำหรับ Claude Code

---

## 1. ภาพรวมโปรเจค

### 1.1 โปรเจคคืออะไร?
**SQL-Grader** เป็นเว็บแอปพลิเคชันสำหรับ:
- ฝึกฝนเขียน SQL
- ตรวจคำตอบ SQL อัตโนมัติ
- ใช้ในมหาวิทยาลัย (อาจารย์สร้างโจทย์ → นักศึกษาทำ → ระบบตรวจให้)

### 1.2 Tech Stack
| ส่วน | เทคโนโลยี |
|------|----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Authentication | Google OAuth |

### 1.3 ผู้ใช้งาน 3 ประเภท
| Role | สิ่งที่ทำได้ |
|------|------------|
| **student** | ทำแบบฝึกหัด, ดูคะแนนตัวเอง |
| **teacher** | สร้าง/แก้ไข Assignment และ Exercise, ดูคะแนนนักศึกษาทุกคน |
| **admin** | จัดการผู้ใช้, จัดการระบบทั้งหมด |

---

## 2. Flow การใช้งาน

### 2.1 นักศึกษา

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: หน้ารวม Assignments                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [กรอง: ทั้งหมด ▼]  [SELECT]  [JOIN]  [GROUP BY]  [Subquery]            │
│                                                                         │
│   📚 SELECT พื้นฐาน ชุดที่ 1           (5 ข้อ)  [SELECT]                  │
│   📚 SELECT พื้นฐาน ชุดที่ 2           (5 ข้อ)  [SELECT]                  │
│   📚 INNER JOIN เบื้องต้น             (4 ข้อ)  [JOIN]                    │
│   📚 LEFT/RIGHT JOIN                 (3 ข้อ)  [JOIN]                    │
│   📚 GROUP BY และ Aggregate          (6 ข้อ)  [GROUP BY]                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ กดเลือก "INNER JOIN เบื้องต้น"
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: หน้ารายการ Exercises                                            │
│          Assignment: INNER JOIN เบื้องต้น                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ข้อ 1: เชื่อม 2 ตาราง              [Easy]    ✅ 10/10                  │
│   ข้อ 2: JOIN กับ WHERE              [Easy]    ✅ 10/10                  │
│   ข้อ 3: JOIN หลาย columns           [Medium]  ❌ ยังไม่ทำ               │
│   ข้อ 4: JOIN กับ Aggregate          [Medium]  ❌ ยังไม่ทำ               │
│                                                                         │
│   📊 ความคืบหน้า: 2/4 ข้อ (20/40 คะแนน)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ กดเลือก "ข้อ 3"
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: หน้าทำโจทย์ (SQL Editor)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📝 ข้อ 3: JOIN หลาย columns                              [Medium]      │
│  ────────────────────────────────────────────────────────────────────   │
│  โจทย์: จงเขียน SQL เพื่อแสดงชื่อพนักงานและชื่อแผนกที่สังกัด              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ -- เขียน SQL ที่นี่                                              │   │
│  │ SELECT e.name, d.dept_name                                      │   │
│  │ FROM employees e                                                 │   │
│  │ INNER JOIN departments d ON e.dept_id = d.id                    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [💡 ดูคำใบ้]              [▶️ รันทดสอบ]              [📤 ส่งคำตอบ]       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ กดส่งคำตอบ
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: ดูผลการตรวจ                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ✅ ถูกต้อง!                                                           │
│                                                                         │
│   คะแนน: 10/10                                                          │
│   ครั้งที่ส่ง: 1                                                         │
│   เวลาที่ใช้: 45 ms                                                      │
│                                                                         │
│   [🔄 ทำข้อต่อไป]                    [📋 กลับหน้ารายการ]                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 อาจารย์

```
┌─────────────────────────────────────────────────────────────────────────┐
│  หน้า Dashboard อาจารย์                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [📚 จัดการ Assignment]  [📦 จัดการ Dataset]  [📊 ดูคะแนน]               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

สร้าง Assignment:
┌─────────────────────────────────────────────────────────────────────────┐
│  สร้าง Assignment ใหม่                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ชื่อ: [INNER JOIN เบื้องต้น                    ]                        │
│  หมวดหมู่: [JOIN ▼]                                                      │
│  คำอธิบาย: [เรียนรู้การเชื่อมตาราง...           ]                        │
│  เริ่ม: [01/01/2568]  หมดเขต: [31/01/2568]                              │
│  จำนวนครั้งที่ส่งได้: [0 = ไม่จำกัด]                                      │
│                                                                         │
│  [บันทึก]                                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

สร้าง Exercise:
┌─────────────────────────────────────────────────────────────────────────┐
│  สร้าง Exercise ใหม่ (ใน Assignment: INNER JOIN เบื้องต้น)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ชื่อ: [เชื่อม 2 ตาราง                          ]                        │
│  โจทย์: [แสดงชื่อพนักงานและแผนก...              ]                        │
│  Dataset: [employees_db ▼]                                              │
│  คำตอบที่ถูก: [SELECT e.name, d.dept FROM...    ]                        │
│  คะแนน: [10]  ความยาก: [Easy ▼]                                         │
│  คำใบ้: [ใช้ INNER JOIN เชื่อมตาราง             ]                        │
│                                                                         │
│  [บันทึก]                                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (6 ตาราง)

### 3.1 ER Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ student_id (PK) │─────────────────────────────────────────┐
│ name            │                                         │
│ surname         │                                         │
│ email (UQ)      │                                         │
│ role            │                                         │
│ created_at      │                                         │
└─────────────────┘                                         │
        │                                                   │
        │ created_by (FK)                                   │
        ▼                                                   │
┌───────────────────────────┐       ┌─────────────────┐     │
│       assignments         │       │    datasets     │     │
├───────────────────────────┤       ├─────────────────┤     │
│ assign_id (PK)            │       │ dataset_id (PK) │     │
│ category (VARCHAR)        │       │ name (UQ)       │     │
│ title                     │       │ description     │     │
│ description               │       │ schema_sql      │     │
│ start_date                │       │ seed_data_sql   │     │
│ due_date                  │       │ created_by (FK) │─────┤
│ max_attempts              │       │ created_at      │     │
│ is_active                 │       └─────────────────┘     │
│ created_by (FK)           │               │               │
│ created_at                │               │               │
└───────────────────────────┘               │               │
        │                                   │               │
        │ assign_id (FK)                    │ dataset_id    │
        ▼                                   │               │
┌───────────────────────────────────────────┴───────┐       │
│                    exercises                      │       │
├───────────────────────────────────────────────────┤       │
│ exercise_id (PK)                                  │       │
│ assign_id (FK)                                    │       │
│ dataset_id (FK) ← NULL ได้                        │       │
│ title                                             │       │
│ description                                       │       │
│ expected_query                                    │       │
│ points                                            │       │
│ difficulty (easy/medium/hard)                     │       │
│ order_num                                         │       │
│ hint                                              │       │
│ show_solution                                     │       │
│ created_at                                        │       │
└───────────────────────────────────────────────────┘       │
        │                                                   │
        ├──────────────────────────┐                        │
        │                          │                        │
        ▼                          ▼                        │
┌─────────────────┐       ┌─────────────────────────┐       │
│   test_cases    │       │      submissions        │       │
├─────────────────┤       ├─────────────────────────┤       │
│ case_id (PK)    │       │ submit_id (PK)          │       │
│ exercise_id (FK)│       │ exercise_id (FK)        │       │
│ case_name       │       │ student_id (FK)         │───────┘
│ expected_output │       │ submitted_query         │
│ points          │       │ is_correct              │
│ is_hidden       │       │ total_score             │
└─────────────────┘       │ max_score               │
                          │ attempt_number          │
                          │ results (JSONB)         │
                          │ error_message           │
                          │ submitted_at            │
                          └─────────────────────────┘
```

### 3.2 สรุป 6 ตาราง

| ตาราง | คำอธิบาย | สร้างโดย |
|-------|----------|----------|
| **users** | ผู้ใช้งาน (นักศึกษา/อาจารย์/แอดมิน) | Admin |
| **datasets** | ฐานข้อมูลจำลองสำหรับรัน SQL | Teacher |
| **assignments** | ชุดแบบฝึกหัด + category | Teacher |
| **exercises** | โจทย์แต่ละข้อ | Teacher |
| **test_cases** | ชุดทดสอบสำหรับตรวจคำตอบ | Teacher |
| **submissions** | คำตอบที่นักศึกษาส่ง + ผลตรวจ | ระบบ (เมื่อนักศึกษาส่ง) |

### 3.3 ความสัมพันธ์

```
users (1) ──────< assignments (N)     อาจารย์สร้างหลาย assignment
users (1) ──────< datasets (N)        อาจารย์สร้างหลาย dataset
users (1) ──────< submissions (N)     นักศึกษาส่งหลายครั้ง

assignments (1) ──────< exercises (N)     1 assignment มีหลายข้อ
datasets (1) ──────< exercises (N)        1 dataset ใช้กับหลายข้อ
exercises (1) ──────< test_cases (N)      1 ข้อ มีหลาย test case
exercises (1) ──────< submissions (N)     1 ข้อ มีหลายการส่ง
```

---

## 4. รายละเอียดแต่ละตาราง

### 4.1 users
```sql
CREATE TABLE users (
    student_id VARCHAR(20) PRIMARY KEY,    -- รหัสนักศึกษา/อาจารย์
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,    -- ใช้ login ผ่าน Google OAuth
    role VARCHAR(20) DEFAULT 'student' NOT NULL 
        CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 datasets
```sql
CREATE TABLE datasets (
    dataset_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,     -- ชื่อ dataset เช่น "employees_db"
    description TEXT,
    schema_sql TEXT NOT NULL,              -- SQL สร้างตาราง
    seed_data_sql TEXT NOT NULL,           -- SQL ใส่ข้อมูล
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**ตัวอย่าง schema_sql:**
```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    salary INT,
    dept_id INT
);
CREATE TABLE departments (
    id INT PRIMARY KEY,
    dept_name VARCHAR(100)
);
```

**ตัวอย่าง seed_data_sql:**
```sql
INSERT INTO employees VALUES 
    (1, 'สมชาย', 35000, 1),
    (2, 'สมหญิง', 42000, 2),
    (3, 'สมศักดิ์', 28000, 1);
INSERT INTO departments VALUES 
    (1, 'IT'),
    (2, 'HR');
```

### 4.3 assignments
```sql
CREATE TABLE assignments (
    assign_id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,         -- หมวดหมู่ เช่น "SELECT", "JOIN"
    title VARCHAR(200) NOT NULL,           -- ชื่อชุดแบบฝึกหัด
    description TEXT,
    start_date TIMESTAMP,                  -- NULL = เริ่มได้ทันที
    due_date TIMESTAMP,                    -- NULL = ไม่มีกำหนด
    max_attempts INT DEFAULT 0,            -- 0 = ไม่จำกัด
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 exercises
```sql
CREATE TABLE exercises (
    exercise_id SERIAL PRIMARY KEY,
    assign_id INT NOT NULL REFERENCES assignments(assign_id) ON DELETE CASCADE,
    dataset_id INT REFERENCES datasets(dataset_id),  -- NULL ได้ (โจทย์สร้างตาราง)
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,             -- เนื้อหาโจทย์
    expected_query TEXT NOT NULL,          -- SQL คำตอบที่ถูก
    points INT DEFAULT 10,
    difficulty VARCHAR(20) DEFAULT 'medium' 
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    order_num INT DEFAULT 0,               -- ลำดับโจทย์
    hint TEXT,                             -- คำใบ้
    show_solution BOOLEAN DEFAULT FALSE,   -- แสดงเฉลยหลังส่ง
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.5 test_cases
```sql
CREATE TABLE test_cases (
    case_id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    case_name VARCHAR(100),                -- ชื่อ test case
    expected_output JSONB NOT NULL,        -- ผลลัพธ์ที่คาดหวัง
    points INT DEFAULT 1,                  -- คะแนนของ test case นี้
    is_hidden BOOLEAN DEFAULT FALSE        -- ซ่อนจากนักศึกษา
);
```

**ตัวอย่าง expected_output (JSONB):**
```json
{
  "columns": ["id", "name", "salary"],
  "rows": [
    [1, "สมชาย", 35000],
    [2, "สมหญิง", 42000]
  ],
  "row_count": 2
}
```

### 4.6 submissions
```sql
CREATE TABLE submissions (
    submit_id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
    submitted_query TEXT NOT NULL,         -- SQL ที่นักศึกษาส่ง
    is_correct BOOLEAN DEFAULT FALSE,      -- ผ่านทุก test case
    total_score DECIMAL(5,2) DEFAULT 0,    -- คะแนนที่ได้
    max_score DECIMAL(5,2),                -- คะแนนเต็ม
    attempt_number INT DEFAULT 1,          -- ครั้งที่ส่ง
    results JSONB,                         -- ผลตรวจแต่ละ test case
    error_message TEXT,                    -- Error ถ้ามี
    submitted_at TIMESTAMP DEFAULT NOW()
);
```

**ตัวอย่าง results (JSONB):**
```json
[
  {"case_id": 1, "case_name": "Basic Test", "is_passed": true, "points_earned": 3},
  {"case_id": 2, "case_name": "Edge Case", "is_passed": true, "points_earned": 3},
  {"case_id": 3, "case_name": "Hidden Test", "is_passed": false, "points_earned": 0}
]
```

---

## 5. SQL สร้างทุกตาราง (รวม)

```sql
-- ========================================
-- 1. USERS
-- ========================================
CREATE TABLE users (
    student_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'student' NOT NULL 
        CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ========================================
-- 2. DATASETS
-- ========================================
CREATE TABLE datasets (
    dataset_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    schema_sql TEXT NOT NULL,
    seed_data_sql TEXT NOT NULL,
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_datasets_name ON datasets(name);

-- ========================================
-- 3. ASSIGNMENTS
-- ========================================
CREATE TABLE assignments (
    assign_id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    max_attempts INT DEFAULT 0 CHECK (max_attempts >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assignments_category ON assignments(category);
CREATE INDEX idx_assignments_active ON assignments(is_active);

-- ========================================
-- 4. EXERCISES
-- ========================================
CREATE TABLE exercises (
    exercise_id SERIAL PRIMARY KEY,
    assign_id INT NOT NULL REFERENCES assignments(assign_id) ON DELETE CASCADE,
    dataset_id INT REFERENCES datasets(dataset_id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    expected_query TEXT NOT NULL,
    points INT DEFAULT 10 CHECK (points > 0),
    difficulty VARCHAR(20) DEFAULT 'medium' 
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    order_num INT DEFAULT 0,
    hint TEXT,
    show_solution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exercises_assign ON exercises(assign_id);
CREATE INDEX idx_exercises_dataset ON exercises(dataset_id);
CREATE INDEX idx_exercises_order ON exercises(assign_id, order_num);

-- ========================================
-- 5. TEST_CASES
-- ========================================
CREATE TABLE test_cases (
    case_id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    case_name VARCHAR(100),
    expected_output JSONB NOT NULL,
    points INT DEFAULT 1 CHECK (points > 0),
    is_hidden BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_test_cases_exercise ON test_cases(exercise_id);

-- ========================================
-- 6. SUBMISSIONS
-- ========================================
CREATE TABLE submissions (
    submit_id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
    submitted_query TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    total_score DECIMAL(5,2) DEFAULT 0 CHECK (total_score >= 0),
    max_score DECIMAL(5,2),
    attempt_number INT DEFAULT 1 CHECK (attempt_number > 0),
    results JSONB,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_submissions_exercise ON submissions(exercise_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_date ON submissions(submitted_at DESC);
```

---

## 6. Flow การตรวจ SQL (Grading Engine)

```
นักศึกษากดส่งคำตอบ
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  1. รับ Input                                                │
│     - exercise_id                                           │
│     - student_id                                            │
│     - submitted_query                                       │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ดึงข้อมูลจาก Database                                    │
│     - exercise → dataset_id, expected_query, points         │
│     - dataset → schema_sql, seed_data_sql                   │
│     - test_cases → expected_output, points                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. สร้าง Sandbox Database (ชั่วคราว)                        │
│     - CREATE DATABASE sandbox_xxx                           │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Setup ข้อมูล                                             │
│     - รัน schema_sql (สร้างตาราง)                            │
│     - รัน seed_data_sql (ใส่ข้อมูล)                          │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  5. รัน SQL ของนักศึกษา                                      │
│     - Execute submitted_query                               │
│     - จับ error ถ้ามี                                        │
│     - วัดเวลา execution_time_ms                             │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  6. ตรวจแต่ละ Test Case                                      │
│     - เทียบ actual_output กับ expected_output               │
│     - คิดคะแนน points_earned                                │
│     - เก็บผลใน results array                                │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  7. บันทึก Submission                                        │
│     - is_correct = ผ่านทุก test case?                       │
│     - total_score = รวม points_earned                       │
│     - results = ผลแต่ละ test case (JSONB)                   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  8. ลบ Sandbox Database                                      │
│     - DROP DATABASE sandbox_xxx                             │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Return ผลลัพธ์                                           │
│     {                                                       │
│       "is_correct": true/false,                             │
│       "total_score": 10,                                    │
│       "max_score": 10,                                      │
│       "results": [...],                                     │
│       "error_message": null                                 │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. API Endpoints ที่ต้องสร้าง

### 7.1 Authentication
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/auth/google` | Login ด้วย Google |
| GET | `/auth/callback` | Google OAuth callback |
| GET | `/auth/me` | ดูข้อมูล user ปัจจุบัน |
| POST | `/auth/logout` | Logout |

### 7.2 Users (Admin only)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/users` | ดู users ทั้งหมด |
| GET | `/users/{student_id}` | ดู user คนเดียว |
| POST | `/users` | เพิ่ม user |
| PUT | `/users/{student_id}` | แก้ไข user |
| DELETE | `/users/{student_id}` | ลบ user |
| POST | `/users/bulk` | เพิ่ม users จาก Excel |

### 7.3 Datasets (Teacher)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/datasets` | ดู datasets ทั้งหมด |
| GET | `/datasets/{dataset_id}` | ดู dataset เดียว |
| POST | `/datasets` | สร้าง dataset |
| PUT | `/datasets/{dataset_id}` | แก้ไข dataset |
| DELETE | `/datasets/{dataset_id}` | ลบ dataset |

### 7.4 Assignments (Teacher)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/assignments` | ดู assignments ทั้งหมด |
| GET | `/assignments?category=JOIN` | กรองตาม category |
| GET | `/assignments/{assign_id}` | ดู assignment เดียว |
| POST | `/assignments` | สร้าง assignment |
| PUT | `/assignments/{assign_id}` | แก้ไข assignment |
| DELETE | `/assignments/{assign_id}` | ลบ assignment |

### 7.5 Exercises (Teacher)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/assignments/{assign_id}/exercises` | ดู exercises ใน assignment |
| GET | `/exercises/{exercise_id}` | ดู exercise เดียว |
| POST | `/assignments/{assign_id}/exercises` | สร้าง exercise |
| PUT | `/exercises/{exercise_id}` | แก้ไข exercise |
| DELETE | `/exercises/{exercise_id}` | ลบ exercise |

### 7.6 Test Cases (Teacher)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/exercises/{exercise_id}/test-cases` | ดู test cases |
| POST | `/exercises/{exercise_id}/test-cases` | สร้าง test case |
| PUT | `/test-cases/{case_id}` | แก้ไข test case |
| DELETE | `/test-cases/{case_id}` | ลบ test case |

### 7.7 Submissions (Student)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/exercises/{exercise_id}/submit` | ส่งคำตอบ |
| GET | `/exercises/{exercise_id}/submissions` | ดูประวัติการส่งของตัวเอง |
| GET | `/submissions/{submit_id}` | ดูผลการส่งครั้งนั้น |

### 7.8 Grading (Student)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/exercises/{exercise_id}/run` | รันทดสอบ (ไม่บันทึก) |

### 7.9 Reports (Teacher)
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/reports/assignments/{assign_id}` | สรุปคะแนน assignment |
| GET | `/reports/students/{student_id}` | ดูคะแนนนักศึกษาคนนั้น |

---

## 8. Frontend Pages ที่ต้องสร้าง

### 8.1 Public
| Page | Path | คำอธิบาย |
|------|------|----------|
| Login | `/login` | หน้า login ด้วย Google |

### 8.2 Student
| Page | Path | คำอธิบาย |
|------|------|----------|
| Assignments List | `/` | หน้ารวม assignments (กรองตาม category ได้) |
| Exercises List | `/assignments/:id` | รายการโจทย์ใน assignment |
| Exercise | `/exercises/:id` | หน้าทำโจทย์ (SQL Editor) |
| My Progress | `/my-progress` | ดูความคืบหน้าตัวเอง |

### 8.3 Teacher
| Page | Path | คำอธิบาย |
|------|------|----------|
| Dashboard | `/teacher` | หน้าหลักอาจารย์ |
| Manage Assignments | `/teacher/assignments` | จัดการ assignments |
| Create Assignment | `/teacher/assignments/new` | สร้าง assignment |
| Edit Assignment | `/teacher/assignments/:id/edit` | แก้ไข assignment |
| Manage Exercises | `/teacher/assignments/:id/exercises` | จัดการโจทย์ |
| Manage Datasets | `/teacher/datasets` | จัดการ datasets |
| View Scores | `/teacher/scores` | ดูคะแนนนักศึกษา |

### 8.4 Admin
| Page | Path | คำอธิบาย |
|------|------|----------|
| Dashboard | `/admin` | หน้าหลัก admin |
| Manage Users | `/admin/users` | จัดการผู้ใช้ |
| Upload Users | `/admin/users/upload` | อัปโหลด users จาก Excel |

---

## 9. สิ่งที่ต้องทำ (TODO)

### 9.1 Database
- [ ] สร้างตารางทั้ง 6 ตารางใน PostgreSQL
- [ ] ใส่ข้อมูลตัวอย่าง (seed data)

### 9.2 Backend (FastAPI)
- [ ] สร้าง API endpoints ทั้งหมด
- [ ] สร้าง SQL Grading Engine
- [ ] Authentication middleware (Google OAuth)
- [ ] Role-based access control
- [ ] Error handling

### 9.3 Frontend (React)
- [ ] หน้า Login
- [ ] หน้ารวม Assignments (+ กรองตาม category)
- [ ] หน้ารายการ Exercises
- [ ] หน้าทำโจทย์ (SQL Editor)
- [ ] หน้า Dashboard อาจารย์
- [ ] หน้าจัดการ Assignments/Exercises
- [ ] หน้าจัดการ Users (Admin)

### 9.4 Security
- [ ] แก้ hardcoded credentials
- [ ] แก้ CORS configuration
- [ ] ใช้ environment variables

---

## 10. Files ที่เกี่ยวข้อง

| ไฟล์ | ที่อยู่ | คำอธิบาย |
|------|--------|----------|
| Project Summary | `/mnt/user-data/outputs/sql_grader_final_summary.md` | ไฟล์นี้ |
| Data Dictionary | `/mnt/user-data/outputs/data_dictionary_v2.md` | รายละเอียดตาราง (version เก่า 8 ตาราง) |
| Project Proposal | `/mnt/user-data/uploads/CS03D-650710536-650710576.docx` | เอกสารโปรเจค |
| Existing Code | `/home/claude/sql-grader/SQL-Grader-demo2/` | โค้ดที่มีอยู่ |

---

## 11. หมายเหตุสำคัญ

1. **6 ตาราง** - users, datasets, assignments, exercises, test_cases, submissions
2. **ไม่มีระบบ Sections** - นักศึกษาทุกคนเห็น assignments ทั้งหมด
3. **category** - เป็น field ใน assignments (ไม่แยกตาราง topics)
4. **results เป็น JSONB** - เก็บผลตรวจแต่ละ test case ใน submissions (ไม่แยกตาราง submission_results)
5. **dataset_id เป็น NULL ได้** - สำหรับโจทย์ให้นักศึกษาสร้างตารางเอง
6. **ใช้ Google OAuth** - ไม่เก็บ password ในระบบ
7. **Partial Credit** - ให้คะแนนบางส่วนได้ผ่าน test_cases
