//! Life Tree Package manifest, checksum inventory, and README.
//!
//! The manifest is descriptive metadata plus the document and asset descriptors. It is never the
//! structural authority â€” `content/tree.json` is â€” and every count it declares is cross-checked
//! against the verified tree before a package is accepted.

use super::domain::{self, LifeTreeDocumentKind, LifeTreeError};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeProducer {
    pub application: String,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeNarrativeMetadata {
    pub template_id: String,
    pub template_version: i32,
    pub visual_world_id: String,
    pub scene_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeDocumentDescriptor {
    pub kind: LifeTreeDocumentKind,
    pub key: String,
    pub life_node_key: String,
    pub schema_version: i32,
    pub title: String,
    pub canonical_path: String,
    pub markdown_path: String,
    pub narrative: Option<TreeNarrativeMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeAssetDescriptor {
    pub key: String,
    pub path: String,
    pub original_name: String,
    pub mime: String,
    pub byte_size: u64,
    pub width: u32,
    pub height: u32,
    pub sha256: String,
    /// `(document key, reference count)` pairs, ascending by document key.
    pub references: Vec<TreeAssetReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeAssetReference {
    pub document_key: String,
    pub reference_count: u32,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeCounts {
    pub top_level_nodes: u32,
    pub nodes: u32,
    pub branches: u32,
    pub basic_leaf_documents: u32,
    pub narrative_documents: u32,
    pub empty_leaves: u32,
    pub documents: u32,
    pub assets: u32,
    pub tags: u32,
    pub internal_links: u32,
}

/// Safe, non-identifying counts of everything deliberately left behind. No title, content, path, or
/// identifier ever appears here.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeOmissions {
    pub archived_nodes: u32,
    pub drafts: u32,
    pub pins: u32,
    pub task_references: u32,
    pub focus_plan_references: u32,
    pub outgoing_cross_boundary_links: u32,
    pub incoming_cross_boundary_links: u32,
    pub archived_tag_assignments: u32,
}

impl TreeOmissions {
    pub fn total(&self) -> u32 {
        self.archived_nodes
            + self.drafts
            + self.pins
            + self.task_references
            + self.focus_plan_references
            + self.outgoing_cross_boundary_links
            + self.incoming_cross_boundary_links
            + self.archived_tag_assignments
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeManifest {
    pub format: String,
    pub format_version: u32,
    pub producer: TreeProducer,
    pub exported_at: String,
    /// Informational provenance only. Compatibility is decided by `format_version` and the
    /// supported document schemas, never by local SQLite schema equality.
    pub source_schema_version: u32,
    pub tree_path: String,
    pub asset_policy: String,
    pub counts: TreeCounts,
    pub maximum_depth: u32,
    pub omissions: TreeOmissions,
    pub documents: Vec<TreeDocumentDescriptor>,
    pub assets: Vec<TreeAssetDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeChecksumEntry {
    pub path: String,
    pub byte_size: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeChecksums {
    pub format_version: u32,
    pub algorithm: String,
    pub entries: Vec<TreeChecksumEntry>,
}

fn pretty_lf<T: Serialize>(value: &T) -> Result<Vec<u8>, LifeTreeError> {
    let mut bytes = serde_json::to_vec_pretty(value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

fn invalid(message: &'static str) -> LifeTreeError {
    LifeTreeError::Validation(message)
}

impl TreeManifest {
    pub fn bytes(&self) -> Result<Vec<u8>, LifeTreeError> {
        pretty_lf(self)
    }

    pub fn parse(bytes: &[u8]) -> Result<Self, LifeTreeError> {
        if bytes.len() > domain::MAX_MANIFEST_BYTES {
            return Err(invalid("Tree manifest exceeds 256 KiB."));
        }
        Ok(serde_json::from_slice(bytes)?)
    }

    pub fn validate(&self) -> Result<(), LifeTreeError> {
        if self.format != domain::TREE_FORMAT || self.format_version != domain::TREE_FORMAT_VERSION
        {
            return Err(LifeTreeError::Unsupported);
        }
        if self.producer.application != "lifeweave-desktop"
            || self.tree_path != domain::TREE_PATH
            || self.asset_policy != domain::ASSET_POLICY
            || chrono::DateTime::parse_from_rfc3339(&self.exported_at).is_err()
            || self.maximum_depth > domain::MAX_RELATIVE_DEPTH
        {
            return Err(invalid("Tree manifest metadata is invalid."));
        }
        if self.counts.top_level_nodes == 0
            || self.counts.top_level_nodes > self.counts.nodes
            || self.counts.nodes as usize > domain::MAX_NODES
            || self.counts.documents as usize > domain::MAX_DOCUMENTS
            || self.counts.assets as usize > domain::MAX_ASSETS
            || self.counts.tags as usize > domain::MAX_TAGS
            || self.counts.internal_links as usize > domain::MAX_INTERNAL_LINKS
            || self.counts.documents
                != self.counts.basic_leaf_documents + self.counts.narrative_documents
            || self.counts.nodes
                != self.counts.branches
                    + self.counts.basic_leaf_documents
                    + self.counts.narrative_documents
                    + self.counts.empty_leaves
            || self.documents.len() as u32 != self.counts.documents
            || self.assets.len() as u32 != self.counts.assets
        {
            return Err(invalid("Tree manifest counts are inconsistent."));
        }

        let mut previous: Option<&str> = None;
        let mut node_keys = BTreeSet::new();
        for document in &self.documents {
            if previous.is_some_and(|prior| prior >= document.key.as_str())
                || !domain::valid_package_key(&document.key)
                || !domain::valid_package_key(&document.life_node_key)
                || !node_keys.insert(document.life_node_key.clone())
                || document.schema_version != 1
                || document.canonical_path != domain::document_canonical_path(&document.key)
                || document.markdown_path != domain::document_markdown_path(&document.key)
                || document.title.chars().count() > 200
                || document.title.chars().any(char::is_control)
            {
                return Err(invalid("Tree manifest document descriptor is invalid."));
            }
            match (document.kind, &document.narrative) {
                (LifeTreeDocumentKind::BasicLeaf, None) => {}
                (LifeTreeDocumentKind::NarrativeCanvas, Some(value))
                    if value.template_version == 1
                        && crate::narrative::templates::NarrativeTemplateId::parse(
                            &value.template_id,
                        )
                        .is_some()
                        && crate::narrative::visual_worlds::NarrativeVisualWorldId::parse(
                            &value.visual_world_id,
                        )
                        .is_some()
                        && (1..=20).contains(&value.scene_count) => {}
                _ => return Err(invalid("Tree manifest narrative metadata is invalid.")),
            }
            previous = Some(&document.key);
        }

        let document_keys: BTreeSet<&str> = self
            .documents
            .iter()
            .map(|value| value.key.as_str())
            .collect();
        let mut previous: Option<&str> = None;
        let mut paths = BTreeSet::new();
        for asset in &self.assets {
            if previous.is_some_and(|prior| prior >= asset.key.as_str())
                || !domain::valid_package_key(&asset.key)
                || !matches!(
                    asset.mime.as_str(),
                    "image/png" | "image/jpeg" | "image/webp" | "image/gif"
                )
                || asset.path != domain::asset_path(&asset.key, &asset.mime)
                || !domain::safe_archive_path(&asset.path)
                || !paths.insert(asset.path.clone())
                || asset.original_name.is_empty()
                || domain::safe_original_name(&asset.original_name) != asset.original_name
                || asset.byte_size == 0
                || asset.byte_size > crate::document::domain::MAX_ASSET_BYTES as u64
                || asset.width == 0
                || asset.height == 0
                || asset.width > 12000
                || asset.height > 12000
                || !domain::valid_sha256(&asset.sha256)
                || asset.references.is_empty()
            {
                return Err(invalid("Tree manifest asset descriptor is invalid."));
            }
            let mut prior_document: Option<&str> = None;
            for reference in &asset.references {
                if prior_document.is_some_and(|prior| prior >= reference.document_key.as_str())
                    || !document_keys.contains(reference.document_key.as_str())
                    || reference.reference_count == 0
                {
                    return Err(invalid("Tree manifest asset reference is invalid."));
                }
                prior_document = Some(&reference.document_key);
            }
            previous = Some(&asset.key);
        }
        Ok(())
    }
}

impl TreeChecksums {
    pub fn from_entries<'a>(entries: impl Iterator<Item = (&'a String, &'a Vec<u8>)>) -> Self {
        Self {
            format_version: 1,
            algorithm: "sha256".into(),
            entries: entries
                .map(|(path, bytes)| TreeChecksumEntry {
                    path: path.clone(),
                    byte_size: bytes.len() as u64,
                    sha256: domain::sha256(bytes),
                })
                .collect(),
        }
    }
    pub fn bytes(&self) -> Result<Vec<u8>, LifeTreeError> {
        pretty_lf(self)
    }
    pub fn parse(bytes: &[u8]) -> Result<Self, LifeTreeError> {
        if bytes.len() > domain::MAX_CHECKSUMS_BYTES {
            return Err(invalid("Tree checksum inventory exceeds 256 KiB."));
        }
        Ok(serde_json::from_slice(bytes)?)
    }
    pub fn validate(&self) -> Result<(), LifeTreeError> {
        if self.format_version != 1 || self.algorithm != "sha256" {
            return Err(LifeTreeError::Unsupported);
        }
        if self.entries.len() > domain::MAX_ENTRY_COUNT {
            return Err(invalid("Tree checksum inventory is too large."));
        }
        let mut previous: Option<&str> = None;
        for entry in &self.entries {
            if !domain::safe_archive_path(&entry.path)
                || entry.path == "checksums.json"
                || previous.is_some_and(|prior| prior >= entry.path.as_str())
                || !domain::valid_sha256(&entry.sha256)
            {
                return Err(invalid("Tree checksum inventory is invalid."));
            }
            previous = Some(&entry.path);
        }
        Ok(())
    }
}

fn scalar(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_control() { ' ' } else { ch })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn readme(manifest: &TreeManifest) -> Vec<u8> {
    format!(
        "# Lifeweave Life tree package\n\n\
         - Top-level nodes: {}\n\
         - Nodes: {}\n\
         - Documents: {} ({} Basic Leaf, {} Narrative Canvas)\n\
         - Assets: {}\n\
         - Tags: {}\n\
         - Internal links: {}\n\
         - Exported by: {} {}\n\
         - Package format: {} v{}\n\n\
         ## Files\n\
         - content/tree.json â€” structural authority for this ordered forest\n\
         - content/documents/*.json â€” canonical document authority\n\
         - content/documents/*.md â€” human-readable fallback\n\
         - assets/ â€” privacy-sanitized local visual payloads\n\
         - manifest.json â€” package metadata\n\
         - checksums.json â€” SHA-256 integrity data\n\n\
         ## Important\n\
         This package contains the complete active non-root Life forest from one snapshot. It is\n\
         not a full Lifeweave backup. Importing creates new roots with new local identities; the identifiers in this package\n\
         are provenance only and never overwrite or merge anything you already have.\n\
         Canonical JSON is the authority and Markdown is a fallback projection.\n\
         Archived nodes, drafts, revision and operation history, pins, navigation state, Tasks,\n\
         Focus Plans, Saved Views, analytics, settings, and cross-boundary links are not\n\
         transferred.\n",
        manifest.counts.top_level_nodes,
        manifest.counts.nodes,
        manifest.counts.documents,
        manifest.counts.basic_leaf_documents,
        manifest.counts.narrative_documents,
        manifest.counts.assets,
        manifest.counts.tags,
        manifest.counts.internal_links,
        scalar(&manifest.producer.application),
        scalar(&manifest.producer.app_version),
        scalar(&manifest.format),
        manifest.format_version,
    )
    .into_bytes()
}
