# pip install fastapi
# pip install uvicorn
# pip install psycopg2-binary

# import psycopg2 as p2

# class Database:
#     def __init__(self):
#         try:
#             self.conn = p2.connect(
#                 host    =   "localhost",
#                 database =  "SQLGrader",
#                 user     =  "postgres",
#                 password =  "tonkla2010"
#                 port     =  "5432"
#             )
#             self.conn.autocommit = True
#             self.cursor = self.conn.cursor()
#         except:
#             print("Cannot Connect to Database")
        
#     def create_table(self):
#         create_table_command = """CREATE TABLE """
        