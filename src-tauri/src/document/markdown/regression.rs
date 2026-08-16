//! Corpus and invariant tests for the Markdown import/export authority.
//!
//! These cover defects found by tracing the pipeline rather than by reproducing a
//! reported symptom, so each case names the invariant it protects.

use serde_json::{Value, json};

use crate::document::markdown::{export, import, import_with_diagnostics};

fn doc(content: Value) -> String {
    serde_json::to_string(&json!({"type":"doc","content":content})).unwrap()
}

fn paragraph(text: &str) -> Value {
    json!({"type":"paragraph","content":[{"type":"text","text":text}]})
}

fn marked(text: &str, marks: Value) -> Value {
    json!({"type":"paragraph","content":[{"type":"text","text":text,"marks":marks}]})
}

fn table(cell: Value) -> Value {
    json!({"type":"table","content":[
        {"type":"tableRow","content":[{"type":"tableHeader","content":[paragraph("H")]}]},
        {"type":"tableRow","content":[cell]}]})
}

#[test]
fn code_mark_wraps_inside_every_other_mark_in_any_array_order() {
    // The editor orders marks by schema rank, so `code` routinely precedes the mark it
    // must nest inside. Applying marks positionally overwrote the wrapper already built
    // and silently discarded bold, italic, strike, or a link href.
    for other in [
        json!({"type":"bold"}),
        json!({"type":"italic"}),
        json!({"type":"strike"}),
        json!({"type":"link","attrs":{"href":"https://example.com"}}),
    ] {
        let code = json!({"type":"code"});
        let leading = export(&doc(json!([marked("x", json!([code, other]))]))).unwrap();
        let trailing = export(&doc(json!([marked("x", json!([other, code]))]))).unwrap();
        assert_eq!(
            leading, trailing,
            "export must not depend on mark array order for {other}"
        );
        assert!(
            leading.contains("`x`"),
            "inline code body must survive: {leading}"
        );
        if other["type"] == "link" {
            assert!(
                leading.contains("https://example.com"),
                "the link target must survive alongside code: {leading}"
            );
        } else {
            assert_ne!(
                leading.trim(),
                "`x`",
                "the {other} wrapper must survive alongside code: {leading}"
            );
        }
    }
}

#[test]
fn hard_breaks_never_split_a_heading_or_a_table_row() {
    // Headings and GFM cells are single-line: a literal newline ends the block, so the
    // remainder silently re-imports as an unrelated paragraph.
    let heading = export(&doc(
        json!([{"type":"heading","attrs":{"level":2},"content":[
        {"type":"text","text":"before"},{"type":"hardBreak"},{"type":"text","text":"after"}]}]),
    ))
    .unwrap();
    assert!(heading.contains("before after"), "{heading}");
    let reimported: Value = serde_json::from_str(&import(&heading).unwrap()).unwrap();
    assert_eq!(reimported["content"].as_array().unwrap().len(), 1);
    assert_eq!(reimported["content"][0]["type"], "heading");

    let cell = json!({"type":"tableCell","content":[{"type":"paragraph","content":[
        {"type":"text","text":"a"},{"type":"hardBreak"},{"type":"text","text":"b"}]}]});
    let exported = export(&doc(json!([table(cell)]))).unwrap();
    assert!(exported.contains("| a b |"), "{exported}");
    let back: Value = serde_json::from_str(&import(&exported).unwrap()).unwrap();
    assert_eq!(back["content"].as_array().unwrap().len(), 1);
    assert_eq!(back["content"][0]["type"], "table");
}

#[test]
fn a_table_cell_keeps_every_block_it_holds() {
    // A GFM cell cannot hold block structure, so extra blocks fold onto the one line.
    // Rendering only the first block dropped the rest without any trace.
    let cell = json!({"type":"tableCell","content":[paragraph("first"), paragraph("second")]});
    let exported = export(&doc(json!([table(cell)]))).unwrap();
    assert!(exported.contains("first"), "{exported}");
    assert!(exported.contains("second"), "{exported}");
}

#[test]
fn paragraph_text_never_re_imports_as_a_different_block() {
    // `-`, `+` and `1.` are ordinary text mid-line but block markers at the start of one,
    // and leading indentation becomes an indented code block.
    for literal in [
        "- not a list",
        "+ not a list",
        "1. not ordered",
        "1) not ordered",
        "--- not a rule",
        "> not a quote",
        "* not a bullet",
        "# not a heading",
        "| not | a table |",
        "    not indented code",
        "~~~ not a fence",
    ] {
        let exported = export(&doc(json!([paragraph(literal)]))).unwrap();
        let back: Value = serde_json::from_str(&import(&exported).unwrap()).unwrap();
        assert_eq!(
            back["content"][0]["type"], "paragraph",
            "{literal:?} exported as {exported:?} and changed block type"
        );
        assert_eq!(
            back["content"][0]["content"][0]["text"]
                .as_str()
                .unwrap_or_default(),
            literal.trim_start(),
            "{literal:?} lost or gained characters via {exported:?}"
        );
    }
}

#[test]
fn list_items_keep_nested_blocks_instead_of_flattening_them() {
    // Every block inside an item used to collapse into the item's first paragraph, so a
    // quote, a fence, or a second paragraph lost its identity entirely.
    for (source, nested) in [
        ("- item\n\n  > quoted\n", "blockquote"),
        ("- item\n\n  ```\n  code\n  ```\n", "codeBlock"),
        ("- item\n\n  second paragraph\n", "paragraph"),
        ("- item\n\n  | A |\n  | --- |\n  | 1 |\n", "table"),
    ] {
        let first = import(source).unwrap();
        let exported = export(&first).unwrap();
        let second = import(&exported).unwrap();
        assert_eq!(
            first, second,
            "a {nested} in a list item did not survive export: {exported:?}"
        );
        let value: Value = serde_json::from_str(&second).unwrap();
        let kinds = value["content"][0]["content"][0]["content"]
            .as_array()
            .unwrap()
            .iter()
            .map(|node| node["type"].as_str().unwrap_or("?").to_owned())
            .collect::<Vec<_>>();
        assert!(
            kinds.iter().any(|kind| kind == nested),
            "expected a {nested} inside the item, found {kinds:?} from {exported:?}"
        );
    }
}

#[test]
fn nested_lists_stay_nested_and_stay_tight() {
    let first = import("- Parent\n  - Child\n    - Grandchild\n").unwrap();
    let exported = export(&first).unwrap();
    assert!(exported.contains("- Parent\n  - Child"), "{exported:?}");
    assert_eq!(import(&exported).unwrap(), first, "{exported:?}");
}

#[test]
fn ordered_list_start_and_task_state_survive_a_round_trip() {
    let first = import("4. four\n5. five\n\n- [x] done\n- [ ] todo\n").unwrap();
    assert!(first.contains("\"start\":4"), "{first}");
    let exported = export(&first).unwrap();
    assert!(exported.contains("4. four"), "{exported:?}");
    assert!(exported.contains("- [x] done"), "{exported:?}");
    assert!(exported.contains("- [ ] todo"), "{exported:?}");
    assert_eq!(import(&exported).unwrap(), first);
}

// --- Import guard -----------------------------------------------------------------
// The guard must reject what is dangerous without rejecting what merely looks dangerous
// to a line-oriented scan.

#[test]
fn quoted_markup_is_prose_and_does_not_block_the_import() {
    // The parser distinguishes a code span from real markup; a line scan cannot.
    for source in [
        "Use `<script>` carefully.",
        "Avoid `<iframe>` here.",
        "Liquid uses `{%` for tags.",
        "JSX comments look like `{/*`.",
        "```\n<script>alert(1)</script>\nimport x from 'pkg'\n```",
        "    <script>alert(1)</script>\n",
    ] {
        assert!(
            import(source).is_ok(),
            "quoted markup must import as prose: {source:?}"
        );
    }
}

#[test]
fn live_markup_and_templates_are_still_rejected() {
    for source in [
        "<script>alert(1)</script>",
        "<SCRIPT>alert(1)</SCRIPT>",
        "<iframe src=\"x\"></iframe>",
        "<style>body{display:none}</style>",
        "<object data=\"x\"></object>",
        "<div onclick=\"steal()\">x</div>",
        "<a href=\"javascript:alert(1)\">x</a>",
        "{% raw %}",
        "{/*comment*/}",
        "import x from 'package'",
        "export y from \"package\"",
    ] {
        assert!(
            import(source).is_err(),
            "live markup must be rejected: {source:?}"
        );
    }
}

#[test]
fn inert_html_degrades_with_a_diagnostic_instead_of_rejecting_the_document() {
    // An anchor target or a stray `<b>` used to cost the author their entire file. Inert
    // markup has no Core node, but the text around it is content and must survive.
    let imported = import_with_diagnostics(
        "<a id=\"top\"></a>\n\nSee the <b>bold</b> note.\n\n<div>kept text</div>\n",
    )
    .expect("inert markup must not reject the document");
    assert!(
        imported.canonical_json.contains("See the bold note."),
        "text around inline markup must survive: {}",
        imported.canonical_json
    );
    // A block that carries text keeps it verbatim as inert code rather than losing it.
    assert!(
        imported.canonical_json.contains("kept text"),
        "an HTML block's text must survive: {}",
        imported.canonical_json
    );
    assert!(
        !imported.canonical_json.contains("id=\\\"top\\\""),
        "a pure anchor target carries no text and is dropped"
    );
    // Every transformation is disclosed, with a location.
    let reported = imported
        .diagnostics
        .iter()
        .filter(|item| item.kind == "html_markup")
        .count();
    // Both anchor tags, both `<b>` tags, and the block each report at their own location.
    assert_eq!(
        reported, 5,
        "each construct must report: {:?}",
        imported.diagnostics
    );
    assert!(imported.diagnostics.iter().all(|item| item.line >= 1));
}

#[test]
fn a_line_break_tag_becomes_a_real_line_break() {
    let canonical = import("one<br>two\n").unwrap();
    assert!(canonical.contains("hardBreak"), "{canonical}");
    assert!(canonical.contains("one") && canonical.contains("two"));
}

#[test]
fn html_never_reaches_the_document_as_markup() {
    // Whatever survives import is text or inert code, never an HTML node the Reader
    // could interpret, and the schema has no node type that would render it.
    let canonical = import("<span title=\"x\">visible</span>\n").unwrap();
    assert!(canonical.contains("visible"));
    assert!(!canonical.contains("<span"), "{canonical}");
    assert!(!canonical.contains("\"html\""), "{canonical}");
}

#[test]
fn a_fence_inside_indented_code_is_content_not_a_delimiter() {
    // A fence may be indented by at most three spaces; deeper is code body, so treating
    // it as an opening delimiter rejected a perfectly valid document.
    let canonical = import("text\n\n    ```\n    still code\n").unwrap();
    assert!(canonical.contains("codeBlock"), "{canonical}");
    assert!(import("```\nunterminated\n").is_err());
}

#[test]
fn unaddressable_links_keep_their_text_and_report_the_dropped_target() {
    // Rejecting the whole document over a relative link makes ordinary Markdown files
    // unimportable, and the link text is content that must not be lost with it.
    for href in ["./other.md", "#section", "other.md", "../up.md"] {
        let source = format!("See [the note]({href}) please.");
        let imported = import_with_diagnostics(&source)
            .unwrap_or_else(|error| panic!("{href} must import: {error:?}"));
        assert!(
            imported.canonical_json.contains("the note"),
            "link text must survive for {href}"
        );
        assert!(
            !imported.canonical_json.contains("\"link\""),
            "an unusable target must not become a link mark for {href}"
        );
        let diagnostic = imported
            .diagnostics
            .iter()
            .find(|item| item.kind == "link_target")
            .unwrap_or_else(|| panic!("{href} must report a diagnostic"));
        assert!(diagnostic.fallback.contains(href), "{diagnostic:?}");
        assert!(diagnostic.line >= 1);
    }
}

#[test]
fn dangerous_link_schemes_still_fail_before_commit() {
    for href in [
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "vbscript:msgbox(1)",
        "file:///etc/passwd",
    ] {
        assert!(
            import(&format!("[x]({href})")).is_err(),
            "{href} must be rejected"
        );
    }
}

// --- Invariants over arbitrary input ----------------------------------------------

/// A deterministic byte mixer, so any failure is reproducible from its seed alone.
fn scramble(seed: u64, alphabet: &[&str], length: usize) -> String {
    let mut state = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
    let mut out = String::new();
    for _ in 0..length {
        state = state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        out.push_str(alphabet[(state >> 33) as usize % alphabet.len()]);
    }
    out
}

fn visible(canonical: &str) -> String {
    crate::document::schema::validate(canonical)
        .unwrap()
        .plain_text
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect()
}

#[test]
fn arbitrary_markdown_soup_never_panics_and_never_loses_visible_text() {
    // Exact byte idempotency is not achievable for arbitrary input: CommonMark's emphasis
    // resolution is not injective, so a mark arrangement over dense punctuation can have
    // no unambiguous spelling. What must hold regardless is that the pipeline stays on its
    // feet and never drops a character the user can see. Exact round-trip equality for
    // supported constructs is asserted by the corpus tests above.
    let alphabet = [
        "*", "**", "_", "~~", "`", "```", "[", "]", "(", ")", "|", "#", ">", "-", "+", "1.", "\\",
        "\n", "\n\n", " ", "    ", "a", "Tiếng", "😀", "---", "![", "<", "&", "[!NOTE]",
    ];
    let mut imported = 0;
    for seed in 0..3000u64 {
        let source = scramble(seed, &alphabet, 4 + (seed % 90) as usize);
        // A deterministic rejection is an acceptable outcome; a panic is not.
        let Ok(first) = import(&source) else {
            continue;
        };
        imported += 1;
        let exported = export(&first)
            .unwrap_or_else(|error| panic!("seed {seed}: export failed for {source:?}: {error:?}"));
        // Whatever was exported must be importable again: an export the app cannot read
        // back is a document the user cannot recover.
        let second = import(&exported).unwrap_or_else(|error| {
            panic!("seed {seed}: re-import failed for {exported:?}: {error:?}")
        });
        // Every visible character must survive in order. Ambiguous emphasis may degrade
        // into the literal delimiters it was written with, which adds characters; losing
        // any is silent data loss.
        let (before, after) = (visible(&first), visible(&second));
        for character in before.chars().collect::<std::collections::BTreeSet<_>>() {
            let (was, now) = (
                before.matches(character).count(),
                after.matches(character).count(),
            );
            assert!(
                now >= was,
                "seed {seed}: {character:?} occurred {was} times and now occurs {now}.\
                 \n source {source:?}\n export {exported:?}"
            );
        }
    }
    assert!(
        imported > 100,
        "the corpus must exercise the happy path, only {imported} of 500 imported"
    );
}

/// An 80 KB authored document: Vietnamese prose, tables, nested lists, emoji, code
/// fences, HTML anchor targets, in-page links and horizontal rules.
///
/// Before this pass it was rejected outright, first for its anchor tags and then for its
/// in-page links. It is kept as a fixture because real documents combine constructs in
/// ways a hand-written corpus does not.
#[test]
fn a_real_authored_document_imports_and_round_trips_without_loss() {
    let source = include_str!("../fixtures/real_world_vietnamese_program.md");
    let imported = import_with_diagnostics(source).expect("the document must import");

    // Nothing the parser rejected, and nothing rendered as markup.
    assert!(!imported.canonical_json.contains("\"html\""));
    assert!(!imported.canonical_json.contains("<a id"));

    // Prose from the start, middle and end of the file all survive.
    let plain = crate::document::schema::validate(&imported.canonical_json)
        .unwrap()
        .plain_text;
    for excerpt in [
        "CHƯƠNG TRÌNH VẬN ĐỘNG",
        "165 cm",
        "Zone 2",
        "Adherence",
        "Phụ lục",
    ] {
        assert!(plain.contains(excerpt), "{excerpt:?} was lost");
    }

    // Rules are a real node now, so they are no longer reported as a lost detail.
    assert!(
        !imported
            .diagnostics
            .iter()
            .any(|item| item.kind == "horizontal_rule")
    );

    // Every remaining fallback is disclosed rather than applied silently.
    for kind in ["html_markup", "link_target"] {
        assert!(
            imported.diagnostics.iter().any(|item| item.kind == kind),
            "expected a {kind} diagnostic"
        );
    }
    assert!(imported.diagnostics.iter().all(|item| item.line >= 1));

    // Export and re-import must reproduce the document exactly.
    let exported = export(&imported.canonical_json).unwrap();
    assert_eq!(
        import(&exported).unwrap(),
        imported.canonical_json,
        "the document changed when exported and read back"
    );
}

// --- Constructs the Core schema gained -------------------------------------------
// Each of these was previously degraded into text and reported as a fallback, which
// meant an ordinary Markdown file produced a wall of warnings.

#[test]
fn a_horizontal_rule_is_a_node_and_not_a_line_of_text() {
    let imported = import_with_diagnostics("before\n\n---\n\nafter\n").unwrap();
    let document: Value = serde_json::from_str(&imported.canonical_json).unwrap();
    assert_eq!(document["content"][1]["type"], "horizontalRule");
    assert!(
        imported.diagnostics.is_empty(),
        "{:?}",
        imported.diagnostics
    );
    let exported = export(&imported.canonical_json).unwrap();
    assert!(exported.contains("\n---\n"), "{exported:?}");
    assert_eq!(import(&exported).unwrap(), imported.canonical_json);
}

#[test]
fn a_paragraph_of_dashes_is_still_text_and_not_a_rule() {
    // The exporter escapes a leading `-`, so literal text cannot become a rule and a
    // rule cannot decay into text.
    let canonical = doc(json!([paragraph("---")]));
    let exported = export(&canonical).unwrap();
    let back: Value = serde_json::from_str(&import(&exported).unwrap()).unwrap();
    assert_eq!(back["content"][0]["type"], "paragraph");
    assert_eq!(back["content"][0]["content"][0]["text"], "---");
}

#[test]
fn task_state_survives_a_round_trip_as_a_real_checkbox() {
    let imported = import_with_diagnostics("- [ ] open\n- [x] done\n").unwrap();
    let document: Value = serde_json::from_str(&imported.canonical_json).unwrap();
    assert_eq!(document["content"][0]["type"], "taskList");
    assert_eq!(
        document["content"][0]["content"][0]["attrs"]["checked"],
        false
    );
    assert_eq!(
        document["content"][0]["content"][1]["attrs"]["checked"],
        true
    );
    assert!(
        imported.diagnostics.is_empty(),
        "{:?}",
        imported.diagnostics
    );
    let exported = export(&imported.canonical_json).unwrap();
    assert_eq!(exported, "- [ ] open\n- [x] done\n");
    assert_eq!(import(&exported).unwrap(), imported.canonical_json);
}

#[test]
fn a_task_list_keeps_nested_blocks_like_any_other_list() {
    let first = import("- [x] done\n\n  note under it\n\n- [ ] open\n").unwrap();
    let exported = export(&first).unwrap();
    assert_eq!(import(&exported).unwrap(), first, "{exported:?}");
    assert!(exported.contains("- [x] done"), "{exported:?}");
}

#[test]
fn a_fence_keeps_its_language() {
    let imported = import_with_diagnostics("```js\nconst x = 1;\n```\n").unwrap();
    let document: Value = serde_json::from_str(&imported.canonical_json).unwrap();
    assert_eq!(document["content"][0]["attrs"]["language"], "js");
    assert!(
        imported.diagnostics.is_empty(),
        "{:?}",
        imported.diagnostics
    );
    let exported = export(&imported.canonical_json).unwrap();
    assert!(exported.starts_with("```js\n"), "{exported:?}");
    assert_eq!(import(&exported).unwrap(), imported.canonical_json);
}

#[test]
fn only_a_language_shaped_info_word_is_stored() {
    // The value becomes a `language-…` class name in the Reader, so anything else is
    // tooling metadata and is dropped rather than stored.
    let stored = import("```js title=\"a.js\"\nx\n```\n").unwrap();
    assert!(stored.contains("\"language\":\"js\""), "{stored}");
    assert!(!stored.contains("title"), "{stored}");
    let rejected = import("```<script>\nx\n```\n").unwrap();
    assert!(!rejected.contains("language"), "{rejected}");
}

#[test]
fn table_alignment_survives_a_round_trip() {
    let source = "| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |\n";
    let imported = import_with_diagnostics(source).unwrap();
    let document: Value = serde_json::from_str(&imported.canonical_json).unwrap();
    let header = &document["content"][0]["content"][0]["content"];
    assert_eq!(header[0]["attrs"]["align"], "left");
    assert_eq!(header[1]["attrs"]["align"], "center");
    assert_eq!(header[2]["attrs"]["align"], "right");
    // The body row carries the column's alignment too, not just the header.
    let body = &document["content"][0]["content"][1]["content"];
    assert_eq!(body[2]["attrs"]["align"], "right");
    assert!(
        imported.diagnostics.is_empty(),
        "{:?}",
        imported.diagnostics
    );
    let exported = export(&imported.canonical_json).unwrap();
    assert!(exported.contains("| :--- | :---: | ---: |"), "{exported:?}");
    assert_eq!(import(&exported).unwrap(), imported.canonical_json);
}

#[test]
fn an_ordinary_document_reports_no_fallbacks_at_all() {
    // This is the whole point of widening the schema: the constructs below are what a
    // normal Markdown file is made of, and none of them should cost the reader a warning.
    let source = "# Title\n\nText with **bold** and `code`.\n\n---\n\n\
                  - [ ] open\n- [x] done\n\n\
                  ```rust\nfn main() {}\n```\n\n\
                  | A | B |\n| :--- | ---: |\n| 1 | 2 |\n\n\
                  > [!NOTE]\n> A note.\n\n\
                  1. one\n2. two\n";
    let imported = import_with_diagnostics(source).unwrap();
    assert!(
        imported.diagnostics.is_empty(),
        "an ordinary document must import cleanly, got {:?}",
        imported.diagnostics
    );
    assert_eq!(
        import(&export(&imported.canonical_json).unwrap()).unwrap(),
        imported.canonical_json
    );
}

#[test]
fn a_rule_occupies_one_top_level_node_so_heading_anchors_do_not_drift() {
    // Reader anchors are derived from a heading's index among the top-level nodes
    // (`outline.ts::headingIdForSourceIndex`), so a rule must not change that count.
    let document: Value =
        serde_json::from_str(&import("# One\n\n---\n\n# Two\n").unwrap()).unwrap();
    let kinds = document["content"]
        .as_array()
        .unwrap()
        .iter()
        .map(|node| node["type"].as_str().unwrap_or("?"))
        .collect::<Vec<_>>();
    assert_eq!(kinds, ["heading", "horizontalRule", "heading"]);
}

// ---------------------------------------------------------------------------------------
// Round-trip fidelity defects found by tracing the exporter against its own importer.
// Each one silently changed what the document said; a stable canonical form is the proof.
// ---------------------------------------------------------------------------------------

/// The invariant every case below is held to: exporting a canonical document and importing
/// the result must produce the same canonical document.
fn assert_round_trips(canonical: &str) -> String {
    let markdown = export(canonical).unwrap();
    let reimported = import(&markdown).unwrap();
    assert_eq!(
        reimported, canonical,
        "export did not describe the document it came from.\nmarkdown: {markdown:?}"
    );
    markdown
}

#[test]
fn a_pipe_inside_a_table_cell_does_not_add_a_column() {
    // A GFM row ends a cell at every unescaped pipe, and inline code and link targets are
    // written verbatim. A pipe in either one tore the cell in half and shifted the row.
    let cell = json!({"type":"tableCell","content":[{"type":"paragraph","content":[
        {"type":"text","text":"a|b","marks":[{"type":"code"}]},
        {"type":"text","text":" and "},
        {"type":"text","text":"x","marks":[{"type":"link","attrs":{"href":"https://example.com/?a=1|2"}}]}]}]});
    let canonical = import(&export(&doc(json!([table(cell)]))).unwrap()).unwrap();
    let value: Value = serde_json::from_str(&canonical).unwrap();
    let row = &value["content"][0]["content"][1];
    assert_eq!(
        row["content"].as_array().unwrap().len(),
        1,
        "the row gained a column: {canonical}"
    );
    assert_round_trips(&canonical);
}

#[test]
fn a_link_target_holding_a_space_stays_a_link() {
    // A bare destination ends at the first space, so the link — and its text — re-imported
    // as literal punctuation. The angle-bracket form has no such boundary.
    let canonical = doc(json!([marked(
        "label",
        json!([{"type":"link","attrs":{"href":"https://example.com/a b(c)"}}])
    )]));
    let markdown = assert_round_trips(&canonical);
    assert!(
        markdown.contains('<'),
        "expected an angle destination: {markdown}"
    );
}

#[test]
fn a_literal_character_reference_is_not_decoded_on_the_way_back_in() {
    // The parser decodes `&amp;` to `&`, so an author who typed the reference itself got a
    // bare ampersand back. An ampersand that opens nothing is left alone.
    let canonical = doc(json!([paragraph(
        "wrote &amp; meant it; Fish & Chips; A&B; &notaref"
    )]));
    let markdown = assert_round_trips(&canonical);
    assert!(markdown.contains("\\&amp;"), "{markdown}");
    assert!(markdown.contains("Fish & Chips"), "{markdown}");
}

#[test]
fn a_dollar_sign_in_prose_does_not_become_a_formula() {
    // Math delimiters are live now, so a paragraph that mentions two amounts would have
    // re-imported with the text between them turned into a formula.
    let canonical = doc(json!([paragraph("a$b$c costs $1,200 or $5")]));
    assert_round_trips(&canonical);
}

#[test]
fn an_empty_code_block_does_not_grow_a_blank_line() {
    let canonical = doc(json!([{"type":"codeBlock"}]));
    assert_round_trips(&canonical);
}

#[test]
fn image_alt_text_cannot_end_the_image_early() {
    let canonical = doc(json!([{"type":"image","attrs":{
        "assetId":"00000000-0000-7000-8000-000000000001",
        "alt":"a] (b) c"}}]));
    assert_round_trips(&canonical);
}

#[test]
fn a_byte_order_mark_does_not_swallow_the_first_block() {
    // Left in place the mark makes the first line a paragraph opening with an invisible
    // character, so a file saved by a Windows editor lost its title.
    let with_mark = import("\u{FEFF}# Title\n\nBody").unwrap();
    assert_eq!(with_mark, import("# Title\n\nBody").unwrap());
}

// ---------------------------------------------------------------------------------------
// Constructs the Core schema has no node for. The contract is that they are preserved and
// disclosed, never silently reinterpreted and never a reason to refuse the whole document.
// ---------------------------------------------------------------------------------------

#[test]
fn a_footnote_costs_its_link_but_never_the_document() {
    let imported = import_with_diagnostics(
        "A claim[^src] and another[^2].\n\n[^src]: The note.\n\n[^2]: Second note.\n",
    )
    .unwrap();
    let plain = crate::document::schema::validate(&imported.canonical_json)
        .unwrap()
        .plain_text;
    for expected in [
        "A claim[^src] and another[^2].",
        "[^src]: The note.",
        "[^2]: Second note.",
    ] {
        assert!(plain.contains(expected), "lost {expected:?} from {plain:?}");
    }
    assert_eq!(
        imported
            .diagnostics
            .iter()
            .filter(|item| item.kind == "footnote")
            .count(),
        4,
        "every marker and every definition is disclosed: {:?}",
        imported.diagnostics
    );
    assert_round_trips(&imported.canonical_json);
}

#[test]
fn front_matter_is_kept_verbatim_as_inert_code() {
    // Without the metadata extension the delimiters parsed as a rule and a setext heading,
    // so a file's configuration silently became a heading in its prose.
    for source in [
        "---\ntitle: Hello\ntags: [a, b]\n---\n\n# Body\n",
        "+++\ntitle = \"Hello\"\n+++\n\n# Body\n",
    ] {
        let imported = import_with_diagnostics(source).unwrap();
        let value: Value = serde_json::from_str(&imported.canonical_json).unwrap();
        assert_eq!(value["content"][0]["type"], "codeBlock", "{source:?}");
        assert_eq!(value["content"][1]["type"], "heading", "{source:?}");
        assert!(
            imported
                .diagnostics
                .iter()
                .any(|item| item.kind == "front_matter")
        );
        assert_round_trips(&imported.canonical_json);
    }
}

// ---------------------------------------------------------------------------------------
// Math. The stored value is the TeX the author wrote; nothing rendered from it is ever
// persisted, and a formula can never open a markup or navigation surface.
// ---------------------------------------------------------------------------------------

#[test]
fn math_is_stored_as_its_source_and_survives_every_container() {
    let imported = import_with_diagnostics(
        "Inline $E = mc^2$ here.\n\n\
         $$\n\\int_0^1 x^2\\,dx\n$$\n\n\
         - list $a_1$ item\n\n\
         > quote $b_2$ end\n\n\
         | H |\n| --- |\n| $c_3$ |\n",
    )
    .unwrap();
    let value: Value = serde_json::from_str(&imported.canonical_json).unwrap();
    let serialized = serde_json::to_string(&value).unwrap();
    assert_eq!(
        serialized.matches("\"inlineMath\"").count(),
        4,
        "{serialized}"
    );
    assert_eq!(value["content"][1]["type"], "mathBlock");
    assert_eq!(value["content"][1]["attrs"]["source"], "\\int_0^1 x^2\\,dx");
    assert!(
        imported.diagnostics.is_empty(),
        "math is represented, not degraded: {:?}",
        imported.diagnostics
    );
    assert_round_trips(&imported.canonical_json);
}

#[test]
fn display_math_splits_the_paragraph_it_interrupts_without_losing_either_side() {
    let canonical = import("before $$a+b$$ after").unwrap();
    let value: Value = serde_json::from_str(&canonical).unwrap();
    let kinds = value["content"]
        .as_array()
        .unwrap()
        .iter()
        .map(|node| node["type"].as_str().unwrap_or("?"))
        .collect::<Vec<_>>();
    assert_eq!(kinds, ["paragraph", "mathBlock", "paragraph"]);
    assert_round_trips(&canonical);
}

#[test]
fn a_formula_cannot_carry_a_delimiter_that_would_close_it() {
    // The source reaches a renderer verbatim, so a value that could not be written back
    // out as the same node is a corrupt document rather than a formula.
    for raw in [
        r#"{"type":"doc","content":[{"type":"inlineMath","attrs":{"source":"a$b"}}]}"#,
        r#"{"type":"doc","content":[{"type":"inlineMath","attrs":{"source":"a\nb"}}]}"#,
        r#"{"type":"doc","content":[{"type":"mathBlock","attrs":{"source":"a$$b"}}]}"#,
        r#"{"type":"doc","content":[{"type":"inlineMath","attrs":{"source":""}}]}"#,
        r#"{"type":"doc","content":[{"type":"inlineMath"}]}"#,
    ] {
        assert!(
            crate::document::schema::validate(raw).is_err(),
            "must be refused: {raw}"
        );
    }
    // Markup inside a formula is formula text like any other; it is never markup, because
    // no stage between here and the renderer treats the source as HTML.
    let imported = import("$\\text{<script>alert(1)</script>}$").unwrap();
    assert!(imported.contains("script"), "{imported}");
    assert_round_trips(&imported);
}

// ---------------------------------------------------------------------------------------
// The whole corpus, held to the contract as one document.
// ---------------------------------------------------------------------------------------

#[test]
fn the_stress_corpus_imports_round_trips_and_keeps_every_construct_it_declares() {
    let source = include_str!("../fixtures/markdown_stress_corpus.md");
    let imported = import_with_diagnostics(source).unwrap();
    let value: Value = serde_json::from_str(&imported.canonical_json).unwrap();
    let serialized = serde_json::to_string(&value).unwrap();
    let plain = crate::document::schema::validate(&imported.canonical_json)
        .unwrap()
        .plain_text;

    // Every construct the product declares supported is present as its own node or mark.
    for expected in [
        "\"heading\"",
        "\"paragraph\"",
        "\"bulletList\"",
        "\"orderedList\"",
        "\"listItem\"",
        "\"taskList\"",
        "\"taskItem\"",
        "\"blockquote\"",
        "\"callout\"",
        "\"codeBlock\"",
        "\"horizontalRule\"",
        "\"table\"",
        "\"tableHeader\"",
        "\"tableCell\"",
        "\"image\"",
        "\"hardBreak\"",
        "\"inlineMath\"",
        "\"mathBlock\"",
        "\"bold\"",
        "\"italic\"",
        "\"strike\"",
        "\"code\"",
        "\"link\"",
        "\"language\":\"rust\"",
        "\"language\":\"python\"",
        "\"language\":\"mermaid\"",
        "\"align\":\"left\"",
        "\"align\":\"center\"",
        "\"align\":\"right\"",
        "\"checked\":true",
        "\"checked\":false",
        "\"variant\":\"warning\"",
        "\"variant\":\"info\"",
        "\"start\":4",
    ] {
        assert!(serialized.contains(expected), "corpus lost {expected}");
    }

    // Text the author wrote is still text, whatever the parser made of the syntax near it.
    for expected in [
        "Tiếng Việt có dấu",
        "rent is $1200",
        "snake_case_identifier",
        "<script>alert(1)</script>",
        "flowchart LR",
        "still shown verbatim",
        "[^src]: The supporting note.",
        "unclosed strong",
        "inline tag",
    ] {
        assert!(plain.contains(expected), "corpus lost {expected:?}");
    }

    // Deep nesting survives to the depth the corpus declares.
    let mut node = value["content"]
        .as_array()
        .unwrap()
        .iter()
        .find(|node| node["type"] == "bulletList")
        .unwrap();
    let mut depth = 1;
    while let Some(nested) = node["content"][0]["content"]
        .as_array()
        .and_then(|blocks| blocks.iter().find(|block| block["type"] == "bulletList"))
    {
        node = nested;
        depth += 1;
    }
    assert_eq!(depth, 8, "nested list depth changed: {depth}");

    // Only constructs with no node in the schema are disclosed, and each says which.
    let kinds: std::collections::BTreeSet<&str> = imported
        .diagnostics
        .iter()
        .map(|item| item.kind.as_str())
        .collect();
    assert_eq!(
        kinds,
        ["footnote", "heading_depth", "html_markup", "link_target"]
            .into_iter()
            .collect()
    );
    for diagnostic in &imported.diagnostics {
        assert!(
            diagnostic.line >= 1 && !diagnostic.fallback.is_empty(),
            "{diagnostic:?}"
        );
    }

    assert_round_trips(&imported.canonical_json);
}

#[test]
fn the_stress_corpus_is_stable_under_repeated_export_and_import() {
    // One stable round trip can still hide a form that drifts on the next pass, so the
    // corpus is cycled until it would have to be a fixed point to keep passing.
    let mut canonical = import(include_str!("../fixtures/markdown_stress_corpus.md")).unwrap();
    for cycle in 0..4 {
        let next = import(&export(&canonical).unwrap()).unwrap();
        assert_eq!(next, canonical, "drifted on cycle {cycle}");
        canonical = next;
    }
}

#[test]
fn two_adjacent_lists_stay_two_lists() {
    // CommonMark ends a list only at a different marker, so writing both with the same one
    // merged them: the second list's items joined the first and inherited its numbering.
    for (first, second) in [
        ("bulletList", "bulletList"),
        ("orderedList", "orderedList"),
        ("taskList", "bulletList"),
    ] {
        let item = |kind: &str| match kind {
            "taskList" => json!({"type":"taskItem","attrs":{"checked":false},
                "content":[paragraph("b")]}),
            _ => json!({"type":"listItem","content":[paragraph("a")]}),
        };
        let canonical = doc(json!([
            {"type": first, "content": [item(first)]},
            {"type": second, "content": [item(second)]},
        ]));
        let markdown = export(&canonical).unwrap();
        let value: Value = serde_json::from_str(&import(&markdown).unwrap()).unwrap();
        assert_eq!(
            value["content"].as_array().unwrap().len(),
            2,
            "{first} then {second} merged into one list: {markdown:?}"
        );
    }
}

#[test]
fn a_plain_item_beside_task_items_does_not_gain_a_checkbox() {
    // A list becomes a task list as soon as one item carries a checkbox, so an ordinary
    // item can sit beside task items. Giving it one turned a note into an unfinished task.
    let canonical = import("- [x] done\n- an ordinary note\n").unwrap();
    let value: Value = serde_json::from_str(&canonical).unwrap();
    let items = value["content"][0]["content"].as_array().unwrap();
    assert_eq!(items[0]["type"], "taskItem");
    assert_eq!(items[1]["type"], "listItem", "{canonical}");

    let markdown = export(&canonical).unwrap();
    assert!(markdown.contains("- an ordinary note"), "{markdown:?}");
    assert!(!markdown.contains("- [ ] an ordinary note"), "{markdown:?}");
    assert_eq!(import(&markdown).unwrap(), canonical);
}

#[test]
fn a_ragged_row_is_padded_rather_than_left_short() {
    // A row with fewer cells than the header would export a row of a different width, and
    // a row with more would carry cells the table has no column for.
    let canonical = import("| A | B |\n| --- | --- |\n| 1 |\n| 1 | 2 | 3 |\n").unwrap();
    let value: Value = serde_json::from_str(&canonical).unwrap();
    for row in value["content"][0]["content"].as_array().unwrap() {
        assert_eq!(row["content"].as_array().unwrap().len(), 2, "{canonical}");
    }
    assert_round_trips(&canonical);
}

#[test]
fn the_narrative_canvas_reaches_the_same_authority_and_accepts_what_it_produces() {
    // Narrative rich text is validated by `document::schema`, so a construct the Markdown
    // authority can produce has to be storable there too. A node added for Basic Leaf that
    // Narrative refused would make the shared authority a fiction.
    let source = "# Title\n\nInline $E = mc^2$ and a rule.\n\n$$\n\\sum_i i\n$$\n\n---\n\n\
                  - [x] done\n- plain\n\n```rust\nfn main() {}\n```\n";
    let canvas = crate::narrative::markdown::import_as_canvas(
        "00000000-0000-7000-8000-000000000001",
        "00000000-0000-7000-8000-000000000002",
        "00000000-0000-7000-8000-000000000003",
        "notes.md",
        "Fallback",
        source,
    )
    .expect("the shared authority must produce canvas-storable content");
    assert!(canvas.contains("inlineMath"), "{canvas}");
    assert!(canvas.contains("mathBlock"), "{canvas}");
    assert!(canvas.contains("taskItem"), "{canvas}");
    assert!(canvas.contains("horizontalRule"), "{canvas}");
    crate::narrative::schema::validate(&canvas, None).expect("canvas schema must accept it");
}

#[test]
fn a_file_with_windows_line_endings_imports_as_the_same_document() {
    // A fixture's line endings are not a stable contract — git normalizes them — so the
    // Windows form is asserted directly. Display math is the case that mattered: the
    // parser hands its source through verbatim, so a carriage return survived on every
    // line of a formula, invisible in the source and enough to reopen the block on export.
    let unix = "# Title\n\nBody with $x^2$ inline.\n\n$$\n\\int_0^1 x\\,dx\n$$\n\n- item\n";
    let windows = unix.replace('\n', "\r\n");
    assert_eq!(import(&windows).unwrap(), import(unix).unwrap());
    assert_round_trips(&import(&windows).unwrap());
}
