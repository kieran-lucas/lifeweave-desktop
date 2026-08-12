use super::{
    domain::{DocumentError, MAX_MARKDOWN_BYTES},
    schema,
};
use serde_json::{Value, json};

pub fn import(markdown: &str) -> Result<String, DocumentError> {
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
fn parse_image(line: &str) -> Option<(&str, &str)> {
    let rest = line.strip_prefix("![")?;
    let close = rest.find("](")?;
    let target = rest.get(close + 2..rest.len().checked_sub(1)?)?;
    line.ends_with(')').then_some((&rest[..close], target))
}
fn table_cells(line: &str) -> Vec<&str> {
    line.trim_matches('|').split('|').map(str::trim).collect()
}
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
    for node in v
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        render(node, &mut out, 0)?;
    }
    Ok(out.trim_end().to_owned() + "\n")
}
fn inline(node: &Value) -> String {
    if node.get("type").and_then(Value::as_str) == Some("hardBreak") {
        return "  \n".to_owned();
    }
    if node.get("type").and_then(Value::as_str) != Some("text") {
        return text(node);
    }
    let text = node.get("text").and_then(Value::as_str).unwrap_or("");
    let mut value = text.to_owned();
    if let Some(marks) = node.get("marks").and_then(Value::as_array) {
        for m in marks.iter().rev() {
            match m.get("type").and_then(Value::as_str) {
                Some("bold") => value = format!("**{value}**"),
                Some("italic") => value = format!("*{value}*"),
                Some("link") => {
                    let href = m
                        .get("attrs")
                        .and_then(|a| a.get("href"))
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    value = format!("[{value}]({href})")
                }
                _ => {}
            }
        }
    }
    value
}
fn text(node: &Value) -> String {
    node.get("content")
        .and_then(Value::as_array)
        .map(|a| a.iter().map(inline).collect())
        .unwrap_or_default()
}

fn render_children(n: &Value, depth: usize) -> Result<String, DocumentError> {
    let mut body = String::new();
    for child in n
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        render(child, &mut body, depth)?;
    }
    if body.trim().is_empty() {
        body = text(n);
    }
    Ok(body)
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

fn render_list_item(
    item: &Value,
    out: &mut String,
    depth: usize,
    prefix: &str,
) -> Result<(), DocumentError> {
    let children = item.get("content").and_then(Value::as_array);
    let Some(children) = children else {
        return Ok(());
    };
    let mut wrote_first = false;
    for child in children {
        match child.get("type").and_then(Value::as_str).unwrap_or("") {
            "paragraph" => {
                out.push_str(&"  ".repeat(depth + usize::from(wrote_first)));
                if !wrote_first {
                    out.push_str(prefix);
                }
                out.push_str(&text(child));
                out.push('\n');
                wrote_first = true;
            }
            "bulletList" | "orderedList" => {
                if !wrote_first {
                    out.push_str(&"  ".repeat(depth));
                    out.push_str(prefix);
                    out.push('\n');
                    wrote_first = true;
                }
                render(child, out, depth + 1)?;
            }
            _ => {
                let rendered = render_children(child, depth + 1)?;
                if !rendered.trim().is_empty() {
                    out.push_str(&"  ".repeat(depth + usize::from(wrote_first)));
                    if !wrote_first {
                        out.push_str(prefix);
                    }
                    out.push_str(rendered.trim_end());
                    out.push('\n');
                    wrote_first = true;
                }
            }
        }
    }
    Ok(())
}

fn render(n: &Value, out: &mut String, depth: usize) -> Result<(), DocumentError> {
    match n.get("type").and_then(Value::as_str).unwrap_or("") {
        "heading" => {
            let l = n
                .get("attrs")
                .and_then(|a| a.get("level"))
                .and_then(Value::as_u64)
                .unwrap_or(1);
            out.push_str(&format!("{} {}\n\n", "#".repeat(l as usize), text(n)));
        }
        "paragraph" => out.push_str(&format!("{}\n\n", text(n))),
        "blockquote" => {
            let body = render_children(n, depth)?;
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
            let body = render_children(n, depth)?;
            render_quote_body(&body, out);
        }
        "codeBlock" => {
            let content = text(n);
            let fence = code_fence(&content);
            out.push_str(&format!("{fence}\n{content}\n{fence}\n\n"));
        }
        "bulletList" | "orderedList" => {
            for (i, item) in n
                .get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let prefix = if n["type"] == "bulletList" {
                    "- ".into()
                } else {
                    format!("{}. ", i + 1)
                };
                render_list_item(item, out, depth, &prefix)?;
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
            out.push_str(&format!("![{alt}](assets/{id})\n\n"));
        }
        "table" => {
            let rows = n.get("content").and_then(Value::as_array).unwrap();
            for (ri, row) in rows.iter().enumerate() {
                let cells = row.get("content").and_then(Value::as_array).unwrap();
                out.push('|');
                for c in cells {
                    out.push(' ');
                    out.push_str(
                        &c.get("content")
                            .and_then(Value::as_array)
                            .and_then(|a| a.first())
                            .map(text)
                            .unwrap_or_default(),
                    );
                    out.push_str(" |");
                }
                out.push('\n');
                if ri == 0 {
                    out.push('|');
                    for _ in cells {
                        out.push_str(" --- |");
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
        assert!(exported.contains("- Parent\n  - Child"));
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
}
