$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$manifest = Join-Path $repo 'src-tauri\Cargo.toml'
& cargo test --manifest-path $manifest --locked --release task::planning::tests::planning_release_performance_evidence -- --ignored --exact --nocapture --test-threads=1
if ($LASTEXITCODE -ne 0) { throw 'Task planning performance evidence failed.' }
