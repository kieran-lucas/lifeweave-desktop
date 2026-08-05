# Task 36 Activation Packet — Standalone Focus Plan Core

## Recommended title

**Task 36 — Focus Plans Core + Draft/Active Lifecycle**

## Product outcome

Users can create and manage medium-term strategies without creating temporary
Life nodes or oversized Tasks.

## Minimum production slice

### Persistence — proposed migration 20

```text
focus_plans
focus_plan_variants
focus_plan_phases
focus_plan_revisions
focus_plan_drafts
focus_plan_save_operations
focus_plan_tags
```

No `focus_plan_id` is added to Tasks or recurring series in Task 36.

### `focus_plans`

Required fields:

```text
id
life_node_id NULLABLE
selected_variant_id
title
lifecycle
start_date NULLABLE
target_date NULLABLE
outcome
success_criteria_json
revision
created_at
updated_at
archived_at
```

DB triggers/constraints must enforce valid lifecycle, date order, non-root
active Life target, selected active variant, optimistic revision monotonicity,
and restore preconditions.

### Variants and phases

- 1–5 variants;
- exactly one selected active variant;
- 0–20 phases/variant;
- explicit ordering;
- archive/restore;
- variant body uses accepted Basic Leaf canonical rich-text JSON value schema;
- no `reader_documents` row.

### Revisions and recovery

- immutable bounded revisions;
- one distinct recovery draft;
- expected revision conflict handling;
- idempotent save operation;
- restart and backup/restore evidence.

### Tags and Search

- existing global tag vocabulary;
- Plan assignment cap consistent with current tag policy;
- `focus_plan` Search entity kind;
- tag aliases searchable;
- no N+1 projection.

### Frontend

- lazy Plans destination;
- Today remains startup/default;
- portfolio tabs: Active, Drafts, Paused, Completed, Archived;
- create/edit/archive/restore;
- overview, variants, phases, outcome, criteria, dates, Life area, tags;
- keyboard-complete portfolio and detail navigation;
- screen-reader landmarks, fieldsets, ordered phase semantics, announcements,
  focus restoration, error retention;
- Reduced Motion support;
- no progress percentage.

### Backup and native evidence

- backup/reopen/migration fixtures;
- Search and tags lifecycle;
- fresh-process persistence;
- native E2E for create, edit, variant/phase changes, lifecycle, archive/restore,
  restart, and backup/restore;
- release/performance evidence.

## Explicit exclusions

```text
Task or recurring-series links
weekly review entries
automatic progress
reminders / notifications / sound / snooze
AI-generated plans
cloud / collaboration
many-to-many Life links
Plan-specific interchange package
deadline semantics
saved views
score / prediction
```

## Performance budgets to define before implementation

- 1,000 active/archived Plans fixture;
- one bounded portfolio query per projection;
- no N+1 SQL or IPC;
- Plan detail p95 and Search rebuild/query budgets;
- lazy route/chunk budget;
- Today startup/main bundle protected.

## Data-safety tests

- migration 19→20 and file reopen;
- failed migration leaves schema 19 recoverable;
- invalid/root/archived Life target rejected by DB and service;
- selected variant cannot be archived without replacement;
- last active variant cannot be archived;
- phase order stable across archive/restore;
- stale revision rejected;
- idempotent save retried safely;
- draft conflict retained;
- Plan archive preserves variants, phases, tags, revisions, and draft;
- full backup/restore preserves exact Plan semantics.

## Activation gate

Task 36 may start only after explicit Product Owner approval. Creating this
packet is not implementation authorization.
