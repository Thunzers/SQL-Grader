-- =============================================================
-- Migration 005: Clean up over-enrolled legacy students
-- =============================================================
-- Why
--   Migration 003 previously enrolled EVERY student into the
--   LEGACY-BACKUP class. Combined with step 4 (every assignment
--   linked to LEGACY-BACKUP), this caused every student to see
--   every legacy assignment through class_students ->
--   class_assignments -- a fail-open visibility leak matching the
--   teacher bug already fixed by migration 004.
--
--   Migration 003 has since been corrected (step 2 removed). This
--   migration removes the student over-enrollment already committed
--   to the database.
--
-- What it does
--   Deletes all class_students rows inside LEGACY-BACKUP. Real
--   enrollments must now be created via the ClassManagement UI
--   (POST /api/classes/{id}/students) or through
--   assignment_students overrides.
--
-- Safety
--   Read-check first, then DELETE. Idempotent: running twice is a
--   no-op (second run finds 0 rows).
-- =============================================================

SET client_encoding = 'UTF8';

BEGIN;

DO $$
DECLARE
    v_class_id    INT;
    v_affected    INT;
    v_remaining   INT;
BEGIN
    SELECT class_id INTO v_class_id
    FROM   classes
    WHERE  code = 'LEGACY-BACKUP';

    IF v_class_id IS NULL THEN
        RAISE NOTICE 'LEGACY-BACKUP class not found -- nothing to clean up.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_affected
    FROM   class_students
    WHERE  class_id = v_class_id;

    RAISE NOTICE 'Will remove % over-enrolled student rows from LEGACY-BACKUP.', v_affected;

    DELETE FROM class_students
    WHERE class_id = v_class_id;

    SELECT COUNT(*) INTO v_remaining
    FROM   class_students
    WHERE  class_id = v_class_id;

    RAISE NOTICE 'Remaining LEGACY-BACKUP students: % (should be 0)', v_remaining;
END $$;

COMMIT;

-- After this migration, a student will see an assignment only if:
--   (a) they are enrolled in a class that links it via class_assignments,
--       OR
--   (b) they have a direct row in assignment_students.
--
-- Verify per-student visibility with:
--   SELECT a.assign_id, a.title
--   FROM   assignments a
--   WHERE  a.is_active = TRUE
--     AND (a.assign_id IN (SELECT ca.assign_id
--                          FROM class_students cs
--                          JOIN class_assignments ca ON ca.class_id = cs.class_id
--                          WHERE cs.user_id = 'S001')
--          OR a.assign_id IN (SELECT assign_id
--                             FROM assignment_students
--                             WHERE user_id = 'S001'));
