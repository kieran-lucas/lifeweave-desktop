# Lifeweave AI Project Handoff

## Metadata

- generated_at: `2026-08-05T05:00:00.0000000+07:00`
- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- Task 33 Remediation 003 implementation checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- current handoff-containing HEAD: resolve at read time with `git rev-parse HEAD`
- tracked working tree status at generation: authorized implementation was clean and matched `origin/main`; only closure/evidence files committed with this handoff were then changed

## Immutable source

- path: `docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`
- SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- bytes: 165,171
- lines: 4,637
- headings: 402

## Product compass

- macro milestone: Post-Core Expansion, Product Owner gate
- latest closed task: Task 33 — Unified Tags Core + Cross-Pillar Retrieval (Remediation 003)
- latest feature task/checkpoint: Task 33 / `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- database schema: 19
- active spec: none
- next allowed action: Product Owner gate
- forbidden jump: any Task 34 feature implementation

## Verified implementation

### Task 33 Remediation 003

- `LifeScreen` prepare effect: defers `settleEntryRequest` when `browse.isFetching` is true (stale-while-revalidate). This allows the second settle effect to overwrite the reader with fresh post-restore tag data. Previously, archive-then-restore followed by search-to-reader navigation would show the pre-restore reader (no chip) because the entry request was settled with stale cache data before the background fetch completed.
- `TagPicker`: controlled selection is the sole selection authority; no internal state fork; accent-insensitive `normalizeSearch` (NFD + diacritic strip + đ/Đ + lowercase); Retry uses explicit `refetch()`; search Enter is prevented from submitting ancestor forms; Escape closes only the picker (prevents default + propagation), restores toggle focus without closing the parent dialog; `onChange` called exactly once per create (StrictMode safe).
- `TagSettings`: five named sections (Create tag, Active tags, Archived tags, Merged aliases, Merge tags); Retry uses `tagsQuery.refetch()`; rename/archive/restore/merge failures each refetch to flush stale state; successful merge announces once via `aria-live="polite"`, focuses target row, clears confirmation state.
- `TodayScreen` Escape integration: first Escape while TagPicker is open closes picker only (Task dialog retained); second Escape closes Task dialog.
- `phase6-planning.e2e.ts` compatibility: `tag_ids: []` on all create_task and create_recurring_task inputs; `series_tag_ids: null` on all update_recurring_occurrence inputs scoped to `only_this_occurrence`.
- `phase7-unified-tags.e2e.ts`: full product UI lifecycle with no IPC for tag/assignment/archive/restore — creates Research via Settings UI; assigns to task and life node via product UI; verifies Browse/Reader/Pinned/Search; archives via Settings UI; restores via Settings UI; verifies all restored-state including Reader chip.
- `phase7-unified-tags-restart.e2e.ts`: fresh-process persistence verification (no reseeding or mutation).
- `scripts/run_windows_e2e.ps1`: includes phase7-unified-tags and phase7-unified-tags-restart after phase6-planning-restart.

### Task 33 Remediation 002

- Migration 19 adds a `BEFORE UPDATE OF life_node_id` trigger on `life_node_tags` rejecting moves to archived nodes, non-existent nodes, or life-root at the SQLite layer. Schema assertions bumped 18→19 across all repositories.
- `TagError::Validation` changed from `&'static str` to `String` enabling dynamic alias-collision error messages that name the canonical tag.
- `LifeScreen` Reader gains `<TagChipList tags={reader.tags} maxVisible={12} />`; Pinned cards gain `<TagChipList tags={item.tags} />`.
- `TagPicker`: accent-insensitive `normalizeSearch` filter (diacritics + đ/Đ stripping), Enter-key prevention on search input, load-error retry via `queryClient.invalidateQueries`, post-create focus to new checkbox.
- `TagSettings`: distinct `<section>` elements for Active, Archived, and Merged Aliases; merge confirmation shows source task/series/life-node usage counts; `mergeError` state keeps confirmation open on failure; load-error retry via `invalidateQueries`.
- `e2e-tests/specs/phase7-unified-tags.e2e.ts`: 10-step lifecycle flow (seed, chip verify, P1 title-only edit, Life chip, Search, Archive, verify gone, Restore, verify restored).

### Task 33 Remediation 001

- Migration 18 adds BEFORE INSERT/UPDATE DB-level triggers on `task_tags`, `task_series_tags`, and `life_node_tags` rejecting archived or merged tag assignments at the SQLite layer. Life node triggers also reject archived nodes and the root. `search_meta.algorithm_version` set to 3; dirty rebuild queued for all entity scopes.
- Alias chain flattening in `merge_tags`: after moving assignments from source to target, all existing alias rows pointing to the source are redirected to the target (A→B then B→C yields A→C).
- `restore_tag` preflight: before un-archiving, correlated subqueries verify no subject with preserved join rows already holds ≥12 active non-merged tags; rejects with a validation error if exceeded.
- `update_recurring_occurrence` scope validation: `OnlyThisOccurrence`/`ThisAndFuture` rejects non-None `series_tag_ids`; `EntireSeries` non-cancel requires Some `series_tag_ids`.
- Search visible context: `load_canonical_tag_names` + `build_tag_visible` helpers add "Tags: A, B" to displayed context for tasks, life nodes, and documents. `algorithm_version=3` triggers full index rebuild on next search worker tick.
- Controlled `TagPicker` redesign: fieldset/legend/native-checkbox semantics, 12-tag limit enforcement, create-and-select, Escape focus management, click-outside close, no internal IPC mutations (fully controlled component). Owner calls mutation on `onChange`.
- `TagChipList` updated: `#Name` format with literal hash, `maxVisible` prop (default 4; Reader passes 12), overflow `+N` span with accessible `aria-label` listing hidden names.
- `TagSettings` upgraded: lazy-loaded via `React.lazy` + `Suspense`, inline two-step merge confirmation (no `window.confirm`), complete query invalidation (tags/today-items/task-planning/life), post-merge row focus and `aria-live` polite announcement.
- P1 tag-erasure bug fixed in `TodayScreen`: `begin()` now initialises `tag_ids: item.tags.map(t => t.id)` and `selectedTags: item.tags` from the existing item rather than resetting to empty.
- `TodayScreen` dialog: `TagPicker` for create and edit; recurring edits with `OnlyThisOccurrence`/`ThisAndFuture` show read-only `TagChipList` with explanatory note; `EntireSeries` sends `series_tag_ids`.
- Life Edit inspector (`LifeEditWorkspace`): gains `TagPicker` with `setLifeNodeTags` mutation; root node shows non-editable message; archived node shows chips only.
- Life Browse: removes TagPicker (assignment authority moved exclusively to Life Edit inspector).
- `RelatedTasksPanel`: renders `TagChipList` for each related task.
- `build.rs` and `capabilities/main.json` updated to declare the 7 tag IPC commands.
- New test files: `TagChipList.test.tsx` (10 tests), `TagPicker.test.tsx` (20 tests), `TagSettings.test.tsx` (12 tests).
- New Rust tests: 3 scope validation tests in `recurrence_tests`; earlier-phase tests for migration 18, alias chain, restore preflight, and alias searchability already committed.

### Task 33 Original delivery

- Migration 17 adds the `tags` authority table with normalized name, archive flag, and merge pointer. Join tables with expected-revision guards.
- Seven new IPC commands. Task mutation inputs gain `tag_ids` / `series_tag_ids` fields.
- All read projections gain `tags: Vec<TagSummaryView>` via N+1-free batch loaders.
- Search rebuild appends tag normalized names and alias names to `normalized_context`.
- Frontend: initial `TagChipList`, `TagPicker`, `TagSettings`.

## Test and release evidence

- `python -m unittest scripts.tests.test_check_project_state`: 14 passed, 0 failed.
- `pnpm source:verify`: passed.
- `pnpm governance:check`: passed.
- `pnpm index:check`: passed.
- `pnpm verify`: passed (source, governance, index, security, hardening).
- `pnpm typecheck`: passed.
- `pnpm --dir frontend exec vitest run --maxWorkers=4`: 36 files, 561 passed, 0 failed.
- `pnpm build`: main JS `index-VO7KV59P.js` 526,418 bytes; total JS 1,134,505 bytes (+6,603 main / +15,988 total vs Task 32 baselines 519,815 / 1,118,517).
- `pnpm hardening:performance`: passed.
- `cargo check --locked --all-targets`: passed.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `cargo test --locked`: 505 passed, 0 failed, 4 ignored.
- `pnpm tauri build`: NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,866,691 bytes, SHA-256 `8edbd85fb8b4fd4d625a26586072b87374c90adc6b9146746ee44a7c2796c7a8`; release binary `src-tauri/target/release/lifeweave-desktop.exe` 13,294,592 bytes.
- `pnpm hardening:rc`: RC candidate `core-rc-72f34d9`, run ID `core-rc-ccf5b351940543f3bad229abf3775b97`, passed (2 sessions, 25-second liveness each).
- `pnpm e2e:windows`: 9/9 specs passed — phase1-lifecycle, phase2-backup-restore, phase3-restart, phase4-portable-roundtrip, phase4-portable-restart, phase6-planning, phase6-planning-restart, phase7-unified-tags, phase7-unified-tags-restart.

## Decisions

- locked: Tags are a flat globally shared vocabulary. Normalized name is the deduplication and search key. Merge reassigns all join-table entries to the surviving tag and flattens alias chains. `restore_tag` preflights the 12-tag limit. DB-level triggers enforce active-tag assignment at the SQLite layer (INSERT and UPDATE paths). Tag assignment authority: Task dialog (create/edit), Life Edit inspector (not Browse). Scope rules: OnlyThis/ThisAndFuture must not supply series_tag_ids; EntireSeries non-cancel must supply it.
- locked carry-forward: Windows/local-first, Task rows not cards, SQLite/Rust authority, safe backup/restore, Narrative schema/templates/worlds, single-document Portable Package v1, Today/Upcoming/Overdue tab model, Task/Life navigation ownership.
- open: actual-time semantics; deadline semantics beyond scheduled date/time; saved filter AST/view UI; Backlinks; Generic Outline beyond Basic Leaf headings; Noteboard; Graph; score; prediction; whole-tree/multi-document interchange.
- recommended but not activated: no active recommendation; Project State records none.

## Risks/debt

- P0: none known.
- P1: none known.
- P2: physical screen-reader and physical alternate-DPI verification remain external manual debt. Native E2E phase7 specs require a live Tauri instance to run (not run in CI gate).
- P3: none known.

## Recent commits

- `ca093c5032d37bba97286a0eb8318ecad2d89bde` — correct task 33 closure evidence (checkpoint expansion, RC JSON, full release gate evidence; ancillary: security verifier false-positive fix, rustfmt correction)
- `72f34d9ac4e56c59efc6ad0a4bbe03ae2c48f156` — record task 33 remediation 003 evidence
- `4d1b65c816312a9e6ae8aa39f4a565555af9feb9` — complete unified tags verification contract (Remediation 003 implementation)
- `f08eb34885776e1df6b66ab60779bbebe57d558d` — record task 33 remediation 002 evidence

## Exact next action

Product Owner gate. Task 34 is unselected and this handoff grants no implementation authorization.
