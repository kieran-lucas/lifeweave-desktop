# ADR 0052 — Markdown ingestion gateway, math as canonical source, and rendered code

- Status: Accepted for the Markdown system upgrade
- Date: 2026-08-16
- Decision owner: Product Owner request activating the Markdown system upgrade
- Builds on: ADR 0051 (CommonMark/GFM import fidelity and diagnostics)

## Context

ADR 0051 made `document::markdown` the single Markdown authority and hardened import and
export against each other. Tracing the whole system afterwards found that the authority was
only reached through one door. Everything else about Markdown in this product — what happens
when content is pasted, what the editor is allowed to hold, what the Reader does with a
fenced block — was either unowned or disagreed with the authority.

Four classes of defect were found by tracing rather than by report.

**Nothing owned the clipboard.** There was no `handlePaste`, `transformPasted` or drop
handler anywhere in the frontend, so pasted content entered through ProseMirror's defaults
against the Tiptap schema, which is wider than the canonical schema Rust enforces at commit
time. A picture copied from a web page became an `image` node with `assetId: null`; every
later save then failed validation and reported only "Save failed", with nothing naming the
node responsible. A pasted `<pre><code class="language-…">` could set a language of any
length, with the same result. Text pasted as Markdown stayed literal, so the same document
meant one thing imported from a file and another pasted from the clipboard.

**The editor lost meaning through its own clipboard.** The `callout` node rendered
`data-callout` but never read it back, so copying a warning callout and pasting it produced
a note. The document said something different afterwards and nothing reported the change.

**The exporter did not always describe the document it came from.** A pipe inside inline
code or a link target in a table cell ended the cell early and added a column. A link target
containing a space ended at the space, so the link and its text re-imported as literal
punctuation. A literal `&amp;` typed by an author was written back unescaped and re-imported
as a bare `&`. Two adjacent lists written with the same marker merged into one on re-import,
so the second list's items inherited the first list's numbering. A list holding both task
items and ordinary items gave every item a checkbox.

**Whole documents were refused over constructs that could have been kept.** Footnotes were
parsed only in order to reject the file, which made ordinary academic and technical Markdown
unimportable; front matter was not recognized at all, so its delimiters parsed as a rule and
a setext heading and a file's configuration silently became a heading in its prose.

## Decision

### The ingestion gateway is a first-class subsystem

1. `frontend/src/features/life/document/ingestion.ts` is the one place content entering the
   editor from outside is made to satisfy the canonical contract. Every rule in it mirrors
   one rule in `src-tauri/src/document/schema.rs`; they are the same contract read from both
   ends. **The editor must not be able to produce a document the backend would refuse.**
2. `IngestionGateway` in `extensions.ts` installs it as `transformPasted`, which ProseMirror
   applies to clipboard HTML and to drops alike, so no fragment enters through a path the
   clipboard rules never saw.
3. A node that cannot be stored is removed and reported; a node whose attribute is out of
   contract keeps the node and loses the attribute. Nothing is changed silently: the editor
   surfaces what the gateway did in the status line it already had.
4. An image is parsed only from `img[data-asset-id]`. A foreign picture is therefore not an
   image node at all, and the repair pass refuses it a second time.

### The paste policy is declared, not inferred

5. **Plain text stays literal.** Reinterpreting typed characters as syntax is the surprising
   behaviour, not the helpful one, and a paste that silently converts is unrecoverable.
6. **Rich HTML is untrusted input.** It is parsed against the schema — which has no HTML
   node — and then repaired. No clipboard markup is ever stored or rendered as markup.
7. **Ctrl/Cmd+Shift+V declares "this text is Markdown."** It sends the clipboard text
   verbatim to `convert_markdown_fragment`, a new command that runs the same
   `import_with_diagnostics` as file import and commits nothing. Parity between the two
   routes is therefore structural rather than tested into existence: they are one function.
   The intent is recorded from the keystroke because a paste event carries no modifier state.

### Math is a canonical node holding its source

8. `inlineMath` and `mathBlock` are schema nodes carrying `attrs.source` — the TeX the
   author wrote. **Nothing rendered from a formula is ever persisted.** The validator
   refuses a source that carries the delimiter which would close it, because such a value
   could not be written back out as the same node.
9. The change is additive: no stored row is rewritten, no migration is added and
   `SCHEMA_VERSION` stays 1, matching how `code`, `strike`, `horizontalRule` and `taskList`
   were added before it.
10. Enabling math delimiters changes what a `$` means, so `$` is escaped on export. Evidence
    from the parser shows ordinary currency is already safe — `$1200 and $300` and
    `Total: $1,200.00` stay text — but `a$b$c` would not be, and `\$` renders as `$` in every
    CommonMark tool, so the escape costs nothing but source aesthetics.
11. The editor shows the stored source; the Reader typesets it. Both read the same attribute,
    so they cannot drift. A formula is replaced by retyping it rather than through an editing
    surface that would have to agree with the source by construction. There is deliberately
    **no input rule** for math: `$…$` fires against currency text, which is exactly the
    content this product holds.

### Fenced code is highlighted from a token tree, never from markup

12. `lowlight` 3.3.0 (MIT, over `highlight.js` 11.12.0, MIT) is asked for a hast token tree,
    which `CodeView` turns into React elements. No HTML string reaches the DOM, so no
    raw-markup escape hatch is needed — `scripts/verify_security.py` forbids one — and the
    tokens carry class names only, so no inline style is needed either, which the
    `style-src 'self'` policy would refuse.
13. Colours are design-system tokens rather than a highlighter theme, so code reads as part
    of the document, and `forced-colors` keeps the system palette.
14. The engine is a module-level singleton loaded on first use, so grammars are compiled once
    for the app rather than per block. Blocks over 40 000 characters are not tokenized: a
    Reader that stalls on a long file is a worse outcome than one shown in a single colour.
    An unrecognized language renders as plain code — the document keeps whatever the author
    wrote in the info string.

### Math is typeset by an engine that builds DOM

15. `katex` 0.18.4 (MIT) is used through `katex.render`, which builds real DOM nodes and sets
    their geometry through the CSSOM. `renderToString` would have required inserting an HTML
    string carrying inline style attributes — forbidden by `verify_security.py` and refused
    by `style-src 'self'` respectively. KaTeX's ESM build contains no `innerHTML` at all.
16. `trust` stays off, which disables the macros that can emit a link or load a resource
    (`\href`, `\url`, `\includegraphics`). A formula can never become a navigation or network
    surface. `throwOnError` is off and the component falls back to showing the source, so an
    invalid formula cannot take the document down with it.
17. The source stays in the accessibility tree beside the typeset output, so a formula is
    never only a picture, and it survives copying the page.
18. Fonts are never inlined as `data:` URIs (`vite.config.ts`), because the production policy
    declares `font-src 'self'`, which does not match `data:`. Inlining would have silently
    stopped those glyphs loading.

### Mermaid is deferred on repository evidence, not on preference

19. Mermaid's render API returns an SVG **string** that the caller must insert into the
    document. `scripts/verify_security.py` fails the build if the frontend contains
    `innerHTML` or the React equivalent, so there is no supported way to place that output.
    Mermaid additionally injects a `<style>` element into the SVG it generates and sets
    inline style attributes on its nodes; both are subject to `style-src`, which this app
    declares as `'self'` with no `'unsafe-inline'` — and the same script fails the build if
    `unsafe-inline` is added. Rendering Mermaid would require weakening the security policy
    that governance exists to hold.
20. A `mermaid` fence therefore stays what it already is: a `codeBlock` whose language is
    `mermaid`, with the diagram source preserved exactly, labelled, selectable and copyable.
    This is a rendering gap, not a fidelity gap — the source round-trips unchanged.

### Constructs with no node are preserved and disclosed, never refused

21. A footnote reference is written back as the literal `[^label]` the author typed and its
    definition is flattened into ordinary blocks with the label as leading text, each with a
    diagnostic carrying its source position. The reference and its definition stay legible
    and stay together, and the result round-trips exactly. Refusing the document instead cost
    the author every other construct in it.
22. Front matter (`---` and `+++`) is recognized and kept verbatim as inert code with a
    diagnostic. It is configuration for another tool, never interpreted here.
23. A byte-order mark is stripped before parsing. Left in place it made the first line a
    paragraph opening with an invisible character, so a file saved by a Windows editor lost
    its title.

## Compatibility and rollback

- Every stored document remains valid. No row is rewritten, no migration is added and no
  released migration is touched. `SCHEMA_VERSION` stays 1.
- Documents written before this change contain none of the new nodes and are unaffected.
- A document containing `inlineMath` or `mathBlock` opened by an older build would fail
  validation, which is the same forward-compatibility position as `taskList` under ADR 0051.
- Rolling back the rendering decisions is removing two lazily loaded components and two
  dependencies; the canonical documents they render are unchanged by their absence, because
  the source is what is stored.

## Rejected alternatives

- **A Markdown parser on the frontend** for the paste route: a second authority is exactly
  what ADR 0051 removed, and the two would have disagreed the first time either changed.
- **Making every plain paste Markdown**: converts authored characters into syntax with no
  way back, and would have turned pasted prose containing `#` or `-` into headings and lists.
- **Shiki for highlighting**: its output is HTML carrying inline styles, which needs the raw
  markup insertion this repository forbids and the `unsafe-inline` its policy refuses.
- **MathJax**: broader TeX coverage than KaTeX, but its output path and package loading are a
  poor fit for a policy that allows neither inline style nor arbitrary resource loading, and
  its startup cost is paid by documents that contain no math.
- **Storing rendered SVG or HTML for math and diagrams**: makes a renderer's output the
  source of truth, which cannot be re-imported, re-rendered or trusted.
- **Widening `style-src` or `font-src` to make a renderer work**: weakening the security
  boundary for presentation inverts the priority the product is built on.
- **Full footnote nodes in the schema**: real linked footnotes need reference identity,
  duplicate and missing-label handling and navigation semantics. Preserving the author's text
  exactly costs nothing and loses only the link, which is disclosed.
