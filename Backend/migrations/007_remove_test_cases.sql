-- =============================================================
-- Migration 007: Remove test_cases table, add check_order to exercises
-- =============================================================
-- Purpose
--   The platform now uses Golden Query Equivalence exclusively.
--   Each exercise already has an expected_query (the golden query).
--   The separate test_cases table is no longer needed.
--
--   This migration:
--     1. Adds a check_order column to exercises (default FALSE).
--     2. Drops the test_cases table.
--
-- Properties
--   * Idempotent where possible.
--   * Transactional: rolls back on error.
-- =============================================================

SET client_encoding = 'UTF8';

BEGIN;

-- 1. Add check_order to exercises if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exercises' AND column_name = 'check_order'
    ) THEN
        ALTER TABLE exercises ADD COLUMN check_order BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added check_order column to exercises table.';
    ELSE
        RAISE NOTICE 'check_order column already exists on exercises table.';
    END IF;
END $$;

-- 2. Drop test_cases table
DROP TABLE IF EXISTS test_cases;

COMMIT;
