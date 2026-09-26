@echo off
title Lorin AI Launcher
echo ========================================================
echo   Starting MSAJCEA Lorin AI (Backend + Frontend)
echo ========================================================

:: 1. Launch Backend in new window
start "Lorin AI Backend (FastAPI :8000)" cmd /k "cd /d "%~dp0backend" && python server.py"

:: 2. Launch Frontend in new window
start "Lorin AI Frontend (Vite :3000)" cmd /k "cd /d "%~dp0frontend" && set VITE_API_URL=http://localhost:8000 && npm run dev -- --port 3000 --host"

echo Services launched!
echo - Backend:  http://localhost:8000/api/health
echo - Frontend: http://localhost:3000/
echo ========================================================
