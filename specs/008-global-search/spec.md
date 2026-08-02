# Spec 008 — Global Search Core

## 1. Purpose

Provide a fast, keyboard-accessible overlay that searches committed, active Tasks, Life nodes, and Basic Leaf documents from a single input. Results are returned in under 200ms on typical datasets.

## 2. Scope

**In:** Migration 10 (search tables/triggers/dirty queue), Rust search module, `search_global` IPC command, lazy React search dialog, App.tsx keyboard shortcut and sidebar trigger, TodayScreen and LifeScreen entry request integration, TypeScript bindings.

**Out:** Semantic/vector/AI search, Tags, Backlinks, archived-result toggle, second database, heavy search library.

## 3. Data Model

### search_documents (content table)
Stores normalized search content per entity. One row per searchable entity. Fields: entity_kind, entity_id, navigation_id, title, context_text, body_text, normalized_title, normalized_context, normalized_body, local_date, original_local_date, source_updated_at.

### search_fts (FTS5 virtual table)
External-content FTS5 index over normalized_title, normalized_context, normalized_body. Tokenizer: `unicode61 remove_diacritics 2`. Prefix indexing: 2, 3, 4 chars. BM25 weights: title=10, context=3, body=1.

### search_dirty_scopes
Tracks which scope needs rebuilding: 'tasks', 'life', 'documents', or 'all'. Populated by AFTER triggers on all source tables. Cleared after a successful rebuild.

### search_meta
Algorithm version and last full rebuild timestamp.

## 4. Normalization

Input text is processed by `search::normalize::normalize()`:
- NFKD Unicode decomposition
- Remove combining marks (canonical_combining_class > 0)
- Hard-map đ/Đ → d (NFKD does not decompose d-stroke)
- Lowercase all characters
- Collapse whitespace
- Cap at 2048 characters

FTS query is built by `build_fts_expression()`:
- Normalize the raw query
- Split into tokens (max 8, max 64 chars each)
- Strip non-alphanumeric characters from each token
- Quote each token; append `*` to the last (prefix match)
- Return None if no valid tokens

## 5. Search Flow

1. Frontend sends `search_global({ query, observed_local_date })` via IPC.
2. Rust handler validates: query ≤ 200 chars, ≥ 2 normalized non-whitespace chars.
3. `search::repository::refresh_dirty_and_query()` checks dirty scopes, rebuilds as needed, runs FTS query.
4. Results are grouped: Tasks (max 8), Life (max 8), Documents (max 8). Groups with no results are omitted.
5. Returns `GlobalSearchProjection { groups, total_visible_results }`.

## 6. Navigation Targets

- One-off task → `Today { local_date, task_id, series_id: None, original_local_date: None }`
- Recurring series → resolves next occurrence date → `Today { local_date: resolved, series_id, task_id: None }`
- Task override → `Today { local_date: replacement_or_original, task_id, series_id, original_local_date: Some(...) }`
- Life node → `LifeBrowse { node_id }`
- Reader document → `LifeReader { node_id: life_node_id }`

## 7. Frontend Dialog

- Lazy-loaded default export. Activated by Ctrl+K or sidebar search button.
- APG combobox pattern: `role="combobox"`, `aria-activedescendant`, `aria-expanded`, `aria-controls`.
- Results as `role="listbox"` with group headings (aria-hidden) and `role="option"` items.
- 150ms debounce with monotone sequence counter to discard stale responses.
- Keyboard: ArrowDown/Up navigate active option; Enter activates; Escape closes and restores focus.
- Live region announces result count.
- No dangerouslySetInnerHTML; fragments rendered as `<mark>` / `<span>` elements.

## 8. Security Invariants

- No raw `invoke()` outside `commands.ts`.
- No `dangerouslySetInnerHTML`, `innerHTML`, `fetch()`, or `WebSocket` in frontend code.
- All search text fragments are parsed from STX/ETX sentinels in Rust into typed `SearchTextFragment` arrays before delivery to the frontend.
- FTS query uses parameterized MATCH (no string interpolation into SQL).
- Token sanitization in `build_fts_expression()` strips non-alphanumeric characters to prevent FTS5 operator injection.
