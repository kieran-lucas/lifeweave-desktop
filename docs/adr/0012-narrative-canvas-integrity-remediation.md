# ADR 0012 — Narrative Canvas Data Integrity Remediation

**Status:** Accepted

**Date:** 2026-08-03

---

## Context

Task 21 (`f1438da`) shipped a Narrative Canvas vertical slice that failed acceptance on six P1 blocking defects:

1. **No one-canvas-per-leaf enforcement at DB level.** Migration 11 had app-level triggers for mutual exclusion with Basic Leaf, but no unique index preventing two concurrent canvas rows on the same life node.
2. **Document identity chain broken.** The schema validator and save path did not verify that the JSON `documentId` matched the DB row `id` and the IPC input `document_id`.
3. **Unknown blocks silently rejected.** Any block kind not in the known set caused a validation error, making forward-compatibility impossible and preventing round-trips through newer clients.
4. **Seed document hardcoded "Untitled".** The created canvas always had `title: "Untitled"` instead of inheriting the Life node's title.
5. **TypeScript codec was a shallow cast.** `parseNarrative` did not validate document structure; it cast raw JSON to `NarrativeDocument` without checking required fields.
6. **Reader had no semantic heading structure.** The canvas document title was an `h2` inside an `article`; the spec requires `h1` with `aria-labelledby`.

---

## Decision

### Migration 12

Append Migration 12 (never edit Migration 11) with:

- `ALTER TABLE narrative_documents ADD COLUMN template_id TEXT NOT NULL DEFAULT 'knowledge_dossier'`
- `ALTER TABLE narrative_documents ADD COLUMN template_version INTEGER NOT NULL DEFAULT 1`
- `CREATE UNIQUE INDEX narrative_documents_active_life_node_uq ON narrative_documents(life_node_id) WHERE archived_at IS NULL` — enforces one-canvas-per-leaf at DB level
- `CREATE UNIQUE INDEX narrative_document_revisions_document_revision_uq ON narrative_document_revisions(document_id, revision)`
- Lookup indexes for life_node_id and (document_id, revision DESC)
- Guard triggers for: root node, inactive node, schema_version, template_id, template_version, JSON size, plain_text size, revision monotonicity
- Restore guard triggers for both narrative and Basic Leaf documents (mutual exclusion on unarchive)

### Repository layer

- `create()` queries the Life node title from the DB and passes it to `seed_document`
- `create()` checks for an existing active canvas by `life_node_id` before inserting (idempotent upsert behaviour)
- INSERT uses explicit column list including `template_id` and `template_version`
- `row()` reads `template_id` and `template_version` from DB columns (indices 7, 8)
- All SELECT queries include the two new columns

### Schema validation

- `validate(raw, Some(&id))` enforces that JSON `documentId == expected_document_id`
- Unknown block kinds are preserved in canonical_json, excluded from plain_text and assets, bounded at 64 KiB

### TypeScript codec

- `parseNarrative` validates `schemaVersion`, `templateId`, `documentId`, `scenes` array, and each block's `kind`/`id`; returns a fully typed `NarrativeDocument`
- Unknown block kinds are represented as `UnknownNarrativeBlock` and passed through as runtime-only values (closed TypeScript union preserves type safety)

### Reader semantics

- `StaticCanvasView` uses `<article aria-labelledby="nc-canvas-title">`, `<header><h1 id="nc-canvas-title">` for canvas title, and `<section aria-labelledby="nc-scene-title"><h2>` for scene title
- Unknown block kinds render a visible placeholder in the Reader

---

## Consequences

- All existing databases with schema version 11 upgrade cleanly via Migration 12 (column defaults handle existing rows)
- One-canvas-per-leaf is now a DB-level guarantee (unique partial index + trigger)
- The document identity chain (input `document_id` == DB `id` == JSON `documentId`) is enforced end-to-end
- Forward-compatibility is preserved: content produced by newer clients with unknown block kinds round-trips safely
- Reader is semantically correct for screen readers and document outline tools
