#!/usr/bin/env pwsh
# create-release.ps1
# Helper script to create a new release with proper tagging

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [Parameter(Mandatory=$false)]
    [string]$Message = "",

    [Parameter(Mandatory=$false)]
    [switch]$Sign,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Validate version format (semver)
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Version must be in format X.Y.Z (e.g., 1.0.0)"
    exit 1
}

$TagName = "v$Version"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Focus Release Creator" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "ui\package.json")) {
    Write-Error "Must run from repository root (ui/package.json not found)"
    exit 1
}

# Check Git status
Write-Host "[1/8] Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus -and !$DryRun) {
    Write-Warning "Working directory is not clean:"
    Write-Host $gitStatus
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') {
        exit 1
    }
}
Write-Host "✓ Git status OK" -ForegroundColor Green
Write-Host ""

# Check if tag already exists
Write-Host "[2/8] Checking if tag exists..." -ForegroundColor Yellow
$tagExists = git tag -l $TagName
if ($tagExists) {
    Write-Error "Tag $TagName already exists!"
    Write-Host "To delete: git tag -d $TagName && git push origin :refs/tags/$TagName"
    exit 1
}
Write-Host "✓ Tag $TagName is available" -ForegroundColor Green
Write-Host ""

# Update package.json version
Write-Host "[3/8] Updating ui/package.json version..." -ForegroundColor Yellow
$packageJsonPath = "ui\package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

if ($currentVersion -eq $Version) {
    Write-Host "✓ Version already set to $Version in package.json" -ForegroundColor Green
} else {
    Write-Host "Current version: $currentVersion" -ForegroundColor Gray
    Write-Host "New version: $Version" -ForegroundColor Gray

    if (!$DryRun) {
        $packageJson.version = $Version
        $packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath
        git add $packageJsonPath
        git commit -m "Bump version to $Version"
        Write-Host "✓ Updated and committed version change" -ForegroundColor Green
    } else {
        Write-Host "✓ Would update version (dry run)" -ForegroundColor Green
    }
}
Write-Host ""

# Get current commit SHA
Write-Host "[4/8] Getting current commit..." -ForegroundColor Yellow
$commitSha = git rev-parse HEAD
$commitShort = $commitSha.Substring(0, 7)
Write-Host "✓ Current commit: $commitShort" -ForegroundColor Green
Write-Host ""

# Prepare release message
Write-Host "[5/8] Preparing release message..." -ForegroundColor Yellow
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "Release v$Version"
}
Write-Host "✓ Message: $Message" -ForegroundColor Green
Write-Host ""

# Create Git tag
Write-Host "[6/8] Creating Git tag..." -ForegroundColor Yellow
if ($Sign) {
    Write-Host "Creating signed tag..." -ForegroundColor Gray
    if (!$DryRun) {
        git tag -s $TagName -m $Message
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create signed tag. Do you have GPG configured?"
            exit 1
        }
        # Verify signature
        git tag -v $TagName
    } else {
        Write-Host "✓ Would create signed tag (dry run)" -ForegroundColor Green
    }
} else {
    Write-Host "Creating annotated tag..." -ForegroundColor Gray
    if (!$DryRun) {
        git tag -a $TagName -m $Message
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create tag"
            exit 1
        }
    } else {
        Write-Host "✓ Would create annotated tag (dry run)" -ForegroundColor Green
    }
}
Write-Host "✓ Tag created: $TagName" -ForegroundColor Green
Write-Host ""

# Show summary
Write-Host "[7/8] Release Summary" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "  Version:      $Version" -ForegroundColor White
Write-Host "  Tag:          $TagName" -ForegroundColor White
Write-Host "  Commit:       $commitSha" -ForegroundColor White
Write-Host "  Signed:       $(if ($Sign) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "  Message:      $Message" -ForegroundColor White
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Push to remote
Write-Host "[8/8] Pushing to remote..." -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "✓ Dry run complete - no changes pushed" -ForegroundColor Green
    Write-Host ""
    Write-Host "To actually create the release, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\create-release.ps1 -Version $Version $(if ($Sign) { '-Sign' })" -ForegroundColor Cyan
} else {
    Write-Host "About to push tag $TagName to origin" -ForegroundColor Gray
    Write-Host "This will trigger the GitHub Actions release workflow!" -ForegroundColor Yellow
    Write-Host ""
    $push = Read-Host "Push to remote? (y/N)"

    if ($push -eq 'y') {
        git push origin main
        git push origin $TagName
        Write-Host "✓ Tag pushed to origin" -ForegroundColor Green
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Release initiated!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Monitor the build at:" -ForegroundColor White
        Write-Host "https://github.com/YOUR_ORG/YOUR_REPO/actions" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "Cancelled. Tag created locally but not pushed." -ForegroundColor Yellow
        Write-Host "To push later: git push origin $TagName" -ForegroundColor Gray
    }
}
