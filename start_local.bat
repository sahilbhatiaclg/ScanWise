@echo off
echo =======================================================
echo   Starting ScanWise Full-Stack Locally
echo =======================================================

:: Start Backend
start "ScanWise Backend (Flask :5000)" cmd /k "python backend/wsgi.py"

:: Start Frontend
start "ScanWise Frontend (Vite :5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting up in separate terminal windows.
echo - Backend:  http://127.0.0.1:5000 (API & SQLite)
echo - Frontend: http://localhost:5173 (React UI)
echo.
timeout /t 3 >nul
start http://localhost:5173
