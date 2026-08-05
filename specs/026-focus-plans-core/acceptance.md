# Task 36 Acceptance

Task 36 closes only when these five risk groups are satisfied.

## 1. Migration and persistence

- schema 19 upgrades to 20 without modifying migrations 1–19;
- reopening an upgraded database is idempotent;
- Focus Plan data survives application restart.

## 2. Focus Plan core

- create, read, update, lifecycle, archive, and restore work;
- stale revision is rejected without losing form or recovery-draft input;
- repeated `operation_id` is idempotent;
- variant and phase limits, selected/last-active guards, and ordering hold.

## 3. Backup and restore

- full backup/restore preserves Plan, variants, phases, tags, revisions, and
  recovery draft;
- Search/FTS remains valid after restore.

## 4. Tags and Search

- active tags can be assigned within the 20-tag cap;
- archived/merged tags are rejected and merge reassigns Plan joins;
- ordinary Search returns active Focus Plans and excludes archived Plans;
- selecting a Plan result opens that exact Plan.

## 5. User path

- one focused frontend test covers create/edit and input retention after a
  rejected save;
- one native scenario covers create → edit → fresh process → persisted data;
- Today remains startup/default and all Task 37 features remain absent.

## Final repository condition

- TypeScript contract for the Focus Plans screen passes;
- the relevant Rust migration/core/backup/tag/Search tests pass;
- one final regression is run after implementation stabilizes;
- no Task 36 patch script, temporary workflow, compiler artifact, placeholder,
  dependency drift, or duplicated planning document remains;
- `main` is fast-forward and Project State is internally consistent.

Release packaging, NSIS hashing, broad performance simulation, repeated full
suites, and duplicated multi-round test ceremonies are not Task 36 closure
requirements unless a concrete defect makes one of them necessary.
