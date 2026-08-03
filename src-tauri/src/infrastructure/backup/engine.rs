use std::path::Path;
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::manifest::{BackupAssetEntry, BackupManifest, SUPPORTED_FORMAT_VERSION};
use super::{BackupError, BackupId, BackupResult, BackupSummary};
use crate::infrastructure::durability;
use crate::infrastructure::sqlite::{
    connection::open_file_connection, migrations::current_schema_version, runtime::DatabaseRuntime,
};

/// Creates a backup package at `backups_dir/lifeweave_backup_{unix_ms}/`.
///
/// Steps:
/// 0. Acquire maintenance lock (serialises with concurrent backup/restore).
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
    // Acquire maintenance lock: serialises with concurrent restore operations.
    let _maint_guard = runtime.acquire_maintenance().map_err(BackupError::Db)?;
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

    durability::sync_file(&staging_db_path)
        .inspect_err(|_| {
            let _ = std::fs::remove_dir_all(&staging_dir);
        })
        .map_err(BackupError::Io)?;

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

    let assets = (|| -> Result<Vec<BackupAssetEntry>, BackupError> {
        let mut assets = Vec::new();
        let conn = open_file_connection(&staging_db_path).map_err(BackupError::Db)?;
        let mut statement = conn
            .prepare("SELECT DISTINCT a.relative_original_path FROM assets a WHERE a.status='usable' AND (EXISTS(SELECT 1 FROM document_assets da WHERE da.asset_id=a.id) OR EXISTS(SELECT 1 FROM narrative_document_assets nda WHERE nda.asset_id=a.id)) ORDER BY a.relative_original_path")
            .map_err(|e| BackupError::Db(e.into()))?;
        let paths = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| BackupError::Db(e.into()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| BackupError::Db(e.into()))?;
        let app_root = runtime.db_path().parent().unwrap_or(Path::new("."));
        for relative in paths {
            if relative.contains("..")
                || Path::new(&relative).is_absolute()
                || !relative.starts_with("assets/original/")
            {
                return Err(BackupError::PostSwapValidationFailed(
                    "invalid asset identity".into(),
                ));
            }
            let source = app_root.join(&relative);
            let target = staging_dir.join(&relative);
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).map_err(BackupError::Io)?;
            }
            std::fs::copy(&source, &target).map_err(BackupError::Io)?;
            durability::sync_file(&target).map_err(BackupError::Io)?;
            let byte_size = std::fs::metadata(&target).map_err(BackupError::Io)?.len();
            assets.push(BackupAssetEntry {
                relative_path: relative,
                byte_size,
                sha256: sha256_file(&target)?,
            });
        }
        Ok(assets)
    })()
    .inspect_err(|_| {
        let _ = std::fs::remove_dir_all(&staging_dir);
    })?;

    let manifest = BackupManifest {
        format_version: SUPPORTED_FORMAT_VERSION,
        app_version: app_version.clone(),
        schema_version,
        created_at: created_at.clone(),
        db_size_bytes,
        db_sha256: db_sha256.clone(),
        assets,
    };

    manifest.write_to_dir(&staging_dir).inspect_err(|_| {
        let _ = std::fs::remove_dir_all(&staging_dir);
    })?;

    verify_package(&staging_dir, &manifest)?;
    durability::sync_tree(&staging_dir).map_err(BackupError::Io)?;

    // Atomic rename: staging dir → final dir.
    let final_dir = backups_dir.join(format!("lifeweave_backup_{unix_ms}"));
    durability::durable_rename(&staging_dir, &final_dir).map_err(|e| {
        let _ = std::fs::remove_dir_all(&staging_dir);
        BackupError::Io(e)
    })?;

    if let Err(error) = verify_package(&final_dir, &manifest) {
        let _ = durability::durable_remove_dir_all(&final_dir);
        return Err(error);
    }

    Ok(BackupResult {
        backup_dir: final_dir.to_string_lossy().into_owned(),
        db_sha256,
        schema_version,
        created_at,
        db_size_bytes,
    })
}

fn verify_package(directory: &Path, expected: &BackupManifest) -> Result<(), BackupError> {
    let reopened = BackupManifest::read_from_dir(directory)?;
    if reopened.db_size_bytes != expected.db_size_bytes
        || reopened.db_sha256 != expected.db_sha256
        || reopened.assets.len() != expected.assets.len()
    {
        return Err(BackupError::PostSwapValidationFailed(
            "published backup metadata differs from staging authority".into(),
        ));
    }
    let database = directory.join("lifeweave.db");
    if std::fs::metadata(&database).map_err(BackupError::Io)?.len() != reopened.db_size_bytes {
        return Err(BackupError::PostSwapValidationFailed(
            "published database size differs from manifest".into(),
        ));
    }
    let actual = sha256_file(&database)?;
    if actual != reopened.db_sha256 {
        return Err(BackupError::Checksum {
            expected: reopened.db_sha256,
            actual,
        });
    }
    let connection = open_file_connection(&database).map_err(BackupError::Db)?;
    let integrity: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| BackupError::Db(error.into()))?;
    if integrity != "ok" {
        return Err(BackupError::IntegrityCheckFailed(integrity));
    }
    for asset in &reopened.assets {
        let path = directory.join(&asset.relative_path);
        if std::fs::metadata(&path).map_err(BackupError::Io)?.len() != asset.byte_size {
            return Err(BackupError::PostSwapValidationFailed(
                "published asset size differs from manifest".into(),
            ));
        }
        let actual = sha256_file(&path)?;
        if actual != asset.sha256 {
            return Err(BackupError::Checksum {
                expected: asset.sha256.clone(),
                actual,
            });
        }
    }
    Ok(())
}

const BACKUP_PREFIX: &str = "lifeweave_backup_";

pub fn validate_backup_id(id: &BackupId) -> Result<(), BackupError> {
    let value = id.0.as_str();
    if value.len() < BACKUP_PREFIX.len() + 1
        || value.len() > 96
        || !value.starts_with(BACKUP_PREFIX)
        || !value[BACKUP_PREFIX.len()..]
            .bytes()
            .all(|b| b.is_ascii_digit())
    {
        return Err(BackupError::InvalidBackupId);
    }
    Ok(())
}

pub fn resolve_backup_id(root: &Path, id: &BackupId) -> Result<std::path::PathBuf, BackupError> {
    validate_backup_id(id)?;
    let root = root
        .canonicalize()
        .map_err(|_| BackupError::BackupNotFound)?;
    let candidate = root.join(&id.0);
    let canonical = candidate
        .canonicalize()
        .map_err(|_| BackupError::BackupNotFound)?;
    if canonical.parent() != Some(root.as_path()) || !canonical.is_dir() {
        return Err(BackupError::InvalidBackupId);
    }
    let manifest =
        BackupManifest::read_from_dir(&canonical).map_err(|_| BackupError::BackupNotFound)?;
    let db = canonical.join("lifeweave.db");
    if !db.is_file()
        || std::fs::metadata(&db)
            .map_err(|_| BackupError::BackupNotFound)?
            .len()
            != manifest.db_size_bytes
    {
        return Err(BackupError::BackupNotFound);
    }
    Ok(canonical)
}

pub fn list_backups(root: &Path) -> Result<Vec<BackupSummary>, BackupError> {
    let mut entries = Vec::new();
    let Ok(read_dir) = std::fs::read_dir(root) else {
        return Ok(entries);
    };
    for entry in read_dir.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let id = BackupId(name.to_owned());
        if validate_backup_id(&id).is_err() {
            continue;
        }
        let Ok(manifest) = BackupManifest::read_from_dir(&path) else {
            continue;
        };
        let db = path.join("lifeweave.db");
        let Ok(meta) = std::fs::metadata(&db) else {
            continue;
        };
        if meta.len() != manifest.db_size_bytes {
            continue;
        }
        entries.push(BackupSummary {
            backup_id: id,
            schema_version: manifest.schema_version,
            created_at: manifest.created_at,
            db_size_bytes: manifest.db_size_bytes,
        });
    }
    entries.sort_by(|a, b| {
        b.created_at
            .cmp(&a.created_at)
            .then_with(|| b.backup_id.0.cmp(&a.backup_id.0))
    });
    Ok(entries)
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
    // Howard Hinnant's civil-calendar conversion algorithm.
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
        // The manifest must carry the latest immutable migration version.
        assert_eq!(result.schema_version, 15);
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
    fn durability_barrier_failure_never_publishes_a_successful_backup() {
        let (runtime, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        crate::infrastructure::durability::fail_after(0);
        assert!(backup_db(&runtime, &backups).is_err());
        assert!(list_backups(&backups).unwrap().is_empty());
        assert!(std::fs::read_dir(&backups).unwrap().all(|entry| {
            !entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .starts_with(BACKUP_PREFIX)
        }));
    }

    #[test]
    fn backup_packages_referenced_document_assets() {
        use crate::document::{assets, dto::ImportDocumentAssetInput};
        let (rt, db) = make_file_runtime();
        let app_root = db.parent().unwrap().to_path_buf();
        let png = assets::tiny_png();
        let asset = rt
            .execute(move |conn| {
                conn.execute("INSERT INTO life_nodes VALUES ('00000000-0000-7000-8000-000000000901','life-root','Leaf','','life-leaf','neutral',1,NULL,'now','now',0)", [])?;
                conn.execute("INSERT INTO reader_documents VALUES ('00000000-0000-7000-8000-000000000902','00000000-0000-7000-8000-000000000901',1,0,'{\"type\":\"doc\",\"content\":[]}','', 'now','now',NULL)", [])?;
                let asset = assets::import(conn, &app_root, ImportDocumentAssetInput { original_name: "pixel.png".into(), bytes: png })
                    .map_err(|_| crate::infrastructure::sqlite::DbError::InvalidMigrationList)?;
                conn.execute("INSERT INTO document_assets VALUES ('00000000-0000-7000-8000-000000000902',?1,1)", [&asset.asset_id])?;
                Ok(asset)
            })
            .unwrap();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        let dir = PathBuf::from(result.backup_dir);
        let manifest = BackupManifest::read_from_dir(&dir).unwrap();
        assert_eq!(manifest.assets.len(), 1);
        assert_eq!(manifest.assets[0].byte_size, asset.byte_size);
        assert!(dir.join(&manifest.assets[0].relative_path).is_file());
        assert_eq!(
            sha256_file(&dir.join(&manifest.assets[0].relative_path)).unwrap(),
            manifest.assets[0].sha256
        );
    }

    #[test]
    fn backup_packages_referenced_narrative_assets() {
        use crate::{
            document::{assets, dto::ImportDocumentAssetInput},
            life,
            narrative::{dto::CreateNarrativeDocumentInput, repository as narrative},
        };
        let (rt, db) = make_file_runtime();
        let app_root = db.parent().unwrap().to_path_buf();
        let png = assets::tiny_png();
        let asset = rt
            .execute(move |conn| {
                let node = life::repository::create(
                    conn,
                    life::dto::CreateLifeNodeInput {
                        parent_id: "life-root".into(),
                        title: "Canvas leaf".into(),
                        short_description: "".into(),
                        icon_key: "life-leaf".into(),
                        branch_theme_id: "neutral".into(),
                    },
                )
                .map_err(|_| crate::infrastructure::sqlite::DbError::InvalidMigrationList)?
                .node;
                let canvas = narrative::create(
                    conn,
                    CreateNarrativeDocumentInput {
                        life_node_id: node.id,
                        operation_id: "backup-narrative-create".into(),
                        template_id: "knowledge_dossier".into(),
                    },
                )
                .map_err(|_| crate::infrastructure::sqlite::DbError::InvalidMigrationList)?;
                let asset = assets::import(
                    conn,
                    &app_root,
                    ImportDocumentAssetInput {
                        original_name: "pixel.png".into(),
                        bytes: png,
                    },
                )
                .map_err(|_| crate::infrastructure::sqlite::DbError::InvalidMigrationList)?;
                conn.execute(
                    "INSERT INTO narrative_document_assets VALUES(?1,?2,1)",
                    [&canvas.id, &asset.asset_id],
                )?;
                Ok(asset)
            })
            .unwrap();
        let result = backup_db(&rt, &temp_backups_dir()).unwrap();
        let manifest = BackupManifest::read_from_dir(&PathBuf::from(result.backup_dir)).unwrap();
        assert_eq!(manifest.assets.len(), 1);
        assert_eq!(manifest.assets[0].byte_size, asset.byte_size);
    }

    #[test]
    fn backup_ids_are_strict_and_contained() {
        for value in [
            "",
            "..",
            "C:\\escape",
            "lifeweave_backup_x",
            "lifeweave_backup_1/..",
        ] {
            assert!(validate_backup_id(&BackupId(value.into())).is_err());
        }
        assert!(validate_backup_id(&BackupId("lifeweave_backup_123".into())).is_ok());
    }

    #[test]
    fn catalog_lists_only_valid_final_packages() {
        let (rt, _db) = make_file_runtime();
        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        std::fs::create_dir_all(backups.join(".staging_999")).unwrap();
        std::fs::create_dir_all(backups.join("unrelated")).unwrap();
        let listed = list_backups(&backups).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(
            listed[0].backup_id.0,
            PathBuf::from(result.backup_dir)
                .file_name()
                .unwrap()
                .to_string_lossy()
        );
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
