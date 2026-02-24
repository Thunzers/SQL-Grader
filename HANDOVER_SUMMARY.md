SQL Grader Project - Handover Summary

1. Project Overview
   This is a SQL Grader Application allowing students to solve SQL problems and get immediate feedback.

Frontend: React (Vite) + Tailwind CSS + Monaco Editor
Backend: FastAPI (Python) + PostgreSQL
Database: PostgreSQL (Stores users, assignments, exercises, test cases) 2. Recent Major Changes (Refactoring)
We have just completed a major structural refactor to modernize the codebase.

A. Frontend: Client-Side Routing
Switched from "Conditional Rendering" to React Router DOM.

App.jsx
: Now defines clear routes:
/login
/student (Student Dashboard)
/assignment/:id (Details)
/exercise/:id (Solve Interface)
/teacher, /admin (Dashboards)
Navigation: Using useNavigate() and useParams() instead of passing props and state.
Benefits: Browser history works (Back/Forward), URLs are shareable (Deep Linking), page refresh retains context.
B. Backend: Modular Architecture
Refactored the monolithic
server.py
(~2000 lines) into a modular structure:

server.py
: Entry point (Main App configuration & Router inclusion).
database.py
: Centralized database connection logic.
utils.py
: Helper functions (Serializers, Sandbox Runner, Test Evaluator).
routers/:
auth.py
: Google Authentication & Registration.
users.py
: User management APIs.
datasets.py
: Dataset schemas & seed data APIs.
assignments.py
: Assignment management APIs.
exercises.py
: Exercise CRUD, Sandbox Execution, and Submission logic. 3. Key Components Functionality
Sandbox Runner (
run_sql_on_sandbox
in
utils.py
):

Creates a temporary PostgreSQL database for every run.
Injects Schema & Seed Data.
Runs the Student's Query.
Returns results and cleans up (Drops DB).
Note: This is resource-intensive and runs as the same db user.
Test Evaluation (
evaluate_test_cases
in
utils.py
):

Compares Student Result vs. Expected Output (stored as JSON).
Checks: Columns, Row Count, and Exact Data Match. 4. Known Issues & Future Roadmap (Next Steps)
If you are picking up this project, here is what you should focus on next:

Security (PRIORITY HIGH):

The current Sandbox approach (CREATE DATABASE) is risky if deployed.
Action: Move the sandbox execution to a Docker Container or a restricted PostgreSQL user with limited permissions.
Authentication:

Current auth relies on checking Google Token and trusting the email.
Action: Implement middleware to verify identity on every protected request (e.g., proper JWT implementation).
Frontend Cleanup:

TeacherMenu.jsx
and
AdminMenu.jsx
are still large components.
Action: Apply the same routing refactor to Teacher/Admin sections (e.g., /teacher/assignments/new instead of modal states).
