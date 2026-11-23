@echo off
title DeFi Guardian Launcher
color 0A

echo ======================================================================
echo                  LAUNCHING DEFI GUARDIAN DEMO
echo           Even Realities G2 - Crypto & DeFi Intelligence
echo ======================================================================
echo.

:: 1. Launch FastAPI Backend in a new window
echo Starting Python FastAPI Backend on http://127.0.0.1:8000 ...
start "DeFi Guardian - Backend Server" cmd /k "color 0B && cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

:: 3. Launch Vite Frontend in a new window
echo Starting React + Even Hub SDK Frontend on http://localhost:5173 ...
start "DeFi Guardian - G2 Frontend" cmd /k "color 0A && cd frontend && npm run dev"

:: 4. Wait 3 seconds for Vite server to spin up
timeout /t 3 /nobreak >nul

:: 5. Open Default Web Browser
echo Opening DeFi Guardian in your web browser...
start http://localhost:5173

echo.
echo ======================================================================
echo                     DEFI GUARDIAN IS RUNNING!
echo ======================================================================
echo - Frontend HUD & Companion: http://localhost:5173
echo - Backend API & Docs:       http://127.0.0.1:8000/docs
echo.
echo TO LAUNCH THE OFFICIAL EVEN HUB SIMULATOR:
echo Open a new terminal and run:
echo    cd frontend
echo    npm run simulate
echo.
echo TO STOP:
echo Close the two server command windows.
echo ======================================================================
echo.
pause
