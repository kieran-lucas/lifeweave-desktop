# Task 26 Audit — Native E2E Contract Refresh

**Starting HEAD:** `4cf6ca3f7e0492b12d7497705518f5391c76a6b1` (accepted Task 25)  
**Final HEAD:** the single Task 26 commit containing this audit  
**Schema:** 14 (unchanged)

## Contract and result

The obsolete Foundation Records contract (`h1=Foundation Records`, record create/edit/archive selectors) was removed from all three native specifications. The replacement is the current one-off Task flow:

- Phase 1 created `E2E Alpha` for 09:00–10:00, renamed it to `E2E Beta`, and verified no error state.
- Phase 2 created a backup through Settings, captured and explicitly reselected its opaque backup ID, renamed the task to `E2E Gamma`, restored through the UI, and verified `E2E Beta` returned while `E2E Gamma` was absent.
- Phase 3 used a new native process and verified the same restored state plus an enabled Create task control.

`pnpm e2e:windows` passed all phases in one run. WebView2 Runtime and the Microsoft-signed matching Edge WebDriver were both `150.0.4078.105`. The runner retained its sentinel-contained profile for all phases, used one driver lifecycle per phase, and removed the successful `target/e2e-data/run-*` profile. Failures retain copied stdout/stderr and profile artifacts under `target/e2e-artifacts`; prior selector-repair evidence remains there.

The runner now creates the debug `e2e-test` binary through Tauri so `tauri.localhost` receives packaged frontend assets. This is test-runner behavior only; no production behavior changed.

## Changed files

`e2e-tests/specs/phase1-lifecycle.e2e.ts`, `e2e-tests/specs/phase2-backup-restore.e2e.ts`, `e2e-tests/specs/phase3-restart.e2e.ts`, `scripts/run_windows_e2e.ps1`, `specs/016-native-e2e-contract-refresh/{README,spec,plan,tasks,acceptance,risk-register}.md`, `docs/audits/task-26-native-e2e-contract-refresh.md`, `docs/STATUS.md`, and `docs/ROADMAP.md`.

## Gates and scope

- `pnpm verify`, `pnpm typecheck`, `pnpm test` (**429 passed**), and `pnpm build` passed.
- `cargo check`, format check, Clippy (`-D warnings`), and `cargo test` passed (**398 passed, 1 isolated performance test ignored**).
- No migration, dependency, IPC, backup-format, workflow, source-of-truth, or product feature change occurred.

Remaining external debt is limited to manual screen-reader and physical alternate-DPI validation. Task 25's stale native E2E selector debt is closed.
