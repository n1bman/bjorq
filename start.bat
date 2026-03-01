@echo off
echo.
echo   bjorQ Dashboard
echo   ================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   ERROR: Node.js not found!
    echo   Download it from https://nodejs.org/ (LTS recommended)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo   Node.js %NODE_VER% detected

:: Auto-install server dependencies if missing
if not exist "server\node_modules" (
    echo   Installing server dependencies...
    cd server
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        echo.
        echo   ERROR: Failed to install server dependencies!
        echo   Check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    cd ..
    echo   Dependencies installed.
)

if "%PORT%"=="" set PORT=3000

echo.
echo   Starting server...
echo   -------------------
echo   Local:   http://localhost:%PORT%
echo   Data:    %cd%\data
echo   (Set PORT=8080 before running to change port)
echo.

node server/server.js
