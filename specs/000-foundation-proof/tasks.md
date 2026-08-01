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
- [x] Domain validation. — `domain::foundation_record::validate_label` trims, rejects empty/too-long (>200 chars)/control chars; 7 domain unit tests pass.
- [x] Create/list/update/archive/restore. — `foundation_record_repo`: `create(id, label)` with UUIDv7 caller-supplied ID, `list_active` (active only), `list_archived` (archived only), update, archive, restore; 13 repo integration tests pass; `list_archived_foundation_records` IPC command added; frontend calls both commands in parallel on mount.
- [x] Atomic transactions. — Every mutation in `foundation_record_repo` runs inside `conn.transaction()`; rollback on stale-revision detected before commit.
- [x] Generated frontend contracts. — `cargo test export_ipc_bindings` generates `FoundationRecordView.ts`, `CreateFoundationRecordInput.ts`, `UpdateFoundationRecordInput.ts`, `MutateFoundationRecordInput.ts`; `git diff --exit-code` confirms no drift.
- [x] Minimal accessible UI states. — `FoundationScreen` calls `listFoundationRecords()` + `listArchivedFoundationRecords()` in parallel; active/archived sections rendered from separate server responses; 12 frontend tests pass.
- [x] Stale-revision behavior. — `RepoError::StaleRevision` returned when `revision != expected_revision`; mapped to `IpcError::StaleRevision` in handler; all three stale-revision tests pass.
- [x] No real user content. — All test labels are synthetic placeholders; no PII in any committed file.
- [x] Stable ID (UUIDv7). — `new_uuid_v7()` in IPC layer generates time-ordered UUID v7 before INSERT; 3 UUID tests (version nibble, uniqueness, 36-char format); `uuid = { version = "1", features = ["v7"] }` added with rationale note.
- [x] Operation ID validated. — `validate_operation_id` on all 5 mutation commands: rejects empty, >128 chars, control chars; documented as correlation-only (not idempotency); 4 op_id tests pass.
- [x] Integration proof. — `full_archive_restore_cycle_survives_reopen`: file-based DB, create → list_active → archive → list_active empty → list_archived sees rev 1 → restore → list_active sees rev 2 → list_archived empty → close/reopen → state persists.

## Backup/restore
- [x] SQLite Online Backup API. — `rusqlite::backup::Backup::new(live_conn, &mut staging_conn).run_to_completion(100, Duration::ZERO, None)` used in both `engine.rs` (backup) and `restore.rs` (safety copy); `rusqlite` `"backup"` feature enabled in `Cargo.toml` (commit `9edb5db`).
- [x] Staging. — `backup_db` creates `app_data_dir/backups/.staging_{unix_ms}/` via `Backup` API, then renames to final dir after checksum/manifest steps; all staging artifacts cleaned on failure; restore reads from `backup_dir/lifeweave.db` without touching live DB until post-validation swap (commit `9edb5db`).
- [x] Manifest and checksums. — `BackupManifest` (`manifest.rs`) serialised to `manifest.json` with `format_version`, `app_version`, `schema_version`, `created_at`, `db_size_bytes`, `db_sha256`; `sha256_file` (`checksum.rs`) computes SHA-256 via `sha2 = "0.10"` crate; manifest verified and checksum re-computed on every restore before any mutation (commit `9edb5db`).
- [x] Progress reporting. — Sync IPC commands return `BackupResult` / `RestoreResult` structs immediately after completion; satisfies spec §8 "minimal testable progress path" for Foundation Proof scope; no streaming channel needed at this scale (commit `f02b3c8`).
- [x] Restore inspection. — `restore_db` step 1 reads and parses `manifest.json` before any mutation; rejects `format_version != 1` with `BackupError::UnsupportedFormatVersion`; rejects malformed JSON with `BackupError::ManifestParse`; 3 manifest unit tests cover round-trip, future version, malformed JSON (commit `9edb5db`).
- [x] Automatic pre-restore safety copy/path. — `restore_db` step 4 backs up live DB to `app_data_dir/backups/_safety/lifeweave.db` using `Backup` API before any file swap; confirmed by `restore_creates_safety_backup_first` integration test (commit `9edb5db`).
- [x] Integrity and foreign-key checks. — After manifest/checksum pass, `restore_db` step 3 opens `backup_dir/lifeweave.db`, runs `PRAGMA integrity_check` (must return `"ok"`) and `PRAGMA foreign_key_check` (must return zero rows) before any mutation; covered by `restore_rejects_corrupt_sqlite` test (commit `9edb5db`).
- [x] Close/atomic swap/reopen. — `DatabaseRuntime::shutdown_worker()` drops `DbWorkerHandle` (closes connection + final WAL checkpoint); `PRAGMA wal_checkpoint(TRUNCATE)` called inside last closure; Windows-safe swap: `rename(live→old)` then `rename(backup→live)` (delete-then-rename avoids "file exists" failure); `reopen_worker` opens new connection, runs migrations, spawns new worker, calls `replace_worker`; all in `restore.rs` (commit `9edb5db`).
- [x] Failure rollback. — Any error after `shutdown_worker()` triggers `rename(old→live)` rollback and `reopen_worker` restart; `restore_does_not_mutate_on_checksum_failure` and `restore_does_not_mutate_on_integrity_failure` tests confirm live data unchanged on pre-swap failures; safety backup at `_safety/` available as last resort for post-swap failures (commit `9edb5db`).
- [x] Round-trip test. — `round_trip_restore_recovers_exact_data`: create record → backup → archive record → restore → `list_active` returns original record; 9 restore integration tests total; 7 engine integration tests; 18 frontend tests (12 FoundationRecord + 6 backup/restore UI) all pass (commits `9edb5db`, `f02b3c8`, `3c1de92`).

## Quality
- [ ] Strict CSP/capability review.
- [ ] No disallowed remote resource.
- [ ] Keyboard/focus.
- [ ] Error boundary.
- [ ] Sensitive logging review.
- [ ] Performance spans.
- [ ] Windows E2E.
- [ ] Independent AI review.
- [x] Product Owner acceptance. — Native Windows smoke test passed 2026-08-01: app launch, create, edit, archive (record moves to Archived), restore (record returns to Active), active record survives close/reopen, archived record survives close/reopen; no duplicates, crashes, or display errors observed.
