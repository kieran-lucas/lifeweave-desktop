# Slice 000 — Task Checklist

## Governance and bootstrap
- [x] Run source integrity checks. — `python scripts/verify_source_integrity.py` passes; `python scripts/verify_no_remote_assets.py` passes (generated/ and target/ excluded).
- [x] Run Windows doctor. — `scripts/doctor.ps1` all green; `scripts/bootstrap.ps1` produces working lockfiles.
- [x] Generate `pnpm-lock.yaml`. — present at repo root; `pnpm install --frozen-lockfile` succeeds.
- [x] Generate `src-tauri/Cargo.lock`. — present; `cargo test --locked` passes (8/8).
- [x] Record tool versions. — `pnpm 11.17.0`, `node 22.x`, `rust stable`, recorded in bootstrap and CI.
- [x] Confirm TypeScript 6 compatibility behavior. — `tsconfig.app.json` targets ES2022; `vite/client` in types array resolves TS2882; vitest import resolves TS2769.
- [x] Frontend typecheck/test/build. — `pnpm typecheck` / `pnpm test` / `pnpm build` all pass (commit `6c9b8f2` baseline + Stage B changes).
- [x] Rust fmt/clippy/test. — `cargo fmt --check`, `cargo clippy --locked --all-targets -- -D warnings`, `cargo test --locked` all pass.
- [x] Tauri development launch. — verified locally; `tauri dev` starts without error.
- [x] Tauri production NSIS build smoke. — `Lifeweave_0.0.0_x64-setup.exe` produced in commit `6c9b8f2`.
- [x] Remove `.setup-phase` only after reviewed CI. — `.setup-phase` deleted after baseline; `HealthCheck.setup_phase` field removed and binding regenerated.

## Architecture
- [x] Create Rust domain/application/infrastructure/ipc boundaries. — `src-tauri/src/{domain,application,infrastructure,ipc,platform}/mod.rs` stubs with boundary comments; dependency direction enforced by convention.
- [x] Create centralized frontend IPC adapters. — `frontend/src/ipc/commands.ts` wraps `invoke`; `App.tsx` consumes adapter; test mocks adapter module not raw Tauri invoke.
- [x] Add typed error union. — `src-tauri/src/ipc/error.rs` `IpcError` enum with stable codes (`Validation/NotFound/StaleRevision/Storage/Corruption/Unsupported`); `#[serde(tag = "code")]` → discriminated union; no SQL/paths/stack traces; exported to `frontend/src/ipc/generated/IpcError.ts`.
- [x] Add operation ID/revision conventions. — `src-tauri/src/domain/primitives.rs`: `Revision(u32)` newtype with `INITIAL/new/value/next`; `OperationId = String` type alias; 4 compile-tested domain unit tests.
- [x] Add DTO generation/check. — `cargo test` exports `HealthCheck.ts` and `IpcError.ts` via ts-rs 10.1.0; CI drift check: `cargo test --locked` then `git diff --exit-code frontend/src/ipc/generated/`.
- [x] Add tracing initialization. — `init_tracing()` in `lib.rs` uses `tracing-subscriber` with `env-filter`; `try_init()` prevents panic on re-init in tests; no network, no personal content logged.

## SQLite
- [ ] Add bundled rusqlite.
- [ ] Dedicated worker and bounded queue.
- [ ] WAL/foreign keys/busy timeout.
- [ ] Migration runner and initial migration.
- [ ] Temporary DB test helper.
- [ ] Restart persistence.
- [ ] Clean close/reopen behavior.

## FoundationRecord
- [ ] Domain validation.
- [ ] Create/list/update/archive/restore.
- [ ] Atomic transactions.
- [ ] Generated frontend contracts.
- [ ] Minimal accessible UI states.
- [ ] Stale-revision behavior.
- [ ] No real user content.

## Backup/restore
- [ ] SQLite Online Backup API.
- [ ] Staging.
- [ ] Manifest and checksums.
- [ ] Progress reporting.
- [ ] Restore inspection.
- [ ] Automatic pre-restore safety copy/path.
- [ ] Integrity and foreign-key checks.
- [ ] Close/atomic swap/reopen.
- [ ] Failure rollback.
- [ ] Round-trip test.

## Quality
- [ ] Strict CSP/capability review.
- [ ] No disallowed remote resource.
- [ ] Keyboard/focus.
- [ ] Error boundary.
- [ ] Sensitive logging review.
- [ ] Performance spans.
- [ ] Windows E2E.
- [ ] Independent AI review.
- [ ] Product Owner acceptance.
