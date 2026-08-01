# Testing Strategy

## Test pyramid

### TypeScript
- pure logic: Vitest;
- component behavior: React Testing Library;
- browser/layout-sensitive behavior: Vitest Browser Mode;
- accessibility automation: axe-core where suitable;
- geometry and filter/property fixtures.

### Rust
- domain unit tests;
- `cargo nextest`;
- property tests with `proptest`;
- temporary SQLite integration;
- migration matrix;
- backup/restore round trip;
- FTS/aggregate rebuild comparison;
- Criterion for pure critical algorithms.

### Desktop
- WebdriverIO with Tauri service;
- binary launch and persistence smoke;
- IPC behavior/log capture;
- native dialog boundaries where feasible;
- manual Windows verification for interactions unavailable to automation.

### Visual
- deterministic Windows/WebView2 baselines;
- current time/random IDs/caret/ambient motion frozen;
- normal and Reduced Motion;
- DPI/theme/state fixtures;
- no automatic golden acceptance.

## Test data

Use synthetic fixtures:
- empty;
- 1/20/200 tasks in a day;
- 1k/10k/100k where module-specific performance requires;
- deep/wide Life trees;
- recurring edge dates;
- Vietnamese Unicode;
- malformed import;
- large assets within limits.

## Critical properties

### Time
- start < end;
- valid 04:00–24:00;
- boundary touch accepted;
- ordinary overlap rejected;
- exact slot grouping deterministic;
- recurrence no duplicates.

### Tree
- root/path correctness;
- no cycle;
- reparent/reorder preservation;
- archive/restore subtree consistency.

### Scoring if activated
- bounded;
- deterministic;
- defined monotonic cases;
- anti-splitting/farming;
- long-task cap;
- version preservation.

### Backup
- consistent snapshot;
- checksum detection;
- no overwrite of open DB;
- restore rollback;
- derived data rebuild.

## Definition of Done

A feature requires:
- spec/acceptance update;
- typecheck/lint;
- relevant frontend/Rust tests;
- migration/round-trip if applicable;
- Tauri production build;
- source/no-network governance checks;
- screenshots if UI;
- accessibility checks;
- performance measurement if critical;
- independent review;
- Product Owner UX acceptance.
