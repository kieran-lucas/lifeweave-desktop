use super::{domain::NarrativeError, dto::*, repository};
use crate::infrastructure::sqlite::{DbError, runtime::DatabaseRuntime};
use crate::ipc::error::IpcError;
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

fn map(e: NarrativeError) -> IpcError {
    match e {
        NarrativeError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        NarrativeError::NotFound => IpcError::NotFound,
        NarrativeError::Stale => IpcError::StaleRevision,
        NarrativeError::Conflict => IpcError::Validation {
            message: "The recoverable draft is based on an older document revision.".into(),
        },
        NarrativeError::Db(_) => IpcError::Storage,
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
pub fn get_narrative_document(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeNodeInput,
) -> Result<NarrativeDocumentProjection, IpcError> {
    run!(state, |c| repository::get(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_narrative_document(
    state: State<'_, DatabaseRuntime>,
    input: CreateNarrativeDocumentInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::create(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_narrative_document(
    state: State<'_, DatabaseRuntime>,
    input: SaveNarrativeDocumentInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::save(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_narrative_draft(
    state: State<'_, DatabaseRuntime>,
    input: SaveNarrativeDraftInput,
) -> Result<NarrativeDocumentProjection, IpcError> {
    run!(state, |c| repository::save_draft(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn discard_narrative_draft(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeDocumentProjection, IpcError> {
    run!(state, |c| repository::discard_draft(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn recover_narrative_draft(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::recover_draft(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn preview_narrative_markdown(
    state: State<'_, DatabaseRuntime>,
    input: PreviewNarrativeMarkdownInput,
) -> Result<NarrativeMarkdownPreview, IpcError> {
    run!(state, |c| repository::preview_markdown(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn import_narrative_markdown(
    state: State<'_, DatabaseRuntime>,
    input: ImportNarrativeMarkdownInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::import_from_markdown(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn export_narrative_markdown(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeMarkdownExport, IpcError> {
    run!(state, |c| repository::export_to_markdown(c, input))
}
