# Slice 009 — Acceptance Criteria

## Core projection (10.1)

- [x] No headings → entries=[], totalHeadingCount=0, truncated=false
- [x] One heading → 1 entry, totalHeadingCount=1, truncated=false (UI hides outline, data still correct)
- [x] Two headings → 2 entries
- [x] h1/h2/h3 levels preserved; level 4+ normalized to 2
- [x] Duplicate heading labels → different positional IDs, same label
- [x] Empty heading → label "Untitled section"
- [x] Text extraction from marked nodes (bold/italic/link) — marks stripped, text retained
- [x] hardBreak normalized to space
- [x] Whitespace collapsed
- [x] Nested heading (heading inside blockquote) → ignored (top-level only)
- [x] IDs are positional: `leaf-heading-{sourceIndex}`
- [x] 256-entry cap: 300 headings → 256 entries, totalHeadingCount=300, truncated=true
- [x] 10,000-node linear fixture: completes in < 5s (typically < 1ms); O(n) algorithm
- [x] extractHeadingText: concatenation, hardBreak, marks ignored, whitespace collapse

## StaticDocument (10.2)

- [x] Heading IDs match headingIdForSourceIndex output
- [x] h1/h2/h3 rendered correctly for each level
- [x] Headings are focusable (tabIndex=-1)
- [x] Duplicate labels get different IDs
- [x] Paragraphs and other nodes unchanged (no id or tabIndex)
- [x] No Tiptap instance in static render

## Reader integration (10.3)

- [x] Outline hidden when 0 headings
- [x] Outline hidden when exactly 1 heading
- [x] Outline shown when 2+ headings
- [x] Correct labels and levels rendered in outline
- [x] Clicking outline item: scrollIntoView + focus on correct heading element (by ID)
- [x] reducedMotion=true: scrollIntoView called with "auto" behavior
- [x] aria-current="true" set on active outline button
- [x] Duplicate heading labels → distinct navigable controls with different IDs
- [x] Editing mode hides outline
- [x] Returning from committed edit shows outline with current content
- [x] Markdown import updates outline when committed document changes
- [x] Draft recovery updates outline with committed canonical JSON
- [x] Corrupt document shows no outline (parse error → error state, no nav)
- [x] Truncation notice shown when > 256 headings
- [x] Disclosure toggle: visible by default, aria-expanded=false; click shows list, label changes
- [x] Axe accessibility check passes (no critical/serious violations)

## Layout and CSS

- [x] `containerType: "inline-size"` on outlineContainer
- [x] Wide (≥520px): 2-column grid (210px | minmax(0, 1fr))
- [x] Narrow (<520px): disclosure toggle visible; list hidden by default
- [x] Sticky outline column in wide layout (no independent overflow/scrollbar)
- [x] scrollMarginTop: 1.5rem on article headings
