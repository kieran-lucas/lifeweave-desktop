# Task 21 — Narrative Canvas Core

**Date:** 2026-08-03
**Task:** 21 — Narrative Canvas Core Schema + Single-Scene Read/Studio Vertical Slice
**Status:** Complete

## Scope

First production Narrative Canvas vertical slice. One persisted canvas per eligible Life leaf (active, no Basic Leaf document), mutually exclusive with Basic Leaf. Static Reader + lazy-loaded Studio. All five block kinds. Search integration via existing FTS5 index. ADR 0011 records persistence decisions.

### Out of scope
Multi-scene navigation, image upload UI, canvas template selection, Narrative Canvas archiving, canvas-to-basic-leaf migration, canvas tagging/backlinks.

## Files Changed

### Rust (new)
- `src-tauri/src/narrative/mod.rs` — module root
- `src-tauri/src/narrative/domain.rs` — constants (`SCHEMA_VERSION=1`, `MAX_JSON_BYTES=2MB`, `REVISION_RETENTION=50`), `NarrativeError`, `seed_document`, helpers
- `src-tauri/src/narrative/schema.rs` — `NarrativeSemanticDocument` JSON validation; exactly-1-scene constraint; all 5 block kinds; plain text extraction; asset ID extraction; 5 unit tests
- `src-tauri/src/narrative/markdown.rs` — Markdown export (title→H1, scene→H2, metric bold, timeline ordered list, callout blockquote); 5 unit tests
- `src-tauri/src/narrative/dto.rs` — `NarrativeDocumentView`, `NarrativeDocumentProjection`, 5 input types; ts-rs derives for TS binding generation
- `src-tauri/src/narrative/repository.rs` — `get`, `create` (idempotent via `narrative_save_operations`), `save` (stale check + asset validation + revision prune), `save_draft`, `discard_draft`, `recover_draft`; 7 tests
- `src-tauri/src/narrative/service.rs` — 6 `#[tauri::command]` functions via `run!` macro

### Rust (modified)
- `src-tauri/src/infrastructure/sqlite/migrations.rs` — Migration 11 appended; hardcoded `== 10` assertions updated to `== 11` (5 locations)
- `src-tauri/src/infrastructure/sqlite/worker.rs` — schema version assertion updated to 11
- `src-tauri/src/infrastructure/backup/restore.rs` — schema version assertion updated to 11
- `src-tauri/src/infrastructure/backup/engine.rs` — schema version assertion updated to 11
- `src-tauri/src/life/edit.rs` — schema version assertion updated to 11
- `src-tauri/src/life/repository.rs` — schema version assertion updated to 11
- `src-tauri/src/search/repository.rs` — `rebuild_documents_scope_inner` extended to index narrative_documents as `entity_kind='reader_document'` with `navigation_id=life_node_id`
- `src-tauri/src/lib.rs` — `pub mod narrative;` + 6 service imports + 6 commands in `generate_handler![]`
- `src-tauri/build.rs` — 6 narrative commands added to command list
- `src-tauri/capabilities/main.json` — 6 `allow-*-narrative-*` permissions added
- `src-tauri/src/ipc/mod.rs` — narrative DTO exports in `export_ipc_bindings` test

### Migration 11 schema
```
narrative_documents
narrative_document_revisions
narrative_document_drafts
narrative_save_operations
narrative_document_assets
```
Mutual exclusion triggers: `narrative_leaf_check_basic`, `basic_leaf_check_narrative`, `narrative_document_child_insert`, `narrative_document_child_move`.
Search dirty triggers: `search_dirty_narrative_ai`, `search_dirty_narrative_au`, `search_dirty_narrative_ad`.

### Generated (cargo test export_ipc_bindings)
- `frontend/src/ipc/generated/NarrativeDocumentView.ts`
- `frontend/src/ipc/generated/NarrativeDocumentProjection.ts`
- `frontend/src/ipc/generated/NarrativeNodeInput.ts`
- `frontend/src/ipc/generated/CreateNarrativeDocumentInput.ts`
- `frontend/src/ipc/generated/SaveNarrativeDocumentInput.ts`
- `frontend/src/ipc/generated/SaveNarrativeDraftInput.ts`
- `frontend/src/ipc/generated/NarrativeDocumentIdInput.ts`

### Frontend (new)
- `frontend/src/features/life/narrative/schema.ts` — `NarrativeBlock` discriminated union, `NarrativeDocument`, `parseNarrative`, `emptyRichText`, `operationId`
- `frontend/src/features/life/narrative/NarrativeCanvas.css.ts` — vanilla-extract styles for Reader and Studio; `globalStyle` for Tiptap `.tiptap` child selector
- `frontend/src/features/life/narrative/NarrativeCanvasReader.tsx` — static reader; lazy Studio import; draft recovery banner; all 5 block renderers; `NarrativeAssetImage` via `getDocumentAsset`
- `frontend/src/features/life/narrative/NarrativeCanvasStudio.tsx` — default export (lazy chunk); Tiptap `useEditor` for rich_text/callout; form inputs for metric/image/timeline; HistoryState undo/redo; 1000ms draft auto-save; Publish/Discard actions
- `frontend/src/features/life/narrative/NarrativeCanvasReader.test.tsx` — 8 tests

### Frontend (modified)
- `frontend/src/ipc/commands.ts` — 6 narrative command functions + generated type imports
- `frontend/src/features/life/document/BasicLeafReader.tsx` — parallel `narrativeQuery`; dispatches to `<NarrativeCanvasReader>` when canvas exists; content chooser when neither exists
- `frontend/src/features/life/document/BasicLeafReader.test.tsx` — narrative mock added; empty-leaf test updated to assert both "Create Basic Leaf document" and "Create Narrative Canvas"

### Docs (new)
- `specs/011-narrative-canvas-core/README.md`
- `specs/011-narrative-canvas-core/spec.md`
- `specs/011-narrative-canvas-core/plan.md`
- `specs/011-narrative-canvas-core/acceptance.md` (32 criteria, all ✓)
- `specs/011-narrative-canvas-core/tasks.md`
- `docs/adr/0011-narrative-canvas-production-persistence.md`
- `docs/audits/task-21-narrative-canvas-core.md` (this file)

### Docs (modified)
- `docs/STATUS.md` — Task 21 section prepended
- `docs/ROADMAP.md` — Slice 011 added

## Test Evidence

**Rust:** 340 tests pass (0 failing)
- `narrative::schema::tests` — 5 tests
- `narrative::markdown::tests` — 5 tests
- `narrative::repository::tests` — 7 tests

**Frontend:** 322 tests pass (0 failing; +8 from Task 20 baseline of 314)
- `NarrativeCanvasReader.test.tsx` — 8 tests
- `BasicLeafReader.test.tsx` — 7 tests (updated for narrative integration)

## Gate Evidence

- `pnpm verify` — all governance/security gates pass
- `cargo test --locked` — 340 Rust tests pass
- `pnpm typecheck` — clean
- `pnpm test` — 322 frontend tests pass
- `pnpm build` — `NarrativeCanvasStudio-*.js` confirmed as separate lazy chunk; Reader bundle contains no Tiptap import
- `git diff --exit-code frontend/src/ipc/generated/` — no binding drift
- `pnpm tauri build` — NSIS artifact produced

## Key Design Decisions

1. **Single-scene constraint**: `scenes.len() == 1` enforced in Rust schema validator. Relaxed in a future task when multi-scene navigation is activated.
2. **Mutual exclusion at DB level**: SQL BEFORE INSERT triggers; no application-layer coordination.
3. **Search entity_kind reuse**: Migration 10's CHECK constraint on `search_documents.entity_kind` cannot be altered without recreating the FTS virtual table. Narrative documents indexed as `entity_kind='reader_document'` with `navigation_id=life_node_id`, routing via `SearchNavigationTarget::LifeReader`.
4. **Studio lazy-loaded**: Separate chunk `NarrativeCanvasStudio-*.js`; Tiptap not imported by Reader.
5. **Revision retention**: 50 revisions max (same as Basic Leaf), pruned on each save.
