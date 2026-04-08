import sys; import os; sys.path.append(os.getcwd())
import psycopg2
from Backend.database import DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT
from Backend.utils import evaluate_test_cases, run_sql_on_sandbox

schema = "CREATE TABLE sales (id int, item varchar, qty int, price numeric);"
seed = "INSERT INTO sales VALUES (1, 'Apple', 2, 10.0), (2, 'Apple', 1, 10.0), (3, 'Banana', 5, 5.5);"

# Create Sandbox
sandbox_name = "sandbox_demo1"
conn_main = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT)
conn_main.autocommit = True
cur_main = conn_main.cursor()
try:
    cur_main.execute(f"DROP DATABASE IF EXISTS {sandbox_name}")
    cur_main.execute(f"CREATE DATABASE {sandbox_name}")
except Exception as e:
    pass
cur_main.close()
conn_main.close()

# Initialize Sandbox DB
conn_sb = psycopg2.connect(host=DB_HOST, database=sandbox_name, user=DB_USER, password=DB_PASS, port=DB_PORT)
conn_sb.autocommit = True
cur_sb = conn_sb.cursor()
cur_sb.execute(schema)
cur_sb.execute(seed)

# Install sqlcheck
with open('Backend/install_sqlcheck.py', 'r', encoding='utf-8') as f:
    code = f.read()
    exec(code) # Note: this normally installs to DB_NAME, we need to manually run the SQL
    import Backend.install_sqlcheck as inst
    inst.install_sqlcheck_functions(host=DB_HOST, dbname=sandbox_name, user=DB_USER, password=DB_PASS, port=DB_PORT)

# Helper function to run and print evaluation
def test_evaluation(test_name, golden, student):
    print(f"\n[{test_name}]")
    print(f"Golden Query : {golden}")
    print(f"Student Query: {student}")
    test_cases = [{'golden_query': golden, 'check_order': False, 'case_name': 'Test'}]
    student_result = run_sql_on_sandbox(schema, seed, student, sandbox_name)
    if "error" in student_result:
        print("Student query error:", student_result["error"])
        return
    res = evaluate_test_cases(student_result, test_cases, required_keywords=[], student_query=student, exercise_points=10, sandbox_name=sandbox_name)
    
    passed = res[0]['is_passed']
    msg = res[0].get('error_message', 'ถูกต้อง 100%')
    
    print(f"ผลตรวจ: {'✅ ผ่าน (10/10)' if passed else '❌ ตก (0/10)'}")
    print(f"Feedback จากระบบ: {msg}")

# Test 1: Duplicates (DISTINCT)
test_evaluation(
    "1. ผิดพลาดเพราะเผลอเปิดโหมดลบข้อมูลซ้ำ (DISTINCT)",
    "SELECT item FROM sales",
    "SELECT DISTINCT item FROM sales"
)

# Test 2: Column Order Mismatch
test_evaluation(
    "2. ผิดพลาดเพราะดึงคอลัมน์สลับตำแหน่ง",
    "SELECT id, item FROM sales",
    "SELECT item, id FROM sales"
)

# Test 3: Data Type / Logic Mismatch (Integer Division)
test_evaluation(
    "3. ผิดพลาดเพราะวิธีทางคณิตศาสตร์ให้ Data Type ต่างกัน (หารจำนวนเต็ม vs ทศนิยม)",
    "SELECT 'Apple' as item, SUM(qty)::numeric/COUNT(qty) as avg_qty FROM sales WHERE item='Apple'",
    "SELECT 'Apple' as item, SUM(qty)/COUNT(qty) as avg_qty FROM sales WHERE item='Apple'"
)

cur_sb.close()
conn_sb.close()
