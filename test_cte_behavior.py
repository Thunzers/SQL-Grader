import sys; import os; sys.path.append(os.getcwd())
import psycopg2
from Backend.database import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute('DROP DATABASE IF EXISTS test_cte_db_1')
    cur.execute('CREATE DATABASE test_cte_db_1')
except Exception as e:
    pass

conn2 = psycopg2.connect(host=DB_HOST, database='test_cte_db_1', user=DB_USER, password=DB_PASS, port=DB_PORT)
cur2 = conn2.cursor()

try:
    cur2.execute("CREATE TABLE orders (product_id int, amount int)")
    cur2.execute("INSERT INTO orders VALUES (1, 10), (1, 20), (2, 30)")
    conn2.commit()
    
    # We must install the sqlcheck schema into this database!
    with open('Backend/install_sqlcheck.py', 'r', encoding='utf-8') as f:
        code = f.read()
        # Find the function definition for install_sqlcheck
        # Just run the raw SQL scripts from that file or simpler: let's directly call the db install
        pass

except Exception as e:
    print('ERROR:', e)
