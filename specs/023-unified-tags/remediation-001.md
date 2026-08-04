# Spec 023 — Unified Tags: Remediation 001

> Status: **implemented** — Commit A SHA to be updated after commit.

## Summary

Closes all unfinished product-contract requirements from Task 33's premature closure: DB-level assignment guards via SQLite triggers, alias chain flattening, restore preflight for the 12-tag limit, task/series scope validation for tag mutations, visible "Tags: A, B" search context, controlled TagPicker redesign, TagChipList `#Name` format with overflow, TagSettings lazy loading + inline merge confirmation, Life Edit assignment authority (moved from Browse), TodayScreen P1 tag-erasure fix, and RelatedTasksPanel tags display.

## Changes

### Migration 18

- BEFORE INSERT/UPDATE triggers on all three join tables enforcing active-tag assignment at SQLite layer.
- Life node trigger also rejects archived nodes and life-root.
- `search_meta.algorithm_version = 3`; dirty rebuild rows queued for all entity scopes.

### Tag domain

- `merge_tags`: flattens alias chains via `UPDATE tags SET merged_into_tag_id=?target WHERE merged_into_tag_id=?source`.
- `restore_tag`: preflight checks no subject with preserved join rows already has ≥12 active non-merged tags.

### Task repository

- `update_recurring_occurrence` scope validation: `OnlyThisOccurrence`/`ThisAndFuture` rejects `series_tag_ids = Some`, `EntireSeries` non-cancel requires `series_tag_ids = Some`.

### Search repository

- `load_canonical_tag_names` helper + `build_tag_visible` helper.
- "Tags: A, B" appended to visible context for tasks, life nodes, documents.

### Frontend

- `TagPicker`: full controlled redesign with fieldset/legend/native checkboxes, 12-tag limit, create-and-select, Escape/click-outside focus management.
- `TagChipList`: `#Name` format, `maxVisible` prop, `+N` overflow with accessible label.
- `TagSettings`: lazy-loaded, inline two-step merge confirmation, complete query invalidation, post-merge focus + aria-live.
- `TodayScreen`: P1 bug fixed; TagPicker in dialog; scope-conditional picker/chips for recurring edits.
- `LifeScreen`: removes Browse TagPicker.
- `LifeEditWorkspace`: adds inspector TagPicker with `setLifeNodeTags`.
- `RelatedTasksPanel`: adds TagChipList per task.
- `App.tsx`: TagSettings lazy-loaded via React.lazy + Suspense.
- `build.rs` + `capabilities/main.json`: 7 tag commands declared.

## Evidence

See `docs/audits/task-33-remediation-001.md`.
