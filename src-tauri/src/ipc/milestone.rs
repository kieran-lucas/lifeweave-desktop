use crate::milestone::domain::MilestoneError;
use crate::{
    infrastructure::sqlite::{DbError, runtime::DatabaseRuntime},
    ipc::error::IpcError,
    milestone::{dto::*, repository},
};
use tauri::State;

fn map_domain(error: MilestoneError) -> IpcError {
    match error {
        MilestoneError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        MilestoneError::StaleRevision => IpcError::StaleRevision,
        MilestoneError::NotFound => IpcError::NotFound,
        MilestoneError::Storage => IpcError::Storage,
    }
}

fn map_db(error: DbError) -> IpcError {
    match error {
        DbError::Maintenance => IpcError::Validation {
            message: "Database is busy; try again.".into(),
        },
        _ => IpcError::Storage,
    }
}
#[tauri::command]
pub fn list_milestones(state: State<'_, DatabaseRuntime>) -> Result<Vec<MilestoneView>, IpcError> {
    state
        .execute(|conn| Ok(repository::list(conn)))
        .map_err(map_db)?
        .map_err(map_domain)
}
#[tauri::command]
pub fn save_milestone(
    state: State<'_, DatabaseRuntime>,
    input: SaveMilestoneInput,
) -> Result<MilestoneView, IpcError> {
    state
        .execute(move |conn| Ok(repository::save(conn, input)))
        .map_err(map_db)?
        .map_err(map_domain)
}
#[tauri::command]
pub fn mutate_milestone(
    state: State<'_, DatabaseRuntime>,
    input: MutateMilestoneInput,
) -> Result<MilestoneView, IpcError> {
    state
        .execute(move |conn| Ok(repository::mutate(conn, input)))
        .map_err(map_db)?
        .map_err(map_domain)
}
