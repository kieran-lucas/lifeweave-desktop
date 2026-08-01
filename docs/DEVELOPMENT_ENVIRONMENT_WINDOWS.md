# Windows Development Environment

Target: Windows 10/11 x64, PowerShell 7 preferred.

## Required tools

1. Git for Windows.
2. GitHub CLI (`gh`) for repository publishing and PR workflows.
3. Visual Studio Build Tools with:
   - Desktop development with C++;
   - MSVC;
   - Windows 10/11 SDK;
   - CMake tools if requested by transitive crates.
4. Rustup and stable MSVC toolchain:
   - `rustup default stable-x86_64-pc-windows-msvc`
5. Node.js 24 LTS.
6. Corepack/pnpm 11.
7. Microsoft Edge WebView2 Runtime.
8. Python 3.12+ for governance scripts.
9. VS Code or another editor.

## Automated inspection

Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
./scripts/doctor.ps1
```

The doctor prints versions and does not mutate the system.

## Bootstrap

```powershell
./scripts/bootstrap.ps1
```

Bootstrap:
- verifies source integrity;
- checks required commands;
- enables the pinned pnpm line;
- installs workspace dependencies;
- creates lockfiles;
- checks frontend types/tests/build;
- checks Rust formatting/tests/build;
- performs Tauri development/build smoke where available;
- writes no user content.

Review generated lockfiles before committing.

## Manual verification

```powershell
git --version
gh --version
node --version
corepack --version
pnpm --version
rustc --version
cargo --version
python --version
```

## Environment rules

- Do not install dependencies globally except toolchain managers/CLIs.
- Do not place secrets in `.env` committed files.
- Do not use WSL as the only validation environment; final behavior must run under native Windows/WebView2.
- Do not develop against a real personal database.
- Use generated fixtures under temporary directories.
- Keep antivirus/Defender exclusions minimal; never exclude user data broadly.
- Test Windows scaling at 100%, 125%, 150%, 175%, and 200% before UI release gates.

## After bootstrap

1. Remove `.setup-phase` only in a reviewed PR after lockfiles and baseline checks pass.
2. Enable required GitHub status checks.
3. Begin `specs/000-foundation-proof`.
4. Do not activate Task or Life implementation until Foundation acceptance passes.
