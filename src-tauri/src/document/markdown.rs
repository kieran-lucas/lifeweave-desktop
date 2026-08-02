use super::{
    domain::{DocumentError, MAX_MARKDOWN_BYTES},
    schema,
};
use serde_json::{Value, json};

pub fn import(markdown: &str) -> Result<String, DocumentError> {
    if markdown.len() > MAX_MARKDOWN_BYTES {
        return Err(DocumentError::Validation("Markdown is too large."));
    }
    if markdown.contains("<script")
        || markdown.contains("<iframe")
        || markdown.contains("{%")
        || markdown.contains("{/*")
        || markdown.contains("../")
    {
        return Err(DocumentError::Validation(
            "Markdown contains unsafe or unsupported content.",
        ));
    }
    let mut content = Vec::new();
    let mut code = false;
    let mut code_lines = Vec::new();
    let lines = markdown.lines().collect::<Vec<_>>();
    let mut index = 0;
    while index < lines.len() {
        let line = lines[index];
        if line.starts_with("```") {
            if code {
                content.push(json!({"type":"codeBlock","content":[{"type":"text","text":code_lines.join("\n")}]}));
                code_lines.clear();
            }
            code = !code;
            index += 1;
            continue;
        }
        if code {
            code_lines.push(line);
            index += 1;
            continue;
        }
        if line.trim().is_empty() {
            index += 1;
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
        } else if let Some(v) = line.strip_prefix("> [!NOTE] ") {
            ("callout", v, Some(json!({"variant":"note"})))
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
    if code {
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
        "blockquote" => out.push_str(&format!("> {}\n\n", text(n))),
        "callout" => out.push_str(&format!("> [!NOTE] {}\n\n", text(n))),
        "codeBlock" => out.push_str(&format!("```\n{}\n```\n\n", text(n))),
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
                out.push_str(&"  ".repeat(depth));
                out.push_str(&prefix);
                out.push_str(
                    &item
                        .get("content")
                        .and_then(Value::as_array)
                        .and_then(|a| a.first())
                        .map(text)
                        .unwrap_or_default(),
                );
                out.push('\n');
            }
            out.push('\n');
        }
        "image" => {
            let id = n
                .get("attrs")
                .and_then(|a| a.get("assetId"))
                .and_then(Value::as_str)
                .unwrap_or("missing");
            out.push_str(&format!("![Local image](assets/{id})\n\n"));
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
        for v in ["<script>x</script>", "{/*x*/}", "![x](../secret)"] {
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
    fn rejects_remote_images_and_unclosed_fences() {
        assert!(import("![remote](https://example.com/image.png)").is_err());
        assert!(import("```\nunfinished").is_err());
    }
}
