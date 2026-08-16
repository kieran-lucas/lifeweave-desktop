use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReaderDocumentView {
    pub id: String,
    pub life_node_id: String,
    pub schema_version: i32,
    pub revision: i32,
    pub canonical_json: String,
    pub plain_text: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReaderDocumentProjection {
    pub life_node_id: String,
    pub document: Option<ReaderDocumentView>,
    pub draft_state: String,
    pub draft_json: Option<String>,
    pub draft_base_revision: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReaderNodeInput {
    pub life_node_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateReaderDocumentInput {
    pub life_node_id: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveReaderDocumentInput {
    pub document_id: String,
    pub expected_revision: i32,
    pub schema_version: i32,
    pub canonical_json: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveReaderDraftInput {
    pub document_id: String,
    pub base_revision: i32,
    pub canonical_json: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReaderDocumentIdInput {
    pub document_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ImportReaderMarkdownInput {
    pub document_id: String,
    pub expected_revision: i32,
    pub markdown: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MarkdownImportDiagnostic {
    pub kind: String,
    pub severity: String,
    pub message: String,
    pub line: u32,
    pub column: u32,
    pub fallback: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MarkdownImportView {
    pub document: ReaderDocumentView,
    pub diagnostics: Vec<MarkdownImportDiagnostic>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MarkdownExportView {
    pub export_id: String,
    pub file_name: String,
    pub markdown: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ImportDocumentAssetInput {
    pub original_name: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DocumentAssetView {
    pub asset_id: String,
    pub original_name: String,
    pub mime: String,
    pub byte_size: u64,
    pub width: u32,
    pub height: u32,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DocumentAssetIdInput {
    pub asset_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DocumentAssetBytes {
    pub asset: DocumentAssetView,
    pub bytes: Vec<u8>,
}
