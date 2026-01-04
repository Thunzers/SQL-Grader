# SQL-Grader Project Summary
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
| **teacher** | สร้าง/แก้ไขโจทย์, ดูคะแนนนักศึกษาทุกคน |
| **admin** | จัดการผู้ใช้, จัดการระบบทั้งหมด |

---

## 2. Flow การใช้งาน (นักศึกษา)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: หน้าหลัก - เลือก Topic                                          │
├─────────────────────────────────────────────────────────────────────────┤
│   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐        │
│   │  SELECT   │   │   JOIN    │   │ GROUP BY  │   │ Subquery  │        │
│   └───────────┘   └───────────┘   └───────────┘   └───────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: เลือก Assignment (ชุดแบบฝึกหัด)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│   📚 INNER JOIN เบื้องต้น (5 ข้อ)                                        │
│   📚 LEFT/RIGHT JOIN (4 ข้อ)                                            │
│   📚 Multiple Table JOIN (3 ข้อ)                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: เลือก Exercise (โจทย์)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│   ข้อ 1: เชื่อม 2 ตาราง [Easy] ✅                                        │
│   ข้อ 2: JOIN กับ WHERE [Easy] ✅                                        │
│   ข้อ 3: JOIN หลาย columns [Medium] ❌                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: ทำโจทย์ (SQL Editor)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│   โจทย์: แสดงชื่อพนักงานและแผนก                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ SELECT e.name, d.dept_name                                      │   │
│   │ FROM employees e                                                 │   │
│   │ INNER JOIN departments d ON e.dept_id = d.id                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│   [💡 ดูคำใบ้]     [▶️ รันทดสอบ]     [📤 ส่งคำตอบ]                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: ดูผลการตรวจ                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│   คะแนน: 6/10                                                           │
│   ✅ Test 1: Basic Test (3/3)                                           │
│   ✅ Test 2: Edge Case (3/3)                                            │
│   ❌ Test 3: Hidden Test (0/4)                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. การตัดสินใจสำคัญ

### 3.1 ไม่มีระบบแบ่งกลุ่มเรียน (Sections)
**เดิม:** มี courses → sections → section_students (แบบมหาวิทยาลัยทั่วไป)

**ที่ตกลงกัน:** ตัดออก เพราะ:
- เว็บนี้มีแค่วิชา SQL วิชาเดียว
- ไม่ต้องแบ่งกลุ่มเรียน
- นักศึกษาทุกคนเห็นแบบฝึกหัดทั้งหมด เลือกทำได้เลย

**ตารางที่ตัดออก:**
- ~~courses~~ → เปลี่ยนเป็น topics (หัวข้อเรื่อง)
- ~~sections~~
- ~~section_students~~

### 3.2 Topics คือหัวข้อเรื่อง ไม่ใช่รายวิชา
| เดิม (courses) | ใหม่ (topics) |
|----------------|---------------|
| CS231 Database Systems | SELECT พื้นฐาน |
| CS232 Advanced DB | JOIN |
| | GROUP BY |
| | Subquery |

### 3.3 Data Types ที่เลือกใช้

#### SERIAL สำหรับ Primary Keys
ใช้กับ: topic_id, assign_id, dataset_id, exercise_id, case_id, submit_id, result_id

**เหตุผล:**
- ไม่มี Natural Key ที่เหมาะสม
- Auto-increment ง่ายต่อการจัดการ
- INT 4 bytes ประหยัดและเร็ว
- ไม่ซ้ำแน่นอน

**ยกเว้น:** users.student_id ใช้ VARCHAR(20) เพราะมีรหัสจริงอยู่แล้ว (รหัสนักศึกษา)

#### JSONB สำหรับผลลัพธ์ SQL
ใช้กับ: test_cases.expected_output, submission_results.actual_output

**เหตุผล:**
- ผลลัพธ์ SQL มีโครงสร้างไม่แน่นอน (column/row ต่างกัน)
- เก็บทั้งก้อนในฟิลด์เดียว ง่ายกว่าสร้างหลายตาราง
- Query ได้, ทำ Index ได้

**ตัวอย่างข้อมูล:**
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

### 3.4 Datasets คือฐานข้อมูลจำลอง
**ใช้ทำอะไร:**
1. เก็บ SQL สร้างตาราง (schema_sql)
2. เก็บ SQL ใส่ข้อมูล (seed_data_sql)
3. ใช้ซ้ำได้หลายโจทย์

**Flow การตรวจ:**
```
นักศึกษาส่ง SQL
    ↓
สร้าง Database ชั่วคราว (Sandbox)
    ↓
รัน schema_sql (สร้างตาราง)
    ↓
รัน seed_data_sql (ใส่ข้อมูล)
    ↓
รัน SQL ของนักศึกษา
    ↓
เทียบผลกับ expected_output
    ↓
ลบ Database ชั่วคราว
```

**กรณีพิเศษ:** โจทย์ให้สร้างตารางเอง
- dataset_id เป็น NULL ได้
- หรือมี dataset บางส่วน (เช่น มีตาราง departments ให้อ้างอิง FK)

### 3.5 Submission Results คือผลตรวจแยกรายละเอียด
| ตาราง | เก็บอะไร |
|-------|----------|
| **submissions** | ภาพรวม: query ที่ส่ง, คะแนนรวม, ผ่าน/ไม่ผ่าน |
| **submission_results** | รายละเอียด: ผลแต่ละ test case, คะแนนแต่ละข้อ |

**ประโยชน์:**
- Feedback ละเอียด (รู้ว่าพลาดตรงไหน)
- Partial Credit (ให้คะแนนบางส่วนได้)
- วิเคราะห์ได้ (อาจารย์ดูว่า test case ไหนพลาดเยอะ)

### 3.6 Fields ที่พิจารณาตัดออก

| Field | ตาราง | สถานะ | เหตุผล |
|-------|-------|-------|--------|
| icon | topics | **พิจารณาตัด** | ไม่จำเป็น แค่ทำให้สวย |
| order_num | topics | **พิจารณาตัด** | มีไม่กี่หัวข้อ เรียงตาม id ได้ |
| order_num | exercises | **เก็บไว้** | จำเป็น โจทย์ควรเรียงจากง่าย→ยาก |

---

## 4. Database Schema (8 ตาราง)

### 4.1 ER Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ student_id (PK) │──────────────────────────────────────────┐
│ name            │                                          │
│ surname         │                                          │
│ email (UQ)      │                                          │
│ role            │                                          │
│ created_at      │                                          │
└─────────────────┘                                          │
        │                                                    │
        │ created_by                                         │ student_id
        ▼                                                    │
┌─────────────────┐       ┌─────────────────┐               │
│     topics      │       │    datasets     │               │
├─────────────────┤       ├─────────────────┤               │
│ topic_id (PK)   │       │ dataset_id (PK) │               │
│ title (UQ)      │       │ name (UQ)       │               │
│ description     │       │ description     │               │
│ is_active       │       │ schema_sql      │               │
│ created_at      │       │ seed_data_sql   │               │
└─────────────────┘       │ created_by (FK) │───► users     │
        │                 │ created_at      │               │
        │                 └─────────────────┘               │
        │ topic_id                │                         │
        ▼                         │ dataset_id              │
┌─────────────────┐               │                         │
│   assignments   │               │                         │
├─────────────────┤               │                         │
│ assign_id (PK)  │               │                         │
│ topic_id (FK)   │               │                         │
│ title           │               │                         │
│ description     │               │                         │
│ start_date      │               │                         │
│ due_date        │               │                         │
│ max_attempts    │               │                         │
│ is_active       │               │                         │
│ created_by (FK) │───► users     │                         │
│ created_at      │               │                         │
└─────────────────┘               │                         │
        │                         │                         │
        │ assign_id               │                         │
        ▼                         ▼                         │
┌─────────────────────────────────────┐                     │
│            exercises                │                     │
├─────────────────────────────────────┤                     │
│ exercise_id (PK)                    │                     │
│ assign_id (FK)                      │                     │
│ dataset_id (FK) ← NULL ได้          │                     │
│ title                               │                     │
│ description                         │                     │
│ expected_query                      │                     │
│ points                              │                     │
│ difficulty (easy/medium/hard)       │                     │
│ order_num                           │                     │
│ hint                                │                     │
│ show_solution                       │                     │
│ created_at                          │                     │
└─────────────────────────────────────┘                     │
        │                                                   │
        ├──────────────────────────────────┐                │
        │                                  │                │
        ▼                                  ▼                │
┌─────────────────┐               ┌─────────────────┐       │
│   test_cases    │               │   submissions   │       │
├─────────────────┤               ├─────────────────┤       │
│ case_id (PK)    │               │ submit_id (PK)  │       │
│ exercise_id (FK)│               │ exercise_id (FK)│       │
│ case_name       │               │ student_id (FK) │───────┘
│ expected_output │ (JSONB)       │ submitted_query │
│ points          │               │ is_correct      │
│ is_hidden       │               │ total_score     │
└─────────────────┘               │ max_score       │
        │                         │ attempt_number  │
        │                         │ execution_time_ms│
        │                         │ error_message   │
        │                         │ submitted_at    │
        │                         └─────────────────┘
        │                                  │
        │ case_id                          │ submit_id
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
            ┌───────────────────┐
            │submission_results │
            ├───────────────────┤
            │ result_id (PK)    │
            │ submit_id (FK)    │
            │ case_id (FK)      │
            │ is_passed         │
            │ actual_output     │ (JSONB)
            │ points_earned     │
            │ execution_time_ms │
            └───────────────────┘
```

### 4.2 สรุปตารางและความสัมพันธ์

| ตาราง | คำอธิบาย | ความสัมพันธ์ |
|-------|----------|--------------|
| **users** | ผู้ใช้งาน | - |
| **topics** | หัวข้อเรื่อง (SELECT, JOIN, etc.) | 1:N → assignments |
| **datasets** | ฐานข้อมูลจำลอง | 1:N → exercises |
| **assignments** | ชุดแบบฝึกหัด | 1:N → exercises |
| **exercises** | โจทย์แต่ละข้อ | 1:N → test_cases, submissions |
| **test_cases** | ชุดทดสอบ | 1:N → submission_results |
| **submissions** | การส่งคำตอบ | 1:N → submission_results |
| **submission_results** | ผลตรวจแต่ละ test case | - |

---

## 5. SQL สร้างทุกตาราง

```sql
-- ========================================
-- 1. USERS - ผู้ใช้งาน
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
-- 2. TOPICS - หัวข้อเรื่อง
-- ========================================
CREATE TABLE topics (
    topic_id SERIAL PRIMARY KEY,
    title VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_topics_active ON topics(is_active);

-- ========================================
-- 3. DATASETS - ฐานข้อมูลจำลอง
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
CREATE INDEX idx_datasets_created_by ON datasets(created_by);

-- ========================================
-- 4. ASSIGNMENTS - ชุดแบบฝึกหัด
-- ========================================
CREATE TABLE assignments (
    assign_id SERIAL PRIMARY KEY,
    topic_id INT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    max_attempts INT DEFAULT 0 CHECK (max_attempts >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assignments_topic ON assignments(topic_id);
CREATE INDEX idx_assignments_active ON assignments(is_active);
CREATE INDEX idx_assignments_created_by ON assignments(created_by);

-- ========================================
-- 5. EXERCISES - โจทย์
-- ========================================
CREATE TABLE exercises (
    exercise_id SERIAL PRIMARY KEY,
    assign_id INT NOT NULL REFERENCES assignments(assign_id) ON DELETE CASCADE,
    dataset_id INT REFERENCES datasets(dataset_id),  -- NULL ได้ (กรณีโจทย์สร้างตาราง)
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    expected_query TEXT NOT NULL,
    points INT DEFAULT 10 CHECK (points > 0),
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    order_num INT DEFAULT 0,
    hint TEXT,
    show_solution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exercises_assign ON exercises(assign_id);
CREATE INDEX idx_exercises_dataset ON exercises(dataset_id);
CREATE INDEX idx_exercises_order ON exercises(assign_id, order_num);

-- ========================================
-- 6. TEST_CASES - ชุดทดสอบ
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
-- 7. SUBMISSIONS - การส่งคำตอบ
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
    execution_time_ms INT,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_submissions_exercise ON submissions(exercise_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_date ON submissions(submitted_at DESC);
CREATE INDEX idx_submissions_student_exercise ON submissions(student_id, exercise_id);

-- ========================================
-- 8. SUBMISSION_RESULTS - ผลตรวจแต่ละ test case
-- ========================================
CREATE TABLE submission_results (
    result_id SERIAL PRIMARY KEY,
    submit_id INT NOT NULL REFERENCES submissions(submit_id) ON DELETE CASCADE,
    case_id INT NOT NULL REFERENCES test_cases(case_id) ON DELETE CASCADE,
    is_passed BOOLEAN DEFAULT FALSE,
    actual_output JSONB,
    points_earned DECIMAL(5,2) DEFAULT 0 CHECK (points_earned >= 0),
    execution_time_ms INT
);

CREATE INDEX idx_submission_results_submit ON submission_results(submit_id);
CREATE INDEX idx_submission_results_case ON submission_results(case_id);
```

---

## 6. ตัวอย่างข้อมูล

### 6.1 Topics
```sql
INSERT INTO topics (title, description) VALUES
('SELECT พื้นฐาน', 'เรียนรู้การดึงข้อมูลจากตาราง'),
('WHERE & Conditions', 'เงื่อนไขในการกรองข้อมูล'),
('JOIN', 'การเชื่อมตาราง'),
('GROUP BY', 'การจัดกลุ่มข้อมูล'),
('Subquery', 'Query ซ้อน Query');
```

### 6.2 Datasets
```sql
INSERT INTO datasets (name, description, schema_sql, seed_data_sql) VALUES
('employees_db', 'ฐานข้อมูลพนักงาน', 
'CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    salary INT,
    dept_id INT
);
CREATE TABLE departments (
    id INT PRIMARY KEY,
    dept_name VARCHAR(100)
);',
'INSERT INTO employees VALUES 
    (1, ''สมชาย'', 35000, 1),
    (2, ''สมหญิง'', 42000, 2),
    (3, ''สมศักดิ์'', 28000, 1);
INSERT INTO departments VALUES 
    (1, ''IT''),
    (2, ''HR'');'
);
```

### 6.3 Test Cases (expected_output format)
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

---

## 7. สิ่งที่ต้องพัฒนาต่อ

### 7.1 Backend (FastAPI)
- [ ] API endpoints ตาม schema ใหม่
- [ ] SQL Grading Engine (สร้าง sandbox, รัน SQL, เทียบผล)
- [ ] Authentication middleware
- [ ] Role-based access control

### 7.2 Frontend (React)
- [ ] หน้าเลือก Topic
- [ ] หน้าเลือก Assignment
- [ ] หน้าทำโจทย์ (SQL Editor)
- [ ] หน้าดูผลการตรวจ
- [ ] Dashboard อาจารย์
- [ ] Dashboard นักศึกษา

### 7.3 SQL Grading Engine
```
Input: student_query, dataset_id, exercise_id
    ↓
1. สร้าง temp database
2. รัน dataset.schema_sql
3. รัน dataset.seed_data_sql
4. รัน student_query
5. ดึง test_cases ของ exercise
6. เทียบผลแต่ละ test case
7. บันทึก submissions + submission_results
8. ลบ temp database
    ↓
Output: total_score, is_correct, results[]
```

---

## 8. Files ที่เกี่ยวข้อง

| ไฟล์ | ที่อยู่ | คำอธิบาย |
|------|--------|----------|
| Data Dictionary | `/mnt/user-data/outputs/data_dictionary_v2.md` | รายละเอียดทุกตาราง |
| Project Proposal | `/mnt/user-data/uploads/CS03D-650710536-650710576.docx` | เอกสารโปรเจค |
| Existing Code | `/home/claude/sql-grader/SQL-Grader-demo2/` | โค้ดที่มีอยู่ |

---

## 9. หมายเหตุสำคัญ

1. **ไม่มีระบบ Sections** - นักศึกษาทุกคนเห็นแบบฝึกหัดทั้งหมด
2. **dataset_id เป็น NULL ได้** - สำหรับโจทย์ให้สร้างตารางเอง
3. **ใช้ Google OAuth** - ไม่เก็บ password ในระบบ
4. **JSONB สำหรับผลลัพธ์** - ยืดหยุ่นรองรับผลลัพธ์ต่างๆ
5. **Partial Credit** - ให้คะแนนบางส่วนได้ผ่าน test_cases
