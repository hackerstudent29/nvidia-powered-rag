# Lorin AI Unified Launcher (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting MSAJCEA Lorin AI (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

# 1. Launch Backend in a dedicated window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; Write-Host 'Starting FastAPI Backend on port 8000...' -ForegroundColor Green; python server.py"

# 2. Launch Frontend in current window (or background process)
Write-Host "Backend started in separate window." -ForegroundColor Yellow
Write-Host "Launching Frontend on http://localhost:3000..." -ForegroundColor Green

Set-Location "$rootDir\frontend"
$env:VITE_API_URL = "http://localhost:8000"
npm run dev -- --port 3000 --host
