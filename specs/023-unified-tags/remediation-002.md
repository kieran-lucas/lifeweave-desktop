# Spec 023 — Unified Tags: Remediation 002

> Status: **implemented** — Commit A: `5d7b004e6769a6859ba1fa6d626281555b4f80e3`.

## Summary

Closes all remaining product-contract gaps from Remediation 001: Migration 19 adds a `BEFORE UPDATE OF life_node_id` trigger on `life_node_tags` enforcing active-node and non-root assignment at the SQLite update path; `TagError::Validation` changed from `&'static str` to `String` enabling dynamic alias-collision messages naming the canonical tag; `LifeScreen` Reader and Pinned sections gain `TagChipList`; `TagPicker` gains accent-insensitive filter, load-error retry via `invalidateQueries`, Enter-key safety, and post-create focus; `TagSettings` gains distinct Active/Archived/Merged sections, merge confirmation shows source usage counts, merge failure retains the confirmation dialog with inline error, and load-error retry via `invalidateQueries`.

## Changes

### Migration 19

- `BEFORE UPDATE OF life_node_id` trigger on `life_node_tags`: rejects moves to archived nodes, non-existent nodes, or life-root.
- Schema version assertions bumped 18→19 across all repositories and infrastructure files.

### Tag domain

- `TagError::Validation` variant changed from `&'static str` to `String`.
- `create_tag`: dynamic alias-collision error message names the canonical tag ("'#Foo' is a permanent alias for '#Bar'. Use the canonical tag.").
- `ipc/tag.rs`: removed redundant `.into()` on `String` (`msg` arm of `map_tag`).

### Frontend

- `LifeScreen`: Reader section gains `<TagChipList tags={reader.tags} maxVisible={12} />`; Pinned view card buttons gain `<TagChipList tags={item.tags} />`.
- `TagPicker`: `normalizeSearch` function for accent-insensitive filtering; Enter key on search input prevented; load-error retry uses `queryClient.invalidateQueries`; post-create focus via `setTimeout` to the new checkbox.
- `TagSettings`: three distinct `<section>` elements (Active tags, Archived tags, Merged aliases); merge confirmation shows source task/series/life-node counts; `mergeError` state keeps confirmation dialog open on failure; load-error retry uses `queryClient.invalidateQueries({ queryKey: ["tags", true] })`.
- `TagPicker.css.ts`: `retryButton` style added.

### E2E

- `e2e-tests/specs/phase7-unified-tags.e2e.ts`: 10-step lifecycle flow using isolated profile — seed data, chip verify in Today, P1 title-only edit preserves chip, Life Edit chip, Search, Archive, verify gone, Restore via IPC, verify restored.

## Evidence

See `docs/audits/task-33-remediation-002.md`.
