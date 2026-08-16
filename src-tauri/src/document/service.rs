use super::{assets, domain::DocumentError, dto::*, repository};
use crate::infrastructure::durability;
use crate::{
    infrastructure::sqlite::{DbError, runtime::DatabaseRuntime},
    ipc::error::IpcError,
};
use tauri::State;
fn map_db(e: DbError) -> IpcError {
    match e {
        DbError::Maintenance => IpcError::Validation {
            message: "Database is busy; try again.".into(),
        },
        DbError::SchemaTooNew { .. }
        | DbError::PragmaAssertion { .. }
        | DbError::InvalidMigrationList => IpcError::Corruption,
        _ => IpcError::Storage,
    }
}
fn map(e: DocumentError) -> IpcError {
    match e {
        DocumentError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        DocumentError::NotFound => IpcError::NotFound,
        DocumentError::Stale => IpcError::StaleRevision,
        DocumentError::Conflict => IpcError::Validation {
            message: "The recoverable draft is based on an older document revision.".into(),
        },
        DocumentError::Db(_) | DocumentError::Io(_) => IpcError::Storage,
    }
}
macro_rules! run {
    ($state:expr,$body:expr) => {{
        $state
            .execute(move |c| Ok($body(c)))
            .map_err(map_db)?
            .map_err(map)
    }};
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_reader_document(
    state: State<'_, DatabaseRuntime>,
    input: ReaderNodeInput,
) -> Result<ReaderDocumentProjection, IpcError> {
    run!(state, |c| repository::get(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_reader_document(
    state: State<'_, DatabaseRuntime>,
    input: CreateReaderDocumentInput,
) -> Result<ReaderDocumentView, IpcError> {
    run!(state, |c| repository::create(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_reader_document(
    state: State<'_, DatabaseRuntime>,
    input: SaveReaderDocumentInput,
) -> Result<ReaderDocumentView, IpcError> {
    run!(state, |c| repository::save(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_reader_draft(
    state: State<'_, DatabaseRuntime>,
    input: SaveReaderDraftInput,
) -> Result<ReaderDocumentProjection, IpcError> {
    run!(state, |c| repository::save_draft(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn discard_reader_draft(
    state: State<'_, DatabaseRuntime>,
    input: ReaderDocumentIdInput,
) -> Result<ReaderDocumentProjection, IpcError> {
    run!(state, |c| repository::discard_draft(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn recover_reader_draft(
    state: State<'_, DatabaseRuntime>,
    input: ReaderDocumentIdInput,
) -> Result<ReaderDocumentView, IpcError> {
    run!(state, |c| repository::recover_draft(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn import_reader_markdown(
    state: State<'_, DatabaseRuntime>,
    input: ImportReaderMarkdownInput,
) -> Result<MarkdownImportView, IpcError> {
    run!(state, |c| repository::import_markdown(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn export_reader_markdown(
    state: State<'_, DatabaseRuntime>,
    input: ReaderDocumentIdInput,
) -> Result<MarkdownExportView, IpcError> {
    let root = state
        .db_path()
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .to_path_buf();
    let document_id = input.document_id.clone();
    let view = run!(state, |c| repository::export_markdown(c, input))?;
    let export_assets = state
        .execute(move |conn| Ok(repository::export_assets(conn, &document_id)))
        .map_err(map_db)?
        .map_err(map)?;
    let dir = root.join("exports");
    std::fs::create_dir_all(&dir).map_err(|_| IpcError::Storage)?;
    let staging = dir.join(format!(".{}.staging", view.export_id));
    let published = dir.join(&view.export_id);
    let result = (|| -> Result<(), IpcError> {
        std::fs::create_dir(&staging).map_err(|_| IpcError::Storage)?;
        std::fs::create_dir(staging.join("assets")).map_err(|_| IpcError::Storage)?;
        durability::durable_write(&staging.join(&view.file_name), view.markdown.as_bytes())
            .map_err(|_| IpcError::Storage)?;
        for (asset_id, mime, relative) in export_assets {
            let bytes = std::fs::read(root.join(relative)).map_err(|_| IpcError::Storage)?;
            let safe = assets::sanitized_export(&bytes, &mime).map_err(map)?;
            durability::durable_write(&staging.join("assets").join(asset_id), &safe)
                .map_err(|_| IpcError::Storage)?;
        }
        durability::sync_tree(&staging).map_err(|_| IpcError::Storage)?;
        durability::durable_rename(&staging, &published).map_err(|_| IpcError::Storage)?;
        let published_markdown =
            std::fs::read(published.join(&view.file_name)).map_err(|_| IpcError::Storage)?;
        if published_markdown != view.markdown.as_bytes() {
            return Err(IpcError::Storage);
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_dir_all(&staging);
    }
    result?;
    Ok(view)
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn import_document_asset(
    state: State<'_, DatabaseRuntime>,
    input: ImportDocumentAssetInput,
) -> Result<DocumentAssetView, IpcError> {
    let root = state
        .db_path()
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .to_path_buf();
    run!(state, |c| assets::import(c, &root, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_document_asset(
    state: State<'_, DatabaseRuntime>,
    input: DocumentAssetIdInput,
) -> Result<DocumentAssetBytes, IpcError> {
    let root = state
        .db_path()
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .to_path_buf();
    run!(state, |c| assets::get(c, &root, &input.asset_id))
}
