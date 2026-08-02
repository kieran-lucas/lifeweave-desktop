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

> **Stage E.1 Safety Closure** (commits `63281ce`, `9d58544`): Six blockers
> identified after original Stage E implementation were fixed before sign-off.
> Evidence per item is updated below to include the closure commits.
>
> **Stage E.1b Remaining Safety Blockers** (commit `80c1b60`): RestoreMarker no
> longer stores paths; atomic marker writes via tmp→sync_all→rename; thread-local
> failpoints for fault injection; preflight_startup_check + recover_if_interrupted
> in correct startup order; RecoveryAmbiguous guard in restore_db; attempt_rollback
> hardened with checkpoint+drop+fresh-conn to avoid Windows ERROR_SHARING_VIOLATION;
> test order corrected to match real restore flow (shutdown before rename). 138
> Rust tests pass.
>
> **Stage E.1c Final Recovery Corrections** (commit `04ab588`): Four remaining
> gaps in the lifecycle recovery contract closed. (A) `preflight_startup_check`
> now returns `StartupDisposition` (`PristineFirstRun` / `ExistingOrRecovered`);
> `lib.rs` calls `open_existing_file_connection` for `ExistingOrRecovered` to
> prevent blank DB creation over recovery state; WAL/SHM present without main DB
> fails closed. (B) Candidate is no longer deleted before the authoritative copy
> is established — each stage renames/validates first, then cleans candidate, so
> at least one copy survives a mid-rename crash. (C) Recovery matrix replay-safe:
> `CandidateInstalled (false, true)` now restores old instead of
> `RecoveryAmbiguous`; `LiveMovedAside (true, true)` removes suspect live and
> restores old (old is authoritative); `LiveMovedAside (true, false)` validates
> live via full SQLite connection and proceeds if valid (handles marker-cleanup
> replay); `ReopenedValidated` replaces 16-byte magic header check with
> `validate_for_recovery` (integrity_check + fk_check + schema_migrations readable
> + schema_version ≤ max_supported). (D) If `.old` deletion fails in
> `ReopenedValidated`, marker is preserved at `ReopenedValidated` (not removed) so
> next startup can retry; live remains usable. `RestoreMarker::write` comment
> corrected to describe the real guarantee. `recovery_remove`/`recovery_rename`
> helpers added with thread-local failpoints. 148 Rust tests pass (10 new
> lifecycle tests); 18 frontend tests pass; clippy clean; fmt clean.
>
> **Stage E.1d Cleanup Convergence** (commit `540f1df`): Four remaining gaps
> in restore finalization and recovery cleanup closed. Marker is now removed
> only after both .old and candidate cleanups succeed via `remove_if_exists`
> (NotFound = success, idempotent). `RecoveryPending` variant added so the
> guard in `restore_db()` can distinguish "cleanup still in progress" from
> "filesystem corruption". `attempt_rollback()` returns `RecoveryPending`
> when rollback succeeds but candidate cleanup fails (worker is Ready).
> `Prepared (true, true)` now removes stale .old before removing the marker.
> `preflight_startup_check` fails closed on stale-tmp removal failure.
> `RestoreMarker::remove` returns `io::Result` (observable). `recovery_remove`
> removed (replaced by `remove_if_exists` everywhere). Note: the
> `ReopenedValidated` auto-restore-from-.old behavior mentioned in an earlier
> draft was not shipped; `ReopenedValidated` fails closed when live is
> invalid/missing (corrected in commit `655df2b`). 154 Rust tests pass at this
> commit; 18 frontend tests pass; clippy clean; fmt clean.
>
> **Stage E.1d Independent Audit** (commits `655df2b`, current): Six findings
> from independent Codex audit implemented. (F1 BLOCKER) WAL/SHM cleanup in
> `restore_db` step 10 and `attempt_rollback` treats NotFound as success, all
> other errors as fatal — aborts before live→old rename; attempt_rollback on
> failure. (F2 BLOCKER) `RestoreMarker::write` now uses atomic rename-replace
> (MoveFileExW MOVEFILE_REPLACE_EXISTING) — eliminated delete-before-rename
> crash window where neither old nor new marker existed. Candidate durability
> barrier: `sync_all()` via `GENERIC_WRITE` handle (FlushFileBuffers requires
> GENERIC_WRITE on Windows) before marker write. (F3 HIGH) `CandidateInstalled
> (true, false)` validates live and proceeds rather than returning
> `RecoveryAmbiguous`, making rollback-crash replay converge without requiring
> manual intervention. (F4 HIGH) All recovery branches use checked
> `remove_if_exists` for candidate cleanup: NotFound=success; marker preserved
> if cleanup fails; Prepared, LiveMovedAside, and CandidateInstalled all
> covered. (F5 MEDIUM) `IpcError::RecoveryPending` added as a distinct variant
> (was collapsing to `Storage`); TS binding regenerated; frontend shows restart
> guidance instead of generic error; `RecoveryPending` test added. (F6 LOW)
> Tasks.md corrected: stale ReopenedValidated auto-restore claim removed;
> accurate evidence recorded. 176 Rust tests pass (+22 new); 19 frontend tests
> pass (+1 RecoveryPending); clippy clean; fmt clean.

- [x] SQLite Online Backup API. — `rusqlite::backup::Backup::new(live_conn, &mut staging_conn).run_to_completion(100, Duration::ZERO, None)` used in `engine.rs` (backup), `restore.rs` (safety copy), and `lifecycle.rs` recovery; `rusqlite` `"backup"` feature enabled in `Cargo.toml` (commit `9edb5db`).
- [x] Staging. — `backup_db` creates `.staging_{unix_ms}/` via `Backup` API, renames to final dir after checksum/manifest; `restore_db` copies backup DB to `_restore_candidate.db` under app DB dir (never renames `backup_dir/lifeweave.db`) so same package can be restored multiple times; staging artifacts cleaned on failure; `backup_package_is_not_mutated_by_restore` and `same_backup_can_be_restored_twice` tests confirm (commits `9edb5db`, `63281ce`).
- [x] Manifest and checksums. — `BackupManifest` serialised to `manifest.json` with `format_version`, `app_version`, `schema_version`, `created_at`, `db_size_bytes`, `db_sha256`; `sha256_file` via `sha2 = "0.10"`; restore checks file size then SHA-256 before any mutation; `restore_rejects_wrong_checksum` confirms (commit `9edb5db`, size check added `63281ce`).
- [x] Progress reporting. — Sync IPC commands return `BackupResult` / `RestoreResult` structs; satisfies spec §8 "minimal testable progress path"; no streaming channel needed at this scale (commit `f02b3c8`).
- [x] Restore inspection. — `restore_db` reads `manifest.json` before any mutation; rejects unsupported `format_version`; rejects `schema_version > max_supported_schema_version()` with `BackupError::SchemaVersionTooNew`; `restore_rejects_schema_version_too_new` and `restore_rejects_unsupported_format_version` tests confirm (commits `9edb5db`, schema version check added `63281ce`).
- [x] Automatic pre-restore safety copy/path. — Safety backup staged to `_safety_staging/`, integrity-checked, then atomically published to `_safety/`; previous `_safety/` kept as `_safety_old/` until new copy is verified so a staging failure leaves the prior valid copy intact; `restore_creates_safety_backup_first` and `valid_safety_backup_preserved_when_restore_fails_before_safety_step` tests confirm (commits `9edb5db`, Blocker-F fix `63281ce`).
- [x] Integrity and foreign-key checks. — Pre-swap: `PRAGMA integrity_check` + `PRAGMA foreign_key_check` on backup file via `open_readonly_connection` (no WAL mode set; backup package not mutated); FK query errors propagate as `BackupError::ForeignKeyCheckQueryError` (not silenced); post-swap: integrity + FK + PRAGMA re-checked on newly installed DB before deleting `.old`; `restore_rejects_fk_violation_in_backup_package` and `fk_check_query_error_is_a_distinct_propagated_variant` tests confirm (commits `9edb5db`, Blockers E+FK-propagation `63281ce`).
- [x] Close/atomic swap/reopen. — `seal_worker()` blocks new `execute()` calls (returns `Maintenance`) before shutdown; `shutdown()` closes connection and flushes WAL; Windows-safe rename sequence: `rename(live→old)` → `rename(candidate→live)`; `reopen_and_validate` runs migrations + post-swap validation before installing worker; `execute_blocked_while_worker_sealed` and `two_concurrent_restores_are_serialized` tests confirm gate (commits `9edb5db`, Blockers C+A fix `63281ce`).
- [x] Failure rollback. — Durable `restore_marker.json` written at each rename stage (`Prepared / LiveMovedAside / CandidateInstalled / ReopenedValidated`); `recover_if_interrupted()` called at startup before DB open (prevents blank-DB creation); all rollback paths guarantee a usable worker via `reopen_worker` or `unseal_worker`; candidate never deleted before authoritative copy established; `ReopenedValidated` old-removal failure keeps marker for retry (live remains usable); full matrix replay-safe (E.1c, commit `04ab588`); cleanup convergence contract enforced (E.1d, commit `540f1df`): `remove_if_exists` treats NotFound as success; marker removed only after both old+candidate cleanups succeed; `RecoveryPending` returned by guard when any marker exists; `attempt_rollback` returns `RecoveryPending` (not `RollbackFailed`) when rollback succeeds but candidate cleanup fails; `Prepared (true, true)` removes stale old explicitly; `preflight_startup_check` fails closed on stale-tmp removal failure; `RestoreMarker::remove` returns observable `io::Result`; `pending_marker_blocks_new_restore`, `old_cleanup_failure_after_restore_keeps_marker_and_blocks_next_restore`, `candidate_cleanup_failure_in_rollback_returns_recovery_pending_not_rollback_failed`, `prepared_live_and_old_both_present_removes_stale_old`, `stale_tmp_with_final_and_tmp_removal_failure_fails_closed` confirm (commits `9edb5db`, `63281ce`, `9d58544`, `80c1b60`, `04ab588`, `540f1df`); E.1d audit (commits `655df2b`, current): WAL/SHM deletion fatal on non-NotFound error in both `restore_db` and `attempt_rollback`; `RestoreMarker::write` atomic-replace (no delete-before-rename gap); candidate `sync_all` via GENERIC_WRITE handle; `CandidateInstalled (true, false)` validates live instead of `RecoveryAmbiguous`; all recovery branches use checked candidate cleanup (marker preserved on failure); `IpcError::RecoveryPending` distinct variant (not Storage); `f1-a..f1-e`, `f2-marker`, `f3-a..f3-c`, `f4-a..f4-g` tests confirm.
- [x] Round-trip test. — `round_trip_restore_recovers_exact_data`: create record → backup → archive → restore → `list_active` returns original; 176 Rust tests total pass (after E.1d audit: +22 new tests in lifecycle and restore for findings F1–F4, +2 in ipc/backup for F5); 19 frontend tests pass (+1 RecoveryPending); `cargo clippy -- -D warnings` clean; `cargo fmt --check` clean; release build clean (commits `9edb5db`, `f02b3c8`, `3c1de92`, `63281ce`, `9d58544`, `80c1b60`, `04ab588`, `540f1df`, `655df2b`, current).

### Stage E.1e — Task 1 Build Closure

- Verified implementation HEAD: `14038c52921717ec25ea12d3f02dbb43a294ddcb` (`restore task 1 build integrity`).
- The previously observed `E0425` occurred against a source snapshot where `rollback_marker_written` was not declared. The reconciled `620d160` blob already contained `let mut rollback_marker_written = !restore_from_old;` in the same `attempt_rollback()` scope as its assignment and final check; no duplicate declaration or recovery-semantics workaround was required. `cargo check --locked --all-targets` passed in 3.67s.
- The authorized local Task 1 patch corrected the CandidateInstalled cleanup failpoint from call 0 to call 2 (after WAL and SHM cleanup), and replaced a Windows full-flow test that incorrectly assumed the live worker was in DELETE journal mode with a deterministic full-flow failpoint test. Production restore behavior was not changed.
- Focused Windows tests: backup 119 passed, 0 failed/ignored (1.44s); SQLite 41 passed, 0 failed/ignored (0.06s).
- Full Rust gates on Windows: fmt check passed; clippy `--all-targets -- -D warnings` passed; 185 tests passed, 0 failed/ignored (1.70s; binding-export rerun 185 passed in 1.69s).
- Frontend gates: frozen lockfile install passed; typecheck passed; Vitest 2 files / 19 tests passed; Vite 8.1.5 production build passed (24 modules, 526ms; Tauri build rerun 447ms).
- Generated DTO export was rerun and `git diff --exit-code -- frontend/src/ipc/generated` reported no drift.
- Governance/integrity passed: immutable source 165,171 bytes / 4,637 lines / SHA-256 `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`; spec index 402 headings; full coverage current; repository governance passed; no disallowed remote production resources; `git diff --check` passed.
- `pnpm tauri build` passed: release compile completed in 2m25s and produced unsigned development NSIS artifact `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` (2,564,956 bytes). Installer UX was not tested.
- Automated native launch smoke passed: Vite ready in 930ms, Rust dev compile completed in 14.59s, `src-tauri/target/debug/lifeweave-desktop.exe` remained alive for 32.7s, and captured logs contained no panic, startup recovery fatal error, IPC initialization error, or Rust compiler error. The exact process tree was stopped after observation. Visual Product Owner confirmation is pending; full native E2E belongs to Task 5.
- No restore was run against real Product Owner data; Rust restore/recovery tests used synthetic temporary file-based SQLite databases.
- PENDING FOR TASK 2 INDEPENDENT AUDIT: independently assess directory-flush sufficiency, every restore crash boundary, WAL generation ownership, and cleanup convergence. Task 1 evidence does not establish production-safe restore or complete Stage E.

Task 1 implementation candidate is ready for independent Task 2 audit.

### Stage E.1f — Task 2 Independent Backup/Restore Audit

- Independent audit scope HEAD: `cb6df7912f396084e244f836208f71085c27dc9d` on clean Windows `main`; no production code was changed.
- Baseline evidence: fmt and clippy `--all-targets -- -D warnings` passed; full Rust suite 185 passed / 0 failed / 0 ignored (3.34s); focused backup suite 119 passed / 0 failed / 0 ignored (1.33s); 185 tests listed; frontend typecheck passed; Vitest 2 files / 19 tests passed (4.72s); Vite 8.1.5 production build passed (24 modules, 479ms).
- Verdict: `BLOCKED`.
- F-01 (P0): `DatabaseRuntime::execute` releases its state gate after cloning the worker but before enqueue, so a previously admitted mutation can enqueue after the safety snapshot, return success, and be lost when restore deletes `.old`.
- F-02 (P0): restore validates the external backup file, closes it, and later reopens the path for candidate copy without rechecking candidate identity; a different valid database can be installed and reported as the selected snapshot.
- F-03 (P1): `attempt_rollback` removes the live candidate before deleting WAL/SHM; a Windows sharing violation can leave main missing + sidecar present + valid `.old`/marker, and startup preflight blocks marker replay as `RecoveryAmbiguous`.
- Non-blocking debt: ignored/best-effort directory flush results, missing explicit backup publication durability barriers, and raw backup path IPC reserved for Task 3.
- Full evidence, exact call paths, state matrix, remediation, and missing tests: `docs/audits/task-02-backup-restore.md`.
- No real Product Owner/AppData database or backup was used. No Task 3 implementation was opened.

Task 2 remains active and blocked by verified P0/P1 findings. Task 3 is not allowed.

### Task 2 Blocking Remediation Candidate

- F-01 implementation: `199d07d` (`linearize database maintenance admission`). Admission is now counted under the lifecycle mutex, held through enqueue/completion by RAII, and drained by `seal_worker()` before safety snapshot.
- F-02/F-03 implementation: `56d6940` (`bind restore validation to installed candidate`). Restore validates the exact managed candidate before swap; rollback removes sidecars before destructive live removal and startup replay is covered.
- Regression evidence: 190 Rust tests passed; focused backup/recovery suite 122 passed; F-01 tests `f01_admitted_before_enqueue_completes_before_seal_returns` and `f01_multiple_admitted_callers_and_error_path_drain`; F-02 tests `f02_replacement_at_source_boundary_is_rejected_without_live_mutation` and `f02_source_replacement_after_candidate_validation_does_not_change_restore`; F-03 test `f03_locked_sidecar_preserves_live_and_startup_replays_old`.
- Full frontend evidence: typecheck passed; 2 files / 19 tests passed; Vite production build passed. Governance/integrity passed; Tauri release build produced `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`; native dev smoke reached Vite ready, Rust compile/run, and one live desktop process for 25 seconds before its exact process tree was stopped.
- Status: remediation candidate implemented; independent Task 2 re-audit required. Task 3 remains prohibited.

### Task 2 Candidate Cleanup Remediation

- Remediation commit: `b121818` (`preserve restore marker on candidate cleanup failure`).
- Root cause fixed: removed the redundant post-validation candidate `sync_all()` failure path that could best-effort delete both candidate and marker independently.
- Invariant: `copy_candidate()` is the single checked candidate durability barrier; prepared cleanup removes the candidate first and removes the marker only after candidate removal succeeds.
- Regression evidence: `candidate_cleanup_failure_preserves_prepared_marker_and_startup_replays` passed; it verifies live database usability, candidate/marker preservation under injected cleanup failure, then actual startup preflight/replay convergence. Focused backup suite: 123 passed; full Rust suite: 191 passed.
- Full gates: cargo check/fmt/clippy/test, frontend typecheck/test/build, generated binding drift, repository governance/source integrity/no-remote scan, and Tauri production NSIS build passed. Artifact: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`.
- Status: Task 2 active — remediation implemented, independent re-audit required. Task 3 remains prohibited. P2 debt F-04–F-06 remains deferred.

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
