-- =============================================================
-- Migration 006: per-teacher student roster
-- =============================================================
-- Purpose
--   Give each teacher a private roster of students they "own".
--   The Student Management page and the class Add-Student picker
--   filter by this roster so teacher A never sees teacher B's
--   students (and vice-versa).
--
-- Properties
--   * Idempotent (CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING).
--   * Transactional: rolls back on error.
--   * Back-compatible: seeds the new table from existing
--     class_teachers x class_students so nothing disappears on
--     first run after migration.
-- =============================================================

SET client_encoding = 'UTF8';

BEGIN;

CREATE TABLE IF NOT EXISTS teacher_students (
    teacher_id  VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    student_id  VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (teacher_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher
    ON teacher_students(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_students_student
    ON teacher_students(student_id);

-- Backfill: every (teacher, student) pair already connected through
-- a shared class becomes a roster row. Role guards enforce that only
-- role='teacher' and role='student' rows participate.
INSERT INTO teacher_students (teacher_id, student_id)
SELECT DISTINCT ct.user_id, cs.user_id
FROM   class_teachers ct
JOIN   class_students cs ON cs.class_id = ct.class_id
JOIN   users t ON t.user_id = ct.user_id AND t.role = 'teacher'
JOIN   users s ON s.user_id = cs.user_id AND s.role = 'student'
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    v_pairs INT;
BEGIN
    SELECT COUNT(*) INTO v_pairs FROM teacher_students;
    RAISE NOTICE 'teacher_students now contains % (teacher,student) pairs.', v_pairs;
END $$;

COMMIT;
