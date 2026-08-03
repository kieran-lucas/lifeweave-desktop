# ADR 0013 — Narrative Canvas Final Acceptance Remediation

**Status:** Accepted

**Date:** 2026-08-03

---

## Context

Task 21 closed six P1 defects in ADR 0012, but a second review identified three remaining P1 blocking issues:

1. **Unknown blocks not lossless.** `parseNarrative` returned `{ kind, id }` for unknown block kinds, discarding all other fields. A round-trip through parse/save would silently drop arbitrary content produced by newer clients.

2. **Dual-content conflict hidden.** `BasicLeafReader` silently routed to `NarrativeCanvasReader` whenever `narrativeQuery.data?.document` was truthy, without detecting the pathological state where both a Basic Leaf document and a Canvas document exist for the same leaf. No alert was shown and no recovery path was offered.

3. **Frontend codec normalizes instead of rejects.** `parseNarrative` accepted wrong `templateVersion`, wrong `layoutPreset`/`atmosphere`/`motionPreset` values, and wrong scene count silently, substituting defaults via `String()` coercion or hard-coded constants rather than throwing.

---

## Decision

### Migration 13

Append Migration 13 (never edit Migrations 11 or 12) with six BEFORE UPDATE guard triggers:

- `narrative_life_node_move_guard` — narrative canvas cannot be reparented to a different life node while active
- `reader_life_node_move_guard` — basic leaf document cannot be reparented while active
- `narrative_restore_node_active_guard` — restoring a canvas requires the life node to be active
- `narrative_restore_uniqueness_guard` — restoring a canvas fails if another active canvas already exists for that node
- `reader_restore_node_active_guard` — restoring a basic leaf document requires the life node to be active
- `reader_restore_uniqueness_guard` — restoring a basic leaf document fails if another active document already exists

### Lossless unknown block model

`UnknownNarrativeBlock` gains a `canonical: Readonly<Record<string, unknown>>` field holding the entire raw object verbatim. `canonicalId` and `uiKey` are derived from the raw object's `id` field.

`ParsedNarrativeBlock = NarrativeBlock | UnknownNarrativeBlock` replaces the previous closed-union approach for blocks that flow through parse. `isUnknownBlock()` is the type guard. `NarrativeDocument = ParsedNarrativeDocument` is kept as an alias for backward compatibility.

### Explicit serializer

`serializeNarrative(doc: ParsedNarrativeDocument): string` replaces direct `JSON.stringify`. Known blocks emit only their V1 fields; unknown blocks emit their `canonical` object exactly. This guarantees that no extra fields creep in for known blocks and no fields are lost for unknown blocks.

### Strict parser

`parseNarrative` now throws on:
- `schemaVersion !== 1`
- `templateId !== "knowledge_dossier"`
- `templateVersion !== 1` (new — previously accepted any value)
- scene count !== 1 (new — previously accepted any non-zero count)
- `layoutPreset !== "single_column"` (new — previously substituted silently)
- `atmosphere !== "neutral"` (new)
- `motionPreset !== "none"` (new)
- non-string `title` (new)
- non-string fields on metric/image blocks (new — previously used `String()` coercion)
- non-string `variant` or invalid variant on callout (new — previously defaulted to `"note"`)
- missing or non-string item fields on timeline (new — previously substituted)

Unknown block kinds are preserved losslessly rather than rejected.

### Dual-content conflict detection

`BasicLeafReader` now checks for the conflict state (`query.data.document && narrativeQuery.data?.document`) before routing to either reader. When both documents exist, a blocking `role="alert"` is rendered with no destructive action button. Canvas-only routing (`!query.data.document && narrativeQuery.data?.document`) is the second branch.

### Studio serialization

`NarrativeCanvasStudio` replaces all `JSON.stringify(doc)` calls with `serializeNarrative(doc)` in both the save and draft paths.

---

## Consequences

- Unknown blocks produced by future client versions survive a parse/save round-trip without any field loss
- The dual-content conflict state is surfaced to the user rather than silently resolved
- The parser is an authoritative validator: any document that passes `parseNarrative` conforms to V1 schema constraints
- `serializeNarrative` is the single exit point for canonical JSON; no accidental extra fields in saved documents
- Migration 13 adds immutability guards that were architecturally implied but never enforced at DB level
- All existing databases at schema version 12 upgrade cleanly via Migration 13 (trigger-only migration, no schema changes)
