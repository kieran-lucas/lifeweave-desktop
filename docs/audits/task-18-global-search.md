# Task 18 Audit — Global Search Core

**Date:** 2026-08-03
**Task:** 18 — Global Search Core + Vietnamese-Normalized Unified Retrieval
**Status:** Complete

## Scope

Implemented SQLite FTS5 global search with Vietnamese normalization, dirty-scope rebuild queue, `search_global` IPC command, and lazy React search dialog with APG combobox accessibility pattern.

## Files Changed

### Rust (new)
- `src-tauri/src/search/mod.rs` — module root, `SearchError` enum
- `src-tauri/src/search/normalize.rs` — `normalize()` and `build_fts_expression()` with tests
- `src-tauri/src/search/dto.rs` — all search DTOs with serde + ts-rs derives
- `src-tauri/src/search/repository.rs` — dirty-scope refresh, FTS query, index construction (19 tests)
- `src-tauri/src/ipc/search.rs` — `search_global` command handler

### Rust (modified)
- `src-tauri/src/infrastructure/sqlite/migrations.rs` — migration 10 added; version assertions updated 9→10
- `src-tauri/Cargo.toml` — `unicode-normalization = "=0.1.25"` added
- `src-tauri/src/lib.rs` — `pub mod search;`, `search_global` in generate_handler
- `src-tauri/src/ipc/mod.rs` — `pub mod search;`, TS binding exports for all Search types
- `src-tauri/src/infrastructure/backup/engine.rs` — version assertion updated 9→10
- `src-tauri/src/infrastructure/backup/restore.rs` — version assertion updated 9→10
- `src-tauri/src/infrastructure/sqlite/worker.rs` — version assertion updated 9→10
- `src-tauri/src/life/edit.rs` — version assertion updated 9→10
- `src-tauri/src/life/repository.rs` — version assertion updated 9→10
- `src-tauri/build.rs` — `"search_global"` added at end
- `src-tauri/capabilities/main.json` — `"allow-search-global"` added

### Frontend (new)
- `frontend/src/features/search/GlobalSearchDialog.tsx` — lazy default export, 18 tests
- `frontend/src/features/search/GlobalSearchDialog.css.ts` — Vanilla Extract styles
- `frontend/src/features/search/GlobalSearchDialog.test.tsx` — 18 tests

### Frontend (modified)
- `frontend/src/app/App.tsx` — Ctrl+K handler, sidebar search button, pendingNav state, lazy dialog
- `frontend/src/ipc/commands.ts` — `searchGlobal()` function added
- `frontend/src/features/task/today/TodayScreen.tsx` — `focusRequest` prop added
- `frontend/src/features/life/LifeScreen.tsx` — `entryRequest` prop added

### Generated
- `frontend/src/ipc/generated/GlobalSearchProjection.ts`
- `frontend/src/ipc/generated/SearchEntityKind.ts`
- `frontend/src/ipc/generated/SearchGlobalInput.ts`
- `frontend/src/ipc/generated/SearchNavigationTarget.ts`
- `frontend/src/ipc/generated/SearchResultGroup.ts`
- `frontend/src/ipc/generated/SearchResultGroupKind.ts`
- `frontend/src/ipc/generated/SearchResultView.ts`
- `frontend/src/ipc/generated/SearchTextFragment.ts`

### Docs
- `specs/008-global-search/` — README, spec, plan, tasks, acceptance, risk-register
- `docs/adr/0007-global-search-index.md`
- `docs/adr/0006-expansion-portfolio-decision.md` — status updated to Accepted
- `docs/STATUS.md` — Task 18 section added
- `docs/ROADMAP.md` — Slice 008 added

## Verification Results

| Check | Result |
|-------|--------|
| `cargo test` | 322 passed, 0 failed |
| `cargo clippy` | 0 warnings |
| `cargo fmt --check` | Clean |
| `pnpm typecheck` | Passed |
| `pnpm test` | 133 passed (18 new GlobalSearchDialog tests); 3 pre-existing TodayScreen failures |
| `pnpm build` | Clean production build |
| `pnpm verify` | All governance gates passed |
| Security (3-point registration) | build.rs + lib.rs + capabilities/main.json in sync |
| Binding drift check | No drift (`git diff frontend/src/ipc/generated/` clean) |

## Pre-existing Test Failures

Three TodayScreen tests fail both before and after Task 18:
- "optimistically evaluates an eligible one-off and exposes backend Undo"
- "uses stable recurring subject identity for evaluation"
- "restores the old ring and row focus after persistence failure"

These look for an "Assess task" button that requires specific task data state. They are unrelated to Task 18.

## Key Design Notes

- **Fake timer pattern:** `vi.useFakeTimers({ toFake: [...] })` must exclude `queueMicrotask` to avoid breaking React 18 act(). Inside tests, `act(() => { vi.advanceTimersByTime(ms); })` fires timers synchronously (calling searchGlobal before the first `await`); `flushAsync()` flushes the resulting Promise resolutions.
- **3-point registration order:** commands in build.rs must be in exactly the same order as in generate_handler in lib.rs (verified by verify_security.py).
- **Migration 10 version assertions:** 5 files had hardcoded version=9 assertions that were updated to 10.
