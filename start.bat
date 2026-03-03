@echo off
echo =======================================
echo    Starting SQL Grader App
echo =======================================

echo Starting Backend server...
start "Backend" cmd /k "cd Backend && py server.py"

echo Starting Frontend server...
start "Frontend" cmd /k "cd Frontend && npm run dev"

echo Both Frontend and Backend are starting in separate windows.
echo You can close this window now.
pause
