use serde::{Deserialize, Serialize};
use tauri::State;

use crate::domain::foundation_record::{DomainError, validate_label};
use crate::infrastructure::sqlite::foundation_record_repo::{
    self as repo, FoundationRecordRow, RepoError,
};
use crate::infrastructure::sqlite::{DbError, worker::DbWorkerHandle};
use crate::ipc::error::IpcError;

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FoundationRecordView {
    pub id: String,
    pub label: String,
    pub created_at: String,
    pub updated_at: String,
    pub revision: u32,
    pub archived_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateFoundationRecordInput {
    pub operation_id: String,
    pub label: String,
}

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UpdateFoundationRecordInput {
    pub operation_id: String,
    pub id: String,
    pub label: String,
    pub expected_revision: u32,
}

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MutateFoundationRecordInput {
    pub operation_id: String,
    pub id: String,
    pub expected_revision: u32,
}

fn row_to_view(row: FoundationRecordRow) -> FoundationRecordView {
    FoundationRecordView {
        id: row.id,
        label: row.label,
        created_at: row.created_at,
        updated_at: row.updated_at,
        revision: row.revision,
        archived_at: row.archived_at,
    }
}

fn domain_to_ipc(e: DomainError) -> IpcError {
    match e {
        DomainError::EmptyLabel => IpcError::Validation {
            message: "Label is required.".into(),
        },
        DomainError::LabelTooLong { max, .. } => IpcError::Validation {
            message: format!("Label must be {max} characters or fewer."),
        },
        DomainError::InvalidLabel { reason } => IpcError::Validation {
            message: reason.into(),
        },
    }
}

fn db_to_ipc(e: DbError) -> IpcError {
    match e {
        DbError::Rusqlite(_) | DbError::WorkerGone => IpcError::Storage,
        DbError::PragmaAssertion { .. }
        | DbError::SchemaTooNew { .. }
        | DbError::InvalidMigrationList => IpcError::Corruption,
    }
}

fn repo_to_ipc(e: RepoError) -> IpcError {
    match e {
        RepoError::Db(db) => db_to_ipc(db),
        RepoError::NotFound => IpcError::NotFound,
        RepoError::StaleRevision => IpcError::StaleRevision,
    }
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input), fields(op = %input.operation_id))]
pub fn create_foundation_record(
    state: State<'_, DbWorkerHandle>,
    input: CreateFoundationRecordInput,
) -> Result<FoundationRecordView, IpcError> {
    let label = validate_label(&input.label).map_err(domain_to_ipc)?;
    state
        .execute(move |conn| repo::create(conn, &label))
        .map_err(db_to_ipc)
        .map(row_to_view)
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state))]
pub fn list_foundation_records(
    state: State<'_, DbWorkerHandle>,
) -> Result<Vec<FoundationRecordView>, IpcError> {
    state
        .execute(|conn| repo::list_active(conn))
        .map_err(db_to_ipc)
        .map(|rows| rows.into_iter().map(row_to_view).collect())
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input), fields(op = %input.operation_id))]
pub fn update_foundation_record(
    state: State<'_, DbWorkerHandle>,
    input: UpdateFoundationRecordInput,
) -> Result<FoundationRecordView, IpcError> {
    let label = validate_label(&input.label).map_err(domain_to_ipc)?;
    let id = input.id.clone();
    let expected = input.expected_revision;
    // R = Result<FoundationRecordView, RepoError>; outer execute error = DbError::WorkerGone only
    state
        .execute(move |conn| Ok(repo::update(conn, &id, &label, expected)))
        .map_err(db_to_ipc)
        .and_then(|r| r.map_err(repo_to_ipc).map(row_to_view))
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input), fields(op = %input.operation_id))]
pub fn archive_foundation_record(
    state: State<'_, DbWorkerHandle>,
    input: MutateFoundationRecordInput,
) -> Result<(), IpcError> {
    let id = input.id.clone();
    let expected = input.expected_revision;
    state
        .execute(move |conn| Ok(repo::archive(conn, &id, expected)))
        .map_err(db_to_ipc)
        .and_then(|r| r.map_err(repo_to_ipc))
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input), fields(op = %input.operation_id))]
pub fn restore_foundation_record(
    state: State<'_, DbWorkerHandle>,
    input: MutateFoundationRecordInput,
) -> Result<(), IpcError> {
    let id = input.id.clone();
    let expected = input.expected_revision;
    state
        .execute(move |conn| Ok(repo::restore(conn, &id, expected)))
        .map_err(db_to_ipc)
        .and_then(|r| r.map_err(repo_to_ipc))
}
