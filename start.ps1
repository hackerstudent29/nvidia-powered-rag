# Lorin AI Unified Launcher (PowerShell)
Clear-Host
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "         Starting MSAJCE Lorin AI (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

# 1. Launch Backend in dedicated PowerShell window
Write-Host "[*] Launching FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; Write-Host 'Starting FastAPI Backend on http://localhost:8000...' -ForegroundColor Green; python server.py"

Start-Sleep -Seconds 2

# 2. Launch Frontend in dedicated PowerShell window
Write-Host "[*] Launching Vite Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; `$env:VITE_API_URL = 'http://localhost:8000'; Write-Host 'Starting Vite Frontend on http://localhost:3000...' -ForegroundColor Green; npm run dev -- --port 3000 --host"

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host " Services launched successfully in separate console windows!" -ForegroundColor Green
Write-Host " - Frontend UI:   http://localhost:3000" -ForegroundColor White
Write-Host " - Backend API:   http://localhost:8000" -ForegroundColor White
Write-Host " - API Docs:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
