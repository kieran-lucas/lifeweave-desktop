# Task 41 Acceptance Mapping

Status: ACTIVE — unchecked criteria require executable evidence before closure.

## Migration and domain

- [ ] Fresh and schema-23 databases reach schema 24 exactly once; too-new databases stay safe.
- [ ] `life_links` has only four columns, two restrictive FKs, self check, unique direction, and both indexes.
- [ ] Released migrations 1–23 and unrelated tables remain byte/shape unchanged.
- [ ] Supported Basic/Narrative directions and reverse edges succeed; invalid endpoints fail atomically.
- [ ] Self, duplicate, root, branch, archived, documentless, 101st outgoing, and 501st incoming fail with typed errors.

## Projection, lifecycle, removal, and search

- [ ] Outgoing/backlink symmetry, canonical order, bulk metadata shape, live rename/reparent, archive/restore, and unavailable-document safety pass.
- [ ] Removal uses link ID, removes both projections only, preserves endpoints/content, and leaves unrelated edges intact.
- [ ] Target search validates normalized 1–120 characters, reuses existing FTS/normalization, returns at most 20 eligible distinct leaves, and excludes source/already-linked/invalid endpoints.
- [ ] Vietnamese normalization, stable ranking/ties, bounded SQL, and no N+1 evidence pass.

## Reader, accessibility, and cache

- [ ] Links appear only in Reader after content and before Related Tasks with semantic counts/states.
- [ ] The Add dialog supports keyboard search/select/confirm/cancel/Escape, focus containment/restoration, and retained failed input.
- [ ] Stable-ID outgoing/backlink navigation, heading focus, archived-disabled rows, outgoing-only remove, and A→B→C history pass.
- [ ] `axe.run` reports zero violations for empty, populated, dialog, archived, and ineligible states.
- [ ] Link/tree/document/restore writers refresh precise panels/options; every key contains all parameters and no stale key writer exists.

## Durability, boundaries, native, and performance

- [ ] Close/reopen and backup→mutate→restore→reopen preserve exact link IDs/direction/endpoints/time; invalid references are rejected.
- [ ] Portable Package, Markdown, global Search, Graph, routes, dependencies, lockfiles, workflows, and seal remain semantically unchanged.
- [ ] Native phase 11/12 workflow, restart, and backup/restore phases pass and each has load-bearing deliberate-break evidence.
- [ ] Final startup/raw/gzip deltas remain within 2/24/8 KiB and the performance-budget transition decision is truthful.
- [ ] Focused and broad gates pass; one full diff review finds no remaining P0/P1 defect.
- [ ] Schema is 24, Task 41 is the latest feature checkpoint, and Task 42 remains unstarted/unrecommended.

