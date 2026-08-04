# Task 33 Remediation 002 — Unified Tags: Migration 19 Node-Move Guard, Dynamic Validation Errors, Reader/Pinned Chips, TagPicker Accent Filter, TagSettings Sections

## Scope

Starting HEAD: `723bb875ad47d097b7fb17aef026c0c2a998df1a` (Task 33 Remediation 001).
Schema advances from 18 to 19 via migration 19.
Two commits: Commit A (implementation + governance state) + Commit B (evidence only).

## Verified behavior

### Migration 19

- `BEFORE UPDATE OF life_node_id` trigger on `life_node_tags`: rejects moves to archived nodes, non-existent nodes, or the life-root at the SQLite layer.
- Schema version assertions bumped 18→19 across migrations.rs, worker.rs, restore.rs, engine.rs, search/repository.rs, life/repository.rs, life/edit.rs, narrative/repository.rs, task/repository.rs.
- Five migration-level tests: `schema_19_applies_cleanly_from_18`, `life_node_tags_node_move_to_active_node_accepted`, `life_node_tags_node_move_guard_fires_for_archived_node`, `life_node_tags_node_move_guard_fires_for_root`, `life_node_tags_node_move_guard_fires_for_missing_node`.

### Tag domain

- `TagError::Validation` variant changed from `&'static str` to `String` to allow dynamic error messages.
- `create_tag`: alias-collision error now names the canonical tag: `"'#Foo' is a permanent alias for '#Bar'. Use the canonical tag."`.
- `ipc/tag.rs`: `map_tag` removes redundant `.into()` on `msg` (now `String`).
- `task/repository.rs`: `map_tag_err` simplified to `_ => TaskError::Validation("Invalid tags.")` (no `String`→`&'static str` coercion needed).

### Frontend

- `LifeScreen` Reader: `<TagChipList tags={reader.tags} maxVisible={12} />` rendered before `<BasicLeafReader />`.
- `LifeScreen` Pinned: `<TagChipList tags={item.tags} />` rendered inside the card button when `item.available`.
- `TagPicker`: `normalizeSearch` function (diacritics + đ/Đ stripping, NFD decomposition, lowercase) applied to both query and tag names in the filter; search `<input>` prevents default on Enter to avoid accidental form submission; Retry button uses `queryClient.invalidateQueries({ queryKey: ["tags"] })` (not `.refetch()`); `createMutation.onSuccess` focuses the new tag's checkbox after 50 ms via `document.getElementById`.
- `TagSettings`: load-error Retry button uses `queryClient.invalidateQueries({ queryKey: ["tags", true] })`; three `<section>` elements with `aria-label` for Active, Archived, and Merged Aliases; `mergePending` state includes `sourceTaskCount`, `sourceSeriesCount`, `sourceLifeCount` for merge confirmation copy; `mergeError` state keeps the confirmation panel open on failure with inline error display.
- `TagPicker.css.ts`: `retryButton` style added for load-error retry affordance.

### E2E

- `e2e-tests/specs/phase7-unified-tags.e2e.ts` — 10-step lifecycle flow in an isolated profile:
  1. Seed: create tag + task + life node + assign via IPC.
  2. Verify `#Research` chip in Today.
  3. P1 regression: title-only edit preserves `#Research` chip (no tag erasure).
  4. Life Edit: verify chip in inspector.
  5. Search `research` verifies tagged task appears in results.
  6. Archive tag in Settings (UI click).
  7. Verify chip no longer appears in Today after archive.
  8. Restore via IPC (`restore_tag`).
  9. Verify `#Research` chip reappears in Today.
  10. Life Edit chip visible after restore.

## Test evidence

- Rust: 505 passed, 0 failed, 4 ignored.
- Frontend: 539 passed across 36 files.
- `pnpm typecheck`: passed.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `pnpm verify` (source/governance/index/security/hardening): passed.
- `pnpm build`: passed.
- `pnpm tauri build`: NSIS `4,866,352` bytes, SHA-256 `d87653e0918cd3ac7a82a03dfb9bb976f52e594c95de7b59b461acdacdf9a25d`.
- `pnpm hardening:rc`: RC run `core-rc-8702a09` passed (2 sessions, 25-second liveness each, run ID `core-rc-36e96814e91e48ca935971d20438bcb2`).
