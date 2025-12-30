@echo off
REM Load environment variables from .env and start the backend server

cd /d "%~dp0"

REM Read .env file and set environment variables
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "line=%%a"
    REM Skip comments and empty lines
    if not "!line:~0,1!"=="#" if not "%%a"=="" (
        set "%%a=%%b"
    )
)

REM Start the server
echo Starting Focus backend server...
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
