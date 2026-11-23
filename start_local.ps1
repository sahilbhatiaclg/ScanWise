# ScanWise Local Startup Script
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Starting ScanWise Full-Stack Locally" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Start Backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python backend/wsgi.py"

# 2. Start Frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nBoth servers have launched in separate windows:" -ForegroundColor Green
Write-Host " - Backend API:  http://127.0.0.1:5000" -ForegroundColor Yellow
Write-Host " - Frontend Web: http://localhost:5173" -ForegroundColor Yellow

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
