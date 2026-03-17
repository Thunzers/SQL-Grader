import psycopg2

conn = psycopg2.connect(
    host="localhost", database="Grader_SQL",
    user="postgres", password="tonkla2010", port="5432"
)
conn.autocommit = True
cur = conn.cursor()

# Add golden_query column to test_cases table
cur.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS golden_query TEXT DEFAULT NULL")
print("SUCCESS: Added golden_query column")

# Add check_order column (boolean) to test_cases table
cur.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS check_order BOOLEAN DEFAULT FALSE")
print("SUCCESS: Added check_order column")

# Verify
cur.execute(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name = 'test_cases' ORDER BY ordinal_position"
)
print("\ntest_cases columns:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

cur.close()
conn.close()
