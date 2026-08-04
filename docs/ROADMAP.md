# Roadmap

## Slice 019 — Task/Life Relationships

Task 29 adds navigation-only, zero-or-one Life area relationships for one-off Tasks and recurring-series sources. Occurrence rows do not store relationships.

## Slice 018 - Narrative Visual Worlds
- four curated static document-level Canvas worlds;
- Studio-only mutable presentation selection.

## Slice 017 - Narrative Template System
- three static seed-only Narrative Canvas templates;
- immutable persisted creation provenance;
- explicit accessible empty-leaf chooser.

## Phase 0 — Source and governance
- preserve exact source;
- establish Constitution, registry, ADR, GitHub templates;
- generate indexes/coverage;
- Windows bootstrap and lockfiles.

## Slice 000 — Foundation Proof
- Tauri/React shell;
- typed IPC;
- Rust layers;
- SQLite worker/migration;
- one persistent entity;
- restart persistence;
- backup/restore smoke;
- CI/test/tracing baseline.

## Slice 001 — Task Core
- Today/week strip/timeline;
- CRUD/archive;
- time wheel;
- conflict/groups;
- category/priority;
- recurrence;
- Calendar projections.

## Slice 002 — Completion and Objective Analytics
- configurable completion states;
- radial fan without prediction;
- evaluation/undo;
- period aggregates;
- category minimum/target;
- objective streaks.

## Slice 003 — Life Browse
- node CRUD seed;
- selected + children;
- breadcrumb/history;
- pinned;
- leaf opening shell.

## Slice 004 — Life Edit
- full tree geometry;
- reorder/reparent;
- cycle/undo;
- connector/reflow;
- scale prototype.

## Slice 005 — Basic Leaf
- choose Core canonical model;
- Read/Edit split;
- basic rich content;
- autosave/recovery;
- assets;
- Markdown import/export.

## Slice 006 — Core Hardening
- accessibility;
- DPI/responsive;
- performance;
- data recovery;
- security;
- dogfooding.

## Slice 007 — Expansion Decision

Task 17 evaluates Score, Prediction, Narrative Canvas, Visual Worlds, Global Search, Tags, Backlinks, Outline, Noteboard and Graph independently.

Portfolio recommendation accepted: **Global Search activated as Task 18.** All other candidates remain held or deferred per `docs/audits/task-17-expansion-decision.md`.

## Slice 015 — Core Evidence + Release Readiness

Task 25 closes evidence debt after Narrative Multi-Scene: deterministic ordinary Canvas scale coverage, isolated release performance evidence, Canvas asset backup packaging, preview-time missing asset diagnostics, keyboard-complete scene tabs, and current local Windows release evidence. It does not activate a new product slice.

## Slice 016 — Native E2E Contract Refresh

Task 26 replaces the removed Foundation Records native scenario with current one-off Task create/edit, UI backup/restore, and fresh-process restored-state persistence. It is release-evidence maintenance only: no product feature, migration, dependency, or IPC change.

## Slice 008 — Global Search

Task 18 implements FTS5 global search with Vietnamese normalization, dirty-scope rebuild queue, `search_global` IPC command, and lazy React search dialog.

- SQLite FTS5 external-content index (`search_documents` + `search_fts`)
- Dirty-scope triggers on Tasks, Life, and Documents source tables
- BM25 ranking with weighted columns (title=10, context=3, body=1)
- Vietnamese diacritic normalization: NFKD + combining mark removal + đ/Đ→d
- APG combobox dialog; Ctrl+K shortcut; sidebar search button
- Navigation integration with TodayScreen and LifeScreen

## Slice 009 — Basic Leaf Heading Outline

Task 19 activates Outline only as a bounded Basic Leaf Reader heading navigator.
It does not activate generic Outline, Life tree duplication, Studio, Noteboard or Graph.

## Slice 010 — Narrative Canvas Schema Prototype

Task 20 determines the canonical JSON structure for Narrative Canvas through isolated prototype comparison.
Complete re-implementation with correct vocabulary (metric/image/callout/timeline blocks), all 18 adapter ops,
undo/redo, editor prototypes, fair B codec + static reader, medium/large fixtures, 100k simulation.
Strategy A (domain envelope + rich-text islands) selected: score 82.8 vs B 67.9 (gap 14.9 ≥ 10 threshold).
Decision in ADR 0010. No product feature activated.
Production Narrative Canvas activation requires a separate approved task.

## Slice 012 — Narrative Canvas Markdown Interoperability

Task 22 adds Markdown export from a committed Canvas and Markdown import as a new Canvas on an empty leaf.

- `export_narrative_markdown`: returns sanitized file name, Markdown, and lossiness warning
- `preview_narrative_markdown`: stateless preview (proposed title, excerpt, section count, asset count, warnings)
- `import_narrative_markdown`: creates one-scene one-rich_text-block Canvas from Markdown; idempotent via operation_id
- Shared authority: `document::markdown::import` handles all Markdown parsing; no third implementation
- Asset syntax corrected: `assets/{uuid}` (was `asset:{uuid}`)
- File name sanitization: 120 scalar value limit, Windows reserved name rejection
- No new migration (schema stays at version 14). No new dependencies.

## Slice 013 — Post-Narrative Expansion Decision

Task 23 evaluates all 13 expansion candidates under the exact approved 12-criterion 100-point model with a 13×14 hard-filter matrix and a five-profile, five-million-sample sensitivity simulation (seed 20260803). Initial commit `0dce8e9` was FAIL (substituted criteria); remediation commit is the accepted checkpoint.

**Eligible candidates (PASS 14/14):** Narrative Multi-Scene Composition (base 8.02) and No Expansion / Hardening Slice (base 7.56).

Portfolio recommendation (accepted, ADR 0018): **Narrative Multi-Scene Composition `ACTIVATE_NEXT`** — base score 8.02, base lead 0.46, aggregate top-1 65.8 %. Wins in base, utility, and visual-identity profiles; hardening wins safety and recovery profiles.

**HOLD_FOR_PRODUCT_OWNER:** Template System, Visual Worlds. **CONDITIONAL (DEFER):** Lossless Package, Tags, Task/Life Relationships, Generic Outline. **FAIL:** Backlinks, Noteboard, Graph, Score, Prediction.

## Slice 014 — Narrative Multi-Scene Composition

Task 24 relaxes the single-scene constraint (1–20 scenes), adds a Studio scene panel (tab UI, add/delete/rename/reorder), and updates the Reader to render all scenes. No migration required; schema stays at version 14. ADR 0019 accepted.

## Slice 011 — Narrative Canvas Core

Task 21 activates the first production Narrative Canvas vertical slice (ADR 0010 Strategy A). Accepted after two remediation rounds (ADR 0012, ADR 0013).

- Migration 11: narrative tables, mutual exclusion triggers, search dirty triggers
- Migration 12: `template_id`/`template_version` columns, unique partial index (one-canvas-per-leaf), revision uniqueness, INSERT/UPDATE guard triggers, restore guard triggers
- Migration 13: BEFORE UPDATE move guard (life_node_id immutability on active rows) and restore guards (node active + uniqueness) for both document types
- Migration 14: life_node_id immutable for ALL rows (active and archived); comprehensive restore guards (root, no-children, mutual exclusion) consolidating Migration 13 guards
- Schema validation: document identity chain (JSON `documentId` == DB `id` == IPC input), unknown block lossless preservation (`canonical` field), strict parse (rejects wrong preset values/scene count/templateVersion)
- `serializeNarrative`: single exit point for canonical JSON; known blocks emit V1 fields only; unknown blocks re-emit `canonical` verbatim
- `BasicLeafReader`: dual-content conflict detection with blocking alert
- All five block kinds (rich_text, metric, image, callout, timeline); unknown blocks: preserved on save, placeholder in Reader
- 6 IPC commands; `NarrativeCanvasReader` (semantic `article`/`h1`/`section`/`h2`; rich_text/callout rendered via `parseDocument`+`StaticDocument`) + `NarrativeCanvasStudio` (lazy Tiptap island chunk)
- Search integration reuses `entity_kind='reader_document'` (immutable Migration 10 FTS constraint)
- Revision retention: 50 revisions (same as Basic Leaf)
- Decisions in ADR 0011, ADR 0012, ADR 0013, ADR 0014.
