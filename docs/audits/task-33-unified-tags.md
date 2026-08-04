# Task 33 audit — Unified Tags Core + Cross-Pillar Retrieval

## Scope and checkpoints

- Starting HEAD: `f7d3fd167f7e22d5e3892e0a64e048eb4e10e0c6` (Task 32 evidence commit).
- Implementation checkpoint: `d081d306a450d0e7b930721b224b901143e260b3`.
- Branch: `main`.
- Schema advances from 16 to 17 via migration 17 (`tags`, `task_tags`, `task_series_tags`, `life_node_tags`).
- Seven new IPC commands: `list_tags`, `create_tag`, `rename_tag`, `archive_tag`, `restore_tag`, `merge_tags`, `set_life_node_tags`.
- No new runtime dependency, sidebar destination, plugin, or broad capability.

## Verified behavior

- `tags` table enforces unique normalized names among active tags and unique normalized names among archived tags separately. `merged_into_tag_id` records the surviving tag when a tag is merged.
- Join tables (`task_tags`, `task_series_tags`, `life_node_tags`) carry `expected_revision` guards preventing lost-update races.
- `list_tags` returns active and optionally archived tags. `create_tag` normalizes input and rejects duplicates. `rename_tag` recomputes the normalized name and rejects conflicts. `archive_tag` / `restore_tag` respect the active/archived uniqueness boundaries. `merge_tags` atomically reassigns all join-table rows from the superseded tag to the surviving tag.
- `set_life_node_tags` replaces the complete tag set for a life node atomically, guarded by `expected_node_revision`.
- All read projections load tags via N+1-free batch functions: `batch_load_life_tags` (life nodes), `batch_load_task_tags` (tasks and series).
- The search rebuild pipeline appends tag normalized names and merged-alias normalized names to each entity's `normalized_context`. A search for a merged tag name continues to surface entities bearing the surviving tag.
- `TagChipList` renders read-only tag chips and defaults to an empty list when the prop is omitted or undefined, making it safe in fixtures without tags.
- `TagPicker` provides a life-node tag assignment dropdown with search filter, toggle, click-outside close, and query invalidation on success.
- `TagSettings` exposes full tag management (create, rename, archive, restore, merge) in the Settings destination.
- Tag chips appear in: Today timeline rows, Planning rows (Upcoming/Overdue), Life Browse focal-node panel and child cards, Life Edit compact node cards.
- `TagPicker` appears in the Life Browse focal-node panel.

## Focused evidence

- Rust: `cargo test --locked --lib` with tag-module filter: 484 passed, 4 ignored.
- Frontend: `pnpm --dir frontend exec vitest run` passed 33 files, 498 tests, 0 failed.

## Ordinary evidence

- `pnpm typecheck`: passed.
- `pnpm test`: 33 files, 498 passed, 0 failed.
- Cargo check, fmt check, and Clippy with `-D warnings`: passed.
- `cargo test --locked --lib`: 484 passed, 0 failed, 4 ignored evidence tests.

## Integrity and remaining debt

- Source SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a` (unchanged).
- P0/P1: none known.
- P2: physical screen-reader and physical alternate-DPI validation remain external manual debt. Build, E2E, hardening:rc, and NSIS evidence are deferred to governance closure (Commit B gates).
- Task-level tag picker UI (the task create/edit dialog uses `tag_ids: []`; tag display is present but assignment is not yet exposed in the dialog).
- Task 34 is not selected. Exact next action is Product Owner gate.
