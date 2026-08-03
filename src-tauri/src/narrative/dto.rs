use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct NarrativeDocumentView {
    pub id: String,
    pub life_node_id: String,
    pub schema_version: i32,
    pub revision: i32,
    pub canonical_json: String,
    pub plain_text: String,
    pub updated_at: String,
    pub template_id: String,
    pub template_version: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct NarrativeDocumentProjection {
    pub life_node_id: String,
    pub document: Option<NarrativeDocumentView>,
    pub draft_state: String,
    pub draft_json: Option<String>,
    pub draft_base_revision: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct NarrativeNodeInput {
    pub life_node_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateNarrativeDocumentInput {
    pub life_node_id: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveNarrativeDocumentInput {
    pub document_id: String,
    pub expected_revision: i32,
    pub schema_version: i32,
    pub canonical_json: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveNarrativeDraftInput {
    pub document_id: String,
    pub base_revision: i32,
    pub canonical_json: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct NarrativeDocumentIdInput {
    pub document_id: String,
}
