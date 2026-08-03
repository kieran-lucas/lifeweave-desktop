# ADR 0014 — Narrative Canvas Reader Parity and Restore Integrity

**Status:** Accepted

**Date:** 2026-08-03

---

## Context

Task 21 Closure Remediation identified two remaining structural gaps:

1. **Reduced Canvas Reader renderer.** `NarrativeCanvasReader` contained its own inline `RichTextNode` + `RichTextReader` components that rendered only a subset of the production Basic Leaf node vocabulary. The Rust validator accepts the full Basic Leaf subset (links, tables, images, callouts, all marks), but the Canvas reader silently rendered unknown nodes as a generic `<span>`, hiding content from users.

2. **Archive-bypass move/restore path.** Migration 13 blocked moving active documents but permitted: archive → change `life_node_id` → restore. The restore guards from Migration 13 did not check the root-node, branch (active-children), or cross-content-type constraints, leaving paths where restore could land a document on an illegal node.

---

## Decision

### Reader parity: route rich_text and callout islands through StaticDocument

`NarrativeCanvasReader.tsx` removes its custom `RichTextReader` and `RichTextNode` component functions. For `rich_text` and `callout` blocks, it now calls:

```tsx
const parsed = parseDocument(JSON.stringify(block.content));
return <StaticDocument document={parsed} />;
```

`parseDocument` is the authoritative Basic Leaf parser (`frontend/src/features/life/document/schema.ts`). `StaticDocument` is the authoritative static renderer for the full Basic Leaf node vocabulary.

For corrupt islands (where `parseDocument` throws), the block renders a visible placeholder without crashing the rest of the canvas.

### Migration 14: immutable life_node_id and comprehensive restore guards

Migration 14 appends:

1. **Drop old move guards** from Migration 13 (which only guarded active rows) and recreate them without the `archived_at IS NULL` condition — making `life_node_id` immutable for ALL rows.

2. **Drop old restore guards** from Migration 13 and recreate as consolidated triggers (`narrative_restore_guard_14` and `reader_restore_guard_14`) that check:
   - Life node is active and not root (`parent_id IS NULL`)
   - Life node has no active children (not a branch)
   - No competing canvas/document of the same type already active
   - No competing document of the other type (mutual exclusion)

---

## Consequences

- The full accepted Basic Leaf vocabulary (links, tables, images, Basic Leaf callouts, all marks) is rendered correctly in Canvas Reader
- Corrupt rich_text/callout islands are isolated — the rest of the canvas remains readable
- `life_node_id` is a permanent, immutable field for all document rows; no archive-bypass reparenting is possible
- The restore path is fully constrained; no document can be restored to a root, branch, or already-occupied node
- All existing databases at schema version 13 upgrade cleanly via Migration 14 (trigger-only migration)
