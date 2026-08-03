# Spec 011 — Implementation Plan

## Step 1 — Migration 11

Append to `MIGRATIONS` array in `migrations.rs`. Creates: `narrative_documents`, `narrative_document_revisions`, `narrative_document_drafts`, `narrative_save_operations`, `narrative_document_assets`. Mutual exclusion triggers (canvas↔basic leaf, canvas↔child nodes). Search dirty triggers. Update all hardcoded schema version assertions from 10 to 11.

## Step 2 — narrative/domain.rs

Constants: `SCHEMA_VERSION=1`, `MAX_JSON_BYTES=2MB`, `MAX_PLAIN_TEXT_BYTES=512KB`, `REVISION_RETENTION=50`. `NarrativeError` enum. `seed_document()` returns minimal valid JSON with one empty scene.

## Step 3 — narrative/schema.rs

Deserialize `NarrativeSemanticDocument` from canonical_json. Validate: schemaVersion==1, exactly 1 scene, all block kinds. Extract plain text and asset IDs. Return `ValidationResult { plain_text, asset_ids }`.

## Step 4 — narrative/markdown.rs

Export narrative to Markdown: title→H1, scene→H2, metric→bold label+value+unit, image→`![alt](asset:id)`, timeline→ordered list, callout→blockquote. No MDX.

## Step 5 — narrative/dto.rs

`NarrativeDocumentView`, `NarrativeDocumentProjection`, input types. All with `#[cfg_attr(test, derive(ts_rs::TS))]`.

## Step 6 — narrative/repository.rs

Mirror document/repository.rs pattern. Key: idempotency via `narrative_save_operations`. Stale check before save. Revision prune after save. Draft round-trip. Mutual exclusion and branch/child tests.

## Step 7 — narrative/service.rs

6 IPC commands using `run!` macro + `map_db` / `map` error converters.

## Step 8 — Registration

`build.rs`: 6 narrative commands alphabetically inserted.
`lib.rs`: `pub mod narrative;` + 6 imports + `generate_handler![]` entries.
`capabilities/main.json`: 6 `allow-*-narrative-*` permissions.
`ipc/mod.rs`: narrative DTO exports in `export_ipc_bindings`.

## Step 9 — TS binding generation

Run `cargo test --locked export_ipc_bindings` to generate `frontend/src/ipc/generated/Narrative*.ts` files.

## Step 10 — frontend/src/ipc/commands.ts

Add 6 narrative command functions with generated type imports.

## Step 11 — narrative/schema.ts

Frontend type definitions: `NarrativeBlock` discriminated union, `NarrativeDocument`, `parseNarrative`, `emptyRichText`, `operationId`.

## Step 12 — NarrativeCanvas.css.ts

Vanilla-extract styles. Use `globalStyle(\`${parent} .tiptap\`, {...})` for Tiptap child selectors (no `& .child` in `style()` selectors).

## Step 13 — NarrativeCanvasReader.tsx

Static reader. Props: `nodeId: string`. Parallel `useQuery` for `getNarrativeDocument`. Lazy Studio import. Draft recovery UI. All 5 block renderers.

## Step 14 — NarrativeCanvasStudio.tsx

Default export (lazy chunk). Tiptap for rich_text/callout blocks. Form inputs for metric/image/timeline. HistoryState undo/redo. Draft auto-save. Publish / Discard.

## Step 15 — BasicLeafReader integration

Add parallel `narrativeQuery`. Dispatch to `<NarrativeCanvasReader>` when canvas exists. Content chooser when neither document type exists.

## Step 16 — Tests

`NarrativeCanvasReader.test.tsx`: 8 tests. `BasicLeafReader.test.tsx`: updated for narrative integration.

## Step 17 — Verification

`cargo test --locked` → 340 pass. `pnpm verify` → all gates. `pnpm test` → 322 pass. `pnpm build` → Studio as separate chunk. `git diff --exit-code frontend/src/ipc/generated/` → no drift. `pnpm tauri build` → NSIS artifact.

## Step 18 — Documentation + commit

Create specs/011-narrative-canvas-core/, docs/adr/0011, docs/audits/task-21. Update STATUS.md and ROADMAP.md. One commit: `add narrative canvas vertical slice`. No Co-Authored-By trailer.
