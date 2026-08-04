# Task 33 Remediation 001 — Unified Tags: DB Guards, Alias Flattening, Restore Preflight, Scope Validation, Visible Search Context, Controlled TagPicker, Life Edit Authority

## Scope

Starting HEAD: `d081d306a450d0e7b930721b224b901143e260b3` (Task 33 original implementation).
Schema advances from 17 to 18 via migration 18.
Two commits: Commit A (implementation + governance state) + Commit B (evidence only).

## Verified behavior

### Migration 18

- BEFORE INSERT triggers on `task_tags`, `task_series_tags`, `life_node_tags` reject archived or merged tags at the SQLite layer with descriptive ABORT messages.
- BEFORE UPDATE OF tag_id triggers enforce the same invariant for tag_id column updates.
- Life node BEFORE INSERT trigger additionally rejects archived life nodes and the life-root node.
- `search_meta.algorithm_version` set to 3; dirty rebuild rows inserted for all entity scopes.
- Nine migration-level tests: `schema_18_applies_cleanly_from_17`, `schema_18_applies_cleanly_from_16`, `search_algorithm_version_becomes_3`, `active_canonical_tag_insert_accepted`, `task_tags_archived_guard_fires`, `task_tags_merged_guard_fires`, `task_series_tags_archived_guard_fires`, `life_node_tags_archived_guard_fires`, `life_node_tags_archived_node_guard_fires`.

### Tag domain

- Alias chain flattening: `UPDATE tags SET merged_into_tag_id=?target WHERE merged_into_tag_id=?source` after every merge ensures A→B→C resolves to A→C.
- Restore preflight: correlated subqueries check that no subject with a preserved join row already holds ≥12 active non-merged tags; rejects with `TagError::Validation` if exceeded.
- Four domain tests: `merge_flattens_alias_chain_a_b_c`, `alias_a_remains_searchable_after_b_c_merge`, `restore_fails_when_subject_already_has_12_active_tags`, `restore_succeeds_when_subject_has_11_active_tags`.

### Task scope validation

- `update_recurring_occurrence` rejects `series_tag_ids = Some(...)` when scope is `OnlyThisOccurrence` or `ThisAndFuture`.
- `update_recurring_occurrence` requires `series_tag_ids = Some(...)` when scope is `EntireSeries` and not cancelling.
- Cancellation with `EntireSeries` may pass `series_tag_ids = None`.
- Three scope tests: `scope_only_this_occurrence_rejects_series_tag_ids`, `scope_this_and_future_rejects_series_tag_ids`, `scope_entire_series_accepts_series_tag_ids`.

### Search visible context

- `load_canonical_tag_names(conn, join_table, id_col)` loads canonical display names of active non-merged tags per entity, keyed by entity id.
- `build_tag_visible(names)` returns `"Tags: A, B"` or empty string.
- Tasks, life nodes, and documents include the "Tags: ..." prefix in their visible context string; `normalized_context` is `normalize(visible) + alias_names`.
- `algorithm_version=3` triggers full search index rebuild on next worker tick.

### TagPicker (controlled redesign)

- `<fieldset>/<legend>` structure with native checkbox list; no role=listbox or role=option on buttons.
- Toggle button labels: "Add tags" (0 selected) or "Edit tags, N selected".
- Panel: `<div role="region">` with search input, `N of 12 selected` count in `aria-live="polite"` region, checkbox list, optional create-and-select button, Done button.
- At 12 selected: unchecked checkboxes disabled, limit message shown.
- `onChange` called synchronously on each toggle; no internal IPC mutations.
- Click-outside and Escape close the panel and return focus to the toggle button.
- Create-and-select: calls `createTag`, adds new tag to `selectedTags`, invalidates `["tags"]`.
- External `error` prop renders `role="alert"` below the fieldset.
- External `busy` prop disables toggle and shows "Saving…" status.
- `readOnly` mode: shows comma-joined names (no toggle button).

### TagChipList

- Each chip renders `#Name` (literal hash prefix).
- `maxVisible` prop (default 4; Reader passes 12).
- Overflow: `<span aria-label="N more tags: A, B, C">+N</span>`.

### TagSettings

- Lazy-loaded via `React.lazy` + Suspense; no inline import.
- Merge confirmation: two-step inline flow (`mergePending` state); no `window.confirm`.
- `invalidateAll()` invalidates `tags`, `today-items`, `task-planning`, and `life` queries.
- Post-merge: focuses target row via `ref` callback, announces success via `aria-live="polite"`.
- Merged alias display: `→ TargetName` suffix in styled span (no inline `style={{}}`).
- All `style={{}}` removed; CSS classes used throughout.

### TodayScreen

- `Draft` type gains `selectedTags: TagSummaryView[]` for rendering alongside `tag_ids: string[]` for mutation.
- P1 bug fixed: `begin()` now initialises `tag_ids: item.tags.map(t => t.id)` and `selectedTags: item.tags` from the existing item.
- TagPicker shown for new one-offs, existing one-offs, and EntireSeries recurring edits.
- OnlyThisOccurrence/ThisAndFuture recurring edits show read-only TagChipList with explanatory note.
- `series_tag_ids: scope === "entire_series" ? draft.tag_ids : null` wired into updateRecurringOccurrence.
- Mutation invalidation extended to `["life"]` and `["tags"]`.

### Life integration

- Life Browse focal panel: `TagPicker` removed; read-only `TagChipList` kept.
- Life Edit inspector: `TagPicker` added with `setLifeNodeTags` mutation; root node shows message; archived node shows chips only.
- `RelatedTasksPanel`: `TagChipList` rendered inside each task button.

### Build and security

- `build.rs` and `capabilities/main.json` declare all 7 tag IPC commands.
- Auto-generated permission TOML files created under `src-tauri/permissions/autogenerated/`.
- `style={{}}` removed from all frontend source files (replaced with CSS-in-TS classes).

## Test evidence

- Rust: 500 passed, 0 failed, 4 ignored (designated evidence tests).
- Frontend: 539 passed across 36 files (new: TagChipList 10, TagPicker 20, TagSettings 12; extended: TodayScreen 25).
- `pnpm typecheck`: passed.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `pnpm verify` (source/governance/index/security/hardening): passed.
- `pnpm build`: passed.
- `pnpm tauri build`: NSIS `4,865,263` bytes, SHA-256 `23a5b571ac487b3761d2d312ce0ec78e6955efc38fb537aaa2ef8e3fe52bae57`.
- `pnpm hardening:rc`: RC run `core-rc-acd6272756d74903ad0c2450bb94f76d` passed (2 sessions, 25-second liveness each).
