-- =============================================================
-- Migration 003: Legacy data backfill into the new class schema
-- =============================================================
-- Purpose
--   Preserve existing users + assignments by enrolling them into a
--   fallback "Legacy Data Backup" class so that the new M:N graph
--   (class_students / class_teachers / class_assignments) has no
--   orphaned rows after migration 002.
--
-- Properties
--   * Idempotent: safe to run any number of times.
--     - Class creation uses ON CONFLICT (code) DO NOTHING.
--     - Every enrollment uses ON CONFLICT DO NOTHING (PK is a
--       composite of both FKs, so duplicates are rejected silently).
--   * Transactional: everything rolls back on error.
--   * Strict role guard: only rows where users.role matches the
--     target side are inserted.
--
-- Usage
--   psql -U postgres -d Grader_SQL -f Backend/migrations/003_migrate_legacy_data.sql
--   (set PGCLIENTENCODING=UTF8 first on Windows if needed)
-- =============================================================

SET client_encoding = 'UTF8';

BEGIN;

-- 1) Fallback class ------------------------------------------------
INSERT INTO classes (code, name, semester)
VALUES ('LEGACY-BACKUP', 'Legacy Data Backup', 'legacy')
ON CONFLICT (code) DO NOTHING;

-- Resolve its class_id once; reused by the rest of the script.
-- (Using a CTE means we don't depend on a known numeric id.)

-- 2) Backfill students ---------------------------------------------
-- NOTE: We intentionally do NOT enroll every student into LEGACY-BACKUP.
-- Doing so leaked every legacy assignment to every student via
-- class_students -> class_assignments. Students must be explicitly
-- enrolled per class via the ClassManagement UI (or
-- assignment_students for per-student overrides).

-- 3) Backfill teachers --------------------------------------------
-- NOTE: We intentionally do NOT enroll every teacher into LEGACY-BACKUP.
-- Doing so used to leak every legacy assignment to every teacher via
-- class_teachers -> class_assignments. Only the actual creators are
-- added to LEGACY-BACKUP in step 5 below, so each teacher sees only
-- assignments they themselves own.

-- 4) Backfill assignments ------------------------------------------
WITH fallback AS (
    SELECT class_id FROM classes WHERE code = 'LEGACY-BACKUP'
)
INSERT INTO class_assignments (class_id, assign_id)
SELECT f.class_id, a.assign_id
FROM   assignments a
CROSS JOIN fallback f
ON CONFLICT DO NOTHING;

-- 5) Optional: also enroll the assignment creator as a teacher of
--    the fallback class, so ownership queries still resolve even if
--    the creator had no class membership previously.
WITH fallback AS (
    SELECT class_id FROM classes WHERE code = 'LEGACY-BACKUP'
)
INSERT INTO class_teachers (class_id, user_id, role_in_class)
SELECT f.class_id, a.created_by, 'legacy-creator'
FROM   assignments a
CROSS JOIN fallback f
JOIN   users u ON u.user_id = a.created_by AND u.role = 'teacher'
WHERE  a.created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6) Post-migration summary (printed to psql) ----------------------
--    Runs inside the transaction, so numbers reflect the pending
--    commit. If any count is 0 that is a red flag — see
--    migration_health_check.md.
DO $$
DECLARE
    v_class_id          INT;
    v_student_total     INT;
    v_teacher_total     INT;
    v_assignment_total  INT;
    v_students_enrolled INT;
    v_teachers_enrolled INT;
    v_assigns_linked    INT;
BEGIN
    SELECT class_id INTO v_class_id FROM classes WHERE code = 'LEGACY-BACKUP';

    SELECT COUNT(*) INTO v_student_total    FROM users WHERE role = 'student';
    SELECT COUNT(*) INTO v_teacher_total    FROM users WHERE role = 'teacher';
    SELECT COUNT(*) INTO v_assignment_total FROM assignments;

    SELECT COUNT(*) INTO v_students_enrolled
      FROM class_students WHERE class_id = v_class_id;
    SELECT COUNT(*) INTO v_teachers_enrolled
      FROM class_teachers WHERE class_id = v_class_id;
    SELECT COUNT(*) INTO v_assigns_linked
      FROM class_assignments WHERE class_id = v_class_id;

    RAISE NOTICE '--- Legacy Backfill Summary ---';
    RAISE NOTICE 'Fallback class_id ............. %', v_class_id;
    RAISE NOTICE 'Students  (total / backfilled)  %  /  %  (backfilled should be 0 -- enroll via UI)', v_student_total, v_students_enrolled;
    RAISE NOTICE 'Teachers  (total / creators-only) %  /  %', v_teacher_total, v_teachers_enrolled;
    RAISE NOTICE 'Assigns   (total / backfilled)  %  /  %', v_assignment_total, v_assigns_linked;
END $$;

COMMIT;
