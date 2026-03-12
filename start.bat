@echo off
title FloatChat Starting...
echo.
echo  ==========================================
echo    FloatChat - Starting All Services
echo  ==========================================
echo.

:: Store root directory
set ROOT=%~dp0

:: ── Check venv ───────────────────────────────────────────────────
if not exist "%ROOT%venv\Scripts\activate.bat" (
    echo  [ERROR] Virtual environment not found.
    echo  Run this first:
    echo    python -m venv venv
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: ── Check node_modules ───────────────────────────────────────────
if not exist "%ROOT%frontend\node_modules" (
    echo  [INFO] Installing frontend npm packages...
    cd /d "%ROOT%frontend"
    call npm install
    cd /d "%ROOT%"
    echo.
)

:: ── Launch backend in its own window ────────────────────────────
echo  [1/2] Launching Python backend on port 8000...
start "FloatChat Backend" cmd /k "title FloatChat Backend ^& cd /d "%ROOT%" ^& call venv\Scripts\activate ^& echo. ^& echo Backend: http://localhost:8000 ^& echo. ^& python -m uvicorn api.main:app --reload --port 8000"

:: ── Wait a moment for backend to initialise ──────────────────────
timeout /t 3 /nobreak >nul

:: ── Launch frontend in its own window ───────────────────────────
echo  [2/2] Launching React frontend on port 5173...
start "FloatChat Frontend" cmd /k "title FloatChat Frontend ^& cd /d "%ROOT%frontend" ^& echo. ^& echo Frontend: http://localhost:5173 ^& echo. ^& npm run dev"

:: ── Summary ──────────────────────────────────────────────────────
echo.
echo  ==========================================
echo    Both services are starting!
echo.
echo    Frontend  ^>  http://localhost:5173
echo    Backend   ^>  http://localhost:8000
echo    API Docs  ^>  http://localhost:8000/docs
echo  ==========================================
echo.
echo  Close the two opened windows to stop services.
echo  Or run stop.bat to kill everything.
echo.
pause
