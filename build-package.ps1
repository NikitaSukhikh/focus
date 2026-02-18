# Focus Windows Package Builder
# This script builds the complete Windows package with backend and frontend

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipCleanup
)

$ErrorActionPreference = "Stop"

# Setup logging
$RootDir = Get-Location
$LogsDir = Join-Path $RootDir "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = Join-Path $LogsDir "building-$Timestamp.log"

# Create a mutex for thread-safe file writing
$global:LogMutex = New-Object System.Threading.Mutex($false, "BuildLogMutex")

function Write-ToLog {
    param([string]$Message)
    try {
        $global:LogMutex.WaitOne() | Out-Null
        [System.IO.File]::AppendAllText($LogFile, "$Message`r`n", [System.Text.Encoding]::UTF8)
    } finally {
        $global:LogMutex.ReleaseMutex()
    }
}

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-ToLog $logMessage
    Write-Host $Message -Color $Color
}

function Run-Command {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $fullCommand = if ($Arguments.Count -gt 0) { "$Command $($Arguments -join ' ')" } else { $Command }
    Write-ToLog "[$timestamp] Running: $fullCommand"

    # Temporarily allow errors to be captured without stopping
    $prevErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        if ($Arguments.Count -gt 0) {
            # Use array splatting to properly pass arguments
            & $Command @Arguments 2>&1 | ForEach-Object {
                $line = if ($_ -is [System.Management.Automation.ErrorRecord]) {
                    $_.Exception.Message
                } else {
                    $_.ToString()
                }
                # Remove ANSI escape codes and non-ASCII characters
                $cleanLine = $line -replace '\x1b\[[0-9;]*m', '' -replace '[^\x00-\x7F]', ''
                Write-ToLog $cleanLine
                Write-Host $line
            }
        } else {
            & $Command 2>&1 | ForEach-Object {
                $line = if ($_ -is [System.Management.Automation.ErrorRecord]) {
                    $_.Exception.Message
                } else {
                    $_.ToString()
                }
                # Remove ANSI escape codes and non-ASCII characters
                $cleanLine = $line -replace '\x1b\[[0-9;]*m', '' -replace '[^\x00-\x7F]', ''
                Write-ToLog $cleanLine
                Write-Host $line
            }
        }
    } finally {
        $ErrorActionPreference = $prevErrorActionPreference
    }
}

Write-Log "============================================" -Color Cyan
Write-Log "  Focus Windows Package Builder" -Color Cyan
Write-Log "============================================" -Color Cyan
Write-Log ""

# Check we're in the right directory
if (-not (Test-Path "ui\package.json")) {
    Write-Error "Must run from repository root (d:\focus)"
    exit 1
}

# Step 1: Build Backend with PyInstaller
if (-not $SkipBackend) {
    Write-Log "[1/4] Building Python backend with PyInstaller..." -Color Yellow
    Write-Log "  - Installing dependencies..." -Color Gray

    Push-Location backend

    Write-Log "  - Installing dependencies with uv..." -Color Gray
    Run-Command "uv" @("sync", "--group", "dev")

    # Clean previous build
    if (Test-Path "dist") {
        Write-Log "  - Cleaning previous build..." -Color Gray
        Remove-Item -Recurse -Force dist
    }
    if (Test-Path "build") {
        Remove-Item -Recurse -Force build
    }

    # Build backend executable
    Write-Log "  - Running PyInstaller..." -Color Gray
    Run-Command "uv" @("run", "pyinstaller", "focus.spec", "--clean")

    if (-not (Test-Path "dist\Focus\Focus.exe")) {
        Write-Error "Backend build failed - dist\Focus\Focus.exe not found"
        Pop-Location
        exit 1
    }

    # Copy backend directory to UI resources
    Write-Log "  - Copying backend to UI resources..." -Color Gray
    $backendDir = "dist\Focus"
    $targetDir = "..\ui\resources\Focus"

    # Remove old backend if exists
    if (Test-Path $targetDir) {
        Remove-Item -Recurse -Force $targetDir
    }

    # Copy entire backend directory
    Copy-Item -Path $backendDir -Destination "..\ui\resources" -Recurse -Force

    Pop-Location
    Write-Log "  Backend built successfully!" -Color Green
    Write-Log ""
} else {
    Write-Log "[1/4] Skipping backend build" -Color Gray
    Write-Log ""
}

# Step 2: Install Frontend Dependencies
if (-not $SkipFrontend) {
    Write-Log "[2/4] Installing frontend dependencies..." -Color Yellow

    Push-Location ui

    Write-Log "  - Running npm install..." -Color Gray
    Run-Command "npm" @("install")

    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed"
        Pop-Location
        exit 1
    }

    Pop-Location
    Write-Log "  Dependencies installed!" -Color Green
    Write-Log ""
} else {
    Write-Log "[2/4] Skipping frontend dependency installation" -Color Gray
    Write-Log ""
}

# Step 3: Build Frontend with Electron Forge
if (-not $SkipFrontend) {
    Write-Log "[3/4] Building Electron application..." -Color Yellow

    Push-Location ui

    # Verify backend exists
    if (-not (Test-Path "resources\Focus\Focus.exe")) {
        Write-Error "Backend executable not found at ui\resources\Focus\Focus.exe"
        Pop-Location
        exit 1
    }

    Write-Log "  - Running electron-forge make..." -Color Gray
    Run-Command "npm" @("run", "build")

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        Pop-Location
        exit 1
    }

    Pop-Location
    Write-Log "  Frontend built successfully!" -Color Green
    Write-Log ""
} else {
    Write-Log "[3/4] Skipping frontend build" -Color Gray
    Write-Log ""
}

# Step 4: Build Inno Setup installer
Write-Log "[4/5] Building installer with Inno Setup..." -Color Yellow

$isccPaths = @(
    "C:\Program Files (x86)\Inno Setup 6\iscc.exe",
    "C:\Program Files\Inno Setup 6\iscc.exe"
)
$iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

$global:InnoSkipped = $false
if (-not $iscc) {
    $global:InnoSkipped = $true
    Write-Log "  WARNING: Inno Setup not found. Skipping installer build." -Color Yellow
    Write-Log "  Install from: https://jrsoftware.org/isdl.php" -Color Yellow
} else {
    # Ensure dist output dir exists
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" -Force | Out-Null
    }
    Write-Log "  - Running iscc.exe..." -Color Gray
    Run-Command $iscc @("installer\focus.iss")

    if ($LASTEXITCODE -ne 0) {
        Write-Log "  WARNING: Inno Setup build failed (exit $LASTEXITCODE)" -Color Red
    } else {
        Write-Log "  Installer built successfully!" -Color Green
    }
}
Write-Log ""

# Step 5: Create distributable package
Write-Log "[5/5] Finalizing package..." -Color Yellow

# Check outputs
$packageDir = "ui\out\Focus-win32-x64"
$portableZipDir = "ui\out\make\zip\win32\x64"

if (Test-Path $packageDir) {
    $packageSize = (Get-ChildItem -Path $packageDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Log "  Portable package: $packageDir" -Color Gray
    Write-Log "    Size: $([math]::Round($packageSize, 2)) MB" -Color Gray
}

if (Test-Path $portableZipDir) {
    $zipPath = Get-ChildItem -Path $portableZipDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($zipPath) {
        $zipSize = $zipPath.Length / 1MB
        Write-Log "  Portable ZIP: $($zipPath.FullName)" -Color Gray
        Write-Log "    Size: $([math]::Round($zipSize, 2)) MB" -Color Gray
    }
}

Write-Log ""
Write-Log "============================================" -Color Green
Write-Log "  Build Complete!" -Color Green
Write-Log "============================================" -Color Green
Write-Log ""
Write-Log "Output:" -Color Cyan
Write-Log "  Portable: ui\out\Focus-win32-x64\" -Color White

$innoInstaller = Get-ChildItem -Path "dist" -Filter "FocusSetup-*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($innoInstaller) {
    $innoSize = [math]::Round($innoInstaller.Length / 1MB, 2)
    Write-Log "  Installer: $($innoInstaller.FullName) ($innoSize MB)" -Color Green
} elseif ($global:InnoSkipped) {
    Write-Log "  Installer: skipped (Inno Setup not installed)" -Color Yellow
} else {
    Write-Log "  Installer: NOT FOUND in dist\ (Inno Setup may have failed)" -Color Red
}
Write-Log ""

# Packaging complete - portable version available in ui\out\Focus-win32-x64

Write-Log "Done!" -Color Green

# Cleanup
if ($global:LogMutex) {
    $global:LogMutex.Dispose()
}
