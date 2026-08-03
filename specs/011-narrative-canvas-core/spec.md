# Spec 011 — Narrative Canvas Core

## 1. Purpose

Activate the first production Narrative Canvas vertical slice: one persisted canvas per eligible Life leaf, mutually exclusive with Basic Leaf, with a static Reader and a lazy-loaded Studio. All five block kinds supported.

## 2. Scope

**In:** Migration 11 (narrative tables + mutual exclusion triggers + search dirty triggers), Rust narrative module, 6 IPC commands, NarrativeCanvasReader (static), NarrativeCanvasStudio (lazy Tiptap), BasicLeafReader integration, TypeScript bindings, search index extension.

**Out:** Multi-scene navigation, image upload UI, canvas template selection, canvas archiving, canvas-to-basic-leaf migration, tags, backlinks.

## 3. Data Model

### narrative_documents
One row per canvas. Fields: id, life_node_id (FK life_nodes), schema_version, revision, canonical_json, plain_text, created_at, updated_at, archived_at.

### narrative_document_revisions
Revision history. Pruned to 50 entries after each save.

### narrative_document_drafts
One draft per document (auto-replaced on each save_draft call).

### narrative_save_operations
Idempotency table keyed by operation_id. Prevents double-commit from retry races.

### narrative_document_assets
Reference-counted asset associations per document.

### Mutual exclusion triggers
- `narrative_leaf_check_basic` (BEFORE INSERT ON narrative_documents) — rejects if leaf already has a Basic Leaf document.
- `basic_leaf_check_narrative` (BEFORE INSERT ON reader_documents) — rejects if leaf already has a Narrative Canvas.
- `narrative_document_child_insert` / `narrative_document_child_move` — rejects adding an active child to a canvas leaf node.

### Search integration
Narrative documents are indexed in `search_documents` with `entity_kind='reader_document'` and `navigation_id=life_node_id`. The Migration 10 CHECK constraint on `entity_kind` is immutable; reusing `'reader_document'` avoids recreating the FTS virtual table. Search results route to `SearchNavigationTarget::LifeReader`, which dispatches to NarrativeCanvasReader when a canvas exists.

## 4. JSON Schema

`NarrativeSemanticDocument`:
```json
{
  "schemaVersion": 1,
  "documentId": "<uuid>",
  "title": "string",
  "templateId": "knowledge_dossier | strategy_dashboard",
  "scenes": [
    {
      "id": "<uuid>",
      "title": "string",
      "layoutPreset": "single_column | two_column | hero | bento",
      "atmosphere": "neutral | sky | crystal",
      "motionPreset": "none | reveal | stagger",
      "blocks": [ /* NarrativeBlock[] */ ]
    }
  ]
}
```

Exactly one scene enforced in Task 21. Block kinds: `rich_text`, `metric`, `image`, `callout`, `timeline`.

## 5. IPC Commands

- `get_narrative_document({ life_node_id })` → `NarrativeDocumentProjection`
- `create_narrative_document({ life_node_id, operation_id })` → `NarrativeDocumentView`
- `save_narrative_document({ document_id, operation_id, canonical_json, expected_revision })` → `NarrativeDocumentView`
- `save_narrative_draft({ document_id, draft_json, base_revision })` → `NarrativeDocumentProjection`
- `discard_narrative_draft({ document_id })` → `NarrativeDocumentProjection`
- `recover_narrative_draft({ document_id })` → `NarrativeDocumentView`

## 6. Frontend Architecture

`NarrativeCanvasReader` (eager) — static read-only view. Lazy-imports `NarrativeCanvasStudio` on "Edit canvas" click.

`NarrativeCanvasStudio` (lazy chunk) — Tiptap `useEditor` for rich_text/callout; form inputs for metric/image/timeline; HistoryState undo/redo (max 50 snapshots); 1000ms draft auto-save debounce; Publish / Discard actions.

`BasicLeafReader` — runs a parallel narrative query. If canvas exists, renders `<NarrativeCanvasReader>`. If neither document type exists, shows a content chooser with both "Create Basic Leaf document" and "Create Narrative Canvas" options.

## 7. Revision Retention

50 revisions retained (same as Basic Leaf). Older revisions pruned by a `DELETE ... WHERE revision NOT IN (SELECT revision ... ORDER BY revision DESC LIMIT 50)` after each successful save.
