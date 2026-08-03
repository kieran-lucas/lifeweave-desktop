# Spec 012 — Narrative Canvas Markdown Interoperability

## Scope

**In:** Markdown export from a committed Canvas; Markdown import as a new Canvas on an empty leaf; preview/confirmation UX; shared Basic Leaf Markdown parser authority; three new IPC commands (`preview_narrative_markdown`, `import_narrative_markdown`, `export_narrative_markdown`); file name sanitization.

**Out:** Asset export/import (assets are excluded), round-trip fidelity (lossy contract), inline preview without dialog, import into existing canvas, second migration.

## Lossy Contract

Markdown does not preserve UUIDs, block types, layout, motion, or template metadata. Import always creates exactly one scene with one rich_text block.

## IPC Commands

| Command | Input | Output |
|---------|-------|--------|
| `preview_narrative_markdown` | `PreviewNarrativeMarkdownInput` | `NarrativeMarkdownPreview` |
| `import_narrative_markdown` | `ImportNarrativeMarkdownInput` | `NarrativeDocumentView` |
| `export_narrative_markdown` | `NarrativeDocumentIdInput` | `NarrativeMarkdownExport` |

## File Name Policy

Single Rust authority: `narrative::markdown::sanitize_file_name`. 120 Unicode scalar value limit; rejects Windows reserved names; replaces path separators with `_`; trims leading/trailing dots and whitespace.

## Import Authority

`import_as_canvas` delegates Markdown parsing to `document::markdown::import` (Basic Leaf authority). Unknown constructs cause the import to fail. Import is idempotent via `operation_id`.
