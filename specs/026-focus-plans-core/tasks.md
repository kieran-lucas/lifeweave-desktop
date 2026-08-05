# Task 36 Work Breakdown

## 36.0 Activation

- [x] Product Owner approval received.
- [x] Slice 026 created from exact baseline.
- [ ] Project State and authority files mark Task 36 active.
- [ ] Task 37 hard-exclusion scan passes.

## 36.1 Schema and domain

- [ ] Append migration 20; never edit migrations 1–19.
- [ ] Create `focus_plans`, `focus_plan_variants`, `focus_plan_phases`,
  `focus_plan_revisions`, `focus_plan_drafts`,
  `focus_plan_save_operations`, and `focus_plan_tags`.
- [ ] Add indexes and DB triggers for lifecycle, date order, active non-root Life
  target, selected active variant, variant/phase caps, tag validity, revision
  monotonicity, restore preconditions, and Search dirty scopes.
- [ ] Add migration/reopen/failure-atomicity/direct-SQL tests.
- [ ] Add Focus Plan domain models, canonical snapshot, repository, and service.
- [ ] Add lifecycle, archive/restore, variant, phase, revision, draft, and
  idempotency tests.

## 36.2 IPC

- [ ] Define typed portfolio/detail/input/result/error DTOs.
- [ ] Add bounded list/get/create/save/archive/restore commands.
- [ ] Add mutation actions for variants/phases/recovery without Task 37 fields.
- [ ] Register commands and regenerate frontend bindings.
- [ ] Add command-level validation/conflict/idempotency tests.

## 36.3 Tags, Search, backup

- [ ] Extend tag assignment, archive, merge, and alias semantics to Plans.
- [ ] Add one bounded Search projection and `focus_plan` entity kind.
- [ ] Exclude archived Plans from ordinary Search.
- [ ] Add 1,000-Plan Search fixture and query-count assertions.
- [ ] Add exact backup/reopen/restore tests for all Plan-owned state.

## 36.4 Frontend

- [ ] Add lazy Plans destination; Today remains default.
- [ ] Add lifecycle portfolio tabs and exact Plan selection.
- [ ] Add create/edit/archive/restore flow.
- [ ] Add overview, dates, Life context, outcome, criteria, tags.
- [ ] Add variants, rich-text body reuse, phases, and explicit move controls.
- [ ] Add recovery/conflict UI with input retention.
- [ ] Add keyboard, screen-reader, focus, narrow-width, and Reduced Motion tests.
- [ ] Prove no automatic progress percentage.

## 36.5 Native and release

- [ ] Native create/edit/variant/phase/lifecycle/archive/restore E2E.
- [ ] Fresh-process restart E2E.
- [ ] Backup/restore E2E.
- [ ] Prior native phases remain green.
- [ ] Performance and bundle budgets pass.
- [ ] Release executable, NSIS, and RC evidence recorded.

## 36.6 Closure

- [ ] Ten review rounds completed with findings/corrections/results.
- [ ] P0/P1 none.
- [ ] Project State closes Task 36/Slice 026 at schema 20.
- [ ] Task 37 remains not started.
- [ ] `HEAD == origin/main`; tree clean.
