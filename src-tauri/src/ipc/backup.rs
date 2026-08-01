use tauri::{Manager, State};

use crate::infrastructure::backup::{self, BackupError, BackupResult, RestoreResult};
use crate::infrastructure::sqlite::runtime::DatabaseRuntime;
use crate::ipc::error::IpcError;

fn backup_to_ipc(e: BackupError) -> IpcError {
    match e {
        BackupError::Db(_) | BackupError::Io(_) | BackupError::MissingBackupFile => {
            IpcError::Storage
        }
        BackupError::Checksum { .. }
        | BackupError::IntegrityCheckFailed(_)
        | BackupError::ForeignKeyViolation
        | BackupError::ForeignKeyCheckQueryError(_)
        | BackupError::PostSwapValidationFailed(_)
        | BackupError::ManifestParse(_)
        | BackupError::ManifestSerialize(_) => IpcError::Corruption,
        BackupError::UnsupportedFormatVersion(_)
        | BackupError::SchemaVersionTooNew { .. }
        | BackupError::RestoreMarkerUnsupported { .. } => IpcError::Unsupported,
        BackupError::RestoreMarkerMalformed | BackupError::RecoveryAmbiguous => {
            IpcError::Corruption
        }
        BackupError::RestoreMarkerUnreadable(_)
        | BackupError::RollbackFailed
        | BackupError::RecoveryPending => IpcError::Storage,
    }
}

/// Creates a backup package at the app's default backups directory.
/// Returns the backup location, checksum, and schema version.
/// Does not log backup destination or record content.
#[tauri::command]
#[tracing::instrument(level = "info", skip(app, state))]
pub fn backup_database(
    app: tauri::AppHandle,
    state: State<'_, DatabaseRuntime>,
) -> Result<BackupResult, IpcError> {
    let backups_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| IpcError::Storage)?
        .join("backups");

    backup::backup_db(&state, &backups_dir).map_err(backup_to_ipc)
}

/// Restores the database from the backup at `backup_dir`.
/// All validation (checksum, integrity, version) happens before any mutation.
/// On failure, live data remains usable.
#[tauri::command]
#[tracing::instrument(level = "info", skip(state))]
pub fn restore_database(
    state: State<'_, DatabaseRuntime>,
    backup_dir: String,
) -> Result<RestoreResult, IpcError> {
    let path = std::path::PathBuf::from(&backup_dir);
    if !path.exists() {
        return Err(IpcError::NotFound);
    }
    backup::restore_db(&state, &path).map_err(backup_to_ipc)
}

#[cfg(test)]
mod tests {
    use ts_rs::TS as _;

    #[test]
    fn export_backup_ipc_bindings() {
        use crate::infrastructure::backup::manifest::BackupManifest;
        use crate::infrastructure::backup::{BackupResult, RestoreResult};

        let out = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("CARGO_MANIFEST_DIR has no parent")
            .join("frontend/src/ipc/generated/");

        BackupResult::export_all_to(&out).expect("ts binding export failed for BackupResult");
        RestoreResult::export_all_to(&out).expect("ts binding export failed for RestoreResult");
        BackupManifest::export_all_to(&out).expect("ts binding export failed for BackupManifest");
    }
}
