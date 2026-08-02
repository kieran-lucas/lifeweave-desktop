use serde::{Deserialize, Serialize};
use std::path::Path;

use super::BackupError;

pub const SUPPORTED_FORMAT_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct BackupAssetEntry {
    pub relative_path: String,
    pub byte_size: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct BackupManifest {
    pub format_version: u32,
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub db_size_bytes: u64,
    pub db_sha256: String,
    #[serde(default)]
    pub assets: Vec<BackupAssetEntry>,
}

impl BackupManifest {
    pub fn write_to_dir(&self, dir: &Path) -> Result<(), BackupError> {
        let json = serde_json::to_string_pretty(self).map_err(BackupError::ManifestSerialize)?;
        std::fs::write(dir.join("manifest.json"), json).map_err(BackupError::Io)
    }

    pub fn read_from_dir(dir: &Path) -> Result<Self, BackupError> {
        let bytes = std::fs::read(dir.join("manifest.json")).map_err(BackupError::Io)?;
        let manifest: BackupManifest =
            serde_json::from_slice(&bytes).map_err(BackupError::ManifestParse)?;
        if manifest.format_version == 0 || manifest.format_version > SUPPORTED_FORMAT_VERSION {
            return Err(BackupError::UnsupportedFormatVersion(
                manifest.format_version,
            ));
        }
        Ok(manifest)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_dir() -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let p = std::env::temp_dir().join(format!("lw_mfst_{}_{n}", std::process::id()));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    fn sample() -> BackupManifest {
        BackupManifest {
            format_version: 1,
            app_version: "0.0.0".into(),
            schema_version: 2,
            created_at: "2026-08-01T00:00:00Z".into(),
            db_size_bytes: 4096,
            db_sha256: "abc123".into(),
            assets: Vec::new(),
        }
    }

    #[test]
    fn manifest_round_trips_json() {
        let dir = temp_dir();
        let m = sample();
        m.write_to_dir(&dir).unwrap();
        let m2 = BackupManifest::read_from_dir(&dir).unwrap();
        assert_eq!(m.format_version, m2.format_version);
        assert_eq!(m.app_version, m2.app_version);
        assert_eq!(m.schema_version, m2.schema_version);
        assert_eq!(m.created_at, m2.created_at);
        assert_eq!(m.db_size_bytes, m2.db_size_bytes);
        assert_eq!(m.db_sha256, m2.db_sha256);
    }

    #[test]
    fn manifest_rejects_future_format_version() {
        let dir = temp_dir();
        let mut m = sample();
        m.format_version = 99;
        m.write_to_dir(&dir).unwrap();
        let result = BackupManifest::read_from_dir(&dir);
        assert!(
            matches!(result, Err(BackupError::UnsupportedFormatVersion(99))),
            "expected UnsupportedFormatVersion(99), got {result:?}"
        );
    }

    #[test]
    fn manifest_rejects_malformed_json() {
        let dir = temp_dir();
        std::fs::write(dir.join("manifest.json"), b"not json").unwrap();
        let result = BackupManifest::read_from_dir(&dir);
        assert!(
            matches!(result, Err(BackupError::ManifestParse(_))),
            "expected ManifestParse error, got {result:?}"
        );
    }
}
