use super::{
    dto::*,
    repository::{self, LifeError},
};
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
fn map(e: LifeError) -> IpcError {
    match e {
        LifeError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        LifeError::NotFound => IpcError::NotFound,
        LifeError::Stale => IpcError::Validation {
            message: "This Life node changed; refresh and try again.".into(),
        },
        LifeError::Db(_) => IpcError::Storage,
    }
}
macro_rules! run {
    ($state:expr,$body:expr) => {
        $state
            .execute(move |conn| Ok($body(conn)))
            .map_err(map_db)?
            .map_err(map)
    };
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_life_browse_projection(
    state: State<'_, DatabaseRuntime>,
    input: GetLifeBrowseInput,
) -> Result<LifeBrowseProjection, IpcError> {
    run!(state, |c| repository::browse(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn get_pinned_life_nodes(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<PinnedLifeNodeView>, IpcError> {
    run!(state, repository::pinned)
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_life_node(
    state: State<'_, DatabaseRuntime>,
    input: CreateLifeNodeInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::create(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn rename_life_node(
    state: State<'_, DatabaseRuntime>,
    input: RenameLifeNodeInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::rename(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn update_life_node_summary(
    state: State<'_, DatabaseRuntime>,
    input: UpdateLifeNodeSummaryInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::update_summary(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn archive_life_node(
    state: State<'_, DatabaseRuntime>,
    input: MutateLifeNodeInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::archive(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn restore_life_node(
    state: State<'_, DatabaseRuntime>,
    input: MutateLifeNodeInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::restore(c, input))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn pin_life_node(
    state: State<'_, DatabaseRuntime>,
    input: LifeNodeIdInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::set_pin(c, &input.node_id, true))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn unpin_life_node(
    state: State<'_, DatabaseRuntime>,
    input: LifeNodeIdInput,
) -> Result<LifeMutationResult, IpcError> {
    run!(state, |c| repository::set_pin(c, &input.node_id, false))
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_life_navigation_preference(
    state: State<'_, DatabaseRuntime>,
    input: SaveLifeNavigationPreferenceInput,
) -> Result<LifeNavigationPreferenceView, IpcError> {
    run!(state, |c| repository::save_preference(c, input))
}
