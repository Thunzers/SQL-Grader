-- Migration script for users table
-- This ensures the users table has the correct schema with default role as 'student'

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add created_at column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Set default value for role column (for existing tables)
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student';

-- Ensure role is NOT NULL
DO $$
BEGIN
    ALTER TABLE users ALTER COLUMN role SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- If there are NULL values, set them to 'student' first
        UPDATE users SET role = 'student' WHERE role IS NULL;
        ALTER TABLE users ALTER COLUMN role SET NOT NULL;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Display current table structure
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'users'
ORDER BY
    ordinal_position;
