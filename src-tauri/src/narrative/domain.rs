use crate::infrastructure::sqlite::DbError;

pub const SCHEMA_VERSION: i32 = 1;
pub const MAX_JSON_BYTES: usize = 2_097_152;
pub const MAX_PLAIN_TEXT_BYTES: usize = 524_288;
pub const REVISION_RETENTION: i64 = 50;

#[derive(Debug)]
pub enum NarrativeError {
    Validation(&'static str),
    NotFound,
    Stale,
    Conflict,
    Db(DbError),
}
impl From<rusqlite::Error> for NarrativeError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value.into())
    }
}
impl From<DbError> for NarrativeError {
    fn from(value: DbError) -> Self {
        Self::Db(value)
    }
}

pub fn valid_operation(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}
pub fn valid_id(value: &str) -> bool {
    value.len() == 36 && uuid::Uuid::parse_str(value).is_ok()
}
pub fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}
pub fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

pub fn seed_document(
    document_id: &str,
    node_title: &str,
    scene_id: &str,
    block_id: &str,
) -> String {
    serde_json::json!({
        "schemaVersion": 1,
        "documentId": document_id,
        "title": node_title,
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
                "content": {"type": "doc", "content": [{"type": "paragraph"}]}
            }]
        }]
    })
    .to_string()
}
