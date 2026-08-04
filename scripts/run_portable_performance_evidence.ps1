$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Manifest = Join-Path $RepoRoot 'src-tauri/Cargo.toml'

& cargo test --manifest-path $Manifest --locked --release portable::service::tests::portable_release_performance_evidence -- --ignored --exact --nocapture --test-threads=1
if ($LASTEXITCODE -ne 0) { throw "Portable package performance evidence failed with exit code $LASTEXITCODE" }
