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
        .filter(|c| !c.is_control())
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
    if t.is_empty() {
        return "narrative-canvas".to_owned();
    }
    let primary_stem = t.split('.').next().unwrap_or(t);
    if WINDOWS_RESERVED_NAMES.contains(&primary_stem.to_uppercase().as_str()) {
        return "narrative-canvas".to_owned();
    }
    t.to_owned()
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
    let title = if stem.is_empty() || stem == "narrative-canvas" {
        fallback_title.to_owned()
    } else {
        stem
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
            render_block(block, &mut out)?;
        }
    }
    Ok(out.trim_end().to_owned() + "\n")
}

fn render_block(block: &Value, out: &mut String) -> Result<(), NarrativeError> {
    let kind = block.get("kind").and_then(Value::as_str).unwrap_or("");
    match kind {
        "rich_text" => {
            if let Some(content) = block.get("content") {
                let json = serde_json::to_string(content)
                    .map_err(|_| NarrativeError::Validation("Rich text content is invalid."))?;
                let md = crate::document::markdown::export(&json)
                    .map_err(|_| NarrativeError::Validation("Rich text content export failed."))?;
                out.push_str(&md);
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
            let caption = block.get("caption").and_then(Value::as_str).unwrap_or("");
            out.push_str(&format!("![{alt}](assets/{asset_id})\n\n"));
            if !caption.is_empty() {
                out.push_str(&format!("*{caption}*\n\n"));
            }
        }
        "callout" => {
            let variant = block
                .get("variant")
                .and_then(Value::as_str)
                .unwrap_or("note");
            let variant_upper = variant.to_uppercase();
            out.push_str(&format!("> [!{variant_upper}]\n"));
            if let Some(content) = block.get("content") {
                let json = serde_json::to_string(content)
                    .map_err(|_| NarrativeError::Validation("Callout content is invalid."))?;
                let md = crate::document::markdown::export(&json)
                    .map_err(|_| NarrativeError::Validation("Callout content export failed."))?;
                for line in md.trim_end().lines() {
                    if line.is_empty() {
                        out.push_str(">\n");
                    } else {
                        out.push_str(&format!("> {line}\n"));
                    }
                }
            }
            out.push('\n');
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
        _ => {
            let safe_kind: String = kind
                .chars()
                .take(64)
                .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
                .collect();
            if !safe_kind.is_empty() {
                out.push_str(&format!(
                    "> [!WARNING]\n> Unsupported Canvas block: {safe_kind}\n\n"
                ));
            }
        }
    }
    Ok(())
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
    fn exports_callout_block_with_admonition_format() {
        let blocks = serde_json::json!([{
            "kind": "callout", "id": new_id(),
            "variant": "warning",
            "content": {
                "type": "doc",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Caution!"}]}]
            }
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        assert!(md.contains("> [!WARNING]"));
        assert!(md.contains("> Caution!"));
    }

    #[test]
    fn exports_unknown_block_as_warning_placeholder() {
        // schema::validate preserves unknown blocks in `canonical` field; build raw JSON directly
        let raw = serde_json::json!({
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
                "blocks": [{
                    "kind": "future_block",
                    "id": "ffffffff-ffff-7fff-8fff-000000000099",
                    "canonical": {
                        "kind": "future_block",
                        "id": "ffffffff-ffff-7fff-8fff-000000000099"
                    }
                }]
            }]
        })
        .to_string();
        let md = export(&raw).unwrap();
        assert!(md.contains("> [!WARNING]"));
        assert!(md.contains("Unsupported Canvas block: future_block"));
    }

    #[test]
    fn exports_rich_text_using_basic_leaf_exporter() {
        let blocks = serde_json::json!([{
            "kind": "rich_text",
            "id": new_id(),
            "content": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Hello", "marks": [{"type": "bold"}]}]},
                    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Section"}]}
                ]
            }
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        // Bold text and heading should be correctly rendered by document::markdown::export
        assert!(md.contains("**Hello**"));
        assert!(md.contains("## Section"));
    }

    #[test]
    fn exports_image_block_with_caption() {
        let asset_id = "00000000-0000-7000-8000-000000000012";
        let blocks = serde_json::json!([{
            "kind": "image", "id": new_id(),
            "assetId": asset_id, "alt": "Chart", "caption": "Figure 1"
        }]);
        let md = export(&make_doc(blocks)).unwrap();
        assert!(md.contains(&format!("![Chart](assets/{asset_id})")));
        assert!(md.contains("*Figure 1*"));
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
        assert_eq!(sanitize_file_name("CON"), "narrative-canvas.md");
        assert_eq!(sanitize_file_name("NUL.md"), "narrative-canvas.md");
        assert_eq!(sanitize_file_name("COM1"), "narrative-canvas.md");
        assert_eq!(sanitize_file_name("CON.txt"), "narrative-canvas.md");
        assert_eq!(sanitize_file_name("COM1.any"), "narrative-canvas.md");
        assert_eq!(sanitize_file_name("LPT9.backup"), "narrative-canvas.md");
    }

    #[test]
    fn sanitize_file_name_truncates_at_120_scalar_values() {
        let long: String = "a".repeat(200);
        let result = sanitize_file_name(&long);
        // stem is 120 chars, extension is ".md"
        assert_eq!(result.len(), 123); // 120 + 3 (".md")
    }

    #[test]
    fn sanitize_file_stem_empty_gives_narrative_canvas() {
        assert_eq!(sanitize_file_stem(""), "narrative-canvas");
        assert_eq!(sanitize_file_stem("..."), "narrative-canvas");
    }

    // import_as_canvas ---------------------------------------------------------

    #[test]
    fn import_as_canvas_uses_file_stem_not_h1() {
        let doc_id = "00000000-0000-7000-8000-000000000020";
        let scene_id = "00000000-0000-7000-8000-000000000021";
        let block_id = "00000000-0000-7000-8000-000000000022";
        let md = "# My Title\n\nSome content.";
        let canonical =
            import_as_canvas(doc_id, scene_id, block_id, "file.md", "Fallback", md).unwrap();
        let v: serde_json::Value = serde_json::from_str(&canonical).unwrap();
        // Title must come from filename stem, not H1
        assert_eq!(v["title"].as_str().unwrap(), "file");
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
