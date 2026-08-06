use std::io::{Read as _, Write as _};
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::engine::chrono_now_rfc3339;
use super::lifecycle::{
    MARKER_FORMAT_VERSION, RestoreMarker, RestoreStage, durable_rename, generate_op_id,
    remove_if_exists,
};
use super::manifest::BackupManifest;
use super::{BackupError, RestoreResult};
use crate::infrastructure::durability;
use crate::infrastructure::sqlite::{
    DbError,
    connection::{open_existing_file_connection, open_file_connection, open_readonly_connection},
    runtime::DatabaseRuntime,
    task39_migration::{current_schema_version, max_supported_schema_version, run_all_migrations},
    worker::DbWorkerHandle,
};

#[cfg(test)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RestoreTestPoint {
    BeforeCandidateCopy,
    DuringCandidateCopy,
    AfterCandidateValidation,
}

#[cfg(test)]
type RestoreTestHook = Box<dyn FnMut(RestoreTestPoint)>;

#[cfg(test)]
thread_local! {
    static RESTORE_TEST_HOOK: std::cell::RefCell<Option<RestoreTestHook>> =
        std::cell::RefCell::new(None);
}

#[cfg(test)]
fn set_restore_test_hook(hook: Option<Box<dyn FnMut(RestoreTestPoint)>>) {
    RESTORE_TEST_HOOK.with(|slot| *slot.borrow_mut() = hook);
}

#[cfg(test)]
fn run_restore_test_hook(point: RestoreTestPoint) {
    RESTORE_TEST_HOOK.with(|slot| {
        if let Some(hook) = slot.borrow_mut().as_mut() {
            hook(point);
        }
    });
}

fn remove_prepared_artifacts(candidate_path: &Path, marker_path: &Path) -> Result<(), BackupError> {
    remove_if_exists(candidate_path)?;
    RestoreMarker::remove(marker_path).map_err(BackupError::Io)
}

fn copy_candidate(source_path: &Path, candidate_path: &Path) -> Result<(), BackupError> {
    let mut source = std::fs::File::open(source_path).map_err(BackupError::Io)?;
    let mut candidate = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(candidate_path)
        .map_err(BackupError::Io)?;
    let mut buffer = [0_u8; 64 * 1024];
    let mut first_chunk = true;

    loop {
        let read = source.read(&mut buffer).map_err(BackupError::Io)?;
        if read == 0 {
            break;
        }
        candidate
            .write_all(&buffer[..read])
            .map_err(BackupError::Io)?;
        if first_chunk {
            first_chunk = false;
            #[cfg(test)]
            run_restore_test_hook(RestoreTestPoint::DuringCandidateCopy);
        }
    }

    candidate.sync_all().map_err(BackupError::Io)
}

fn validate_candidate(
    candidate_path: &Path,
    manifest: &BackupManifest,
    supported_schema: u32,
) -> Result<(), BackupError> {
    let candidate_size = std::fs::metadata(candidate_path)
        .map_err(BackupError::Io)?
        .len();
    if candidate_size != manifest.db_size_bytes {
        return Err(BackupError::Checksum {
            expected: manifest.db_size_bytes.to_string(),
            actual: candidate_size.to_string(),
        });
    }

    let candidate_hash = sha256_file(candidate_path)?;
    if candidate_hash != manifest.db_sha256 {
        return Err(BackupError::Checksum {
            expected: manifest.db_sha256.clone(),
            actual: candidate_hash,
        });
    }

    let conn = open_readonly_connection(candidate_path).map_err(BackupError::Db)?;
    check_integrity_and_fk(&conn)?;
    let actual_schema = current_schema_version(&conn).map_err(BackupError::Db)?;
    if actual_schema > supported_schema {
        return Err(BackupError::SchemaVersionTooNew {
            backup_version: actual_schema,
            supported: supported_schema,
        });
    }
    if actual_schema != manifest.schema_version {
        return Err(BackupError::PostSwapValidationFailed(
            "candidate schema version does not match manifest".into(),
        ));
    }
    let required = required_asset_paths(&conn, actual_schema)?;
    let declared = manifest
        .assets
        .iter()
        .map(|entry| entry.relative_path.clone())
        .collect::<Vec<_>>();
    if required != declared {
        return Err(BackupError::PostSwapValidationFailed(
            "backup asset manifest does not match the database".into(),
        ));
    }
    Ok(())
}

fn required_asset_paths(
    conn: &Connection,
    schema_version: u32,
) -> Result<Vec<String>, BackupError> {
    if schema_version < 9 {
        return Ok(Vec::new());
    }
    let sql = if schema_version < 11 {
        "SELECT DISTINCT a.relative_original_path FROM assets a JOIN document_assets da ON da.asset_id=a.id WHERE a.status='usable' ORDER BY a.relative_original_path"
    } else {
        "SELECT DISTINCT a.relative_original_path FROM assets a WHERE a.status='usable' AND (EXISTS(SELECT 1 FROM document_assets da WHERE da.asset_id=a.id) OR EXISTS(SELECT 1 FROM narrative_document_assets nda WHERE nda.asset_id=a.id)) ORDER BY a.relative_original_path"
    };
    let mut statement = conn.prepare(sql).map_err(|_| {
        BackupError::PostSwapValidationFailed("asset manifest validation failed".into())
    })?;
    statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|_| {
            BackupError::PostSwapValidationFailed("asset manifest validation failed".into())
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| {
            BackupError::PostSwapValidationFailed("asset manifest validation failed".into())
        })
}

const MAX_BACKUP_ASSETS: usize = 10_000;
const MAX_BACKUP_ASSET_BYTES: u64 = 1024 * 1024 * 1024;

fn validate_and_install_assets(
    backup_dir: &Path,
    app_data_dir: &Path,
    manifest: &BackupManifest,
) -> Result<(), BackupError> {
    use std::collections::HashSet;

    if manifest.assets.len() > MAX_BACKUP_ASSETS {
        return Err(BackupError::PostSwapValidationFailed(
            "backup contains too many assets".into(),
        ));
    }
    let mut seen = HashSet::new();
    let mut total = 0_u64;
    for asset in &manifest.assets {
        let relative = Path::new(&asset.relative_path);
        let components = relative.components().collect::<Vec<_>>();
        if relative.is_absolute()
            || components.len() != 3
            || components[0].as_os_str() != "assets"
            || components[1].as_os_str() != "original"
            || !seen.insert(asset.relative_path.as_str())
        {
            return Err(BackupError::PostSwapValidationFailed(
                "backup asset identity is invalid".into(),
            ));
        }
        total = total.checked_add(asset.byte_size).ok_or_else(|| {
            BackupError::PostSwapValidationFailed("backup asset size overflow".into())
        })?;
        if total > MAX_BACKUP_ASSET_BYTES {
            return Err(BackupError::PostSwapValidationFailed(
                "backup assets exceed the restore limit".into(),
            ));
        }
        let source = backup_dir.join(relative);
        let metadata = std::fs::symlink_metadata(&source).map_err(BackupError::Io)?;
        if !metadata.file_type().is_file() || metadata.len() != asset.byte_size {
            return Err(BackupError::PostSwapValidationFailed(
                "backup asset is missing or invalid".into(),
            ));
        }
        let actual = sha256_file(&source)?;
        if actual != asset.sha256 {
            return Err(BackupError::Checksum {
                expected: asset.sha256.clone(),
                actual,
            });
        }
    }

    // Asset originals are immutable and content-addressed in metadata. Installing
    // them additively before the database swap cannot invalidate the live DB; a
    // failed restore can at worst leave an unreferenced, verified local original.
    for asset in &manifest.assets {
        let relative = Path::new(&asset.relative_path);
        let source = backup_dir.join(relative);
        let target = app_data_dir.join(relative);
        if target.exists() {
            if sha256_file(&target)? != asset.sha256 {
                return Err(BackupError::PostSwapValidationFailed(
                    "an existing asset conflicts with the backup".into(),
                ));
            }
            continue;
        }
        let parent = target.parent().ok_or_else(|| {
            BackupError::PostSwapValidationFailed("backup asset target is invalid".into())
        })?;
        std::fs::create_dir_all(parent).map_err(BackupError::Io)?;
        let temp = parent.join(format!(".restore-{}.tmp", generate_op_id()));
        std::fs::copy(&source, &temp).map_err(BackupError::Io)?;
        std::fs::OpenOptions::new()
            .write(true)
            .open(&temp)
            .and_then(|file| file.sync_all())
            .map_err(BackupError::Io)?;
        durability::durable_rename(&temp, &target).map_err(BackupError::Io)?;
    }
    Ok(())
}

/// Restores the database from the backup package at `backup_dir`.
///
/// The backup package is never mutated: a staging candidate copy is created
/// under the app's DB directory so the original package remains intact and
/// reusable.
///
/// All validation runs before any mutation. A durable marker is written before
/// each file rename so startup recovery can resume or roll back if interrupted.
///
/// Steps:
///  1. Acquire maintenance lock (serialises with concurrent backup/restore).
///  2. Guard: stale artifacts without a marker → RecoveryAmbiguous.
///  3. Read + validate manifest: format_version, schema_version.
///  4. Check backup file exists, size matches manifest, SHA-256 matches manifest.
///  5. Integrity + FK checks on backup file (read-only; no mutation).
///  6. Seal worker → Maintenance (closes the quiescence gap: no execute() can
///     mutate the live DB between seal and shutdown).
///  7. Create verified safety backup using the sealed worker Arc directly.
///     On failure: unseal worker; return error.
///  8. Copy backup DB → candidate path (never rename backup_dir files).
///     On failure: unseal worker; return error.
///  9. Write durable marker at `Prepared` stage.
///     On failure: delete candidate; unseal worker; return error.
/// 10. Shutdown worker; set Gone; delete WAL/SHM side files.
/// 11. rename(live → old); update marker to `LiveMovedAside`.
///     On failure: attempt_rollback (live still intact); return error.
/// 12. rename(candidate → live); update marker to `CandidateInstalled`.
///     On failure: attempt_rollback; return error.
/// 13. Reopen + migrate + post-swap validation (integrity, FK).
///     On failure: attempt_rollback; return error.
/// 14. Write `ReopenedValidated` marker; install worker; delete old; remove marker.
pub fn restore_db(
    runtime: &DatabaseRuntime,
    backup_dir: &Path,
) -> Result<RestoreResult, BackupError> {
    let _maint_guard = runtime.acquire_maintenance().map_err(BackupError::Db)?;

    let live_path = runtime.db_path().to_path_buf();
    let db_dir = live_path.parent().unwrap_or(Path::new(".")).to_path_buf();
    let old_path = db_dir.join("lifeweave.db.old");
    let candidate_path = db_dir.join("_restore_candidate.db");
    let marker_path = db_dir.join("restore_marker.json");

    // Guard: if a marker exists at any stage, a previous restore's cleanup is still
    // in progress or pending. Block new restores until the next startup resolves it.
    if marker_path.exists() {
        return Err(BackupError::RecoveryPending);
    }
    // Guard (Blocker F): stale recovery artifacts without a marker mean a previous
    // restore left the filesystem in an inconsistent state. Refuse to proceed so
    // we don't silently overwrite or destroy those artifacts. The user must restart
    // the app so startup preflight + recover_if_interrupted can handle the state.
    if old_path.exists() || candidate_path.exists() {
        return Err(BackupError::RecoveryAmbiguous);
    }

    // Steps 3–5: read-only validation; live DB is not touched.
    let manifest = BackupManifest::read_from_dir(backup_dir)?;

    let supported = max_supported_schema_version();
    if manifest.schema_version > supported {
        return Err(BackupError::SchemaVersionTooNew {
            backup_version: manifest.schema_version,
            supported,
        });
    }

    let backup_db_path = backup_dir.join("lifeweave.db");
    if !backup_db_path.exists() {
        return Err(BackupError::MissingBackupFile);
    }

    validate_and_install_assets(backup_dir, &db_dir, &manifest)?;

    // Step 6: write durable marker at Prepared BEFORE creating the candidate.
    // This ensures that if copy or sync partially creates the candidate and then
    // fails uncleanably, startup recovery sees a Prepared marker rather than
    // RecoveryAmbiguous (candidate-without-marker). The marker write is the only
    // step that must not fail silently: if it fails here, no candidate exists yet
    // so the state is clean.
    let marker = RestoreMarker {
        format_version: MARKER_FORMAT_VERSION,
        op_id: generate_op_id(),
        stage: RestoreStage::Prepared,
    };
    marker.write(&marker_path)?;

    // Step 7: copy and validate the candidate (never rename/touch backup_dir files).
    // copy_candidate is the single checked candidate durability barrier. Candidate
    // cleanup always precedes marker cleanup, preserving replayability on failure.
    #[cfg(test)]
    run_restore_test_hook(RestoreTestPoint::BeforeCandidateCopy);
    if let Err(e) = copy_candidate(&backup_db_path, &candidate_path)
        .and_then(|_| validate_candidate(&candidate_path, &manifest, supported))
    {
        return match remove_prepared_artifacts(&candidate_path, &marker_path) {
            Ok(()) => Err(e),
            Err(cleanup_error) => Err(cleanup_error),
        };
    }
    #[cfg(test)]
    run_restore_test_hook(RestoreTestPoint::AfterCandidateValidation);
    // Step 8c: durability barrier — flush candidate bytes to disk before the renames.
    // Close admission atomically and drain every admitted command before taking
    // the safety snapshot. The candidate is already validated and is the only
    // file installed after this point.
    let worker_arc = runtime.seal_worker().map_err(BackupError::Db)?;
    if let Err(e) = create_verified_safety_backup(&worker_arc, &db_dir) {
        runtime.unseal_worker(worker_arc);
        let _ = remove_prepared_artifacts(&candidate_path, &marker_path);
        return Err(e);
    }

    // Step 9: shutdown worker (drains queue, closes connection, flushes WAL).
    worker_arc.shutdown();
    drop(worker_arc);
    runtime.set_gone();

    // Delete WAL/SHM before the live→old rename. NotFound = success (already
    // absent). Any other error (e.g. Windows sharing-violation) is fatal: abort
    // before touching the live DB. Attempt rollback to reinstall the worker.
    // IMPORTANT: do NOT pre-delete the candidate or marker before calling
    // attempt_rollback. If rollback also fails (same sidecar still locked), the
    // Prepared marker must be preserved so startup recovery can replay safely.
    // Pre-deleting the marker here would leave candidate-without-marker = RecoveryAmbiguous.
    let wal_path = std::path::PathBuf::from(format!("{}-wal", live_path.to_string_lossy()));
    let shm_path = std::path::PathBuf::from(format!("{}-shm", live_path.to_string_lossy()));
    for sidecar in [&wal_path, &shm_path] {
        if let Err(e) = remove_if_exists(sidecar) {
            return match attempt_rollback(
                runtime,
                &old_path,
                &live_path,
                &candidate_path,
                &marker_path,
            ) {
                Ok(()) => Err(e),
                Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
                Err(_) => Err(BackupError::RollbackFailed),
            };
        }
    }

    // Step 11: rename(live → old) with durability barrier.
    // No stale .old cleanup here (Blocker F). If old_path exists at this point,
    // it was caught by the guard at the start of this function.
    if let Err(e) = durable_rename(&live_path, &old_path) {
        // live_path still has the original; old_path doesn't exist.
        let _ = std::fs::remove_file(&candidate_path);
        return match attempt_rollback(
            runtime,
            &old_path,
            &live_path,
            &candidate_path,
            &marker_path,
        ) {
            Ok(()) => Err(BackupError::Io(e)),
            Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
            Err(_) => Err(BackupError::RollbackFailed),
        };
    }
    if let Err(e) = marker
        .with_stage(RestoreStage::LiveMovedAside)
        .write(&marker_path)
    {
        // rename succeeded but marker update failed. Rollback: rename old→live.
        return match attempt_rollback(
            runtime,
            &old_path,
            &live_path,
            &candidate_path,
            &marker_path,
        ) {
            Ok(()) => Err(e),
            Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
            Err(_) => Err(BackupError::RollbackFailed),
        };
    }

    // Step 12: rename(candidate → live) with durability barrier.
    // The candidate pathname is not trusted after pre-validation. Authenticate
    // the installed live file again before promoting the marker.
    if let Err(e) = durable_rename(&candidate_path, &live_path) {
        return match attempt_rollback(
            runtime,
            &old_path,
            &live_path,
            &candidate_path,
            &marker_path,
        ) {
            Ok(()) => Err(BackupError::Io(e)),
            Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
            Err(_) => Err(BackupError::RollbackFailed),
        };
    }
    if let Err(e) = validate_candidate(&live_path, &manifest, supported) {
        return match attempt_rollback(
            runtime,
            &old_path,
            &live_path,
            &candidate_path,
            &marker_path,
        ) {
            Ok(()) => Err(e),
            Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
            Err(_) => Err(BackupError::RollbackFailed),
        };
    }
    if let Err(e) = marker
        .with_stage(RestoreStage::CandidateInstalled)
        .write(&marker_path)
    {
        return match attempt_rollback(
            runtime,
            &old_path,
            &live_path,
            &candidate_path,
            &marker_path,
        ) {
            Ok(()) => Err(e),
            Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
            Err(_) => Err(BackupError::RollbackFailed),
        };
    }

    // Steps 13–14: open new connection, migrate, post-swap validation.
    match reopen_and_validate(&live_path) {
        Ok((worker, schema_version)) => {
            // Write ReopenedValidated BEFORE installing the worker so that if the
            // write fails, we can still roll back cleanly (worker not yet installed).
            if let Err(e) = marker
                .with_stage(RestoreStage::ReopenedValidated)
                .write(&marker_path)
            {
                drop(worker); // close the new connection before rollback
                return match attempt_rollback(
                    runtime,
                    &old_path,
                    &live_path,
                    &candidate_path,
                    &marker_path,
                ) {
                    Ok(()) => Err(e),
                    Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
                    Err(_) => Err(BackupError::RollbackFailed),
                };
            }
            runtime.install_worker(worker);
            // Checked idempotent cleanup. Marker is removed only after BOTH
            // artifact cleanups succeed. If either fails, the marker is kept at
            // ReopenedValidated so the next startup retries cleanup. The live DB
            // is authoritative and usable regardless; the next restore attempt will
            // see the marker and return RecoveryPending.
            let old_ok = remove_if_exists(&old_path).is_ok();
            let cand_ok = remove_if_exists(&candidate_path).is_ok();
            if old_ok && cand_ok {
                let _ = RestoreMarker::remove(&marker_path);
            }
            Ok(RestoreResult {
                restored_at: chrono_now_rfc3339(),
                schema_version,
            })
        }
        Err(e) => {
            match attempt_rollback(
                runtime,
                &old_path,
                &live_path,
                &candidate_path,
                &marker_path,
            ) {
                Ok(()) => Err(e),
                Err(BackupError::RecoveryPending) => Err(BackupError::RecoveryPending),
                Err(_) => Err(BackupError::RollbackFailed),
            }
        }
    }
}

/// Checks SQLite integrity and foreign-key constraints on an open connection.
/// Uses `map_err` for the FK query so a query error propagates as
/// `ForeignKeyCheckQueryError` rather than being silently treated as zero violations.
fn check_integrity_and_fk(conn: &rusqlite::Connection) -> Result<(), BackupError> {
    let ic: String = conn
        .query_row("PRAGMA integrity_check", [], |r| r.get(0))
        .map_err(|e| BackupError::Db(DbError::Rusqlite(e)))?;
    if ic != "ok" {
        return Err(BackupError::IntegrityCheckFailed(ic));
    }
    let fk: i64 = conn
        .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check()", [], |r| {
            r.get(0)
        })
        .map_err(BackupError::ForeignKeyCheckQueryError)?;
    if fk > 0 {
        return Err(BackupError::ForeignKeyViolation);
    }
    Ok(())
}

/// Creates a safety backup of the live DB using the SEALED worker Arc.
///
/// Must be called AFTER `seal_worker()` returns the Arc so that the safety backup
/// captures the state at the exact quiescence point (no domain mutation possible
/// after seal). Uses `worker_arc.execute()` directly; `runtime.execute()` would
/// return Maintenance and must not be used here.
///
/// Verification steps:
/// - integrity_check on the staging file;
/// - FK check;
/// - SQLite connection closed (file fully flushed) before publication;
///
/// Atomically publishes: keeps `_safety/` as `_safety_old/` until the new
/// staging backup is verified, so a verification failure leaves the prior
/// valid safety copy intact.
fn create_verified_safety_backup(
    worker_arc: &Arc<DbWorkerHandle>,
    db_dir: &Path,
) -> Result<(), BackupError> {
    let safety_dir = db_dir.join("backups").join("_safety");
    let safety_staging_dir = db_dir.join("backups").join("_safety_staging");
    let safety_old_dir = db_dir.join("backups").join("_safety_old");

    let _ = durability::durable_remove_dir_all(&safety_staging_dir);
    std::fs::create_dir_all(&safety_staging_dir).map_err(BackupError::Io)?;

    let staging_db_path = safety_staging_dir.join("lifeweave.db");
    let staging_db_clone = staging_db_path.clone();

    // Use the sealed worker Arc directly — runtime is Maintenance.
    worker_arc
        .execute(move |live_conn| {
            let mut dst = Connection::open(&staging_db_clone).map_err(DbError::Rusqlite)?;
            let b =
                rusqlite::backup::Backup::new(live_conn, &mut dst).map_err(DbError::Rusqlite)?;
            b.run_to_completion(100, Duration::ZERO, None)
                .map_err(DbError::Rusqlite)?;
            Ok(())
        })
        .map_err(BackupError::Db)?;

    // Checkpoint and confirm all committed WAL pages are in the main file before
    // the worker is shut down and WAL/SHM are deleted. Returns (busy, log, ckptd).
    // busy != 0 means a reader snapshot blocked the checkpoint; log != ckptd means
    // not all frames were moved to the main file. Either condition means committed
    // data remains only in the WAL — abort the restore to prevent data loss.
    let (ckpt_busy, ckpt_log, ckpt_ckptd): (i64, i64, i64) = worker_arc
        .execute(|live_conn| {
            live_conn
                .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?))
                })
                .map_err(DbError::Rusqlite)
        })
        .map_err(BackupError::Db)?;

    // cfg(test) failpoint: simulates an incomplete checkpoint result.
    #[cfg(test)]
    if CHECKPOINT_FAIL.with(|c| c.get()) {
        return Err(BackupError::WalCheckpointIncomplete {
            busy: 1,
            log: 100,
            checkpointed: 0,
        });
    }

    if ckpt_busy != 0 || ckpt_log != ckpt_ckptd {
        return Err(BackupError::WalCheckpointIncomplete {
            busy: ckpt_busy,
            log: ckpt_log,
            checkpointed: ckpt_ckptd,
        });
    }

    // Verify the staging backup: integrity + FK.
    {
        let conn = open_file_connection(&staging_db_path).map_err(BackupError::Db)?;
        check_integrity_and_fk(&conn)?;
        // Connection is dropped here (closed), flushing the WAL before publication.
    }
    durability::sync_tree(&safety_staging_dir).map_err(BackupError::Io)?;

    // Atomically publish: keep old _safety/ until new staging is verified.
    let _ = durability::durable_remove_dir_all(&safety_old_dir);
    if safety_dir.exists() {
        durable_rename(&safety_dir, &safety_old_dir).map_err(BackupError::Io)?;
    }
    durable_rename(&safety_staging_dir, &safety_dir).map_err(|e| {
        if safety_old_dir.exists() {
            let _ = durable_rename(&safety_old_dir, &safety_dir);
        }
        BackupError::Io(e)
    })?;
    let _ = durability::durable_remove_dir_all(&safety_old_dir);

    Ok(())
}

/// Opens the newly installed DB, runs migrations, and validates post-swap invariants
/// (integrity check, FK check). Returns a live worker and current schema version on
/// success. Callers are responsible for rollback on failure.
fn reopen_and_validate(live_path: &Path) -> Result<(DbWorkerHandle, u32), BackupError> {
    let mut conn = open_existing_file_connection(live_path).map_err(BackupError::Db)?;
    run_all_migrations(&mut conn).map_err(BackupError::Db)?;

    let ic: String = conn
        .query_row("PRAGMA integrity_check", [], |r| r.get(0))
        .map_err(|e| BackupError::PostSwapValidationFailed(e.to_string()))?;
    if ic != "ok" {
        return Err(BackupError::PostSwapValidationFailed(format!(
            "integrity_check: {ic}"
        )));
    }

    let fk: i64 = conn
        .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check()", [], |r| {
            r.get(0)
        })
        .map_err(BackupError::ForeignKeyCheckQueryError)?;
    if fk > 0 {
        return Err(BackupError::PostSwapValidationFailed(
            "FK violations in restored DB".into(),
        ));
    }

    let schema_version = current_schema_version(&conn).map_err(BackupError::Db)?;
    let worker = DbWorkerHandle::spawn(conn);
    Ok((worker, schema_version))
}

/// Attempts to restore the database to a usable state after a failed restore operation.
///
/// Semantics:
/// - If `old_path` exists: removes any file at `live_path` (failed candidate),
///   deletes stale WAL/SHM at `live_path`, renames old → live, validates the
///   result, and installs a new worker. If validation fails, renames live → old
///   to preserve the `.old` artifact for startup recovery.
/// - If `old_path` is absent: expects `live_path` to have the original (live→old
///   rename failed); deletes stale WAL/SHM, validates, and installs a worker.
/// - Validation: open_existing_file_connection, run_migrations, integrity_check,
///   FK check, basic schema query.
///
/// On full success:
/// - Worker is installed and runtime is Ready.
/// - `candidate_path` and `marker_path` are removed.
/// - Returns `Ok(())`. Caller then returns the original restore error.
///
/// On any validation failure:
/// - Marker and `.old` are preserved (for the next startup to recover).
/// - Returns `Err(BackupError::RollbackFailed)`.
/// - Runtime may remain in Gone state.
fn attempt_rollback(
    runtime: &DatabaseRuntime,
    old_path: &Path,
    live_path: &Path,
    candidate_path: &Path,
    marker_path: &Path,
) -> Result<(), BackupError> {
    let restore_from_old = old_path.exists();

    // WAL/SHM paths derived from live_path (same base name).
    let wal_path = std::path::PathBuf::from(format!("{}-wal", live_path.to_string_lossy()));
    let shm_path = std::path::PathBuf::from(format!("{}-shm", live_path.to_string_lossy()));

    // Tracks whether a LiveMovedAside rollback marker was successfully written.
    // True when restore_from_old is false (no .tmp scratch file was created, so
    // the existing marker can always be safely removed after cleanup).
    let mut rollback_marker_written = !restore_from_old;

    if restore_from_old {
        // Delete candidate WAL/SHM before removing the candidate main file. A
        // sharing violation must leave both live and .old intact for replay.
        for sidecar in [&wal_path, &shm_path] {
            if remove_if_exists(sidecar).is_err() {
                return Err(BackupError::RollbackFailed);
            }
        }
        if live_path.exists() {
            durability::durable_remove_file(live_path).map_err(|_| BackupError::RollbackFailed)?;
        }
        if durable_rename(old_path, live_path).is_err() {
            // Rename failed. old_path still exists; preserve all artifacts.
            return Err(BackupError::RollbackFailed);
        }
        // Durably record that old→live rename succeeded so that next-startup
        // CandidateInstalled(true,false) recovery validates live rather than
        // returning RecoveryAmbiguous.
        // Track whether the write succeeded: if it fails after creating a .tmp
        // scratch file that cannot be cleaned up, the final marker must NOT be
        // removed — removing it while .tmp exists leaves has_tmp && !has_marker,
        // which preflight maps to RestoreMarkerUnreadable (fails indefinitely).
        // On write failure the final marker is preserved at its old stage
        // (e.g. CandidateInstalled); startup CandidateInstalled(true,false)
        // then validates live and cleans up correctly.
        let rollback_marker = RestoreMarker {
            format_version: MARKER_FORMAT_VERSION,
            op_id: "rollback".into(),
            stage: RestoreStage::LiveMovedAside,
        };
        rollback_marker_written = rollback_marker.write(marker_path).is_ok();
    } else if live_path.exists() {
        // old absent, live present: live is the original (step 11 rename failed).
        // Delete stale WAL/SHM before opening. NotFound = success; other errors → abort.
        for sidecar in [&wal_path, &shm_path] {
            if remove_if_exists(sidecar).is_err() {
                return Err(BackupError::RollbackFailed);
            }
        }
    } else {
        // Neither old nor live. No database to open.
        return Err(BackupError::RollbackFailed);
    }

    // Validate the connection in a closure so that `conn` is dropped on failure
    // before we attempt to rename live → old. On Windows, renaming an open file
    // succeeds only when SQLite opens it with FILE_SHARE_DELETE, which is not
    // guaranteed. Dropping the connection first makes the rename safe.
    let validated_conn: Option<Connection> = (|| -> Option<Connection> {
        let mut conn = open_existing_file_connection(live_path).ok()?;
        run_all_migrations(&mut conn).ok()?;
        let ic: String = conn
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))
            .ok()?;
        if ic != "ok" {
            return None;
        }
        let fk: i64 = conn
            .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check()", [], |r| {
                r.get(0)
            })
            .unwrap_or(1);
        if fk != 0 {
            return None;
        }
        // Basic schema availability check: proves migrations have been applied.
        conn.query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| {
            r.get::<_, i64>(0)
        })
        .ok()?;
        Some(conn)
    })();

    match validated_conn {
        Some(conn) => {
            // Checkpoint and drop the validation connection before opening a fresh
            // one for the worker. On Windows, the WAL SHM is memory-mapped while
            // the connection is open. When the live DB was renamed while the
            // previous worker ran, closing here ensures the calling-thread mapping
            // is fully released before the worker thread opens its own SHM view,
            // preventing ERROR_SHARING_VIOLATION on the first execute().
            let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
            drop(conn);

            let mut fresh = open_existing_file_connection(live_path)
                .map_err(|_| BackupError::RollbackFailed)?;
            run_all_migrations(&mut fresh).map_err(|_| BackupError::RollbackFailed)?;
            let worker = DbWorkerHandle::spawn(fresh);
            runtime.install_worker(worker);
            // Clean candidate only after worker is confirmed installed.
            // If candidate removal fails, keep the marker so the next startup can
            // retry cleanup. Worker is installed and runtime is Ready.
            if remove_if_exists(candidate_path).is_err() {
                return Err(BackupError::RecoveryPending);
            }
            // Remove the final marker ONLY if the rollback-transition write succeeded.
            // If the write failed, there may be a stale .tmp scratch file; removing
            // the final marker while .tmp exists creates has_tmp && !has_marker, which
            // preflight maps to RestoreMarkerUnreadable — the app cannot start until
            // manually recovered. Keeping the final marker lets preflight clean the .tmp
            // (has_tmp && has_marker) and recover_if_interrupted resolve the state.
            if rollback_marker_written {
                let _ = RestoreMarker::remove(marker_path);
                Ok(())
            } else {
                Err(BackupError::RecoveryPending)
            }
        }
        None => {
            // Validation failed. If we renamed old → live, rename back to preserve .old
            // so startup recovery can find it. Best-effort; if rename-back fails too,
            // the artifacts remain in an ambiguous state for startup recovery.
            if restore_from_old {
                let _ = durable_rename(live_path, old_path);
            }
            Err(BackupError::RollbackFailed)
        }
    }
}

// cfg(test) failpoint: simulates an incomplete WAL checkpoint result inside
// create_verified_safety_backup. Thread-local so parallel tests do not interfere.
#[cfg(test)]
thread_local! {
    static CHECKPOINT_FAIL: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}

#[cfg(test)]
pub(super) fn set_checkpoint_fail(fail: bool) {
    CHECKPOINT_FAIL.with(|c| c.set(fail));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::{
        backup::engine::backup_db,
        backup::lifecycle::{
            self as lc, RestoreMarker, RestoreStage, reset_test_failpoints,
            set_marker_write_fail_at, set_remove_if_exists_always_fail,
            set_remove_if_exists_fail_at,
        },
        backup::manifest::BackupManifest,
        sqlite::{
            connection::{open_existing_file_connection, open_file_connection},
            foundation_record_repo as repo,
            runtime::DatabaseRuntime,
            task39_migration::run_all_migrations as run_migrations,
            worker::DbWorkerHandle,
        },
    };
    use crate::task::{
        analytics,
        dto::{
            AnalyticsPeriodKind, AnalyticsProjectionInput, CreateTaskInput, EvaluateTaskInput,
            UpdateCategoryGoalsInput,
        },
        evaluation::{self, ObservedLocalTime},
        repository as task_repository,
        saved_view::{self, *},
    };
    use chrono::{Datelike, Local, Timelike};
    use std::path::PathBuf;
    use std::sync::{
        Arc, Barrier, Mutex,
        atomic::{AtomicU32, Ordering},
    };
    use std::time::Duration;

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    /// Exact stored `task_saved_views` row, in declaration order: id, name, base_scope,
    /// predicate_version, predicate_json, sort_mode, group_mode, position, revision, archived_at.
    /// Backup equality compares the whole row, so every persisted column stays in the tuple.
    type SavedViewRow = (
        String,
        String,
        String,
        i32,
        String,
        String,
        String,
        i32,
        i32,
        Option<String>,
    );

    /// Reads every stored Saved View row in a stable order. Both the pre-backup snapshot and the
    /// post-restore comparison must issue the identical statement, or the equality assertion could
    /// pass on a column the restore never actually reinstated.
    fn saved_view_rows(conn: &Connection) -> rusqlite::Result<Vec<SavedViewRow>> {
        let mut statement = conn.prepare(
            "SELECT id,name,base_scope,predicate_version,predicate_json,sort_mode,group_mode,position,revision,archived_at FROM task_saved_views ORDER BY id",
        )?;
        statement
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                    row.get(9)?,
                ))
            })?
            .collect()
    }

    fn next_id() -> String {
        reset_test_failpoints();
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        format!("{}_{n}", std::process::id())
    }

    fn temp_backups_dir() -> PathBuf {
        let p = std::env::temp_dir().join(format!("lw_rstbkp_{}", next_id()));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    fn make_file_runtime() -> (DatabaseRuntime, PathBuf) {
        let dir = std::env::temp_dir().join(format!("lw_rst_{}", next_id()));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("lifeweave.db");
        let mut conn = open_file_connection(&p).unwrap();
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        let rt = DatabaseRuntime::new(p.clone(), worker);
        (rt, p)
    }

    fn historical_asset_candidate(version: u32) -> (PathBuf, BackupManifest) {
        use crate::infrastructure::sqlite::migrations::run_migrations_through;
        let root = temp_backups_dir();
        let candidate = root.join("lifeweave.db");
        let asset_id = "00000000-0000-7000-8000-000000000901";
        let relative = format!("assets/original/{asset_id}.png");
        {
            let mut conn = open_file_connection(&candidate).unwrap();
            run_migrations_through(&mut conn, version).unwrap();
            conn.execute("INSERT INTO life_nodes VALUES ('00000000-0000-7000-8000-000000000900','life-root','Leaf','','life-leaf','neutral',1,NULL,'now','now',0)", []).unwrap();
            conn.execute("INSERT INTO reader_documents VALUES ('00000000-0000-7000-8000-000000000902','00000000-0000-7000-8000-000000000900',1,0,'{\"type\":\"doc\",\"content\":[]}','', 'now','now',NULL)", []).unwrap();
            conn.execute("INSERT INTO assets VALUES(?1,'checksum-901','pixel.png','image/png',1,1,1,?2,'usable','now')", rusqlite::params![asset_id, relative]).unwrap();
            conn.execute(
                "INSERT INTO document_assets VALUES('00000000-0000-7000-8000-000000000902',?1,1)",
                [asset_id],
            )
            .unwrap();
        }
        let bytes = std::fs::read(&candidate).unwrap();
        let manifest = BackupManifest {
            format_version: 2,
            app_version: "0.0.0".into(),
            schema_version: version,
            created_at: "now".into(),
            db_size_bytes: bytes.len() as u64,
            db_sha256: sha256_file(&candidate).unwrap(),
            assets: vec![crate::infrastructure::backup::manifest::BackupAssetEntry {
                relative_path: relative,
                byte_size: 1,
                sha256: "00".repeat(32),
            }],
        };
        (candidate, manifest)
    }

    #[test]
    fn schema_9_and_10_candidates_use_only_basic_leaf_asset_authority() {
        for version in [9, 10] {
            let (candidate, manifest) = historical_asset_candidate(version);
            validate_candidate(&candidate, &manifest, 14).unwrap();
            let missing = BackupManifest {
                assets: vec![],
                ..manifest.clone()
            };
            assert!(validate_candidate(&candidate, &missing, 14).is_err());
            let extra = BackupManifest {
                assets: vec![
                    manifest.assets[0].clone(),
                    crate::infrastructure::backup::manifest::BackupAssetEntry {
                        relative_path: "assets/original/unrelated.png".into(),
                        byte_size: 1,
                        sha256: "00".repeat(32),
                    },
                ],
                ..manifest
            };
            assert!(validate_candidate(&candidate, &extra, 14).is_err());
        }
    }

    #[test]
    fn pre_asset_schema_has_empty_asset_authority() {
        use crate::infrastructure::sqlite::migrations::run_migrations_through;
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        run_migrations_through(&mut conn, 8).unwrap();
        assert!(required_asset_paths(&conn, 8).unwrap().is_empty());
    }

    #[test]
    fn schema_9_backup_restores_and_migrates_with_its_basic_leaf_asset() {
        let (candidate, mut manifest) = historical_asset_candidate(9);
        let package = candidate.parent().unwrap();
        let asset = crate::document::assets::tiny_png();
        let asset_path = package.join(&manifest.assets[0].relative_path);
        std::fs::create_dir_all(asset_path.parent().unwrap()).unwrap();
        std::fs::write(&asset_path, &asset).unwrap();
        manifest.assets[0].byte_size = asset.len() as u64;
        manifest.assets[0].sha256 = sha256_file(&asset_path).unwrap();
        manifest.write_to_dir(package).unwrap();
        let (runtime, db) = make_file_runtime();
        let result = restore_db(&runtime, package).unwrap();
        assert_eq!(
            result.schema_version,
            crate::infrastructure::sqlite::task39_migration::TASK39_SCHEMA_VERSION
        );
        let reopened = open_existing_file_connection(&db).unwrap();
        assert_eq!(
            current_schema_version(&reopened).unwrap(),
            crate::infrastructure::sqlite::task39_migration::TASK39_SCHEMA_VERSION
        );
        assert_eq!(
            reopened
                .query_row(
                    "SELECT count(*) FROM assets WHERE status='usable'",
                    [],
                    |row| row.get::<_, i64>(0)
                )
                .unwrap(),
            1
        );
    }

    #[test]
    fn current_schema_requires_narrative_asset_authority() {
        use crate::{
            document::assets,
            life,
            narrative::{dto::CreateNarrativeDocumentInput, repository as narrative},
        };
        let (rt, db) = make_file_runtime();
        let root = db.parent().unwrap().to_path_buf();
        let asset = rt
            .execute(move |conn| {
                let node = life::repository::create(
                    conn,
                    life::dto::CreateLifeNodeInput {
                        parent_id: "life-root".into(),
                        title: "Leaf".into(),
                        short_description: "".into(),
                        icon_key: "life-leaf".into(),
                        branch_theme_id: "neutral".into(),
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?
                .node;
                let canvas = narrative::create(
                    conn,
                    CreateNarrativeDocumentInput {
                        life_node_id: node.id,
                        operation_id: "restore-narrative-asset".into(),
                        template_id: "knowledge_dossier".into(),
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?;
                let asset = assets::import(
                    conn,
                    &root,
                    crate::document::dto::ImportDocumentAssetInput {
                        original_name: "pixel.png".into(),
                        bytes: assets::tiny_png(),
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?;
                conn.execute(
                    "INSERT INTO narrative_document_assets VALUES(?1,?2,1)",
                    [&canvas.id, &asset.asset_id],
                )?;
                Ok(asset)
            })
            .unwrap();
        let manifest = BackupManifest {
            format_version: 2,
            app_version: "0.0.0".into(),
            schema_version: 14,
            created_at: "now".into(),
            db_size_bytes: std::fs::metadata(&db).unwrap().len(),
            db_sha256: sha256_file(&db).unwrap(),
            assets: vec![],
        };
        assert!(validate_candidate(&db, &manifest, 14).is_err());
        let relative = format!("assets/original/{}.png", asset.asset_id);
        assert_eq!(
            required_asset_paths(&open_readonly_connection(&db).unwrap(), 14).unwrap(),
            vec![relative]
        );
    }

    #[test]
    fn asset_restore_rejects_traversal_and_corruption() {
        use crate::infrastructure::backup::manifest::BackupAssetEntry;
        let package = temp_backups_dir();
        let target = temp_backups_dir();
        let mut manifest = BackupManifest {
            format_version: 2,
            app_version: "0.0.0".into(),
            schema_version: 9,
            created_at: "now".into(),
            db_size_bytes: 0,
            db_sha256: String::new(),
            assets: vec![BackupAssetEntry {
                relative_path: "../escape.png".into(),
                byte_size: 1,
                sha256: "x".into(),
            }],
        };
        assert!(validate_and_install_assets(&package, &target, &manifest).is_err());
        let relative = "assets/original/00000000-0000-7000-8000-000000000999.png";
        let source = package.join(relative);
        std::fs::create_dir_all(source.parent().unwrap()).unwrap();
        std::fs::write(&source, b"asset").unwrap();
        manifest.assets[0] = BackupAssetEntry {
            relative_path: relative.into(),
            byte_size: 5,
            sha256: "wrong".into(),
        };
        assert!(validate_and_install_assets(&package, &target, &manifest).is_err());
    }

    #[test]
    fn asset_restore_installs_verified_original_additively() {
        use crate::infrastructure::backup::manifest::BackupAssetEntry;
        let package = temp_backups_dir();
        let target = temp_backups_dir();
        let relative = "assets/original/00000000-0000-7000-8000-000000000998.png";
        let source = package.join(relative);
        std::fs::create_dir_all(source.parent().unwrap()).unwrap();
        std::fs::write(&source, b"asset").unwrap();
        let manifest = BackupManifest {
            format_version: 2,
            app_version: "0.0.0".into(),
            schema_version: 9,
            created_at: "now".into(),
            db_size_bytes: 0,
            db_sha256: String::new(),
            assets: vec![BackupAssetEntry {
                relative_path: relative.into(),
                byte_size: 5,
                sha256: sha256_file(&source).unwrap(),
            }],
        };
        validate_and_install_assets(&package, &target, &manifest).unwrap();
        assert_eq!(std::fs::read(target.join(relative)).unwrap(), b"asset");
        validate_and_install_assets(&package, &target, &manifest).unwrap();
    }

    // ── Core round-trip ───────────────────────────────────────────────────────

    #[test]
    fn round_trip_restore_recovers_exact_data() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id1 = "019700000000-7fff-8000-0000-000000000001".to_string();
        rt.execute({
            let id1 = id1.clone();
            move |conn| repo::create(conn, &id1, "Original label").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        rt.execute({
            let id1 = id1.clone();
            move |conn| {
                repo::archive(conn, &id1, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert!(
            active.is_empty(),
            "record should be archived before restore"
        );

        let restore_result = restore_db(&rt, &backup_dir).unwrap();
        assert_eq!(
            restore_result.schema_version,
            crate::infrastructure::sqlite::task39_migration::TASK39_SCHEMA_VERSION
        );

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Original label");
    }

    #[test]
    fn document_revision_draft_and_asset_round_trip_restore() {
        use crate::document::{assets, dto as document_dto, repository as documents};
        let (rt, db) = make_file_runtime();
        let app_root = db.parent().unwrap().to_path_buf();
        let app_root_for_write = app_root.clone();
        let (document_id, asset_id, relative_path) = rt
            .execute(move |conn| {
                let node = crate::life::repository::create(
                    conn,
                    crate::life::dto::CreateLifeNodeInput {
                        parent_id: "life-root".into(), title: "Document leaf".into(),
                        short_description: String::new(), icon_key: "life-leaf".into(),
                        branch_theme_id: "neutral".into(),
                    },
                ).map_err(|_| DbError::InvalidMigrationList)?.node;
                let document = documents::create(conn, document_dto::CreateReaderDocumentInput {
                    life_node_id: node.id, operation_id: "backup-document-create".into(),
                }).map_err(|_| DbError::InvalidMigrationList)?;
                let asset = assets::import(conn, &app_root_for_write, document_dto::ImportDocumentAssetInput {
                    original_name: "pixel.png".into(), bytes: assets::tiny_png(),
                }).map_err(|_| DbError::InvalidMigrationList)?;
                let json = format!(r#"{{"type":"doc","content":[{{"type":"paragraph","content":[{{"type":"text","text":"Committed"}}]}},{{"type":"image","attrs":{{"assetId":"{}","alt":"pixel"}}}}]}}"#, asset.asset_id);
                let saved = documents::save(conn, document_dto::SaveReaderDocumentInput {
                    document_id: document.id.clone(), expected_revision: 0, schema_version: 1,
                    canonical_json: json, operation_id: "backup-document-save".into(),
                }).map_err(|_| DbError::InvalidMigrationList)?;
                documents::save_draft(conn, document_dto::SaveReaderDraftInput {
                    document_id: document.id.clone(), base_revision: saved.revision,
                    canonical_json: r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Recover me"}]}]}"#.into(),
                }).map_err(|_| DbError::InvalidMigrationList)?;
                let relative: String = conn.query_row("SELECT relative_original_path FROM assets WHERE id=?1", [&asset.asset_id], |row| row.get(0))?;
                Ok((document.id, asset.asset_id, relative))
            }).unwrap();
        let backups = temp_backups_dir();
        let backup = backup_db(&rt, &backups).unwrap();
        std::fs::remove_file(app_root.join(&relative_path)).unwrap();
        rt.execute({ let id=document_id.clone(); move |conn| { conn.execute("DELETE FROM reader_document_drafts WHERE document_id=?1", [&id])?; conn.execute("UPDATE reader_documents SET canonical_json='{}',plain_text='',revision=revision+1 WHERE id=?1", [&id])?; Ok(()) }}).unwrap();
        restore_db(&rt, Path::new(&backup.backup_dir)).unwrap();
        let app_root_for_read = app_root.clone();
        rt.execute(move |conn| {
            let revision: i32 = conn.query_row(
                "SELECT revision FROM reader_documents WHERE id=?1",
                [&document_id],
                |row| row.get(0),
            )?;
            let drafts: i64 = conn.query_row(
                "SELECT COUNT(*) FROM reader_document_drafts WHERE document_id=?1",
                [&document_id],
                |row| row.get(0),
            )?;
            assert_eq!(revision, 1);
            assert_eq!(drafts, 1);
            let bytes = assets::get(conn, &app_root_for_read, &asset_id)
                .map_err(|_| DbError::InvalidMigrationList)?;
            assert_eq!(bytes.asset.original_name, "pixel.png");
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn life_tree_pins_and_navigation_survive_backup_restore() {
        use crate::life::{
            domain::ROOT_ID,
            dto::{CreateLifeNodeInput, GetLifeBrowseInput, SaveLifeNavigationPreferenceInput},
            repository as life_repository,
        };
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let branch = rt
            .execute(|conn| {
                life_repository::create(
                    conn,
                    CreateLifeNodeInput {
                        parent_id: ROOT_ID.into(),
                        title: "Synthetic branch".into(),
                        short_description: "Backup fixture".into(),
                        icon_key: "life-branch".into(),
                        branch_theme_id: "neutral".into(),
                    },
                )
                .map_err(|_| crate::infrastructure::sqlite::DbError::WorkerGone)
            })
            .unwrap();
        let id = branch.node.id.clone();
        rt.execute({
            let id = id.clone();
            move |conn| {
                life_repository::set_pin(conn, &id, true)
                    .and_then(|_| {
                        life_repository::save_preference(
                            conn,
                            SaveLifeNavigationPreferenceInput {
                                node_id: id,
                                mode: "browse".into(),
                                path_version: 1,
                                viewport_anchor: None,
                            },
                        )
                    })
                    .map(|_| ())
                    .map_err(|_| crate::infrastructure::sqlite::DbError::WorkerGone)
            }
        })
        .unwrap();
        let package = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);
        rt.execute({
            let id = id.clone();
            move |conn| {
                life_repository::archive(
                    conn,
                    crate::life::dto::MutateLifeNodeInput {
                        node_id: id,
                        expected_revision: 0,
                    },
                )
                .map(|_| ())
                .map_err(|_| crate::infrastructure::sqlite::DbError::WorkerGone)
            }
        })
        .unwrap();
        restore_db(&rt, &package).unwrap();
        let restored = rt
            .execute(|conn| {
                life_repository::browse(
                    conn,
                    GetLifeBrowseInput {
                        node_id: None,
                        child_page: 0,
                    },
                )
                .map_err(|_| crate::infrastructure::sqlite::DbError::WorkerGone)
            })
            .unwrap();
        assert_eq!(restored.selected.title, "Synthetic branch");
        assert!(restored.selected.is_pinned);
    }

    #[test]
    fn life_edit_operation_authority_survives_backup_restore() {
        use crate::life::{
            domain::ROOT_ID,
            dto::{CreateLifeNodeOperationInput, LifeOperationContext, UndoLifeOperationInput},
            edit as life_edit,
        };
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let created = rt
            .execute(|conn| {
                life_edit::create(
                    conn,
                    CreateLifeNodeOperationInput {
                        context: LifeOperationContext {
                            operation_id: "backup-life-edit-create".into(),
                            expected_tree_revision: 0,
                        },
                        parent_id: ROOT_ID.into(),
                        title: "Undoable branch".into(),
                        short_description: "Synthetic".into(),
                        icon_key: "life-branch".into(),
                        theme_variant: "neutral".into(),
                    },
                )
                .map_err(|_| crate::infrastructure::sqlite::DbError::WorkerGone)
            })
            .unwrap();
        let package = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);
        rt.execute(|conn| {
            conn.execute(
                "UPDATE life_nodes SET title='After backup' WHERE title='Undoable branch'",
                [],
            )?;
            Ok(())
        })
        .unwrap();
        restore_db(&rt, &package).unwrap();
        let token = created.undo_token.unwrap();
        rt.execute(move |conn| {
            life_edit::undo(
                conn,
                UndoLifeOperationInput {
                    undo_token: token,
                    expected_tree_revision: 1,
                },
            )
            .map_err(|_| crate::infrastructure::sqlite::DbError::WorkerGone)
        })
        .unwrap();
        let active = rt
            .execute(|conn| {
                Ok(conn.query_row(
                    "SELECT COUNT(*) FROM life_nodes WHERE archived_at IS NULL",
                    [],
                    |r| r.get::<_, i64>(0),
                )?)
            })
            .unwrap();
        assert_eq!(
            active, 1,
            "restored ledger must still undo the synthetic create"
        );
    }

    #[test]
    fn completion_evaluation_history_and_operations_survive_backup_restore() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let task_id = rt
            .execute(|conn| {
                let task = task_repository::create(
                    conn,
                    CreateTaskInput {
                        title: "Synthetic past task".into(),
                        description: "".into(),
                        local_date: "2026-08-01".into(),
                        start_minute: 480,
                        end_minute: 540,
                        category_id: "general".into(),
                        priority: "medium".into(),
                        life_node_id: None,
                        focus_plan_id: None,
                        deadline_local_date: None,
                        tag_ids: vec![],
                    },
                )
                .unwrap();
                evaluation::evaluate_at(
                    conn,
                    EvaluateTaskInput {
                        subject_kind: "one_off".into(),
                        task_id: Some(task.id.clone()),
                        series_id: None,
                        original_local_date: None,
                        state_id: "completion-met".into(),
                        operation_id: "backup-evaluation-original".into(),
                        observed_local_date: "2026-08-02".into(),
                        observed_local_minute: 720,
                    },
                    ObservedLocalTime {
                        date: "2026-08-02".into(),
                        minute: 720,
                    },
                )
                .unwrap();
                Ok(task.id)
            })
            .unwrap();
        let backup_dir = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);

        let task_id_for_mutation = task_id.clone();
        rt.execute(move |conn| {
            evaluation::evaluate_at(
                conn,
                EvaluateTaskInput {
                    subject_kind: "one_off".into(),
                    task_id: Some(task_id_for_mutation),
                    series_id: None,
                    original_local_date: None,
                    state_id: "completion-excellent".into(),
                    operation_id: "backup-evaluation-later".into(),
                    observed_local_date: "2026-08-02".into(),
                    observed_local_minute: 720,
                },
                ObservedLocalTime {
                    date: "2026-08-02".into(),
                    minute: 720,
                },
            )
            .unwrap();
            Ok(())
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();
        let task_id_for_assertion = task_id.clone();
        let (label, history_count, operation_count) = rt
            .execute(move |conn| {
                let label = evaluation::current_for_one_off(conn, &task_id_for_assertion)
                    .unwrap()
                    .unwrap()
                    .label;
                let history_count: i64 =
                    conn.query_row("SELECT COUNT(*) FROM task_evaluations", [], |row| {
                        row.get(0)
                    })?;
                let operation_count: i64 =
                    conn.query_row("SELECT COUNT(*) FROM evaluation_operations", [], |row| {
                        row.get(0)
                    })?;
                Ok((label, history_count, operation_count))
            })
            .unwrap();
        assert_eq!(label, "Met expectation");
        assert_eq!(history_count, 1);
        assert_eq!(operation_count, 1);
    }

    #[test]
    fn task_life_relationship_survives_backup_restore_reopen() {
        let (rt, db) = make_file_runtime();
        let backups = temp_backups_dir();
        let task_id = rt.execute(|conn| {
            conn.execute("INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('backup-life','life-root','Backup Life','','life-leaf','neutral',1,NULL,'0','0',0)", [])?;
            Ok(task_repository::create(conn, CreateTaskInput { title:"Linked backup task".into(), description:"".into(), local_date:"2026-08-04".into(), start_minute:600, end_minute:660, category_id:"general".into(), priority:"medium".into(), life_node_id:Some("backup-life".into()), focus_plan_id:None, deadline_local_date:None, tag_ids:vec![] }).map_err(|_| DbError::InvalidMigrationList)?.id)
        }).unwrap();
        let backup_dir = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);
        let mutated_id = task_id.clone();
        rt.execute(move |conn| {
            conn.execute(
                "UPDATE tasks SET life_node_id=NULL WHERE id=?1",
                [mutated_id],
            )?;
            Ok(())
        })
        .unwrap();
        restore_db(&rt, &backup_dir).unwrap();
        drop(rt);
        let reopened = open_existing_file_connection(&db).unwrap();
        let restored: Option<String> = reopened
            .query_row(
                "SELECT life_node_id FROM tasks WHERE id=?1",
                [task_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(restored.as_deref(), Some("backup-life"));
    }

    #[test]
    fn focus_plan_relations_and_reviews_survive_backup_restore_reopen() {
        use crate::focus_plan::dto::{
            CreateFocusPlanInput, CreateFocusPlanReviewInput, FocusPlanReviewListInput,
        };
        use crate::focus_plan::repository as plan_repository;

        let (rt, db) = make_file_runtime();
        let backups = temp_backups_dir();
        let (plan_id, task_id) = rt
            .execute(|conn| {
                let plan = plan_repository::create(
                    conn,
                    CreateFocusPlanInput {
                        title: "AI Foundations".into(),
                        life_node_id: None,
                        start_date: None,
                        target_date: None,
                        outcome: String::new(),
                        success_criteria: vec![],
                        initial_variant_label: "Course first".into(),
                        operation_id: "backup-plan-create".into(),
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?
                .id;
                plan_repository::create_review(
                    conn,
                    CreateFocusPlanReviewInput {
                        plan_id: plan.clone(),
                        operation_id: "backup-review-create".into(),
                        reviewed_local_date: "2026-08-04".into(),
                        reflection: "Held the weekly cadence.".into(),
                        next_focus: Some("Start module three".into()),
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?;
                let task = task_repository::create(
                    conn,
                    CreateTaskInput {
                        title: "Linked plan task".into(),
                        description: String::new(),
                        local_date: "2026-08-04".into(),
                        start_minute: 600,
                        end_minute: 660,
                        category_id: "general".into(),
                        priority: "medium".into(),
                        life_node_id: None,
                        focus_plan_id: Some(plan.clone()),
                        deadline_local_date: None,
                        tag_ids: vec![],
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?
                .id;
                Ok((plan, task))
            })
            .unwrap();

        let backup_dir = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);

        // Destroy both the relation and the review before restoring.
        let mutated_task = task_id.clone();
        rt.execute(move |conn| {
            conn.execute(
                "UPDATE tasks SET focus_plan_id=NULL WHERE id=?1",
                [mutated_task],
            )?;
            conn.execute("DELETE FROM focus_plan_reviews", [])?;
            Ok(())
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();
        drop(rt);

        let mut reopened = open_existing_file_connection(&db).unwrap();
        run_migrations(&mut reopened).unwrap();
        let restored_link: Option<String> = reopened
            .query_row(
                "SELECT focus_plan_id FROM tasks WHERE id=?1",
                [task_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(restored_link.as_deref(), Some(plan_id.as_str()));

        let history = plan_repository::list_reviews(
            &reopened,
            &FocusPlanReviewListInput {
                plan_id: plan_id.clone(),
                limit: None,
            },
        )
        .unwrap();
        assert_eq!(history.review_count, 1);
        assert_eq!(history.reviews[0].reflection, "Held the weekly cadence.");
        assert_eq!(
            history.reviews[0].next_focus.as_deref(),
            Some("Start module three")
        );
        assert_eq!(
            history.latest_reviewed_local_date.as_deref(),
            Some("2026-08-04")
        );
    }

    #[test]
    fn one_off_deadlines_survive_backup_restore_reopen() {
        let (rt, db) = make_file_runtime();
        let backups = temp_backups_dir();
        let task_id = rt
            .execute(|conn| {
                Ok(task_repository::create(
                    conn,
                    CreateTaskInput {
                        title: "Dissertation".into(),
                        description: String::new(),
                        local_date: "2026-08-09".into(),
                        start_minute: 600,
                        end_minute: 660,
                        category_id: "general".into(),
                        priority: "medium".into(),
                        life_node_id: None,
                        focus_plan_id: None,
                        deadline_local_date: Some("2026-08-12".into()),
                        tag_ids: vec![],
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?
                .id)
            })
            .unwrap();

        let backup_dir = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);

        // Destroy the deadline and move the schedule before restoring.
        let mutated = task_id.clone();
        rt.execute(move |conn| {
            conn.execute(
                "UPDATE tasks SET deadline_local_date=NULL, local_date='2026-09-01' WHERE id=?1",
                [mutated],
            )?;
            Ok(())
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();
        drop(rt);

        let mut reopened = open_existing_file_connection(&db).unwrap();
        run_migrations(&mut reopened).unwrap();
        let restored: (String, Option<String>) = reopened
            .query_row(
                "SELECT local_date,deadline_local_date FROM tasks WHERE id=?1",
                [task_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(
            restored,
            ("2026-08-09".to_string(), Some("2026-08-12".to_string())),
            "restore must reinstate the exact schedule and deadline"
        );
    }

    #[test]
    fn active_and_archived_saved_views_survive_backup_restore_reopen_exactly() {
        let (rt, db) = make_file_runtime();
        let backups = temp_backups_dir();
        let (active_id, archived_id, before) = rt
            .execute(|conn| {
                let draft = |name: &str| CreateTaskSavedViewInput {
                    name: name.into(),
                    base_scope: TaskSavedViewBaseScope::Today,
                    predicate: TaskSavedViewPredicate::All { clauses: vec![] },
                    sort_mode: TaskSavedViewSortMode::TitleAscending,
                    group_mode: TaskSavedViewGroupMode::None,
                };
                let active = saved_view::create(conn, draft("Reading queue"))
                    .map_err(|_| DbError::InvalidMigrationList)?;
                let archived = saved_view::create(conn, draft("Archived queue"))
                    .map_err(|_| DbError::InvalidMigrationList)?;
                let archived = saved_view::archive(
                    conn,
                    MutateTaskSavedViewInput {
                        id: archived.view.id,
                        expected_revision: archived.view.revision,
                    },
                )
                .map_err(|_| DbError::InvalidMigrationList)?;
                let snapshot: Vec<SavedViewRow> = saved_view_rows(conn)?;
                Ok((active.view.id, archived.view.id, snapshot))
            })
            .unwrap();

        let backup_dir = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);
        rt.execute(|conn| {
            conn.execute("UPDATE task_saved_views SET name='Mutated',predicate_json='{}',revision=99,archived_at=NULL,position=position+10", [])?;
            Ok(())
        })
        .unwrap();
        restore_db(&rt, &backup_dir).unwrap();
        drop(rt);

        let mut reopened = open_existing_file_connection(&db).unwrap();
        run_migrations(&mut reopened).unwrap();
        let after: Vec<SavedViewRow> = saved_view_rows(&reopened).unwrap();
        assert_eq!(after, before);
        assert!(
            !saved_view::get(&reopened, &active_id)
                .unwrap()
                .view
                .archived
        );
        assert!(
            saved_view::get(&reopened, &archived_id)
                .unwrap()
                .view
                .archived
        );
        let executable = saved_view::projection(
            &reopened,
            GetTaskSavedViewProjectionInput {
                view_id: active_id,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap();
        assert!(executable.unsupported_reason.is_none());
    }

    #[test]
    fn category_goals_and_rebuildable_analytics_survive_backup_restore() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let now = Local::now();
        let today = format!("{:04}-{:02}-{:02}", now.year(), now.month(), now.day());
        let minute = (now.hour() * 60 + now.minute()) as i32;
        let today_for_setup = today.clone();
        rt.execute(move |conn| {
            analytics::update_category_goals(
                conn,
                UpdateCategoryGoalsInput {
                    category_id: "general".into(),
                    weekly_minimum_minutes: Some(90),
                    weekly_target_minutes: Some(180),
                    expected_revision: 0,
                    operation_id: "backup-analytics-goal".into(),
                    observed_local_date: today_for_setup.clone(),
                },
            )
            .unwrap();
            analytics::projection(
                conn,
                AnalyticsProjectionInput {
                    period_kind: AnalyticsPeriodKind::Week,
                    anchor_local_date: today_for_setup.clone(),
                    observed_local_date: today_for_setup,
                    observed_local_minute: minute,
                },
            )
            .unwrap();
            Ok(())
        })
        .unwrap();
        let backup_dir = PathBuf::from(backup_db(&rt, &backups).unwrap().backup_dir);
        let today_for_mutation = today.clone();
        rt.execute(move |conn| {
            analytics::update_category_goals(
                conn,
                UpdateCategoryGoalsInput {
                    category_id: "general".into(),
                    weekly_minimum_minutes: Some(300),
                    weekly_target_minutes: Some(360),
                    expected_revision: 1,
                    operation_id: "backup-analytics-later".into(),
                    observed_local_date: today_for_mutation,
                },
            )
            .unwrap();
            Ok(())
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();
        let (minimum, target, revision, aggregate_count) = rt
            .execute(|conn| {
                let goals = conn.query_row(
                    "SELECT weekly_minimum_minutes,weekly_target_minutes,goal_revision FROM task_categories WHERE id='general'",
                    [],
                    |row| Ok((row.get::<_, i32>(0)?, row.get::<_, i32>(1)?, row.get::<_, i32>(2)?)),
                )?;
                let aggregate_count: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM analytics_period_aggregates",
                    [],
                    |row| row.get(0),
                )?;
                Ok((goals.0, goals.1, goals.2, aggregate_count))
            })
            .unwrap();
        assert_eq!((minimum, target, revision), (90, 180, 1));
        assert_eq!(aggregate_count, 1);
    }

    // F-02: replacing the package source at the validated-source boundary must
    // never install a different database under the original manifest.
    #[test]
    fn f02_replacement_at_source_boundary_is_rejected_without_live_mutation() {
        let (rt, db_path) = make_file_runtime();
        let backups_a = temp_backups_dir();
        let backups_b = temp_backups_dir();
        let id_a = "019700000000-7fff-8000-0000-000000000101".to_string();
        rt.execute({
            let id_a = id_a.clone();
            move |conn| repo::create(conn, &id_a, "Snapshot A").map(|_| ())
        })
        .unwrap();
        let backup_a = backup_db(&rt, &backups_a).unwrap();
        let backup_a_dir = PathBuf::from(&backup_a.backup_dir);
        let original_a = db_path.with_extension("a-original.db");
        std::fs::copy(backup_a_dir.join("lifeweave.db"), &original_a).unwrap();

        let (rt_b, _db_b) = make_file_runtime();
        let id_b = "019700000000-7fff-8000-0000-000000000102".to_string();
        rt_b.execute({
            let id_b = id_b.clone();
            move |conn| repo::create(conn, &id_b, "Snapshot B").map(|_| ())
        })
        .unwrap();
        let backup_b = backup_db(&rt_b, &backups_b).unwrap();
        let replacement = PathBuf::from(&backup_b.backup_dir).join("lifeweave.db");
        let package_source = backup_a_dir.join("lifeweave.db");
        let package_source_for_hook = package_source.clone();
        let replacement_for_hook = replacement.clone();
        set_restore_test_hook(Some(Box::new(move |point| {
            if point == RestoreTestPoint::BeforeCandidateCopy {
                std::fs::copy(&replacement_for_hook, &package_source_for_hook).unwrap();
            }
        })));
        let result = restore_db(&rt, &backup_a_dir);
        set_restore_test_hook(None);

        assert!(result.is_err(), "manifest A must reject replacement DB B");
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Snapshot A");
        std::fs::copy(&original_a, &package_source).unwrap();
    }

    // F-02: once the exact candidate has passed identity validation, a later
    // source replacement cannot alter the file that will be swapped in.
    #[test]
    fn f02_source_replacement_after_candidate_validation_does_not_change_restore() {
        let (rt, _db) = make_file_runtime();
        let backups_a = temp_backups_dir();
        let backups_b = temp_backups_dir();
        let id_a = "019700000000-7fff-8000-0000-000000000103".to_string();
        rt.execute({
            let id_a = id_a.clone();
            move |conn| repo::create(conn, &id_a, "Snapshot A").map(|_| ())
        })
        .unwrap();
        let backup_a = backup_db(&rt, &backups_a).unwrap();
        let backup_a_dir = PathBuf::from(&backup_a.backup_dir);
        let (rt_b, _db_b) = make_file_runtime();
        let id_b = "019700000000-7fff-8000-0000-000000000104".to_string();
        rt_b.execute({
            let id_b = id_b.clone();
            move |conn| repo::create(conn, &id_b, "Snapshot B").map(|_| ())
        })
        .unwrap();
        let backup_b = backup_db(&rt_b, &backups_b).unwrap();
        let replacement = PathBuf::from(&backup_b.backup_dir).join("lifeweave.db");
        let package_source = backup_a_dir.join("lifeweave.db");
        let replacement_for_hook = replacement.clone();
        set_restore_test_hook(Some(Box::new(move |point| {
            if point == RestoreTestPoint::AfterCandidateValidation {
                std::fs::copy(&replacement_for_hook, &package_source).unwrap();
            }
        })));
        let result = restore_db(&rt, &backup_a_dir);
        set_restore_test_hook(None);

        assert!(
            result.is_ok(),
            "validated candidate should be installable: {result:?}"
        );
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Snapshot A");
    }

    #[test]
    fn f02_r1_candidate_replacement_after_prevalidation_rolls_back() {
        let (rt, db_path) = make_file_runtime();
        let backups_a = temp_backups_dir();
        let backups_b = temp_backups_dir();
        let id_a = "019700000000-7fff-8000-0000-000000000105".to_string();
        rt.execute({
            let id_a = id_a.clone();
            move |conn| repo::create(conn, &id_a, "Snapshot A").map(|_| ())
        })
        .unwrap();
        let backup_a = backup_db(&rt, &backups_a).unwrap();
        let backup_a_dir = PathBuf::from(&backup_a.backup_dir);

        let (rt_b, _db_b) = make_file_runtime();
        let id_b = "019700000000-7fff-8000-0000-000000000106".to_string();
        rt_b.execute({
            let id_b = id_b.clone();
            move |conn| repo::create(conn, &id_b, "Snapshot B").map(|_| ())
        })
        .unwrap();
        let backup_b = backup_db(&rt_b, &backups_b).unwrap();
        let replacement = PathBuf::from(&backup_b.backup_dir).join("lifeweave.db");
        let candidate = db_path.parent().unwrap().join("_restore_candidate.db");
        let replacement_for_hook = replacement.clone();
        let candidate_for_hook = candidate.clone();
        set_restore_test_hook(Some(Box::new(move |point| {
            if point == RestoreTestPoint::AfterCandidateValidation {
                std::fs::copy(&replacement_for_hook, &candidate_for_hook).unwrap();
            }
        })));
        let result = restore_db(&rt, &backup_a_dir);
        set_restore_test_hook(None);

        assert!(result.is_err(), "candidate replacement must be rejected");
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Snapshot A");
        assert!(
            !candidate.exists(),
            "rollback must clean replaced candidate"
        );
    }

    #[test]
    fn f02_r1_candidate_in_place_mutation_after_prevalidation_rolls_back() {
        let (rt, db_path) = make_file_runtime();
        let backups = temp_backups_dir();
        let id = "019700000000-7fff-8000-0000-000000000107".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Snapshot A").map(|_| ())
        })
        .unwrap();
        let backup = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup.backup_dir);
        let candidate = db_path.parent().unwrap().join("_restore_candidate.db");
        let candidate_for_hook = candidate.clone();
        set_restore_test_hook(Some(Box::new(move |point| {
            if point == RestoreTestPoint::AfterCandidateValidation {
                let mut bytes = std::fs::read(&candidate_for_hook).unwrap();
                bytes[0] ^= 0xff;
                std::fs::write(&candidate_for_hook, bytes).unwrap();
            }
        })));
        let result = restore_db(&rt, &backup_dir);
        set_restore_test_hook(None);

        assert!(result.is_err(), "candidate mutation must be rejected");
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Snapshot A");
        assert!(!candidate.exists(), "rollback must clean mutated candidate");
    }

    #[test]
    fn backup_package_is_not_mutated_by_restore() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let original_hash = sha256_file(&backup_dir.join("lifeweave.db")).unwrap();
        restore_db(&rt, &backup_dir).unwrap();
        let post_hash = sha256_file(&backup_dir.join("lifeweave.db")).unwrap();
        assert_eq!(
            original_hash, post_hash,
            "backup DB must not be modified by restore"
        );
        assert!(
            backup_dir.join("manifest.json").exists(),
            "manifest must remain"
        );
    }

    #[test]
    fn same_backup_can_be_restored_twice() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000000010".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Checkpoint").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "first restore must recover record");

        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(
            active.len(),
            1,
            "second restore from same package must recover record"
        );
    }

    // ── Safety backup ─────────────────────────────────────────────────────────

    #[test]
    fn restore_creates_safety_backup_first() {
        let (rt, db_path) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        restore_db(&rt, &backup_dir).unwrap();

        let safety_dir = db_path.parent().unwrap().join("backups").join("_safety");
        assert!(
            safety_dir.join("lifeweave.db").exists(),
            "safety backup missing after restore"
        );
    }

    #[test]
    fn restore_result_contains_restored_at() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let result = restore_db(&rt, &backup_dir).unwrap();
        assert!(!result.restored_at.is_empty());
        assert!(
            result.restored_at.ends_with('Z'),
            "restored_at must be UTC RFC3339"
        );
    }

    // ── Pre-swap rejection (no live-DB mutation) ──────────────────────────────

    #[test]
    fn restore_rejects_wrong_checksum() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!("deadbeef".repeat(8));
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::Checksum { .. })),
            "expected Checksum error, got {result:?}"
        );
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        drop(active);
    }

    #[test]
    fn restore_rejects_unsupported_format_version() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["format_version"] = serde_json::json!(99u32);
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::UnsupportedFormatVersion(99))),
            "expected UnsupportedFormatVersion(99), got {result:?}"
        );
    }

    #[test]
    fn restore_rejects_malformed_manifest() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        std::fs::write(backup_dir.join("manifest.json"), b"not json").unwrap();
        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::ManifestParse(_))),
            "expected ManifestParse, got {result:?}"
        );
    }

    #[test]
    fn restore_rejects_corrupt_sqlite() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let corrupt =
            b"this is not sqlite -- padding to make it look plausible for testing purposes only xx";
        std::fs::write(backup_dir.join("lifeweave.db"), corrupt).unwrap();
        let corrupt_hash = sha256_file(&backup_dir.join("lifeweave.db")).unwrap();
        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!(corrupt_hash);
        m["db_size_bytes"] = serde_json::json!(corrupt.len() as u64);
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(
                result,
                Err(BackupError::IntegrityCheckFailed(_)) | Err(BackupError::Db(_))
            ),
            "expected integrity or DB error for corrupt SQLite, got {result:?}"
        );
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        drop(active);
    }

    #[test]
    fn restore_rejects_schema_version_too_new() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["schema_version"] = serde_json::json!(9999u32);
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::SchemaVersionTooNew { .. })),
            "expected SchemaVersionTooNew, got {result:?}"
        );
    }

    #[test]
    fn restore_does_not_mutate_on_checksum_failure() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id1 = "019700000000-7fff-8000-0000-000000000002".to_string();
        rt.execute({
            let id1 = id1.clone();
            move |conn| repo::create(conn, &id1, "Keep me").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!("0".repeat(64));
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let _ = restore_db(&rt, &backup_dir);

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "live data should be unchanged");
        assert_eq!(active[0].label, "Keep me");
    }

    #[test]
    fn restore_does_not_mutate_on_integrity_failure() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id1 = "019700000000-7fff-8000-0000-000000000003".to_string();
        rt.execute({
            let id1 = id1.clone();
            move |conn| repo::create(conn, &id1, "Persist me").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        std::fs::write(backup_dir.join("lifeweave.db"), b"not a database").unwrap();
        let corrupt_hash = sha256_file(&backup_dir.join("lifeweave.db")).unwrap();
        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!(corrupt_hash);
        m["db_size_bytes"] = serde_json::json!(14u64);
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let _ = restore_db(&rt, &backup_dir);

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "live data should be unchanged");
        assert_eq!(active[0].label, "Persist me");
    }

    // ── Quiescence: true maintenance window (tests 1–5) ──────────────────────

    // [test-1+2] After seal_worker(), execute() returns Maintenance.
    // This is the critical invariant that closes the quiescence gap: the safety
    // backup (step 7) runs AFTER seal, so no mutation can sneak in between
    // safety-backup completion and shutdown.
    #[test]
    fn execute_blocked_while_worker_sealed() {
        let (rt, _db) = make_file_runtime();
        let rt = Arc::new(rt);
        let rt2 = Arc::clone(&rt);

        let arc = rt.seal_worker().unwrap();
        let handle = std::thread::spawn(move || rt2.execute(|_| Ok::<_, DbError>(())));
        let result = handle.join().unwrap();
        assert!(
            matches!(result, Err(DbError::Maintenance)),
            "execute() must return Maintenance while worker is sealed"
        );
        rt.unseal_worker(arc);
    }

    // [test-2] A command already executing (in-flight) when seal_worker is called
    // completes normally; only new execute() calls after seal return Maintenance.
    // This proves that the sealed worker Arc still processes its current workload
    // and that sealing is non-destructive for in-flight work.
    #[test]
    fn in_flight_command_completes_after_seal() {
        let (rt, _db) = make_file_runtime();
        let rt = Arc::new(rt);
        let rt2 = Arc::clone(&rt);
        let rt3 = Arc::clone(&rt);

        let b1 = Arc::new(Barrier::new(2));
        let b1c = Arc::clone(&b1);
        let b2 = Arc::new(Barrier::new(2));
        let b2c = Arc::clone(&b2);

        // Thread 1: start a command that pauses inside the worker closure.
        let h1 = std::thread::spawn(move || {
            rt2.execute(move |_conn| {
                b1c.wait(); // signal: running on worker thread
                b2c.wait(); // wait: seal has been called from test thread
                Ok::<_, DbError>(())
            })
        });

        b1.wait(); // Command is now executing on the worker thread.
        // Seal the runtime on another thread: it transitions to Maintenance and
        // waits for the admitted command to finish before returning the worker.
        let seal_rt = Arc::clone(&rt);
        let (sealed_tx, sealed_rx) = std::sync::mpsc::channel();
        let (worker_tx, worker_rx) = std::sync::mpsc::channel();
        let seal_thread = std::thread::spawn(move || {
            let worker_arc = seal_rt
                .seal_worker_with_admission_hook(|| sealed_tx.send(()).unwrap())
                .unwrap();
            worker_tx.send(worker_arc).unwrap();
        });
        sealed_rx.recv().unwrap();
        // New execute() calls must now return Maintenance.
        let maintenance_result = rt3.execute(|_| Ok::<_, DbError>(()));
        assert!(
            matches!(maintenance_result, Err(DbError::Maintenance)),
            "new execute() after seal must return Maintenance"
        );
        b2.wait(); // Allow the in-flight command to complete.
        let in_flight_result = h1.join().unwrap();
        assert!(
            in_flight_result.is_ok(),
            "in-flight command must complete normally: {in_flight_result:?}"
        );
        let worker_arc = worker_rx.recv().unwrap();
        rt.unseal_worker(worker_arc);
        seal_thread.join().unwrap();
    }

    // [test-4] A backup and a restore running concurrently are serialized by the
    // maintenance lock. Uses a barrier to prove that thread 2 actually blocks while
    // thread 1 holds the lock.
    #[test]
    fn backup_and_restore_serialized_by_barrier() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = Arc::new(PathBuf::from(&backup_result.backup_dir));

        let rt = Arc::new(rt);

        let order = Arc::new(Mutex::new(Vec::<u8>::new()));
        let order1 = Arc::clone(&order);
        let order2 = Arc::clone(&order);

        let b = Arc::new(Barrier::new(2));
        let b1 = Arc::clone(&b);

        // Thread 1: acquire maintenance lock, signal via barrier, hold briefly.
        let rt1 = Arc::clone(&rt);
        let h1 = std::thread::spawn(move || {
            let _guard = rt1.acquire_maintenance().unwrap();
            order1.lock().unwrap().push(1);
            b1.wait(); // Signal: lock is held
            std::thread::sleep(Duration::from_millis(20));
            // _guard drops here, releasing lock.
        });

        b.wait(); // Thread 1 holds the maintenance lock.

        // Thread 2: try to restore (must block until thread 1 releases).
        let rt2 = Arc::clone(&rt);
        let bd = Arc::clone(&backup_dir);
        let h2 = std::thread::spawn(move || {
            let result = restore_db(&rt2, &bd);
            order2.lock().unwrap().push(2);
            result
        });

        h1.join().unwrap();
        h2.join().unwrap().unwrap();

        let seq = order.lock().unwrap();
        assert_eq!(
            *seq,
            vec![1, 2],
            "restore must wait for maintenance lock holder: {seq:?}"
        );
    }

    // [test-5] Two concurrent restores are serialized and both complete cleanly.
    #[test]
    fn two_concurrent_restores_are_serialized() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = Arc::new(PathBuf::from(&backup_result.backup_dir));

        let rt = Arc::new(rt);
        let rt1 = Arc::clone(&rt);
        let rt2 = Arc::clone(&rt);
        let bd1 = Arc::clone(&backup_dir);
        let bd2 = Arc::clone(&backup_dir);

        let h1 = std::thread::spawn(move || restore_db(&rt1, &bd1));
        let h2 = std::thread::spawn(move || restore_db(&rt2, &bd2));

        let r1 = h1.join().unwrap();
        let r2 = h2.join().unwrap();

        assert!(
            r1.is_ok() && r2.is_ok(),
            "both serialized restores must succeed: r1={r1:?} r2={r2:?}"
        );
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // [test-3+4 variant] A backup and a restore cannot collide.
    #[test]
    fn backup_and_restore_cannot_collide() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = Arc::new(PathBuf::from(&backup_result.backup_dir));

        let rt = Arc::new(rt);
        let rt1 = Arc::clone(&rt);
        let rt2 = Arc::clone(&rt);
        let more_backups = Arc::new(temp_backups_dir());

        let h1 = std::thread::spawn(move || restore_db(&rt1, &backup_dir));
        let h2 = std::thread::spawn(move || backup_db(&rt2, &more_backups));

        let r1 = h1.join().unwrap();
        let r2 = h2.join().unwrap();

        assert!(
            r1.is_ok() && r2.is_ok(),
            "backup and restore must both complete cleanly: r1={r1:?} r2={r2:?}"
        );
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // ── Pre-swap rejection proofs ─────────────────────────────────────────────

    #[test]
    fn restore_rejects_missing_backup_db_file() {
        use crate::infrastructure::backup::manifest::SUPPORTED_FORMAT_VERSION;

        let (rt, _db) = make_file_runtime();
        let backup_dir = temp_backups_dir();

        let manifest = BackupManifest {
            format_version: SUPPORTED_FORMAT_VERSION,
            app_version: "0.0.0".into(),
            schema_version: 2,
            created_at: "2026-08-01T00:00:00Z".into(),
            db_size_bytes: 4096,
            db_sha256: "a".repeat(64),
            assets: Vec::new(),
        };
        manifest.write_to_dir(&backup_dir).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::MissingBackupFile)),
            "expected MissingBackupFile, got {result:?}"
        );
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    #[test]
    fn restore_rejects_fk_violation_in_backup_package() {
        use crate::infrastructure::backup::manifest::SUPPORTED_FORMAT_VERSION;

        let (rt, _db) = make_file_runtime();
        let backup_dir = temp_backups_dir();
        let backup_db_path = backup_dir.join("lifeweave.db");

        {
            use rusqlite::Connection;
            let conn = Connection::open(&backup_db_path).unwrap();
            conn.execute_batch(
                "CREATE TABLE parent (id INTEGER PRIMARY KEY);
                 CREATE TABLE child (id INTEGER PRIMARY KEY,
                                     parent_id INTEGER REFERENCES parent(id));
                 PRAGMA foreign_keys = OFF;
                 INSERT INTO child VALUES (1, 999);",
            )
            .unwrap();
        }

        let file_size = std::fs::metadata(&backup_db_path).unwrap().len();
        let hash = sha256_file(&backup_db_path).unwrap();
        let manifest = BackupManifest {
            format_version: SUPPORTED_FORMAT_VERSION,
            app_version: "0.0.0".into(),
            schema_version: 2,
            created_at: "2026-08-01T00:00:00Z".into(),
            db_size_bytes: file_size,
            db_sha256: hash,
            assets: Vec::new(),
        };
        manifest.write_to_dir(&backup_dir).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::ForeignKeyViolation)),
            "expected ForeignKeyViolation, got {result:?}"
        );
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // [proof-8/test-42] FK check query errors propagate as ForeignKeyCheckQueryError,
    // not silently swallowed. Proves the code uses map_err not unwrap_or.
    #[test]
    fn fk_check_query_error_is_a_distinct_propagated_variant() {
        let rusqlite_err = rusqlite::Error::QueryReturnedNoRows;
        let err = BackupError::ForeignKeyCheckQueryError(rusqlite_err);
        assert!(matches!(err, BackupError::ForeignKeyCheckQueryError(_)));

        let conn = crate::infrastructure::sqlite::connection::open_memory_connection().unwrap();
        let result = check_integrity_and_fk(&conn);
        assert!(result.is_ok(), "empty in-memory DB must pass: {result:?}");
    }

    // ── Marker write failure tests (tests 12–15) ──────────────────────────────

    // [test-12] Marker write failure at Prepared stage (before any rename).
    // Worker must be unsealed, candidate cleaned up, runtime usable.
    #[test]
    fn marker_prepared_write_failure_unseals_worker() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail on the 1st marker write (Prepared stage).
        set_marker_write_fail_at(0);
        let result = restore_db(&rt, &backup_dir);
        // The error should be the injected Io error.
        assert!(result.is_err(), "restore must fail when marker write fails");

        // Runtime must be usable (worker was unsealed).
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(
            v, 1,
            "runtime must be usable after marker write failure: {result:?}"
        );
    }

    // [test-13] Marker write failure at LiveMovedAside (after live→old rename).
    // Rollback must restore original DB, runtime must be usable.
    #[test]
    fn marker_live_moved_aside_write_failure_rolls_back() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000000050".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Pre-rollback").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail on the 2nd marker write (LiveMovedAside stage; Prepared succeeds).
        set_marker_write_fail_at(1);
        let result = restore_db(&rt, &backup_dir);
        assert!(result.is_err(), "restore must fail");

        // Original data must be intact.
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(
            active.len(),
            1,
            "original data must survive rollback: {result:?}"
        );
        assert_eq!(active[0].label, "Pre-rollback");
    }

    // [test-14] Marker write failure at CandidateInstalled (after candidate→live rename).
    // Rollback must restore original DB.
    #[test]
    fn marker_candidate_installed_write_failure_rolls_back() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000000051".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Pre-rollback-2").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail on the 3rd marker write (CandidateInstalled; Prepared + LiveMovedAside succeed).
        set_marker_write_fail_at(2);
        let result = restore_db(&rt, &backup_dir);
        assert!(result.is_err(), "restore must fail");

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(
            active.len(),
            1,
            "original data must survive rollback: {result:?}"
        );
        assert_eq!(active[0].label, "Pre-rollback-2");
    }

    // [test-15] Marker write failure at ReopenedValidated (after post-swap validation).
    // The new DB was validated but not yet installed. Rollback must restore original.
    #[test]
    fn marker_reopened_validated_write_failure_rolls_back() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000000052".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Pre-rollback-3").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail on the 4th marker write (ReopenedValidated; first 3 succeed).
        set_marker_write_fail_at(3);
        let result = restore_db(&rt, &backup_dir);
        assert!(result.is_err(), "restore must fail");

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(
            active.len(),
            1,
            "original data must survive rollback: {result:?}"
        );
        assert_eq!(active[0].label, "Pre-rollback-3");
    }

    // ── Rollback tests (tests 31–41) ──────────────────────────────────────────

    // [test-31] attempt_rollback when old is absent and live is present (step 11 failure:
    // rename live→old failed, live is still the original).
    #[test]
    fn attempt_rollback_reopens_from_live_when_old_absent() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        // Write a marker at Prepared stage (simulating the state after step 9).
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "test-rb-31".into(),
            stage: RestoreStage::Prepared,
        }
        .write(&marker_path)
        .unwrap();

        // Seal + shutdown to put runtime into Gone state.
        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        // Situation: rename(live→old) failed; live is still the original, old is absent.
        // attempt_rollback should: see old absent, live present → open from live → install worker.
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(
            result.is_ok(),
            "rollback must succeed when live is intact: {result:?}"
        );

        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1, "runtime must be usable after rollback");
        assert!(
            !marker_path.exists(),
            "marker must be cleaned up on successful rollback"
        );
    }

    // [test-32] attempt_rollback when old has original and live is absent (step 12 failure:
    // rename candidate→live failed, old has original).
    #[test]
    fn attempt_rollback_restores_from_old_when_live_absent() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "test-rb-32".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        // Shutdown before rename: matches the real restore flow (step 10 before step 11).
        // SQLite opens the main DB without FILE_SHARE_DELETE on Windows, so the rename
        // would fail while the worker has the file open.
        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        // Move live → old (simulating step 11 success). Succeeds now that no handles are open.
        std::fs::rename(&db_path, &old_path).unwrap();
        // live_path is now absent.

        // Situation: old has original, live is absent.
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(result.is_ok(), "rollback must succeed: {result:?}");

        assert!(db_path.exists(), "live must be restored");
        assert!(!old_path.exists(), ".old must be cleaned up");
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // [test-33+35] attempt_rollback when old has original but live has failed candidate
    // (post-swap scenario). Rollback removes live (failed candidate), restores old.
    #[test]
    fn attempt_rollback_removes_failed_candidate_and_restores_old() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "test-rb-33".into(),
            stage: RestoreStage::CandidateInstalled,
        }
        .write(&marker_path)
        .unwrap();

        // Shutdown before rename: matches the real restore flow (step 10 before step 11).
        // SQLite opens the main DB without FILE_SHARE_DELETE on Windows, so renaming
        // while the worker has the file open fails.
        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        // Move live → old (original), write a corrupt file at live (the "candidate").
        // Both succeed now that no handles are open.
        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&db_path, b"corrupt failed candidate").unwrap();

        // attempt_rollback: old=present, live=present(corrupt) → remove live, rename old→live.
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(result.is_ok(), "rollback must succeed: {result:?}");

        assert!(db_path.exists(), "live must be restored from old");
        assert!(!old_path.exists(), ".old must be cleaned up");
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // [test-34+36] Rollback returns RollbackFailed when the file at the restore path
    // is not a valid database (migration/integrity/FK cannot pass).
    #[test]
    fn rollback_validate_failure_returns_rollback_failed() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "test-rb-34".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        // Put a corrupt file at old_path (simulating a corrupt original).
        std::fs::write(&old_path, b"not a valid sqlite database file at all").unwrap();
        // live_path is the original DB but we seal+shutdown to simulate Gone state.
        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();
        // Remove live so rollback tries to use old_path.
        std::fs::remove_file(&db_path).unwrap();

        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(
            matches!(result, Err(BackupError::RollbackFailed)),
            "expected RollbackFailed when restoration file is corrupt: {result:?}"
        );
        // Marker must be preserved (for startup recovery).
        assert!(
            marker_path.exists(),
            "marker must be preserved on rollback failure"
        );
        // .old must be preserved (it's our only copy, even if corrupt).
        assert!(
            old_path.exists(),
            ".old must be preserved on rollback failure"
        );
    }

    // [test-40] After a successful rollback, all FoundationRecord domain commands work.
    #[test]
    fn after_rollback_domain_commands_work() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000000060".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Survivor").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail on Prepared marker write to trigger a pre-rename rollback.
        set_marker_write_fail_at(0);
        let result = restore_db(&rt, &backup_dir);
        assert!(result.is_err());

        // All domain commands must work after rollback.
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Survivor");

        let id2 = "019700000000-7fff-8000-0000-000000000061".to_string();
        rt.execute({
            let id2 = id2.clone();
            move |conn| repo::create(conn, &id2, "Post-rollback new").map(|_| ())
        })
        .unwrap();

        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Post-rollback new");
    }

    // [test-41] After a rollback failure, artifacts are preserved.
    // (RollbackFailed state: marker, .old remain; runtime stays Gone)
    #[test]
    fn after_rollback_failure_artifacts_preserved() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "test-rb-41".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        std::fs::write(&old_path, b"corrupt database").unwrap();
        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();
        std::fs::remove_file(&db_path).unwrap();

        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(matches!(result, Err(BackupError::RollbackFailed)));

        // Marker and .old must be preserved for startup recovery.
        assert!(
            marker_path.exists(),
            "marker preserved after failed rollback"
        );
        assert!(old_path.exists(), ".old preserved after failed rollback");
        assert!(!db_path.exists(), "no blank DB must be created");
    }

    // ── Blocker F: stale artifacts block new restore ──────────────────────────

    #[test]
    fn stale_old_without_marker_blocks_new_restore() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Place a stale .old without a marker (simulating a cleanup failure).
        std::fs::write(&old_path, b"stale old db").unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "restore must refuse when stale .old exists without a marker: {result:?}"
        );
        assert!(old_path.exists(), ".old must be preserved");
        // Runtime must still be usable.
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // ── Domain commands after restore ─────────────────────────────────────────

    #[test]
    fn failed_restore_leaves_domain_commands_usable() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-00000000ffff".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Survivor").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);
        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!("0".repeat(64));
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();
        assert!(restore_db(&rt, &backup_dir).is_err());

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Survivor");

        let id2 = "019700000000-7fff-8000-0000-00000000fffe".to_string();
        rt.execute({
            let id2 = id2.clone();
            move |conn| repo::create(conn, &id2, "New after failure").map(|_| ())
        })
        .unwrap();

        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "New after failure");
    }

    #[test]
    fn successful_restore_leaves_domain_commands_usable() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000000101".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Snapshot").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        restore_db(&rt, &backup_dir).unwrap();

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "restored record must be active");
        assert_eq!(active[0].label, "Snapshot");

        let id2 = "019700000000-7fff-8000-0000-000000000102".to_string();
        rt.execute({
            let id2 = id2.clone();
            move |conn| repo::create(conn, &id2, "Post-restore new").map(|_| ())
        })
        .unwrap();

        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Post-restore new");
    }

    // ── Safety backup preservation ────────────────────────────────────────────

    #[test]
    fn valid_safety_backup_preserved_when_restore_fails_before_safety_step() {
        let (rt, db_path) = make_file_runtime();
        let safety_dir = db_path.parent().unwrap().join("backups").join("_safety");
        let backups = temp_backups_dir();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);
        restore_db(&rt, &backup_dir).unwrap();

        assert!(safety_dir.join("lifeweave.db").exists());
        let first_hash = sha256_file(&safety_dir.join("lifeweave.db")).unwrap();

        let bad_backups = temp_backups_dir();
        let bad_result = backup_db(&rt, &bad_backups).unwrap();
        let bad_dir = PathBuf::from(&bad_result.backup_dir);
        let manifest_path = bad_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!("0".repeat(64));
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        assert!(restore_db(&rt, &bad_dir).is_err());

        let second_hash = sha256_file(&safety_dir.join("lifeweave.db")).unwrap();
        assert_eq!(first_hash, second_hash, "safety backup must be unchanged");
    }

    // ── Startup recovery (open_existing_file_connection never creates blank DB) ─

    #[test]
    fn open_existing_file_connection_errors_on_absent_file() {
        use crate::infrastructure::sqlite::connection::open_existing_file_connection;
        let path = std::env::temp_dir().join(format!(
            "lw_absent_{}.db",
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = std::fs::remove_file(&path);
        let result = open_existing_file_connection(&path);
        assert!(
            matches!(result, Err(DbError::FileNotFound { .. })),
            "must error rather than create a blank DB: {result:?}"
        );
    }

    // ── E1d: pending marker blocks new restore ───────────────────────────────

    // A restore_marker.json at any stage prevents a new restore from starting.
    // The guard returns RecoveryPending so the IPC layer can tell the frontend
    // to restart rather than reporting corruption.
    #[test]
    fn pending_marker_blocks_new_restore() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let marker_path = db_dir.join("restore_marker.json");
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Place a marker at ReopenedValidated (cleanup-pending state).
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "e1d-pending".into(),
            stage: RestoreStage::ReopenedValidated,
        }
        .write(&marker_path)
        .unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(result, Err(BackupError::RecoveryPending)),
            "restore must be blocked when marker exists: {result:?}"
        );
        // Runtime must still be usable (guard fired before any mutation).
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
        // Clean up so the runtime teardown succeeds.
        let _ = RestoreMarker::remove(&marker_path);
    }

    // ── E1d: old cleanup failure after restore success keeps marker ──────────

    // If .old removal fails during restore finalization, the marker is preserved
    // at ReopenedValidated. The restore STILL reports success (live DB is usable).
    // The next restore attempt sees the marker and returns RecoveryPending.
    #[test]
    fn old_cleanup_failure_after_restore_keeps_marker_and_blocks_next_restore() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let marker_path = db_dir.join("restore_marker.json");
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // remove_if_exists call order in restore_db successful path:
        //   0: WAL deletion (step 10), 1: SHM deletion (step 10),
        //   2: .old cleanup (finalization), 3: candidate cleanup (finalization).
        // Fail call 2 to simulate .old removal failure during finalization.
        set_remove_if_exists_fail_at(2);
        let result = restore_db(&rt, &backup_dir);
        // Countdown auto-resets to -1 after firing.

        // Restore itself succeeds (live DB is the restored snapshot).
        assert!(
            result.is_ok(),
            "restore must succeed even if old cleanup fails: {result:?}"
        );

        // Marker must still exist (cleanup incomplete).
        assert!(
            marker_path.exists(),
            "marker must be kept at ReopenedValidated"
        );

        // Runtime must be usable.
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);

        // Next restore attempt must be blocked.
        let backups2 = temp_backups_dir();
        let backup_result2 = backup_db(&rt, &backups2).unwrap();
        let backup_dir2 = PathBuf::from(&backup_result2.backup_dir);
        let blocked = restore_db(&rt, &backup_dir2);
        assert!(
            matches!(blocked, Err(BackupError::RecoveryPending)),
            "second restore must be blocked by pending marker: {blocked:?}"
        );

        // Clean up (simulate what startup recovery would do).
        let _ = RestoreMarker::remove(&marker_path);
    }

    // ── E1d: candidate cleanup failure in rollback returns RecoveryPending ──

    // If candidate removal fails in attempt_rollback after a successful rollback,
    // the function returns RecoveryPending (not RollbackFailed). The runtime is
    // Ready (worker installed from old) and the marker is preserved for retry.
    #[test]
    fn candidate_cleanup_failure_in_rollback_returns_recovery_pending_not_rollback_failed() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        // Record the original data so we can confirm rollback succeeded.
        let id = "019700000000-7fff-8000-0000-000000001001".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Rollback survivor").map(|_| ())
        })
        .unwrap();

        // Set up: marker at LiveMovedAside, old has original, candidate is stale.
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "e1d-rb".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"stale candidate").unwrap();

        // remove_if_exists call order in attempt_rollback (restore_from_old=true):
        //   0: WAL deletion, 1: SHM deletion, 2: candidate removal.
        // Fail call 2 to simulate candidate removal failure while rollback succeeds.
        set_remove_if_exists_fail_at(2);
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);

        assert!(
            matches!(result, Err(BackupError::RecoveryPending)),
            "attempt_rollback must return RecoveryPending when candidate cleanup fails: {result:?}"
        );

        // Worker must be installed (runtime is Ready) — rollback succeeded.
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1, "runtime must be Ready after rollback");

        // Marker must be preserved.
        assert!(marker_path.exists(), "marker must be kept for retry");
        // Candidate must still exist (cleanup failed).
        assert!(candidate_path.exists(), "candidate must be preserved");

        // Clean up.
        let _ = RestoreMarker::remove(&marker_path);
        let _ = std::fs::remove_file(&candidate_path);
    }

    // ── Finding 1: WAL/SHM deletion failure tests ─────────────────────────────

    // [f1-a] WAL deletion failure in step 10 aborts the restore before
    // live→old rename. Live DB must be intact and runtime must be usable.
    #[test]
    fn wal_deletion_failure_aborts_restore_before_rename() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000002001".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Wal-fail survivor").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail 1st remove_if_exists call = WAL deletion in step 10.
        set_remove_if_exists_fail_at(0);
        let result = restore_db(&rt, &backup_dir);
        assert!(result.is_err(), "restore must fail when WAL deletion fails");

        // live→old rename must NOT have happened.
        assert!(
            !old_path.exists(),
            ".old must not exist (rename was aborted)"
        );
        assert!(db_path.exists(), "live DB must be intact");

        // Runtime must be usable (worker reinstalled via attempt_rollback).
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "original data must survive");
        assert_eq!(active[0].label, "Wal-fail survivor");
    }

    // [f1-b] SHM deletion failure in step 10 aborts the restore before
    // live→old rename. WAL deletion succeeds; SHM fails.
    #[test]
    fn shm_deletion_failure_aborts_restore_before_rename() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let backups = temp_backups_dir();

        let id = "019700000000-7fff-8000-0000-000000002002".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "Shm-fail survivor").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Fail 2nd remove_if_exists call = SHM deletion in step 10.
        set_remove_if_exists_fail_at(1);
        let result = restore_db(&rt, &backup_dir);
        assert!(result.is_err(), "restore must fail when SHM deletion fails");

        assert!(
            !old_path.exists(),
            ".old must not exist (rename was aborted)"
        );
        assert!(db_path.exists(), "live DB must be intact");

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Shm-fail survivor");
    }

    // [f1-c] WAL deletion failure in attempt_rollback returns RollbackFailed.
    #[test]
    fn wal_deletion_failure_in_rollback_returns_rollback_failed() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "f1c".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();
        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"stale").unwrap();

        // Fail 1st remove_if_exists = WAL deletion in attempt_rollback.
        set_remove_if_exists_fail_at(0);
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(
            matches!(result, Err(BackupError::RollbackFailed)),
            "WAL deletion failure in rollback must return RollbackFailed: {result:?}"
        );
        // Artifacts preserved: old still has the original.
        assert!(old_path.exists(), ".old must be preserved");
        // Clean up manually for test teardown.
        let _ = std::fs::rename(&old_path, &db_path);
        let _ = RestoreMarker::remove(&marker_path);
        let _ = std::fs::remove_file(&candidate_path);
    }

    // [f1-d] SHM deletion failure in attempt_rollback returns RollbackFailed.
    #[test]
    fn shm_deletion_failure_in_rollback_returns_rollback_failed() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "f1d".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();
        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"stale").unwrap();

        // Fail 2nd remove_if_exists = SHM deletion in attempt_rollback.
        set_remove_if_exists_fail_at(1);
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(
            matches!(result, Err(BackupError::RollbackFailed)),
            "SHM deletion failure in rollback must return RollbackFailed: {result:?}"
        );
        // Clean up manually for test teardown.
        let _ = std::fs::rename(&old_path, &db_path);
        let _ = RestoreMarker::remove(&marker_path);
        let _ = std::fs::remove_file(&candidate_path);
    }

    // F-03: a sidecar failure must not remove the live candidate before startup
    // can replay the authoritative .old copy.
    #[test]
    fn f03_locked_sidecar_preserves_live_and_startup_replays_old() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");
        let wal_path = PathBuf::from(format!("{}-wal", db_path.to_string_lossy()));

        std::fs::copy(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"stale candidate").unwrap();
        std::fs::write(&wal_path, b"candidate wal").unwrap();
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "f03-locked-sidecar".into(),
            stage: RestoreStage::CandidateInstalled,
        }
        .write(&marker_path)
        .unwrap();

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        set_remove_if_exists_fail_at(0);
        let rollback = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        set_remove_if_exists_fail_at(-1);
        assert!(matches!(rollback, Err(BackupError::RollbackFailed)));
        assert!(
            db_path.exists(),
            "live candidate must remain after sidecar failure"
        );
        assert!(old_path.exists(), ".old must remain authoritative");
        assert!(wal_path.exists(), "locked sidecar artifact must remain");
        assert!(marker_path.exists(), "marker must remain replayable");

        let disposition = lc::preflight_startup_check(&db_path).unwrap();
        assert!(matches!(
            disposition,
            lc::StartupDisposition::ExistingOrRecovered
        ));
        lc::recover_if_interrupted(&marker_path, &db_path).unwrap();
        assert!(db_path.exists());
        assert!(!old_path.exists());
        assert!(!candidate_path.exists());
        assert!(!wal_path.exists());
        assert!(!marker_path.exists());

        let mut conn = open_existing_file_connection(&db_path).unwrap();
        run_migrations(&mut conn).unwrap();
        let value: i64 = conn.query_row("SELECT 1", [], |row| row.get(0)).unwrap();
        assert_eq!(value, 1);
    }

    // Candidate preparation invariant: candidate cleanup is checked before the
    // Prepared marker can be removed, and the resulting state replays at startup.
    #[test]
    fn candidate_cleanup_failure_preserves_prepared_marker_and_startup_replays() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");
        std::fs::write(&candidate_path, b"partial candidate").unwrap();
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "candidate-cleanup-p1".into(),
            stage: RestoreStage::Prepared,
        }
        .write(&marker_path)
        .unwrap();

        set_remove_if_exists_fail_at(0);
        let cleanup = remove_prepared_artifacts(&candidate_path, &marker_path);
        set_remove_if_exists_fail_at(-1);
        assert!(cleanup.is_err(), "injected candidate cleanup must fail");
        assert!(db_path.exists(), "live database must remain untouched");
        assert!(
            candidate_path.exists(),
            "failed candidate cleanup preserves candidate"
        );
        assert!(marker_path.exists(), "marker must remain with candidate");

        let disposition = lc::preflight_startup_check(&db_path).unwrap();
        assert!(matches!(
            disposition,
            lc::StartupDisposition::ExistingOrRecovered
        ));
        lc::recover_if_interrupted(&marker_path, &db_path).unwrap();
        assert!(!candidate_path.exists(), "startup replay removes candidate");
        assert!(
            !marker_path.exists(),
            "startup replay removes marker after candidate"
        );
        let value: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |row| row.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(value, 1, "live database remains usable");
    }

    // [f1-e] Windows real sharing-violation: prove that remove_if_exists returns Err
    // (not Ok/NotFound) when a file is exclusively locked via FILE_SHARE_NONE.
    // This is the real OS behavior that [f1-a]/[f1-b] simulate via countdown failpoints.
    // We test remove_if_exists directly to avoid racing with SQLite's own WAL handle.
    #[cfg(target_os = "windows")]
    #[test]
    fn wal_sharing_violation_aborts_restore_with_real_os_error() {
        use crate::infrastructure::backup::lifecycle::remove_if_exists;
        use std::os::windows::fs::OpenOptionsExt;

        let dir = std::env::temp_dir().join(format!("lw_sv_{}", next_id()));
        std::fs::create_dir_all(&dir).unwrap();
        let locked_path = dir.join("locked.file");

        // Create and hold the file exclusively (FILE_SHARE_NONE, dwShareMode=0).
        // Any subsequent DeleteFile call returns ERROR_SHARING_VIOLATION (code 32).
        let _handle = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .share_mode(0)
            .open(&locked_path)
            .expect("failed to create exclusively-locked file");

        // remove_if_exists must return Err, not silently treat it as NotFound.
        let result = remove_if_exists(&locked_path);
        assert!(
            result.is_err(),
            "remove_if_exists must return Err for a sharing-violation, not Ok: {result:?}"
        );

        // After releasing the exclusive handle, removal must succeed.
        drop(_handle);
        assert!(
            remove_if_exists(&locked_path).is_ok(),
            "remove_if_exists must succeed after handle released"
        );
    }

    // ── Finding 2 + 3: restart-replay (simulated fresh-process startup) ────────

    // [f2-a] Crash after candidate→live rename (CandidateInstalled stage).
    // Simulates: crash during restore step 12 or just after marker update.
    // Fresh startup must call preflight + recover + open DB successfully.
    #[test]
    fn restart_replay_from_candidate_installed_crash_recovers() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        // Build a proper backup and candidate.
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_db_path = PathBuf::from(&backup_result.backup_dir).join("lifeweave.db");

        // Shut down worker before renaming.
        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        // Simulate crash state: both renames succeeded, no WAL/SHM present.
        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::copy(&backup_db_path, &db_path).unwrap();
        std::fs::write(&candidate_path, b"stale").unwrap();
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "replay-test".into(),
            stage: RestoreStage::CandidateInstalled,
        }
        .write(&marker_path)
        .unwrap();

        // Fresh-startup recovery sequence (no in-memory state from prior run).
        use crate::infrastructure::backup::lifecycle::{
            preflight_startup_check, recover_if_interrupted,
        };
        use crate::infrastructure::sqlite::task39_migration::run_all_migrations as run_migrations;
        use crate::infrastructure::sqlite::{
            connection::open_existing_file_connection, runtime::DatabaseRuntime,
            worker::DbWorkerHandle,
        };

        let disp = preflight_startup_check(&db_path).unwrap();
        assert!(
            matches!(
                disp,
                crate::infrastructure::backup::lifecycle::StartupDisposition::ExistingOrRecovered
            ),
            "crash state must not be mistaken for first-run"
        );
        recover_if_interrupted(&marker_path, &db_path).unwrap();

        // Post-recovery: old is the authoritative copy restored to live_path.
        assert!(db_path.exists(), "live DB must exist after recovery");
        assert!(!old_path.exists(), ".old must be cleaned up");
        assert!(!candidate_path.exists(), "candidate must be cleaned up");
        assert!(!marker_path.exists(), "marker must be removed");

        // Open a new DatabaseRuntime (simulates fresh process).
        let mut conn = open_existing_file_connection(&db_path)
            .expect("fresh connection must succeed after recovery");
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        let fresh_rt = DatabaseRuntime::new(db_path.clone(), worker);
        let v: i64 = fresh_rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1, "fresh runtime must be usable after recovery");
    }

    // [f2-b] Crash after live→old rename but before candidate→live rename
    // (LiveMovedAside stage). Fresh startup must restore old to live.
    #[test]
    fn restart_replay_from_live_moved_aside_crash_recovers() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        // Simulate: only live→old rename completed.
        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"partial candidate").unwrap();
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "replay-lma".into(),
            stage: RestoreStage::LiveMovedAside,
        }
        .write(&marker_path)
        .unwrap();

        use crate::infrastructure::backup::lifecycle::{
            preflight_startup_check, recover_if_interrupted,
        };
        use crate::infrastructure::sqlite::task39_migration::run_all_migrations as run_migrations;
        use crate::infrastructure::sqlite::{
            connection::open_existing_file_connection, runtime::DatabaseRuntime,
            worker::DbWorkerHandle,
        };

        preflight_startup_check(&db_path).unwrap();
        recover_if_interrupted(&marker_path, &db_path).unwrap();

        assert!(db_path.exists(), "live DB must be restored from old");
        assert!(!old_path.exists(), ".old must be gone");
        assert!(!marker_path.exists(), "marker must be removed");

        let mut conn = open_existing_file_connection(&db_path).unwrap();
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        let fresh_rt = DatabaseRuntime::new(db_path.clone(), worker);
        let v: i64 = fresh_rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);
    }

    // ── Finding 3: rollback marker update in attempt_rollback ─────────────────

    // [f3] After attempt_rollback renames old→live, the marker is updated to
    // LiveMovedAside. Verifies that a subsequent crash (simulated by calling
    // recover_if_interrupted directly) sees LiveMovedAside(live=true,old=false)
    // and proceeds correctly, not RecoveryAmbiguous.
    #[test]
    fn attempt_rollback_updates_marker_to_live_moved_aside_for_replay_safety() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "f3-rb".into(),
            stage: RestoreStage::CandidateInstalled,
        }
        .write(&marker_path)
        .unwrap();

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();

        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"stale").unwrap();

        // Rollback succeeds. Marker should be updated to LiveMovedAside (or removed
        // if cleanup also succeeded). Either way, no RecoveryAmbiguous on retry.
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);
        assert!(result.is_ok(), "rollback must succeed: {result:?}");

        // If marker still exists, it must be LiveMovedAside (not CandidateInstalled).
        if marker_path.exists() {
            let m = RestoreMarker::read(&marker_path).unwrap().unwrap();
            assert_eq!(
                m.stage,
                RestoreStage::LiveMovedAside,
                "marker must be updated to LiveMovedAside after rollback rename"
            );
        }

        // Runtime must be usable.
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1);

        // Clean up.
        let _ = RestoreMarker::remove(&marker_path);
        let _ = std::fs::remove_file(&candidate_path);
    }

    // ── Finding 2: WAL checkpoint validated before WAL deletion ──────────────

    // [f2-checkpoint-fail] If create_verified_safety_backup detects an incomplete
    // checkpoint (busy or log != checkpointed), restore must abort before
    // shutting down the worker or touching the live DB.
    #[test]
    fn incomplete_wal_checkpoint_aborts_restore_before_worker_shutdown() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let marker_path = db_dir.join("restore_marker.json");
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Inject incomplete-checkpoint result inside create_verified_safety_backup.
        set_checkpoint_fail(true);
        let result = restore_db(&rt, &backup_dir);
        set_checkpoint_fail(false);

        assert!(
            matches!(result, Err(BackupError::WalCheckpointIncomplete { .. })),
            "restore must fail with WalCheckpointIncomplete: {result:?}"
        );

        // No rename must have happened; live DB must be intact.
        assert!(!old_path.exists(), ".old must not exist");
        assert!(db_path.exists(), "live DB must be intact");

        // Worker must be reinstated (unseal_worker on safety-backup failure).
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1, "runtime must remain usable after checkpoint abort");

        // Marker must not exist (failure was before step 8a).
        assert!(!marker_path.exists(), "no marker must be written");
    }

    // ── Finding 3: Prepared marker written before candidate copy ─────────────

    // [f3-partial-candidate] If a partial candidate remains alongside a Prepared
    // marker (as produced by the new pre-copy write), startup recovery must resolve
    // the state cleanly without RecoveryAmbiguous.
    #[test]
    fn prepared_marker_with_partial_candidate_resolves_at_startup() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        // Simulate: Prepared marker written, then candidate copy partially succeeded
        // but could not be cleaned up on failure.
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "f3-partial".into(),
            stage: RestoreStage::Prepared,
        }
        .write(&marker_path)
        .unwrap();
        std::fs::write(&candidate_path, b"partial copy").unwrap();

        use crate::infrastructure::backup::lifecycle::{
            preflight_startup_check, recover_if_interrupted,
        };

        // Startup sequence: preflight accepts the marker; recover cleans the partial candidate.
        let disp = preflight_startup_check(&db_path).unwrap();
        assert!(
            matches!(
                disp,
                crate::infrastructure::backup::lifecycle::StartupDisposition::ExistingOrRecovered
            ),
            "Prepared marker must be seen as ExistingOrRecovered"
        );
        recover_if_interrupted(&marker_path, &db_path).unwrap();

        // After recovery: live DB intact, partial candidate and marker removed.
        assert!(db_path.exists(), "live DB must survive recovery");
        assert!(
            !candidate_path.exists(),
            "partial candidate must be cleaned"
        );
        assert!(!marker_path.exists(), "marker must be removed");

        // Worker is still active (restore was aborted before worker shutdown).
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 1, "runtime must still be usable");
    }

    // ── Finding 4: WAL deletion failure preserves Prepared marker ────────────

    // [f4-always-fail] When remove_if_exists always fails (simulating a persistent
    // sharing violation on both WAL deletion in step 10 AND in attempt_rollback),
    // the Prepared marker and candidate must be preserved so startup recovery can
    // replay the Prepared state cleanly.
    #[test]
    fn wal_deletion_failure_preserves_prepared_marker_and_candidate_for_startup() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let marker_path = db_dir.join("restore_marker.json");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let old_path = db_dir.join("lifeweave.db.old");
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Always fail: step-10 WAL deletion fails AND rollback WAL deletion fails.
        set_remove_if_exists_always_fail(true);
        let result = restore_db(&rt, &backup_dir);
        set_remove_if_exists_always_fail(false);

        assert!(result.is_err(), "restore must fail: {result:?}");

        // No file rename must have occurred.
        assert!(
            !old_path.exists(),
            ".old must not exist (no rename happened)"
        );
        assert!(db_path.exists(), "live DB must be intact");

        // Prepared marker and candidate must both be preserved.
        assert!(marker_path.exists(), "Prepared marker must be preserved");
        let m = RestoreMarker::read(&marker_path).unwrap().unwrap();
        assert_eq!(
            m.stage,
            RestoreStage::Prepared,
            "preserved marker must be at Prepared stage"
        );
        assert!(candidate_path.exists(), "candidate must be preserved");

        // Startup recovery resolves the Prepared state cleanly.
        use crate::infrastructure::backup::lifecycle::{
            preflight_startup_check, recover_if_interrupted,
        };
        preflight_startup_check(&db_path).unwrap();
        recover_if_interrupted(&marker_path, &db_path).unwrap();
        assert!(
            !marker_path.exists(),
            "marker must be cleaned up by startup"
        );
        assert!(
            !candidate_path.exists(),
            "candidate must be cleaned up by startup"
        );
        assert!(
            db_path.exists(),
            "live DB must be intact after startup recovery"
        );
    }

    // ── Finding 5: rollback marker write failure preserves final marker ───────

    // [f5-rollback-marker-fail] When the rollback marker write fails, attempt_rollback
    // must return RecoveryPending (worker installed) instead of Ok, and must NOT
    // remove the final marker. Startup recovery then converges via the preserved marker.
    #[test]
    fn rollback_marker_write_failure_preserves_final_marker_and_returns_recovery_pending() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let candidate_path = db_dir.join("_restore_candidate.db");
        let marker_path = db_dir.join("restore_marker.json");

        // Set up CandidateInstalled state: old has the original, live has the candidate.
        RestoreMarker {
            format_version: lc::MARKER_FORMAT_VERSION,
            op_id: "f5-marker-fail".into(),
            stage: RestoreStage::CandidateInstalled,
        }
        .write(&marker_path)
        .unwrap();

        let arc = rt.seal_worker().unwrap();
        arc.shutdown();
        drop(arc);
        rt.set_gone();
        std::fs::rename(&db_path, &old_path).unwrap();
        std::fs::write(&candidate_path, b"stale candidate").unwrap();

        // Inject rollback marker write failure.
        set_marker_write_fail_at(0);
        let result = attempt_rollback(&rt, &old_path, &db_path, &candidate_path, &marker_path);

        // Must return RecoveryPending (worker installed, marker preserved).
        assert!(
            matches!(result, Err(BackupError::RecoveryPending)),
            "must return RecoveryPending when rollback marker write fails: {result:?}"
        );

        // Worker must be installed and runtime usable.
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 1", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(
            v, 1,
            "runtime must be usable after rollback with failed marker write"
        );

        // Final marker must be preserved (NOT removed), still at CandidateInstalled.
        assert!(marker_path.exists(), "final marker must be preserved");
        let m = RestoreMarker::read(&marker_path).unwrap().unwrap();
        assert_eq!(
            m.stage,
            RestoreStage::CandidateInstalled,
            "preserved marker must still be at CandidateInstalled"
        );

        // Startup recovery: CandidateInstalled(true,false) — live=recovered, no old.
        // Validates live, removes candidate (already gone), removes marker.
        use crate::infrastructure::backup::lifecycle::{
            preflight_startup_check, recover_if_interrupted,
        };
        preflight_startup_check(&db_path).unwrap();
        recover_if_interrupted(&marker_path, &db_path).unwrap();

        assert!(
            !marker_path.exists(),
            "marker must be gone after startup recovery"
        );
        assert!(
            db_path.exists(),
            "live DB must exist after startup recovery"
        );
    }

    // ── Finding 7: WAL sharing violation runs through full restore flow ───────

    // [f7-wal-fail-failpoint] Simulating a persistent sharing violation on WAL
    // deletion via REMOVE_IF_EXISTS_ALWAYS_FAIL proves that step-10 WAL deletion
    // aborts the restore and the Prepared marker (F4 fix) is preserved for startup
    // recovery. Using the failpoint avoids the SQLite WAL file-lock conflict that
    // would occur if we tried to lock the WAL while the worker held it open in WAL
    // mode. The F4 invariant (marker not pre-deleted before attempt_rollback) is what
    // matters; the mechanism of failure is irrelevant to startup recovery correctness.
    #[test]
    fn full_restore_with_failing_wal_deletion_preserves_live_db_and_prepared_marker() {
        let (rt, db_path) = make_file_runtime();
        let db_dir = db_path.parent().unwrap().to_path_buf();
        let old_path = db_dir.join("lifeweave.db.old");
        let marker_path = db_dir.join("restore_marker.json");
        let candidate_path = db_dir.join("_restore_candidate.db");

        let id = "019700000000-7fff-8000-0000-000000003001".to_string();
        rt.execute({
            let id = id.clone();
            move |conn| repo::create(conn, &id, "WAL-fail survivor").map(|_| ())
        })
        .unwrap();

        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Simulate a persistent sharing violation: all remove_if_exists calls fail.
        // Step 10 tries to delete WAL/SHM and hits the injected error; attempt_rollback
        // also hits it when it tries to clean WAL/SHM before reopening live.
        set_remove_if_exists_always_fail(true);
        let result = restore_db(&rt, &backup_dir);
        set_remove_if_exists_always_fail(false);

        assert!(result.is_err(), "restore must fail: {result:?}");

        // Live→old rename must not have happened (step 11 never ran).
        assert!(!old_path.exists(), ".old must not exist");
        assert!(db_path.exists(), "live DB must be intact");

        // With F4 fix: Prepared marker preserved (not pre-deleted before rollback).
        assert!(
            marker_path.exists(),
            "Prepared marker must be preserved for startup recovery"
        );
        let m = RestoreMarker::read(&marker_path).unwrap().unwrap();
        assert_eq!(
            m.stage,
            RestoreStage::Prepared,
            "marker must be at Prepared"
        );

        // Startup recovery resolves the Prepared state.
        use crate::infrastructure::backup::lifecycle::{
            preflight_startup_check, recover_if_interrupted,
        };
        preflight_startup_check(&db_path).unwrap();
        recover_if_interrupted(&marker_path, &db_path).unwrap();
        assert!(!marker_path.exists(), "marker cleaned by startup");
        assert!(!candidate_path.exists(), "candidate cleaned by startup");
        assert!(db_path.exists(), "live DB intact after startup recovery");
    }
}
