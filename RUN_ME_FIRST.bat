@echo off
title DeFi Guardian - Automated Environment Setup
color 0A

echo ======================================================================
echo           DEFI GUARDIAN - AUTOMATED INSTALLATION & SETUP
echo       Even Realities G2 Smart Glasses Hackathon - Crypto & DeFi
echo ======================================================================
echo.

:: 1. Check Python
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python is not installed or not added to your system PATH!
    echo Please install Python 3.10 or 3.11 from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
python --version
echo [OK] Python is ready.
echo.

:: 2. Check Node.js and NPM
echo [2/5] Checking Node.js and NPM installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not added to your system PATH!
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    pause
    exit /b 1
)
node -v
npm -v
echo [OK] Node.js and NPM are ready.
echo.

:: 3. Setup Python Backend Dependencies
echo [3/5] Installing Python Backend dependencies...
pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Failed to install backend Python dependencies.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed successfully.
echo.

:: 4. Setup Frontend NPM Dependencies
echo [4/5] Installing React + Even Hub SDK Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Failed to install frontend npm packages.
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

:: 5. Build Frontend & Package .ehpk
echo [5/5] Building frontend and validating Even Hub package...
call npm run build
call npx evenhub pack app.json dist -o defi-guardian.ehpk
cd ..
echo [OK] DeFi Guardian package (defi-guardian.ehpk) created successfully!
echo.

:: 6. Setup local .env if missing
if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo [OK] Created backend\.env configuration.
)

echo ======================================================================
echo                  SETUP COMPLETED SUCCESSFULLY!
echo ======================================================================
echo You are now ready to launch the demo!
echo Double-click START_DEMO.bat to start DeFi Guardian.
echo ======================================================================
echo.
pause
