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

19. *(Superseded by decision 29 below: this reasoning was too strong. It rules out one
    integration, not every integration.)* Mermaid's render API returns an SVG **string**
    that the caller must insert into the document. `scripts/verify_security.py` fails the
    build if the frontend contains `innerHTML` or the React equivalent, so there is no
    supported way to place that output.
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

## Closure pass — what tracing the running system found

The decisions above were sound; three of the things built on them were not. A second pass
traced the runtime paths rather than the code's intentions and found each of these by
executing it.

### 24. A paste target is plugin state, mapped, not a position read back later

The Markdown paste route converted through IPC and then inserted with `replaceSelection`,
which resolves against the selection *at the time the promise settles*. A user who invoked
the paste and then moved the caret — an ordinary thing to do during a round trip — had the
converted content dropped into whatever they had moved to.

The intended range is now registered in the gateway plugin's state and mapped through every
intervening transaction, so it keeps pointing at the same place in the document however the
document changes underneath it. A collapsed target associates forward, so text typed while
waiting is followed rather than split. A target whose content is deleted collapses to the
deletion point. The selection is only moved to the insertion when it is still sitting at the
target — if the author moved on, taking their cursor back would be an edit they did not ask
for. Two conversions in flight each carry their own identity and land independently, and a
view destroyed while one is outstanding is left alone.

### 25. An ingestion diagnostic is not a save status

`markChanged` clears the editor's message on every edit. The paste that raises a diagnostic
*is* an edit, so the warning was cleared by its own transaction: it was never visible for a
single frame, and the "foreign image was dropped" path was therefore unreachable in practice
even where it fired.

Diagnostics now have their own state, their own live region (`role="status"`,
`aria-live="polite"`) and their own lifetime: replaced by the next diagnostic or dismissed by
the reader, never cleared by typing or by a save. Save failures keep the alert channel. The
two have different meanings and different lifetimes and cannot share one slot.

### 26. Foreign images are counted before parsing, from the clipboard event

Narrowing the image rule to `img[data-asset-id]` fixed the unsavable-document defect but
created a blind spot: a picture from a web page matches no parse rule, so ProseMirror
discards it and the repair pass — which runs after parsing — never sees an image to report.
Measured: the image vanished with `droppedImages: 0` and no diagnostic.

The count is now taken from the raw clipboard markup on the paste and drop events, before
parsing, using `DOMParser` on an inert document that is never attached to the page. Only
pictures with no `data-asset-id` at all are counted there; one that carries the attribute is
left to the repair pass, so no image is reported twice.

This deliberately does not use `transformPastedHTML`. ProseMirror resolves that prop with
`someProp`, which takes the value from the first plugin that defines one — and the view's own
props are consulted before any plugin. Tiptap already sets an identity transform there, so a
plugin can never own the hook. That was measured too: the gateway's transform was installed
and never called.

Alt text is not inserted as prose. It describes the picture rather than continuing the
sentence, and injecting it would put words in the document that the author did not write
there. The count is reported instead.

### 27. The editor's schema is asserted against the validator's

Three defects in a row had the same shape: the editor could hold something the Rust
validator refuses, and the only symptom was a bare "Save failed" naming nothing. A test now
asserts that the set of node and mark types the editor registers is exactly the set
`document::schema` accepts, in both directions.

It found a fourth on the first run: StarterKit registers an `underline` mark, binds Ctrl+U to
it, and the validator has no such mark. Pressing Ctrl+U made the document unsavable.
Underline is now disabled — Markdown has no syntax for it and the canonical schema
deliberately has no mark for it.

### 28. KaTeX is bounded against expansion and against geometry

`trust: false` was already right. `maxSize`, however, defaults to `Infinity`, so
`\rule{500em}{500em}` rendered at its stated size and displaced the document; measured at 500
em before the change and capped at 10 after it. `maxExpand` is set explicitly at its current
default rather than inherited, so a recursive macro stays bounded whatever the library's
future default becomes. The block carries a `max-block-size` as a second bound that does not
depend on the engine at all.

### 29. Mermaid: the earlier security argument was too strong *(superseded by 32–38: the deferral is closed and diagrams now render)*

Decision 19 above claimed rendering Mermaid would require weakening the security policy.
That was overstated and is corrected here. The naive integration — passing Mermaid's SVG
string to `innerHTML` — is indeed blocked by `scripts/verify_security.py`, but that is an
argument against one integration, not against all of them. Parsing the SVG with `DOMParser`
and rebuilding it through a tag and attribute allowlist into React elements is the same
technique this codebase already uses for code highlighting, and it needs no forbidden API
and no CSP change.

The blocker that was actually demonstrated is different: **Mermaid cannot be rendered or
tested in this repository's automated environment.** It requires real SVG text metrics —
`getComputedTextLength` and `getBBox` — which jsdom does not implement. Installed at
11.16.1 and driven directly, every diagram type failed at those calls; stubbing the metrics
on `SVGElement.prototype` did not reach the elements d3 measures and the render still failed,
after which the attempt was stopped rather than retried further.

The consequence is not that a diagram cannot be drawn in WebView2 — it can. It is that the
allowlist standing between Mermaid's output and the document could never be tested against
Mermaid's actual output. A sanitizer written against assumed output, for a library whose
output is the whole attack surface, is the weakest possible security posture, and shipping
one without a single test exercising it would be worse than not rendering the diagram.

Mermaid is therefore still not rendered, and the evaluation dependency was removed rather
than left in the manifest. The fence stays a `codeBlock` whose language is `mermaid`, with
the source exact, labelled, selectable and copyable, and round-tripping unchanged.

What would unblock it: a browser-based test environment for the renderer. The repository has
one — `scripts/run_windows_e2e.ps1` drives a real WebView2 — so the work is well defined:
build the allowlist renderer, and cover the allowlist, the fallback and at least one diagram
of each supported type there rather than in jsdom. That is a feature with its own spec, not
a hardening change.

### 30. Footnotes stay preserved text, for a product reason rather than a cost one

First-class footnotes were reconsidered against the seven shapes that matter, and the
fallback handles all of them: a reference with no definition, a definition with no reference,
duplicate definitions, several references to one definition, a definition placed before its
reference, and a definition holding several blocks. Every one keeps all of its text, reports
its source position, and round-trips exactly.

What first-class footnotes would add is the link between the two, and that is the part this
product does not have anywhere. Decision 10 above drops in-page anchors and reports them as
unaddressable: intra-document navigation is deliberately not a concept here. Footnotes would
be the first, which makes it a product decision about how documents are navigated rather
than a fidelity fix — and it belongs in a spec, not in a hardening pass.

One shape is worth stating because it looks like a gap and is not: a reference whose
definition is missing produces no footnote event at all — the parser leaves it as ordinary
text. Detecting it would mean scanning the source for a pattern the parser did not report,
which is the layered-scanner mistake this authority exists to avoid. It stays text, exactly
as written.

### 31. Every syntax category has one of four declared outcomes

`every_syntax_category_has_exactly_one_declared_outcome` fixes the contract for 71 categories
as `Supported`, `PreservedInertly`, `LossyWithDiagnostic` or `SafelyRejected`, deriving the
outcome from what the authority does rather than asserting it, and requiring a stable round
trip in every case. "Unsupported" is not one of the four, and no category is left ambiguous.

## Final pass — diagrams render, behind a boundary proved in a browser

### 32. Decision 29 is superseded: Mermaid renders

Decision 29 deferred diagram rendering because the sanitizer standing between the engine's
output and the document could not be tested against that engine's actual output — jsdom has
no SVG text metrics, so the engine cannot run there. That reasoning was sound about jsdom and
wrong about the repository: `scripts/run_windows_e2e.ps1` drives a real WebView2 through
`tauri-driver`, and a boundary can be proved there against output a real browser engine
produced. Diagrams are therefore rendered, and the deferral is closed.

The canonical value does not change and is not negotiable: a diagram is still
`codeBlock(language="mermaid")` holding the text the author wrote. **Nothing rendered is
persisted.** The picture is rebuilt from that text on every read, so the stored document is
identical whether or not a diagram engine exists.

### 33. The engine's output is untrusted generated markup

`mermaid` 11.16.1 (MIT) is configured once for the application, lazily, as a module-level
singleton: `securityLevel: "strict"` (encodes HTML in labels, disables click handlers),
`htmlLabels: false` so no `foreignObject` is produced, `suppressErrorRendering: true` so the
engine cannot put its own error picture into the document, `maxTextSize` at 8 000 and
`maxEdges` at 200 — both well below the library defaults of 50 000 and 500 — and
`deterministicIds` so the same source yields the same output.

None of that is the security boundary. It is a second lock on the same door. The engine
returns an SVG **string**, and a string of generated markup derived from user text is exactly
what must never be inserted.

### 34. The boundary is a rebuild, not a filter

`svgSanitizer.ts` parses the engine's output into an inert document — never attached to the
page, so nothing in it loads or runs — and builds a plain structural tree from only what is
named in an allowlist. The Reader turns that tree into elements with `createElement` and a
string tag, which can produce an element and nothing else. There is no `innerHTML`, no
raw-markup escape hatch, and no path by which markup can become markup.

Allowing rather than denying is the point: a construct this file has never heard of is
dropped by default, so the boundary does not need to be updated when an attack is invented.

- **Elements allowed**: the shapes, groups, text, gradients, markers and clip paths a diagram
  is drawn from. `foreignObject` is absent because it reopens arbitrary HTML inside the
  picture; `image` because a diagram has no reason to load a file; `a` because a diagram is
  not a navigation surface; `script`, `style`, `animate` and `use` because they act or
  dereference rather than describe.
- **Attributes allowed**: geometry and presentation only. Every `on*` handler, and `href` in
  every namespace including `xlink`, is dropped without being inspected.
- **Values** are judged by the grammar of the property they belong to, never by a list of
  dangerous spellings. Every value first passes a character gate that admits only
  `A-Za-z0-9_.,:%#()+-/` and whitespace — a backslash and an asterisk are refused, so a CSS
  escape (`u\72l(…)`) and a CSS comment (`u/**/rl(…)`) cannot be written at all — and is then
  matched against what that property actually accepts: a colour (`none`, `currentColor`, a
  hex triple/quad, a named colour from a spelled-out list, or `rgb()`/`hsl()` with numeric
  components), a local paint reference `url(#local-id)` and nothing else functional, a
  bounded opacity, a finite length with a unit from a short set, a bounded SVG transform
  list of the six defined functions with numeric arguments, path data restricted to the
  command letters and number characters SVG defines, or an enumerated keyword from that
  attribute's own vocabulary. `marker-*`, `clip-path` and `mask` accept `none` or
  `url(#local-id)` only. `font-family` is not carried across at all: a font name is a
  free-form quoted string, and the diagram's typography is owned by this product's
  stylesheet. A denial list would have to grow with every new spelling of the same request;
  an allowlist of grammars does not, so an unrecognised value is refused by construction.
- **Namespace prefixes** are ignored: matching is on `localName`, so `<x:script>` is the same
  as `<script>`.
- **Bounds fail closed**: 512 KB of output, 4 000 nodes, 64 levels of depth, 40 attributes
  per element, 8 000 characters of source. Exceeding any of them abandons the whole walk and
  returns `{ ok: false, reason }`; the Reader then shows the authored source. Nothing is
  truncated and returned as if it were the diagram, because a picture drawn from part of what
  an author wrote says something they did not write — and a Reader that stops responding is
  worse than either.

### 35. The engine's stylesheet is dropped; the diagram is styled by this product

Mermaid emits a `<style>` element, which `style-src 'self'` would refuse anyway. It is
dropped rather than parsed. A `style` **attribute** is not carried across as an attribute
either — that too would be refused — but its declarations are read, filtered to a short list
of safe presentation properties, value-checked, and handed to React as a style object, which
writes them through the CSSOM. The rest of the appearance comes from a Lifeweave stylesheet
targeting the engine's class names, so a diagram reads as part of the document rather than
importing a theme.

### 36. Failure is an ordinary outcome

A diagram that cannot be parsed, cannot be sanitized, or is larger than the bounds shows a
short reason and the source the author wrote, inside the same bounded figure. One bad diagram
does not affect the others and cannot affect the rest of the document. A result that arrives
after the source changed, or after the Reader moved on, is discarded. On success the source
stays with the picture in a disclosure, so a diagram is never the only copy of its own text.

### 37. What WebView2 proved that jsdom could not

`e2e-tests/specs/phase22-markdown-diagrams.e2e.ts` imports a Markdown file containing a
flowchart, a sequence diagram, a state diagram, a malformed diagram, an unknown diagram type,
and a diagram whose labels carry `<script>`, a remote `<img>` with an `onerror` handler, an
`<iframe>`, and a `click` directive pointing at an external URL. Against the engine's real
output in a real browser it asserts that pictures were drawn; that no `script`, `style`,
`iframe`, `object`, `embed`, `image`, `a`, `foreignObject`, `use` or `animate` element exists
inside any of them; that no `on*` handler and no `href`/`src` attribute survives; that the
window was never navigated and `window.open` never called; that no external request was made,
checked both by instrumenting `Image` and by reading the resource timeline; that the
malformed diagram shows its source; and that every diagram's source is still recoverable,
including the hostile label, which appears as the characters the author typed.

### 38. The security policy is unchanged

The content security policy is byte-for-byte what it was before this feature:
`script-src 'self'`, `style-src 'self'`, no `'unsafe-inline'`, no `'unsafe-eval'`, no remote
origins. `scripts/verify_security.py` is unchanged and passes. No forbidden API was
introduced and none was worked around.

One governance file did change: `scripts/verify_no_remote_assets.py` now lists the two W3C
**XML namespace identifiers** alongside the existing bounded-fixture entries. A namespace URI
is compared as a string by a parser and never dereferenced, and the sanitizer's fixtures must
carry the real ones to be parsed as SVG at all. That makes the check more precise about what
counts as a remote resource; it does not widen what may be loaded.

### 39. Foreign-image detection is case-insensitive

The fast path in front of the clipboard parser tested `html.includes("<img")`. HTML tag names
are case-insensitive and real clipboard markup uses every casing, so `<IMG>` — which older
office suites emit — was not counted and the picture was dropped in the silence this check
exists to prevent. The test is now `/<img\b/i`, with the parser still the authority behind it,
so text that merely contains the characters of a tag is not counted as a picture.
