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
        BackupError::RecoveryPending => IpcError::RecoveryPending,
        BackupError::RestoreMarkerUnreadable(_) | BackupError::RollbackFailed => IpcError::Storage,
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
    use super::*;
    use ts_rs::TS as _;

    #[test]
    fn recovery_pending_maps_to_ipc_recovery_pending() {
        let ipc = backup_to_ipc(BackupError::RecoveryPending);
        assert!(
            matches!(ipc, IpcError::RecoveryPending),
            "BackupError::RecoveryPending must map to IpcError::RecoveryPending, got {ipc:?}"
        );
    }

    #[test]
    fn rollback_failed_maps_to_storage_not_recovery_pending() {
        let ipc = backup_to_ipc(BackupError::RollbackFailed);
        assert!(
            matches!(ipc, IpcError::Storage),
            "BackupError::RollbackFailed must map to IpcError::Storage, got {ipc:?}"
        );
    }

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
        // IpcError is exported from ipc::mod::tests::export_ipc_bindings, but
        // regenerate here to ensure RecoveryPending is reflected in the drift check.
        IpcError::export_all_to(&out).expect("ts binding export failed for IpcError");
    }
}
