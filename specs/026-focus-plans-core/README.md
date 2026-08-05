# Slice 026 — Focus Plans Core

## Status

```text
Task 36: ACTIVE
Slice 026: ACTIVE
starting HEAD: fd3f0e8808f28aae7c4bbca992cedcbd94db6c5d
schema: 20
Task 37: prohibited
```

## Outcome

Implement the standalone Focus Plan authority selected by ADR 0030. Users can
create and manage medium-term strategies without creating temporary Life nodes
or oversized Tasks.

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
- one native create/edit/fresh-process persistence scenario.

## Excluded

Task/series links, review workflow, automatic progress, reminders,
notifications, AI generation, cloud, collaboration, Plan-specific interchange,
deadline semantics, scoring, and prediction.

## Authority

- `spec.md` — normative product and domain contract;
- `acceptance.md` — the small set of closure checks that protect real risks;
- ADR 0030 — canonical architecture decision.

No auxiliary plan, task breakdown, risk register, performance sheet, patch
script, temporary workflow, or compiler diary belongs in this slice.
