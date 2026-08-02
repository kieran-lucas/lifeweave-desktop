# Slice 008 — Global Search

Status: **Task 18 implemented and committed.**

Task 18 implements keyboard-accessible global search across committed Tasks, Life nodes, and Basic Leaf documents using SQLite FTS5 with Vietnamese normalization.

The search index is a fully rebuildable derived read model; canonical tables remain authoritative. A dirty-scope queue (`search_dirty_scopes`) tracks which source data has changed and triggers incremental index rebuilds on the next search request.

The overlay dialog (`GlobalSearchDialog`) is lazy-loaded and activated via Ctrl+K or the sidebar search button. Navigation from search results integrates with TodayScreen (focus on task row) and LifeScreen (entry in browse or reader mode).
