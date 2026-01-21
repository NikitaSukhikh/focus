$total = 0
$blankLines = 0
$commentLines = 0
$languageStats = @{}
$otherFiles = @{}

git ls-files | ForEach-Object {
    if (Test-Path $_) {
        $ext = [System.IO.Path]::GetExtension($_)
        $content = Get-Content $_ -ErrorAction SilentlyContinue

        if ($null -ne $content) {
            $fileBlank = 0
            $fileComment = 0
            $fileTotal = $content.Count

            foreach ($line in $content) {
                $trimmed = $line.Trim()

                # Count blank lines
                if ([string]::IsNullOrWhiteSpace($trimmed)) {
                    $blankLines++
                    $fileBlank++
                    continue
                }

                # Count comment lines based on file extension
                $isComment = $false
                switch -Regex ($ext) {
                    '\.(py|sh)$' { $isComment = $trimmed -match '^#' }
                    '\.(ts|tsx|js|jsx|css)$' { $isComment = $trimmed -match '^//' -or $trimmed -match '^/\*' -or $trimmed -match '^\*' }
                    '\.(md)$' { continue } # Skip markdown files from comment detection
                }

                if ($isComment) {
                    $commentLines++
                    $fileComment++
                }
            }

            $total += $fileTotal
            $fileCode = $fileTotal - $fileBlank - $fileComment

            # Categorize by language
            $language = switch -Regex ($ext) {
                '\.(py)$' { "Python" }
                '\.(ts|tsx)$' { "TypeScript/React" }
                '\.(js|jsx)$' { "JavaScript" }
                '\.(css)$' { "CSS" }
                '\.(md)$' { "Markdown" }
                '\.(json|toml|yaml|yml)$' { "Config" }
                '\.(sh|ps1)$' { "Scripts" }
                '\.(rs)$' { "Rust" }
                default { "Other" }
            }

            if (-not $languageStats.ContainsKey($language)) {
                $languageStats[$language] = @{Total=0; Blank=0; Comment=0; Code=0}
            }
            $languageStats[$language].Total += $fileTotal
            $languageStats[$language].Blank += $fileBlank
            $languageStats[$language].Comment += $fileComment
            $languageStats[$language].Code += $fileCode

            # Track "Other" files by extension
            if ($language -eq "Other") {
                $extKey = if ($ext) { $ext } else { "(no extension)" }
                if (-not $otherFiles.ContainsKey($extKey)) {
                    $otherFiles[$extKey] = @{Count=0; Lines=0}
                }
                $otherFiles[$extKey].Count++
                $otherFiles[$extKey].Lines += $fileTotal
            }
        }
    }
}

$codeLines = $total - $blankLines - $commentLines

Write-Host "`n=== Total Statistics ===" -ForegroundColor Cyan
Write-Host "Total lines: $total"
Write-Host "Blank lines: $blankLines"
Write-Host "Comment lines: $commentLines"
Write-Host "Code lines: $codeLines" -ForegroundColor Green

Write-Host "`n=== By Language ===" -ForegroundColor Cyan
$languageStats.GetEnumerator() | Sort-Object {$_.Value.Code} -Descending | ForEach-Object {
    Write-Host "`n$($_.Key):" -ForegroundColor Yellow
    Write-Host "  Total: $($_.Value.Total)"
    Write-Host "  Code: $($_.Value.Code)" -ForegroundColor Green
    Write-Host "  Blank: $($_.Value.Blank)"
    Write-Host "  Comments: $($_.Value.Comment)"
}

# Show breakdown of "Other" category if it exists
if ($otherFiles.Count -gt 0) {
    Write-Host "`n=== 'Other' Category Breakdown ===" -ForegroundColor Cyan
    $otherFiles.GetEnumerator() | Sort-Object {$_.Value.Lines} -Descending | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value.Count) files, $($_.Value.Lines) lines" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PURE CODE LINES (no blanks): $codeLines" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Calculate total written code
$pythonCode = if ($languageStats.ContainsKey("Python")) { $languageStats["Python"].Code } else { 0 }
$tsCode = if ($languageStats.ContainsKey("TypeScript/React")) { $languageStats["TypeScript/React"].Code } else { 0 }
$cssCode = if ($languageStats.ContainsKey("CSS")) { $languageStats["CSS"].Code } else { 0 }
$jsCode = if ($languageStats.ContainsKey("JavaScript")) { $languageStats["JavaScript"].Code } else { 0 }
$scriptsCode = if ($languageStats.ContainsKey("Scripts")) { $languageStats["Scripts"].Code } else { 0 }
$totalWrittenCode = $pythonCode + $tsCode + $cssCode + $jsCode + $scriptsCode

Write-Host "Total written code: $totalWrittenCode" -ForegroundColor Green
Write-Host "  Python: $pythonCode"
Write-Host "  TypeScript/React: $tsCode"
Write-Host "  CSS: $cssCode"
Write-Host "  JavaScript: $jsCode"
Write-Host "  Scripts: $scriptsCode"
Write-Host ""
