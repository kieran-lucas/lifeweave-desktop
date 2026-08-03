use super::{domain::NarrativeError, schema};
use crate::document::domain::MAX_MARKDOWN_BYTES;
use serde_json::Value;

const WINDOWS_RESERVED_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Sanitizes `raw` into a safe `.md` filename: strips `.md` extension, replaces
/// path-separator and reserved chars with `_`, trims dots/whitespace, truncates
/// to 120 scalar values, rejects Windows reserved stems.
pub fn sanitize_file_name(raw: &str) -> String {
    format!("{}.md", sanitize_file_stem(raw))
}

pub fn sanitize_file_stem(raw: &str) -> String {
    let without_ext = raw
        .strip_suffix(".md")
        .or_else(|| raw.strip_suffix(".MD"))
        .unwrap_or(raw);
    let cleaned: String = without_ext
        .chars()
        .map(|c| {
            if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
                '_'
            } else {
                c
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches(|c: char| c == '.' || c.is_whitespace());
    let truncated: String = trimmed.chars().take(120).collect();
    let t = truncated.trim_matches(|c: char| c == '.' || c.is_whitespace());
    if WINDOWS_RESERVED_NAMES.contains(&t.to_uppercase().as_str()) || t.is_empty() {
        "export".to_owned()
    } else {
        t.to_owned()
    }
}

fn extract_title(markdown: &str) -> Option<String> {
    markdown.lines().find_map(|line| {
        line.strip_prefix("# ")
            .map(str::trim)
            .filter(|t| !t.is_empty())
            .map(str::to_owned)
    })
}

/// Converts Markdown into a Narrative Canvas JSON string (one scene, one
/// rich_text block). Uses the Basic Leaf Markdown parser as the authority;
/// unsupported constructs cause the import to fail.
pub fn import_as_canvas(
    document_id: &str,
    scene_id: &str,
    block_id: &str,
    original_name: &str,
    fallback_title: &str,
    markdown: &str,
) -> Result<String, NarrativeError> {
    if markdown.len() > MAX_MARKDOWN_BYTES {
        return Err(NarrativeError::Validation("Markdown is too large."));
    }
    let stem = sanitize_file_stem(original_name);
    let title = extract_title(markdown)
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| {
            if stem.is_empty() || stem == "export" {
                fallback_title.to_owned()
            } else {
                stem
            }
        });
    let title = if title.is_empty() {
        fallback_title.to_owned()
    } else {
        title
    };
    let rich_text_json = crate::document::markdown::import(markdown)
        .map_err(|_| NarrativeError::Validation("Markdown contains unsupported content."))?;
    let content: Value = serde_json::from_str(&rich_text_json)
        .map_err(|_| NarrativeError::Validation("Parsed Markdown content is invalid."))?;
    Ok(serde_json::json!({
        "schemaVersion": 1,
        "documentId": document_id,
        "title": title,
        "templateId": "knowledge_dossier",
        "templateVersion": 1,
        "scenes": [{
            "id": scene_id,
            "title": "Overview",
            "layoutPreset": "single_column",
            "atmosphere": "neutral",
            "motionPreset": "none",
            "blocks": [{
                "kind": "rich_text",
                "id": block_id,
                "content": content
            }]
        }]
    })
    .to_string())
}

pub fn export(canonical: &str) -> Result<String, NarrativeError> {
    schema::validate(canonical, None)?;
    let v: Value = serde_json::from_str(canonical)
        .map_err(|_| NarrativeError::Validation("Narrative JSON is invalid."))?;
    let mut out = String::new();
    let title = v.get("title").and_then(Value::as_str).unwrap_or("");
    out.push_str(&format!("# {title}\n\n"));
    for scene in v
        .get("scenes")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let scene_title = scene.get("title").and_then(Value::as_str).unwrap_or("");
        if !scene_title.is_empty() {
            out.push_str(&format!("## {scene_title}\n\n"));
        }
        for block in scene
            .get("blocks")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            render_block(block, &mut out);
        }
    }
    Ok(out.trim_end().to_owned() + "\n")
}

fn render_block(block: &Value, out: &mut String) {
    let kind = block.get("kind").and_then(Value::as_str).unwrap_or("");
    match kind {
        "rich_text" => {
            if let Some(content) = block.get("content") {
                render_rich_text(content, out);
            }
        }
        "metric" => {
            let label = block.get("label").and_then(Value::as_str).unwrap_or("");
            let value = block.get("value").and_then(Value::as_str).unwrap_or("");
            let unit = block.get("unit").and_then(Value::as_str).unwrap_or("");
            let desc = block
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or("");
            out.push_str(&format!("**{label}:** {value} {unit}\n\n"));
            if !desc.is_empty() {
                out.push_str(&format!("{desc}\n\n"));
            }
        }
        "image" => {
            let asset_id = block
                .get("assetId")
                .and_then(Value::as_str)
                .unwrap_or("missing");
            let alt = block.get("alt").and_then(Value::as_str).unwrap_or("");
            out.push_str(&format!("![{alt}](assets/{asset_id})\n\n"));
        }
        "callout" => {
            let variant = block
                .get("variant")
                .and_then(Value::as_str)
                .unwrap_or("note");
            out.push_str(&format!("> **[{variant}]**\n"));
            if let Some(content) = block.get("content") {
                let mut inner = String::new();
                render_rich_text(content, &mut inner);
                for line in inner.trim().lines() {
                    out.push_str(&format!("> {line}\n"));
                }
                out.push('\n');
            }
        }
        "timeline" => {
            let title = block.get("title").and_then(Value::as_str).unwrap_or("");
            out.push_str(&format!("### {title}\n\n"));
            for (i, item) in block
                .get("items")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let label = item.get("label").and_then(Value::as_str).unwrap_or("");
                let desc = item
                    .get("description")
                    .and_then(Value::as_str)
                    .unwrap_or("");
                out.push_str(&format!("{}. {label}: {desc}\n", i + 1));
            }
            out.push('\n');
        }
        _ => {}
    }
}

fn inline_text(node: &Value) -> String {
    if let Some(obj) = node.as_object() {
        if obj.get("type").and_then(Value::as_str) == Some("text") {
            let text = obj
                .get("text")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_owned();
            if let Some(marks) = obj.get("marks").and_then(Value::as_array) {
                let mut s = text;
                for m in marks.iter().rev() {
                    match m.get("type").and_then(Value::as_str) {
                        Some("bold") => s = format!("**{s}**"),
                        Some("italic") => s = format!("*{s}*"),
                        _ => {}
                    }
                }
                return s;
            }
            return text;
        }
        if let Some(children) = obj.get("content").and_then(Value::as_array) {
            return children
                .iter()
                .map(inline_text)
                .collect::<Vec<_>>()
                .join("");
        }
    }
    String::new()
}

fn render_rich_text(content: &Value, out: &mut String) {
    for node in content
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let kind = node.get("type").and_then(Value::as_str).unwrap_or("");
        match kind {
            "paragraph" => out.push_str(&format!("{}\n\n", inline_text(node))),
            "heading" => {
                let level = node
                    .get("attrs")
                    .and_then(|a| a.get("level"))
                    .and_then(Value::as_u64)
                    .unwrap_or(2);
                out.push_str(&format!(
                    "{} {}\n\n",
                    "#".repeat(level as usize),
                    inline_text(node)
                ));
            }
            "blockquote" => out.push_str(&format!("> {}\n\n", inline_text(node))),
            "codeBlock" => out.push_str(&format!("```\n{}\n```\n\n", inline_text(node))),
            "bulletList" => {
                for item in node
                    .get("content")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    out.push_str(&format!("- {}\n", inline_text(item)));
                }
                out.push('\n');
            }
            "orderedList" => {
                for (i, item) in node
                    .get("content")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .enumerate()
                {
                    out.push_str(&format!("{}. {}\n", i + 1, inline_text(item)));
                }
                out.push('\n');
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::domain::new_id;

    fn make_doc(blocks: serde_json::Value) -> String {
        serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000010",
            "title": "My Canvas",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": [{
                "id": "00000000-0000-7000-8000-000000000011",
                "title": "Scene One",
                "layoutPreset": "single_column",
                "atmosphere": "neutral",
                "motionPreset": "none",
                "blocks": blocks
            }]
        })
        .to_string()
    }

    fn seed_block() -> serde_json::Value {
        serde_json::json!({
            "kind": "rich_text",
            "id": new_id(),
            "content": {
                "type": "doc",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": " "}]}]
            }
        })
    }

    #[test]
    fn exports_document_title_and_scene_title() {
        let md = export(&make_doc(serde_json::json!([seed_block()]))).unwrap();
        assert!(md.contains("# My Canvas"));
        assert!(md.contains("## Scene One"));
    }

    #[test]
    fn exports_metric_block() {
        let blocks = serde_json::json!([{
            "kind": "metric", "id": new_id(),
            "label": "Revenue", "value": "100", "unit": "USD", "description": "Total"
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        assert!(md.contains("**Revenue:** 100 USD"));
        assert!(md.contains("Total"));
    }

    #[test]
    fn exports_image_block() {
        let asset_id = "00000000-0000-7000-8000-000000000012";
        let blocks = serde_json::json!([{
            "kind": "image", "id": new_id(),
            "assetId": asset_id, "alt": "Photo", "caption": ""
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        assert!(md.contains(&format!("![Photo](assets/{asset_id})")));
    }

    #[test]
    fn exports_timeline_block() {
        let blocks = serde_json::json!([{
            "kind": "timeline", "id": new_id(),
            "title": "History",
            "items": [{"id": new_id(), "label": "2020", "description": "Founded"}]
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        assert!(md.contains("### History"));
        assert!(md.contains("1. 2020: Founded"));
    }

    #[test]
    fn no_mdx_imports_or_absolute_paths() {
        let md = export(&make_doc(serde_json::json!([seed_block()]))).unwrap();
        assert!(!md.contains("import "));
        assert!(!md.contains("C:\\"));
    }

    #[test]
    fn image_export_uses_assets_prefix() {
        let asset_id = "00000000-0000-7000-8000-000000000099";
        let blocks = serde_json::json!([{
            "kind": "image", "id": new_id(),
            "assetId": asset_id, "alt": "Photo", "caption": ""
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        assert!(md.contains(&format!("assets/{asset_id}")));
        assert!(!md.contains(&format!("asset:{asset_id}")));
    }

    // sanitize_file_name -------------------------------------------------------

    #[test]
    fn sanitize_file_name_appends_md_extension() {
        assert_eq!(sanitize_file_name("my doc"), "my doc.md");
    }

    #[test]
    fn sanitize_file_name_strips_existing_extension() {
        assert_eq!(sanitize_file_name("notes.md"), "notes.md");
        assert_eq!(sanitize_file_name("notes.MD"), "notes.md");
    }

    #[test]
    fn sanitize_file_name_replaces_path_separators() {
        assert_eq!(sanitize_file_name("a/b\\c:d"), "a_b_c_d.md");
    }

    #[test]
    fn sanitize_file_name_rejects_windows_reserved() {
        assert_eq!(sanitize_file_name("CON"), "export.md");
        assert_eq!(sanitize_file_name("NUL.md"), "export.md");
        assert_eq!(sanitize_file_name("COM1"), "export.md");
    }

    #[test]
    fn sanitize_file_name_truncates_at_120_scalar_values() {
        let long: String = "a".repeat(200);
        let result = sanitize_file_name(&long);
        // stem is 120 chars, extension is ".md"
        assert_eq!(result.len(), 123); // 120 + 3 (".md")
    }

    #[test]
    fn sanitize_file_stem_empty_gives_export() {
        assert_eq!(sanitize_file_stem(""), "export");
        assert_eq!(sanitize_file_stem("..."), "export");
    }

    // import_as_canvas ---------------------------------------------------------

    #[test]
    fn import_as_canvas_uses_h1_as_title() {
        let doc_id = "00000000-0000-7000-8000-000000000020";
        let scene_id = "00000000-0000-7000-8000-000000000021";
        let block_id = "00000000-0000-7000-8000-000000000022";
        let md = "# My Title\n\nSome content.";
        let canonical =
            import_as_canvas(doc_id, scene_id, block_id, "file.md", "Fallback", md).unwrap();
        let v: serde_json::Value = serde_json::from_str(&canonical).unwrap();
        assert_eq!(v["title"].as_str().unwrap(), "My Title");
    }

    #[test]
    fn import_as_canvas_falls_back_to_file_stem() {
        let doc_id = "00000000-0000-7000-8000-000000000023";
        let scene_id = "00000000-0000-7000-8000-000000000024";
        let block_id = "00000000-0000-7000-8000-000000000025";
        let md = "Some content without a heading.";
        let canonical =
            import_as_canvas(doc_id, scene_id, block_id, "my-notes.md", "Fallback", md).unwrap();
        let v: serde_json::Value = serde_json::from_str(&canonical).unwrap();
        assert_eq!(v["title"].as_str().unwrap(), "my-notes");
    }

    #[test]
    fn import_as_canvas_produces_one_scene_one_rich_text_block() {
        let doc_id = "00000000-0000-7000-8000-000000000026";
        let scene_id = "00000000-0000-7000-8000-000000000027";
        let block_id = "00000000-0000-7000-8000-000000000028";
        let canonical =
            import_as_canvas(doc_id, scene_id, block_id, "doc.md", "Leaf", "Hello world.").unwrap();
        let v: serde_json::Value = serde_json::from_str(&canonical).unwrap();
        assert_eq!(v["schemaVersion"].as_i64().unwrap(), 1);
        assert_eq!(v["documentId"].as_str().unwrap(), doc_id);
        let scenes = v["scenes"].as_array().unwrap();
        assert_eq!(scenes.len(), 1);
        let blocks = scenes[0]["blocks"].as_array().unwrap();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0]["kind"].as_str().unwrap(), "rich_text");
    }

    #[test]
    fn import_as_canvas_passes_schema_validate() {
        let doc_id = "00000000-0000-7000-8000-000000000029";
        let scene_id = "00000000-0000-7000-8000-000000000030";
        let block_id = "00000000-0000-7000-8000-000000000031";
        let canonical = import_as_canvas(
            doc_id,
            scene_id,
            block_id,
            "doc.md",
            "Leaf",
            "Hello world.\n\n- item 1\n- item 2",
        )
        .unwrap();
        assert!(super::schema::validate(&canonical, Some(doc_id)).is_ok());
    }

    #[test]
    fn import_as_canvas_rejects_unsafe_markdown() {
        let doc_id = "00000000-0000-7000-8000-000000000032";
        let scene_id = "00000000-0000-7000-8000-000000000033";
        let block_id = "00000000-0000-7000-8000-000000000034";
        assert!(
            import_as_canvas(
                doc_id,
                scene_id,
                block_id,
                "x.md",
                "Leaf",
                "<script>alert(1)</script>"
            )
            .is_err()
        );
    }
}
