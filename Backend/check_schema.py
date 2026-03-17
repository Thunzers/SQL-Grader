import psycopg2

conn = psycopg2.connect(
    host="localhost", database="Grader_SQL",
    user="postgres", password="tonkla2010", port="5432"
)
conn.autocommit = True
cur = conn.cursor()

# Add required_keywords column to test_cases table
cur.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS required_keywords JSONB DEFAULT '[]'")
print("SUCCESS: Added required_keywords column to test_cases table")

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
