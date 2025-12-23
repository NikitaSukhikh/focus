$total = 0
git ls-files | ForEach-Object {
    if (Test-Path $_) {
        $content = Get-Content $_ -ErrorAction SilentlyContinue
        $total += $content.Count
    }
}
$total
