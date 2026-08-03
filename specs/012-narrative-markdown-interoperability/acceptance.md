# Acceptance Criteria — Spec 012

## Export

1. `export_narrative_markdown` returns `{ file_name, markdown, warning }`.
2. `file_name` is derived from the Canvas JSON `title` field via `sanitize_file_name`.
3. `markdown` begins with `# {canvas_title}`.
4. Image blocks use `assets/{uuid}` syntax (not `asset:{uuid}`).
5. `warning` contains the lossiness notice.
6. Unknown blocks emit `> [!WARNING]\n> Unsupported Canvas block: {kind}` placeholder.
7. `rich_text` blocks are exported using `document::markdown::export` (links, tables, marks preserved).
8. `callout` blocks are exported as `> [!{VARIANT}]\n> {content}` admonition format.
9. Image blocks include caption as `*caption*` paragraph when caption is non-empty.

## Import

10. `import_narrative_markdown` creates a Canvas with exactly one scene and one rich_text block.
11. Title is derived from the sanitized file stem, not from H1 heading.
12. Import is idempotent: re-submitting the same `operation_id` returns the existing document.
13. Import fails if a Basic Leaf document already exists for the node.
14. Import fails if a Canvas already exists for the node.
15. `<script>` and other unsafe constructs cause the import to fail.
16. Asset rows are inserted into `narrative_document_assets` within the same transaction.
17. Import rolls back fully if any referenced asset is not usable.

## Preview

18. `preview_narrative_markdown` calls `document::markdown::import` to validate Markdown before returning.
19. Unsafe or malformed Markdown causes `preview_narrative_markdown` to return an error.
20. `proposed_title` matches the sanitized file stem.
21. `plain_text_excerpt` is at most 240 characters.
22. `warnings` always includes the lossiness notice.
23. `warnings` includes the asset warning when `referenced_asset_count > 0`.

## File Name Sanitization

24. Path separators (`/`, `\`, `:`) are replaced with `_`.
25. Windows reserved names and reserved stems (`CON`, `CON.txt`, `COM1.any`, `LPT9.backup`, etc.) become `narrative-canvas.md`.
26. Stem is truncated to 120 Unicode scalar values.
27. Output always ends in `.md`.
28. Control characters are stripped.

## Markdown Parsing (document::markdown::import)

29. Multi-line `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]` admonitions are parsed into callout nodes.
30. Single-line `> [!WARNING] text` and `> [!TIP] text` are parsed into callout nodes.
31. `TIP` admonition maps to `"info"` variant (within document schema constraint).
32. Callout export uses the actual variant (`> [!NOTE]`, `> [!WARNING]`, `> [!INFO]`).

## UX

33. Export button shows lossiness warning before any interaction (always visible).
34. Warning text: "Markdown preserves readable content, not Canvas block structure or layout. Image bytes are not embedded; referenced local assets must already exist."
35. Export button is visible in `NarrativeCanvasReader` when a canvas document exists.
36. "Import Markdown as Canvas" file input accepts `.md`, `text/markdown`, `text/plain`.
37. File input resets after selection to allow re-importing the same file.
38. File bytes are decoded as UTF-8 with fatal mode (rejects non-UTF-8 files).
39. Import dialog shows proposed title, excerpt, section count, and warnings.
40. Import dialog has stable operation ID per session (useRef, not freshly generated on each confirm attempt).
41. Tab/Shift+Tab focus trap keeps keyboard focus within the dialog.
42. Escape closes the import dialog (unless import is pending).
43. Overlay click closes the import dialog (unless import is pending).
44. Dialog has `aria-describedby` pointing to the warnings section.
45. Focus returns to the trigger element when the dialog closes.
46. Confirm button triggers `importNarrativeMarkdown` and navigates to the new canvas on success.
47. Import dialog shows an error alert on failure without closing.
