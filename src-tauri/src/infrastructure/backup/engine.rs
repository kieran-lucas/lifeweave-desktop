use std::path::Path;
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::manifest::{BackupManifest, SUPPORTED_FORMAT_VERSION};
use super::{BackupError, BackupResult};
use crate::infrastructure::sqlite::{
    connection::open_file_connection, migrations::current_schema_version, runtime::DatabaseRuntime,
};

/// Creates a backup package at `backups_dir/lifeweave_backup_{unix_ms}/`.
///
/// Steps:
/// 1. Create staging dir: `backups_dir/.staging_{unix_ms}/`
/// 2. Open staging DB connection
/// 3. Copy live DB → staging DB via Online Backup API (inside worker thread)
/// 4. Drop staging connection
/// 5. Compute SHA-256 of staging DB file
/// 6. Read schema_version from staging DB
/// 7. Write manifest.json to staging dir
/// 8. Rename staging dir → final dir
/// 9. Return BackupResult
///
/// On failure: best-effort remove staging dir; live DB is never mutated.
pub fn backup_db(
    runtime: &DatabaseRuntime,
    backups_dir: &Path,
) -> Result<BackupResult, BackupError> {
    std::fs::create_dir_all(backups_dir).map_err(BackupError::Io)?;

    let unix_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_millis();

    let staging_dir = backups_dir.join(format!(".staging_{unix_ms}"));
    std::fs::create_dir_all(&staging_dir).map_err(BackupError::Io)?;

    let staging_db_path = staging_dir.join("lifeweave.db");
    let staging_db_path_clone = staging_db_path.clone();

    // Copy live DB → staging DB file on the worker thread.
    let copy_result = runtime.execute(move |live_conn| {
        let mut dst = Connection::open(&staging_db_path_clone)
            .map_err(crate::infrastructure::sqlite::DbError::Rusqlite)?;
        let backup = rusqlite::backup::Backup::new(live_conn, &mut dst)
            .map_err(crate::infrastructure::sqlite::DbError::Rusqlite)?;
        backup
            .run_to_completion(100, Duration::ZERO, None)
            .map_err(crate::infrastructure::sqlite::DbError::Rusqlite)?;
        Ok(())
    });

    if let Err(e) = copy_result {
        let _ = std::fs::remove_dir_all(&staging_dir);
        return Err(BackupError::Db(e));
    }

    // Compute checksum of the backup DB file.
    let db_sha256 = sha256_file(&staging_db_path).inspect_err(|_| {
        let _ = std::fs::remove_dir_all(&staging_dir);
    })?;

    // Read schema version from the backup DB.
    let schema_version = (|| -> Result<u32, BackupError> {
        let conn = open_file_connection(&staging_db_path).map_err(BackupError::Db)?;
        current_schema_version(&conn).map_err(BackupError::Db)
    })()
    .inspect_err(|_| {
        let _ = std::fs::remove_dir_all(&staging_dir);
    })?;

    let db_size_bytes = std::fs::metadata(&staging_db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let created_at = chrono_now_rfc3339();
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    let manifest = BackupManifest {
        format_version: SUPPORTED_FORMAT_VERSION,
        app_version: app_version.clone(),
        schema_version,
        created_at: created_at.clone(),
        db_size_bytes,
        db_sha256: db_sha256.clone(),
    };

    manifest.write_to_dir(&staging_dir).inspect_err(|_| {
        let _ = std::fs::remove_dir_all(&staging_dir);
    })?;

    // Atomic rename: staging dir → final dir.
    let final_dir = backups_dir.join(format!("lifeweave_backup_{unix_ms}"));
    std::fs::rename(&staging_dir, &final_dir).map_err(|e| {
        let _ = std::fs::remove_dir_all(&staging_dir);
        BackupError::Io(e)
    })?;

    Ok(BackupResult {
        backup_dir: final_dir.to_string_lossy().into_owned(),
        db_sha256,
        schema_version,
        created_at,
        db_size_bytes,
    })
}

/// Returns the current time as an RFC3339 UTC string without depending on
/// the `chrono` or `time` crates. Resolution is seconds.
pub(super) fn chrono_now_rfc3339() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs();

    // Convert Unix timestamp (seconds since 1970-01-01) to a human-readable
    // RFC3339 UTC string using only integer arithmetic.
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400;

    // Gregorian calendar calculation from days since epoch.
    let (year, month, day) = days_to_ymd(days);

    format!("{year:04}-{month:02}-{day:02}T{h:02}:{m:02}:{s:02}Z")
}

fn days_to_ymd(days: u64) -> (u64, u64, u64) {
    // Algorithm from http://howardhinnant.github.io/date_algorithms.html
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_file_connection, migrations::run_migrations, runtime::DatabaseRuntime,
        worker::DbWorkerHandle,
    };
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn next_id() -> String {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        format!("{}_{n}", std::process::id())
    }

    fn temp_db_path() -> PathBuf {
        std::env::temp_dir().join(format!("lw_eng_{}.db", next_id()))
    }

    fn make_file_runtime() -> (DatabaseRuntime, PathBuf) {
        let p = temp_db_path();
        let mut conn = open_file_connection(&p).unwrap();
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        let rt = DatabaseRuntime::new(p.clone(), worker);
        (rt, p)
    }

    fn temp_backups_dir() -> PathBuf {
        let p = std::env::temp_dir().join(format!("lw_bkp_{}", next_id()));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    #[test]
    fn backup_creates_manifest_and_db() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        let dir = PathBuf::from(&result.backup_dir);
        assert!(dir.join("lifeweave.db").exists(), "backup DB missing");
        assert!(dir.join("manifest.json").exists(), "manifest missing");
    }

    #[test]
    fn backup_checksum_matches_manifest() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        let dir = PathBuf::from(&result.backup_dir);
        let actual_hash = sha256_file(&dir.join("lifeweave.db")).unwrap();
        assert_eq!(result.db_sha256, actual_hash);
    }

    #[test]
    fn backup_db_passes_integrity_check() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        let dir = PathBuf::from(&result.backup_dir);
        let conn = open_file_connection(&dir.join("lifeweave.db")).unwrap();
        let ic: String = conn
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))
            .unwrap();
        assert_eq!(ic, "ok");
    }

    #[test]
    fn backup_db_passes_fk_check() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        let dir = PathBuf::from(&result.backup_dir);
        let conn = open_file_connection(&dir.join("lifeweave.db")).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check()", [], |r| {
                r.get(0)
            })
            .unwrap_or(0);
        assert_eq!(count, 0, "foreign key violations found in backup");
    }

    #[test]
    fn backup_schema_version_recorded() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        // Migration 2 is the latest; schema_version must reflect that.
        assert_eq!(result.schema_version, 2);
    }

    #[test]
    fn backup_result_contains_size_and_checksum() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        assert!(result.db_size_bytes > 0);
        assert_eq!(result.db_sha256.len(), 64, "SHA-256 must be 64 hex chars");
    }

    #[test]
    fn rfc3339_string_has_correct_format() {
        let s = chrono_now_rfc3339();
        // e.g. "2026-08-01T12:34:56Z"
        assert_eq!(s.len(), 20, "RFC3339 string length");
        assert!(s.ends_with('Z'));
        assert_eq!(&s[4..5], "-");
        assert_eq!(&s[7..8], "-");
        assert_eq!(&s[10..11], "T");
    }
}
