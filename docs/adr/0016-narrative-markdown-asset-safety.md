# ADR 0016 — Narrative Canvas Markdown Asset Safety and Export Fidelity

**Status:** Accepted

**Date:** 2026-08-03

---

## Context

Task 22 acceptance review identified four P1 defects in the initial implementation:

1. `narrative::markdown::export` used its own `render_rich_text`/`inline_text` functions for `rich_text` and `callout` blocks, silently losing links, tables, marks, and nested structures.
2. `import_from_markdown` did not call `ensure_assets` or insert `narrative_document_assets` rows inside the transaction, leaving the asset join table inconsistent.
3. `NarrativeMarkdownImportDialog` generated a fresh `operationId` on every confirm attempt, so retry after error created a new document instead of being idempotent.
4. `preview_narrative_markdown` was stateless and did not validate Markdown, allowing unsafe or malformed input to pass preview and fail only at import.

---

## Decisions

### Export delegates to `document::markdown::export`

`narrative::markdown::render_block` now calls `crate::document::markdown::export` for `rich_text` and `callout` blocks. The private `render_rich_text`/`inline_text` helpers are removed. This makes narrative export faithful to the same rules as Basic Leaf export (links, bold, italic, tables, code blocks, headings all rendered correctly).

Callout blocks export as:
```
> [!{VARIANT}]
> content line 1
> content line 2
```

Unknown blocks export as:
```
> [!WARNING]
> Unsupported Canvas block: {safe_kind}
```

### Asset join table populated in import transaction

`import_from_markdown` now calls `ensure_assets(&tx, &valid.assets)` and inserts rows into `narrative_document_assets` within the same transaction as the canvas row. Missing assets cause a full rollback. This matches the behavior of `save_tx` and `create`.

### Stable operation ID per dialog session

`NarrativeMarkdownImportDialog` captures the operation ID in `useRef(operationId("md-import"))` on mount. All confirm attempts within the same dialog session reuse the same ID, ensuring idempotency on retry.

### Preview validates via shared parser authority

`preview_narrative_markdown` now calls `repository::preview_markdown` through the database runtime. `repository::preview_markdown` calls `document::markdown::import` to validate the Markdown and `document::schema::validate` to extract canonical stats (plain text, asset map, node count). Unsafe or malformed Markdown fails at preview. The proposed title comes from the sanitized filename stem, not from H1.

### Filename from Canvas title, not node title

`export_to_markdown` derives the filename from the Canvas JSON `title` field. Node title is not used. Fallback remains `narrative-canvas.md`.

### Pre-export warning always visible

`NarrativeMarkdownExportButton` renders the lossiness warning unconditionally before the export button. Warning text: "Markdown preserves readable content, not Canvas block structure or layout. Image bytes are not embedded; referenced local assets must already exist."

---

## Consequences

- Export fidelity matches Basic Leaf export for all supported ProseMirror node types.
- Asset join table is always consistent after import (same invariant as create and save).
- Retry after error in the import dialog is safe and idempotent.
- Preview provides the same safety guarantee as import (rejects the same unsafe Markdown).
- No migration required; schema stays at version 14.
- No new dependencies.
