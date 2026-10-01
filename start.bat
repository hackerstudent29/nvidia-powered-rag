@echo off
title Lorin AI Enterprise Launcher
cls
echo ====================================================================
echo          Starting MSAJCE Lorin AI (Backend + Frontend)
echo ====================================================================
echo.

:: Detect workspace root directory
set "ROOT_DIR=%~dp0"

echo [*] Launching FastAPI Backend on http://localhost:8000 ...
start "Lorin AI Backend (FastAPI :8000)" cmd /k "cd /d "%ROOT_DIR%backend" && echo Starting FastAPI Backend on :8000... && python server.py"

:: Short delay to let backend bind port
timeout /t 2 /nobreak >nul

echo [*] Launching Vite Frontend on http://localhost:3000 ...
start "Lorin AI Frontend (Vite :3000)" cmd /k "cd /d "%ROOT_DIR%frontend" && set VITE_API_URL=http://localhost:8000 && echo Starting Vite Frontend on :3000... && npm run dev -- --port 3000 --host"

echo.
echo ====================================================================
echo  Services started successfully in dedicated background consoles!
echo  - Frontend UI:   http://localhost:3000
echo  - Backend API:   http://localhost:8000
echo  - API Docs:      http://localhost:8000/docs
echo ====================================================================
echo.
pause
