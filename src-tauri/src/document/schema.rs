use super::domain::{DocumentError, MAX_JSON_BYTES};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug)]
pub struct ValidatedDocument {
    pub canonical_json: String,
    pub plain_text: String,
    pub assets: BTreeMap<String, i32>,
}

pub fn validate(raw: &str) -> Result<ValidatedDocument, DocumentError> {
    if raw.len() > MAX_JSON_BYTES {
        return Err(DocumentError::Validation("Document is too large."));
    }
    let value: Value = serde_json::from_str(raw)
        .map_err(|_| DocumentError::Validation("Document JSON is invalid."))?;
    let mut count = 0usize;
    let mut text = String::new();
    let mut assets = BTreeMap::new();
    visit(&value, 0, &mut count, &mut text, &mut assets)?;
    if value.get("type").and_then(Value::as_str) != Some("doc") {
        return Err(DocumentError::Validation("Document root must be a doc."));
    }
    let plain_text = text
        .lines()
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    Ok(ValidatedDocument {
        canonical_json: serde_json::to_string(&value)
            .map_err(|_| DocumentError::Validation("Document JSON is invalid."))?,
        plain_text,
        assets,
    })
}

fn visit(
    v: &Value,
    depth: usize,
    count: &mut usize,
    text: &mut String,
    assets: &mut BTreeMap<String, i32>,
) -> Result<(), DocumentError> {
    if depth > 64 {
        return Err(DocumentError::Validation("Document nesting is too deep."));
    }
    *count += 1;
    if *count > 10_000 {
        return Err(DocumentError::Validation("Document has too many nodes."));
    }
    let o = v.as_object().ok_or(DocumentError::Validation(
        "Every document node must be an object.",
    ))?;
    let kind = o
        .get("type")
        .and_then(Value::as_str)
        .ok_or(DocumentError::Validation("A document node has no type."))?;
    let allowed: BTreeSet<&str> = [
        "doc",
        "paragraph",
        "text",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "taskList",
        "taskItem",
        "horizontalRule",
        "blockquote",
        "callout",
        "codeBlock",
        "hardBreak",
        "image",
        "table",
        "tableRow",
        "tableHeader",
        "tableCell",
    ]
    .into_iter()
    .collect();
    if !allowed.contains(kind) {
        return Err(DocumentError::Validation(
            "Document contains unsupported content.",
        ));
    }
    match kind {
        "text" => {
            let s = o
                .get("text")
                .and_then(Value::as_str)
                .ok_or(DocumentError::Validation("Text content is invalid."))?;
            if s.len() > 262_144 {
                return Err(DocumentError::Validation("A text block is too large."));
            }
            text.push_str(s);
            validate_marks(o.get("marks"))?;
        }
        "heading" => {
            let level = o
                .get("attrs")
                .and_then(|a| a.get("level"))
                .and_then(Value::as_i64)
                .unwrap_or(1);
            if !(1..=3).contains(&level) {
                return Err(DocumentError::Validation("Heading level is unsupported."));
            }
        }
        "callout" => {
            let variant = o
                .get("attrs")
                .and_then(|a| a.get("variant"))
                .and_then(Value::as_str)
                .unwrap_or("note");
            if !matches!(variant, "note" | "info" | "warning") {
                return Err(DocumentError::Validation("Callout variant is unsupported."));
            }
        }
        "orderedList" => {
            let raw_start = o.get("attrs").and_then(|attrs| attrs.get("start"));
            let start = match raw_start {
                Some(value) => value.as_u64().ok_or(DocumentError::Validation(
                    "Ordered-list start is unsupported.",
                ))?,
                None => 1,
            };
            if start > 999_999_999 {
                return Err(DocumentError::Validation(
                    "Ordered-list start is unsupported.",
                ));
            }
        }
        "taskItem" => {
            // Absent means unchecked; anything that is not a bool is a corrupt document
            // rather than a default, because the tick state is user data.
            if let Some(checked) = o.get("attrs").and_then(|attrs| attrs.get("checked")) {
                if !checked.is_boolean() {
                    return Err(DocumentError::Validation("Task state is unsupported."));
                }
            }
        }
        "codeBlock" => {
            // The language reaches the Reader as a `language-…` class name, so it is held
            // to an identifier shape rather than accepted as free text.
            if let Some(language) = o.get("attrs").and_then(|attrs| attrs.get("language")) {
                let value = language
                    .as_str()
                    .ok_or(DocumentError::Validation("Code language is unsupported."))?;
                let shaped = (1..=32).contains(&value.chars().count())
                    && value.chars().all(|c| {
                        c.is_ascii_alphanumeric() || matches!(c, '+' | '#' | '.' | '_' | '-')
                    });
                if !shaped {
                    return Err(DocumentError::Validation("Code language is unsupported."));
                }
            }
        }
        "tableCell" | "tableHeader" => {
            if let Some(align) = o.get("attrs").and_then(|attrs| attrs.get("align")) {
                let value = align
                    .as_str()
                    .ok_or(DocumentError::Validation("Cell alignment is unsupported."))?;
                if !matches!(value, "left" | "center" | "right") {
                    return Err(DocumentError::Validation("Cell alignment is unsupported."));
                }
            }
        }
        "image" => {
            let id = o
                .get("attrs")
                .and_then(|a| a.get("assetId"))
                .and_then(Value::as_str)
                .ok_or(DocumentError::Validation("Image asset is missing."))?;
            if !super::domain::valid_id(id) {
                return Err(DocumentError::Validation(
                    "Image asset identity is invalid.",
                ));
            }
            *assets.entry(id.into()).or_insert(0) += 1;
        }
        "table" => {
            let rows = o
                .get("content")
                .and_then(Value::as_array)
                .map_or(0, Vec::len);
            if rows == 0 || rows > 100 {
                return Err(DocumentError::Validation(
                    "Table dimensions are unsupported.",
                ));
            }
            for row in o
                .get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let cols = row
                    .get("content")
                    .and_then(Value::as_array)
                    .map_or(0, Vec::len);
                if cols == 0 || cols > 20 {
                    return Err(DocumentError::Validation(
                        "Table dimensions are unsupported.",
                    ));
                }
            }
        }
        "hardBreak" | "horizontalRule" => text.push('\n'),
        _ => {}
    }
    if matches!(
        kind,
        "paragraph"
            | "heading"
            | "blockquote"
            | "callout"
            | "codeBlock"
            | "listItem"
            | "taskItem"
            | "tableCell"
            | "tableHeader"
    ) {
        text.push('\n');
    }
    if let Some(children) = o.get("content") {
        for child in children
            .as_array()
            .ok_or(DocumentError::Validation("Document content is invalid."))?
        {
            visit(child, depth + 1, count, text, assets)?;
        }
    }
    Ok(())
}
fn validate_marks(marks: Option<&Value>) -> Result<(), DocumentError> {
    if let Some(marks) = marks {
        for mark in marks
            .as_array()
            .ok_or(DocumentError::Validation("Text marks are invalid."))?
        {
            let o = mark
                .as_object()
                .ok_or(DocumentError::Validation("Text mark is invalid."))?;
            match o.get("type").and_then(Value::as_str) {
                Some("bold" | "italic" | "code" | "strike") => {}
                Some("link") => {
                    let href = o
                        .get("attrs")
                        .and_then(|a| a.get("href"))
                        .and_then(Value::as_str)
                        .ok_or(DocumentError::Validation("Link is invalid."))?;
                    let lower = href.to_ascii_lowercase();
                    if !lower.starts_with("https://")
                        && !lower.starts_with("http://")
                        && !lower.starts_with("mailto:")
                    {
                        return Err(DocumentError::Validation("Link scheme is not allowed."));
                    }
                }
                _ => return Err(DocumentError::Validation("Text mark is unsupported.")),
            }
        }
    }
    Ok(())
}

pub fn asset_ids(raw: &str) -> Result<Vec<String>, DocumentError> {
    Ok(validate(raw)?.assets.into_keys().collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_allowed_nodes_and_extracts_text() {
        let v=validate(r#"{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Hello","marks":[{"type":"bold"}]}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell"}]}]}]}]}]}"#).unwrap();
        assert_eq!(v.plain_text, "Hello\nCell");
    }
    #[test]
    fn rejects_unsafe_links_html_and_depth() {
        for raw in [
            r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}"#,
            r#"{"type":"doc","content":[{"type":"html"}]}"#,
        ] {
            assert!(validate(raw).is_err());
        }
    }

    #[test]
    fn accepts_additive_inline_code_strike_and_ordered_start() {
        let raw = r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"code","marks":[{"type":"code"}]},{"type":"text","text":"strike","marks":[{"type":"strike"}]}]},{"type":"orderedList","attrs":{"start":4},"content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"four"}]}]}]}]}"#;
        assert!(validate(raw).is_ok());
        assert!(
            validate(r#"{"type":"doc","content":[{"type":"orderedList","attrs":{"start":"4"}}]}"#)
                .is_err()
        );
    }

    #[test]
    fn accepts_rules_task_state_code_language_and_cell_alignment() {
        let raw = r#"{"type":"doc","content":[
            {"type":"horizontalRule"},
            {"type":"taskList","content":[
                {"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph","content":[{"type":"text","text":"done"}]}]},
                {"type":"taskItem","content":[{"type":"paragraph","content":[{"type":"text","text":"open"}]}]}]},
            {"type":"codeBlock","attrs":{"language":"rust"},"content":[{"type":"text","text":"fn main(){}"}]},
            {"type":"table","content":[{"type":"tableRow","content":[
                {"type":"tableHeader","attrs":{"align":"right"},"content":[{"type":"paragraph","content":[{"type":"text","text":"n"}]}]}]}]}]}"#;
        let valid = validate(raw).unwrap();
        assert!(valid.plain_text.contains("done"));
        assert!(valid.plain_text.contains("open"));
    }

    #[test]
    fn rejects_malformed_task_state_code_language_and_alignment() {
        for raw in [
            // Tick state is user data, so a non-bool is corruption rather than a default.
            r#"{"type":"doc","content":[{"type":"taskItem","attrs":{"checked":"yes"}}]}"#,
            // The language becomes a `language-…` class name in the Reader.
            r#"{"type":"doc","content":[{"type":"codeBlock","attrs":{"language":"a b"}}]}"#,
            r#"{"type":"doc","content":[{"type":"codeBlock","attrs":{"language":"<script>"}}]}"#,
            r#"{"type":"doc","content":[{"type":"codeBlock","attrs":{"language":""}}]}"#,
            r#"{"type":"doc","content":[{"type":"tableRow","content":[{"type":"tableCell","attrs":{"align":"middle"}}]}]}"#,
        ] {
            assert!(validate(raw).is_err(), "must be rejected: {raw}");
        }
    }

    #[test]
    fn documents_written_before_the_new_nodes_still_validate() {
        // Documents imported under the old fallbacks hold a `— — —` paragraph and `☐`
        // text. Widening the schema is additive and must not invalidate them.
        let raw = r#"{"type":"doc","content":[
            {"type":"paragraph","content":[{"type":"text","text":"— — —"}]},
            {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"☐ open"}]}]}]},
            {"type":"codeBlock","content":[{"type":"text","text":"x"}]},
            {"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"c"}]}]}]}]}]}"#;
        assert!(validate(raw).is_ok());
    }
}
