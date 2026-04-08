import psycopg2
from Backend.database import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)
cur = conn.cursor()

cur.execute("CREATE TABLE IF NOT EXISTS test_products2 (id int, name varchar)")
cur.execute("TRUNCATE test_products2")
cur.execute("INSERT INTO test_products2 VALUES (1, 'A'), (2, 'B')")

golden = "SELECT id, name FROM test_products2"

q_cte = "WITH cte AS (SELECT name, id FROM test_products2) SELECT name, id FROM cte"

cur.execute("SELECT sqlcheck.check_query_equivalence(%s, %s)", (golden, q_cte))
print(cur.fetchone())
