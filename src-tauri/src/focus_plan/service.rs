use tauri::State;

use super::{
    dto::{
        CreateFocusPlanInput, CreateFocusPlanReviewInput, FocusPlanDetailView, FocusPlanIdInput,
        FocusPlanLinkedWorkInput, FocusPlanLinkedWorkView, FocusPlanListInput,
        FocusPlanMutationResult, FocusPlanReviewHistoryView, FocusPlanReviewListInput,
        FocusPlanReviewView, FocusPlanSummaryView, MutateFocusPlanInput, SaveFocusPlanDraftInput,
    },
    repository::{self, FocusPlanError},
};
use crate::{
    infrastructure::sqlite::{DbError, runtime::DatabaseRuntime},
    ipc::error::IpcError,
};

fn map_db(error: DbError) -> IpcError {
    match error {
        DbError::Maintenance => IpcError::Validation {
            message: "Database is busy; try again.".into(),
        },
        DbError::SchemaTooNew { .. }
        | DbError::PragmaAssertion { .. }
        | DbError::InvalidMigrationList => IpcError::Corruption,
        _ => IpcError::Storage,
    }
}

fn map(error: FocusPlanError) -> IpcError {
    match error {
        FocusPlanError::Validation(message) => IpcError::Validation { message },
        FocusPlanError::NotFound => IpcError::NotFound,
        FocusPlanError::StaleRevision => IpcError::StaleRevision,
        FocusPlanError::Db(error) => map_db(error),
    }
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn list_focus_plans(
    state: State<'_, DatabaseRuntime>,
    input: FocusPlanListInput,
) -> Result<Vec<FocusPlanSummaryView>, IpcError> {
    state
        .execute(move |conn| Ok(repository::list(conn, &input)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_focus_plan(
    state: State<'_, DatabaseRuntime>,
    input: FocusPlanIdInput,
) -> Result<FocusPlanDetailView, IpcError> {
    state
        .execute(move |conn| Ok(repository::get(conn, &input.plan_id)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_focus_plan(
    state: State<'_, DatabaseRuntime>,
    input: CreateFocusPlanInput,
) -> Result<FocusPlanDetailView, IpcError> {
    state
        .execute(move |conn| Ok(repository::create(conn, input)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn mutate_focus_plan(
    state: State<'_, DatabaseRuntime>,
    input: MutateFocusPlanInput,
) -> Result<FocusPlanMutationResult, IpcError> {
    state
        .execute(move |conn| Ok(repository::mutate(conn, input)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_focus_plan_draft(
    state: State<'_, DatabaseRuntime>,
    input: SaveFocusPlanDraftInput,
) -> Result<(), IpcError> {
    state
        .execute(move |conn| Ok(repository::save_draft(conn, input)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn discard_focus_plan_draft(
    state: State<'_, DatabaseRuntime>,
    input: FocusPlanIdInput,
) -> Result<(), IpcError> {
    state
        .execute(move |conn| Ok(repository::discard_draft(conn, &input.plan_id)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_focus_plan_linked_work(
    state: State<'_, DatabaseRuntime>,
    input: FocusPlanLinkedWorkInput,
) -> Result<FocusPlanLinkedWorkView, IpcError> {
    state
        .execute(move |conn| Ok(repository::linked_work(conn, &input)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn list_focus_plan_reviews(
    state: State<'_, DatabaseRuntime>,
    input: FocusPlanReviewListInput,
) -> Result<FocusPlanReviewHistoryView, IpcError> {
    state
        .execute(move |conn| Ok(repository::list_reviews(conn, &input)))
        .map_err(map_db)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_focus_plan_review(
    state: State<'_, DatabaseRuntime>,
    input: CreateFocusPlanReviewInput,
) -> Result<FocusPlanReviewView, IpcError> {
    state
        .execute(move |conn| Ok(repository::create_review(conn, input)))
        .map_err(map_db)?
        .map_err(map)
}
