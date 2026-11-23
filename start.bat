@echo off
cd /d "%~dp0"
echo ==============================================
echo       Starting ClipForge Application
echo ==============================================

echo 1. Starting FastAPI Backend on http://localhost:8000 ...
start "ClipForge Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"

echo 2. Starting Next.js Frontend on http://localhost:3000 ...
start "ClipForge Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo ==============================================
echo ClipForge is running!
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo ==============================================
pause
