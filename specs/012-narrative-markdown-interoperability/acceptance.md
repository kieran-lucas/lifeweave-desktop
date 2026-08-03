# Acceptance Criteria — Spec 012

## Export

1. `export_narrative_markdown` returns `{ file_name, markdown, warning }`.
2. `file_name` is derived from the life node title via `sanitize_file_name`.
3. `markdown` begins with `# {canvas_title}`.
4. Image blocks use `assets/{uuid}` syntax (not `asset:{uuid}`).
5. `warning` contains the lossiness notice.
6. Unknown blocks are silently omitted from the markdown.

## Import

7. `import_narrative_markdown` creates a Canvas with exactly one scene and one rich_text block.
8. Title is extracted from the first H1 heading, or falls back to the sanitized file stem.
9. Import is idempotent: re-submitting the same `operation_id` returns the existing document.
10. Import fails if a Basic Leaf document already exists for the node.
11. Import fails if a Canvas already exists for the node.
12. `<script>` and other unsafe constructs cause the import to fail.

## Preview

13. `preview_narrative_markdown` is read-only (no DB writes).
14. `proposed_title` matches the first H1 or the sanitized file stem.
15. `plain_text_excerpt` is at most 240 characters.
16. `warnings` always includes the lossiness notice.
17. `warnings` includes the asset warning when `referenced_asset_count > 0`.

## File Name Sanitization

18. Path separators (`/`, `\`, `:`) are replaced with `_`.
19. Windows reserved names (`CON`, `NUL`, etc.) become `export.md`.
20. Stem is truncated to 120 Unicode scalar values.
21. Output always ends in `.md`.

## UX

22. Export button is visible in `NarrativeCanvasReader` when a canvas document exists.
23. "Import Markdown as Canvas" file input is visible only in the empty-leaf state (no Basic Leaf document, no Canvas, both queries settled without error).
24. Import dialog shows proposed title, excerpt, section count, and warnings.
25. Escape closes the import dialog.
26. Clicking the overlay closes the import dialog.
27. Confirm button triggers `importNarrativeMarkdown` and navigates to the new canvas on success.
28. Import dialog shows an error alert on failure without closing.
