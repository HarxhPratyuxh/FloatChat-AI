@echo off
title FloatChat — Stopping Services
echo.
echo  Stopping all FloatChat services...
echo.

:: Kill uvicorn (Python backend)
taskkill /f /fi "WINDOWTITLE eq FloatChat — Backend*" >nul 2>&1
taskkill /f /im uvicorn.exe >nul 2>&1
taskkill /f /im python.exe /fi "WINDOWTITLE eq FloatChat*" >nul 2>&1

:: Kill Vite (Node frontend)
taskkill /f /fi "WINDOWTITLE eq FloatChat — Frontend*" >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq FloatChat*" >nul 2>&1

echo  ✅  All services stopped.
echo.
timeout /t 2 /nobreak >nul
