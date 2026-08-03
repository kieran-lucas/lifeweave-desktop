# Plan — Spec 012

## Approach

Reuse the Basic Leaf Markdown parser as the single authority for import. The `narrative::markdown::import_as_canvas` function delegates all Markdown parsing to `document::markdown::import`, wraps the resulting ProseMirror doc as a rich_text block, and assembles the Canvas envelope. Export extends the existing `narrative::markdown::export` with corrected asset syntax and file name sanitization.

No new migration is required. Schema stays at version 14.

## Key Decisions

- **Shared parser**: `document::markdown::import` handles all security checks and format validation. Narrative import adds only the Canvas envelope.
- **Lossy by design**: Markdown cannot represent block-type metadata, UUIDs, or layout. The lossiness warning is always included in previews and exports.
- **Preview is stateless**: `preview_narrative_markdown` requires no DB access and can be called before creating any document.
- **Idempotent import**: Reuses the `narrative_save_operations` idempotency table already in use for `create_narrative_document`.
