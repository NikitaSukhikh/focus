# Reset the local SQLite database used by the backend.
# Removes the database file plus SQLite WAL/SHM files. Restart the backend afterward to recreate tables.
[CmdletBinding()]
param(
    [string]$DatabasePath,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$defaultDbPath = Join-Path $repoRoot "backend/storage/local_files/data/focus.db"

if (-not $DatabasePath) {
    $DatabasePath = $defaultDbPath
} elseif (-not [System.IO.Path]::IsPathRooted($DatabasePath)) {
    $DatabasePath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $DatabasePath))
}

$targets = @(
    $DatabasePath,
    "$DatabasePath-wal",
    "$DatabasePath-shm"
)

if (-not $Force) {
    Write-Host "This will delete the SQLite database and related WAL/SHM files:" -ForegroundColor Yellow
    $targets | ForEach-Object { Write-Host "  $_" }
    $confirm = Read-Host "Proceed? (y/N)"
    if ($confirm -notin @("y", "Y", "yes", "YES")) {
        Write-Host "Aborted."
        exit 0
    }
}

foreach ($path in $targets) {
    if (Test-Path -LiteralPath $path) {
        try {
            Remove-Item -LiteralPath $path -Force
            Write-Host "Removed $path" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove $path: $_" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Missing $path (nothing to remove)" -ForegroundColor DarkGray
    }
}

# Ensure database directory exists for the next startup
$dbDir = Split-Path -Parent $DatabasePath
if (-not (Test-Path -LiteralPath $dbDir)) {
    New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
}

Write-Host "Database cleared. Restart the backend to recreate the schema." -ForegroundColor Cyan
