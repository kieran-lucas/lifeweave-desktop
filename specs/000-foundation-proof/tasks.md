# Slice 000 — Task Checklist

## Governance and bootstrap
- [ ] Run source integrity checks.
- [ ] Run Windows doctor.
- [ ] Generate `pnpm-lock.yaml`.
- [ ] Generate `src-tauri/Cargo.lock`.
- [ ] Record tool versions.
- [ ] Confirm TypeScript 6 compatibility behavior.
- [ ] Frontend typecheck/test/build.
- [ ] Rust fmt/clippy/test.
- [ ] Tauri development launch.
- [ ] Tauri production NSIS build smoke.
- [ ] Remove `.setup-phase` only after reviewed CI.

## Architecture
- [ ] Create Rust domain/application/infrastructure/ipc boundaries.
- [ ] Create centralized frontend IPC adapters.
- [ ] Add typed error union.
- [ ] Add operation ID/revision conventions.
- [ ] Add DTO generation/check.
- [ ] Add tracing initialization.

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
