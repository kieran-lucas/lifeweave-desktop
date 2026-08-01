use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::engine::chrono_now_rfc3339;
use super::manifest::BackupManifest;
use super::{BackupError, RestoreResult};
use crate::infrastructure::sqlite::{
    connection::open_file_connection, migrations::run_migrations, runtime::DatabaseRuntime,
    worker::DbWorkerHandle,
};

/// Restores the database from a backup package at `backup_dir`.
///
/// Steps (all pre-swap steps are read-only; live DB is untouched until step 5):
/// 1. Read + validate manifest (format_version check)
/// 2. Verify checksum: sha256(backup_dir/lifeweave.db) == manifest.db_sha256
/// 3. Open staging connection; run integrity_check + foreign_key_check; close
/// 4. Create pre-restore safety backup (live DB → _safety/)
/// 5. Shutdown worker (closes live DB connection; WAL checkpointed)
/// 6. Delete .db-wal and .db-shm side files (best-effort)
/// 7. File swap: rename(live → .old), rename(backup → live)
///    → on failure: rename(.old → live), reopen worker, return Storage error
/// 8. Open new connection + run_migrations (no-op if schema matches) + spawn worker
/// 9. Delete .old file (best-effort cleanup)
/// 10. Return RestoreResult
pub fn restore_db(
    runtime: &DatabaseRuntime,
    backup_dir: &Path,
) -> Result<RestoreResult, BackupError> {
    // Step 1: Inspect manifest without mutation.
    let manifest = BackupManifest::read_from_dir(backup_dir)?;

    // Step 2: Verify checksum.
    let backup_db_path = backup_dir.join("lifeweave.db");
    let actual_hash = sha256_file(&backup_db_path)?;
    if actual_hash != manifest.db_sha256 {
        return Err(BackupError::Checksum {
            expected: manifest.db_sha256.clone(),
            actual: actual_hash,
        });
    }

    // Step 3: SQLite integrity and FK checks on backup file.
    {
        let conn = open_file_connection(&backup_db_path).map_err(BackupError::Db)?;
        let ic: String = conn
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))
            .map_err(|e| BackupError::Db(crate::infrastructure::sqlite::DbError::Rusqlite(e)))?;
        if ic != "ok" {
            return Err(BackupError::IntegrityCheckFailed(ic));
        }
        let fk_violations: i64 = conn
            .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check()", [], |r| {
                r.get(0)
            })
            .unwrap_or(0);
        if fk_violations > 0 {
            return Err(BackupError::ForeignKeyViolation);
        }
    }

    // Step 4: Create pre-restore safety backup.
    let live_path = runtime.db_path().to_path_buf();
    let safety_dir = live_path
        .parent()
        .unwrap_or(Path::new("."))
        .join("backups")
        .join("_safety");
    // Remove previous safety backup if it exists.
    let _ = std::fs::remove_dir_all(&safety_dir);
    std::fs::create_dir_all(&safety_dir).map_err(BackupError::Io)?;
    let safety_db_path = safety_dir.join("lifeweave.db");
    let safety_db_path_clone = safety_db_path.clone();
    runtime
        .execute(move |live_conn| {
            let mut dst = Connection::open(&safety_db_path_clone)
                .map_err(crate::infrastructure::sqlite::DbError::Rusqlite)?;
            let b = rusqlite::backup::Backup::new(live_conn, &mut dst)
                .map_err(crate::infrastructure::sqlite::DbError::Rusqlite)?;
            b.run_to_completion(100, Duration::ZERO, None)
                .map_err(crate::infrastructure::sqlite::DbError::Rusqlite)?;
            // Checkpoint WAL before shutdown to flush all pages to main DB file.
            let _: i64 = live_conn
                .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| r.get(0))
                .unwrap_or(0);
            Ok(())
        })
        .map_err(BackupError::Db)?;

    // Step 5: Shut down worker (connection closes; WAL flushed).
    runtime.shutdown_worker();

    // Step 6: Delete WAL/SHM side files (best-effort; they should be gone after shutdown).
    let wal = PathBuf::from(format!("{}-wal", live_path.to_string_lossy()));
    let shm = PathBuf::from(format!("{}-shm", live_path.to_string_lossy()));
    let _ = std::fs::remove_file(&wal);
    let _ = std::fs::remove_file(&shm);

    // Step 7: File swap.
    let old_path = PathBuf::from(format!("{}.old", live_path.to_string_lossy()));
    // Keep the old DB for rollback by renaming it aside.
    if let Err(e) = std::fs::rename(&live_path, &old_path) {
        // Cannot even move the live DB aside — reopen and abort.
        let _ = reopen_worker(runtime, &live_path);
        return Err(BackupError::Io(e));
    }
    // Place the backup DB at the live path.
    if let Err(e) = std::fs::rename(&backup_db_path, &live_path) {
        // Swap failed — rename old DB back.
        let _ = std::fs::rename(&old_path, &live_path);
        let _ = reopen_worker(runtime, &live_path);
        return Err(BackupError::Io(e));
    }

    // Step 8: Open new connection and spawn new worker.
    reopen_worker(runtime, &live_path)?;

    // Step 9: Delete .old file (best-effort).
    let _ = std::fs::remove_file(&old_path);

    // Step 10: Return result.
    Ok(RestoreResult {
        restored_at: chrono_now_rfc3339(),
        schema_version: manifest.schema_version,
    })
}

/// Opens a new connection to `path`, runs migrations (no-op if schema matches),
/// spawns a new DbWorkerHandle, and installs it in the runtime.
fn reopen_worker(runtime: &DatabaseRuntime, path: &Path) -> Result<(), BackupError> {
    let mut conn = open_file_connection(path).map_err(BackupError::Db)?;
    run_migrations(&mut conn).map_err(BackupError::Db)?;
    let worker = DbWorkerHandle::spawn(conn);
    runtime.replace_worker(worker);
    Ok(())
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

    fn temp_db_path() -> PathBuf {
        std::env::temp_dir().join(format!("lw_rst_{}.db", next_id()))
    }

    fn temp_backups_dir() -> PathBuf {
        let p = std::env::temp_dir().join(format!("lw_rstbkp_{}", next_id()));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    fn make_file_runtime() -> (DatabaseRuntime, PathBuf) {
        let p = temp_db_path();
        let mut conn = open_file_connection(&p).unwrap();
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        let rt = DatabaseRuntime::new(p.clone(), worker);
        (rt, p)
    }

    #[test]
    fn round_trip_restore_recovers_exact_data() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        // Create a record.
        let id1 = "019700000000-7fff-8000-0000-000000000001".to_string();
        rt.execute({
            let id1 = id1.clone();
            move |conn| repo::create(conn, &id1, "Original label").map(|_| ())
        })
        .unwrap();

        // Backup.
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Archive the record (change state after backup).
        rt.execute({
            let id1 = id1.clone();
            move |conn| {
                repo::archive(conn, &id1, 0).expect("archive failed");
                Ok(())
            }
        })
        .unwrap();

        // Confirm it is archived.
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert!(
            active.is_empty(),
            "record should be archived before restore"
        );

        // Restore.
        let restore_result = restore_db(&rt, &backup_dir).unwrap();
        assert_eq!(restore_result.schema_version, 2);

        // Confirm original data returned.
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].label, "Original label");
    }

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
    fn restore_rejects_wrong_checksum() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Tamper with the manifest checksum.
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

        // Live data must still be accessible.
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        drop(active); // just confirm no panic / WorkerGone
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

        // Overwrite backup DB with random bytes.
        std::fs::write(backup_dir.join("lifeweave.db"), b"this is not sqlite").unwrap();
        // Update checksum in manifest to match the corrupted content so we pass step 2.
        let corrupt_hash = super::sha256_file(&backup_dir.join("lifeweave.db")).unwrap();
        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!(corrupt_hash);
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let result = restore_db(&rt, &backup_dir);
        assert!(
            matches!(
                result,
                Err(BackupError::IntegrityCheckFailed(_)) | Err(BackupError::Db(_))
            ),
            "expected integrity or DB error for corrupt SQLite, got {result:?}"
        );

        // Live data must still be accessible.
        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        drop(active);
    }

    #[test]
    fn restore_does_not_mutate_on_checksum_failure() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();

        // Create a record.
        let id1 = "019700000000-7fff-8000-0000-000000000002".to_string();
        rt.execute({
            let id1 = id1.clone();
            move |conn| repo::create(conn, &id1, "Keep me").map(|_| ())
        })
        .unwrap();

        let backup_result = backup_db(&rt, &backups).unwrap();
        let backup_dir = PathBuf::from(&backup_result.backup_dir);

        // Tamper checksum.
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

        // Corrupt the backup DB while keeping the original checksum → checksum passes,
        // integrity check fails.
        // (We update checksum too so the test targets integrity check failure.)
        std::fs::write(backup_dir.join("lifeweave.db"), b"not a database").unwrap();
        let corrupt_hash = super::sha256_file(&backup_dir.join("lifeweave.db")).unwrap();
        let manifest_path = backup_dir.join("manifest.json");
        let mut m: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        m["db_sha256"] = serde_json::json!(corrupt_hash);
        std::fs::write(&manifest_path, serde_json::to_vec(&m).unwrap()).unwrap();

        let _ = restore_db(&rt, &backup_dir);

        let active = rt.execute(|conn| repo::list_active(conn)).unwrap();
        assert_eq!(active.len(), 1, "live data should be unchanged");
        assert_eq!(active[0].label, "Persist me");
    }
}
