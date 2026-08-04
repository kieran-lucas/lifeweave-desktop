use super::domain::{MAX_JSON_BYTES, MAX_PLAIN_TEXT_BYTES, NarrativeError};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub struct ValidatedNarrative {
    pub canonical_json: String,
    pub plain_text: String,
    pub assets: BTreeMap<String, i32>,
}

fn valid_narrative_id(value: &str) -> bool {
    value.len() == 36
        && uuid::Uuid::parse_str(value)
            .ok()
            .filter(|u| u.get_version() == Some(uuid::Version::SortRand))
            .is_some()
}

fn truncate_utf8(s: &str, max_bytes: usize) -> &str {
    if s.len() <= max_bytes {
        return s;
    }
    let mut end = max_bytes;
    while !s.is_char_boundary(end) {
        end -= 1;
    }
    &s[..end]
}

fn validate_island(content: &Value) -> Result<(String, BTreeMap<String, i32>), NarrativeError> {
    let raw = serde_json::to_string(content)
        .map_err(|_| NarrativeError::Validation("Rich text content is invalid."))?;
    crate::document::schema::validate(&raw)
        .map(|v| (v.plain_text, v.assets))
        .map_err(|_| NarrativeError::Validation("Rich text content contains invalid content."))
}

pub fn validate(
    raw: &str,
    expected_document_id: Option<&str>,
) -> Result<ValidatedNarrative, NarrativeError> {
    if raw.len() > MAX_JSON_BYTES {
        return Err(NarrativeError::Validation(
            "Narrative document is too large.",
        ));
    }
    let v: Value = serde_json::from_str(raw)
        .map_err(|_| NarrativeError::Validation("Narrative JSON is invalid."))?;
    let obj = v
        .as_object()
        .ok_or(NarrativeError::Validation("Narrative must be an object."))?;

    if obj.get("schemaVersion").and_then(Value::as_i64) != Some(1) {
        return Err(NarrativeError::Validation(
            "Unsupported narrative schemaVersion.",
        ));
    }

    let document_id =
        obj.get("documentId")
            .and_then(Value::as_str)
            .ok_or(NarrativeError::Validation(
                "Narrative documentId is missing.",
            ))?;
    if !valid_narrative_id(document_id) {
        return Err(NarrativeError::Validation(
            "Narrative documentId is invalid.",
        ));
    }
    if let Some(expected) = expected_document_id {
        if document_id != expected {
            return Err(NarrativeError::Validation(
                "Narrative documentId does not match expected identity.",
            ));
        }
    }

    let title = obj
        .get("title")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Narrative title is missing."))?;
    let title_trimmed = title.trim();
    if title_trimmed.is_empty() || title_trimmed.len() > 200 {
        return Err(NarrativeError::Validation(
            "Narrative title must be 1 to 200 characters.",
        ));
    }

    let template_id =
        obj.get("templateId")
            .and_then(Value::as_str)
            .ok_or(NarrativeError::Validation(
                "Narrative templateId is missing.",
            ))?;
    if super::templates::NarrativeTemplateId::parse(template_id).is_none() {
        return Err(NarrativeError::Validation(
            "Narrative templateId is unsupported.",
        ));
    }

    if obj.get("templateVersion").and_then(Value::as_i64) != Some(1) {
        return Err(NarrativeError::Validation(
            "Narrative templateVersion must be 1.",
        ));
    }
    if let Some(value) = obj.get("visualWorldId") {
        let value = value.as_str().ok_or(NarrativeError::Validation(
            "Narrative visualWorldId must be a string.",
        ))?;
        if super::visual_worlds::NarrativeVisualWorldId::parse(value).is_none() {
            return Err(NarrativeError::Validation(
                "Narrative visualWorldId is unsupported.",
            ));
        }
    }

    let scenes = obj
        .get("scenes")
        .and_then(Value::as_array)
        .ok_or(NarrativeError::Validation(
            "Narrative scenes array is missing.",
        ))?;
    if scenes.is_empty() || scenes.len() > 20 {
        return Err(NarrativeError::Validation(
            "Narrative document must have 1 to 20 scenes.",
        ));
    }

    let mut plain_parts: Vec<String> = Vec::new();
    plain_parts.push(title_trimmed.to_owned());

    let mut assets: BTreeMap<String, i32> = BTreeMap::new();
    let mut seen_ids: BTreeSet<String> = BTreeSet::new();

    for scene in scenes {
        validate_scene(scene, &mut plain_parts, &mut assets, &mut seen_ids)?;
    }

    let plain_joined = plain_parts.join(" ");
    let plain_text = truncate_utf8(&plain_joined, MAX_PLAIN_TEXT_BYTES).to_owned();

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
    seen_ids: &mut BTreeSet<String>,
) -> Result<(), NarrativeError> {
    let obj = scene
        .as_object()
        .ok_or(NarrativeError::Validation("Scene must be an object."))?;

    let id = obj
        .get("id")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene id is missing."))?;
    if !valid_narrative_id(id) {
        return Err(NarrativeError::Validation("Scene id is invalid."));
    }
    if seen_ids.contains(id) {
        return Err(NarrativeError::Validation("Duplicate block or scene ID."));
    }
    seen_ids.insert(id.to_owned());

    if let Some(t) = obj.get("title").and_then(Value::as_str) {
        let trimmed = t.trim();
        if trimmed.len() > 160 {
            return Err(NarrativeError::Validation(
                "Scene title must be at most 160 characters.",
            ));
        }
        if !trimmed.is_empty() {
            plain_parts.push(trimmed.to_owned());
        }
    }

    let layout = obj
        .get("layoutPreset")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene layoutPreset is missing."))?;
    if !matches!(layout, "single_column") {
        return Err(NarrativeError::Validation(
            "Scene layoutPreset must be single_column.",
        ));
    }

    let atm = obj
        .get("atmosphere")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene atmosphere is missing."))?;
    if !matches!(atm, "neutral") {
        return Err(NarrativeError::Validation(
            "Scene atmosphere must be neutral.",
        ));
    }

    let motion = obj
        .get("motionPreset")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Scene motionPreset is missing."))?;
    if !matches!(motion, "none") {
        return Err(NarrativeError::Validation(
            "Scene motionPreset must be none.",
        ));
    }

    let blocks = obj
        .get("blocks")
        .and_then(Value::as_array)
        .ok_or(NarrativeError::Validation("Scene blocks array is missing."))?;
    if blocks.is_empty() || blocks.len() > 128 {
        return Err(NarrativeError::Validation(
            "Scene must have 1 to 128 blocks.",
        ));
    }

    for block in blocks {
        validate_block(block, plain_parts, assets, seen_ids)?;
    }
    Ok(())
}

fn validate_block(
    block: &Value,
    plain_parts: &mut Vec<String>,
    assets: &mut BTreeMap<String, i32>,
    seen_ids: &mut BTreeSet<String>,
) -> Result<(), NarrativeError> {
    let obj = block
        .as_object()
        .ok_or(NarrativeError::Validation("Block must be an object."))?;

    let kind = obj
        .get("kind")
        .and_then(Value::as_str)
        .ok_or(NarrativeError::Validation("Block kind is missing."))?;
    if kind.trim().is_empty() {
        return Err(NarrativeError::Validation("Block kind must not be empty."));
    }

    match kind {
        "rich_text" | "metric" | "image" | "callout" | "timeline" => {
            // Known blocks must have a valid UUIDv7 id
            let id = obj
                .get("id")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("Block id is missing."))?;
            if !valid_narrative_id(id) {
                return Err(NarrativeError::Validation("Block id is invalid."));
            }
            if seen_ids.contains(id) {
                return Err(NarrativeError::Validation("Duplicate block or scene ID."));
            }
            seen_ids.insert(id.to_owned());
        }
        _ => {}
    }

    match kind {
        "rich_text" => {
            let content = obj.get("content").ok_or(NarrativeError::Validation(
                "rich_text block content is missing.",
            ))?;
            let (text, block_assets) = validate_island(content)?;
            if !text.is_empty() {
                plain_parts.push(text);
            }
            for (k, v) in block_assets {
                *assets.entry(k).or_insert(0) += v;
            }
        }
        "metric" => {
            let label = obj
                .get("label")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("metric label is missing."))?;
            let label_trimmed = label.trim();
            if label_trimmed.is_empty() || label_trimmed.len() > 120 {
                return Err(NarrativeError::Validation(
                    "metric label must be 1 to 120 characters.",
                ));
            }
            let value = obj
                .get("value")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("metric value is missing."))?;
            let value_trimmed = value.trim();
            if value_trimmed.len() > 120 {
                return Err(NarrativeError::Validation(
                    "metric value must be at most 120 characters.",
                ));
            }
            let unit = obj.get("unit").and_then(Value::as_str).unwrap_or("");
            if unit.len() > 40 {
                return Err(NarrativeError::Validation(
                    "metric unit must be at most 40 characters.",
                ));
            }
            let description = obj.get("description").and_then(Value::as_str).unwrap_or("");
            if description.len() > 500 {
                return Err(NarrativeError::Validation(
                    "metric description must be at most 500 characters.",
                ));
            }
            let text = format!("{label_trimmed} {value_trimmed} {unit} {description}")
                .trim()
                .to_owned();
            if !text.is_empty() {
                plain_parts.push(text);
            }
        }
        "image" => {
            let asset_id = obj
                .get("assetId")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("image assetId is missing."))?;
            if !valid_narrative_id(asset_id) {
                return Err(NarrativeError::Validation("image assetId is invalid."));
            }
            *assets.entry(asset_id.to_owned()).or_insert(0) += 1;
            let alt = obj
                .get("alt")
                .and_then(Value::as_str)
                .ok_or(NarrativeError::Validation("image alt is missing."))?;
            let alt_trimmed = alt.trim();
            if alt_trimmed.is_empty() || alt_trimmed.len() > 500 {
                return Err(NarrativeError::Validation(
                    "image alt must be 1 to 500 characters.",
                ));
            }
            let caption = obj.get("caption").and_then(Value::as_str).unwrap_or("");
            if caption.len() > 500 {
                return Err(NarrativeError::Validation(
                    "image caption must be at most 500 characters.",
                ));
            }
            let text = format!("{alt_trimmed} {caption}").trim().to_owned();
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
                return Err(NarrativeError::Validation(
                    "callout variant is unsupported.",
                ));
            }
            let content = obj
                .get("content")
                .ok_or(NarrativeError::Validation("callout content is missing."))?;
            let (text, block_assets) = validate_island(content)?;
            if !text.is_empty() {
                plain_parts.push(text);
            }
            for (k, v) in block_assets {
                *assets.entry(k).or_insert(0) += v;
            }
        }
        "timeline" => {
            let title = obj.get("title").and_then(Value::as_str).unwrap_or("");
            let title_trimmed = title.trim();
            if title_trimmed.len() > 160 {
                return Err(NarrativeError::Validation(
                    "timeline title must be at most 160 characters.",
                ));
            }
            if !title_trimmed.is_empty() {
                plain_parts.push(title_trimmed.to_owned());
            }
            if let Some(items) = obj.get("items").and_then(Value::as_array) {
                if items.len() > 100 {
                    return Err(NarrativeError::Validation(
                        "timeline has too many items (max 100).",
                    ));
                }
                for item in items {
                    let item_obj = item.as_object().ok_or(NarrativeError::Validation(
                        "timeline item must be an object.",
                    ))?;
                    // Optional UUIDv7 id on timeline items
                    if let Some(item_id) = item_obj.get("id").and_then(Value::as_str) {
                        if !valid_narrative_id(item_id) {
                            return Err(NarrativeError::Validation("timeline item id is invalid."));
                        }
                        if seen_ids.contains(item_id) {
                            return Err(NarrativeError::Validation("Duplicate block or scene ID."));
                        }
                        seen_ids.insert(item_id.to_owned());
                    }
                    if let Some(label) = item_obj.get("label").and_then(Value::as_str) {
                        let label_trimmed = label.trim();
                        if label_trimmed.is_empty() || label_trimmed.len() > 160 {
                            return Err(NarrativeError::Validation(
                                "timeline item label must be 1 to 160 characters.",
                            ));
                        }
                        plain_parts.push(label_trimmed.to_owned());
                    }
                    if let Some(desc) = item_obj.get("description").and_then(Value::as_str) {
                        if desc.len() > 500 {
                            return Err(NarrativeError::Validation(
                                "timeline item description must be at most 500 characters.",
                            ));
                        }
                        if !desc.trim().is_empty() {
                            plain_parts.push(desc.to_owned());
                        }
                    }
                }
            }
        }
        _ => {
            // Unknown block: preserve as-is, excluded from plain_text and assets
            // kind is already confirmed non-empty string above
            if kind.len() > 64 {
                return Err(NarrativeError::Validation(
                    "Unknown block kind exceeds 64 characters.",
                ));
            }
            // Validate id if present: must be valid UUIDv7
            if let Some(id_val) = obj.get("id").and_then(Value::as_str) {
                if !valid_narrative_id(id_val) {
                    return Err(NarrativeError::Validation("Unknown block has invalid id."));
                }
                if seen_ids.contains(id_val) {
                    return Err(NarrativeError::Validation("Duplicate block or scene ID."));
                }
                seen_ids.insert(id_val.to_owned());
            }
            // Bound raw payload <= 64 KiB
            let raw_block = serde_json::to_string(block)
                .map_err(|_| NarrativeError::Validation("Unknown block serialization failed."))?;
            if raw_block.len() > 65_536 {
                return Err(NarrativeError::Validation(
                    "Unknown block payload exceeds 64 KiB.",
                ));
            }
            // Unknown blocks do NOT contribute to plain_text or assets.
            // The block is preserved as-is in canonical_json.
        }
    }
    Ok(())
}

fn walk_text(node: &Value) -> String {
    if let Some(obj) = node.as_object() {
        if obj.get("type").and_then(Value::as_str) == Some("text") {
            return obj
                .get("text")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_owned();
        }
        if let Some(children) = obj.get("content").and_then(Value::as_array) {
            return children.iter().map(walk_text).collect::<Vec<_>>().join("");
        }
    }
    String::new()
}

#[allow(dead_code)]
fn extract_rich_text(content: &Value) -> String {
    walk_text(content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::narrative::domain::new_id;

    fn rich_text_block(id: &str) -> serde_json::Value {
        serde_json::json!({
            "kind": "rich_text",
            "id": id,
            "content": {
                "type": "doc",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]
            }
        })
    }

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
            "templateVersion": 1,
            "scenes": [s]
        })
        .to_string()
    }

    #[test]
    fn validates_single_block_scene() {
        let block_id = new_id();
        let raw = doc_with_scene(scene(serde_json::json!([rich_text_block(&block_id)])));
        let v = validate(&raw, None).unwrap();
        assert!(v.plain_text.contains("Test"));
        assert!(v.plain_text.contains("Scene"));
        assert!(v.plain_text.contains("Hello"));
        assert!(v.assets.is_empty());
    }

    #[test]
    fn validates_all_block_kinds() {
        let asset_id = "00000000-0000-7000-8000-000000000003";
        let blocks = serde_json::json!([
            {
                "kind": "rich_text",
                "id": new_id(),
                "content": {
                    "type": "doc",
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]
                }
            },
            {"kind": "metric", "id": new_id(), "label": "Revenue", "value": "100", "unit": "USD", "description": "Total"},
            {"kind": "image", "id": new_id(), "assetId": asset_id, "alt": "Photo", "caption": "Caption"},
            {
                "kind": "callout",
                "id": new_id(),
                "variant": "note",
                "content": {
                    "type": "doc",
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Note"}]}]
                }
            },
            {
                "kind": "timeline",
                "id": new_id(),
                "title": "Timeline",
                "items": [{"id": new_id(), "label": "Step 1", "description": "First step"}]
            }
        ]);
        let raw = doc_with_scene(scene(blocks));
        let v = validate(&raw, None).unwrap();
        assert!(v.plain_text.contains("Hello"));
        assert!(v.plain_text.contains("Revenue"));
        assert!(v.plain_text.contains("Photo"));
        assert!(v.plain_text.contains("Note"));
        assert!(v.plain_text.contains("Timeline"));
        assert_eq!(v.assets.get(asset_id), Some(&1));
    }

    #[test]
    fn rejects_zero_scenes() {
        let base = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": []
        });
        assert!(validate(&base.to_string(), None).is_err());
    }

    #[test]
    fn accepts_two_scenes() {
        let block_id = new_id();
        let base = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": [
                scene(serde_json::json!([rich_text_block(&block_id)])),
                {
                    "id": "00000000-0000-7000-8000-000000000099",
                    "title": "Scene 2",
                    "layoutPreset": "single_column",
                    "atmosphere": "neutral",
                    "motionPreset": "none",
                    "blocks": [rich_text_block(&new_id())]
                }
            ]
        });
        assert!(validate(&base.to_string(), None).is_ok());
    }

    #[test]
    fn accepts_twenty_scenes() {
        let scenes: Vec<serde_json::Value> = (0..20)
            .map(|i| {
                serde_json::json!({
                    "id": format!("00000000-0000-7000-8000-{:012}", i + 10),
                    "title": format!("Scene {}", i + 1),
                    "layoutPreset": "single_column",
                    "atmosphere": "neutral",
                    "motionPreset": "none",
                    "blocks": [rich_text_block(&new_id())]
                })
            })
            .collect();
        let doc = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": scenes
        });
        assert!(validate(&doc.to_string(), None).is_ok());
    }

    #[test]
    fn rejects_twenty_one_scenes() {
        let scenes: Vec<serde_json::Value> = (0..21)
            .map(|i| {
                serde_json::json!({
                    "id": format!("00000000-0000-7000-8000-{:012}", i + 10),
                    "title": format!("Scene {}", i + 1),
                    "layoutPreset": "single_column",
                    "atmosphere": "neutral",
                    "motionPreset": "none",
                    "blocks": [rich_text_block(&new_id())]
                })
            })
            .collect();
        let doc = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": scenes
        });
        match validate(&doc.to_string(), None) {
            Err(NarrativeError::Validation(msg)) => assert!(msg.contains("1 to 20")),
            other => panic!("expected Validation error, got {:?}", other.is_ok()),
        }
    }

    #[test]
    fn rejects_invalid_callout_variant() {
        let blocks = serde_json::json!([{
            "kind": "callout",
            "id": new_id(),
            "variant": "danger",
            "content": {"type": "doc", "content": []}
        }]);
        let raw = doc_with_scene(scene(blocks));
        assert!(validate(&raw, None).is_err());
    }

    #[test]
    fn unknown_block_preserved() {
        let block_id = new_id();
        let unknown_id = new_id();
        let blocks = serde_json::json!([
            rich_text_block(&block_id),
            {"kind": "custom_widget", "id": unknown_id, "data": "extra"}
        ]);
        let raw = doc_with_scene(scene(blocks));
        let v = validate(&raw, None).unwrap();
        // Unknown blocks preserved in canonical_json
        assert!(v.canonical_json.contains("custom_widget"));
        // Unknown blocks do NOT contribute to plain_text
        assert!(!v.plain_text.contains("extra"));
    }

    #[test]
    fn duplicate_id_rejected() {
        let shared_id = new_id();
        let blocks = serde_json::json!([rich_text_block(&shared_id), rich_text_block(&shared_id)]);
        let raw = doc_with_scene(scene(blocks));
        assert!(validate(&raw, None).is_err());
    }

    #[test]
    fn identity_mismatch_rejected() {
        let block_id = new_id();
        let raw = doc_with_scene(scene(serde_json::json!([rich_text_block(&block_id)])));
        // Pass a different expected document ID
        assert!(validate(&raw, Some("00000000-0000-7000-8000-000000000099")).is_err());
    }

    #[test]
    fn identity_match_accepted() {
        let block_id = new_id();
        let raw = doc_with_scene(scene(serde_json::json!([rich_text_block(&block_id)])));
        assert!(validate(&raw, Some("00000000-0000-7000-8000-000000000002")).is_ok());
    }

    #[test]
    fn template_id_not_knowledge_dossier_rejected() {
        let block_id = new_id();
        let doc = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "strategy_dashboard",
            "templateVersion": 1,
            "scenes": [scene(serde_json::json!([rich_text_block(&block_id)]))]
        });
        assert!(validate(&doc.to_string(), None).is_err());
    }

    #[test]
    fn layout_not_single_column_rejected() {
        let block_id = new_id();
        let bad_scene = serde_json::json!({
            "id": "00000000-0000-7000-8000-000000000001",
            "title": "Scene",
            "layoutPreset": "two_column",
            "atmosphere": "neutral",
            "motionPreset": "none",
            "blocks": [rich_text_block(&block_id)]
        });
        let raw = doc_with_scene(bad_scene);
        assert!(validate(&raw, None).is_err());
    }

    #[test]
    fn title_empty_rejected() {
        let block_id = new_id();
        let doc = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "   ",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": [scene(serde_json::json!([rich_text_block(&block_id)]))]
        });
        assert!(validate(&doc.to_string(), None).is_err());
    }

    #[test]
    fn block_count_zero_rejected() {
        let raw = doc_with_scene(scene(serde_json::json!([])));
        assert!(validate(&raw, None).is_err());
    }

    #[test]
    fn template_version_missing_rejected() {
        let block_id = new_id();
        let doc = serde_json::json!({
            "schemaVersion": 1,
            "documentId": "00000000-0000-7000-8000-000000000002",
            "title": "Test",
            "templateId": "knowledge_dossier",
            "scenes": [scene(serde_json::json!([rich_text_block(&block_id)]))]
        });
        assert!(validate(&doc.to_string(), None).is_err());
    }

    #[test]
    fn visual_world_is_optional_but_present_values_are_strict() {
        let raw = doc_with_scene(scene(serde_json::json!([rich_text_block(&new_id())])));
        assert!(validate(&raw, None).is_ok());
        for world in ["paper", "sakura", "aurora", "nocturne"] {
            let mut value: Value = serde_json::from_str(&raw).unwrap();
            value["visualWorldId"] = Value::String(world.into());
            assert!(validate(&value.to_string(), None).is_ok());
        }
        let mut invalid: Value = serde_json::from_str(&raw).unwrap();
        invalid["visualWorldId"] = Value::String("unknown".into());
        assert!(validate(&invalid.to_string(), None).is_err());
    }
}
