@echo off
echo Starting Focus backend...
echo.

echo Stopping existing backend processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
timeout /t 1 /nobreak >nul

echo Starting backend server on http://127.0.0.1:8000
echo.

cd backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
