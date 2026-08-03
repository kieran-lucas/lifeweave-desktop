# Slice 009 — Basic Leaf Heading Outline: Specification

## Scope

Adds an ephemeral document heading outline to the Basic Leaf Reader. The outline is a read-only navigation aid derived entirely from the committed canonical JSON document. It is never persisted, never stored, and never sent to the Rust backend.

## Out of scope

- Outline as a Life tree node or destination
- Noteboard, Narrative Canvas, Graph, Tags, Backlinks, or any other expansion feature
- Persistent deep-link IDs or text-derived heading anchors
- Server-side indexing of headings
- New IPC commands or Rust changes
- New dependencies

## Activation condition

- Only shown in Reader mode (not editor)
- Only when the document has 2 or more top-level heading nodes

## Data model

`DocumentOutlineEntry`:
- `id: string` — positional ID `leaf-heading-{topLevelIndex}` where `topLevelIndex` is the 0-based index in the top-level content array
- `label: string` — extracted plain text from heading inline content; empty headings yield "Untitled section"
- `level: 1 | 2 | 3` — heading level; level 4+ normalized to 2
- `sourceIndex: number` — the 0-based index in `document.content`

`DocumentOutlineProjection`:
- `entries: DocumentOutlineEntry[]` — capped at 256 entries
- `totalHeadingCount: number` — true count of all headings (may exceed 256)
- `truncated: boolean` — true when `totalHeadingCount > 256`

## Heading IDs

IDs are positional: `leaf-heading-{topLevelSourceIndex}`. They are never text-derived, never URL-encoded heading text, and never guaranteed unique by content. They are deterministic given a fixed document structure.

## Layout

Wide (container ≥ 520px): 2-column CSS Grid — outline rail 210px | article minmax(0, 1fr).

Narrow (container < 520px): Collapsible disclosure toggle above the article. Toggle shows "▼ Show outline" / "▲ Hide outline".

Container queries are used (not viewport media queries). The container is `outlineContainer` with `containerType: "inline-size"`.

## Sticky positioning

In wide layout, the outline column is `position: sticky; top: 1.5rem`. NO independent overflow or scrollbar on the outline.

## Navigation behavior

Clicking an outline entry:
1. Sets `aria-current="true"` on the clicked button
2. Calls `scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })` on the heading element
3. Calls `focus({ preventScroll: false })` on the heading element

## Heading element changes

Top-level heading nodes in `StaticDocument` are given:
- `id={headingIdForSourceIndex(index)}`
- `tabIndex={-1}`
- `scrollMarginTop: "1.5rem"` (via globalStyle)

## Semantics

- `<nav aria-label="Document outline">` wraps the outline
- `<ol>` list of `<li><button>` items
- No `role="tree"`, no `dangerouslySetInnerHTML`, no text-derived IDs
- `aria-current="true"` on the active entry (not color-only)
- Disclosure toggle has `aria-expanded` and `aria-controls`

## Truncation

When `totalHeadingCount > 256`, display: "Outline limited to the first 256 sections."

## Performance

`buildDocumentOutline` is O(n) in the number of top-level nodes. 10,000-node fixture with 300 headings completes in under 5 seconds (typically < 1ms).
