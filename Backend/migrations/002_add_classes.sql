-- Migration 002: Add class/teacher/student/assignment relationships (M:N)
SET client_encoding = 'UTF8';
-- Goal:
--   1) Identify which teacher(s) own an assignment  (via class_teachers + class_assignments)
--   2) Identify which teacher(s) a student belongs to (via class_students + class_teachers)
--   3) Determine which assignments a student must complete (via class_assignments + assignment_students)

BEGIN;

CREATE TABLE IF NOT EXISTS classes (
    class_id    SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    semester    VARCHAR(20),
    created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_teachers (
    class_id       INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    user_id        VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_in_class  VARCHAR(20) DEFAULT 'owner',
    PRIMARY KEY (class_id, user_id)
);

CREATE TABLE IF NOT EXISTS class_students (
    class_id    INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    user_id     VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (class_id, user_id)
);

CREATE TABLE IF NOT EXISTS class_assignments (
    class_id    INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    assign_id   INT NOT NULL REFERENCES assignments(assign_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (class_id, assign_id)
);

CREATE TABLE IF NOT EXISTS assignment_students (
    assign_id   INT NOT NULL REFERENCES assignments(assign_id) ON DELETE CASCADE,
    user_id     VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (assign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_user    ON class_students(user_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_user    ON class_teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_a    ON class_assignments(assign_id);
CREATE INDEX IF NOT EXISTS idx_assignment_students_u  ON assignment_students(user_id);

COMMIT;
