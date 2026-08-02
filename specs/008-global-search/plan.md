# Plan 008 — Global Search Implementation

Implemented as Task 18. See `docs/audits/task-18-global-search.md` for the full implementation record.

## Key Decisions

**FTS5 external-content model:** `search_documents` is the canonical read model; `search_fts` is a derived virtual table with sync triggers. This allows efficient BM25 ranking without duplicating canonical data.

**Dirty-scope queue:** Source tables write to `search_dirty_scopes` via AFTER triggers. At search time, dirty scopes are rebuilt before the FTS query runs. This avoids background threads and keeps the index fresh within the same request.

**Vietnamese normalization before indexing:** NFKD decomposition + combining mark removal + đ/Đ→d hard-map normalizes Vietnamese diacritics so "viet" matches "việt". Applied at index time (stored in normalized_* columns) and at query time (via `build_fts_expression`).

**Group balancing (8 per group):** Capped at 8 results per group kind to prevent any single domain from overwhelming results. Total cap = 24 results max.

**Lazy dialog loading:** `GlobalSearchDialog` is lazy-loaded to avoid adding its bundle to the critical path. Initial load is fast; first search open incurs a small JS chunk fetch.
