use tauri::{Emitter, Manager, State};

use crate::infrastructure::backup::{
    self, BackupCreateResult, BackupError, BackupId, BackupProgress, BackupSummary, RestoreResult,
};
use crate::infrastructure::sqlite::runtime::DatabaseRuntime;
use crate::ipc::error::IpcError;

fn backup_to_ipc(e: BackupError) -> IpcError {
    match e {
        BackupError::ActiveTaskTimer => IpcError::Validation {
            message: "Stop or discard the running task timer before creating a backup.".into(),
        },
        BackupError::InvalidBackupId | BackupError::BackupNotFound => IpcError::NotFound,
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
        BackupError::WalCheckpointIncomplete { .. } => IpcError::Storage,
        BackupError::RestoreMarkerUnreadable(_) | BackupError::RollbackFailed => IpcError::Storage,
    }
}

/// Creates a backup package at the app's default backups directory.
/// Returns path-free backup metadata plus the post-publication retention outcome.
/// Does not log backup destination or record content.
#[tauri::command]
#[tracing::instrument(level = "info", skip(app, state))]
pub fn backup_database(
    app: tauri::AppHandle,
    state: State<'_, DatabaseRuntime>,
) -> Result<BackupCreateResult, IpcError> {
    let progress = |phase: &str| {
        let _ = app.emit(
            "backup-progress",
            BackupProgress {
                operation: "backup".into(),
                phase: phase.into(),
            },
        );
    };
    progress("preparing");
    let backups_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| IpcError::Storage)?
        .join("backups");

    progress("snapshotting");
    let result = backup::create_managed_backup(&state, &backups_dir).map_err(backup_to_ipc)?;
    progress("verifying");
    progress("publishing");
    progress("completed");
    Ok(result)
}

#[tauri::command]
pub fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupSummary>, IpcError> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| IpcError::Storage)?
        .join("backups");
    backup::list_backups(&root).map_err(backup_to_ipc)
}

/// Restores the database from the backup at `backup_dir`.
/// All validation (checksum, integrity, version) happens before any mutation.
/// On failure, live data remains usable.
#[tauri::command]
#[tracing::instrument(level = "info", skip(app, state))]
pub fn restore_database(
    app: tauri::AppHandle,
    state: State<'_, DatabaseRuntime>,
    backup_id: BackupId,
) -> Result<RestoreResult, IpcError> {
    let progress = |phase: &str| {
        let _ = app.emit(
            "backup-progress",
            BackupProgress {
                operation: "restore".into(),
                phase: phase.into(),
            },
        );
    };
    progress("inspecting");
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| IpcError::Storage)?
        .join("backups");
    let path = backup::engine::resolve_backup_id(&root, &backup_id).map_err(backup_to_ipc)?;
    progress("preparing_candidate");
    progress("quiescing");
    progress("safety_backup");
    let result = backup::restore_db(&state, &path).map_err(backup_to_ipc)?;
    progress("validating");
    progress("reopening");
    progress("completed");
    Ok(result)
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
        use crate::infrastructure::backup::manifest::{BackupAssetEntry, BackupManifest};
        use crate::infrastructure::backup::{
            BackupCompatibility, BackupCreateResult, BackupProgress, BackupSummary, RestoreResult,
        };

        let out = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("CARGO_MANIFEST_DIR has no parent")
            .join("frontend/src/ipc/generated/");

        BackupSummary::export_all_to(&out).expect("ts binding export failed for BackupSummary");
        BackupCompatibility::export_all_to(&out)
            .expect("ts binding export failed for BackupCompatibility");
        BackupCreateResult::export_all_to(&out)
            .expect("ts binding export failed for BackupCreateResult");
        BackupProgress::export_all_to(&out).expect("ts binding export failed for BackupProgress");
        RestoreResult::export_all_to(&out).expect("ts binding export failed for RestoreResult");
        BackupManifest::export_all_to(&out).expect("ts binding export failed for BackupManifest");
        BackupAssetEntry::export_all_to(&out)
            .expect("ts binding export failed for BackupAssetEntry");
        // IpcError is exported from ipc::mod::tests::export_ipc_bindings, but
        // regenerate here to ensure RecoveryPending is reflected in the drift check.
        IpcError::export_all_to(&out).expect("ts binding export failed for IpcError");
    }
}
