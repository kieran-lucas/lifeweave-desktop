param(
  [string[]]$Phases
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $repo 'target\e2e-data'
$artifactRoot = Join-Path $repo 'target\e2e-artifacts'
$runId = [Guid]::NewGuid().ToString('N')
$run = Join-Path $dataRoot ('run-' + $runId)
$artifacts = Join-Path $artifactRoot $runId
$lock = Join-Path $dataRoot '.e2e.lock'
$driver = $null
$success = $false
$allPhases = @(
  'phase1-lifecycle.e2e.ts',
  'phase2-backup-restore.e2e.ts',
  'phase3-restart.e2e.ts',
  'phase4-portable-roundtrip.e2e.ts',
  'phase4-portable-restart.e2e.ts',
  'phase6-planning.e2e.ts',
  'phase6-planning-restart.e2e.ts',
  'phase7-unified-tags.e2e.ts',
  'phase7-unified-tags-restart.e2e.ts',
  'phase8-focus-plans.e2e.ts',
  'phase8-focus-plans-restart.e2e.ts',
  'phase9-deadline-saved-views.e2e.ts',
  'phase9-deadline-saved-views-restart.e2e.ts',
  'phase10-saved-views-backup-restore.e2e.ts',
  'phase10-saved-views-backup-restore-restart.e2e.ts',
  'phase11-life-links.e2e.ts',
  'phase11-life-links-restart.e2e.ts',
  'phase12-life-links-backup-restore.e2e.ts',
  'phase12-life-links-backup-restore-restart.e2e.ts',
  'phase13-life-branch-interchange.e2e.ts',
  'phase13-life-branch-interchange-restart.e2e.ts',
  'phase14-actual-time.e2e.ts',
  'phase14-actual-time-restart.e2e.ts',
  # Task 44 persists nothing, so phase 15 has no restart companion by design.
  'phase15-life-graph.e2e.ts',
  # Task 45 persists nothing either, so phase 16 has no restart companion by design.
  'phase16-keyboard-shortcuts.e2e.ts',
  # Task 46 adds no persistence format, so phase 17 has no restart companion by design.
  'phase17-planned-vs-actual-analytics.e2e.ts',
  'phase18-life-tree-interchange.e2e.ts',
  'phase18-life-tree-interchange-restart.e2e.ts'
)
if (-not $Phases -or $Phases.Count -eq 0) { $Phases = $allPhases }
foreach ($phase in $Phases) {
  if ($phase -notin $allPhases) { throw "unknown native E2E phase: $phase" }
}

function Test-DriverPortOpen {
  try {
    $socket = New-Object Net.Sockets.TcpClient
    $connect = $socket.BeginConnect('127.0.0.1', 4444, $null, $null)
    $connected = $connect.AsyncWaitHandle.WaitOne(250, $false) -and $socket.Connected
    $socket.Close()
    return $connected
  } catch {
    return $false
  }
}

function Stop-NativeE2EProcesses {
  param([System.Diagnostics.Process]$DriverProcess)

  if ($DriverProcess -and -not $DriverProcess.HasExited) {
    & taskkill.exe /PID $DriverProcess.Id /T /F 2>$null | Out-Null
  }

  foreach ($name in @('lifeweave-desktop', 'tauri-driver', 'msedgedriver')) {
    Get-Process -Name $name -ErrorAction SilentlyContinue |
      Stop-Process -Force -ErrorAction SilentlyContinue
  }

  $deadline = (Get-Date).AddSeconds(20)
  do {
    $remaining = @(
      Get-Process -Name 'lifeweave-desktop', 'tauri-driver', 'msedgedriver' -ErrorAction SilentlyContinue
    )
    if ($remaining.Count -eq 0 -and -not (Test-DriverPortOpen)) {
      return
    }
    Start-Sleep -Milliseconds 250
  } while ((Get-Date) -lt $deadline)

  $names = @(
    Get-Process -Name 'lifeweave-desktop', 'tauri-driver', 'msedgedriver' -ErrorAction SilentlyContinue |
      ForEach-Object { "$($_.ProcessName):$($_.Id)" }
  )
  throw "native E2E cleanup timed out; remaining processes: $($names -join ', '); port 4444 open: $(Test-DriverPortOpen)"
}

New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
if (Test-Path $lock) { throw "another native E2E run owns $lock" }
New-Item -ItemType File -Path $lock -Force | Out-Null
New-Item -ItemType Directory -Force -Path $run | Out-Null
New-Item -ItemType File -Path (Join-Path $run '.lifeweave-e2e-sentinel') | Out-Null
try {
  Stop-NativeE2EProcesses -DriverProcess $null
  if (-not (Get-Command tauri-driver -ErrorAction SilentlyContinue)) { throw 'tauri-driver is required' }
  if ([Environment]::Is64BitOperatingSystem -eq $false) { throw 'only 64-bit Windows is supported' }
  $webViewKey = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
  $runtime = (Get-ItemProperty -Path $webViewKey -Name pv -ErrorAction SilentlyContinue).pv
  if (-not $runtime -or $runtime -eq '0.0.0.0' -or $runtime -notmatch '^\d+\.\d+\.\d+\.\d+$') { throw 'WebView2 Runtime version was not found in the official registry key' }
  Write-Host "Detected WebView2 Runtime $runtime"
  $driverCache = Join-Path $repo "target\e2e-tools\msedgedriver\$runtime\msedgedriver.exe"
  $nativeDriver = $env:MSEDGEDRIVER_PATH
  if ($nativeDriver) {
    if (-not (Test-Path -LiteralPath $nativeDriver)) { throw 'MSEDGEDRIVER_PATH does not exist' }
  } elseif (Test-Path -LiteralPath $driverCache) {
    $nativeDriver = $driverCache
  } else {
    $tmpZip = Join-Path $run 'edgedriver.zip'
    $tmpDir = Join-Path $run 'driver-extract'
    New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
    $url = "https://msedgedriver.microsoft.com/$runtime/edgedriver_win64.zip"
    try { Invoke-WebRequest -Uri $url -OutFile $tmpZip -TimeoutSec 60 } catch { & curl.exe --fail --location --retry 2 --max-time 120 $url --output $tmpZip; if ($LASTEXITCODE -ne 0) { throw "driver download failed: $($_.Exception.Message)" } }
    Expand-Archive -LiteralPath $tmpZip -DestinationPath $tmpDir -Force
    $downloaded = @(
      (Join-Path $tmpDir 'msedgedriver.exe'),
      (Join-Path $tmpDir 'edgedriver.exe')
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $downloaded) { throw 'driver archive did not contain a supported Edge WebDriver executable' }
    New-Item -ItemType Directory -Force -Path (Split-Path $driverCache) | Out-Null
    Move-Item -LiteralPath $downloaded -Destination $driverCache -Force
    $nativeDriver = $driverCache
  }
  $signature = Get-AuthenticodeSignature -LiteralPath $nativeDriver
  if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft') { throw 'Edge WebDriver Authenticode signature is not valid Microsoft code' }
  $versionOutput = & $nativeDriver --version 2>&1 | Out-String
  if ($versionOutput -notmatch $runtime.Substring(0, $runtime.LastIndexOf('.'))) { throw "driver version does not match WebView2 Runtime: $versionOutput" }
  Write-Host "Using Edge WebDriver $versionOutput"
  $env:MSEDGEDRIVER_TELEMETRY_OPTOUT = '1'
  $env:LIFEWEAVE_E2E_APP_DATA_DIR = $run
  $env:LIFEWEAVE_E2E_ROOT = (Resolve-Path $dataRoot).Path
  pnpm tauri build --debug --features e2e-test
  if ($LASTEXITCODE -ne 0) { throw 'E2E binary build failed' }
  $env:LIFEWEAVE_E2E_BINARY = (Resolve-Path 'src-tauri\target\debug\lifeweave-desktop.exe').Path

  foreach ($phase in $Phases) {
    $out = Join-Path $run "$phase.out.log"
    $err = Join-Path $run "$phase.err.log"
    $phaseExitCode = $null
    try {
      Stop-NativeE2EProcesses -DriverProcess $null
      $driver = Start-Process -FilePath 'tauri-driver.exe' -ArgumentList '--native-driver', $nativeDriver, '--port', '4444' -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
      $ready = $false
      for ($i = 0; $i -lt 80; $i++) {
        if ($driver.HasExited) { throw "tauri-driver exited during $phase" }
        if (Test-DriverPortOpen) { $ready = $true; break }
        Start-Sleep -Milliseconds 250
      }
      if (-not $ready) { throw "tauri-driver did not become ready for $phase" }

      pnpm --dir e2e-tests exec wdio run wdio.conf.ts --spec "specs/$phase"
      $phaseExitCode = $LASTEXITCODE
    } finally {
      Stop-NativeE2EProcesses -DriverProcess $driver
      $driver = $null
    }

    if ($phaseExitCode -ne 0) {
      throw "$phase failed with exit code $phaseExitCode"
    }
  }
  $success = $true
} finally {
  try {
    Stop-NativeE2EProcesses -DriverProcess $driver
  } catch {
    if ($success) { throw }
    Write-Warning $_.Exception.Message
  }
  Remove-Item Env:LIFEWEAVE_E2E_APP_DATA_DIR -ErrorAction SilentlyContinue
  Remove-Item Env:LIFEWEAVE_E2E_ROOT -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
  if ($success) {
    Remove-Item -LiteralPath $run -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    New-Item -ItemType Directory -Force -Path $artifacts | Out-Null
    Copy-Item -LiteralPath $run -Destination $artifacts -Recurse -Force -ErrorAction SilentlyContinue
    Write-Error "Native E2E failed; artifacts retained at $artifacts"
  }
}
