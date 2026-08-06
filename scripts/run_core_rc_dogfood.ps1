$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$mutex = [Threading.Mutex]::new($false, "Local\LifeweaveCoreRcDogfood")
if (-not $mutex.WaitOne(0)) { throw "Another Core RC dogfood run owns the lock." }
$owned = [Collections.Generic.List[int]]::new()

function Stop-OwnedTree([int]$RootPid) {
  $queue = [Collections.Generic.Queue[int]]::new(); $queue.Enqueue($RootPid)
  $all = [Collections.Generic.List[int]]::new()
  while ($queue.Count -gt 0) {
    $parent = $queue.Dequeue(); $all.Add($parent)
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$parent" -ErrorAction SilentlyContinue | ForEach-Object { $queue.Enqueue([int]$_.ProcessId) }
  }
  $ordered = $all.ToArray(); [array]::Reverse($ordered)
  foreach ($pidValue in $ordered) { Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue }
  $deadline = (Get-Date).AddSeconds(10)
  do {
    $survivors = @($ordered | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
    if ($survivors.Count -eq 0) { break }
    Start-Sleep -Milliseconds 100
  } while ((Get-Date) -lt $deadline)
  if ($survivors.Count -gt 0) { throw "Owned processes survived cleanup: $($survivors -join ', ')." }
}

try {
  Set-Location $repo
  $root = Join-Path $repo "target\e2e-data"
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  $root = (Resolve-Path $root).Path
  $runId = "core-rc-$([guid]::NewGuid().ToString('N'))"
  $run = Join-Path $root $runId
  New-Item -ItemType Directory -Path $run | Out-Null
  New-Item -ItemType File -Path (Join-Path $run ".lifeweave-e2e-sentinel") | Out-Null
  $run = (Resolve-Path $run).Path
  if ((Split-Path $run -Parent) -ne $root) { throw "RC profile containment validation failed." }
  $env:LIFEWEAVE_E2E_ROOT = $root
  $env:LIFEWEAVE_E2E_APP_DATA_DIR = $run

  pnpm build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
  cargo build --manifest-path src-tauri/Cargo.toml --locked --features e2e-test
  if ($LASTEXITCODE -ne 0) { throw "Contained native binary build failed." }
  $binary = Join-Path $repo "src-tauri\target\debug\lifeweave-desktop.exe"
  if (-not (Test-Path $binary)) { throw "Contained native binary is missing." }

  $sessions = @()
  foreach ($phase in 1..2) {
    $stdout = Join-Path $run "native-$phase.stdout.log"; $stderr = Join-Path $run "native-$phase.stderr.log"
    $process = Start-Process -FilePath $binary -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $owned.Add($process.Id); $sessions += $process.Id
    $deadline = (Get-Date).AddSeconds(25)
    do { Start-Sleep -Milliseconds 250; $process.Refresh() } while (-not $process.HasExited -and (Get-Date) -lt $deadline)
    if ($process.HasExited) { throw "Native RC session $phase exited before the 25-second liveness gate." }
    Stop-OwnedTree $process.Id
    $errors = (Get-Content $stderr -Raw -ErrorAction SilentlyContinue)
    if ($errors -match '(?i)panic|CSP|ACL|corrupt|migration failed|recovery failed') { throw "Native RC session $phase reported a fatal diagnostic." }
  }

  cargo test --manifest-path src-tauri/Cargo.toml --locked document
  if ($LASTEXITCODE -ne 0) { throw "Document recovery dogfood fixture failed." }
  cargo test --manifest-path src-tauri/Cargo.toml --locked infrastructure::backup
  if ($LASTEXITCODE -ne 0) { throw "Backup/restore dogfood fixture failed." }
  cargo test --manifest-path src-tauri/Cargo.toml --locked narrative
  if ($LASTEXITCODE -ne 0) { throw "Narrative dogfood fixture failed." }
  cargo test --manifest-path src-tauri/Cargo.toml --locked portable::service::tests::
  if ($LASTEXITCODE -ne 0) { throw "Portable Basic Leaf/Narrative round-trip dogfood fixtures failed." }
  # `life_branch::` covers the Task 42 package format, archive security, batched export, and the
  # atomic import including tag, link-cap, replay, and zero-residue behaviour.
  cargo test --manifest-path src-tauri/Cargo.toml --locked life_branch::
  if ($LASTEXITCODE -ne 0) { throw "Life branch interchange dogfood fixtures failed." }
  # `task::` covers evaluation, Upcoming/Overdue planning, Task 38 deadline semantics, and the
  # Task 39 Saved View domain in one selector.
  cargo test --manifest-path src-tauri/Cargo.toml --locked task::
  if ($LASTEXITCODE -ne 0) { throw "Task planning, deadline, evaluation, and Saved View dogfood fixtures failed." }

  $installer = Join-Path $repo "src-tauri\target\release\bundle\nsis\Lifeweave_0.0.0_x64-setup.exe"
  if (-not (Test-Path $installer)) { throw "Run the normal production Tauri build before RC dogfood." }
  $installerInfo = Get-Item $installer
  $result = [ordered]@{
    candidate = "core-rc-$((& 'C:\Program Files\Git\cmd\git.exe' rev-parse --short HEAD).Trim())"
    run_id = $runId
    isolated_profile = "target/e2e-data/$runId"
    session_pids = $sessions
    schema_reopen_sessions = 2
    liveness_seconds_each = 25
    installer = "src-tauri/target/release/bundle/nsis/$($installerInfo.Name)"
    installer_bytes = $installerInfo.Length
    installer_sha256 = (Get-FileHash -Algorithm SHA256 $installer).Hash.ToLowerInvariant()
    cleanup = "validated sentinel containment; owned processes stopped"
  }
  $result | ConvertTo-Json

  if (-not (Test-Path (Join-Path $run ".lifeweave-e2e-sentinel"))) { throw "RC sentinel disappeared before cleanup." }
  Remove-Item -LiteralPath $run -Recurse -Force
} finally {
  foreach ($pidValue in $owned) { if (Get-Process -Id $pidValue -ErrorAction SilentlyContinue) { Stop-OwnedTree $pidValue } }
  Remove-Item Env:LIFEWEAVE_E2E_ROOT -ErrorAction SilentlyContinue
  Remove-Item Env:LIFEWEAVE_E2E_APP_DATA_DIR -ErrorAction SilentlyContinue
  try { $mutex.ReleaseMutex() } catch { }
  $mutex.Dispose()
}
