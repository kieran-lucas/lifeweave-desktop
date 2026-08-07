use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PrepareLifeTreeExportInput {
    pub node_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeTreeCountsView {
    pub top_level_nodes: u32,
    pub nodes: u32,
    pub branches: u32,
    pub basic_leaf_documents: u32,
    pub narrative_documents: u32,
    pub empty_leaves: u32,
    pub documents: u32,
    pub assets: u32,
    pub tags: u32,
    pub internal_links: u32,
    pub maximum_depth: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeTreeExportTicket {
    pub export_id: String,
    pub file_name: String,
    pub byte_size: u64,
    pub sha256: String,
    pub counts: LifeTreeCountsView,
    pub total_asset_bytes: u64,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeTreeImportPreview {
    pub import_id: String,
    pub package_sha256: String,
    pub counts: LifeTreeCountsView,
    pub total_asset_bytes: u64,
    pub package_bytes: u64,
    pub supported: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ConfirmLifeTreeImportInput {
    pub import_id: String,
    pub package_sha256: String,
    pub parent_node_id: String,
    pub expected_tree_revision: i32,
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeTreeImportResult {
    pub first_imported_node_id: String,
    pub parent_node_id: String,
    pub tree_revision: i32,
    pub node_count: u32,
    pub document_count: u32,
    pub asset_count: u32,
    pub created_tag_count: u32,
    pub reused_tag_count: u32,
    pub internal_link_count: u32,
    pub undo_token: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DiscardLifeTreeImportInput {
    pub import_id: String,
}
