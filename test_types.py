
import psycopg2
from Backend.database import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)
cur = conn.cursor()

golden = 'SELECT id, count(*) as c FROM test_products2 group by id'
q_err = 'SELECT count(*) as c, id FROM test_products2 group by id'

try:
  cur.execute('SELECT sqlcheck.check_query_equivalence(%s, %s)', (golden, q_err))
  print(cur.fetchone())
except Exception as e:
  print('ERROR', e)

