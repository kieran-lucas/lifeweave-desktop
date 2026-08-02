use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::{NoContext, Timestamp, Uuid};

use crate::domain::foundation_record::{DomainError, validate_label};
use crate::infrastructure::sqlite::foundation_record_repo::{
    self as repo, FoundationRecordRow, RepoError,
};
use crate::infrastructure::sqlite::{DbError, runtime::DatabaseRuntime};
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

/// Generates a UUIDv7 string. UUIDv7 is time-ordered (ms precision), which makes
/// record IDs sortable by creation time and simplifies debugging.
/// Called on the application side so IDs are observable before they reach the DB.
fn new_uuid_v7() -> String {
    Uuid::new_v7(Timestamp::now(NoContext)).to_string()
}

/// Validates that operation_id is suitable for tracing/correlation use.
///
/// `operation_id` is a caller-supplied correlation token logged in tracing spans.
/// It is NOT persisted or checked for duplicates — this is correlation only,
/// not idempotency. Callers must not assume repeated requests with the same
/// operation_id will be deduplicated.
fn validate_operation_id(op_id: &str) -> Result<(), IpcError> {
    if op_id.is_empty() || op_id.len() > 128 {
        return Err(IpcError::Validation {
            message: "operation_id must be 1–128 characters.".into(),
        });
    }
    if op_id.chars().any(|c| c.is_control()) {
        return Err(IpcError::Validation {
            message: "operation_id must not contain control characters.".into(),
        });
    }
    Ok(())
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
        DbError::Rusqlite(_)
        | DbError::WorkerGone
        | DbError::Maintenance
        | DbError::FileNotFound { .. } => IpcError::Storage,
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
#[tracing::instrument(level = "info", skip(state, input))]
pub fn create_foundation_record(
    state: State<'_, DatabaseRuntime>,
    input: CreateFoundationRecordInput,
) -> Result<FoundationRecordView, IpcError> {
    validate_operation_id(&input.operation_id)?;
    let label = validate_label(&input.label).map_err(domain_to_ipc)?;
    let id = new_uuid_v7();
    state
        .execute(move |conn| repo::create(conn, &id, &label))
        .map_err(db_to_ipc)
        .map(row_to_view)
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state))]
pub fn list_foundation_records(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<FoundationRecordView>, IpcError> {
    state
        .execute(|conn| repo::list_active(conn))
        .map_err(db_to_ipc)
        .map(|rows| rows.into_iter().map(row_to_view).collect())
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state))]
pub fn list_archived_foundation_records(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<FoundationRecordView>, IpcError> {
    state
        .execute(|conn| repo::list_archived(conn))
        .map_err(db_to_ipc)
        .map(|rows| rows.into_iter().map(row_to_view).collect())
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input))]
pub fn update_foundation_record(
    state: State<'_, DatabaseRuntime>,
    input: UpdateFoundationRecordInput,
) -> Result<FoundationRecordView, IpcError> {
    validate_operation_id(&input.operation_id)?;
    let label = validate_label(&input.label).map_err(domain_to_ipc)?;
    let id = input.id.clone();
    let expected = input.expected_revision;
    state
        .execute(move |conn| Ok(repo::update(conn, &id, &label, expected)))
        .map_err(db_to_ipc)
        .and_then(|r| r.map_err(repo_to_ipc).map(row_to_view))
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input))]
pub fn archive_foundation_record(
    state: State<'_, DatabaseRuntime>,
    input: MutateFoundationRecordInput,
) -> Result<(), IpcError> {
    validate_operation_id(&input.operation_id)?;
    let id = input.id.clone();
    let expected = input.expected_revision;
    state
        .execute(move |conn| Ok(repo::archive(conn, &id, expected)))
        .map_err(db_to_ipc)
        .and_then(|r| r.map_err(repo_to_ipc))
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input))]
pub fn restore_foundation_record(
    state: State<'_, DatabaseRuntime>,
    input: MutateFoundationRecordInput,
) -> Result<(), IpcError> {
    validate_operation_id(&input.operation_id)?;
    let id = input.id.clone();
    let expected = input.expected_revision;
    state
        .execute(move |conn| Ok(repo::restore(conn, &id, expected)))
        .map_err(db_to_ipc)
        .and_then(|r| r.map_err(repo_to_ipc))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uuid_v7_has_correct_version() {
        let id = new_uuid_v7();
        let parsed = Uuid::parse_str(&id).expect("must be valid UUID");
        assert_eq!(
            parsed.get_version_num(),
            7,
            "generated ID must be UUID version 7"
        );
    }

    #[test]
    fn uuid_v7_ids_are_unique_across_calls() {
        let id1 = new_uuid_v7();
        let id2 = new_uuid_v7();
        assert_ne!(id1, id2, "consecutive UUIDs must be unique");
    }

    #[test]
    fn uuid_v7_is_canonical_36_char_string() {
        let id = new_uuid_v7();
        assert_eq!(id.len(), 36, "UUID string must be 36 chars with hyphens");
        // xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
        let parts: Vec<&str> = id.split('-').collect();
        assert_eq!(parts.len(), 5, "UUID must have 5 hyphen-separated groups");
        assert_eq!(
            parts[2].chars().next(),
            Some('7'),
            "version nibble must be 7"
        );
    }

    #[test]
    fn operation_id_rejects_empty() {
        assert!(matches!(
            validate_operation_id(""),
            Err(IpcError::Validation { .. })
        ));
    }

    #[test]
    fn operation_id_rejects_over_128_chars() {
        let long = "a".repeat(129);
        assert!(matches!(
            validate_operation_id(&long),
            Err(IpcError::Validation { .. })
        ));
    }

    #[test]
    fn operation_id_rejects_control_characters() {
        assert!(matches!(
            validate_operation_id("op\x00id"),
            Err(IpcError::Validation { .. })
        ));
    }

    #[test]
    fn operation_id_accepts_valid_timestamp_random_format() {
        // The frontend generates: `${Date.now()}-${Math.random().toString(36).slice(2)}`
        assert!(validate_operation_id("1753987200000-k3z9q").is_ok());
    }
}
