-- Migration script for Assignment/Exercise system
-- สร้างตาราง datasets, assignments, exercises, test_cases, submissions

-- ========================================
-- 1. DATASETS - ฐานข้อมูลจำลองสำหรับรัน SQL
-- ========================================
CREATE TABLE IF NOT EXISTS datasets (
    dataset_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    schema_sql TEXT NOT NULL,           -- SQL สร้างตาราง
    seed_data_sql TEXT NOT NULL,        -- SQL ใส่ข้อมูล
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets(name);
CREATE INDEX IF NOT EXISTS idx_datasets_created_by ON datasets(created_by);

-- ========================================
-- 2. ASSIGNMENTS - ชุดแบบฝึกหัด
-- ========================================
CREATE TABLE IF NOT EXISTS assignments (
    assign_id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,       -- หมวดหมู่: SELECT, JOIN, GROUP BY, Subquery, etc.
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,                -- NULL = เริ่มได้ทันที
    due_date TIMESTAMP,                  -- NULL = ไม่มีกำหนด
    max_attempts INT DEFAULT 0 CHECK (max_attempts >= 0),  -- 0 = ไม่จำกัด
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_category ON assignments(category);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

-- ========================================
-- 3. EXERCISES - โจทย์แต่ละข้อ
-- ========================================
CREATE TABLE IF NOT EXISTS exercises (
    exercise_id SERIAL PRIMARY KEY,
    assign_id INT NOT NULL REFERENCES assignments(assign_id) ON DELETE CASCADE,
    dataset_id INT REFERENCES datasets(dataset_id) ON DELETE SET NULL,  -- NULL ได้ (โจทย์สร้างตาราง)
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,           -- เนื้อหาโจทย์
    expected_query TEXT NOT NULL,        -- SQL คำตอบที่ถูก
    points INT DEFAULT 10 CHECK (points > 0),
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    order_num INT DEFAULT 0,             -- ลำดับโจทย์
    hint TEXT,                           -- คำใบ้
    show_solution BOOLEAN DEFAULT FALSE, -- แสดงเฉลยหลังส่ง
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_assign ON exercises(assign_id);
CREATE INDEX IF NOT EXISTS idx_exercises_dataset ON exercises(dataset_id);
CREATE INDEX IF NOT EXISTS idx_exercises_order ON exercises(assign_id, order_num);

-- ========================================
-- 4. TEST_CASES - ชุดทดสอบสำหรับตรวจคำตอบ
-- ========================================
CREATE TABLE IF NOT EXISTS test_cases (
    case_id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    case_name VARCHAR(100),
    expected_output JSONB NOT NULL,      -- ผลลัพธ์ที่คาดหวัง
    points INT DEFAULT 1 CHECK (points > 0),
    is_hidden BOOLEAN DEFAULT FALSE      -- ซ่อนจากนักศึกษา
);

CREATE INDEX IF NOT EXISTS idx_test_cases_exercise ON test_cases(exercise_id);

-- ========================================
-- 5. SUBMISSIONS - คำตอบที่นักศึกษาส่ง
-- ========================================
CREATE TABLE IF NOT EXISTS submissions (
    submit_id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
    submitted_query TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    total_score DECIMAL(5,2) DEFAULT 0 CHECK (total_score >= 0),
    max_score DECIMAL(5,2),
    attempt_number INT DEFAULT 1 CHECK (attempt_number > 0),
    results JSONB,                       -- ผลตรวจแต่ละ test case
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_exercise ON submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(submitted_at DESC);

-- ========================================
-- SAMPLE DATA (Optional)
-- ========================================

-- Sample Dataset
INSERT INTO datasets (name, description, schema_sql, seed_data_sql, created_by)
VALUES (
    'employees_db',
    'ฐานข้อมูลพนักงานและแผนก สำหรับฝึก JOIN',
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
        (3, ''สมศักดิ์'', 28000, 1),
        (4, ''สมใจ'', 50000, 2);
    INSERT INTO departments VALUES
        (1, ''IT''),
        (2, ''HR''),
        (3, ''Marketing'');',
    NULL
) ON CONFLICT (name) DO NOTHING;

-- Sample Assignment
INSERT INTO assignments (category, title, description, is_active, created_by)
VALUES (
    'SELECT',
    'SELECT พื้นฐาน ชุดที่ 1',
    'เรียนรู้การใช้คำสั่ง SELECT เบื้องต้น',
    TRUE,
    NULL
) ON CONFLICT DO NOTHING;

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('datasets', 'assignments', 'exercises', 'test_cases', 'submissions')
ORDER BY table_name;
