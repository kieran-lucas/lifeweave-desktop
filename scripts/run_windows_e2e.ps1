$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $repo 'target\e2e-data'
$run = Join-Path $dataRoot ('run-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $run | Out-Null
$tools = Join-Path $repo 'target\e2e-tools'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
try {
  if (-not (Get-Command tauri-driver -ErrorAction SilentlyContinue)) {
    throw 'tauri-driver is required for native E2E; install the pinned Windows driver before running pnpm e2e:windows.'
  }
  $edgeDriver = Join-Path $tools 'msedgedriver.exe'
  if (-not (Test-Path $edgeDriver)) {
    $edge = Get-Item 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ErrorAction Stop
    $version = $edge.VersionInfo.ProductVersion
    $zip = Join-Path $run 'edgedriver.zip'
    Invoke-WebRequest "https://msedgedriver.azureedge.net/$version/edgedriver_win64.zip" -OutFile $zip
    Expand-Archive -LiteralPath $zip -DestinationPath $tools -Force
  }
  $env:LIFEWEAVE_E2E_APP_DATA_DIR = $run
  pnpm --dir frontend build
  cargo build --manifest-path src-tauri/Cargo.toml --features e2e-test
  $driverOut = Join-Path $run 'webdriver.out.log'
  $driverErr = Join-Path $run 'webdriver.err.log'
  $driver = Start-Process -FilePath 'tauri-driver.exe' -ArgumentList '--native-driver', $edgeDriver, '--port','4444' -RedirectStandardOutput $driverOut -RedirectStandardError $driverErr -PassThru
  Start-Sleep -Milliseconds 500
  if ($driver.HasExited) { throw 'tauri-driver exited before the E2E session started' }
  pnpm --dir e2e-tests exec wdio run wdio.conf.ts
  if ($LASTEXITCODE -ne 0) { throw "native WebDriver E2E failed with exit code $LASTEXITCODE" }
} finally {
  if ($driver -and -not $driver.HasExited) { Stop-Process -Id $driver.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $run -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item Env:LIFEWEAVE_E2E_APP_DATA_DIR -ErrorAction SilentlyContinue
}
