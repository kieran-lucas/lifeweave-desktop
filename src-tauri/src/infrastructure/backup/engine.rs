use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::Connection;

use super::checksum::sha256_file;
use super::manifest::{BackupAssetEntry, BackupManifest, SUPPORTED_FORMAT_VERSION};
use super::{
    BackupCompatibility, BackupCreateResult, BackupError, BackupId, BackupResult, BackupSummary,
};
use crate::infrastructure::durability;
use crate::infrastructure::sqlite::{
    connection::{open_file_connection, open_readonly_connection},
    migrations::current_schema_version,
    runtime::DatabaseRuntime,
};

#[cfg(test)]
thread_local! {
    static VERIFY_FAIL_AT: std::cell::Cell<i32> = const { std::cell::Cell::new(-1) };
}

pub const MAX_RESTORABLE_MANAGED_BACKUPS: usize = 12;

#[derive(Debug, Default)]
struct RetentionOutcome {
    pruned_backup_count: u32,
    cleanup_pending: bool,
}

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
    backup_db_internal(runtime, backups_dir, false).map(|(backup, _)| backup)
}

pub fn create_managed_backup(
    runtime: &DatabaseRuntime,
    backups_dir: &Path,
) -> Result<BackupCreateResult, BackupError> {
    let (backup, retention) = backup_db_internal(runtime, backups_dir, true)?;
    let backup_id = BackupId(
        Path::new(&backup.backup_dir)
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or(BackupError::InvalidBackupId)?
            .to_owned(),
    );
    let summary = list_backups(backups_dir)?
        .into_iter()
        .find(|candidate| candidate.backup_id == backup_id)
        .ok_or(BackupError::PostSwapValidationFailed(
            "fresh backup missing from managed inventory".into(),
        ))?;
    Ok(BackupCreateResult {
        backup: summary,
        pruned_backup_count: retention.pruned_backup_count,
        retention_cleanup_pending: retention.cleanup_pending,
    })
}

fn backup_db_internal(
    runtime: &DatabaseRuntime,
    backups_dir: &Path,
    apply_managed_retention: bool,
) -> Result<(BackupResult, RetentionOutcome), BackupError> {
    // Acquire maintenance lock: serialises with concurrent restore operations.
    let _maint_guard = runtime.acquire_maintenance().map_err(BackupError::Db)?;

    // Refuse before anything is created or published. A snapshot taken mid-session would, on
    // restore, resume a timer whose start predates the restore — silently counting downtime as
    // worked time.
    let timer_active = runtime
        .execute(|conn| {
            crate::task::actual_time::any_session_active(conn).map_err(|error| match error {
                crate::task::repository::TaskError::Db(inner) => {
                    crate::infrastructure::sqlite::DbError::Rusqlite(inner)
                }
                _ => crate::infrastructure::sqlite::DbError::InvalidMigrationList,
            })
        })
        .map_err(BackupError::Db)?;
    if timer_active {
        return Err(BackupError::ActiveTaskTimer);
    }

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

    let result = BackupResult {
        backup_dir: final_dir.to_string_lossy().into_owned(),
        db_sha256,
        schema_version,
        created_at,
        db_size_bytes,
    };
    let retention = if apply_managed_retention {
        apply_retention(
            backups_dir,
            &BackupId(
                final_dir
                    .file_name()
                    .and_then(|value| value.to_str())
                    .ok_or(BackupError::InvalidBackupId)?
                    .to_owned(),
            ),
        )?
    } else {
        RetentionOutcome::default()
    };
    Ok((result, retention))
}

fn verify_package(directory: &Path, expected: &BackupManifest) -> Result<(), BackupError> {
    #[cfg(test)]
    {
        let fail = VERIFY_FAIL_AT.with(|point| {
            let current = point.get();
            if current == 0 {
                point.set(-1);
                true
            } else {
                if current > 0 {
                    point.set(current - 1);
                }
                false
            }
        });
        if fail {
            return Err(BackupError::PostSwapValidationFailed(
                "test-injected published package verification failure".into(),
            ));
        }
    }
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
    drop(connection);
    super::restore::validate_candidate(
        &database,
        &reopened,
        crate::infrastructure::sqlite::task52_migration::max_supported_schema_version(),
    )?;
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
    if canonical.parent() != Some(root.as_path())
        || !canonical.is_dir()
        || is_link_or_reparse_point(&candidate)
    {
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
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() || file_type.is_symlink() || is_link_or_reparse_point(&path) {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let id = BackupId(name.to_owned());
        if validate_backup_id(&id).is_err() {
            continue;
        }
        let Ok(manifest) = BackupManifest::read_for_inventory(&path) else {
            continue;
        };
        if !inventory_manifest_shape_is_safe(&manifest) {
            continue;
        }
        let compatibility = compatibility_for(manifest.format_version, manifest.schema_version);
        if manifest.format_version <= SUPPORTED_FORMAT_VERSION {
            let db = path.join("lifeweave.db");
            let Ok(meta) = std::fs::symlink_metadata(&db) else {
                continue;
            };
            if !meta.file_type().is_file()
                || meta.file_type().is_symlink()
                || meta.len() != manifest.db_size_bytes
                || is_link_or_reparse_point(&db)
            {
                continue;
            }
            let Ok(connection) = open_readonly_connection(&db) else {
                continue;
            };
            let Ok(actual_schema) = current_schema_version(&connection) else {
                continue;
            };
            if actual_schema != manifest.schema_version {
                continue;
            }
        }
        entries.push(BackupSummary {
            backup_id: id,
            format_version: manifest.format_version,
            app_version: manifest.app_version,
            schema_version: manifest.schema_version,
            created_at: manifest.created_at,
            db_size_bytes: manifest.db_size_bytes,
            compatibility,
        });
    }
    entries.sort_by(|a, b| {
        b.created_at
            .cmp(&a.created_at)
            .then_with(|| b.backup_id.0.cmp(&a.backup_id.0))
    });
    Ok(entries)
}

fn compatibility_for(format_version: u32, schema_version: u32) -> BackupCompatibility {
    if format_version > SUPPORTED_FORMAT_VERSION {
        return BackupCompatibility::NewerFormat;
    }
    let current = crate::infrastructure::sqlite::task52_migration::max_supported_schema_version();
    match schema_version.cmp(&current) {
        std::cmp::Ordering::Equal => BackupCompatibility::Ready,
        std::cmp::Ordering::Less => BackupCompatibility::MigrationRequired,
        std::cmp::Ordering::Greater => BackupCompatibility::NewerSchema,
    }
}

fn inventory_manifest_shape_is_safe(manifest: &BackupManifest) -> bool {
    if !inventory_timestamp_is_safe(&manifest.created_at)
        || manifest.app_version.is_empty()
        || manifest.db_size_bytes == 0
        || manifest.db_sha256.len() != 64
        || !manifest
            .db_sha256
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit())
    {
        return false;
    }
    manifest.assets.iter().all(|asset| {
        let path = Path::new(&asset.relative_path);
        !asset.relative_path.contains("..")
            && !path.is_absolute()
            && asset.relative_path.starts_with("assets/original/")
            && asset.sha256.len() == 64
            && asset.sha256.bytes().all(|byte| byte.is_ascii_hexdigit())
    })
}

fn inventory_timestamp_is_safe(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 20
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes[19] != b'Z'
        || bytes.iter().enumerate().any(|(index, byte)| {
            !matches!(index, 4 | 7 | 10 | 13 | 16 | 19) && !byte.is_ascii_digit()
        })
    {
        return false;
    }
    let parse = |start: usize, end: usize| value[start..end].parse::<u32>().unwrap_or(u32::MAX);
    (1..=12).contains(&parse(5, 7))
        && (1..=31).contains(&parse(8, 10))
        && parse(11, 13) < 24
        && parse(14, 16) < 60
        && parse(17, 19) < 60
}

fn is_restorable(compatibility: BackupCompatibility) -> bool {
    matches!(
        compatibility,
        BackupCompatibility::Ready | BackupCompatibility::MigrationRequired
    )
}

fn apply_retention(root: &Path, fresh: &BackupId) -> Result<RetentionOutcome, BackupError> {
    apply_retention_with(root, fresh, |path| {
        durability::durable_remove_dir_all(path).map_err(BackupError::Io)
    })
}

fn apply_retention_with<F>(
    root: &Path,
    fresh: &BackupId,
    mut remove: F,
) -> Result<RetentionOutcome, BackupError>
where
    F: FnMut(&Path) -> Result<(), BackupError>,
{
    validate_backup_id(fresh)?;
    let inventory = list_backups(root)?;
    let mut keep = HashSet::from([fresh.0.clone()]);
    for summary in inventory
        .iter()
        .filter(|summary| summary.backup_id != *fresh && is_restorable(summary.compatibility))
        .take(MAX_RESTORABLE_MANAGED_BACKUPS.saturating_sub(1))
    {
        keep.insert(summary.backup_id.0.clone());
    }

    let mut prune = inventory
        .into_iter()
        .filter(|summary| {
            is_restorable(summary.compatibility) && !keep.contains(&summary.backup_id.0)
        })
        .collect::<Vec<_>>();
    prune.reverse();

    let mut outcome = RetentionOutcome::default();
    for summary in prune {
        match resolve_prune_candidate(root, &summary) {
            Ok(path) => match remove(&path) {
                Ok(()) => outcome.pruned_backup_count += 1,
                Err(_) => {
                    if !path.exists() {
                        outcome.pruned_backup_count += 1;
                    }
                    outcome.cleanup_pending = true;
                }
            },
            Err(_) => outcome.cleanup_pending = true,
        }
    }
    Ok(outcome)
}

fn resolve_prune_candidate(root: &Path, expected: &BackupSummary) -> Result<PathBuf, BackupError> {
    validate_backup_id(&expected.backup_id)?;
    if !is_restorable(expected.compatibility) {
        return Err(BackupError::InvalidBackupId);
    }
    let canonical_root = root.canonicalize().map_err(BackupError::Io)?;
    let candidate = canonical_root.join(&expected.backup_id.0);
    if is_link_or_reparse_point(&candidate) {
        return Err(BackupError::InvalidBackupId);
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|_| BackupError::BackupNotFound)?;
    if canonical.parent() != Some(canonical_root.as_path()) || !canonical.is_dir() {
        return Err(BackupError::InvalidBackupId);
    }
    let actual = inventory_summary(&canonical, expected.backup_id.clone())?;
    if actual.backup_id != expected.backup_id || !is_restorable(actual.compatibility) {
        return Err(BackupError::InvalidBackupId);
    }
    let strict_manifest = BackupManifest::read_from_dir(&canonical)?;
    verify_package(&canonical, &strict_manifest)?;
    Ok(canonical)
}

fn inventory_summary(path: &Path, backup_id: BackupId) -> Result<BackupSummary, BackupError> {
    let manifest = BackupManifest::read_for_inventory(path)?;
    if !inventory_manifest_shape_is_safe(&manifest) {
        return Err(BackupError::InvalidBackupId);
    }
    if manifest.format_version > SUPPORTED_FORMAT_VERSION {
        return Err(BackupError::UnsupportedFormatVersion(
            manifest.format_version,
        ));
    }
    let db = path.join("lifeweave.db");
    let metadata = std::fs::symlink_metadata(&db).map_err(BackupError::Io)?;
    if !metadata.file_type().is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() != manifest.db_size_bytes
        || is_link_or_reparse_point(&db)
    {
        return Err(BackupError::BackupNotFound);
    }
    let connection = open_readonly_connection(&db).map_err(BackupError::Db)?;
    if current_schema_version(&connection).map_err(BackupError::Db)? != manifest.schema_version {
        return Err(BackupError::BackupNotFound);
    }
    Ok(BackupSummary {
        backup_id,
        format_version: manifest.format_version,
        app_version: manifest.app_version,
        schema_version: manifest.schema_version,
        created_at: manifest.created_at,
        db_size_bytes: manifest.db_size_bytes,
        compatibility: compatibility_for(manifest.format_version, manifest.schema_version),
    })
}

fn is_link_or_reparse_point(path: &Path) -> bool {
    let Ok(metadata) = std::fs::symlink_metadata(path) else {
        return true;
    };
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt as _;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    {
        false
    }
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

    fn make_current_file_runtime() -> (DatabaseRuntime, PathBuf) {
        let p = temp_db_path();
        let mut conn = open_file_connection(&p).unwrap();
        crate::infrastructure::sqlite::task52_migration::run_all_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        let rt = DatabaseRuntime::new(p.clone(), worker);
        (rt, p)
    }

    fn temp_backups_dir() -> PathBuf {
        let p = std::env::temp_dir().join(format!("lw_bkp_{}", next_id()));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    fn copy_package(source: &Path, target: &Path) {
        std::fs::create_dir_all(target).unwrap();
        for entry in std::fs::read_dir(source).unwrap() {
            let entry = entry.unwrap();
            let destination = target.join(entry.file_name());
            if entry.file_type().unwrap().is_dir() {
                copy_package(&entry.path(), &destination);
            } else {
                std::fs::copy(entry.path(), destination).unwrap();
            }
        }
    }

    fn clone_package(source: &Path, root: &Path, numeric_id: u64, created_at: &str) -> PathBuf {
        let target = root.join(format!("{BACKUP_PREFIX}{numeric_id}"));
        copy_package(source, &target);
        let mut manifest = BackupManifest::read_from_dir(&target).unwrap();
        manifest.created_at = created_at.into();
        manifest.write_to_dir(&target).unwrap();
        target
    }

    fn set_package_schema(package: &Path, schema: u32) {
        let db = package.join("lifeweave.db");
        let connection = open_file_connection(&db).unwrap();
        connection
            .execute(
                "INSERT OR REPLACE INTO schema_migrations(version,applied_at) VALUES(?1,'now')",
                [schema],
            )
            .unwrap();
        drop(connection);
        let mut manifest = BackupManifest::read_from_dir(package).unwrap();
        manifest.schema_version = schema;
        manifest.db_size_bytes = std::fs::metadata(&db).unwrap().len();
        manifest.db_sha256 = sha256_file(&db).unwrap();
        manifest.write_to_dir(package).unwrap();
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
    fn backup_preserves_manual_focus_plan_score() {
        let (rt, _db) = make_current_file_runtime();
        rt.execute(|conn| {
            conn.execute_batch(
                "BEGIN;
                 PRAGMA defer_foreign_keys=ON;
                 INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,score,revision,created_at,updated_at)
                 VALUES('plan-score','variant-score','Scored plan','active','','[]',88,0,'1','1');
                 INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at)
                 VALUES('variant-score','plan-score','Primary','{\"type\":\"doc\",\"content\":[]}','',0,'1','1');
                 COMMIT;",
            )?;
            Ok(())
        })
        .unwrap();

        let backups = temp_backups_dir();
        let result = backup_db(&rt, &backups).unwrap();
        let backup =
            open_file_connection(&PathBuf::from(result.backup_dir).join("lifeweave.db")).unwrap();
        assert_eq!(
            backup
                .query_row(
                    "SELECT score FROM focus_plans WHERE id='plan-score'",
                    [],
                    |row| row.get::<_, Option<u32>>(0),
                )
                .unwrap(),
            Some(88)
        );
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
        assert_eq!(result.schema_version, 19);
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
    fn symlink_or_reparse_escape_is_never_inventory_or_prune_authority() {
        let (runtime, _) = make_file_runtime();
        let outside_root = temp_backups_dir();
        let outside = PathBuf::from(backup_db(&runtime, &outside_root).unwrap().backup_dir);
        let root = temp_backups_dir();
        let link = root.join("lifeweave_backup_9999");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, &link).unwrap();
        #[cfg(windows)]
        if std::os::windows::fs::symlink_dir(&outside, &link).is_err() {
            // Some Windows hosts disable developer-mode unprivileged symlink creation. The
            // production branch still checks FILE_ATTRIBUTE_REPARSE_POINT before canonicalizing.
            return;
        }
        assert!(is_link_or_reparse_point(&link));
        assert!(list_backups(&root).unwrap().is_empty());
        assert!(resolve_backup_id(&root, &BackupId("lifeweave_backup_9999".into())).is_err());
        assert!(outside.exists());
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
    fn compatibility_matrix_is_version_owned_and_app_version_is_informational() {
        assert_eq!(compatibility_for(2, 29), BackupCompatibility::Ready);
        assert_eq!(
            compatibility_for(1, 28),
            BackupCompatibility::MigrationRequired
        );
        assert_eq!(compatibility_for(2, 30), BackupCompatibility::NewerSchema);
        assert_eq!(compatibility_for(3, 1), BackupCompatibility::NewerFormat);

        let (runtime, _) = make_current_file_runtime();
        let root = temp_backups_dir();
        let package = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        let mut manifest = BackupManifest::read_from_dir(&package).unwrap();
        manifest.app_version = "9999.0.0-future-looking-but-informational".into();
        manifest.write_to_dir(&package).unwrap();
        assert_eq!(
            list_backups(&root).unwrap()[0].compatibility,
            BackupCompatibility::Ready
        );
    }

    #[test]
    fn future_format_is_inventory_visible_but_strict_restore_parser_rejects_it() {
        let (runtime, _) = make_current_file_runtime();
        let root = temp_backups_dir();
        let package = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        let mut manifest = BackupManifest::read_from_dir(&package).unwrap();
        manifest.format_version = SUPPORTED_FORMAT_VERSION + 1;
        manifest.write_to_dir(&package).unwrap();

        let listed = list_backups(&root).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].compatibility, BackupCompatibility::NewerFormat);
        assert!(matches!(
            BackupManifest::read_from_dir(&package),
            Err(BackupError::UnsupportedFormatVersion(3))
        ));
    }

    #[test]
    fn inventory_is_newest_first_and_excludes_malformed_and_artifact_directories() {
        let (runtime, _) = make_current_file_runtime();
        let root = temp_backups_dir();
        let source = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        let older = clone_package(&source, &root, 100, "2026-08-01T00:00:00Z");
        let newer = clone_package(&source, &root, 200, "2026-08-02T00:00:00Z");
        std::fs::create_dir_all(root.join("_safety")).unwrap();
        std::fs::create_dir_all(root.join("_safety_staging")).unwrap();
        std::fs::create_dir_all(root.join("_safety_old")).unwrap();
        std::fs::create_dir_all(root.join(".staging_300")).unwrap();
        std::fs::create_dir_all(root.join("restore_candidate")).unwrap();
        std::fs::create_dir_all(root.join("unrelated")).unwrap();
        let malformed = clone_package(&source, &root, 300, "2026-08-03T00:00:00Z");
        std::fs::write(malformed.join("manifest.json"), b"not json").unwrap();

        let listed = list_backups(&root).unwrap();
        let positions = listed
            .iter()
            .map(|summary| summary.backup_id.0.as_str())
            .collect::<Vec<_>>();
        assert!(
            positions
                .iter()
                .position(|id| *id == "lifeweave_backup_200")
                < positions
                    .iter()
                    .position(|id| *id == "lifeweave_backup_100")
        );
        assert!(!positions.contains(&"lifeweave_backup_300"));
        assert!(older.exists() && newer.exists());
    }

    #[test]
    fn retention_keeps_twelve_and_prunes_exactly_the_oldest_restorable() {
        let (runtime, _) = make_file_runtime();
        let root = temp_backups_dir();
        let source = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        for day in 1..=12 {
            clone_package(
                &source,
                &root,
                1_000 + day,
                &format!("2026-07-{day:02}T00:00:00Z"),
            );
        }
        std::fs::remove_dir_all(&source).unwrap();
        let fresh = BackupId("lifeweave_backup_1012".into());
        let first = apply_retention(&root, &fresh).unwrap();
        assert_eq!(first.pruned_backup_count, 0);
        assert!(!first.cleanup_pending);

        clone_package(
            &root.join("lifeweave_backup_1012"),
            &root,
            2_000,
            "2026-08-01T00:00:00Z",
        );
        let second = apply_retention(&root, &BackupId("lifeweave_backup_2000".into())).unwrap();
        assert_eq!(second.pruned_backup_count, 1);
        assert!(!root.join("lifeweave_backup_1001").exists());
        assert!(root.join("lifeweave_backup_2000").exists());
        assert_eq!(
            list_backups(&root).unwrap().len(),
            MAX_RESTORABLE_MANAGED_BACKUPS
        );
    }

    #[test]
    fn retention_protects_fresh_even_when_its_timestamp_sorts_oldest() {
        let (runtime, _) = make_file_runtime();
        let root = temp_backups_dir();
        let source = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        for day in 1..=15 {
            clone_package(
                &source,
                &root,
                3_000 + day,
                &format!("2026-08-{day:02}T00:00:00Z"),
            );
        }
        std::fs::remove_dir_all(source).unwrap();
        let fresh_path = root.join("lifeweave_backup_3001");
        let outcome = apply_retention(&root, &BackupId("lifeweave_backup_3001".into())).unwrap();
        assert_eq!(outcome.pruned_backup_count, 3);
        assert!(
            fresh_path.exists(),
            "fresh backup must survive clock rollback"
        );
        assert!(!root.join("lifeweave_backup_3002").exists());
        assert!(!root.join("lifeweave_backup_3004").exists());
        assert_eq!(list_backups(&root).unwrap().len(), 12);
    }

    #[test]
    fn migration_required_counts_but_newer_schema_and_format_are_never_pruned() {
        let (runtime, _) = make_file_runtime();
        let root = temp_backups_dir();
        let source = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        for day in 1..=13 {
            clone_package(
                &source,
                &root,
                4_000 + day,
                &format!("2026-07-{day:02}T00:00:00Z"),
            );
        }
        let newer_schema = clone_package(&source, &root, 5_000, "2026-06-01T00:00:00Z");
        set_package_schema(&newer_schema, 30);
        let newer_format = clone_package(&source, &root, 6_000, "2026-06-02T00:00:00Z");
        let mut manifest = BackupManifest::read_from_dir(&newer_format).unwrap();
        manifest.format_version = 3;
        manifest.write_to_dir(&newer_format).unwrap();
        let malformed = clone_package(&source, &root, 6_001, "2026-06-03T00:00:00Z");
        std::fs::write(malformed.join("manifest.json"), b"unrecognized").unwrap();
        let safety = root.join("_safety");
        let staging = root.join(".staging_6002");
        std::fs::create_dir_all(&safety).unwrap();
        std::fs::create_dir_all(&staging).unwrap();
        std::fs::remove_dir_all(source).unwrap();

        let outcome = apply_retention(&root, &BackupId("lifeweave_backup_4013".into())).unwrap();
        assert_eq!(outcome.pruned_backup_count, 1);
        assert!(newer_schema.exists());
        assert!(newer_format.exists());
        assert!(malformed.exists());
        assert!(safety.exists());
        assert!(staging.exists());
        let listed = list_backups(&root).unwrap();
        assert!(
            listed
                .iter()
                .any(|item| item.compatibility == BackupCompatibility::NewerSchema)
        );
        assert!(
            listed
                .iter()
                .any(|item| item.compatibility == BackupCompatibility::NewerFormat)
        );
    }

    #[test]
    fn cleanup_failure_preserves_fresh_creation_and_reports_pending_truthfully() {
        let (runtime, _) = make_file_runtime();
        let root = temp_backups_dir();
        let source = PathBuf::from(backup_db(&runtime, &root).unwrap().backup_dir);
        for day in 1..=13 {
            clone_package(
                &source,
                &root,
                7_000 + day,
                &format!("2026-07-{day:02}T00:00:00Z"),
            );
        }
        std::fs::remove_dir_all(source).unwrap();
        let fresh = BackupId("lifeweave_backup_7013".into());
        let outcome = apply_retention_with(&root, &fresh, |_| {
            Err(BackupError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "injected deletion failure",
            )))
        })
        .unwrap();
        assert_eq!(outcome.pruned_backup_count, 0);
        assert!(outcome.cleanup_pending);
        assert!(root.join(&fresh.0).exists());
    }

    #[test]
    fn retention_never_starts_when_final_published_verification_fails() {
        let (seed_runtime, _) = make_file_runtime();
        let root = temp_backups_dir();
        let source = PathBuf::from(backup_db(&seed_runtime, &root).unwrap().backup_dir);
        for day in 1..=13 {
            clone_package(
                &source,
                &root,
                8_000 + day,
                &format!("2026-07-{day:02}T00:00:00Z"),
            );
        }
        std::fs::remove_dir_all(source).unwrap();
        let before = list_backups(&root).unwrap();
        VERIFY_FAIL_AT.with(|point| point.set(1));
        let (runtime, _) = make_current_file_runtime();
        assert!(matches!(
            create_managed_backup(&runtime, &root),
            Err(BackupError::PostSwapValidationFailed(_))
        ));
        let after = list_backups(&root).unwrap();
        assert_eq!(after.len(), before.len());
        assert_eq!(
            after
                .iter()
                .map(|item| item.backup_id.clone())
                .collect::<Vec<_>>(),
            before
                .iter()
                .map(|item| item.backup_id.clone())
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn managed_creation_returns_path_free_format_two_summary() {
        let (runtime, _) = make_current_file_runtime();
        let root = temp_backups_dir();
        let result = create_managed_backup(&runtime, &root).unwrap();
        assert_eq!(result.backup.format_version, 2);
        assert_eq!(result.backup.schema_version, 29);
        assert_eq!(result.backup.compatibility, BackupCompatibility::Ready);
        assert_eq!(result.pruned_backup_count, 0);
        assert!(!result.retention_cleanup_pending);
        let json = serde_json::to_string(&result.backup).unwrap();
        assert!(!json.contains("backup_dir"));
        assert!(!json.contains(root.to_string_lossy().as_ref()));
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
