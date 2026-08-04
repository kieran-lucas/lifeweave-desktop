# Spec 023 — Unified Tags Core + Cross-Pillar Retrieval

## Slice

023

## Scope

- Migration 17: `tags` authority table with normalized name, archive, and merge semantics; `task_tags`, `task_series_tags`, and `life_node_tags` join tables with expected-revision guards.
- Tag CRUD IPC: `list_tags`, `create_tag`, `rename_tag`, `archive_tag`, `restore_tag`, `merge_tags`.
- Life node tag assignment IPC: `set_life_node_tags` with `expected_node_revision` guard.
- Task and recurring-series tag assignment through `tag_ids` / `series_tag_ids` fields on existing task mutation inputs.
- Tag surface in all read projections: `LifeNodeView`, `LifeEditNodeView`, `PinnedLifeNodeView`, `TodayItemView`, `TaskView`, `RecurringOccurrenceView`, `RelatedTaskView`, `TaskPlanningItemView`.
- Search index: tag normalized names and merged-alias normalized names appended to each entity's `normalized_context` so queries for a merged alias still return entities bearing the surviving tag.
- Frontend components: `TagChipList` (read-only chip list), `TagPicker` (life node tag picker dropdown), `TagSettings` (full management UI with create/rename/archive/restore/merge).
- `TagSettings` wired into the Settings destination; `TagChipList` wired into Today, Planning, Life Browse, and Life Edit; `TagPicker` wired into Life Browse focal-node panel.

## Out of scope

- Tag filtering / saved filter views.
- Task dialog tag picker UI (tag IDs default to `[]` in the current create/edit dialog).
- Backlinks, Graph, Noteboard, or other expansion features.
- Narrative Canvas tag support.
- Tag-based analytics or scoring.

## Key decisions

- Tags are a flat, named, globally shared vocabulary; no hierarchy or namespacing.
- Normalized name (lowercase, Vietnamese-decomposed, whitespace-collapsed) is the deduplication and search key; display name is the human-visible label.
- Merge moves all join-table assignments to the surviving tag; the superseded tag row records `merged_into_tag_id`.
- The search index includes superseded normalized names as aliases so searches for a merged name continue to find tagged entities.
- Batch loading (`batch_load_life_tags`, `batch_load_task_tags`) prevents N+1 queries in all read projections.
- `TagChipList` and `TagPicker` default-empty their optional `tags` prop so components render safely even when the backend hasn't refreshed or test fixtures omit the field.
