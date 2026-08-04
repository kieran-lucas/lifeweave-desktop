# ADR 0027 — Unified Tags Core + Cross-Pillar Retrieval

**Status:** Accepted for Task 33
**Date:** 2026-08-04

## Decision

Tags are a flat, globally shared vocabulary applied across Life nodes and
Tasks. Each tag has a display name, a normalized name (lowercase,
Vietnamese-decomposed, whitespace-collapsed), an archive state, and an optional
`merged_into_tag_id` pointer. Merging moves all join-table assignments to the
surviving tag without deleting the superseded row.

Migration 17 adds the `tags` authority table and three join tables:
`task_tags`, `task_series_tags`, and `life_node_tags`. Join tables carry an
`expected_revision` guard to prevent lost-update races. Normalized names are
unique among active tags; archived tags remain uniquely indexed within their
state.

Tag IPC commands are `list_tags`, `create_tag`, `rename_tag`, `archive_tag`,
`restore_tag`, `merge_tags`, and `set_life_node_tags`. Task mutation inputs
(`CreateTaskInput`, `UpdateTaskInput`, `CreateRecurringTaskInput`,
`UpdateRecurringOccurrenceInput`) gain `tag_ids` / `series_tag_ids` fields so
task tags are settable atomically with the task mutation.

Read projections (`LifeNodeView`, `LifeEditNodeView`, `PinnedLifeNodeView`,
`TodayItemView`, `TaskView`, `RecurringOccurrenceView`, `RelatedTaskView`,
`TaskPlanningItemView`) gain a `tags: Vec<TagSummaryView>` field populated by
N+1-free batch loaders.

The search index appends tag normalized names to each entity's
`normalized_context`. Merged aliases — the normalized names of superseded tags
— are also appended so a search for a merged name continues to surface entities
bearing the surviving tag.

## Consequences

Seven new IPC commands and one tag-module are added. Schema advances to 17.
No new runtime dependency, sidebar destination, or broad capability is
introduced. The tag dialog UI defaults task `tag_ids` to `[]`; a task-level
tag picker is deferred to a later slice. The next action after acceptance is
the Product Owner gate.
