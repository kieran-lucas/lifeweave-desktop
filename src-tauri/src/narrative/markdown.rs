use super::{domain::NarrativeError, schema};
use serde_json::Value;

pub fn export(canonical: &str) -> Result<String, NarrativeError> {
    schema::validate(canonical)?;
    let v: Value = serde_json::from_str(canonical)
        .map_err(|_| NarrativeError::Validation("Narrative JSON is invalid."))?;
    let mut out = String::new();
    let title = v.get("title").and_then(Value::as_str).unwrap_or("");
    out.push_str(&format!("# {title}\n\n"));
    for scene in v.get("scenes").and_then(Value::as_array).into_iter().flatten() {
        let scene_title = scene.get("title").and_then(Value::as_str).unwrap_or("");
        if !scene_title.is_empty() {
            out.push_str(&format!("## {scene_title}\n\n"));
        }
        for block in scene.get("blocks").and_then(Value::as_array).into_iter().flatten() {
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
            let desc = block.get("description").and_then(Value::as_str).unwrap_or("");
            out.push_str(&format!("**{label}:** {value} {unit}\n\n"));
            if !desc.is_empty() {
                out.push_str(&format!("{desc}\n\n"));
            }
        }
        "image" => {
            let asset_id = block.get("assetId").and_then(Value::as_str).unwrap_or("missing");
            let alt = block.get("alt").and_then(Value::as_str).unwrap_or("");
            out.push_str(&format!("![{alt}](asset:{asset_id})\n\n"));
        }
        "callout" => {
            let variant = block.get("variant").and_then(Value::as_str).unwrap_or("note");
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
                let desc = item.get("description").and_then(Value::as_str).unwrap_or("");
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
            let text = obj.get("text").and_then(Value::as_str).unwrap_or("").to_owned();
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
            return children.iter().map(inline_text).collect::<Vec<_>>().join("");
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
                out.push_str(&format!("{} {}\n\n", "#".repeat(level as usize), inline_text(node)));
            }
            "blockquote" => out.push_str(&format!("> {}\n\n", inline_text(node))),
            "codeBlock" => out.push_str(&format!("```\n{}\n```\n\n", inline_text(node))),
            "bulletList" => {
                for item in node.get("content").and_then(Value::as_array).into_iter().flatten() {
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

    #[test]
    fn exports_document_title_and_scene_title() {
        let md = export(&make_doc(serde_json::json!([]))).unwrap();
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
        assert!(md.contains(&format!("![Photo](asset:{asset_id})")));
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
        let md = export(&make_doc(serde_json::json!([]))).unwrap();
        assert!(!md.contains("import "));
        assert!(!md.contains("C:\\"));
    }
}
