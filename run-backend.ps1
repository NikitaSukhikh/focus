Write-Host "Starting Ocean backend (plain uvicorn)..." -ForegroundColor Cyan
Write-Host ""

# Run from repo root; uvicorn loads app from backend package

#Set-Location (Join-Path $PSScriptRoot "backend")

uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
