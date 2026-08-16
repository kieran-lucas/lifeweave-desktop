use std::ops::Range;

use pulldown_cmark::{
    Alignment, BlockQuoteKind, CodeBlockKind, Event, HeadingLevel, Options, Parser, Tag, TagEnd,
};
use serde_json::{Value, json};

use crate::document::{
    domain::{DocumentError, MAX_MARKDOWN_BYTES, valid_id},
    dto::MarkdownImportDiagnostic,
    schema,
};

#[derive(Debug)]
pub struct MarkdownImportResult {
    pub canonical_json: String,
    pub diagnostics: Vec<MarkdownImportDiagnostic>,
}

pub fn import_with_diagnostics(markdown: &str) -> Result<MarkdownImportResult, DocumentError> {
    validate_source(markdown)?;

    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_GFM);

    let mut builder = MarkdownBuilder::new(markdown);
    for (event, span) in Parser::new_ext(markdown, options).into_offset_iter() {
        builder.consume(event, span)?;
    }
    if !builder.frames.is_empty() || !builder.marks.is_empty() {
        return Err(DocumentError::Validation(
            "Markdown structure is unbalanced.",
        ));
    }
    builder.reject_executable_templates()?;

    let raw = serde_json::to_string(&json!({"type":"doc","content":builder.root}))
        .map_err(|_| DocumentError::Validation("Document JSON is invalid."))?;
    Ok(MarkdownImportResult {
        canonical_json: schema::validate(&raw)?.canonical_json,
        diagnostics: builder.diagnostics,
    })
}

fn validate_source(markdown: &str) -> Result<(), DocumentError> {
    if markdown.len() > MAX_MARKDOWN_BYTES {
        return Err(DocumentError::Validation("Markdown is too large."));
    }
    Ok(())
}

#[derive(Debug)]
struct Frame {
    kind: &'static str,
    attrs: Option<Value>,
    content: Vec<Value>,
    /// A literal callout marker in the source that GFM itself does not recognize,
    /// as its variant and its byte length.
    manual_callout: Option<(&'static str, usize)>,
    image_target: Option<String>,
    image_alt: String,
}

impl Frame {
    fn node(kind: &'static str, attrs: Option<Value>) -> Self {
        Self {
            kind,
            attrs,
            content: Vec::new(),
            manual_callout: None,
            image_target: None,
            image_alt: String::new(),
        }
    }

    fn into_value(self) -> Result<Value, DocumentError> {
        if self.kind == "image" {
            let target = self.image_target.ok_or(DocumentError::Validation(
                "Markdown image target is missing.",
            ))?;
            let id = target
                .strip_prefix("assets/")
                .ok_or(DocumentError::Validation(
                    "Markdown image paths must reference a local asset.",
                ))?;
            if !valid_id(id) || target.contains("..") {
                return Err(DocumentError::Validation(
                    "Markdown image identity is invalid.",
                ));
            }
            return Ok(json!({"type":"image","attrs":{"assetId":id,"alt":self.image_alt}}));
        }

        let mut object = serde_json::Map::new();
        object.insert("type".into(), json!(self.kind));
        if let Some(attrs) = self.attrs {
            object.insert("attrs".into(), attrs);
        }
        if !self.content.is_empty() {
            object.insert("content".into(), Value::Array(self.content));
        }
        Ok(Value::Object(object))
    }
}

struct MarkdownBuilder<'a> {
    source: &'a str,
    root: Vec<Value>,
    frames: Vec<Frame>,
    marks: Vec<Value>,
    diagnostics: Vec<MarkdownImportDiagnostic>,
    /// Source ranges the parser itself classified as code, inline or fenced.
    code_spans: Vec<Range<usize>>,
    /// Raw text of the HTML block currently open, if any.
    html_block: Option<String>,
    html_offset: usize,
    /// Per-column alignment of the table currently open, and the column being filled.
    column_alignments: Vec<Alignment>,
    column: usize,
}

impl<'a> MarkdownBuilder<'a> {
    fn new(source: &'a str) -> Self {
        Self {
            source,
            root: Vec::new(),
            frames: Vec::new(),
            marks: Vec::new(),
            diagnostics: Vec::new(),
            code_spans: Vec::new(),
            html_block: None,
            html_offset: 0,
            column_alignments: Vec::new(),
            column: 0,
        }
    }

    /// Drop an inline HTML tag while keeping the text around it.
    ///
    /// The tag itself has no representation in the Core schema, but the words on either
    /// side of it are the author's content and arrive as ordinary text events. `<br>` is
    /// the one tag with an exact equivalent, so it becomes a real line break.
    fn absorb_inline_html(&mut self, html: &str, offset: usize) {
        let tag = html.trim().trim_start_matches("</").trim_start_matches('<');
        let name = tag
            .split(|c: char| c.is_whitespace() || c == '>' || c == '/')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        if name == "br" {
            self.attach(json!({"type":"hardBreak"}));
            return;
        }
        self.diagnostic(
            "html_markup",
            "warning",
            "Embedded HTML is not stored by the Core schema; the surrounding text was kept.",
            offset,
            &format!(
                "Dropped the `{}` markup and preserved its text.",
                html.trim()
            ),
        );
    }

    /// Close an HTML block, preserving any text it wrapped.
    ///
    /// A block that is pure markup — an anchor target, a comment — carries nothing to keep,
    /// so it is dropped. A block holding text would lose that text if it were dropped too,
    /// so the raw block is kept verbatim as an inert code block instead.
    fn close_html_block(&mut self) {
        let Some(html) = self.html_block.take() else {
            return;
        };
        let offset = self.html_offset;
        if html_text_content(&html).trim().is_empty() {
            self.diagnostic(
                "html_markup",
                "warning",
                "An HTML block carrying no text was not stored; the Core schema has no HTML node.",
                offset,
                &format!("Dropped `{}`.", html.trim()),
            );
            return;
        }
        self.diagnostic(
            "html_markup",
            "warning",
            "An HTML block was preserved verbatim as inert code because the Core schema has no HTML node.",
            offset,
            "Kept as a code block; the markup is never rendered as HTML.",
        );
        let text = html.trim_end().to_owned();
        self.attach(json!({"type":"codeBlock","content":[{"type":"text","text":text}]}));
    }

    /// Reject template/MDX module syntax that CommonMark parses as ordinary text.
    ///
    /// The scan runs over the source with every parser-reported code range blanked out,
    /// so a construct quoted inside an inline code span or a fence stays prose. Checking
    /// per `Text` event cannot do this: inline parsing splits `{/*x*/}` around the
    /// emphasis in the middle, so no single event ever contains the marker.
    fn reject_executable_templates(&self) -> Result<(), DocumentError> {
        let mut masked: Vec<u8> = self.source.as_bytes().to_vec();
        for span in &self.code_spans {
            let end = span.end.min(masked.len());
            for byte in &mut masked[span.start.min(end)..end] {
                *byte = b' ';
            }
        }
        let masked = String::from_utf8_lossy(&masked);
        let mdx_module = masked.lines().any(|line| {
            let line = line.trim_start();
            (line.starts_with("import ") || line.starts_with("export "))
                && line.contains(" from ")
                && (line.contains('"') || line.contains('\''))
        });
        if masked.contains("{%") || masked.contains("{/*") || mdx_module {
            return Err(DocumentError::Validation(
                "Markdown contains unsafe or unsupported content.",
            ));
        }
        Ok(())
    }

    fn consume(&mut self, event: Event<'_>, span: Range<usize>) -> Result<(), DocumentError> {
        match event {
            Event::Start(tag) => self.start(tag, span)?,
            Event::End(tag) => self.end(tag)?,
            Event::Text(value) => self.push_text(&value),
            Event::Code(value) => {
                self.code_spans.push(span);
                self.marks.push(json!({"type":"code"}));
                self.push_text(&value);
                self.marks.pop();
            }
            Event::SoftBreak => self.push_text(" "),
            Event::HardBreak => self.attach(json!({"type":"hardBreak"})),
            Event::Rule => self.attach(json!({"type":"horizontalRule"})),
            Event::TaskListMarker(checked) => {
                // The marker arrives after the item has opened, so the item and the list
                // that holds it are retagged in place. In a loose list a paragraph is
                // already open on top of the item, so the item is searched for rather
                // than assumed to be the innermost frame.
                if let Some(item) = self
                    .frames
                    .iter_mut()
                    .rev()
                    .find(|frame| frame.kind == "listItem")
                {
                    item.kind = "taskItem";
                    item.attrs = Some(json!({"checked":checked}));
                }
                if let Some(list) = self
                    .frames
                    .iter_mut()
                    .rev()
                    .find(|frame| matches!(frame.kind, "bulletList" | "orderedList"))
                {
                    list.kind = "taskList";
                    list.attrs = None;
                }
            }
            Event::Html(value) => {
                reject_active_markup(&value)?;
                match &mut self.html_block {
                    Some(buffer) => buffer.push_str(&value),
                    // An HTML block outside a block frame still carries the author's text.
                    None => self.absorb_inline_html(&value, span.start),
                }
            }
            Event::InlineHtml(value) => {
                reject_active_markup(&value)?;
                self.absorb_inline_html(&value, span.start);
            }
            Event::FootnoteReference(_) => {
                return Err(DocumentError::Validation(
                    "Markdown footnote references are not supported; the document was not imported.",
                ));
            }
            Event::InlineMath(_) => {
                return Err(DocumentError::Validation(
                    "Inline math is not supported; the document was not imported.",
                ));
            }
            Event::DisplayMath(_) => {
                return Err(DocumentError::Validation(
                    "Display math is not supported; the document was not imported.",
                ));
            }
        }
        Ok(())
    }

    fn start(&mut self, tag: Tag<'_>, span: Range<usize>) -> Result<(), DocumentError> {
        let offset = span.start;
        match tag {
            Tag::Paragraph => self.frames.push(Frame::node("paragraph", None)),
            Tag::Heading { level, .. } => {
                let original = heading_level(level);
                if original > 3 {
                    self.diagnostic(
                        "heading_depth",
                        "warning",
                        "Heading depth exceeds the Core H1–H3 range.",
                        offset,
                        "Imported as H3 without losing heading text.",
                    );
                }
                self.frames.push(Frame::node(
                    "heading",
                    Some(json!({"level":original.min(3)})),
                ));
            }
            Tag::BlockQuote(kind) => {
                let variant = kind.map(callout_variant);
                let mut frame = Frame::node(
                    if variant.is_some() {
                        "callout"
                    } else {
                        "blockquote"
                    },
                    variant.map(|value| json!({"variant":value})),
                );
                // GFM alerts cover NOTE/TIP/IMPORTANT/WARNING/CAUTION but not the `[!INFO]`
                // marker this app exports, so that one marker is recognized here. The test
                // reads the raw source rather than the decoded text: an author who wrote
                // `\[!INFO\]` meant the literal characters, and matching on decoded text
                // would consume them and quietly turn their quote into a callout.
                if variant.is_none() {
                    frame.manual_callout = manual_callout_marker(&self.source[span]);
                }
                self.frames.push(frame);
            }
            Tag::CodeBlock(kind) => {
                self.code_spans.push(span.clone());
                if matches!(kind, CodeBlockKind::Fenced(_)) && !fence_is_closed(&self.source[span])
                {
                    return Err(DocumentError::Validation(
                        "Markdown code fence is not closed.",
                    ));
                }
                // Only the first word of the info string names the language; the rest is
                // tooling metadata with no meaning here.
                let language = match &kind {
                    CodeBlockKind::Fenced(info) => info
                        .split_whitespace()
                        .next()
                        .filter(|word| is_language_token(word))
                        .map(|word| json!({"language": word})),
                    CodeBlockKind::Indented => None,
                };
                self.frames.push(Frame::node("codeBlock", language));
            }
            Tag::List(start) => self.frames.push(Frame::node(
                if start.is_some() {
                    "orderedList"
                } else {
                    "bulletList"
                },
                start.map(|value| json!({"start":value})),
            )),
            Tag::Item => self.frames.push(Frame::node("listItem", None)),
            Tag::Table(alignments) => {
                // Alignment is declared once per column in the delimiter row, so it is held
                // here and stamped onto each cell as its column comes round.
                self.column_alignments = alignments;
                self.column = 0;
                self.frames.push(Frame::node("table", None));
            }
            Tag::TableHead => {
                self.column = 0;
                self.frames.push(Frame::node("tableHead", None));
            }
            Tag::TableRow => {
                self.column = 0;
                self.frames.push(Frame::node("tableRow", None));
            }
            Tag::TableCell => {
                let kind = if self.frames.iter().any(|frame| frame.kind == "tableHead") {
                    "tableHeader"
                } else {
                    "tableCell"
                };
                let align = self
                    .column_alignments
                    .get(self.column)
                    .and_then(|alignment| match alignment {
                        Alignment::Left => Some("left"),
                        Alignment::Center => Some("center"),
                        Alignment::Right => Some("right"),
                        Alignment::None => None,
                    })
                    .map(|value| json!({"align": value}));
                self.column += 1;
                self.frames.push(Frame::node(kind, align));
                self.frames.push(Frame::node("paragraph", None));
            }
            Tag::Emphasis => self.marks.push(json!({"type":"italic"})),
            Tag::Strong => self.marks.push(json!({"type":"bold"})),
            Tag::Strikethrough => self.marks.push(json!({"type":"strike"})),
            Tag::Link { dest_url, .. } => {
                let href = dest_url.to_string();
                match classify_link(&href) {
                    LinkKind::Safe => self
                        .marks
                        .push(json!({"type":"link","attrs":{"href":href}})),
                    // A relative or in-page target is not dangerous, it is simply
                    // unaddressable in this app. Rejecting the whole import over it would
                    // make ordinary Markdown files unimportable, so the link text is kept
                    // and only the unusable target is reported.
                    LinkKind::Unaddressable => {
                        self.marks.push(Value::Null);
                        self.diagnostic(
                            "link_target",
                            "warning",
                            "Link target is not addressable from this app and was not kept.",
                            offset,
                            &format!("Link text was preserved as plain text; target ‘{href}’ was dropped."),
                        );
                    }
                    LinkKind::Unsafe => {
                        return Err(DocumentError::Validation("Link scheme is not allowed."));
                    }
                }
            }
            Tag::Image { dest_url, .. } => {
                let mut frame = Frame::node("image", None);
                frame.image_target = Some(dest_url.to_string());
                self.frames.push(frame);
            }
            Tag::HtmlBlock => {
                self.html_block = Some(String::new());
                self.html_offset = offset;
            }
            Tag::MetadataBlock(_) => {
                return Err(DocumentError::Validation(
                    "Markdown metadata blocks are not supported; the document was not imported.",
                ));
            }
            Tag::FootnoteDefinition(_) => {
                return Err(DocumentError::Validation(
                    "Markdown footnote definitions are not supported; the document was not imported.",
                ));
            }
            Tag::DefinitionList | Tag::DefinitionListTitle | Tag::DefinitionListDefinition => {
                return Err(DocumentError::Validation(
                    "Markdown definition lists are not supported; the document was not imported.",
                ));
            }
            Tag::Superscript => {
                return Err(DocumentError::Validation(
                    "Markdown superscript is not supported; the document was not imported.",
                ));
            }
            Tag::Subscript => {
                return Err(DocumentError::Validation(
                    "Markdown subscript is not supported; the document was not imported.",
                ));
            }
        }
        Ok(())
    }

    fn end(&mut self, tag: TagEnd) -> Result<(), DocumentError> {
        match tag {
            TagEnd::Emphasis | TagEnd::Strong | TagEnd::Strikethrough | TagEnd::Link => {
                self.marks.pop();
            }
            TagEnd::TableCell => {
                self.close_frame()?;
                self.close_frame()?;
            }
            TagEnd::TableHead => {
                let mut frame = self.frames.pop().ok_or(DocumentError::Validation(
                    "Markdown structure is unbalanced.",
                ))?;
                frame.kind = "tableRow";
                let value = frame.into_value()?;
                self.attach(value);
            }
            TagEnd::Paragraph
            | TagEnd::Heading(_)
            | TagEnd::BlockQuote(_)
            | TagEnd::CodeBlock
            | TagEnd::List(_)
            | TagEnd::Item
            | TagEnd::Table
            | TagEnd::TableRow
            | TagEnd::Image => self.close_frame()?,
            TagEnd::HtmlBlock => self.close_html_block(),
            TagEnd::FootnoteDefinition => {
                return Err(DocumentError::Validation(
                    "Markdown footnote definitions are not supported; the document was not imported.",
                ));
            }
            TagEnd::DefinitionList
            | TagEnd::DefinitionListTitle
            | TagEnd::DefinitionListDefinition => {
                return Err(DocumentError::Validation(
                    "Markdown definition lists are not supported; the document was not imported.",
                ));
            }
            TagEnd::Superscript => {
                return Err(DocumentError::Validation(
                    "Markdown superscript is not supported; the document was not imported.",
                ));
            }
            TagEnd::Subscript => {
                return Err(DocumentError::Validation(
                    "Markdown subscript is not supported; the document was not imported.",
                ));
            }
            TagEnd::MetadataBlock(_) => {
                return Err(DocumentError::Validation(
                    "Markdown metadata blocks are not supported; the document was not imported.",
                ));
            }
        }
        Ok(())
    }

    fn close_frame(&mut self) -> Result<(), DocumentError> {
        let mut frame = self.frames.pop().ok_or(DocumentError::Validation(
            "Markdown structure is unbalanced.",
        ))?;
        if matches!(frame.kind, "listItem" | "taskItem") {
            normalize_list_item(&mut frame);
        }
        if frame.kind == "codeBlock" {
            normalize_code_block(&mut frame);
        }
        if frame.kind == "blockquote" {
            if let Some(marker) = frame.manual_callout {
                promote_manual_callout(&mut frame, marker);
            }
        }
        // A paragraph that held nothing but dropped markup — an anchor target on its own
        // line — has no content to carry. Keeping the husk would leave the document with
        // blank paragraphs the source never had, which then vanish on the next round trip.
        if frame.kind == "paragraph" && frame.content.is_empty() {
            return Ok(());
        }
        let value = frame.into_value()?;
        let image = value["type"] == "paragraph"
            && value["content"]
                .as_array()
                .is_some_and(|content| content.len() == 1 && content[0]["type"] == "image");
        if image {
            self.attach(value["content"][0].clone());
        } else {
            self.attach(value);
        }
        Ok(())
    }

    fn push_text(&mut self, value: &str) {
        if let Some(frame) = self.frames.last_mut() {
            if frame.kind == "image" {
                frame.image_alt.push_str(value);
                return;
            }
        }
        let mut node = json!({"type":"text","text":value});
        // Null entries are balance placeholders for dropped marks; they carry no formatting.
        // Nested identical emphasis (`***a*b*`) opens the same mark more than once, and
        // repeating it would leave the canonical document holding a mark set that no
        // editor can produce and that renders as pointlessly nested elements.
        let mut marks: Vec<Value> = Vec::new();
        for mark in self.marks.iter().filter(|mark| !mark.is_null()) {
            if !marks.contains(mark) {
                marks.push(mark.clone());
            }
        }
        if !marks.is_empty() {
            node["marks"] = Value::Array(marks);
        }
        self.attach(node);
    }

    fn attach(&mut self, value: Value) {
        if let Some(frame) = self.frames.last_mut() {
            if value["type"] == "text" {
                if let Some(previous) = frame.content.last_mut() {
                    if previous["type"] == "text" && previous.get("marks") == value.get("marks") {
                        let suffix = value.get("text").and_then(Value::as_str).unwrap_or("");
                        if let Some(text) = previous.get("text").and_then(Value::as_str) {
                            let mut merged = text.to_owned();
                            merged.push_str(suffix);
                            previous["text"] = json!(merged);
                            return;
                        }
                    }
                }
            }
            frame.content.push(value);
        } else {
            self.root.push(value);
        }
    }

    fn diagnostic(
        &mut self,
        kind: &str,
        severity: &str,
        message: &str,
        offset: usize,
        fallback: &str,
    ) {
        let (line, column) = line_column(self.source, offset);
        self.diagnostics.push(MarkdownImportDiagnostic {
            kind: kind.into(),
            severity: severity.into(),
            message: message.into(),
            line,
            column,
            fallback: fallback.into(),
        });
    }
}

fn normalize_list_item(frame: &mut Frame) {
    let mut normalized = Vec::new();
    let mut inline = Vec::new();
    for child in frame.content.drain(..) {
        if matches!(child["type"].as_str(), Some("text" | "hardBreak" | "image")) {
            inline.push(child);
        } else {
            if !inline.is_empty() {
                normalized.push(json!({"type":"paragraph","content":std::mem::take(&mut inline)}));
            }
            normalized.push(child);
        }
    }
    if !inline.is_empty() {
        normalized.push(json!({"type":"paragraph","content":inline}));
    }
    if normalized.is_empty() {
        normalized.push(json!({"type":"paragraph"}));
    }
    frame.content = normalized;
}

fn normalize_code_block(frame: &mut Frame) {
    let Some(last) = frame.content.last_mut() else {
        return;
    };
    let Some(text) = last.get("text").and_then(Value::as_str) else {
        return;
    };
    if let Some(without_delimiter_newline) = text.strip_suffix('\n') {
        last["text"] = json!(without_delimiter_newline);
    }
}

/// Strip a manual callout marker from a quote and re-tag it as the matching callout.
fn promote_manual_callout(frame: &mut Frame, (variant, width): (&'static str, usize)) {
    let stripped = frame
        .content
        .first_mut()
        .and_then(|first| first.get_mut("content"))
        .and_then(Value::as_array_mut)
        .and_then(|nodes| nodes.first_mut())
        .and_then(|node| node.get_mut("text"))
        .and_then(|text| {
            let rest = text.as_str()?.get(width..)?.trim_start().to_owned();
            *text = json!(rest);
            Some(())
        });
    if stripped.is_some() {
        frame.kind = "callout";
        frame.attrs = Some(json!({"variant":variant}));
    }
}

/// Recognize the callout markers GFM alerts do not cover: the app's own `[!INFO]`, and
/// the single-line `> [!WARNING] text` form that GFM only accepts on a line of its own.
///
/// The test reads raw source rather than decoded text. An author who wrote `\[!NOTE\]`
/// meant those literal characters, and matching decoded text would consume them and
/// quietly convert their quote into a callout.
fn manual_callout_marker(block: &str) -> Option<(&'static str, usize)> {
    let first = block.lines().next()?.trim_start();
    let rest = first.strip_prefix('>').unwrap_or(first).trim_start();
    [
        ("[!NOTE]", "note"),
        ("[!INFO]", "info"),
        ("[!TIP]", "info"),
        ("[!IMPORTANT]", "info"),
        ("[!WARNING]", "warning"),
        ("[!CAUTION]", "warning"),
    ]
    .into_iter()
    .find(|(marker, _)| {
        rest.get(..marker.len())
            .is_some_and(|prefix| prefix.eq_ignore_ascii_case(marker))
    })
    .map(|(marker, variant)| (variant, marker.len()))
}

fn callout_variant(kind: BlockQuoteKind) -> &'static str {
    match kind {
        BlockQuoteKind::Note => "note",
        BlockQuoteKind::Tip | BlockQuoteKind::Important => "info",
        BlockQuoteKind::Warning | BlockQuoteKind::Caution => "warning",
    }
}

fn heading_level(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

/// Refuse markup that executes, loads, or restyles anything.
///
/// Inert tags are degraded with a diagnostic rather than rejected, but these are refused
/// outright: importing a document that carries them without saying so would hide from the
/// author that their file contains active content.
fn reject_active_markup(html: &str) -> Result<(), DocumentError> {
    let lower = html.to_ascii_lowercase();
    const ACTIVE: [&str; 14] = [
        "<script",
        "<iframe",
        "<style",
        "<object",
        "<embed",
        "<applet",
        "<form",
        "<meta",
        "<base",
        "<link",
        "<svg",
        "<math",
        "<noscript",
        "<template",
    ];
    let has_handler = lower.split(" on").skip(1).any(|tail| {
        let name = tail.trim_start_matches(|c: char| c.is_ascii_alphabetic());
        name.starts_with('=') && name.len() < tail.len()
    });
    if ACTIVE.iter().any(|tag| lower.contains(tag))
        || has_handler
        || lower.contains("javascript:")
        || lower.contains("vbscript:")
        || lower.contains("data:text/html")
    {
        return Err(DocumentError::Validation(
            "Embedded HTML is not supported in Markdown.",
        ));
    }
    Ok(())
}

/// Whether a fenced-code info word is a plain language identifier.
///
/// The value reaches the Reader as a `language-…` class name, so anything else is treated
/// as tooling metadata and dropped rather than stored.
fn is_language_token(word: &str) -> bool {
    (1..=32).contains(&word.chars().count())
        && word
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '#' | '.' | '_' | '-'))
}

/// The text an HTML fragment would show once its tags are removed.
fn html_text_content(html: &str) -> String {
    let mut out = String::new();
    let mut depth = 0usize;
    for character in html.chars() {
        match character {
            '<' => depth += 1,
            '>' => depth = depth.saturating_sub(1),
            _ if depth == 0 => out.push(character),
            _ => {}
        }
    }
    out
}

enum LinkKind {
    /// An allowed absolute target.
    Safe,
    /// A well-formed but unusable target: relative paths and in-page anchors.
    Unaddressable,
    /// Any other scheme, including `javascript:`, `data:`, and `file:`.
    Unsafe,
}

fn classify_link(href: &str) -> LinkKind {
    let lower = href.to_ascii_lowercase();
    if lower.starts_with("https://") || lower.starts_with("http://") || lower.starts_with("mailto:")
    {
        return LinkKind::Safe;
    }
    // Only a syntactically valid scheme makes this an absolute URI worth rejecting on
    // scheme grounds; anything else is a relative path or a fragment.
    let scheme = lower.split_once(':').map(|(scheme, _)| scheme).filter(|s| {
        !s.is_empty()
            && s.starts_with(|c: char| c.is_ascii_alphabetic())
            && s.chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
    });
    match scheme {
        Some(_) => LinkKind::Unsafe,
        None => LinkKind::Unaddressable,
    }
}

fn line_column(source: &str, offset: usize) -> (u32, u32) {
    let prefix = &source[..offset.min(source.len())];
    let line = prefix.bytes().filter(|byte| *byte == b'\n').count() as u32 + 1;
    let column = prefix
        .rsplit_once('\n')
        .map_or(prefix, |(_, tail)| tail)
        .chars()
        .count() as u32
        + 1;
    (line, column)
}

/// Whether a fenced code block carries its own closing delimiter.
///
/// An unterminated fence swallows the rest of the file, so it is refused rather than
/// committed. The check reads the block's own source span, which the parser has already
/// resolved: a line scanner cannot do this, because it cannot see that ``` - ``` ``` opens
/// a fence inside a list item while ```   ``` ``` two lines down closes it.
fn fence_is_closed(block: &str) -> bool {
    /// Drop the blockquote markers a container adds to every line it holds.
    fn content_of(line: &str) -> &str {
        let mut rest = line.trim();
        while let Some(tail) = rest.strip_prefix('>') {
            rest = tail.trim_start();
        }
        rest
    }

    let mut lines = block.lines();
    let Some(opener) = lines.next().map(content_of) else {
        return false;
    };
    let Some(marker) = opener.chars().next().filter(|c| matches!(c, '`' | '~')) else {
        return false;
    };
    let width = opener.chars().take_while(|c| *c == marker).count();
    lines.map(content_of).any(|line| {
        !line.is_empty()
            && line.chars().all(|character| character == marker)
            && line.chars().count() >= width
    })
}
