-- Seed sample data for the new class-based relationships.
-- Safe to re-run (uses ON CONFLICT DO NOTHING).

SET client_encoding = 'UTF8';

BEGIN;

-- 1) Classes
INSERT INTO classes (class_id, code, name, semester) VALUES
    (1, 'CS101-2567-S1', 'Intro to SQL - Section 1', '2567/1'),
    (2, 'CS101-2567-S2', 'Intro to SQL - Section 2', '2567/1'),
    (3, 'DB201-2567-S1', 'Database Systems',         '2567/1')
ON CONFLICT (class_id) DO NOTHING;

-- Keep sequence aligned with manual IDs above
SELECT setval('classes_class_id_seq', (SELECT COALESCE(MAX(class_id), 1) FROM classes));

-- 2) Teachers assigned to classes (M:N)
--    Adjust user_id values to match real teachers in your users table.
INSERT INTO class_teachers (class_id, user_id, role_in_class)
SELECT v.class_id, v.user_id, v.role_in_class
FROM (VALUES
    (1, 'T001', 'owner'),
    (2, 'T001', 'owner'),
    (2, 'T002', 'co-teacher'),
    (3, 'T002', 'owner')
) AS v(class_id, user_id, role_in_class)
WHERE EXISTS (SELECT 1 FROM users u WHERE u.user_id = v.user_id AND u.role = 'teacher')
ON CONFLICT DO NOTHING;

-- 3) Students enrolled in classes (M:N)
INSERT INTO class_students (class_id, user_id)
SELECT v.class_id, v.user_id
FROM (VALUES
    (1, 'S001'),
    (1, 'S002'),
    (2, 'S003'),
    (3, 'S001'),   -- S001 enrolled in 2 classes
    (3, 'S004')
) AS v(class_id, user_id)
WHERE EXISTS (SELECT 1 FROM users u WHERE u.user_id = v.user_id AND u.role = 'student')
ON CONFLICT DO NOTHING;

-- 4) Assignments given to classes (M:N)
--    Only inserts rows where both sides exist.
INSERT INTO class_assignments (class_id, assign_id)
SELECT v.class_id, v.assign_id
FROM (VALUES
    (1, 1),
    (1, 2),
    (2, 1),
    (3, 3)
) AS v(class_id, assign_id)
WHERE EXISTS (SELECT 1 FROM assignments a WHERE a.assign_id = v.assign_id)
ON CONFLICT DO NOTHING;

-- 5) (Optional) Individual-only assignments (e.g. make-up exam)
INSERT INTO assignment_students (assign_id, user_id)
SELECT v.assign_id, v.user_id
FROM (VALUES
    (4, 'S002')
) AS v(assign_id, user_id)
WHERE EXISTS (SELECT 1 FROM assignments a WHERE a.assign_id = v.assign_id)
  AND EXISTS (SELECT 1 FROM users u WHERE u.user_id = v.user_id)
ON CONFLICT DO NOTHING;

COMMIT;
