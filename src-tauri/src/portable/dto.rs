use super::domain::PortableDocumentKind;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PreparePortablePackageExportInput {
    pub document_kind: PortableDocumentKind,
    pub document_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PortablePackageExportTicket {
    pub export_id: String,
    pub file_name: String,
    pub byte_size: u64,
    pub sha256: String,
    pub document_kind: PortableDocumentKind,
    pub title: String,
    pub asset_count: u32,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PortablePackageImportPreview {
    pub import_id: String,
    pub document_kind: PortableDocumentKind,
    pub title: String,
    pub document_schema_version: i32,
    pub template_id: Option<String>,
    pub template_version: Option<i32>,
    pub visual_world_id: Option<String>,
    pub scene_count: Option<u32>,
    pub asset_count: u32,
    pub total_asset_bytes: u64,
    pub package_bytes: u64,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ConfirmPortablePackageImportInput {
    pub import_id: String,
    pub life_node_id: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PortablePackageImportResult {
    pub document_kind: PortableDocumentKind,
    pub life_node_id: String,
    pub document_id: String,
}
