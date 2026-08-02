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
New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
if (Test-Path $lock) { throw "another native E2E run owns $lock" }
New-Item -ItemType File -Path $lock -Force | Out-Null
New-Item -ItemType Directory -Force -Path $run | Out-Null
New-Item -ItemType File -Path (Join-Path $run '.lifeweave-e2e-sentinel') | Out-Null
try {
  if (-not (Get-Command tauri-driver -ErrorAction SilentlyContinue)) { throw 'tauri-driver is required' }
  $nativeDriver = $env:MSEDGEDRIVER_PATH
  if (-not $nativeDriver -or -not (Test-Path -LiteralPath $nativeDriver)) {
    throw 'MSEDGEDRIVER_PATH must point to a locally installed matching WebView2 driver; no network download is attempted'
  }
  $env:LIFEWEAVE_E2E_APP_DATA_DIR = $run
  pnpm --dir frontend build
  if ($LASTEXITCODE -ne 0) { throw 'frontend build failed' }
  cargo build --manifest-path src-tauri/Cargo.toml --features e2e-test
  if ($LASTEXITCODE -ne 0) { throw 'E2E binary build failed' }
  foreach ($phase in @('phase1-lifecycle.e2e.ts','phase2-backup-restore.e2e.ts','phase3-restart.e2e.ts')) {
    $out = Join-Path $run "$phase.out.log"; $err = Join-Path $run "$phase.err.log"
    $driver = Start-Process -FilePath 'tauri-driver.exe' -ArgumentList '--native-driver', $nativeDriver, '--port','4444' -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
      if ($driver.HasExited) { throw "tauri-driver exited during $phase" }
      try { $socket = New-Object Net.Sockets.TcpClient('127.0.0.1',4444); $socket.Dispose(); $ready = $true; break } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw "tauri-driver did not become ready for $phase" }
    pnpm --dir e2e-tests exec wdio run wdio.conf.ts --spec "specs/$phase"
    if ($LASTEXITCODE -ne 0) { throw "$phase failed with exit code $LASTEXITCODE" }
    if ($driver -and -not $driver.HasExited) { Stop-Process -Id $driver.Id -Force -ErrorAction SilentlyContinue }
    $driver = $null
  }
  $success = $true
} finally {
  if ($driver -and -not $driver.HasExited) { Stop-Process -Id $driver.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item Env:LIFEWEAVE_E2E_APP_DATA_DIR -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
  if ($success) {
    Remove-Item -LiteralPath $run -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    New-Item -ItemType Directory -Force -Path $artifacts | Out-Null
    Copy-Item -LiteralPath $run -Destination $artifacts -Recurse -Force -ErrorAction SilentlyContinue
    Write-Error "Native E2E failed; artifacts retained at $artifacts"
  }
}
