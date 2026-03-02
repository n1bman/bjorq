#!/usr/bin/env pwsh
Write-Host ""
Write-Host "  bjorQ Dashboard"
Write-Host "  ================"
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "  Download it from https://nodejs.org/ (LTS recommended)"
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

$nodeVer = node --version
Write-Host "  Node.js $nodeVer detected"

# Auto-install server dependencies if missing
if (-not (Test-Path "server/node_modules")) {
    Write-Host "  Installing server dependencies..."
    Push-Location server
    npm install --omit=dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ERROR: Failed to install server dependencies!" -ForegroundColor Red
        Write-Host "  Check your internet connection and try again."
        Write-Host ""
        Pop-Location
        Read-Host "  Press Enter to exit"
        exit 1
    }
    Pop-Location
    Write-Host "  Dependencies installed."
}

if (-not $env:PORT) { $env:PORT = "3000" }

Write-Host ""
Write-Host "  Starting server..."
Write-Host "  -------------------"
Write-Host "  Local:   http://localhost:$($env:PORT)"
Write-Host "  Data:    $(Get-Location)/data"
Write-Host ""

# Open browser then start server
Start-Process "http://localhost:$($env:PORT)"
node server/server.js
