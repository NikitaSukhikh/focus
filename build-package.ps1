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
$LogFile = Join-Path $RootDir "building.log"
if (Test-Path $LogFile) {
    Remove-Item $LogFile -Force
}

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

    # Check if virtual environment exists
    if (-not (Test-Path "venv")) {
        Write-Log "  - Creating virtual environment..." -Color Gray
        Run-Command "python" @("-m", "venv", "venv")
    }

    # Activate venv and install dependencies
    Write-Log "  - Activating virtual environment..." -Color Gray
    & .\venv\Scripts\Activate.ps1

    Write-Log "  - Installing requirements..." -Color Gray
    Run-Command "pip" @("install", "--upgrade", "pip")
    Run-Command "pip" @("install", "-r", "requirements.txt")

    # Install PyInstaller if not present
    Write-Log "  - Installing PyInstaller..." -Color Gray
    Run-Command "pip" @("install", "pyinstaller")

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
    Run-Command "pyinstaller" @("focus.spec", "--clean")

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

# Step 4: Create distributable package
Write-Log "[4/4] Finalizing package..." -Color Yellow

# Check outputs
$packageDir = "ui\out\Focus-win32-x64"
$installerDir = "ui\out\make\squirrel.windows\x64"

if (Test-Path $packageDir) {
    $packageSize = (Get-ChildItem -Path $packageDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Log "  Portable package: $packageDir" -Color Gray
    Write-Log "    Size: $([math]::Round($packageSize, 2)) MB" -Color Gray
}

if (Test-Path $installerDir) {
    $installerPath = Get-ChildItem -Path $installerDir -Filter "Focus-*Setup.exe" | Select-Object -First 1
    if ($installerPath) {
        $installerSize = $installerPath.Length / 1MB
        Write-Log "  Installer: $($installerPath.FullName)" -Color Gray
        Write-Log "    Size: $([math]::Round($installerSize, 2)) MB" -Color Gray
    }
}

Write-Log ""
Write-Log "============================================" -Color Green
Write-Log "  Build Complete!" -Color Green
Write-Log "============================================" -Color Green
Write-Log ""
Write-Log "Output:" -Color Cyan
Write-Log "  Portable: ui\out\Focus-win32-x64\" -Color White
Write-Log ""

# Packaging complete - portable version available in ui\out\Focus-win32-x64

Write-Log "Done!" -Color Green

# Cleanup
if ($global:LogMutex) {
    $global:LogMutex.Dispose()
}
