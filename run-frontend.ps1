Write-Host "Starting Ocean Frontend..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Start Vite dev server (http://localhost:5173)"
Write-Host "  2. Launch Tauri desktop window"
Write-Host ""
$env:VITE_DATA_MODE = 'backend'
Write-Host ("Data mode set to: {0}" -f $env:VITE_DATA_MODE) -ForegroundColor Green
Write-Host "Reminder: Backend mode is required. Start backend separately (e.g., .\\run-backend.ps1)." -ForegroundColor Yellow
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "ui")
npm run tauri:dev
