# Task 41 Acceptance Mapping

Status: CLOSED — executable evidence is recorded in `docs/audits/task-41-explicit-life-links.md`.

## Migration and domain

- [x] Fresh and schema-23 databases reach schema 24 exactly once; too-new databases stay safe.
- [x] `life_links` has only four columns, two restrictive FKs, self check, unique direction, and both indexes.
- [x] Released migrations 1–23 and unrelated tables remain byte/shape unchanged.
- [x] Supported Basic/Narrative directions and reverse edges succeed; invalid endpoints fail atomically.
- [x] Self, duplicate, root, branch, archived, documentless, 101st outgoing, and 501st incoming fail with typed errors.

## Projection, lifecycle, removal, and search

- [x] Outgoing/backlink symmetry, canonical order, bulk metadata shape, live rename/reparent, archive/restore, and unavailable-document safety pass.
- [x] Removal uses link ID, removes both projections only, preserves endpoints/content, and leaves unrelated edges intact.
- [x] Target search validates normalized 1–120 characters, reuses existing FTS/normalization, returns at most 20 eligible distinct leaves, and excludes source/already-linked/invalid endpoints.
- [x] Vietnamese normalization, stable ranking/ties, bounded SQL, and no N+1 evidence pass.

## Reader, accessibility, and cache

- [x] Links appear only in Reader after content and before Related Tasks with semantic counts/states.
- [x] The Add dialog supports keyboard search/select/confirm/cancel/Escape, focus containment/restoration, and retained failed input.
- [x] Stable-ID outgoing/backlink navigation, heading focus, archived-disabled rows, outgoing-only remove, and A→B→C history pass.
- [x] `axe.run` reports zero violations for empty, populated, dialog, archived, and ineligible states.
- [x] Link/tree/document/restore writers refresh precise panels/options; every key contains all parameters and no stale key writer exists.

## Durability, boundaries, native, and performance

- [x] Close/reopen and backup→mutate→restore→reopen preserve exact link IDs/direction/endpoints/time; invalid references are rejected.
- [x] Portable Package, Markdown, global Search, Graph, routes, dependencies, lockfiles, workflows, and seal remain semantically unchanged.
- [x] Native phase 11/12 workflow, restart, and backup/restore phases pass and each has load-bearing deliberate-break evidence.
- [x] Final startup/raw/gzip deltas remain within 2/24/8 KiB and the performance-budget transition decision is truthful.
- [x] Focused and broad gates pass; one full diff review finds no remaining P0/P1 defect.
- [x] Schema is 24, Task 41 is the latest feature checkpoint, and Task 42 remains unstarted/unrecommended.
