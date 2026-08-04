use crate::infrastructure::sqlite::DbError;
use serde::{Deserialize, Serialize};
use std::path::{Component, Path};

pub const PORTABLE_FORMAT_VERSION: u32 = 1;
pub const MAX_PACKAGE_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_TOTAL_ENTRY_BYTES: u64 = 64 * 1024 * 1024;
pub const MAX_ENTRY_COUNT: usize = 262;
pub const MAX_ASSET_COUNT: usize = 256;
pub const MAX_PATH_BYTES: usize = 240;
pub const MAX_README_BYTES: usize = 64 * 1024;
pub const MAX_MANIFEST_BYTES: usize = 256 * 1024;
pub const MAX_CHECKSUMS_BYTES: usize = 256 * 1024;
pub const STAGING_MAX_AGE_SECONDS: u64 = 24 * 60 * 60;
pub const MAX_STALE_CLEANUP_ENTRIES: usize = 1024;
pub const MAX_CANONICAL_BYTES: usize = 1024 * 1024;
pub const MAX_MARKDOWN_BYTES: usize = 1024 * 1024;

#[derive(Debug)]
pub enum PortableError {
    Validation(&'static str),
    NotFound,
    Conflict,
    Unsupported,
    Db(DbError),
    Io(std::io::Error),
    Json(serde_json::Error),
    Zip(zip::result::ZipError),
}

impl From<DbError> for PortableError {
    fn from(value: DbError) -> Self {
        Self::Db(value)
    }
}
impl From<rusqlite::Error> for PortableError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value.into())
    }
}
impl From<std::io::Error> for PortableError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}
impl From<serde_json::Error> for PortableError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}
impl From<zip::result::ZipError> for PortableError {
    fn from(value: zip::result::ZipError) -> Self {
        Self::Zip(value)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum PortableDocumentKind {
    BasicLeaf,
    NarrativeCanvas,
}

impl PortableDocumentKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::BasicLeaf => "basic_leaf",
            Self::NarrativeCanvas => "narrative_canvas",
        }
    }
    pub fn label(self) -> &'static str {
        match self {
            Self::BasicLeaf => "Basic Leaf",
            Self::NarrativeCanvas => "Narrative Canvas",
        }
    }
}

pub fn new_opaque_id() -> String {
    uuid::Uuid::now_v7().to_string()
}
pub fn valid_opaque_id(value: &str) -> bool {
    value.len() == 36
        && uuid::Uuid::parse_str(value)
            .ok()
            .is_some_and(|id| id.get_version() == Some(uuid::Version::SortRand))
}

pub fn safe_archive_path(value: &str) -> bool {
    if value.is_empty()
        || value.len() > MAX_PATH_BYTES
        || value.starts_with('/')
        || value.contains('\\')
        || value.chars().any(|ch| ch == '\0' || ch.is_control())
    {
        return false;
    }
    let path = Path::new(value);
    !path.is_absolute()
        && path
            .components()
            .all(|part| matches!(part, Component::Normal(_)))
}

const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

pub fn safe_file_stem(value: &str) -> String {
    let cleaned: String = value
        .chars()
        .filter(|ch| !ch.is_control())
        .map(|ch| {
            if matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
                '_'
            } else {
                ch
            }
        })
        .take(120)
        .collect();
    let stem = cleaned.trim_matches(|ch: char| ch == '.' || ch.is_whitespace());
    let primary = stem.split('.').next().unwrap_or(stem).to_ascii_uppercase();
    if stem.is_empty() || RESERVED.contains(&primary.as_str()) {
        "lifeweave-document".into()
    } else {
        stem.into()
    }
}

pub fn safe_original_name(value: &str) -> String {
    let basename = value.rsplit(['/', '\\']).next().unwrap_or("");
    let cleaned: String = basename
        .chars()
        .filter(|ch| !ch.is_control())
        .map(|ch| {
            if matches!(ch, ':' | '*' | '?' | '"' | '<' | '>' | '|') {
                '_'
            } else {
                ch
            }
        })
        .take(255)
        .collect();
    let trimmed = cleaned.trim_matches(|ch: char| ch == '.' || ch.is_whitespace());
    let primary = trimmed
        .split('.')
        .next()
        .unwrap_or(trimmed)
        .to_ascii_uppercase();
    if trimmed.is_empty() || RESERVED.contains(&primary.as_str()) {
        "image".into()
    } else {
        trimmed.into()
    }
}

pub fn sha256(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    format!("{:x}", Sha256::digest(bytes))
}

pub fn valid_sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub fn staging_is_stale(modified: std::time::SystemTime, now: std::time::SystemTime) -> bool {
    now.duration_since(modified)
        .is_ok_and(|age| age.as_secs() > STAGING_MAX_AGE_SECONDS)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn paths_and_windows_names_are_bounded() {
        for bad in [
            "",
            "../evil",
            "/absolute",
            "C:\\evil",
            "a\\b",
            "a\0b",
            "a/../b",
        ] {
            assert!(!safe_archive_path(bad), "{bad}");
        }
        assert!(safe_archive_path("content/document.json"));
        assert_eq!(safe_file_stem("CON.txt"), "lifeweave-document");
        assert_eq!(safe_file_stem("Tài liệu"), "Tài liệu");
    }

    #[test]
    fn stale_threshold_is_strictly_older_than_twenty_four_hours() {
        let now = std::time::SystemTime::UNIX_EPOCH
            + std::time::Duration::from_secs(STAGING_MAX_AGE_SECONDS + 10);
        assert!(!staging_is_stale(
            now - std::time::Duration::from_secs(STAGING_MAX_AGE_SECONDS),
            now
        ));
        assert!(staging_is_stale(
            now - std::time::Duration::from_secs(STAGING_MAX_AGE_SECONDS + 1),
            now
        ));
    }
}
