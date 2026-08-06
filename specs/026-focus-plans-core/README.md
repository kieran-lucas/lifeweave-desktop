# Slice 026 — Focus Plans Core

## Status

```text
Task 36: COMPLETE
Slice 026: COMPLETE
feature checkpoint: 57bd42d8eed5643d2fee3b04f74bd3c44e738da2
schema: 20
active spec: none
Task 37: not started
```

## Outcome

The standalone Focus Plan authority selected by ADR 0030 is implemented. Users can create and manage medium-term strategies without creating temporary Life nodes or oversized Tasks.

## Included

- migration 20 with Plan-owned persistence;
- stable identity and manual `draft | active | paused | completed` lifecycle;
- optional zero-or-one active, non-root Life context;
- 1–5 variants and 0–20 ordered phases per variant;
- revisions, recovery draft, optimistic concurrency, and idempotent mutation;
- shared tags and `focus_plan` Search projection;
- full-database backup/reopen/restore;
- lazy Plans destination while Today remains startup/default;
- keyboard-accessible portfolio/detail editing;
- native create/edit/restart scenarios retained as optional smoke coverage.

## Excluded

Task/series links, review workflow, automatic progress, reminders, notifications, AI generation, cloud, collaboration, Plan-specific interchange, deadline semantics, scoring, and prediction.

## Closure basis

Task 36 closed with deterministic migration, domain, frontend, backup, tag, and Search evidence; generated-binding stability; production build success; inspected persisted SQLite state; repository cleanup; and Product Owner approval. A flaky or nondiagnostic Windows E2E harness cannot reopen the task without a reproducible product defect.

## Authority

- `spec.md` — normative product and domain contract;
- `acceptance.md` — risk-based closure checks;
- ADR 0030 — canonical architecture decision.

No auxiliary plan, task breakdown, risk register, performance sheet, patch script, temporary workflow, or compiler diary belongs in this slice.
