#!/usr/bin/env pwsh
# verify-release.ps1
# Verify that a release artifact corresponds to a tagged commit

param(
    [Parameter(Mandatory=$true)]
    [string]$Tag,

    [Parameter(Mandatory=$false)]
    [string]$ArtifactPath
)

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Release Verification Tool" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Validate tag format
if ($Tag -notmatch '^v\d+\.\d+\.\d+$') {
    Write-Warning "Tag should be in format vX.Y.Z (e.g., v1.0.0)"
}

# Check if tag exists
Write-Host "[1/5] Checking if tag exists..." -ForegroundColor Yellow
$tagExists = git tag -l $Tag
if (-not $tagExists) {
    Write-Error "Tag $Tag does not exist"
    Write-Host "Available tags:"
    git tag -l "v*"
    exit 1
}
Write-Host "✓ Tag $Tag exists" -ForegroundColor Green
Write-Host ""

# Get tag information
Write-Host "[2/5] Getting tag information..." -ForegroundColor Yellow
$tagCommit = git rev-list -n 1 $Tag
$tagCommitShort = $tagCommit.Substring(0, 7)
Write-Host "✓ Tag points to commit: $tagCommitShort" -ForegroundColor Green
Write-Host ""

# Verify tag signature (if signed)
Write-Host "[3/5] Checking tag signature..." -ForegroundColor Yellow
$tagType = git cat-file -t $Tag
if ($tagType -eq "tag") {
    $tagObject = git cat-file tag $Tag
    if ($tagObject -match "-----BEGIN PGP SIGNATURE-----") {
        Write-Host "Tag is GPG signed, verifying..." -ForegroundColor Gray
        try {
            git tag -v $Tag 2>&1 | Out-Host
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ GPG signature valid" -ForegroundColor Green
            } else {
                Write-Warning "GPG signature verification failed"
            }
        } catch {
            Write-Warning "Could not verify GPG signature: $_"
        }
    } else {
        Write-Host "✓ Tag is annotated but not signed" -ForegroundColor Yellow
    }
} else {
    Write-Warning "Tag is lightweight (not annotated or signed)"
}
Write-Host ""

# Show commit details
Write-Host "[4/5] Commit Details" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
git show --no-patch --format="  Author:    %an <%ae>%n  Date:      %ad%n  Commit:    %H%n  Message:   %s" $Tag
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Verify package.json version matches tag
Write-Host "[5/5] Verifying package.json version..." -ForegroundColor Yellow
$expectedVersion = $Tag.TrimStart('v')
$packageJsonContent = git show "${Tag}:ui/package.json"
if ($packageJsonContent) {
    $packageJson = $packageJsonContent | ConvertFrom-Json
    $packageVersion = $packageJson.version

    if ($packageVersion -eq $expectedVersion) {
        Write-Host "✓ package.json version ($packageVersion) matches tag" -ForegroundColor Green
    } else {
        Write-Warning "Version mismatch: package.json=$packageVersion, tag=$expectedVersion"
    }
} else {
    Write-Warning "Could not read ui/package.json from tag"
}
Write-Host ""

# Verify artifact checksums (if artifact path provided)
if ($ArtifactPath) {
    Write-Host "[Bonus] Verifying artifact checksums..." -ForegroundColor Yellow

    if (-not (Test-Path $ArtifactPath)) {
        Write-Error "Artifact path not found: $ArtifactPath"
    } else {
        $hash = Get-FileHash $ArtifactPath -Algorithm SHA256
        Write-Host "Artifact: $ArtifactPath" -ForegroundColor Gray
        Write-Host "SHA256:   $($hash.Hash)" -ForegroundColor White
        Write-Host ""
        Write-Host "Compare this hash with checksums.txt from the GitHub release" -ForegroundColor Cyan
    }
    Write-Host ""
}

# Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Verification Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tag:              $Tag" -ForegroundColor White
Write-Host "Commit:           $tagCommit" -ForegroundColor White
Write-Host "Short Commit:     $tagCommitShort" -ForegroundColor White
Write-Host ""
Write-Host "To checkout this release:" -ForegroundColor Cyan
Write-Host "  git checkout $Tag" -ForegroundColor Gray
Write-Host ""
Write-Host "To build from source:" -ForegroundColor Cyan
Write-Host "  git checkout $Tag" -ForegroundColor Gray
Write-Host "  cd ui && npm ci && npm run build" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify artifact (if you have the file):" -ForegroundColor Cyan
Write-Host "  .\scripts\verify-release.ps1 -Tag $Tag -ArtifactPath path\to\artifact.exe" -ForegroundColor Gray
Write-Host ""
