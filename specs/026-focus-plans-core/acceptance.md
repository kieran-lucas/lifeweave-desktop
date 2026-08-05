# Task 36 Acceptance Contract

Task 36 may close only when every mandatory item is satisfied.

## Product and scope

- standalone Focus Plan is implemented as its own authority;
- Today remains startup/default and Life Browse/Edit semantics are unchanged;
- no Task/series relation, review workflow, progress percentage, reminder,
  notification, AI generation, cloud, collaboration, score, or prediction;
- Task 37 remains not started.

## Persistence and safety

- schema is exactly 20 and migrations 1–19 are byte-unchanged;
- migration 19→20, reopen, idempotent startup, and failed-migration recovery pass;
- only active non-root Life nodes may be assigned;
- lifecycle/date/variant/phase/tag/revision/restore guards pass at DB and service;
- selected/last active variant protections pass;
- phase order survives archive/restore and restart;
- stale revisions are rejected with typed conflict;
- operation retry is idempotent;
- recovery draft survives conflict, restart, Plan archive, and backup/restore;
- full backup/restore preserves exact canonical semantics.

## Variants and phases

- 1–5 variants and exactly one selected active variant;
- 0–20 phases per variant with stable IDs and explicit ordering;
- rich-text body uses accepted canonical value schema without reader rows;
- immutable revision history retains the latest 50 revisions.

## Tags and Search

- global tag vocabulary and 20-tag assignment cap apply;
- archived/merged tags cannot be assigned at DB or service level;
- tag merge reassigns Plan joins and aliases remain searchable;
- `focus_plan` Search kind returns bounded, correct visible context;
- archived Plans are absent from ordinary Search;
- no N+1 SQL or IPC.

## Frontend and accessibility

- lazy Plans route and five lifecycle projections work;
- all Task 36 edit workflows retain input on validation/conflict errors;
- keyboard-only workflows are complete;
- semantic headings, landmarks, fieldsets/radio groups, ordered phases,
  announcements, focus restoration, non-drag controls, and Reduced Motion pass;
- narrow-width sequential layout passes;
- Today startup and prior feature tests remain green.

## Verification

- source/governance/index/verify gates pass;
- TypeScript typecheck and all frontend tests pass;
- Rust fmt, clippy `-D warnings`, check, and all tests pass;
- production frontend build and Tauri release build pass;
- official native runner passes all prior phases plus Task 36 create/edit,
  restart, and backup/restore phases;
- performance and bundle budgets pass;
- release executable, NSIS SHA-256, and RC run evidence are recorded;
- ten closure rounds pass with P0/P1 none;
- final Git topology is fast-forward, `HEAD == origin/main`, tree clean.
