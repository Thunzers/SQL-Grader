import psycopg2
from Backend.database import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)
cur = conn.cursor()

# Golden
golden = """
SELECT name, category FROM test_products
"""

# Student 1 (Subquery)
q_subquery = """
SELECT name, category FROM (
  SELECT * FROM test_products
) sub1
"""

# Student 2 (CTE)
q_cte = """
WITH cte AS (
  SELECT * FROM test_products
)
SELECT name, category FROM cte
"""

print("Subquery:")
cur.execute('SELECT sqlcheck.check_query_equivalence(%s, %s)', (golden, q_subquery))
print(cur.fetchone())

print("CTE:")
cur.execute('SELECT sqlcheck.check_query_equivalence(%s, %s)', (golden, q_cte))
print(cur.fetchone())
