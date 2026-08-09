param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('F0','S01','S02','S03','S04','Q1','S05','S06','Q2','S07','S08','S09','Q3','S10','S11','Q4','S12','Q5','FINAL')]
  [string]$Stage,

  [Parameter(Mandatory = $true)]
  [ValidateSet('shell-task','calendar-analytics-plans','life-reader-interchange','narrative','settings','foundation','full')]
  [string]$Profile,

  [ValidateSet('light','dark')]
  [string]$Theme = 'light',

  [ValidatePattern('^\d+x\d+$')]
  [string]$Viewport,

  [string]$VisualTags,
  [switch]$VisualRegression,
  [switch]$ForcedColors,
  [switch]$ReducedMotion
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repo "target\codex-stage\$Stage\logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $logRoot "visual-$Profile-$stamp.log"
$errorLog = Join-Path $logRoot "visual-$Profile-$stamp.err.log"

$env:LIFEWEAVE_AUDIT_PROFILE = $Profile
$env:LIFEWEAVE_AUDIT_LABEL = "$Stage-$stamp"
$env:LIFEWEAVE_AUDIT_THEME = $Theme
if ($Viewport) { $env:LIFEWEAVE_AUDIT_VIEWPORT = $Viewport }
if ($VisualTags) { $env:LIFEWEAVE_VISUAL_TAGS = $VisualTags }
if ($VisualRegression) { $env:LIFEWEAVE_VISUAL_REGRESSION = '1' }
if ($ForcedColors) { $env:LIFEWEAVE_AUDIT_FORCED_COLORS = '1' }
if ($ReducedMotion) { $env:LIFEWEAVE_AUDIT_REDUCED_MOTION = '1' }

$pnpm = (Get-Command pnpm.cmd -ErrorAction Stop).Source
Push-Location $repo
try {
  # pnpm writes its command banner to stderr. Keep native stderr as evidence without allowing
  # Windows PowerShell to promote that ordinary stream into a terminating NativeCommandError.
  $savedPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & $pnpm e2e:windows -- task50b-maximized-audit.e2e.ts 1> $log 2> $errorLog
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $savedPreference
  }
} finally {
  Pop-Location
}

if ($code -eq 0) {
  $summary = Select-String -LiteralPath $log -Pattern 'profile:|screens:|environment:' |
    Select-Object -Last 3 |
    ForEach-Object { $_.Line.Trim() }
  Write-Host "VISUAL AUDIT PASS [$Stage/$Profile] $($summary -join ' | ')"
  Write-Host "LOG: $log"
  exit 0
}

Write-Error "VISUAL AUDIT FAIL [$Stage/$Profile] exit=$code log=$log"
Get-Content -LiteralPath $log -Tail 80
if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Tail 80 }
exit $code
