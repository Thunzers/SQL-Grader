-- Migration: Add required_keywords to exercises table
-- Run this on your database to add the new column

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS required_keywords JSONB DEFAULT '[]';

-- Example usage:
-- UPDATE exercises SET required_keywords = '["WHERE", "AND"]' WHERE exercise_id = 1;
