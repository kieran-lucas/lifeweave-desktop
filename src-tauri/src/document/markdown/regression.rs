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
