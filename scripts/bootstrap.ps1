$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
Push-Location $Root

try {
    Write-Host "1/10 Verifying immutable source" -ForegroundColor Cyan
    python scripts/verify_source_integrity.py
    python scripts/generate_spec_index.py --check
    python scripts/generate_coverage_matrix.py --check
    python scripts/check_repository.py

    Write-Host "2/10 Checking required commands" -ForegroundColor Cyan
    foreach ($command in @("git", "node", "corepack", "rustc", "cargo", "rustup", "python")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Required command not found: $command. Run scripts/doctor.ps1 and install prerequisites."
        }
    }

    Write-Host "3/10 Installing Rust target and components (idempotent)" -ForegroundColor Cyan
    rustup target add x86_64-pc-windows-msvc
    if ($LASTEXITCODE -ne 0) { throw "rustup target add x86_64-pc-windows-msvc failed." }
    rustup component add rustfmt clippy
    if ($LASTEXITCODE -ne 0) { throw "rustup component add rustfmt clippy failed." }

    Write-Host "4/10 Enabling pinned pnpm line" -ForegroundColor Cyan
    corepack enable
    corepack prepare pnpm@11.17.0 --activate
    pnpm --version

    Write-Host "5/10 Installing workspace dependencies" -ForegroundColor Cyan
    pnpm install --frozen-lockfile=$false

    Write-Host "6/10 Frontend checks" -ForegroundColor Cyan
    pnpm typecheck
    pnpm test
    pnpm build

    Write-Host "7/10 Rust checks" -ForegroundColor Cyan
    cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
    cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
    cargo test --manifest-path src-tauri/Cargo.toml

    Write-Host "8/10 Tauri production build smoke" -ForegroundColor Cyan
    pnpm --dir frontend tauri build

    Write-Host "9/10 Governance recheck" -ForegroundColor Cyan
    python scripts/verify_no_remote_assets.py
    python scripts/check_repository.py

    Write-Host "10/10 Next steps" -ForegroundColor Cyan
    Write-Host "Review pnpm-lock.yaml and Cargo.lock."
    Write-Host "Commit them in the setup PR."
    Write-Host "Remove .setup-phase only after GitHub baseline checks pass."
}
finally {
    Pop-Location
}
