# ADR 0007 — Global Search Index Architecture

**Status:** Accepted (Task 18, 2026-08-03)

## Context

Global search requires indexing Tasks, Life nodes, and Basic Leaf documents with Vietnamese diacritic normalization and ranked results. Candidate approaches considered:

1. **SQLite FTS5 with external-content table** — a derived read model with dirty-scope triggers
2. **In-process Rust search (tantivy)** — a full embedded search engine
3. **SQLite LIKE queries** — simple substring matching, no ranking

## Decision

**SQLite FTS5 with external-content content table** (`search_documents` + `search_fts`), populated by a dirty-scope queue (`search_dirty_scopes`).

Key design choices:
- `content='search_documents', content_rowid='rowid'` — FTS5 stores only the index; the authoritative text stays in `search_documents`
- `tokenize='unicode61 remove_diacritics 2'` — handles most diacritics natively; `normalize.rs` adds Vietnamese-specific đ/Đ→d and NFKD pre-processing
- Dirty-scope triggers on all source tables (tasks, task_series, task_occurrence_overrides, task_categories, life_nodes, reader_documents) queue incremental rebuilds
- BM25 weights: normalized_title=10, normalized_context=3, normalized_body=1
- STX/ETX sentinel markers in `highlight()` and `snippet()` SQL functions parsed in Rust into typed `SearchTextFragment` arrays — never sent as raw markup to the frontend

## Rationale

- **No new dependency:** FTS5 is built into SQLite which is already the persistence layer
- **Fully rebuildable:** The index is a derived read model; migration 10 bootstraps an 'all' scope entry to trigger first-run population on the next search
- **Deterministic ranking:** BM25 is a well-understood probabilistic ranking model; column weights are explicit and auditable
- **Security:** Token sanitization in `build_fts_expression()` prevents FTS5 operator injection; parameterized MATCH prevents SQL injection

## Rejected Alternatives

**tantivy:** Adds a ~5MB dependency and an out-of-process index. Overkill for an app-scale dataset of hundreds of items.

**SQLite LIKE:** No ranking, no prefix indexing, no diacritic normalization. Does not meet the relevance quality bar.

## Consequences

- Search index must be explicitly rebuilt when source data changes. The dirty-scope mechanism handles this automatically during normal app use.
- FTS5 external-content requires manual sync triggers (`search_fts_insert`, `search_fts_delete`, `search_fts_update`) on `search_documents`. These are installed in migration 10 and tested in `search::repository` tests.
- The `unicode-normalization` crate is pinned at `=0.1.25` for determinism.
