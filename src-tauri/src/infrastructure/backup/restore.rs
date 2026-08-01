use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::engine::chrono_now_rfc3339;
use super::lifecycle::{RestoreMarker, RestoreStage};
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
///  2. Read + validate manifest: format_version, schema_version.
///  3. Check backup file exists, size matches manifest, SHA-256 matches manifest.
///  4. Integrity + FK checks on backup file (read-only; no mutation).
///  5. Create verified safety backup (staged, integrity-checked, atomically published).
///  6. Seal worker → Maintenance (blocks new execute() calls).
///  7. Copy backup DB → candidate path (never rename backup_dir files).
///     On failure: unseal worker; return error.
///  8. Write durable marker at `Prepared` stage.
///     On failure: delete candidate; unseal worker; return error.
///  9. Shutdown worker; set Gone; delete WAL/SHM side files.
/// 10. rename(live → old); update marker to `LiveMovedAside`.
///     On failure: delete candidate; remove marker; reopen worker from live; return error.
/// 11. rename(candidate → live); update marker to `CandidateInstalled`.
///     On failure: rename(old → live); remove marker; reopen worker; return error.
/// 12. Reopen + migrate + post-swap validation (integrity, FK, PRAGMAs).
///     On failure: remove live (failed candidate); rename(old → live); remove marker;
///     reopen worker from live; return error.
/// 13. Update marker to `ReopenedValidated`; install worker.
/// 14. Delete old; remove marker; return RestoreResult.
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

    // Steps 2–4: read-only validation; live DB is not touched.
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

    // Step 5: create verified safety backup before sealing the worker.
    create_verified_safety_backup(runtime, &db_dir)?;

    // Step 6: seal worker → Maintenance.
    // No execute() can mutate the live DB between here and shutdown.
    let worker_arc = runtime.seal_worker().map_err(BackupError::Db)?;

    // Step 7: copy backup DB → candidate (never touch backup_dir files).
    let _ = std::fs::remove_file(&candidate_path);
    if let Err(e) = std::fs::copy(&backup_db_path, &candidate_path) {
        runtime.unseal_worker(worker_arc);
        return Err(BackupError::Io(e));
    }

    // Step 8: write durable marker at Prepared before any rename.
    let marker = RestoreMarker {
        stage: RestoreStage::Prepared,
        live_path: live_path.to_string_lossy().into_owned(),
        old_path: old_path.to_string_lossy().into_owned(),
        candidate_path: candidate_path.to_string_lossy().into_owned(),
    };
    if let Err(e) = marker.write(&marker_path) {
        let _ = std::fs::remove_file(&candidate_path);
        runtime.unseal_worker(worker_arc);
        return Err(e);
    }

    // Step 9: shutdown worker (drains queue, closes connection, flushes WAL).
    worker_arc.shutdown();
    drop(worker_arc);
    runtime.set_gone();

    let wal = PathBuf::from(format!("{}-wal", live_path.to_string_lossy()));
    let shm = PathBuf::from(format!("{}-shm", live_path.to_string_lossy()));
    let _ = std::fs::remove_file(&wal);
    let _ = std::fs::remove_file(&shm);

    // Clean up any leftover .old from a previous interrupted restore.
    let _ = std::fs::remove_file(&old_path);

    // Step 10: rename(live → old).
    if let Err(e) = std::fs::rename(&live_path, &old_path) {
        let _ = std::fs::remove_file(&candidate_path);
        RestoreMarker::remove(&marker_path);
        reopen_worker(runtime, &live_path);
        return Err(BackupError::Io(e));
    }
    let _ = marker
        .with_stage(RestoreStage::LiveMovedAside)
        .write(&marker_path);

    // Step 11: rename(candidate → live).
    if let Err(e) = std::fs::rename(&candidate_path, &live_path) {
        let _ = std::fs::rename(&old_path, &live_path);
        RestoreMarker::remove(&marker_path);
        reopen_worker(runtime, &live_path);
        return Err(BackupError::Io(e));
    }
    let _ = marker
        .with_stage(RestoreStage::CandidateInstalled)
        .write(&marker_path);

    // Step 12–13: open new connection, migrate, post-swap validation.
    match reopen_and_validate(&live_path) {
        Ok((worker, schema_version)) => {
            let _ = marker
                .with_stage(RestoreStage::ReopenedValidated)
                .write(&marker_path);
            runtime.install_worker(worker);
            let _ = std::fs::remove_file(&old_path);
            RestoreMarker::remove(&marker_path);
            Ok(RestoreResult {
                restored_at: chrono_now_rfc3339(),
                schema_version,
            })
        }
        Err(e) => {
            let _ = std::fs::remove_file(&live_path);
            if old_path.exists() {
                let _ = std::fs::rename(&old_path, &live_path);
            }
            RestoreMarker::remove(&marker_path);
            reopen_worker(runtime, &live_path);
            Err(e)
        }
    }
}

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

/// Creates a safety backup of the live DB, verifies its integrity, then
/// atomically publishes it. The previous `_safety/` directory is kept as
/// `_safety_old/` until the new backup is verified so a verification failure
/// leaves the prior valid safety copy intact.
fn create_verified_safety_backup(
    runtime: &DatabaseRuntime,
    db_dir: &Path,
) -> Result<(), BackupError> {
    let safety_dir = db_dir.join("backups").join("_safety");
    let safety_staging_dir = db_dir.join("backups").join("_safety_staging");
    let safety_old_dir = db_dir.join("backups").join("_safety_old");

    let _ = std::fs::remove_dir_all(&safety_staging_dir);
    std::fs::create_dir_all(&safety_staging_dir).map_err(BackupError::Io)?;

    let staging_db_path = safety_staging_dir.join("lifeweave.db");
    let staging_db_clone = staging_db_path.clone();

    runtime
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

    {
        let conn = open_file_connection(&staging_db_path).map_err(BackupError::Db)?;
        let ic: String = conn
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))
            .map_err(|e| BackupError::Db(DbError::Rusqlite(e)))?;
        if ic != "ok" {
            let _ = std::fs::remove_dir_all(&safety_staging_dir);
            return Err(BackupError::IntegrityCheckFailed(ic));
        }
    }

    // Keep old _safety/ as _safety_old/ until new staging is ready.
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
/// (WAL mode, FK pragma, integrity check, FK check). Returns a live worker on success.
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

/// Attempts to reopen a worker from `path` and install it in the runtime.
///
/// If reopening fails (e.g. file absent), the runtime stays in `Gone` state.
/// Callers in the restore rollback path document this as "safety backup only"
/// — the user must restore from `_safety/` manually.
fn reopen_worker(runtime: &DatabaseRuntime, path: &Path) {
    if let Ok(mut conn) = open_existing_file_connection(path) {
        let _ = run_migrations(&mut conn);
        runtime.install_worker(DbWorkerHandle::spawn(conn));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::{
        backup::engine::backup_db,
        sqlite::{
            connection::open_file_connection, foundation_record_repo as repo,
            migrations::run_migrations, runtime::DatabaseRuntime, worker::DbWorkerHandle,
        },
    };
    use std::sync::atomic::{AtomicU32, Ordering};

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
        // Each test gets its own subdirectory so safety-backup paths
        // (_safety/, _safety_staging/) don't collide across parallel tests.
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

        // Mutate after backup.
        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        // First restore.
        restore_db(&rt, &backup_dir).unwrap();
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "first restore must recover record");

        // Mutate again.
        rt.execute({
            let id = id.clone();
            move |conn| {
                repo::archive(conn, &id, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        // Second restore from same package.
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

        // Write corrupt bytes and update both hash and size in manifest so the file-size
        // and checksum guards pass, leaving integrity_check to catch the corruption.
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
}
