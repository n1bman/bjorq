#!/usr/bin/env pwsh
Write-Host "Installing bjorQ Dashboard server dependencies..."
Push-Location server
npm install --omit=dev
Pop-Location
Write-Host "Done! Run ./start.ps1 to launch."
