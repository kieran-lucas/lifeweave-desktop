// Backup and restore infrastructure: Online Backup API, manifest, checksums,
// staging, and file swap. No direct SQLite file copies; no record content logged.

pub mod checksum;
pub mod engine;
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
    Checksum { expected: String, actual: String },
    IntegrityCheckFailed(String),
    ForeignKeyViolation,
    UnsupportedFormatVersion(u32),
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
            BackupError::UnsupportedFormatVersion(v) => {
                write!(f, "unsupported backup format version {v}")
            }
            BackupError::ManifestParse(_) => write!(f, "malformed manifest"),
            BackupError::ManifestSerialize(_) => write!(f, "manifest serialization error"),
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
