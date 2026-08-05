# Task 36 Implementation Plan

## Baseline

```text
activation baseline: fd3f0e8808f28aae7c4bbca992cedcbd94db6c5d
schema baseline: 19
latest product checkpoint: 4d1b65c816312a9e6ae8aa39f4a565555af9feb9
Task 37: prohibited
```

## Phase 0 — Activation and contract lock

- activate Slice 026 and Project State;
- freeze schema, lifecycle, cardinalities, exclusions, and budgets;
- record issue and exact baseline;
- verify no Task 37 field/table/route is introduced.

Gate: governance/source/index checks; clean fast-forward main.

## Phase 1 — Migration 20 and Rust domain authority

- append migration 20 only;
- add Plan domain types, validation, canonical snapshot, repository, service;
- enforce lifecycle/date/Life/variant/phase/tag/revision invariants at DB and
  service layers;
- implement archive/restore, revision retention, recovery draft, and idempotent
  operation semantics;
- add migration 19→20, reopen, failure atomicity, and direct-SQL guard tests.

Gate: Rust format, clippy, all tests; schema exactly 20.

## Phase 2 — Typed IPC and generated frontend contract

- add bounded commands for portfolio/detail/create/save/archive/restore;
- expose variant/phase and recovery operations through one mutation envelope;
- map typed conflicts and validation errors without leaking content;
- regenerate DTOs and update command registry/permissions only as required.

Gate: generation clean; typecheck; Rust tests; no hand-edited generated drift.

## Phase 3 — Tags, Search, and backup authority

- add `focus_plan_tags` to global tag assignment/merge guards;
- add Search dirty triggers and one bounded Focus Plan rebuild projection;
- preserve tag aliases and exclude archived Plans from ordinary Search;
- verify full backup/reopen/restore exact semantics.

Gate: tag merge/archive tests, Search rebuild/query tests, backup round-trip,
no N+1 query/IPC.

## Phase 4 — Lazy accessible Plans frontend

- add lazy Plans destination while Today remains initial route;
- build lifecycle portfolio tabs and exact Plan opening;
- build create/edit/detail workflows for all Task 36 fields;
- reuse accepted rich-text value/editor components without creating reader rows;
- add keyboard, focus, announcement, error-retention, narrow-width, and Reduced
  Motion behavior.

Gate: typecheck, frontend tests, build, accessibility contract tests, bundle
budgets.

## Phase 5 — Native persistence evidence

- add native E2E for create/edit, variants, phases, lifecycle, archive/restore;
- verify fresh-process restart;
- verify backup/restore with exact semantic comparison;
- verify Today startup remains unchanged.

Gate: official Windows runner passes all prior phases plus Task 36 phase(s).

## Phase 6 — Performance and release evidence

- run 1,000-Plan fixture measurements;
- prove bounded portfolio/detail/Search queries and no N+1;
- run full frontend/Rust/governance/build/release gates;
- record executable, NSIS, bundle, and RC evidence.

Gate: every budget in `performance-budget.md` passes or is explicitly blocked.

## Phase 7 — Ten-round closure review

Review independently:

1. scope and Git topology;
2. migration/data safety;
3. domain lifecycle and invariants;
4. revisions/idempotency/recovery;
5. tags/Search/backup;
6. IPC/generated contract;
7. accessibility/navigation;
8. performance/bundle/startup;
9. regression/release/governance truth;
10. closure authority and Task 37 prohibition.

Any finding triggers an additive correction and rerun of affected gates. Close
only with 10/10 PASS, P0/P1 none, clean `HEAD == origin/main`, and Task 37 not
started.
