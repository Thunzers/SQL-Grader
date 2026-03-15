import concurrent.futures
import requests
import time
import uuid

API_URL = "http://localhost:5000/api/run-sql"

def run_student_session(user_id):
    """
    Simulates a student running code.
    Each student gets their own isolated DB execution on the server.
    """
    # Unique data for this student to verify isolation
    unique_val = int(user_id.split('-')[1]) 
    
    payload = {
        "schema_sql": "CREATE TABLE user_data (id INT, val VARCHAR(50));",
        "seed_sql": f"INSERT INTO user_data VALUES ({unique_val}, 'Student {unique_val}');",
        "query": "SELECT * FROM user_data;"
    }
    
    start_time = time.time()
    try:
        response = requests.post(API_URL, json=payload)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            rows = data.get("rows", [])
            
            # Verify the data returned is what we inserted (Isolation Check)
            if rows and rows[0]['id'] == unique_val:
                return f"Student {unique_val}: Success (Time: {duration:.2f}s) - Data verified"
            else:
                return f"Student {unique_val}: Data Mismatch! Got {rows}"
        else:
            return f"Student {unique_val}: API Error {response.status_code} - {response.text}"
            
    except Exception as e:
        return f"Student {unique_val}: Connection Error - {str(e)}"

def main():
    print("--- Starting Concurrency Test ---")
    print(f"Target: {API_URL}")
    print("Simulating 10 students running code EXACTLY at the same time...")
    
    # Generate 10 fake student IDs
    user_ids = [f"std-{i+1000}" for i in range(10)]
    
    start_all = time.time()
    
    # Run in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        future_to_student = {executor.submit(run_student_session, sid): sid for sid in user_ids}
        
        print("\n--- Real-time Results ---")
        completed_count = 0
        for future in concurrent.futures.as_completed(future_to_student):
            completed_count += 1
            result = future.result()
            print(f"[{completed_count}/10] {result}")
        
    print(f"\nTotal Time: {time.time() - start_all:.2f}s")

if __name__ == "__main__":
    main()
