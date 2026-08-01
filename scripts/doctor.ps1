$ErrorActionPreference = "Continue"

function Test-Command {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [string[]]$Arguments = @("--version")
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        Write-Host "[MISSING] $Name" -ForegroundColor Red
        return $false
    }

    try {
        $output = & $Name @Arguments 2>&1 | Select-Object -First 3
        Write-Host "[OK] $Name" -ForegroundColor Green
        $output | ForEach-Object { Write-Host "     $_" }
        return $true
    }
    catch {
        Write-Host "[ERROR] $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "Lifeweave Windows development doctor" -ForegroundColor Cyan
Write-Host "This script performs no installation or mutation.`n"

$results = @()
$results += Test-Command -Name "git"
$results += Test-Command -Name "gh"
$results += Test-Command -Name "node"
$results += Test-Command -Name "corepack"
$results += Test-Command -Name "pnpm"
$results += Test-Command -Name "rustc"
$results += Test-Command -Name "cargo"
$results += Test-Command -Name "python"

Write-Host "`nVisual Studio C++ build environment:" -ForegroundColor Cyan
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
    & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
}
else {
    Write-Host "[MISSING] vswhere / Visual Studio Installer" -ForegroundColor Yellow
}

Write-Host "`nWebView2 runtime:" -ForegroundColor Cyan
$webViewPaths = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application",
    "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application"
)
$foundWebView = $false
foreach ($path in $webViewPaths) {
    if (Test-Path $path) {
        Write-Host "[OK] $path" -ForegroundColor Green
        $foundWebView = $true
    }
}
if (-not $foundWebView) {
    Write-Host "[WARN] WebView2 runtime path not detected. Tauri may install/use it separately." -ForegroundColor Yellow
}

Write-Host "`nRepository integrity:" -ForegroundColor Cyan
python "$PSScriptRoot\verify_source_integrity.py"
python "$PSScriptRoot\check_repository.py"

$failed = ($results | Where-Object { -not $_ }).Count
if ($failed -gt 0) {
    Write-Host "`nDoctor found $failed missing/failing command(s)." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nDoctor checks completed successfully." -ForegroundColor Green
