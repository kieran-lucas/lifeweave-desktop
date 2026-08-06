//! Bounded Life Branch Interchange domain limits, identity, and errors.
//!
//! Path safety, opaque staging identity, SHA-256 helpers, and safe file naming are reused from
//! `crate::portable::domain` rather than reimplemented: the two packages share one archive threat
//! model and one app-data staging discipline, and duplicating those primitives would create two
//! places for a security fix to land.

use crate::infrastructure::sqlite::DbError;
use serde::{Deserialize, Serialize};

pub use crate::portable::domain::{
    MAX_PATH_BYTES, STAGING_MAX_AGE_SECONDS, new_opaque_id, safe_archive_path, safe_file_stem,
    safe_original_name, sha256, staging_is_stale, valid_opaque_id, valid_sha256,
};

pub const BRANCH_FORMAT: &str = "lifeweave_branch_package";
pub const BRANCH_FORMAT_VERSION: u32 = 1;
pub const BRANCH_EXTENSION: &str = "lifeweave-branch.zip";
pub const ASSET_POLICY: &str = "privacy_sanitized_visual_v1";
pub const TREE_PATH: &str = "content/tree.json";

pub const MAX_PACKAGE_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_TOTAL_ENTRY_BYTES: u64 = 64 * 1024 * 1024;
pub const MAX_NODES: usize = 500;
pub const MAX_DOCUMENTS: usize = 500;
pub const MAX_ASSETS: usize = 256;
pub const MAX_TAGS: usize = 256;
pub const MAX_INTERNAL_LINKS: usize = 5_000;
pub const MAX_RELATIVE_DEPTH: u32 = 128;
pub const MAX_CANONICAL_BYTES: usize = 1024 * 1024;
pub const MAX_MARKDOWN_BYTES: usize = 1024 * 1024;
pub const MAX_TREE_BYTES: usize = 4 * 1024 * 1024;
pub const MAX_MANIFEST_BYTES: usize = 256 * 1024;
pub const MAX_CHECKSUMS_BYTES: usize = 256 * 1024;
pub const MAX_README_BYTES: usize = 64 * 1024;

/// `4 fixed + 2 x 500 documents + 256 assets`. The four fixed entries are `manifest.json`,
/// `checksums.json`, `README.md`, and `content/tree.json`.
pub const MAX_ENTRY_COUNT: usize = 4 + 2 * MAX_DOCUMENTS + MAX_ASSETS;

pub const MAX_STALE_CLEANUP_ENTRIES: usize = 1024;

#[derive(Debug)]
pub enum LifeBranchError {
    Validation(&'static str),
    NotFound,
    Conflict,
    Stale,
    Unsupported,
    Db(DbError),
    Io(std::io::Error),
    Json(serde_json::Error),
    Zip(zip::result::ZipError),
}

impl From<DbError> for LifeBranchError {
    fn from(value: DbError) -> Self {
        Self::Db(value)
    }
}
impl From<rusqlite::Error> for LifeBranchError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value.into())
    }
}
impl From<std::io::Error> for LifeBranchError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}
impl From<serde_json::Error> for LifeBranchError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}
impl From<zip::result::ZipError> for LifeBranchError {
    fn from(value: zip::result::ZipError) -> Self {
        Self::Zip(value)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum LifeBranchDocumentKind {
    BasicLeaf,
    NarrativeCanvas,
}

impl LifeBranchDocumentKind {
    pub fn label(self) -> &'static str {
        match self {
            Self::BasicLeaf => "Basic Leaf",
            Self::NarrativeCanvas => "Narrative Canvas",
        }
    }
}

/// Package-local keys are the *source* row identities. They are provenance only and never become
/// local authority, but they must still be well-formed so a hostile package cannot smuggle a path
/// fragment or control character through a key.
pub fn valid_package_key(value: &str) -> bool {
    value.len() == 36 && uuid::Uuid::parse_str(value).is_ok()
}

/// The Life root may legitimately appear as a *destination*, never as packaged content.
pub fn valid_local_node_id(value: &str) -> bool {
    crate::life::domain::valid_id(value)
}

pub fn document_canonical_path(document_key: &str) -> String {
    format!("content/documents/{document_key}.json")
}

pub fn document_markdown_path(document_key: &str) -> String {
    format!("content/documents/{document_key}.md")
}

pub fn asset_extension(mime: &str) -> &'static str {
    match mime {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "invalid",
    }
}

pub fn asset_path(asset_key: &str, mime: &str) -> String {
    format!("assets/{asset_key}.{}", asset_extension(mime))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entry_ceiling_matches_the_documented_arithmetic() {
        assert_eq!(MAX_ENTRY_COUNT, 1_260);
        assert_eq!(MAX_ENTRY_COUNT, 4 + 2 * 500 + 256);
    }

    #[test]
    fn package_keys_reject_paths_controls_and_non_uuids() {
        assert!(valid_package_key("00000000-0000-7000-8000-000000000001"));
        for bad in [
            "",
            "life-root",
            "../escape",
            "00000000-0000-7000-8000-00000000000",
            "00000000-0000-7000-8000-0000000000011",
            "0000000000007000800000000000000\u{1}001",
            "assets/00000000-0000-7000-8000-000000000001",
        ] {
            assert!(!valid_package_key(bad), "{bad:?}");
        }
    }

    #[test]
    fn packaged_paths_are_safe_and_reject_unsupported_mime() {
        let key = "00000000-0000-7000-8000-000000000001";
        assert_eq!(
            document_canonical_path(key),
            "content/documents/00000000-0000-7000-8000-000000000001.json"
        );
        assert_eq!(
            document_markdown_path(key),
            "content/documents/00000000-0000-7000-8000-000000000001.md"
        );
        assert!(safe_archive_path(&document_canonical_path(key)));
        assert!(safe_archive_path(&document_markdown_path(key)));
        for mime in ["image/png", "image/jpeg", "image/webp", "image/gif"] {
            assert!(safe_archive_path(&asset_path(key, mime)));
            assert_ne!(asset_extension(mime), "invalid");
        }
        assert_eq!(asset_extension("image/svg+xml"), "invalid");
        assert_eq!(asset_extension("text/html"), "invalid");
    }

    #[test]
    fn the_life_root_is_a_valid_destination_but_never_a_valid_package_key() {
        assert!(valid_local_node_id(crate::life::domain::ROOT_ID));
        assert!(!valid_package_key(crate::life::domain::ROOT_ID));
    }
}
