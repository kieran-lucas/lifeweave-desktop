#[cfg(test)]
use super::domain::MAX_MARKDOWN_BYTES;
use super::{domain::DocumentError, schema};
use serde_json::Value;
#[cfg(test)]
use serde_json::json;

mod parser;
#[cfg(test)]
mod regression;

pub use parser::{MarkdownImportResult, import_with_diagnostics};

pub fn import(markdown: &str) -> Result<String, DocumentError> {
    Ok(import_with_diagnostics(markdown)?.canonical_json)
}

#[cfg(test)]
fn legacy_import(markdown: &str) -> Result<String, DocumentError> {
    if markdown.len() > MAX_MARKDOWN_BYTES {
        return Err(DocumentError::Validation("Markdown is too large."));
    }
    let lower = markdown.to_ascii_lowercase();
    let has_mdx_module = markdown.lines().any(|line| {
        let line = line.trim_start();
        (line.starts_with("import ") || line.starts_with("export "))
            && line.contains(" from ")
            && (line.contains('"') || line.contains('\''))
    });
    if lower.contains("<script")
        || lower.contains("<iframe")
        || lower.contains("<style")
        || markdown.contains("{%")
        || markdown.contains("{/*")
        || markdown.contains("../")
        || has_mdx_module
    {
        return Err(DocumentError::Validation(
            "Markdown contains unsafe or unsupported content.",
        ));
    }
    let mut content = Vec::new();
    let mut code_fence: Option<String> = None;
    let mut code_lines = Vec::new();
    let lines = markdown.lines().collect::<Vec<_>>();
    let mut index = 0;
    while index < lines.len() {
        let line = lines[index];
        if let Some(open_fence) = code_fence.as_deref() {
            if line.trim() == open_fence {
                content.push(json!({"type":"codeBlock","content":[{"type":"text","text":code_lines.join("\n")}]}));
                code_lines.clear();
                code_fence = None;
            } else {
                code_lines.push(line);
            }
            index += 1;
            continue;
        }
        let tick_count = line.chars().take_while(|value| *value == '`').count();
        if tick_count >= 3 {
            code_fence = Some("`".repeat(tick_count));
            index += 1;
            continue;
        }
        if line.trim().is_empty() {
            index += 1;
            continue;
        }
        if let Some((variant, rest)) = parse_admonition_header(line) {
            if rest.is_empty() {
                let mut inner_lines: Vec<&str> = Vec::new();
                index += 1;
                while index < lines.len() {
                    let next = lines[index];
                    if next.trim().is_empty() {
                        break;
                    }
                    if let Some(content_line) = next.strip_prefix("> ") {
                        inner_lines.push(content_line);
                        index += 1;
                    } else {
                        break;
                    }
                }
                let inner_text = inner_lines.join(" ");
                let text_node = inline_node(inner_text.trim());
                content.push(serde_json::json!({"type":"callout","attrs":{"variant":variant},"content":[text_node]}));
            } else {
                content.push(serde_json::json!({"type":"callout","attrs":{"variant":variant},"content":[inline_node(rest)]}));
                index += 1;
            }
            continue;
        }
        if let Some((alt, target)) = parse_image(line) {
            let id = target
                .strip_prefix("assets/")
                .ok_or(DocumentError::Validation(
                    "Markdown image paths must reference a local asset.",
                ))?;
            if !super::domain::valid_id(id) || target.contains("..") {
                return Err(DocumentError::Validation(
                    "Markdown image identity is invalid.",
                ));
            }
            content.push(json!({"type":"image","attrs":{"assetId":id,"alt":alt}}));
            index += 1;
            continue;
        }
        if line.starts_with('|') && index + 1 < lines.len() && is_table_separator(lines[index + 1])
        {
            let headers = table_cells(line);
            let mut rows = vec![
                json!({"type":"tableRow","content":headers.into_iter().map(|cell| json!({"type":"tableHeader","content":[{"type":"paragraph","content":[inline_node(cell)]}]})).collect::<Vec<_>>()}),
            ];
            index += 2;
            while index < lines.len() && lines[index].starts_with('|') {
                let cells = table_cells(lines[index]);
                rows.push(json!({"type":"tableRow","content":cells.into_iter().map(|cell| json!({"type":"tableCell","content":[{"type":"paragraph","content":[inline_node(cell)]}]})).collect::<Vec<_>>() }));
                index += 1;
            }
            content.push(json!({"type":"table","content":rows}));
            continue;
        }
        let (kind, text, attrs) = if let Some(v) = line.strip_prefix("### ") {
            ("heading", v, Some(json!({"level":3})))
        } else if let Some(v) = line.strip_prefix("## ") {
            ("heading", v, Some(json!({"level":2})))
        } else if let Some(v) = line.strip_prefix("# ") {
            ("heading", v, Some(json!({"level":1})))
        } else if let Some(v) = line.strip_prefix("> ") {
            ("blockquote", v, None)
        } else if let Some(v) = line.strip_prefix("- ") {
            ("bulletList", v, None)
        } else if let Some((_, v)) = line
            .split_once(". ")
            .filter(|(n, _)| n.bytes().all(|b| b.is_ascii_digit()))
        {
            ("orderedList", v, None)
        } else {
            ("paragraph", line, None)
        };
        let text_node = inline_node(text);
        let node = match kind {
            "bulletList" | "orderedList" => {
                json!({"type":kind,"content":[{"type":"listItem","content":[{"type":"paragraph","content":[text_node]}]}]})
            }
            _ => {
                let mut o = serde_json::Map::new();
                o.insert("type".into(), json!(kind));
                if let Some(a) = attrs {
                    o.insert("attrs".into(), a);
                }
                o.insert("content".into(), json!([text_node]));
                Value::Object(o)
            }
        };
        content.push(node);
        index += 1;
    }
    if code_fence.is_some() {
        return Err(DocumentError::Validation(
            "Markdown code fence is not closed.",
        ));
    }
    let raw = serde_json::to_string(&json!({"type":"doc","content":content})).unwrap();
    Ok(schema::validate(&raw)?.canonical_json)
}

#[cfg(test)]
fn inline_node(text: &str) -> Value {
    if text.starts_with("**") && text.ends_with("**") && text.len() > 4 {
        return json!({"type":"text","text":&text[2..text.len()-2],"marks":[{"type":"bold"}]});
    }
    if text.starts_with('*') && text.ends_with('*') && text.len() > 2 {
        return json!({"type":"text","text":&text[1..text.len()-1],"marks":[{"type":"italic"}]});
    }
    if let Some(close) = text
        .find("](")
        .filter(|_| text.starts_with('[') && text.ends_with(')'))
    {
        let label = &text[1..close];
        let href = &text[close + 2..text.len() - 1];
        return json!({"type":"text","text":label,"marks":[{"type":"link","attrs":{"href":href}}]});
    }
    json!({"type":"text","text":text})
}
#[cfg(test)]
fn parse_admonition_header(line: &str) -> Option<(&str, &str)> {
    let inner = line.strip_prefix("> [!")?;
    let bracket_end = inner.find(']')?;
    let variant = match &inner[..bracket_end] {
        "NOTE" => "note",
        "WARNING" => "warning",
        "TIP" => "info",
        "INFO" => "info",
        _ => return None,
    };
    let after = &inner[bracket_end + 1..];
    let rest = after.strip_prefix(' ').unwrap_or(after);
    Some((variant, rest))
}
#[cfg(test)]
fn parse_image(line: &str) -> Option<(&str, &str)> {
    let rest = line.strip_prefix("![")?;
    let close = rest.find("](")?;
    let target = rest.get(close + 2..rest.len().checked_sub(1)?)?;
    line.ends_with(')').then_some((&rest[..close], target))
}
#[cfg(test)]
fn table_cells(line: &str) -> Vec<&str> {
    line.trim_matches('|').split('|').map(str::trim).collect()
}
#[cfg(test)]
fn is_table_separator(line: &str) -> bool {
    line.starts_with('|')
        && table_cells(line).iter().all(|cell| {
            let value = cell.trim_matches(':').trim();
            value.len() >= 3 && value.bytes().all(|byte| byte == b'-')
        })
}

pub fn export(canonical: &str) -> Result<String, DocumentError> {
    let valid = schema::validate(canonical)?;
    let v: Value = serde_json::from_str(&valid.canonical_json).unwrap();
    let mut out = String::new();
    render_sequence(v.get("content").and_then(Value::as_array), &mut out)?;
    Ok(out.trim_end().to_owned() + "\n")
}

/// Which list marker a node uses, or `None` if it is not a list.
///
/// A task list and a bullet list both use `-`, so for the purpose of keeping two lists
/// apart they are the same family even though they are different nodes.
fn list_family(kind: &str) -> Option<&'static str> {
    match kind {
        "orderedList" => Some("ordered"),
        "bulletList" | "taskList" => Some("bullet"),
        _ => None,
    }
}

/// Render sibling blocks, keeping two adjacent lists apart.
///
/// CommonMark ends a list only at a different marker, so two consecutive lists written
/// with the same one merge into a single list on re-import — the second list's items
/// silently join the first and inherit its numbering. Alternating the marker is what keeps
/// them two lists; it is the only difference the syntax offers.
fn render_sequence(nodes: Option<&Vec<Value>>, out: &mut String) -> Result<(), DocumentError> {
    let mut previous: Option<&str> = None;
    for node in nodes.into_iter().flatten() {
        let kind = node.get("type").and_then(Value::as_str).unwrap_or("");
        let is_list = list_family(kind).is_some();
        let alternate = previous.is_some_and(|last| list_family(last) == list_family(kind));
        render_marked(node, out, alternate)?;
        previous = is_list.then_some(kind);
    }
    Ok(())
}
/// Whether a run of inline content may emit line breaks.
///
/// Headings and GFM table cells are single-line constructs: a literal newline in
/// either one silently changes the block structure when the export is re-imported,
/// so hard breaks collapse to a space there instead.
#[derive(Clone, Copy, PartialEq, Eq)]
enum InlineMode {
    Block,
    SingleLine,
}

fn node_marks(node: &Value) -> &[Value] {
    node.get("marks")
        .and_then(Value::as_array)
        .map_or(&[], Vec::as_slice)
}

/// One inline node rendered with no mark of its own left to apply.
fn atom(node: &Value, mode: InlineMode) -> String {
    match node.get("type").and_then(Value::as_str) {
        Some("hardBreak") => match mode {
            InlineMode::Block => "  \n".to_owned(),
            InlineMode::SingleLine => " ".to_owned(),
        },
        Some("text") => {
            escape_markdown_text(node.get("text").and_then(Value::as_str).unwrap_or(""))
        }
        // The stored TeX is verbatim: escaping it would change the formula, and it cannot
        // contain its own delimiter because the schema refuses such a source.
        Some("inlineMath") => match math_source(node) {
            "" => String::new(),
            source => single_line_cell(&format!("${source}$"), mode),
        },
        _ => text(node, mode),
    }
}

fn math_source(node: &Value) -> &str {
    node.get("attrs")
        .and_then(|attrs| attrs.get("source"))
        .and_then(Value::as_str)
        .unwrap_or_default()
}

/// Neutralize the one character that would end a GFM table cell early.
///
/// A cell is delimited by unescaped pipes, so verbatim runs that legitimately contain one
/// — inline code, a link target, a formula — have to escape it or the row gains a column
/// and the run is torn in half.
fn single_line_cell(rendered: &str, mode: InlineMode) -> String {
    match mode {
        InlineMode::SingleLine => rendered.replace('|', "\\|"),
        InlineMode::Block => rendered.to_owned(),
    }
}

/// Serialize a run of inline nodes, emitting each mark once around the longest run of
/// neighbours that share it.
///
/// Applying marks per node instead produced a delimiter pair per node, so a mark that
/// spanned several nodes — as it does whenever formatting nests, e.g. `~~a **b** c~~` —
/// came out as several separate marks with `~~~~` seams that no parser reads back.
/// `applied` carries the marks already opened by an enclosing call.
fn render_inline(nodes: &[Value], applied: &[Value], mode: InlineMode) -> String {
    let mut out = String::new();
    let mut index = 0;
    while index < nodes.len() {
        let pending = node_marks(&nodes[index])
            .iter()
            .filter(|mark| !applied.contains(mark))
            .collect::<Vec<_>>();
        let Some(chosen) = choose_mark(&pending, &nodes[index..]) else {
            out.push_str(&atom(&nodes[index], mode));
            index += 1;
            continue;
        };
        let length = nodes[index..]
            .iter()
            .take_while(|node| node_marks(node).contains(chosen))
            .count()
            .max(1);
        let run = &nodes[index..index + length];
        out.push_str(&wrap_mark(chosen, run, applied, mode));
        index += length;
    }
    if mode == InlineMode::SingleLine {
        return out.replace(['\n', '\r'], " ");
    }
    out
}

/// Pick the mark to emit outermost: the one covering the most neighbouring nodes.
///
/// `code` is never chosen while another mark is pending, because its body is verbatim
/// and must therefore sit innermost.
fn choose_mark<'a>(pending: &[&'a Value], rest: &[Value]) -> Option<&'a Value> {
    let mut best: Option<(&Value, usize)> = None;
    for mark in pending {
        if mark.get("type").and_then(Value::as_str) == Some("code") && pending.len() > 1 {
            continue;
        }
        let reach = rest
            .iter()
            .take_while(|node| node_marks(node).contains(*mark))
            .count();
        if best.is_none_or(|(_, longest)| reach > longest) {
            best = Some((mark, reach));
        }
    }
    best.map(|(mark, _)| mark)
}

fn wrap_mark(mark: &Value, run: &[Value], applied: &[Value], mode: InlineMode) -> String {
    // `code` takes the run's verbatim text; nothing inside it may be escaped or marked up.
    if mark.get("type").and_then(Value::as_str) == Some("code") {
        let raw = run.iter().map(raw_text).collect::<String>();
        return if raw.is_empty() {
            String::new()
        } else {
            single_line_cell(&inline_code(&raw), mode)
        };
    }
    let mut opened = applied.to_vec();
    opened.push(mark.clone());
    let inner = render_inline(run, &opened, mode);
    // A mark around nothing would emit delimiters that re-import as literal punctuation.
    if inner.is_empty() {
        return inner;
    }
    match mark.get("type").and_then(Value::as_str) {
        Some("bold") => wrap_emphasis(&inner, "**"),
        Some("italic") => wrap_emphasis(&inner, "*"),
        Some("strike") => wrap_emphasis(&inner, "~~"),
        Some("link") => {
            let href = mark
                .get("attrs")
                .and_then(|attrs| attrs.get("href"))
                .and_then(Value::as_str)
                .unwrap_or("");
            format!("[{inner}]({})", link_destination(href, mode))
        }
        _ => inner,
    }
}

/// Render a link or image target so that re-importing it yields the same target.
///
/// A bare destination ends at the first space or unbalanced parenthesis, so a URL holding
/// either one was silently truncated — and with it the whole link, which re-imported as
/// literal text. CommonMark's angle-bracket form has no such boundary.
fn link_destination(href: &str, mode: InlineMode) -> String {
    let balanced = {
        let mut depth = 0i32;
        href.chars().all(|character| {
            match character {
                '(' => depth += 1,
                ')' => depth -= 1,
                _ => {}
            }
            depth >= 0
        }) && depth == 0
    };
    let plain = balanced
        && !href.is_empty()
        && !href
            .chars()
            .any(|c| c.is_whitespace() || c.is_control() || matches!(c, '<' | '>'));
    let rendered = if plain {
        href.to_owned()
    } else {
        let mut angled = String::with_capacity(href.len() + 2);
        angled.push('<');
        for character in href.chars() {
            if matches!(character, '<' | '>' | '\\') {
                angled.push('\\');
            }
            // A line break inside the angle form ends the destination, so it cannot
            // survive as itself; a space is the closest target that still resolves.
            angled.push(if matches!(character, '\n' | '\r') {
                ' '
            } else {
                character
            });
        }
        angled.push('>');
        angled
    };
    single_line_cell(&rendered, mode)
}

/// Wrap a run in an emphasis delimiter that will actually re-parse as that emphasis.
///
/// CommonMark refuses to open emphasis before whitespace and to close it after
/// whitespace, so `~~ x ~~` is literal punctuation rather than a strikethrough. Keeping
/// the surrounding whitespace outside the delimiters preserves both the mark and the
/// spacing; a run with nothing but whitespace gets no delimiters at all.
fn wrap_emphasis(value: &str, delimiter: &str) -> String {
    let core = value.trim_matches(|character: char| character.is_whitespace());
    if core.is_empty() {
        return value.to_owned();
    }
    let leading = &value[..value.len() - value.trim_start().len()];
    let trailing = &value[value.trim_end().len()..];
    format!("{leading}{delimiter}{core}{delimiter}{trailing}")
}

fn escape_markdown_text(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    let mut rest = value;
    while let Some(character) = rest.chars().next() {
        rest = &rest[character.len_utf8()..];
        // `$` opens inline math, so a formula the author only wrote about would become one
        // on the next import. `&` only matters when it opens a character reference: the
        // parser decodes `&amp;` to `&`, so an author's literal `&amp;` would come back as
        // a bare ampersand. An ampersand that opens nothing stays as it is.
        let escapes = matches!(
            character,
            '\\' | '`' | '*' | '_' | '{' | '}' | '[' | ']' | '<' | '>' | '#' | '|' | '~' | '$'
        ) || (character == '&' && opens_entity(rest));
        if escapes {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

/// Whether the text after an `&` completes a character reference the parser would decode.
fn opens_entity(rest: &str) -> bool {
    let body = rest.strip_prefix('#').map_or_else(
        || {
            rest.starts_with(|c: char| c.is_ascii_alphabetic())
                .then(|| rest.trim_start_matches(|c: char| c.is_ascii_alphanumeric()))
        },
        |digits| {
            let numeric = digits
                .strip_prefix(['x', 'X'])
                .map(|hex| hex.trim_start_matches(|c: char| c.is_ascii_hexdigit()))
                .unwrap_or_else(|| digits.trim_start_matches(|c: char| c.is_ascii_digit()));
            (numeric.len() < digits.len()).then_some(numeric)
        },
    );
    body.is_some_and(|tail| tail.starts_with(';') && tail.len() < rest.len())
}

fn inline_code(value: &str) -> String {
    let longest = value
        .split(|character| character != '`')
        .map(str::len)
        .max()
        .unwrap_or(0);
    let fence = "`".repeat(longest + 1);
    if value.starts_with(['`', ' ']) || value.ends_with(['`', ' ']) {
        format!("{fence} {value} {fence}")
    } else {
        format!("{fence}{value}{fence}")
    }
}

fn raw_text(node: &Value) -> String {
    if node.get("type").and_then(Value::as_str) == Some("text") {
        return node
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned();
    }
    node.get("content")
        .and_then(Value::as_array)
        .map(|children| children.iter().map(raw_text).collect())
        .unwrap_or_default()
}
fn text(node: &Value, mode: InlineMode) -> String {
    node.get("content")
        .and_then(Value::as_array)
        .map(|children| render_inline(children, &[], mode))
        .unwrap_or_default()
}

/// Neutralize leading characters that would re-parse as a different block.
///
/// Inline escaping cannot handle these: `-`, `+` and `1.` are ordinary text mid-line
/// and only become list markers at the start of a line, and leading indentation only
/// becomes an indented code block there. Escaping them unconditionally inside
/// [`escape_markdown_text`] would litter every hyphen and period in the document.
fn escape_block_starts(rendered: &str) -> String {
    let mut out = String::with_capacity(rendered.len());
    for (index, line) in rendered.split('\n').enumerate() {
        if index > 0 {
            out.push('\n');
        }
        let trimmed = line.trim_start_matches(' ');
        let indent = line.len() - trimmed.len();
        // Four or more leading spaces would become an indented code block. CommonMark
        // discards insignificant leading whitespace in a paragraph anyway, so keeping
        // the text and dropping the indent is the content-preserving choice.
        let indent = indent.min(3);
        out.push_str(&" ".repeat(indent));
        match trimmed.as_bytes().first() {
            // `- x`, `+ x`, and thematic breaks such as `---`.
            Some(b'-' | b'+') => {
                out.push('\\');
                out.push_str(trimmed);
            }
            Some(byte) if byte.is_ascii_digit() => {
                let digits = trimmed
                    .bytes()
                    .take_while(u8::is_ascii_digit)
                    .count()
                    .min(trimmed.len());
                let rest = &trimmed[digits..];
                if rest.starts_with(". ") || rest.starts_with(") ") || rest == "." || rest == ")" {
                    out.push_str(&trimmed[..digits]);
                    out.push('\\');
                    out.push_str(rest);
                } else {
                    out.push_str(trimmed);
                }
            }
            _ => out.push_str(trimmed),
        }
    }
    out
}

/// Render a block's inline content for a context that must stay on one line.
fn single_line(node: &Value) -> String {
    // A GFM cell holds no blocks, so display math in one is written in its inline form
    // rather than dropped for having no inline children to render.
    if node.get("type").and_then(Value::as_str) == Some("mathBlock") {
        return single_line_cell(&format!("${}$", math_source(node)), InlineMode::SingleLine);
    }
    text(node, InlineMode::SingleLine)
}

/// Normalize whitespace at end of line, which CommonMark reads as line-break syntax.
///
/// Trailing spaces are never content: two or more of them *are* the hard-break marker and
/// the rest are discarded on import. Emitting them verbatim let a text node's trailing
/// spaces merge into an adjacent break marker, so the export no longer described the
/// document it came from.
fn normalize_line_breaks(rendered: &str) -> String {
    let mut lines: Vec<String> = Vec::new();
    for line in rendered.split('\n') {
        let trimmed = line.trim_end_matches([' ', '\t']);
        // A hard break needs content ahead of it on the same line. A blank line cannot
        // carry one: inside a paragraph it ends the paragraph, and at the start of one it
        // disappears. Consecutive breaks therefore collapse to a single break, which keeps
        // every character of text and only normalizes how many line breaks separate them.
        if trimmed.trim_start().is_empty() {
            continue;
        }
        let had_break = line.len() - trimmed.len() >= 2;
        lines.push(if had_break {
            format!("{trimmed}  ")
        } else {
            trimmed.to_owned()
        });
    }
    // The final line ends the block, so any marker on it would have nothing to break onto.
    if let Some(last) = lines.last_mut() {
        *last = last.trim_end_matches([' ', '\t']).to_owned();
    }
    lines.join("\n")
}

/// Render a block's own inline content as a paragraph-safe line.
fn block_text(node: &Value) -> String {
    escape_block_starts(&normalize_line_breaks(&text(node, InlineMode::Block)))
}

fn render_children(n: &Value) -> Result<String, DocumentError> {
    let mut body = String::new();
    render_sequence(n.get("content").and_then(Value::as_array), &mut body)?;
    if body.trim().is_empty() {
        body = block_text(n);
    }
    Ok(body)
}

/// Indent every line of an already-rendered block by one list level.
fn indent_block(body: &str, out: &mut String, prefix: &str) {
    let mut first = true;
    for line in body.trim_end().split('\n') {
        if first {
            out.push_str(prefix);
            first = false;
        } else if !line.is_empty() {
            out.push_str(&" ".repeat(prefix.chars().count()));
        }
        out.push_str(line);
        out.push('\n');
    }
}

fn render_quote_body(body: &str, out: &mut String) {
    for line in body.trim_end().lines() {
        if line.is_empty() {
            out.push_str(">\n");
        } else {
            out.push_str("> ");
            out.push_str(line);
            out.push('\n');
        }
    }
    out.push('\n');
}

fn code_fence(content: &str) -> String {
    let longest_run = content
        .split(|value| value != '`')
        .map(str::len)
        .max()
        .unwrap_or(0);
    "`".repeat(3.max(longest_run + 1))
}

/// Render one list item, preserving every block it contains.
///
/// Each child block is rendered independently and then indented to the item's content
/// column, so nested quotes, code fences, tables and lists keep their own syntax
/// instead of being flattened into the item's first paragraph. Blocks after the first
/// are separated by a blank line, which is what keeps a second paragraph from being
/// re-read as a lazy continuation of the first.
fn render_list_item(
    item: &Value,
    out: &mut String,
    prefix: &str,
    marker_width: usize,
) -> Result<(), DocumentError> {
    let Some(children) = item.get("content").and_then(Value::as_array) else {
        return Ok(());
    };
    let continuation = " ".repeat(marker_width);
    let mut wrote_first = false;
    let mut previous_list: Option<&str> = None;
    for child in children {
        let kind = child.get("type").and_then(Value::as_str).unwrap_or("");
        let mut body = String::new();
        let alternate = previous_list.is_some_and(|last| list_family(last) == list_family(kind));
        render_marked(child, &mut body, alternate)?;
        previous_list = list_family(kind).is_some().then_some(kind);
        if body.trim().is_empty() {
            continue;
        }
        if wrote_first {
            // A nested list attaches directly to the item so the parent list stays tight;
            // any other following block needs the blank line, otherwise it is re-read as
            // a lazy continuation of the paragraph above it.
            let nested_list = matches!(
                child.get("type").and_then(Value::as_str),
                Some("bulletList" | "orderedList")
            );
            if !nested_list {
                out.push('\n');
            }
            indent_block(&body, out, &continuation);
        } else {
            indent_block(&body, out, prefix);
            wrote_first = true;
        }
    }
    if !wrote_first {
        out.push_str(prefix.trim_end());
        out.push('\n');
    }
    Ok(())
}

/// Flatten every block inside a table cell onto the cell's single line.
///
/// A GFM cell cannot hold block structure, so a cell carrying more than one block is
/// joined with spaces. Rendering only the first block instead would drop the rest
/// without any trace.
fn table_cell(cell: &Value) -> String {
    let blocks = cell
        .get("content")
        .and_then(Value::as_array)
        .map(|blocks| {
            blocks
                .iter()
                .map(single_line)
                .filter(|rendered| !rendered.trim().is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    blocks.join(" ")
}

/// `alternate` asks a list to use its second marker so it does not merge with the list
/// immediately above it. See [`render_sequence`].
fn render_marked(n: &Value, out: &mut String, alternate: bool) -> Result<(), DocumentError> {
    match n.get("type").and_then(Value::as_str).unwrap_or("") {
        "heading" => {
            let l = n
                .get("attrs")
                .and_then(|a| a.get("level"))
                .and_then(Value::as_u64)
                .unwrap_or(1);
            out.push_str(&format!(
                "{} {}\n\n",
                "#".repeat(l as usize),
                single_line(n)
            ));
        }
        "paragraph" => out.push_str(&format!("{}\n\n", block_text(n))),
        "blockquote" => {
            let body = render_children(n)?;
            render_quote_body(&body, out);
        }
        "callout" => {
            let variant = n
                .get("attrs")
                .and_then(|a| a.get("variant"))
                .and_then(Value::as_str)
                .unwrap_or("note")
                .to_uppercase();
            out.push_str(&format!("> [!{variant}]\n"));
            let body = render_children(n)?;
            render_quote_body(&body, out);
        }
        "codeBlock" => {
            let content = raw_text(n);
            let fence = code_fence(&content);
            let language = n
                .get("attrs")
                .and_then(|attrs| attrs.get("language"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            // An empty block has no line between its fences. Emitting one anyway put a
            // blank line inside the block, which re-imported as a block holding "".
            let body = if content.is_empty() {
                String::new()
            } else {
                format!("{content}\n")
            };
            out.push_str(&format!("{fence}{language}\n{body}{fence}\n\n"));
        }
        "mathBlock" => out.push_str(&format!("$$\n{}\n$$\n\n", math_source(n))),
        "horizontalRule" => out.push_str("---\n\n"),
        "taskList" => {
            let bullet = if alternate { '*' } else { '-' };
            for item in n
                .get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                // A list is retagged as a task list as soon as one item carries a
                // checkbox, so an ordinary item can sit beside task items. Giving it a
                // checkbox it never had would turn a note into an unfinished task.
                let prefix = match item.get("type").and_then(Value::as_str) {
                    Some("taskItem") => {
                        let checked = item
                            .get("attrs")
                            .and_then(|attrs| attrs.get("checked"))
                            .and_then(Value::as_bool)
                            .unwrap_or(false);
                        format!("{bullet} [{}] ", if checked { 'x' } else { ' ' })
                    }
                    _ => format!("{bullet} "),
                };
                render_list_item(item, out, &prefix, 2)?;
            }
            out.push('\n');
        }
        "bulletList" | "orderedList" => {
            let start = n
                .get("attrs")
                .and_then(|attrs| attrs.get("start"))
                .and_then(Value::as_u64)
                .unwrap_or(1);
            for (i, item) in n
                .get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let prefix = if n["type"] == "bulletList" {
                    if alternate { "* ".into() } else { "- ".into() }
                } else {
                    let delimiter = if alternate { ')' } else { '.' };
                    format!("{}{delimiter} ", start + i as u64)
                };
                render_list_item(item, out, &prefix, prefix.chars().count())?;
            }
            out.push('\n');
        }
        "image" => {
            let id = n
                .get("attrs")
                .and_then(|a| a.get("assetId"))
                .and_then(Value::as_str)
                .unwrap_or("missing");
            let alt = n
                .get("attrs")
                .and_then(|a| a.get("alt"))
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .unwrap_or("Local image");
            // The alt text sits inside `[...]` on one line, so a bracket or newline in it
            // would end the image early and leave the rest of the text loose in the block.
            let alt = escape_markdown_text(alt).replace(['\n', '\r'], " ");
            out.push_str(&format!("![{alt}](assets/{id})\n\n"));
        }
        "table" => {
            let rows = n.get("content").and_then(Value::as_array).unwrap();
            for (ri, row) in rows.iter().enumerate() {
                let cells = row.get("content").and_then(Value::as_array).unwrap();
                out.push('|');
                for c in cells {
                    out.push(' ');
                    out.push_str(&table_cell(c));
                    out.push_str(" |");
                }
                out.push('\n');
                if ri == 0 {
                    // The delimiter row is the only place GFM records column alignment.
                    out.push('|');
                    for cell in cells {
                        out.push(' ');
                        out.push_str(
                            match cell
                                .get("attrs")
                                .and_then(|attrs| attrs.get("align"))
                                .and_then(Value::as_str)
                            {
                                Some("left") => ":---",
                                Some("center") => ":---:",
                                Some("right") => "---:",
                                _ => "---",
                            },
                        );
                        out.push_str(" |");
                    }
                    out.push('\n');
                }
            }
            out.push('\n');
        }
        _ => {}
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn legacy_parser_reproduction_exposes_the_original_corruption_stage() {
        let canonical = legacy_import("prefix **bold** suffix\n\n1. one\n2. two\n\n***").unwrap();
        let value: Value = serde_json::from_str(&canonical).unwrap();
        let serialized = serde_json::to_string(&value).unwrap();
        assert!(serialized.contains("**bold**"));
        assert_eq!(serialized.matches("orderedList").count(), 2);
        assert!(serialized.contains("\"text\":\"*\""));
    }

    #[test]
    fn markdown_round_trip_supported_core() {
        let md = "# Heading\n\nParagraph\n\n- item\n\n> quote\n\n```\ncode <inert>\n```";
        let json = import(md).unwrap();
        let out = export(&json).unwrap();
        assert!(out.contains("# Heading"));
        assert!(out.contains("code <inert>"));
        assert!(import(&out).is_ok());
    }
    #[test]
    fn rejects_html_mdx_and_traversal() {
        for v in [
            "<script>x</script>",
            "<SCRIPT>x</SCRIPT>",
            "<style>body{display:none}</style>",
            "export x from \"package\"",
            "{/*x*/}",
            "![x](../secret)",
        ] {
            assert!(import(v).is_err());
        }
    }

    #[test]
    fn gfm_table_marks_and_local_asset_round_trip_semantically() {
        let id = "00000000-0000-7000-8000-000000000321";
        let md = format!(
            "**Bold**\n\n*Italic*\n\n[Safe](https://example.com)\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n![Picture](assets/{id})"
        );
        let first = import(&md).unwrap();
        assert!(first.contains("\"table\""));
        assert!(first.contains(id));
        assert!(first.contains("\"bold\""));
        let exported = export(&first).unwrap();
        let second = import(&exported).unwrap();
        assert!(second.contains("\"table\""));
        assert!(second.contains(id));
    }

    #[test]
    fn exports_real_tiptap_structure_without_dropping_authored_content() {
        let image_id = "00000000-0000-7000-8000-000000000322";
        let canonical = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Dòng một"},
                        {"type": "hardBreak"},
                        {"type": "text", "text": "Dòng hai"}
                    ]
                },
                {
                    "type": "blockquote",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Quoted from Tiptap"}]
                    }]
                },
                {
                    "type": "callout",
                    "attrs": {"variant": "warning"},
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Keep this warning", "marks": [{"type": "bold"}]}]
                    }]
                },
                {
                    "type": "bulletList",
                    "content": [{
                        "type": "listItem",
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Parent"}]},
                            {"type": "bulletList", "content": [{
                                "type": "listItem",
                                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Child"}]}]
                            }]}
                        ]
                    }]
                },
                {"type": "image", "attrs": {"assetId": image_id, "alt": "Sơ đồ tiến độ"}}
            ]
        })
        .to_string();

        let exported = export(&canonical).unwrap();
        assert!(exported.contains("Dòng một  \nDòng hai"));
        assert!(exported.contains("> Quoted from Tiptap"));
        assert!(exported.contains("> [!WARNING]\n> **Keep this warning**"));
        println!("EXPORTED>>>\n{exported}\n<<<END");
        // Nested items are indented to the parent marker's content column, and the
        // nesting itself must survive a re-import rather than any one spelling of it.
        assert!(exported.contains("- Parent\n  - Child"));
        let reimported: Value = serde_json::from_str(&import(&exported).unwrap()).unwrap();
        let parent = reimported["content"]
            .as_array()
            .unwrap()
            .iter()
            .find(|node| node["type"] == "bulletList")
            .unwrap();
        assert_eq!(
            parent["content"][0]["content"][1]["type"], "bulletList",
            "child list must stay nested inside the parent item"
        );
        assert!(exported.contains(&format!("![Sơ đồ tiến độ](assets/{image_id})")));
    }

    #[test]
    fn multiline_admonition_note_warning_tip() {
        // TIP maps to "info" since document schema only allows note|info|warning
        let md = "> [!NOTE]\n> First line\n> Second line\n\n> [!WARNING]\n> Warn text\n\n> [!TIP]\n> Tip text";
        let json = import(md).unwrap();
        assert!(json.contains("\"callout\""));
        assert!(json.contains("\"note\""));
        assert!(json.contains("\"warning\""));
        assert!(json.contains("\"info\""));
        assert!(json.contains("First line"));
    }

    #[test]
    fn single_line_admonition_warning_tip() {
        let md = "> [!WARNING] Watch out\n\n> [!TIP] Try this";
        let json = import(md).unwrap();
        assert!(json.contains("\"warning\""));
        assert!(json.contains("\"info\""));
        assert!(json.contains("Watch out"));
        assert!(json.contains("Try this"));
    }

    #[test]
    fn callout_export_uses_variant() {
        let json = import("> [!WARNING] Something\n\n> [!INFO] Also this").unwrap();
        let exported = export(&json).unwrap();
        assert!(exported.contains("> [!WARNING]"));
        assert!(exported.contains("> [!INFO]"));
    }

    #[test]
    fn rejects_remote_images_and_unclosed_fences() {
        assert!(import("![remote](https://example.com/image.png)").is_err());
        assert!(import("```\nunfinished").is_err());
    }

    #[test]
    fn export_chooses_a_fence_that_cannot_truncate_code_content() {
        let canonical = serde_json::json!({
            "type": "doc",
            "content": [{
                "type": "codeBlock",
                "content": [{"type": "text", "text": "before\n```\nafter"}]
            }]
        })
        .to_string();

        let exported = export(&canonical).unwrap();
        assert!(exported.starts_with("````\n"));
        let imported = import(&exported).unwrap();
        assert!(imported.contains("before\\n```\\nafter"));
    }

    #[test]
    fn housing_regression_preserves_supported_markdown_semantics() {
        let markdown = include_str!("fixtures/housing_markdown_regression.md");
        let canonical = import(markdown).unwrap();
        let plain_text = schema::validate(&canonical).unwrap().plain_text;
        let document: Value = serde_json::from_str(&canonical).unwrap();
        let serialized = serde_json::to_string_pretty(&document).unwrap();

        assert!(serialized.contains("\"type\": \"bold\""));
        assert_eq!(
            document["content"]
                .as_array()
                .unwrap()
                .iter()
                .filter(|node| node["type"] == "orderedList")
                .count(),
            2,
            "ordered runs must not split into one list per item: {serialized}"
        );
        assert!(serialized.contains("\"type\": \"taskItem\""));
        assert!(serialized.contains("\"checked\": false"));
        assert!(serialized.contains("\"checked\": true"));
        assert!(serialized.contains("\"type\": \"hardBreak\""));
        assert!(
            plain_text.contains("~4.284 đ"),
            "tilde value was corrupted: {serialized}"
        );
        assert!(!serialized.contains("\\\\~4.284 đ"));
        assert!(!serialized.contains("\"text\": \"*\""));
        assert!(serialized.contains("flowchart LR\\nA --> B"));
    }

    #[test]
    fn inline_marks_survive_paragraph_heading_quote_list_and_table() {
        let markdown = "# **heading** *italic* `code`\n\n> **quote** *italic* `code` [link](https://example.com)\n\n- **item** and `code`\n\n| A | B |\n| --- | --- |\n| **bold** | `code` and [link](https://example.com) |";
        let canonical = import(markdown).unwrap();
        let value: Value = serde_json::from_str(&canonical).unwrap();
        let serialized = serde_json::to_string_pretty(&value).unwrap();
        assert!(serialized.matches("\"type\": \"bold\"").count() >= 4);
        assert!(serialized.matches("\"type\": \"italic\"").count() >= 2);
        assert!(serialized.matches("\"type\": \"code\"").count() >= 3);
        assert!(serialized.matches("\"type\": \"link\"").count() >= 2);
        assert_eq!(value["content"][1]["type"], "blockquote");
        assert_eq!(value["content"][2]["type"], "bulletList");
        assert_eq!(value["content"][3]["type"], "table");
    }

    #[test]
    fn ordered_lists_keep_run_start_nesting_and_rich_inline_content() {
        let markdown = "4. **four**\n5. five\n   1. nested `code`\n   2. nested [link](https://example.com)\n6. six\n\n1. loose first\n\n2. loose second";
        let canonical = import(markdown).unwrap();
        let value: Value = serde_json::from_str(&canonical).unwrap();
        let lists = value["content"].as_array().unwrap();
        assert_eq!(lists.len(), 1);
        assert_eq!(lists[0]["attrs"]["start"], 4);
        assert_eq!(lists[0]["content"][1]["content"][1]["type"], "orderedList");
        assert_eq!(lists[0]["content"].as_array().unwrap().len(), 5);
        let exported = export(&canonical).unwrap();
        assert!(exported.contains("4. **four**"));
        assert!(exported.contains("5. five"));
        assert!(exported.contains("6. six"));
    }

    #[test]
    fn task_lists_preserve_checked_state_as_real_task_items() {
        let imported = import_with_diagnostics(
            "- [ ] unchecked
- [x] checked
- [X] uppercase",
        )
        .unwrap();
        let document: Value = serde_json::from_str(&imported.canonical_json).unwrap();
        let list = &document["content"][0];
        assert_eq!(list["type"], "taskList");
        let items = list["content"].as_array().unwrap();
        assert_eq!(
            items.len(),
            3,
            "a task run is one list: {}",
            imported.canonical_json
        );
        assert_eq!(items[0]["attrs"]["checked"], false);
        assert_eq!(items[1]["attrs"]["checked"], true);
        assert_eq!(items[2]["attrs"]["checked"], true);
        // The state is now a real node, so there is nothing to disclose as a fallback.
        assert!(
            imported.diagnostics.is_empty(),
            "{:?}",
            imported.diagnostics
        );
        assert_eq!(
            export(&imported.canonical_json).unwrap(),
            "- [ ] unchecked
- [x] checked
- [x] uppercase
"
        );
    }

    #[test]
    fn commonmark_escapes_and_hard_breaks_are_decoded_without_stray_backslashes() {
        let markdown = "\\* \\_ \\~ \\` \\[ \\] \\# \\> \\- \\+ \\. \\! \\\\\n+line two  \nline three\\\nline four";
        let canonical = import(markdown).unwrap();
        let valid = schema::validate(&canonical).unwrap();
        assert!(valid.plain_text.contains("* _ ~ ` [ ] # > - + . ! \\"));
        assert!(!valid.plain_text.contains("\\~"));
        let value: Value = serde_json::from_str(&canonical).unwrap();
        assert_eq!(
            serde_json::to_string(&value)
                .unwrap()
                .matches("hardBreak")
                .count(),
            2
        );
    }

    #[test]
    fn tables_preserve_escaped_pipes_empty_cells_unicode_and_inline_marks() {
        let imported = import_with_diagnostics("| A | B | C |\n|:---|---:|:---:|\n| **đ ×** | escaped \\| pipe | |\n| `code` | 😀 | [link](https://example.com) |").unwrap();
        let value: Value = serde_json::from_str(&imported.canonical_json).unwrap();
        assert_eq!(value["content"][0]["content"].as_array().unwrap().len(), 3);
        let serialized = serde_json::to_string(&value).unwrap();
        assert!(serialized.contains("escaped | pipe"));
        assert!(serialized.contains("đ ×"));
        assert!(serialized.contains('😀'));
        assert!(serialized.contains("\"type\":\"bold\""));
        assert!(serialized.contains("\"type\":\"code\""));
        // Alignment is stored on the cells rather than reported as a lost detail.
        assert!(
            imported.diagnostics.is_empty(),
            "{:?}",
            imported.diagnostics
        );
    }

    #[test]
    fn adjacent_and_malformed_emphasis_is_deterministic_without_corrupting_neighbors() {
        let markdown = "*Label:* **value**\n\n**Label:** **value**\n\n***bold italic***\n\ntext **bold** text\n\n*Mental model:** **productive asset**";
        let first = import(markdown).unwrap();
        let second = import(markdown).unwrap();
        assert_eq!(first, second);
        let valid = schema::validate(&first).unwrap();
        assert!(valid.plain_text.contains("Label: value"));
        assert!(valid.plain_text.contains("bold italic"));
        assert!(valid.plain_text.contains("Mental model:"));
        assert!(valid.plain_text.contains("productive asset"));
    }

    #[test]
    fn unsupported_surface_is_explicit_and_never_silently_drops_content() {
        let imported =
            import_with_diagnostics("---\n\n```mermaid\nflowchart LR\nA --> B\n```").unwrap();
        assert!(imported.canonical_json.contains("horizontalRule"));
        assert!(
            imported
                .canonical_json
                .contains("flowchart LR\\nA --&gt; B")
                || imported.canonical_json.contains("flowchart LR\\nA --> B")
        );
        // A rule and a fence language are both stored now, so neither is a fallback.
        assert!(imported.canonical_json.contains("\"language\":\"mermaid\""));
        assert!(
            imported.diagnostics.is_empty(),
            "{:?}",
            imported.diagnostics
        );
        // Inert markup degrades to its text with a diagnostic; active markup still fails.
        let degraded = import_with_diagnostics("<b>inert html</b>").unwrap();
        assert!(degraded.canonical_json.contains("inert html"));
        assert!(
            degraded
                .diagnostics
                .iter()
                .any(|item| item.kind == "html_markup")
        );
        assert!(import("<script>alert(1)</script>").is_err());
        assert!(import("![remote](https://example.com/image.png)").is_err());
        let inert =
            import("```html\n<script>alert(1)</script>\nimport x from 'package'\n```").unwrap();
        assert!(inert.contains("<script>alert(1)</script>"));
        assert!(inert.contains("import x from 'package'"));
        // A footnote is not linked, but it no longer costs the author the whole document:
        // the marker and the definition both survive as the text that was written.
        let footnoted = import_with_diagnostics("reference[^1]\n\n[^1]: note").unwrap();
        let value: Value = serde_json::from_str(&footnoted.canonical_json).unwrap();
        let plain = schema::validate(&footnoted.canonical_json)
            .unwrap()
            .plain_text;
        assert!(plain.contains("reference[^1]"), "{value}");
        assert!(plain.contains("[^1]: note"), "{value}");
        assert!(
            footnoted
                .diagnostics
                .iter()
                .any(|item| item.kind == "footnote")
        );
        assert_eq!(
            import(&export(&footnoted.canonical_json).unwrap()).unwrap(),
            footnoted.canonical_json
        );
    }

    #[test]
    fn supported_semantics_survive_export_and_reimport() {
        let first = import(include_str!("fixtures/housing_markdown_regression.md")).unwrap();
        let markdown = export(&first).unwrap();
        let second = import(&markdown).unwrap();
        assert_eq!(first, second);
    }

    #[test]
    fn headings_nested_blocks_autolinks_and_literal_asterisk_follow_commonmark() {
        let markdown = "# H1\n## H2\n### H3\n#### H4\n\n> first paragraph\n>\n> 1. **bold item**\n> 2. `code item`\n\n- **bold**\n  > nested quote\n\n<https://example.com>\n\n\\*\n\n***";
        let imported = import_with_diagnostics(markdown).unwrap();
        let value: Value = serde_json::from_str(&imported.canonical_json).unwrap();
        assert_eq!(value["content"][0]["attrs"]["level"], 1);
        assert_eq!(value["content"][1]["attrs"]["level"], 2);
        assert_eq!(value["content"][2]["attrs"]["level"], 3);
        assert_eq!(value["content"][3]["attrs"]["level"], 3);
        let serialized = serde_json::to_string(&value).unwrap();
        assert!(serialized.contains("\"href\":\"https://example.com\""));
        assert!(serialized.contains("nested quote"));
        assert!(serialized.contains("\"text\":\"*\""));
        assert!(!serialized.contains("\"text\":\"***\""));
        assert!(
            imported
                .diagnostics
                .iter()
                .any(|item| item.kind == "heading_depth" && item.line == 4)
        );
        assert!(serialized.contains("horizontalRule"));
    }

    #[test]
    fn blank_lines_and_soft_breaks_do_not_create_phantom_blocks_or_drop_unicode() {
        let canonical =
            import("\n\n  Tiếng Việt 😀 ‘quote’ – dash — em dash\ncontinues softly\n\n\nfinal\n\n")
                .unwrap();
        let value: Value = serde_json::from_str(&canonical).unwrap();
        assert_eq!(value["content"].as_array().unwrap().len(), 2);
        let plain = schema::validate(&canonical).unwrap().plain_text;
        assert!(plain.contains("Tiếng Việt 😀 ‘quote’ – dash — em dash continues softly"));
        assert!(plain.ends_with("final"));
    }
}
