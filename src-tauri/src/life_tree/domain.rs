//! Bounded Life Tree Interchange domain limits, identity, and errors.
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

pub const TREE_FORMAT: &str = "lifeweave_tree_package";
pub const TREE_FORMAT_VERSION: u32 = 1;
pub const TREE_EXTENSION: &str = "lifeweave-tree.zip";
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
pub enum LifeTreeError {
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

impl From<DbError> for LifeTreeError {
    fn from(value: DbError) -> Self {
        Self::Db(value)
    }
}
impl From<rusqlite::Error> for LifeTreeError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value.into())
    }
}
impl From<std::io::Error> for LifeTreeError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}
impl From<serde_json::Error> for LifeTreeError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}
impl From<zip::result::ZipError> for LifeTreeError {
    fn from(value: zip::result::ZipError) -> Self {
        Self::Zip(value)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum LifeTreeDocumentKind {
    BasicLeaf,
    NarrativeCanvas,
}

impl LifeTreeDocumentKind {
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
