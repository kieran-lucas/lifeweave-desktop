# Roadmap

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
