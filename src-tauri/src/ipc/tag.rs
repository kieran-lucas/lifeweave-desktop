use crate::{
    infrastructure::sqlite::{DbError, runtime::DatabaseRuntime},
    ipc::error::IpcError,
    tag::{
        dto::{
            CreateTagInput, MergeTagsInput, MergeTagsResult, MutateTagInput, RenameTagInput,
            SetLifeNodeTagsInput, SetLifeNodeTagsResult, TagView,
        },
        repository::{self, TagError},
    },
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

fn map_tag(e: TagError) -> IpcError {
    match e {
        TagError::Validation(msg) => IpcError::Validation {
            message: msg,
        },
        TagError::NotFound => IpcError::NotFound,
        TagError::Stale => IpcError::StaleRevision,
        TagError::Db(_) => IpcError::Storage,
    }
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn list_tags(
    state: State<'_, DatabaseRuntime>,
    include_archived: bool,
) -> Result<Vec<TagView>, IpcError> {
    state
        .execute(move |conn| Ok(repository::list(conn, include_archived)))
        .map_err(map_db)?
        .map_err(map_tag)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_tag(
    state: State<'_, DatabaseRuntime>,
    input: CreateTagInput,
) -> Result<TagView, IpcError> {
    state
        .execute(move |conn| Ok(repository::create(conn, input)))
        .map_err(map_db)?
        .map_err(map_tag)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn rename_tag(
    state: State<'_, DatabaseRuntime>,
    input: RenameTagInput,
) -> Result<TagView, IpcError> {
    state
        .execute(move |conn| Ok(repository::rename(conn, input)))
        .map_err(map_db)?
        .map_err(map_tag)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn archive_tag(
    state: State<'_, DatabaseRuntime>,
    input: MutateTagInput,
) -> Result<TagView, IpcError> {
    state
        .execute(move |conn| Ok(repository::archive(conn, input)))
        .map_err(map_db)?
        .map_err(map_tag)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn restore_tag(
    state: State<'_, DatabaseRuntime>,
    input: MutateTagInput,
) -> Result<TagView, IpcError> {
    state
        .execute(move |conn| Ok(repository::restore(conn, input)))
        .map_err(map_db)?
        .map_err(map_tag)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn merge_tags(
    state: State<'_, DatabaseRuntime>,
    input: MergeTagsInput,
) -> Result<MergeTagsResult, IpcError> {
    state
        .execute(move |conn| Ok(repository::merge(conn, input)))
        .map_err(map_db)?
        .map_err(map_tag)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn set_life_node_tags(
    state: State<'_, DatabaseRuntime>,
    input: SetLifeNodeTagsInput,
) -> Result<SetLifeNodeTagsResult, IpcError> {
    state
        .execute(move |conn| Ok(repository::set_life_node_tags(conn, input)))
        .map_err(map_db)?
        .map_err(map_tag)
}
