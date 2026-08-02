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
