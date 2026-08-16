# ADR 0051 — CommonMark/GFM import fidelity and diagnostics

- Status: Accepted for the Markdown fidelity remediation
- Date: 2026-08-16
- Decision owner: Product Owner request in the active remediation task

## Context

The shared Basic Leaf/Narrative Markdown authority normalized source with remark, discarded the
mdast, and then reparsed the serialized text with a line-oriented Rust parser. That parser only
recognized bold, italic, or links when the construct occupied the whole line; emitted one list node
per marker; split table cells on every pipe; and treated escapes, hard breaks, task markers, and
horizontal rules as ordinary text. The Basic Leaf UI also displayed an unconditional unsupported-
content message even though the command returned no diagnostic evidence.

## Decision

1. `document::markdown` remains the single backend import/export authority for both Basic Leaf and
   Narrative Canvas. It parses raw UTF-8 source with exact-pinned `pulldown-cmark` CommonMark plus
   the bounded GFM table, task-list, strikethrough, and alert extensions. The frontend no longer
   parses and reserializes source before IPC, so source positions and escape semantics are retained.
2. Bold, italic, safe links, inline code, and strikethrough are canonical marks. Inline code and
   strikethrough are additive schema-v1 values supported by the validator, static Reader, and the
   existing StarterKit editor; no SQLite shape or migration changes.
3. Ordered lists are one structural run, retain their start number, preserve nesting, and export
   with CommonMark-safe indentation. Tables retain cell content and inline marks, including escaped
   pipes. Hard breaks become `hardBreak`; soft breaks become spaces.
4. The Core schema still has no task-item, horizontal-rule, table-alignment, or fenced-code-language
   field. These use explicit, content-preserving fallbacks: task states become `☐`/`☒` text inside a
   normal list item; horizontal rules become `— — —`; table alignment uses the standard app table;
   fenced code keeps its body as inert code while language metadata is omitted. H4–H6 become H3.
5. Every fallback returns a structured diagnostic with kind, severity, message, one-based line and
   column, and the applied fallback. Basic Leaf displays these after commit; Narrative preview folds
   them into its existing warning list. Rejected HTML, unsafe links, non-local images, MDX modules,
   and unclosed fences fail before commit.

## Export is the same authority, held to the same contract

A second audit pass traced the export direction and the import guard, which the decisions
above had left unexamined. Both are part of this authority and are bound by the same rules.

6. Export is defined by re-import: whatever `export` emits, `import` must read back as the
   same canonical document. Serialization therefore emits each mark once around the longest
   run of nodes sharing it, never per node; treats `code` as the innermost wrapper whatever
   its position in the mark array; keeps whitespace outside emphasis delimiters; and omits
   delimiters that would have nothing to wrap. Delimiters that cannot re-parse are not
   formatting, they are literal punctuation inserted into the user's text.
7. Constructs that Markdown can only express on one line — headings and GFM table cells —
   collapse hard breaks to a space and fold multi-block table cells onto that line. A literal
   newline there silently ends the block and re-imports the remainder as unrelated content.
8. A paragraph is escaped against the block it would otherwise become: leading `-`, `+`,
   `1.`, and indentation are neutralized at the start of a line only, so ordinary hyphens and
   periods elsewhere stay untouched.
9. List items render each contained block in full and indent it to the item's content column.
   Flattening them into the item's first paragraph destroyed nested quotes, fences and tables.
10. Links that are safe but unaddressable in this app — relative paths and in-page anchors —
    keep their text, drop the mark, and report the dropped target as a diagnostic. Rejecting
    the document over them made ordinary Markdown files unimportable and discarded the link
    text along with the target. Dangerous schemes still fail before commit.

## The Core schema gained the four constructs that were degrading

Decision 4 above kept task state, horizontal rules, fenced-code language and table alignment
out of the schema and disclosed each as a fallback. That was content-preserving but it made an
ordinary Markdown file import with a wall of warnings — twenty-five of them for one file — and
left `---` as literal text and checkboxes as dead `☐` characters. Product Owner reversed it.

11. `horizontalRule`, `taskList` and `taskItem` are schema nodes; `codeBlock.language`,
    `taskItem.checked` and `tableCell`/`tableHeader` `align` are schema attributes. Names match
    the editor's own node names, so no mapping layer sits between Tiptap and canonical JSON.
12. The change is additive. No stored row is rewritten, no SQLite migration is added, and
    `SCHEMA_VERSION` stays 1, matching how `code`, `strike` and ordered-list `start` were added.
    Documents imported under the old fallbacks stay valid and keep their `— — —` and `☐` text
    until they are imported again.
13. `language` and `align` are validated against a fixed shape rather than accepted as free
    text, because `language` reaches the Reader as a `language-…` class name.
14. Checkboxes are interactive in the editor and read-only in the Reader, which is read-only
    for every other kind of content too.
15. The four diagnostic kinds `horizontal_rule`, `task_list`, `code_fence_info` and
    `table_alignment` no longer exist. Diagnostics are now reserved for what genuinely cannot
    be represented: unaddressable link targets, inert HTML, and H4–H6.

## The parser is the only Markdown scanner

Line-oriented scans layered over the parser disagreed with it, in both directions: they read
`<script>` inside an inline code span as live markup and rejected the file, and they missed a
fence opened inside a list item while seeing its closer, reporting an unclosed fence for a
document this exporter emits. Code regions, unclosed fences, and callout markers are now all
decided from what the parser reports, and callout markers are matched against raw source so an
author's escaped `\[!NOTE\]` stays literal text instead of being consumed.

## Compatibility and security

- Existing canonical documents remain valid; no stored row is rewritten.
- New `code`, `strike`, and ordered-list `start` values are additive and validated before commit.
- Executable/MDX module syntax remains rejected, and code fences remain inert. Rejection is now
  decided from parser events, so quoted markup inside a code span or fence is prose and no
  longer blocks an import.
- Embedded HTML is split by what it can do, replacing the previous blanket rejection. Markup
  that executes, loads, or restyles — `script`, `iframe`, `style`, `object`, `embed`, `applet`,
  `form`, `meta`, `base`, `link`, `svg`, `math`, `noscript`, `template`, any `on*=` handler, and
  `javascript:`/`vbscript:`/`data:text/html` targets — still fails before commit, so an author
  is told their file carries active content. Inert markup degrades instead of costing the author
  the document: an inline tag is dropped and its surrounding text kept, `<br>` becomes a real
  line break, an HTML block with no text is dropped, and an HTML block carrying text is kept
  verbatim as an inert code block. Every case reports a diagnostic with its source position.
  The security boundary is unchanged in substance: no HTML node exists in the Core schema, so
  nothing that survives an import can ever be rendered as markup — it is text or inert code.
  A blanket rejection cost a real 80 KB document over eighteen `<a id="…"></a>` anchor targets.
- Remote or traversal image targets remain rejected; only `assets/{uuid}` is accepted.
- Task and layout fallbacks preserve readable content and disclose the exact transformation rather
  than silently dropping or mutating it.

## Rejected alternatives

- Regex removal of Markdown delimiters or backslashes: corrupts legitimate literal text.
- Keeping the remark stringify → handwritten parser chain: repeats the stage that caused the bug
  and makes diagnostic source positions inaccurate.
- Adding task-list or Mermaid renderer nodes: expands the product schema and executable/rendering
  surface beyond what is needed to preserve content safely.
