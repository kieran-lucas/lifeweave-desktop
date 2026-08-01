# Slice 000 — Acceptance Criteria

## Source/governance
- [ ] Immutable source checksum matches.
- [ ] Generated source index and coverage are current.
- [ ] No OPEN/DEFERRED product behavior is introduced.
- [ ] No original source file is edited.
- [ ] Lockfiles are committed and reviewed.

## Build
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `cargo fmt --check` passes.
- [ ] `cargo clippy -- -D warnings` passes.
- [ ] Rust tests pass.
- [ ] Tauri Windows production build passes.

## Architecture
- [ ] React contains no SQL/domain persistence.
- [ ] IPC handler is thin.
- [ ] Rust service validates before repository mutation.
- [ ] Components do not call raw Tauri invoke.
- [ ] Generated bindings are deterministic/current.
- [ ] Zustand does not mirror persistent data.

## Persistence
- [ ] Create record through UI.
- [ ] Record appears after authoritative response/reconcile.
- [ ] Close app.
- [ ] Reopen app.
- [ ] Record persists.
- [ ] Stale update is rejected safely.
- [ ] Archive/restore preserves history.

## Database
- [ ] SQLite bundled.
- [ ] Dedicated DB worker.
- [ ] WAL, foreign keys, busy timeout verified.
- [ ] Migration is forward-only.
- [ ] Migration/reopen integration tests pass.
- [ ] No direct copy of open database.

## Backup/restore
- [ ] Backup snapshot has manifest/checksum.
- [ ] Restore validates before mutation.
- [ ] Integrity and foreign-key checks run.
- [ ] Database closes before replacement.
- [ ] Successful restore returns original snapshot.
- [ ] Failed restore leaves current data usable.
- [ ] Backup/restore logs no record content.

## Security/offline
- [ ] Minimum Tauri capability.
- [ ] CSP contains no remote script/font/image.
- [ ] No shell/general filesystem permission.
- [ ] No updater, telemetry, notification, reminder, or sound.
- [ ] No disallowed production URL references.
- [ ] App core scenario works with network disconnected.

## UX/accessibility
- [ ] Form and actions are keyboard operable.
- [ ] Labels/errors are programmatically associated.
- [ ] Focus moves/restores predictably.
- [ ] No information depends only on color.
- [ ] Reduced Motion baseline does not remove information.
- [ ] Product Owner accepts behavior.

## Evidence
- [ ] Exact commands/results attached to PR.
- [ ] Desktop persistence recording or screenshots attached.
- [ ] Independent reviewer report attached.
- [ ] Remaining risks explicitly listed.
