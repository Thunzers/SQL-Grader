-- =============================================================
-- Migration 004: Clean up over-enrolled legacy teachers
-- =============================================================
-- Why
--   Migration 003 previously enrolled EVERY teacher into the
--   LEGACY-BACKUP class with role_in_class='legacy'. Combined with
--   step 4 (every assignment linked to LEGACY-BACKUP), this caused
--   GET /api/assignments?user_id=<any teacher> to return EVERY
--   legacy assignment -- a fail-open access-control leak.
--
--   Migration 003 has since been corrected (step 3 removed). This
--   migration removes the over-enrollment that is already committed
--   to the database.
--
-- What it does
--   Deletes class_teachers rows where role_in_class='legacy' inside
--   LEGACY-BACKUP. Rows inserted by step 5 use role_in_class=
--   'legacy-creator' and are preserved, so each teacher keeps
--   ownership of assignments they actually created.
--
-- Safety
--   Read-check first, then DELETE. Idempotent: running twice is a
--   no-op (second run finds 0 rows).
-- =============================================================

SET client_encoding = 'UTF8';

BEGIN;

-- 1) Preview what's about to be removed (rowcount in RAISE NOTICE).
DO $$
DECLARE
    v_class_id        INT;
    v_affected        INT;
    v_remaining       INT;
BEGIN
    SELECT class_id INTO v_class_id
    FROM   classes
    WHERE  code = 'LEGACY-BACKUP';

    IF v_class_id IS NULL THEN
        RAISE NOTICE 'LEGACY-BACKUP class not found -- nothing to clean up.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_affected
    FROM   class_teachers
    WHERE  class_id       = v_class_id
      AND  role_in_class  = 'legacy';

    RAISE NOTICE 'Will remove % over-enrolled teacher rows from LEGACY-BACKUP.', v_affected;

    DELETE FROM class_teachers
    WHERE class_id      = v_class_id
      AND role_in_class = 'legacy';

    SELECT COUNT(*) INTO v_remaining
    FROM   class_teachers
    WHERE  class_id = v_class_id;

    RAISE NOTICE 'Remaining LEGACY-BACKUP teachers (creators only): %', v_remaining;
END $$;

COMMIT;

-- After running this, verify:
--   SELECT ct.user_id, ct.role_in_class
--   FROM   class_teachers ct
--   JOIN   classes c ON c.class_id = ct.class_id
--   WHERE  c.code = 'LEGACY-BACKUP';
-- Expect only rows with role_in_class = 'legacy-creator'.
