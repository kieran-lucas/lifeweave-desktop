# Task 5 — Native Windows Foundation E2E

## Scope

The repository now contains a WebdriverIO/tauri-driver harness under
`e2e-tests/` and an `e2e-test`-only app-data override. The override accepts only
absolute paths beneath `target/e2e-data`; production builds ignore the variable.
The scenario drives the real Tauri binary and covers the FoundationRecord,
restart, backup catalog and restore flow with accessible selectors.

## Implementation

- `pnpm e2e:windows` builds the production frontend, compiles the E2E feature,
  creates a per-run synthetic profile, starts `tauri-driver`, runs WebdriverIO,
  and removes only the verified run directory.
- `tauri-driver` version: 2.0.6; WebdriverIO packages are pinned in the E2E
  workspace. No E2E command or capability is included in the normal app.
- `scripts/check_repository.py` now ignores dependency/build output directories
  when validating JSON, while still enforcing tracked-artifact governance.

## Gate evidence

- Rust: 195 tests passed; check with `e2e-test`, fmt and clippy passed.
- Frontend: 19 tests passed; typecheck and build passed.
- `pnpm verify` passed after the dependency-output exclusion.
- Normal `pnpm tauri build` passed and produced
  `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` without
  the E2E feature.

## Current limitation

The native scenario could not execute in this environment because Edge
WebDriver was not installed and the Microsoft driver endpoint was unavailable
for automatic download (`msedgedriver.azureedge.net` DNS failure). The harness
fails closed with this diagnostic and retains per-run logs on failure. No native
E2E scenario count or acceptance claim is recorded.

## Status

Task 5 remains active pending a Windows `msedgedriver` installation and a
successful `pnpm e2e:windows` run. Task 6 acceptance remains prohibited.
