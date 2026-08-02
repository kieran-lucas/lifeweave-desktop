# Tasks 008 — Global Search

## Task 18 — Global Search Core + Vietnamese-Normalized Unified Retrieval

**Status:** Complete

### Deliverables

- Migration 10: search_documents, search_fts (FTS5), search_dirty_scopes, search_meta, 22 dirty triggers
- `src-tauri/src/search/`: normalize.rs, dto.rs, repository.rs, mod.rs
- `src-tauri/src/ipc/search.rs`: `search_global` command handler
- IPC registration: build.rs, lib.rs, capabilities/main.json, ipc/mod.rs
- TS bindings: 8 generated types in frontend/src/ipc/generated/
- `frontend/src/features/search/GlobalSearchDialog.tsx` (lazy default export)
- `frontend/src/features/search/GlobalSearchDialog.css.ts`
- `frontend/src/features/search/GlobalSearchDialog.test.tsx` (18 tests)
- App.tsx: Ctrl+K handler, sidebar search button, pendingNav state, search dialog integration
- TodayScreen.tsx: focusRequest prop for post-search task focus
- LifeScreen.tsx: entryRequest prop for post-search life node navigation
- ADR 0007, audit doc, specs/008-global-search/

### All tests pass

- 324 Rust tests (including 19 search-specific tests + file-backed smoke + realistic 10k/1k/5k/5k performance fixture)
- 18 GlobalSearchDialog frontend tests
- Full frontend test suite: 136 passing, 0 failed
