# Slice 026 — Focus Plans Core + Draft/Active Lifecycle

## Status

```text
Task 36: ACTIVE
Slice 026: ACTIVE
starting HEAD: fd3f0e8808f28aae7c4bbca992cedcbd94db6c5d
schema baseline: 19
proposed schema: 20
Task 37: prohibited
```

## Outcome

Implement the standalone Focus Plan authority selected by ADR 0030. Users can
create and manage medium-term strategies without creating temporary Life nodes
or oversized Tasks.

## Included

- migration 20 with Plan-owned tables only;
- stable Plan identity and manual lifecycle;
- optional zero-or-one active, non-root Life context;
- 1–5 variants and 0–20 ordered phases per variant;
- revision history, recovery draft, optimistic concurrency, idempotent save;
- shared global tags and `focus_plan` Search projection;
- full-database backup/reopen/restore authority;
- lazy Plans destination while Today remains startup/default;
- accessible portfolio and Plan detail workflows;
- fresh-process native evidence and performance/release evidence.

## Excluded

Task/series links, review entries, automatic progress, reminders,
notifications, sound, snooze, AI generation, cloud, collaboration, many-to-many
Life links, Plan-specific interchange, deadline semantics, saved views,
scoring, and prediction.

## Authority

- `spec.md` — normative product/domain contract;
- `plan.md` — phased implementation and gate order;
- `tasks.md` — executable work breakdown;
- `acceptance.md` — closure requirements;
- `performance-budget.md` — measurable non-functional limits;
- ADR 0030 and Task 35 evidence remain architectural authority.
