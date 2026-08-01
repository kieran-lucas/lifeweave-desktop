$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
Push-Location $Root

try {
    Write-Host "1/9 Verifying immutable source" -ForegroundColor Cyan
    python scripts/verify_source_integrity.py
    python scripts/generate_spec_index.py --check
    python scripts/generate_coverage_matrix.py --check
    python scripts/check_repository.py

    Write-Host "2/9 Checking required commands" -ForegroundColor Cyan
    foreach ($command in @("git", "node", "corepack", "rustc", "cargo", "python")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Required command not found: $command. Run scripts/doctor.ps1 and install prerequisites."
        }
    }

    Write-Host "3/9 Enabling pinned pnpm line" -ForegroundColor Cyan
    corepack enable
    corepack prepare pnpm@11.17.0 --activate
    pnpm --version

    Write-Host "4/9 Installing workspace dependencies" -ForegroundColor Cyan
    pnpm install --frozen-lockfile=$false

    Write-Host "5/9 Frontend checks" -ForegroundColor Cyan
    pnpm typecheck
    pnpm test
    pnpm build

    Write-Host "6/9 Rust checks" -ForegroundColor Cyan
    cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
    cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
    cargo test --manifest-path src-tauri/Cargo.toml

    Write-Host "7/9 Tauri production build smoke" -ForegroundColor Cyan
    pnpm --dir frontend tauri build

    Write-Host "8/9 Governance recheck" -ForegroundColor Cyan
    python scripts/verify_no_remote_assets.py
    python scripts/check_repository.py

    Write-Host "9/9 Next steps" -ForegroundColor Cyan
    Write-Host "Review pnpm-lock.yaml and Cargo.lock."
    Write-Host "Commit them in the setup PR."
    Write-Host "Remove .setup-phase only after GitHub baseline checks pass."
}
finally {
    Pop-Location
}
