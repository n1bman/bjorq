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
    call npm ci --omit=dev
    cd ..
    echo   Dependencies installed.
)

echo.
echo   Starting server...
echo   -------------------
echo   Local:   http://localhost:3000
echo   Data:    %cd%\data
echo   (Set PORT=8080 before running to change port)
echo.

node server/server.js
