-- Migration script for new users table schema
-- Changes: id -> student_id, add name and surname, remove created_at

-- Step 1: Backup existing data (optional)
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Drop old table (BE CAREFUL - this will delete all data)
DROP TABLE IF EXISTS users CASCADE;

-- Step 3: Create new users table with updated schema
CREATE TABLE users (
    student_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'student' NOT NULL,
    CONSTRAINT chk_role CHECK (role IN ('student', 'teacher', 'admin'))
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Step 5: Insert sample admin user (change this to your actual admin)
INSERT INTO users (student_id, name, surname, email, role)
VALUES ('ADMIN001', 'Admin', 'User', 'admin@silpakorn.edu', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Step 6: Display table structure
SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'users'
ORDER BY
    ordinal_position;

-- Step 7: Show sample data
SELECT * FROM users;
