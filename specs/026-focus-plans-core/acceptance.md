# Task 36 Acceptance

Task 36 closes when the five product-risk groups below have deterministic evidence. A specific test runner is not itself a product requirement.

## 1. Migration and persistence

- schema 19 upgrades to 20 without modifying migrations 1–19;
- reopening an upgraded database is idempotent;
- committed Focus Plan state is recoverable from the reopened SQLite authority.

Persistence may be demonstrated by repository/database reopen tests, backup/restore round trips, or inspected database artifacts. A native UI restart smoke test is useful but is not an absolute closure gate when its harness is flaky or nondiagnostic.

## 2. Focus Plan core

- create, read, update, lifecycle, archive, and restore work;
- stale revision is rejected without losing form or recovery-draft input;
- repeated `operation_id` is idempotent;
- variant and phase limits, selected/last-active guards, and ordering hold.

## 3. Backup and restore

- full backup/restore preserves Plan, variants, phases, tags, revisions, and recovery draft;
- Search/FTS remains valid after restore.

## 4. Tags and Search

- active tags can be assigned within the 20-tag cap;
- archived/merged tags are rejected and merge reassigns Plan joins;
- ordinary Search returns active Focus Plans and excludes archived Plans;
- selecting a Plan result opens that exact Plan.

## 5. User path

- focused frontend coverage verifies create/edit and input retention after a rejected save;
- Today remains startup/default;
- all Task 37 features remain absent.

Native create/edit/restart coverage is a non-blocking smoke test unless it exposes a reproducible product defect. Driver, process, timing, or workflow failures are tooling defects and do not invalidate deterministic product evidence.

## Final repository condition

- TypeScript contract for the Focus Plans screen passes;
- relevant Rust migration/core/backup/tag/Search tests pass;
- generated bindings and production frontend build remain valid;
- no Task 36 patch script, temporary workflow, compiler artifact, placeholder, dependency drift, or duplicated planning document remains;
- `main` and Project State are internally consistent;
- no confirmed P0/P1 product defect remains.

Do not repeat a failing E2E command without new diagnostic evidence. After two nondiagnostic attempts, record it as optional tooling debt and close the task using the smallest deterministic evidence that covers the underlying risk.

Release packaging, NSIS hashing, broad performance simulation, repeated full suites, and duplicated multi-round test ceremonies are not Task 36 closure requirements unless a concrete product defect makes one necessary.
