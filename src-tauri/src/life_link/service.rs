use tauri::State;

use super::{domain::LifeLinkError, dto::*, repository};
use crate::infrastructure::sqlite::{DbError, runtime::DatabaseRuntime};
use crate::ipc::error::IpcError;

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

fn map(error: LifeLinkError) -> IpcError {
    let message = match error {
        LifeLinkError::InvalidSource => "Choose an existing non-root source Life leaf.",
        LifeLinkError::InvalidTarget => "Choose an existing non-root target Life leaf.",
        LifeLinkError::ArchivedSource => "The source Life leaf is archived.",
        LifeLinkError::ArchivedTarget => "The target Life leaf is archived.",
        LifeLinkError::SourceNotLeaf => "The source must be a Life leaf.",
        LifeLinkError::TargetNotLeaf => "The target must be a Life leaf.",
        LifeLinkError::SourceMissingDocument => {
            "The source requires one committed Basic Leaf or Narrative Canvas document."
        }
        LifeLinkError::TargetMissingDocument => {
            "The target requires one committed Basic Leaf or Narrative Canvas document."
        }
        LifeLinkError::SelfLink => "A Life leaf cannot link to itself.",
        LifeLinkError::Duplicate => "This outgoing link already exists.",
        LifeLinkError::OutgoingCap => "This Life leaf already has 100 outgoing links.",
        LifeLinkError::IncomingCap => "The target Life leaf already has 500 backlinks.",
        LifeLinkError::MissingLink => "This link no longer exists.",
        LifeLinkError::InvalidSearchQuery => "Enter 1 to 120 searchable normalized characters.",
        LifeLinkError::Storage => return IpcError::Storage,
    };
    IpcError::Validation {
        message: message.into(),
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
pub fn get_life_link_panel(
    state: State<'_, DatabaseRuntime>,
    input: GetLifeLinkPanelInput,
) -> Result<LifeLinkPanel, IpcError> {
    run!(state, |conn| repository::panel(conn, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn search_life_link_targets(
    state: State<'_, DatabaseRuntime>,
    input: SearchLifeLinkTargetsInput,
) -> Result<Vec<LifeLinkTargetView>, IpcError> {
    run!(state, |conn| repository::search_targets(conn, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_life_link(
    state: State<'_, DatabaseRuntime>,
    input: CreateLifeLinkInput,
) -> Result<LifeLinkMutationResult, IpcError> {
    run!(state, |conn| repository::create(conn, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn remove_life_link(
    state: State<'_, DatabaseRuntime>,
    input: RemoveLifeLinkInput,
) -> Result<LifeLinkMutationResult, IpcError> {
    run!(state, |conn| repository::remove(conn, input))
}
