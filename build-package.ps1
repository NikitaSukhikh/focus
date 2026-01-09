# Focus Windows Package Builder
# This script builds the complete Windows package with backend and frontend

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipCleanup
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Focus Windows Package Builder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check we're in the right directory
if (-not (Test-Path "ui\package.json")) {
    Write-Error "Must run from repository root (d:\ocean)"
    exit 1
}

# Step 1: Build Backend with PyInstaller
if (-not $SkipBackend) {
    Write-Host "[1/4] Building Python backend with PyInstaller..." -ForegroundColor Yellow
    Write-Host "  - Installing dependencies..." -ForegroundColor Gray

    Push-Location backend

    # Check if virtual environment exists
    if (-not (Test-Path "venv")) {
        Write-Host "  - Creating virtual environment..." -ForegroundColor Gray
        python -m venv venv
    }

    # Activate venv and install dependencies
    Write-Host "  - Activating virtual environment..." -ForegroundColor Gray
    .\venv\Scripts\Activate.ps1

    Write-Host "  - Installing requirements..." -ForegroundColor Gray
    pip install --upgrade pip
    pip install -r requirements.txt

    # Install PyInstaller if not present
    Write-Host "  - Installing PyInstaller..." -ForegroundColor Gray
    pip install pyinstaller

    # Clean previous build
    if (Test-Path "dist") {
        Write-Host "  - Cleaning previous build..." -ForegroundColor Gray
        Remove-Item -Recurse -Force dist
    }
    if (Test-Path "build") {
        Remove-Item -Recurse -Force build
    }

    # Build backend executable
    Write-Host "  - Running PyInstaller..." -ForegroundColor Gray
    pyinstaller focus.spec --clean

    if (-not (Test-Path "dist\Focus\Focus.exe")) {
        Write-Error "Backend build failed - dist\Focus\Focus.exe not found"
        Pop-Location
        exit 1
    }

    # Copy backend directory to UI resources
    Write-Host "  - Copying backend to UI resources..." -ForegroundColor Gray
    $backendDir = "dist\Focus"
    $targetDir = "..\ui\resources\Focus"

    # Remove old backend if exists
    if (Test-Path $targetDir) {
        Remove-Item -Recurse -Force $targetDir
    }

    # Copy entire backend directory
    Copy-Item -Path $backendDir -Destination "..\ui\resources" -Recurse -Force

    Pop-Location
    Write-Host "  Backend built successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[1/4] Skipping backend build" -ForegroundColor Gray
    Write-Host ""
}

# Step 2: Install Frontend Dependencies
if (-not $SkipFrontend) {
    Write-Host "[2/4] Installing frontend dependencies..." -ForegroundColor Yellow

    Push-Location ui

    Write-Host "  - Running npm install..." -ForegroundColor Gray
    npm install

    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed"
        Pop-Location
        exit 1
    }

    Pop-Location
    Write-Host "  Dependencies installed!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[2/4] Skipping frontend dependency installation" -ForegroundColor Gray
    Write-Host ""
}

# Step 3: Build Frontend with Electron Forge
if (-not $SkipFrontend) {
    Write-Host "[3/4] Building Electron application..." -ForegroundColor Yellow

    Push-Location ui

    # Verify backend exists
    if (-not (Test-Path "resources\Focus\Focus.exe")) {
        Write-Error "Backend executable not found at ui\resources\Focus\Focus.exe"
        Pop-Location
        exit 1
    }

    Write-Host "  - Running electron-forge make..." -ForegroundColor Gray
    npm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        Pop-Location
        exit 1
    }

    Pop-Location
    Write-Host "  Frontend built successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[3/4] Skipping frontend build" -ForegroundColor Gray
    Write-Host ""
}

# Step 4: Create distributable package
Write-Host "[4/4] Finalizing package..." -ForegroundColor Yellow

# Check outputs
$packageDir = "ui\out\Focus-win32-x64"
$installerDir = "ui\out\make\squirrel.windows\x64"

if (Test-Path $packageDir) {
    $packageSize = (Get-ChildItem -Path $packageDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Portable package: $packageDir" -ForegroundColor Gray
    Write-Host "    Size: $([math]::Round($packageSize, 2)) MB" -ForegroundColor Gray
}

if (Test-Path $installerDir) {
    $installerPath = Get-ChildItem -Path $installerDir -Filter "Focus-*Setup.exe" | Select-Object -First 1
    if ($installerPath) {
        $installerSize = $installerPath.Length / 1MB
        Write-Host "  Installer: $($installerPath.FullName)" -ForegroundColor Gray
        Write-Host "    Size: $([math]::Round($installerSize, 2)) MB" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Outputs:" -ForegroundColor Cyan
Write-Host "  Portable: ui\out\Focus-win32-x64\" -ForegroundColor White
Write-Host "  Installer: ui\out\make\squirrel.windows\x64\Focus-*-Setup.exe" -ForegroundColor White
Write-Host ""

# Optional: Create release directory
if (-not $SkipCleanup) {
    $releaseDir = "release"
    if (-not (Test-Path $releaseDir)) {
        New-Item -ItemType Directory -Path $releaseDir | Out-Null
    }

    Write-Host "Copying to release directory..." -ForegroundColor Yellow

    # Copy portable version
    if (Test-Path $packageDir) {
        $portableZip = "$releaseDir\Focus-win32-x64-portable.zip"
        if (Test-Path $portableZip) {
            Remove-Item $portableZip -Force
        }
        Compress-Archive -Path "$packageDir\*" -DestinationPath $portableZip
        Write-Host "  Created: $portableZip" -ForegroundColor Green
    }

    # Copy installer
    if (Test-Path $installerDir) {
        $installer = Get-ChildItem -Path $installerDir -Filter "Focus-*Setup.exe" | Select-Object -First 1
        if ($installer) {
            Copy-Item $installer.FullName -Destination "$releaseDir\" -Force
            Write-Host "  Copied: release\$($installer.Name)" -ForegroundColor Green
        }
    }

    # Build Inno Setup installer
    Write-Host "Building Inno Setup installer..." -ForegroundColor Yellow
    $innoSetupScript = "installer\focus-installer.iss"

    if (Test-Path $innoSetupScript) {
        # Check if Inno Setup compiler is available
        $iscc = Get-Command "iscc.exe" -ErrorAction SilentlyContinue

        if ($iscc) {
            Write-Host "  - Running Inno Setup compiler..." -ForegroundColor Gray
            & iscc.exe $innoSetupScript

            if ($LASTEXITCODE -eq 0) {
                $innoInstaller = Get-ChildItem -Path $releaseDir -Filter "Focus-*-Setup.exe" |
                    Where-Object { $_.Name -notlike "*Squirrel*" } |
                    Select-Object -First 1

                if ($innoInstaller) {
                    Write-Host "  Created: $($innoInstaller.FullName)" -ForegroundColor Green
                    $innoSize = $innoInstaller.Length / 1MB
                    Write-Host "    Size: $([math]::Round($innoSize, 2)) MB" -ForegroundColor Gray
                }
            } else {
                Write-Host "  Warning: Inno Setup compilation failed (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Skipping: Inno Setup compiler (iscc.exe) not found in PATH" -ForegroundColor Gray
            Write-Host "  Install from: https://jrsoftware.org/isdl.php" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Skipping: Installer script not found at $innoSetupScript" -ForegroundColor Gray
    }

    Write-Host ""
}

Write-Host "Done!" -ForegroundColor Green
