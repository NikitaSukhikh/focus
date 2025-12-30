Write-Host "Starting Focus backend..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing backend server processes (uvicorn on port 8000)
Write-Host "Stopping existing backend processes..." -ForegroundColor Yellow
$port = 8000
$connections = netstat -ano | Select-String ":$port.*LISTENING"
foreach ($conn in $connections) {
    $pid = ($conn -split '\s+')[-1]
    if ($pid -and $pid -ne "0") {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Milliseconds 500

Write-Host "Starting backend server on http://127.0.0.1:8000" -ForegroundColor Green
Write-Host ""

# Run from repo root; uvicorn loads app from backend package
uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
