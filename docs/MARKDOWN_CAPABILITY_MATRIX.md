# Markdown capability matrix

What this product does with each Markdown construct, in each direction. "Markdown" is not
one format, so this file names the contract instead of implying a universal one.

Authority: `src-tauri/src/document/markdown` (import and export), `document::schema`
(canonical validation). Every row is exercised by
`src-tauri/src/document/markdown/regression.rs` against
`src-tauri/src/document/fixtures/markdown_stress_corpus.md`.

The four outcomes below are not prose. `every_syntax_category_has_exactly_one_declared_outcome`
fixes 71 categories to exactly one of `Supported`, `PreservedInertly`, `LossyWithDiagnostic`
or `SafelyRejected`, derives each from what the authority actually does, and requires a
stable round trip in every case. "Unsupported" is not one of the four.

## How to read the columns

- **Canonical** — the node or mark the construct becomes, or how it is preserved.
- **Reader / Editor** — what each surface does with that node.
- **Round trip** — `exact` means `import(export(canonical)) == canonical`. Every supported
  row is `exact`; the corpus is cycled four times to prove it is a fixed point, not a lucky
  first pass.
- **Diagnostic** — the `kind` reported with a one-based line and column when the construct
  cannot be represented as itself.

## Tier A — the declared contract

Production-grade. A regression here is a defect.

| Construct | Canonical | Reader | Editor | Round trip |
|---|---|---|---|---|
| ATX heading H1–H3 | `heading.level` | `h1`–`h3` with anchor | yes | exact |
| ATX heading H4–H6 | `heading.level: 3` | `h3` | yes | folded, disclosed |
| Setext heading | `heading.level` 1–2 | `h1`/`h2` | yes | exact, emitted as ATX |
| Paragraph | `paragraph` | `p` | yes | exact |
| Soft break | space | inline | yes | exact |
| Hard break (2 spaces or `\`) | `hardBreak` | `br` | yes | exact, emitted as 2 spaces |
| Strong / emphasis | `bold` / `italic` mark | `strong` / `em` | yes | exact |
| Strikethrough | `strike` mark | `s` | yes | exact |
| Inline code | `code` mark | `code` | yes | exact |
| Nested marks | mark set per text node | nested elements | yes | exact |
| Fenced code (backtick or tilde) | `codeBlock` | highlighted `pre` | yes | exact, emitted as backticks |
| Fence info string | `codeBlock.language` | `language-…` class | yes | first word only, if identifier-shaped |
| Indented code | `codeBlock` | highlighted `pre` | yes | exact, emitted as a fence |
| Nested fences | wider outer fence | `pre` | yes | exact |
| Thematic break (`---`, `***`, `___`, `- - -`) | `horizontalRule` | `hr` | yes | exact, emitted as `---` |
| Bullet list | `bulletList` | `ul` | yes | exact |
| Ordered list | `orderedList` | `ol` | yes | exact |
| Ordered start ≠ 1 | `orderedList.start` | `ol start` | yes | exact |
| `)` list delimiter | `orderedList` | `ol` | yes | normalized to `.`; kept distinct from an adjacent list |
| Two adjacent lists | two list nodes | two lists | yes | exact — the second uses the alternate marker |
| Nested lists (8+ levels) | nested nodes | nested lists | yes | exact |
| Loose / tight list | items normalized to blocks | list | yes | exact |
| Task list | `taskList` / `taskItem.checked` | read-only checkbox | interactive | exact |
| Mixed task and plain items | `taskList` holding both | box only where stored | yes | exact — a plain item gains no checkbox |
| Blockquote, nested | `blockquote` | `blockquote` | yes | exact |
| GFM alert / `[!INFO]` / one-line form | `callout.variant` | `aside` | yes | exact |
| Table | `table` / `tableRow` / `tableHeader` / `tableCell` | `table` | yes | exact |
| Table alignment | cell `align` | `text-align` | yes | exact |
| Pipe inside a cell's code or link | escaped on export | as stored | yes | exact — the row keeps its columns |
| Ragged table row | padded to the header width | `table` | yes | exact |
| Link (`http`, `https`, `mailto`) | `link` mark | `a` with `rel=noreferrer` | yes | exact |
| Reference link / autolink | resolved `link` mark | `a` | yes | exact, emitted inline |
| Link target with a space or parens | `link.href` | `a` | yes | exact — emitted in angle form |
| Local image `assets/{uuid}` | `image.assetId` | `img` from the asset store | yes | exact |
| Image alt containing `]` or a newline | `image.alt` | `alt` | yes | exact — escaped, newline becomes a space |
| Backslash escapes | decoded text | text | yes | exact — re-escaped on export |
| Character references | decoded text | text | yes | exact — a literal `&amp;` is re-escaped |
| Unicode: Vietnamese, CJK, RTL, combining, ZWJ emoji | text | text | yes | exact, byte for byte |
| CRLF / lone CR | normalized to LF | text | yes | exact |
| Byte-order mark | stripped | — | — | the first block is a block, not text |
| Long lines, unbroken tokens, wide tables | text / nodes | scrolled in their own container | yes | exact |
| Malformed input (unclosed emphasis, stray delimiters) | literal text | text | yes | exact |

## Tier B — represented, with a stated limit

| Construct | Canonical | Reader | Editor | Round trip |
|---|---|---|---|---|
| Syntax highlighting | not stored; derived from `language` | 37 common languages | plain source | n/a — presentation only |
| Inline math `$…$` | `inlineMath.source` | typeset, source in the a11y tree | shows the source | exact |
| Display math `$$…$$` | `mathBlock.source` | typeset block | shows the source | exact |
| Invalid math | source unchanged | source shown in the error style | shows the source | exact |
| Mermaid fence | `codeBlock.language: mermaid` | drawn diagram, source in a disclosure | plain source | exact |

Limits, stated rather than implied:

- Math cannot be typed directly. `$…$` has no input rule because it fires against currency
  text, which is what this product's documents contain. Math arrives by import or by
  Markdown paste, and a formula is changed by replacing it.
- Math carries no marks. `**$x$**` keeps the formula and loses the bold.
- Diagrams are drawn by `mermaid` 11.16.1, but nothing it produces is stored: the canonical
  value stays the fence, and the picture is rebuilt from that text on every read. The engine's
  SVG is never inserted — it is parsed inert and rebuilt through the allowlist in
  `svgSanitizer.ts`, whose boundary is proved against the engine's real output in a real
  WebView2 by `e2e-tests/specs/phase22-markdown-diagrams.e2e.ts`. See ADR 0052 §32–38.
- Diagram bounds: 8 000 characters of source, 200 edges, 512 KB of engine output, 4 000 nodes,
  64 levels of depth, 40 attributes per element. Exceeding any of them shows the source.
- A diagram is not interactive. `click` directives, links and remote images are removed at the
  boundary, so a diagram can never navigate or fetch.
- The editor shows a diagram's source rather than the picture, as it does for math.
- Code over 40 000 characters is not tokenized, and an unknown language renders as plain code.

## Tier C — preserved, disclosed, never silently reinterpreted

Each of these has no node in the Core schema. None of them refuses the document.

| Construct | Outcome | Diagnostic |
|---|---|---|
| Footnote reference | literal `[^label]` text | `footnote` |
| Footnote definition | blocks kept, label as leading text | `footnote` |
| Footnote reference with no definition | literal text, unchanged | none — the parser reports no footnote, so nothing scans for one |
| Duplicate footnote definitions | each kept in source order with its label | `footnote` per definition |
| Several references to one definition | each kept as text | `footnote` per reference |
| Underline (`<u>`, Ctrl+U) | not offered by the editor and not a mark | n/a — see ADR 0052 §27 |
| YAML / TOML front matter | inert `codeBlock`, verbatim | `front_matter` |
| Relative link, in-page anchor, protocol-relative target | link text kept, target dropped | `link_target` |
| Inline HTML tag | tag dropped, surrounding text kept | `html_markup` |
| `<br>` | `hardBreak` — an exact equivalent, so it is supported rather than degraded | none |
| HTML block carrying text | inert `codeBlock`, verbatim | `html_markup` |
| HTML block carrying no text | dropped | `html_markup` |
| Definition list, superscript, subscript | literal text | none — the extensions are off, so the syntax is prose |
| Pandoc attributes, MkDocs admonitions, CriticMarkup, containers | literal text | none — prose, and it round-trips as prose |

## Refused before commit

The import fails and the stored document is not changed. The author is told their file
carries active content rather than having it quietly removed.

| Input | Reason |
|---|---|
| `<script>`, `<iframe>`, `<style>`, `<object>`, `<embed>`, `<applet>`, `<form>`, `<meta>`, `<base>`, `<link>`, `<svg>`, `<math>`, `<noscript>`, `<template>` | executes, loads or restyles |
| Any `on…=` handler attribute | executes |
| `javascript:`, `vbscript:`, `data:text/html` in markup | executes |
| A link scheme other than `http`, `https`, `mailto` | not an allowed target |
| An image target that is not `assets/{uuid}` | remote load or path traversal |
| MDX module syntax, `{%…%}`, `{/*…*/}` outside code | template execution |
| An unclosed code fence | swallows the rest of the file |
| Markdown over `MAX_MARKDOWN_BYTES` | bound |

The same strings **inside a code fence or a code span are prose** and import normally: what
counts as code is decided from parser events, never from a scan over the text.

## Ingestion routes

| Route | Semantics | Authority |
|---|---|---|
| `.md` file import | strict UTF-8 decode, then the Rust authority | `import_reader_markdown` |
| Markdown paste (Ctrl/Cmd+Shift+V) | clipboard text verbatim, then the Rust authority | `convert_markdown_fragment` |
| Plain paste | literal text; no syntax is interpreted | ProseMirror |
| Rich HTML paste | parsed against the schema, then repaired | `transformPasted` → `ingestion.ts` |
| Drag and drop | same as rich paste | `transformPasted` → `ingestion.ts` |
| Typing | input rules for the constructs the toolbar offers | Tiptap |
| Narrative Canvas import | the same Rust authority | `import_narrative_markdown` |

File import and Markdown paste call the same function, so they cannot disagree. The gateway
enforces the canonical contract on everything else, so no route can produce a document the
backend would refuse at commit time.
