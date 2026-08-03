# ADR 0011 — Narrative Canvas Production Persistence

Status: Accepted

Date: 2026-08-03

## Context

Task 21 activates the first production Narrative Canvas vertical slice. ADR 0010 selected Strategy A (domain envelope `NarrativeSemanticDocument`) as the canonical schema. This ADR records the production persistence decisions.

## Decisions

### 1. Single-scene constraint (Task 21)

The Rust schema validator enforces exactly one scene (`scenes.len() == 1`). This constraint is relaxed in a future task when multi-scene navigation is activated.

### 2. Mutual exclusion with Basic Leaf

SQL BEFORE INSERT triggers (`narrative_leaf_check_basic`, `basic_leaf_check_narrative`) prevent a life node from having both a Basic Leaf and a Narrative Canvas document. The triggers raise ABORT, keeping the canonical tables consistent without application-layer coordination.

### 3. Search indexing reuses 'reader_document' entity_kind

Migration 10's `search_documents` CHECK constraint lists allowed entity_kind values and cannot be altered without recreating the FTS virtual table. Narrative documents are indexed using `entity_kind='reader_document'` with `navigation_id=life_node_id`, routing search results through `SearchNavigationTarget::LifeReader` to the same life node reader view, which now dispatches to the Canvas Reader when a canvas exists.

### 4. Studio lazy-loaded as a separate chunk

`NarrativeCanvasStudio` (Tiptap dependency) is imported via `lazy(() => import("./NarrativeCanvasStudio"))` in the Reader. The build confirms a separate `NarrativeCanvasStudio-*.js` chunk. The Reader contains no Tiptap import.

### 5. Revision retention

50 revisions retained (same as Basic Leaf). `REVISION_RETENTION = 50`.

## Consequences

- Narrative Canvas is available on any active Life leaf with no existing Basic Leaf document.
- Mutual exclusion is enforced at the SQL trigger level (not application level).
- Search integration is transparent: users find canvas content via the same global search as Basic Leaf documents.
