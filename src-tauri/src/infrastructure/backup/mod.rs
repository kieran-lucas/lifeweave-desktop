// Backup and restore infrastructure: Online Backup API, manifest, checksums,
// staging, candidate management, lifecycle markers, and file swap.
// No direct SQLite file copies while the DB is open. No record content logged.

pub mod checksum;
pub mod engine;
pub mod lifecycle;
pub mod manifest;
pub mod restore;

pub use engine::backup_db;
pub use restore::restore_db;

use crate::infrastructure::sqlite::DbError;

/// Errors from backup and restore operations. Never exposed directly to the
/// frontend — mapped to `IpcError` in `ipc::backup`.
#[derive(Debug)]
pub enum BackupError {
    Db(DbError),
    Io(std::io::Error),
    Checksum {
        expected: String,
        actual: String,
    },
    IntegrityCheckFailed(String),
    ForeignKeyViolation,
    /// A foreign-key check query failed with a database error (not a violation
    /// count). Treated as corruption rather than a clean zero-violation result.
    ForeignKeyCheckQueryError(rusqlite::Error),
    UnsupportedFormatVersion(u32),
    /// The backup's schema version is newer than what this binary can handle.
    SchemaVersionTooNew {
        backup_version: u32,
        supported: u32,
    },
    /// The lifeweave.db file is absent from the backup package.
    MissingBackupFile,
    /// Post-swap integrity or pragma validation failed on the newly installed DB.
    PostSwapValidationFailed(String),
    ManifestParse(serde_json::Error),
    ManifestSerialize(serde_json::Error),
}

impl std::fmt::Display for BackupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BackupError::Db(e) => write!(f, "database error: {e:?}"),
            BackupError::Io(_) => write!(f, "I/O error"),
            BackupError::Checksum { .. } => write!(f, "checksum mismatch"),
            BackupError::IntegrityCheckFailed(_) => write!(f, "integrity check failed"),
            BackupError::ForeignKeyViolation => write!(f, "foreign key violation"),
            BackupError::ForeignKeyCheckQueryError(_) => {
                write!(f, "foreign key check query error")
            }
            BackupError::UnsupportedFormatVersion(v) => {
                write!(f, "unsupported backup format version {v}")
            }
            BackupError::SchemaVersionTooNew {
                backup_version,
                supported,
            } => write!(
                f,
                "backup schema version {backup_version} exceeds supported version {supported}"
            ),
            BackupError::MissingBackupFile => write!(f, "backup package is missing lifeweave.db"),
            BackupError::PostSwapValidationFailed(msg) => {
                write!(f, "post-swap validation failed: {msg}")
            }
            BackupError::ManifestParse(_) => write!(f, "malformed manifest"),
            BackupError::ManifestSerialize(_) => write!(f, "manifest serialization error"),
        }
    }
}

impl std::error::Error for BackupError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            BackupError::Io(e) => Some(e),
            BackupError::ManifestParse(e) | BackupError::ManifestSerialize(e) => Some(e),
            BackupError::ForeignKeyCheckQueryError(e) => Some(e),
            _ => None,
        }
    }
}

/// Returned to the IPC layer after a successful backup.
#[derive(Debug, serde::Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct BackupResult {
    pub backup_dir: String,
    pub db_sha256: String,
    pub schema_version: u32,
    pub created_at: String,
    pub db_size_bytes: u64,
}

/// Returned to the IPC layer after a successful restore.
#[derive(Debug, serde::Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct RestoreResult {
    pub restored_at: String,
    pub schema_version: u32,
}
