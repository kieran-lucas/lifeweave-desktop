use tauri::State;

use crate::infrastructure::sqlite::{DbError, runtime::DatabaseRuntime};
use crate::ipc::error::IpcError;
use crate::search::normalize::normalize;
use crate::search::{
    SearchError,
    dto::{GlobalSearchProjection, SearchGlobalInput},
};

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

fn map_search(e: SearchError) -> IpcError {
    match e {
        SearchError::Storage => IpcError::Storage,
    }
}

#[tauri::command]
#[tracing::instrument(level = "info", skip(state, input))]
pub fn search_global(
    state: State<'_, DatabaseRuntime>,
    input: SearchGlobalInput,
) -> Result<GlobalSearchProjection, IpcError> {
    if input.query.chars().count() > 200 {
        return Err(IpcError::Validation {
            message: "Query too long.".into(),
        });
    }
    // Deadline state is derived from this date, so Rust validates it rather than trusting it.
    if !crate::task::domain::validate_date(&input.observed_local_date) {
        return Err(IpcError::Validation {
            message: "Enter a valid observed date.".into(),
        });
    }
    // Short-circuit before hitting the DB if the normalized query is too short.
    let norm_check = normalize(&input.query);
    let non_ws_count = norm_check.chars().filter(|c| !c.is_whitespace()).count();
    if non_ws_count < 2 {
        return Ok(GlobalSearchProjection {
            groups: vec![],
            total_visible_results: 0,
        });
    }
    state
        .execute(move |conn| {
            Ok(crate::search::repository::refresh_dirty_and_query(
                conn, input,
            ))
        })
        .map_err(map_db)?
        .map_err(map_search)
}
