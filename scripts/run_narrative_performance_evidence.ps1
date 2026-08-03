$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
cargo test --manifest-path src-tauri/Cargo.toml --locked --release narrative_canvas_performance_evidence -- --ignored --test-threads=1 --nocapture
if ($LASTEXITCODE -ne 0) { throw "Narrative release performance evidence failed." }
