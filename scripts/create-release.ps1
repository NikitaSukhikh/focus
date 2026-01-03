param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [string]$Message = "",
    [switch]$Sign,
    [switch]$DryRun
)

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Version must be in format X.Y.Z (e.g., 1.0.0)"
    exit 1
}

$TagName = "v$Version"

Write-Host "Focus Release Creator" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "ui\package.json")) {
    Write-Error "Must run from repository root"
    exit 1
}

Write-Host "[1/8] Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus -and (-not $DryRun)) {
    Write-Warning "Working directory is not clean"
    $continue = Read-Host "Continue? (y/N)"
    if ($continue -ne 'y') { exit 1 }
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[2/8] Checking if tag exists..." -ForegroundColor Yellow
$tagExists = git tag -l $TagName
if ($tagExists) {
    Write-Error "Tag $TagName already exists!"
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[3/8] Updating package.json..." -ForegroundColor Yellow
$packageJsonPath = "ui\package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

if ($currentVersion -ne $Version) {
    if (-not $DryRun) {
        $packageJson.version = $Version
        $packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath
        git add $packageJsonPath
        git commit -m "Bump version to $Version"
        Write-Host "Updated" -ForegroundColor Green
    } else {
        Write-Host "Would update (dry run)" -ForegroundColor Green
    }
} else {
    Write-Host "Already at $Version" -ForegroundColor Green
}
Write-Host ""

Write-Host "[4/8] Getting commit..." -ForegroundColor Yellow
$commitSha = git rev-parse HEAD
$commitShort = $commitSha.Substring(0, 7)
Write-Host "Commit: $commitShort" -ForegroundColor Green
Write-Host ""

Write-Host "[5/8] Preparing message..." -ForegroundColor Yellow
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "Release v$Version"
}
Write-Host "Message: $Message" -ForegroundColor Green
Write-Host ""

Write-Host "[6/8] Creating tag..." -ForegroundColor Yellow
if (-not $DryRun) {
    if ($Sign) {
        git tag -s $TagName -m "$Message"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create signed tag"
            exit 1
        }
        git tag -v $TagName
    } else {
        git tag -a $TagName -m "$Message"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create tag"
            exit 1
        }
    }
    Write-Host "Created" -ForegroundColor Green
} else {
    Write-Host "Would create tag (dry run)" -ForegroundColor Green
}
Write-Host ""

Write-Host "[7/8] Summary" -ForegroundColor Yellow
Write-Host "  Version: $Version"
Write-Host "  Tag: $TagName"
Write-Host "  Commit: $commitSha"
Write-Host "  Signed: $(if ($Sign) { 'Yes' } else { 'No' })"
Write-Host ""

Write-Host "[8/8] Push to remote..." -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "Dry run complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "To actually create release:" -ForegroundColor Cyan
    Write-Host "  .\scripts\create-release.ps1 -Version $Version"
} else {
    Write-Host "About to push tag $TagName"
    $push = Read-Host "Push? (y/N)"

    if ($push -eq 'y') {
        git push origin main
        git push origin $TagName
        Write-Host "Tag pushed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Monitor at: https://github.com/YOUR_ORG/YOUR_REPO/actions" -ForegroundColor Cyan
    } else {
        Write-Host "Cancelled" -ForegroundColor Yellow
    }
}
