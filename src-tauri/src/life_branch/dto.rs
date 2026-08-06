use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PrepareLifeBranchExportInput {
    pub node_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeBranchCountsView {
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
pub struct LifeBranchExportTicket {
    pub export_id: String,
    pub file_name: String,
    pub byte_size: u64,
    pub sha256: String,
    pub root_title: String,
    pub counts: LifeBranchCountsView,
    pub total_asset_bytes: u64,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeBranchImportPreview {
    pub import_id: String,
    pub package_sha256: String,
    pub root_title: String,
    pub counts: LifeBranchCountsView,
    pub total_asset_bytes: u64,
    pub package_bytes: u64,
    pub supported: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ConfirmLifeBranchImportInput {
    pub import_id: String,
    pub package_sha256: String,
    pub parent_node_id: String,
    pub expected_tree_revision: i32,
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeBranchImportResult {
    pub life_node_id: String,
    pub parent_node_id: String,
    pub tree_revision: i32,
    pub node_count: u32,
    pub document_count: u32,
    pub asset_count: u32,
    pub created_tag_count: u32,
    pub reused_tag_count: u32,
    pub internal_link_count: u32,
    /// Always `None`: a branch import is deliberately not undoable.
    pub undo_token: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DiscardLifeBranchImportInput {
    pub import_id: String,
}
