# Slice 000 — Foundation Proof Specification

- Status: Active setup specification
- Milestone: M1 Foundation Proof
- Risk: High, because later data safety depends on it
- Product UI scope: deliberately minimal

## 1. Goal

Prove one complete, typed, durable, recoverable local data path on native Windows:

```text
React
→ typed frontend adapter
→ Tauri IPC
→ Rust application service
→ domain validation
→ SQLite transaction on dedicated worker
→ typed projection
→ React
→ app restart
→ backup
→ restore
```

This slice establishes infrastructure, not Task/Life product features.

## 2. Required user-observable scenario

1. Launch the application without account/network.
2. View a minimal Foundation screen.
3. Create one harmless setup entity through React.
4. Observe it immediately.
5. Close the application.
6. Reopen it.
7. Observe the entity still exists.
8. Create a backup package.
9. Change/archive the entity.
10. Restore the backup.
11. Observe the original snapshot returns.
12. Review a clear success/error state without personal-content logging.

## 3. Setup entity

Use a temporary `FoundationRecord` or equivalent that does not constrain Task/Life schema.

Minimum fields:
- stable UUIDv7 or approved stable ID;
- short plain-text label with strict length;
- created/updated UTC instants;
- revision integer;
- archived timestamp optional.

The table/migration may later be removed through a new migration after Foundation. It must not masquerade as Task/Card/LifeNode.

## 4. Frontend requirements

- minimal shell;
- centralized typed IPC adapter;
- TanStack Query only when introduced intentionally; no need to add it merely for one screen if direct typed state proves the path;
- explicit loading/error/empty/success states;
- optimistic update only with rollback/reconcile;
- keyboard-operable form;
- deterministic focus after create/error/restore;
- no design-system overbuild;
- no remote assets;
- no real personal content.

## 5. Rust requirements

Layering:
- domain value/entity;
- application command/query service;
- repository port/trait where valuable;
- SQLite repository implementation;
- thin Tauri handler;
- typed safe errors.

Validation:
- trim/normalize as specified by test;
- reject empty/overlong label;
- stale revision rejected on update;
- archive/restore behavior deterministic.

## 6. SQLite requirements

- `rusqlite` bundled;
- dedicated worker thread and bounded command queue;
- WAL;
- foreign keys;
- busy timeout;
- migration table/version;
- forward-only initial migration;
- transaction for mutation;
- temp DB integration tests;
- restart persistence.

Do not introduce ORM, FTS, analytics, Task, recurrence, or document JSON in this slice.

## 7. Typed IPC

- Rust DTOs generate TypeScript bindings through approved toolchain.
- Generated directory is committed or regenerated deterministically according to the plan.
- Components never call `invoke()` directly.
- Error union includes at least validation, not-found, stale-revision, storage, corruption/unsupported where applicable.
- Payload/result contain no raw SQL/path.

## 8. Backup/restore smoke

Backup:
- use SQLite Online Backup API;
- package or staging format includes manifest/version/checksum;
- no direct copy of open DB;
- progress channel or a minimal testable progress path;
- deterministic test destination.

Restore:
- inspect and verify;
- automatic pre-restore backup in production path or documented Foundation substitute;
- close DB;
- integrity/foreign-key checks;
- atomic replacement/staging;
- reopen;
- invalidate projection;
- failure leaves current data usable.

Assets are out of scope because FoundationRecord has no asset.

## 9. Diagnostics

- `tracing` spans for command/service/repository/backup;
- log operation type, duration, status, schema version;
- do not log record label or full path;
- route/app error boundary;
- typed user-safe error message.

## 10. Security/offline

- minimum Tauri capability;
- no shell/general filesystem permission;
- scoped backup file dialog/command only when activated;
- CSP no remote resource and no unsafe eval;
- test no disallowed production URL;
- no updater/telemetry/network dependency.

## 11. Out of scope

- final app visual design;
- sidebar destinations beyond placeholder shell;
- Task, Calendar, Analytics, Life, editor;
- recurrence;
- notification/reminder;
- search/FTS;
- score/prediction;
- Graph;
- signing/updater;
- public release.

## 12. Exit gate

Foundation passes only when all acceptance criteria and test plan evidence pass on native Windows and the Product Owner accepts the setup behavior.
