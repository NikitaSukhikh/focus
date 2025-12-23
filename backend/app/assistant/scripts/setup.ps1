[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Require-Command {
    param(
        [string]$Command,
        [string]$FriendlyName = $Command
    )

    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "$FriendlyName is not installed or not on PATH."
    }
}

function Ensure-Version {
    param(
        [string[]]$CommandParts,
        [Version]$MinimumVersion,
        [string]$Pattern,
        [string]$FriendlyName
    )

    $cmd = $CommandParts[0]
    $args = @()
    if ($CommandParts.Count -gt 1) {
        $args = $CommandParts[1..($CommandParts.Count - 1)]
    }

    $output = & $cmd @args
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to run $FriendlyName to check version."
    }

    if ($output -match $Pattern) {
        $ver = [Version]$Matches[1]
        if ($ver -lt $MinimumVersion) {
            throw "$FriendlyName $ver found, but $MinimumVersion or newer is required."
        }
        return $ver
    }

    throw "Could not parse $FriendlyName version from: $output"
}

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Section "Checking prerequisites"
Write-Host "Recommended versions -> Python 3.11.x, Node.js 20.x (LTS), Rust stable >= 1.70"

Require-Command -Command "python" -FriendlyName "Python 3.11+"
Require-Command -Command "node" -FriendlyName "Node.js 20+"
Require-Command -Command "npm" -FriendlyName "npm"

$pythonVersion = Ensure-Version -CommandParts @("python", "--version") -MinimumVersion "3.11.0" -Pattern "Python ([0-9.]+)" -FriendlyName "Python"
$nodeVersion = Ensure-Version -CommandParts @("node", "--version") -MinimumVersion "20.0.0" -Pattern "v([0-9.]+)" -FriendlyName "Node.js"

if (-not (Get-Command "rustc" -ErrorAction SilentlyContinue)) {
    throw "Rust toolchain not found. Install via: winget install --id Rustlang.Rust.GNU -e --source winget (or https://rustup.rs), then reopen your shell."
}
$rustVersion = Ensure-Version -CommandParts @("rustc", "--version") -MinimumVersion "1.70.0" -Pattern "rustc ([0-9.]+)" -FriendlyName "rustc"

Write-Host "Python: $pythonVersion"
Write-Host "Node.js: $nodeVersion"
Write-Host "rustc: $rustVersion"

# Locate backend and frontend directories (supporting the names used in the docs and current workspace)
$backendCandidates = @("alfy-backend", "backend")
$frontendCandidates = @("alfy-ui", "frontend", "ui")

$backendDir = $backendCandidates |
    ForEach-Object { Join-Path $repoRoot $_ } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

$frontendDir = $frontendCandidates |
    ForEach-Object { Join-Path $repoRoot $_ } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

if (-not $backendDir) {
    throw "Backend directory not found. Expected one of: $($backendCandidates -join ', ')"
}

if (-not $frontendDir) {
    throw "Frontend directory not found. Expected one of: $($frontendCandidates -join ', ')"
}

Write-Section "Setting up backend virtual environment"
Set-Location $backendDir
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}

$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    throw "Virtual environment not found or incomplete at $venvPython."
}

Write-Host "Upgrading pip and installing backend requirements..."
& $venvPython -m pip install --upgrade pip
if (Test-Path "requirements.txt") {
    & $venvPython -m pip install -r requirements.txt
}
if (Test-Path "requirements-dev.txt") {
    & $venvPython -m pip install -r requirements-dev.txt
}

Write-Host "Ensuring backend data directories..."
Ensure-Directory (Join-Path $backendDir "models")
Ensure-Directory (Join-Path $backendDir "data")
Ensure-Directory (Join-Path $backendDir "logs")

Write-Section "Setting up frontend"
Set-Location $frontendDir
$hasPackageJson = (Test-Path "package-lock.json") -or (Test-Path "package.json")
if ($hasPackageJson) {
    Write-Host "Installing frontend dependencies with npm..."
    npm install
} else {
    Write-Warning "No package.json found in $frontendDir. Skipping npm install."
}

Write-Section "Setup complete"
Write-Host "Backend directory: $backendDir"
Write-Host "Frontend directory: $frontendDir"
Write-Host ("To start backend: `"& {0}\venv\Scripts\activate.ps1; uvicorn alfy.main:app --reload --port 8420`"" -f $backendDir)
Write-Host ("To start frontend: `"cd {0}; npm run tauri dev`"" -f $frontendDir)

Set-Location $repoRoot
