Write-Host "Starting Ocean Frontend (Electron)..." -ForegroundColor Cyan
Write-Host ""

$env:VITE_DATA_MODE = 'backend'
Write-Host ("Data mode set to: {0}" -f $env:VITE_DATA_MODE) -ForegroundColor Green
Write-Host "Reminder: Backend mode is required. Start backend separately (e.g., .\run-backend.ps1)." -ForegroundColor Yellow
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "ui")

Write-Host "Syncing CSS tokens with current theme..." -ForegroundColor Cyan
Write-Host "Optional but recommended - syncs tokens.css to prevent flash" -ForegroundColor Gray
npm run sync-tokens
Write-Host ""

Write-Host "Launching Electron app..." -ForegroundColor Cyan
npm run dev
