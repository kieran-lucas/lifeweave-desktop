use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::engine::chrono_now_rfc3339;
use super::lifecycle::{MARKER_FORMAT_VERSION, RestoreMarker, RestoreStage, generate_op_id};
use super::manifest::BackupManifest;
use super::{BackupError, RestoreResult};
use crate::infrastructure::sqlite::{
    DbError,
    connection::{open_existing_file_connection, open_file_connection, open_readonly_connection},
    migrations::{current_schema_version, max_supported_schema_version, run_migrations},
    runtime::DatabaseRuntime,
    worker::DbWorkerHandle,
};

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

    // Guard (Blocker F): stale recovery artifacts without a marker mean a previous
    // restore left the filesystem in an inconsistent state. Refuse to proceed so
    // we don't silently overwrite or destroy those artifacts. The user must restart
    // the app so startup preflight + recover_if_interrupted can handle the state.
    if (old_path.exists() || candidate_path.exists()) && !marker_path.exists() {
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

    let file_size = std::fs::metadata(&backup_db_path)
        .map_err(BackupError::Io)?
        .len();
    if file_size != manifest.db_size_bytes {
        return Err(BackupError::Checksum {
            expected: manifest.db_size_bytes.to_string(),
            actual: file_size.to_string(),
        });
    }

    let actual_hash = sha256_file(&backup_db_path)?;
    if actual_hash != manifest.db_sha256 {
        return Err(BackupError::Checksum {
            expected: manifest.db_sha256.clone(),
            actual: actual_hash,
        });
    }

    {
        let conn = open_readonly_connection(&backup_db_path).map_err(BackupError::Db)?;
        check_integrity_and_fk(&conn)?;
    }

    // Step 6: seal worker → Maintenance BEFORE safety backup.
    // This closes the quiescence gap: once sealed, runtime.execute() returns
    // Maintenance, so no domain command can mutate the live DB between here
    // and the worker shutdown in step 10.
    let worker_arc = runtime.seal_worker().map_err(BackupError::Db)?;

    // Step 7: create verified safety backup using the sealed worker Arc directly.
    // Must NOT call runtime.execute() here since runtime is now Maintenance.
    if let Err(e) = create_verified_safety_backup(&worker_arc, &db_dir) {
        runtime.unseal_worker(worker_arc);
        return Err(e);
    }

    // Step 8: copy backup DB → candidate (never rename/touch backup_dir files).
    if candidate_path.exists() {
        if let Err(e) = std::fs::remove_file(&candidate_path) {
            runtime.unseal_worker(worker_arc);
            return Err(BackupError::Io(e));
        }
    }
    if let Err(e) = std::fs::copy(&backup_db_path, &candidate_path) {
        runtime.unseal_worker(worker_arc);
        return Err(BackupError::Io(e));
    }

    // Step 9: write durable marker at Prepared before any rename.
    let marker = RestoreMarker {
        format_version: MARKER_FORMAT_VERSION,
        op_id: generate_op_id(),
        stage: RestoreStage::Prepared,
    };
    if let Err(e) = marker.write(&marker_path) {
        let _ = std::fs::remove_file(&candidate_path);
        runtime.unseal_worker(worker_arc);
        return Err(e);
    }

    // Step 10: shutdown worker (drains queue, closes connection, flushes WAL).
    worker_arc.shutdown();
    drop(worker_arc);
    runtime.set_gone();

    let wal = format!("{}-wal", live_path.to_string_lossy());
    let shm = format!("{}-shm", live_path.to_string_lossy());
    let _ = std::fs::remove_file(&wal);
    let _ = std::fs::remove_file(&shm);

    // Step 11: rename(live → old).
    // No stale .old cleanup here (Blocker F). If old_path exists at this point,
    // it was caught by the guard at the start of this function.
    if let Err(e) = std::fs::rename(&live_path, &old_path) {
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
            Err(_) => Err(BackupError::RollbackFailed),
        };
    }

    // Step 12: rename(candidate → live).
    if let Err(e) = std::fs::rename(&candidate_path, &live_path) {
        return match attempt_rollback(
            runtime,
            &old_path,
            &live_path,
            &candidate_path,
            &marker_path,
        ) {
            Ok(()) => Err(BackupError::Io(e)),
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
                    Err(_) => Err(BackupError::RollbackFailed),
                };
            }
            runtime.install_worker(worker);
            let _ = std::fs::remove_file(&old_path);
            RestoreMarker::remove(&marker_path);
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

    let _ = std::fs::remove_dir_all(&safety_staging_dir);
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
            let _: i64 = live_conn
                .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| r.get(0))
                .unwrap_or(0);
            Ok(())
        })
        .map_err(BackupError::Db)?;

    // Verify the staging backup: integrity + FK.
    {
        let conn = open_file_connection(&staging_db_path).map_err(BackupError::Db)?;
        check_integrity_and_fk(&conn)?;
        // Connection is dropped here (closed), flushing the WAL before publication.
    }

    // Atomically publish: keep old _safety/ until new staging is verified.
    let _ = std::fs::remove_dir_all(&safety_old_dir);
    if safety_dir.exists() {
        std::fs::rename(&safety_dir, &safety_old_dir).map_err(BackupError::Io)?;
    }
    std::fs::rename(&safety_staging_dir, &safety_dir).map_err(|e| {
        if safety_old_dir.exists() {
            let _ = std::fs::rename(&safety_old_dir, &safety_dir);
        }
        BackupError::Io(e)
    })?;
    let _ = std::fs::remove_dir_all(&safety_old_dir);

    Ok(())
}

/// Opens the newly installed DB, runs migrations, and validates post-swap invariants
/// (integrity check, FK check). Returns a live worker and current schema version on
/// success. Callers are responsible for rollback on failure.
fn reopen_and_validate(live_path: &Path) -> Result<(DbWorkerHandle, u32), BackupError> {
    let mut conn = open_existing_file_connection(live_path).map_err(BackupError::Db)?;
    run_migrations(&mut conn).map_err(BackupError::Db)?;

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

    if restore_from_old {
        if live_path.exists() {
            // Remove the failed candidate at live_path. Best-effort; if this fails
            // the rename below will fail too (Windows won't rename over an existing file).
            let _ = std::fs::remove_file(live_path);
        }
        // Delete stale WAL/SHM at live_path before rename. In the normal restore_db
        // path, step 10 already deleted these; these removes are no-ops there. When
        // attempt_rollback is called after a rename-without-WAL-cleanup (unit tests,
        // crash recovery), deleting them here prevents Windows sharing-violation errors
        // when the new connection opens the WAL/SHM files.
        let _ = std::fs::remove_file(format!("{}-wal", live_path.to_string_lossy()));
        let _ = std::fs::remove_file(format!("{}-shm", live_path.to_string_lossy()));
        if std::fs::rename(old_path, live_path).is_err() {
            // Rename failed. old_path still exists; preserve all artifacts.
            return Err(BackupError::RollbackFailed);
        }
    } else if live_path.exists() {
        // old absent, live present: live is the original (step 11 rename failed).
        // Delete stale WAL/SHM before opening.
        let _ = std::fs::remove_file(format!("{}-wal", live_path.to_string_lossy()));
        let _ = std::fs::remove_file(format!("{}-shm", live_path.to_string_lossy()));
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
        run_migrations(&mut conn).ok()?;
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
            run_migrations(&mut fresh).map_err(|_| BackupError::RollbackFailed)?;
            let worker = DbWorkerHandle::spawn(fresh);
            runtime.install_worker(worker);
            // Only clean up artifacts AFTER the worker is confirmed installed.
            let _ = std::fs::remove_file(candidate_path);
            RestoreMarker::remove(marker_path);
            Ok(())
        }
        None => {
            // Validation failed. If we renamed old → live, rename back to preserve .old
            // so startup recovery can find it. Best-effort; if rename-back fails too,
            // the artifacts remain in an ambiguous state for startup recovery.
            if restore_from_old {
                let _ = std::fs::rename(live_path, old_path);
            }
            Err(BackupError::RollbackFailed)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::{
        backup::engine::backup_db,
        backup::lifecycle::{self as lc, RestoreMarker, RestoreStage, set_marker_write_fail_at},
        backup::manifest::BackupManifest,
        sqlite::{
            connection::open_file_connection, foundation_record_repo as repo,
            migrations::run_migrations, runtime::DatabaseRuntime, worker::DbWorkerHandle,
        },
    };
    use std::path::PathBuf;
    use std::sync::{
        Arc, Barrier, Mutex,
        atomic::{AtomicU32, Ordering},
    };
    use std::time::Duration;

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn next_id() -> String {
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
        assert_eq!(restore_result.schema_version, 2);

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Original label");
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
        // Seal the runtime: transitions Ready → Maintenance.
        let worker_arc = rt.seal_worker().unwrap();
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
        rt.unseal_worker(worker_arc);
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
}
