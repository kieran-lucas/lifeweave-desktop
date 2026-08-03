use super::domain::{NarrativeError, MAX_JSON_BYTES, MAX_PLAIN_TEXT_BYTES};
use serde_json::Value;
use std::collections::BTreeMap;

pub struct ValidatedNarrative {
    pub canonical_json: String,
    pub plain_text: String,
    pub assets: BTreeMap<String, i32>,
}

pub fn validate(raw: &str) -> Result<ValidatedNarrative, NarrativeError> {
    if raw.len() > MAX_JSON_BYTES {
        return Err(NarrativeError::Validation("Narrative document is too large."));
    }
    let v: Value = serde_json::from_str(raw)
        .map_err(|_| NarrativeError::Validation("Narrative JSON is invalid."))?;
    let obj = v.as_object().ok_or(NarrativeError::Validation("Narrative must be an object."))?;
    if obj.get("schemaVersion").and_then(Value::as_i64) != Some(1) {
        return Err(NarrativeError::Validation("Unsupported narrative schemaVersion."));
    }
    let document_id = obj
        .get("documentId")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Narrative documentId is missing."))?;
    if !super::domain::valid_id(document_id) {
        return Err(NarrativeError::Validation("Narrative documentId is invalid."));
    }
    let _title = obj
        .get("title")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Narrative title is missing."))?;
    let template_id = obj
        .get("templateId")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Narrative templateId is missing."))?;
    if !matches!(template_id, "strategy_dashboard" | "knowledge_dossier") {
        return Err(NarrativeError::Validation("Narrative templateId is unsupported."));
    }
    let scenes = obj
        .get("scenes")
        .and_then(Value::as_array)
        .ok_or(NarrativeError::Validation("Narrative scenes array is missing."))?;
    if scenes.is_empty() || scenes.len() > 1 {
        return Err(NarrativeError::Validation(
            "Narrative document must have exactly one scene.",
        ));
    }
    let mut plain_parts: Vec<String> = Vec::new();
    if let Some(t) = obj.get("title").and_then(Value::as_str) {
        if !t.is_empty() {
            plain_parts.push(t.to_owned());
        }
    }
    let mut assets: BTreeMap<String, i32> = BTreeMap::new();
    for scene in scenes {
        validate_scene(scene, &mut plain_parts, &mut assets)?;
    }
    let plain_text: String = plain_parts.join(" ");
    let plain_text: String = plain_text.chars().take(MAX_PLAIN_TEXT_BYTES).collect();
    Ok(ValidatedNarrative {
        canonical_json: serde_json::to_string(&v)
            .map_err(|_| NarrativeError::Validation("Narrative JSON serialization failed."))?,
        plain_text,
        assets,
    })
}

fn validate_scene(
    scene: &Value,
    plain_parts: &mut Vec<String>,
    assets: &mut BTreeMap<String, i32>,
) -> Result<(), NarrativeError> {
    let obj = scene
        .as_object()
        .ok_or(NarrativeError::Validation("Scene must be an object."))?;
    let id = obj
        .get("id")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene id is missing."))?;
    if !super::domain::valid_id(id) {
        return Err(NarrativeError::Validation("Scene id is invalid."));
    }
    if let Some(t) = obj.get("title").and_then(Value::as_str) {
        if !t.is_empty() {
            plain_parts.push(t.to_owned());
        }
    }
    let layout = obj
        .get("layoutPreset")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene layoutPreset is missing."))?;
    if !matches!(layout, "hero" | "single_column" | "two_column" | "bento") {
        return Err(NarrativeError::Validation("Scene layoutPreset is unsupported."));
    }
    let atm = obj
        .get("atmosphere")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene atmosphere is missing."))?;
    if !matches!(atm, "neutral" | "sky" | "crystal") {
        return Err(NarrativeError::Validation("Scene atmosphere is unsupported."));
    }
    let motion = obj
        .get("motionPreset")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene motionPreset is missing."))?;
    if !matches!(motion, "none" | "reveal" | "stagger") {
        return Err(NarrativeError::Validation("Scene motionPreset is unsupported."));
    }
    let blocks = obj
        .get("blocks")
        .and_then(Value::as_array)
        .ok_or(NarrativeError::Validation("Scene blocks array is missing."))?;
    if blocks.len() > 200 {
        return Err(NarrativeError::Validation("Scene has too many blocks."));
    }
    for block in blocks {
        validate_block(block, plain_parts, assets)?;
    }
    Ok(())
}

fn validate_block(
    block: &Value,
    plain_parts: &mut Vec<String>,
    assets: &mut BTreeMap<String, i32>,
) -> Result<(), NarrativeError> {
    let obj = block
        .as_object()
        .ok_or(NarrativeError::Validation("Block must be an object."))?;
    let id = obj
        .get("id")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Block id is missing."))?;
    if !super::domain::valid_id(id) {
        return Err(NarrativeError::Validation("Block id is invalid."));
    }
    let kind = obj
        .get("kind")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Block kind is missing."))?;
    match kind {
        "rich_text" => {
            let content = obj
                .get("content")
                .ok_or(NarrativeError::Validation("rich_text block content is missing."))?;
            let text = extract_rich_text(content);
            if !text.is_empty() {
                plain_parts.push(text);
            }
        }
        "metric" => {
            let label = obj
                .get("label")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("metric label is missing."))?;
            let value = obj
                .get("value")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("metric value is missing."))?;
            let unit = obj
                .get("unit")
                .and_then(Value::as_str)
                .unwrap_or("");
            let description = obj
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or("");
            let text = format!("{label} {value} {unit} {description}").trim().to_owned();
            if !text.is_empty() {
                plain_parts.push(text);
            }
        }
        "image" => {
            let asset_id = obj
                .get("assetId")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("image assetId is missing."))?;
            if !super::domain::valid_id(asset_id) {
                return Err(NarrativeError::Validation("image assetId is invalid."));
            }
            *assets.entry(asset_id.to_owned()).or_insert(0) += 1;
            let alt = obj.get("alt").and_then(Value::as_str).unwrap_or("");
            let caption = obj.get("caption").and_then(Value::as_str).unwrap_or("");
            let text = format!("{alt} {caption}").trim().to_owned();
            if !text.is_empty() {
                plain_parts.push(text);
            }
        }
        "callout" => {
            let variant = obj
                .get("variant")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("callout variant is missing."))?;
            if !matches!(variant, "note" | "warning" | "tip") {
                return Err(NarrativeError::Validation("callout variant is unsupported."));
            }
            let content = obj
                .get("content")
                .ok_or(NarrativeError::Validation("callout content is missing."))?;
            let text = extract_rich_text(content);
            if !text.is_empty() {
                plain_parts.push(text);
            }
        }
        "timeline" => {
            let title = obj.get("title").and_then(Value::as_str).unwrap_or("");
            if !title.is_empty() {
                plain_parts.push(title.to_owned());
            }
            if let Some(items) = obj.get("items").and_then(Value::as_array) {
                if items.len() > 500 {
                    return Err(NarrativeError::Validation("timeline has too many items."));
                }
                for item in items {
                    let item_obj = item
                        .as_object()
                        .ok_or(NarrativeError::Validation("timeline item must be an object."))?;
                    if let Some(label) = item_obj.get("label").and_then(Value::as_str) {
                        if !label.is_empty() {
                            plain_parts.push(label.to_owned());
                        }
                    }
                    if let Some(desc) = item_obj.get("description").and_then(Value::as_str) {
                        if !desc.is_empty() {
                            plain_parts.push(desc.to_owned());
                        }
                    }
                }
            }
        }
        _ => {
            // Unknown block kinds are rejected in Task 21 single-scene vertical slice.
            return Err(NarrativeError::Validation("Block kind is unsupported."));
        }
    }
    Ok(())
}

fn walk_text(node: &Value) -> String {
    if let Some(obj) = node.as_object() {
        if obj.get("type").and_then(Value::as_str) == Some("text") {
            return obj.get("text").and_then(Value::as_str).unwrap_or("").to_owned();
        }
        if let Some(children) = obj.get("content").and_then(Value::as_array) {
            return children.iter().map(walk_text).collect::<Vec<_>>().join("");
        }
    }
    String::new()
}

fn extract_rich_text(content: &Value) -> String {
    walk_text(content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::domain::new_id;

    fn scene(blocks: serde_json::Value) -> serde_json::Value {
        serde_json::json!({
            "id": "00000000-0000-7000-8000-000000000001",
            "title": "Scene",
            "layoutPreset": "single_column",
            "atmosphere": "neutral",
            "motionPreset": "none",
            "blocks": blocks
        })
    }

    fn doc_with_scene(s: serde_json::Value) -> String {
        serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
            "scenes": [s]
        })
        .to_string()
    }

    #[test]
    fn validates_empty_scene() {
        let raw = doc_with_scene(scene(serde_json::json!([])));
        let v = validate(&raw).unwrap();
        assert_eq!(v.plain_text, "Test Scene");
        assert!(v.assets.is_empty());
    }

    #[test]
    fn validates_all_block_kinds() {
        let asset_id = "00000000-0000-7000-8000-000000000003";
        let blocks = serde_json::json!([
            {"kind":"rich_text","id":new_id(),"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}},
            {"kind":"metric","id":new_id(),"label":"Revenue","value":"100","unit":"USD","description":"Total"},
            {"kind":"image","id":new_id(),"assetId":asset_id,"alt":"Photo","caption":"Caption"},
            {"kind":"callout","id":new_id(),"variant":"note","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Note"}]}]}},
            {"kind":"timeline","id":new_id(),"title":"Timeline","items":[{"id":new_id(),"label":"Step 1","description":"First step"}]}
        ]);
        let raw = doc_with_scene(scene(blocks));
        let v = validate(&raw).unwrap();
        assert!(v.plain_text.contains("Hello"));
        assert!(v.plain_text.contains("Revenue"));
        assert!(v.plain_text.contains("Photo"));
        assert!(v.plain_text.contains("Note"));
        assert!(v.plain_text.contains("Timeline"));
        assert_eq!(v.assets.get(asset_id), Some(&1));
    }

    #[test]
    fn rejects_zero_and_two_scenes() {
        let base = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
        });
        let mut zero = base.clone();
        zero["scenes"] = serde_json::json!([]);
        assert!(validate(&zero.to_string()).is_err());

        let mut two = base.clone();
        two["scenes"] = serde_json::json!([scene(serde_json::json!([])), scene(serde_json::json!([]))]);
        assert!(validate(&two.to_string()).is_err());
    }

    #[test]
    fn rejects_unknown_block_kind() {
        let blocks = serde_json::json!([{"kind":"video","id":new_id()}]);
        let raw = doc_with_scene(scene(blocks));
        assert!(validate(&raw).is_err());
    }

    #[test]
    fn rejects_invalid_callout_variant() {
        let blocks = serde_json::json!([{
            "kind":"callout","id":new_id(),"variant":"danger",
            "content":{"type":"doc","content":[]}
        }]);
        let raw = doc_with_scene(scene(blocks));
        assert!(validate(&raw).is_err());
    }
}
