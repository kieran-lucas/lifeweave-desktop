use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum LifeLinkDocumentKind {
    BasicLeaf,
    NarrativeCanvas,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum LifeLinkAvailability {
    Active,
    Archived,
    Unavailable,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeLinkSourceView {
    pub node_id: String,
    pub title: String,
    pub eligible: bool,
    pub ineligible_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeLinkRowView {
    pub link_id: String,
    pub endpoint_node_id: String,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub document_kind: Option<LifeLinkDocumentKind>,
    pub breadcrumb: String,
    pub availability: LifeLinkAvailability,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeLinkPanel {
    pub source: LifeLinkSourceView,
    pub outgoing: Vec<LifeLinkRowView>,
    pub backlinks: Vec<LifeLinkRowView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeLinkTargetView {
    pub node_id: String,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub document_kind: LifeLinkDocumentKind,
    pub breadcrumb: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GetLifeLinkPanelInput {
    pub source_node_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SearchLifeLinkTargetsInput {
    pub source_node_id: String,
    pub query: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateLifeLinkInput {
    pub source_node_id: String,
    pub target_node_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct RemoveLifeLinkInput {
    pub link_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeLinkMutationResult {
    pub link_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
}
