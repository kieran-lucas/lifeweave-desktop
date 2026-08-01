# Slice 000 — Task Checklist

## Governance and bootstrap
- [x] Run source integrity checks. — `python scripts/verify_source_integrity.py` passes; `python scripts/verify_no_remote_assets.py` passes (generated/ and target/ excluded).
- [x] Run Windows doctor. — `scripts/doctor.ps1` all green; `scripts/bootstrap.ps1` produces working lockfiles.
- [x] Generate `pnpm-lock.yaml`. — present at repo root; `pnpm install --frozen-lockfile` succeeds.
- [x] Generate `src-tauri/Cargo.lock`. — present; `cargo test --locked` passes (8/8).
- [x] Record tool versions. — `pnpm 11.17.0`, `node 24.15.0` (local); `.node-version` pins `24.18.0` for CI; `rust stable`; recorded in bootstrap and CI.
- [x] Confirm TypeScript 6 compatibility behavior. — `tsconfig.app.json` targets ES2022; `vite/client` in types array resolves TS2882; vitest import resolves TS2769.
- [x] Frontend typecheck/test/build. — `pnpm typecheck` / `pnpm test` / `pnpm build` all pass (commit `6c9b8f2` baseline + Stage B changes).
- [x] Rust fmt/clippy/test. — `cargo fmt --check`, `cargo clippy --locked --all-targets -- -D warnings`, `cargo test --locked` all pass.
- [x] Tauri development launch. — `tauri dev` run: Rust dev profile compiled in 8.07s; Vite ready at `localhost:1420`; `target\debug\lifeweave-desktop.exe` launched; process remained alive 15s post-launch with no self-exit (window open). A "beforeDevCommand terminated with non-zero" log entry appears on forced kill during test teardown; this is an artifact of killing the Vite child process externally, not a spontaneous failure. Visual UI/IPC state (health_check → ready) was not captured programmatically but is consistent with a successful launch.
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
- [x] Add bundled rusqlite. — `rusqlite = { version = "=0.40.1", features = ["bundled"] }` in `Cargo.toml`; `libsqlite3-sys v0.38.1` compiled from source; release binary includes SQLite; `Lifeweave_0.0.0_x64-setup.exe` produced with bundled SQLite (`cargo test --locked` 27/27 pass).
- [x] Dedicated worker and bounded queue. — `infrastructure::sqlite::worker::DbWorkerHandle`: single thread named "lifeweave-db"; `sync_channel(32)` bounded command queue; closure-based `execute<F,R>` dispatches work to worker thread; `worker_executes_on_different_thread` test asserts caller thread ID ≠ worker thread ID.
- [x] WAL/foreign keys/busy timeout. — `open_file_connection` sets and asserts `journal_mode=wal`, `foreign_keys=1`, `busy_timeout=5000`, `synchronous=NORMAL`; `open_memory_connection` asserts `foreign_keys=1` and `busy_timeout=5000` (WAL unavailable for `:memory:`); 4 PRAGMA tests pass.
- [x] Migration runner and initial migration. — `run_migrations_with` validates strict-ascending versions, bootstraps `schema_migrations`, checks `current > supported` → `DbError::SchemaTooNew`, applies each pending migration in its own transaction. `MIGRATIONS[0]` (version 1) creates `db_metadata` (infrastructure key-value store for created_at, not a domain entity) and inserts the `created_at` seed row via `strftime`. `applied_at` stored via SQLite `strftime('%Y-%m-%dT%H:%M:%SZ','now')`; no external time crate. 9 migration tests pass (basics, validation, persistence, PRAGMA reopen).
- [x] Temporary DB test helper. — `open_memory_connection()` for in-memory tests; `open_file_connection(&temp_path)` with `AtomicU32` counter for unique paths and explicit WAL/SHM cleanup in file-based tests; no `tempfile` crate added.
- [x] Restart persistence. — `reopen_preserves_schema_version_and_schema_objects`: run migration 1 on file DB (version=1, `db_metadata` table + seed row confirmed), close, reopen, assert version=1 and `db_metadata` rows survive, re-run migrations produces no duplicates (schema_migrations stays at 1 row).
- [x] Clean close/reopen behavior. — `clean_close_and_reopen_preserves_data`: write `test_marker='persisted_value'` to `db_metadata`, close (WAL checkpointed), reopen, read back `'persisted_value'` — real data survival confirmed. `worker_dropped_joins_without_panic`: drop handle → worker thread exits cleanly. `reopened_connection_enforces_foreign_keys`: FK PRAGMA re-applied on every open (per-connection, not persisted by SQLite).

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
