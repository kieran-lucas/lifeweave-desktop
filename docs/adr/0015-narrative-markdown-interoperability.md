# ADR 0015 — Narrative Canvas Markdown Interoperability

**Status:** Accepted

**Date:** 2026-08-03

---

## Context

Task 22 adds Markdown export from a committed Narrative Canvas and Markdown import as a new Canvas on an empty leaf. The core question is how to share the Markdown parsing authority between the Basic Leaf and Narrative Canvas domains without duplicating security checks or format logic.

---

## Decision

### Shared parser authority

`narrative::markdown::import_as_canvas` delegates all Markdown parsing to `document::markdown::import` (the Basic Leaf authority). This function handles size checks, security validation, and format parsing. Narrative import adds only the Canvas envelope (one scene, one rich_text block). No third Markdown implementation is introduced.

### Lossy interoperability contract

Markdown does not preserve UUIDs, block types (metric/image/callout/timeline), layout, motion, or template metadata. Import always creates exactly one scene with one rich_text block. This is explicitly documented in the lossiness warning returned by both `preview_narrative_markdown` and `export_narrative_markdown`.

### Asset syntax correction

The existing `narrative::markdown::export` used `asset:{uuid}` for image references. The Basic Leaf parser expects `assets/{uuid}` (with slash, not colon). This is corrected in Task 22. Both export and import now use `assets/{uuid}`.

### File name sanitization

A single Rust authority (`narrative::markdown::sanitize_file_name`) handles all file name sanitization: 120 scalar value limit, Windows reserved name rejection, path separator replacement, and `.md` extension normalization.

### Stateless preview

`preview_narrative_markdown` is implemented without database access. It operates on the raw Markdown text to produce a summary (proposed title, excerpt, section count, asset references, warnings) before the user commits to an import.

### Idempotent import

`import_from_markdown` reuses the `narrative_save_operations` idempotency table already in use for `create_narrative_document`. Re-submitting the same `operation_id` returns the existing document.

---

## Consequences

- No new migration required; schema stays at version 14.
- No new dependencies.
- The Basic Leaf Markdown parser is the single authority for all Markdown-to-ProseMirror conversion in the application.
- Imported canvases contain only rich_text blocks; other block types are not reconstructed from Markdown.
- Asset references in imported Markdown produce broken images (assets are not imported); this is documented in the lossiness warning.
