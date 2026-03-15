CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Insert existing categories from assignments
INSERT INTO categories (name)
SELECT DISTINCT category FROM assignments WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name) VALUES 
('SELECT'), ('JOIN'), ('GROUP BY'), ('Subquery'), ('DDL'), ('DML'), ('WHERE')
ON CONFLICT (name) DO NOTHING;

-- Add category_id column
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(category_id);

-- Link existing assignments to their new category_id
UPDATE assignments a
SET category_id = c.category_id
FROM categories c
WHERE a.category = c.name;

-- Alter column to make it NOT NULL if needed in the future, but for now we won't strictly enforce it
-- until we verify all is well. But we should make it NOT NULL ideally.
-- For now, let's just make sure new inserts have it.
