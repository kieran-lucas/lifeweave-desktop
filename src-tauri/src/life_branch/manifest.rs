//! Life Branch Package manifest, checksum inventory, and README.
//!
//! The manifest is descriptive metadata plus the document and asset descriptors. It is never the
//! structural authority — `content/tree.json` is — and every count it declares is cross-checked
//! against the verified tree before a package is accepted.

use super::domain::{self, LifeBranchDocumentKind, LifeBranchError};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchProducer {
    pub application: String,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchNarrativeMetadata {
    pub template_id: String,
    pub template_version: i32,
    pub visual_world_id: String,
    pub scene_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchDocumentDescriptor {
    pub kind: LifeBranchDocumentKind,
    pub key: String,
    pub life_node_key: String,
    pub schema_version: i32,
    pub title: String,
    pub canonical_path: String,
    pub markdown_path: String,
    pub narrative: Option<BranchNarrativeMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchAssetDescriptor {
    pub key: String,
    pub path: String,
    pub original_name: String,
    pub mime: String,
    pub byte_size: u64,
    pub width: u32,
    pub height: u32,
    pub sha256: String,
    /// `(document key, reference count)` pairs, ascending by document key.
    pub references: Vec<BranchAssetReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchAssetReference {
    pub document_key: String,
    pub reference_count: u32,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchCounts {
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
pub struct BranchOmissions {
    pub archived_nodes: u32,
    pub drafts: u32,
    pub pins: u32,
    pub task_references: u32,
    pub focus_plan_references: u32,
    pub outgoing_cross_boundary_links: u32,
    pub incoming_cross_boundary_links: u32,
    pub archived_tag_assignments: u32,
}

impl BranchOmissions {
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
pub struct BranchManifest {
    pub format: String,
    pub format_version: u32,
    pub producer: BranchProducer,
    pub exported_at: String,
    /// Informational provenance only. Compatibility is decided by `format_version` and the
    /// supported document schemas, never by local SQLite schema equality.
    pub source_schema_version: u32,
    pub source_root_key: String,
    pub source_root_title: String,
    pub tree_path: String,
    pub asset_policy: String,
    pub counts: BranchCounts,
    pub maximum_depth: u32,
    pub omissions: BranchOmissions,
    pub documents: Vec<BranchDocumentDescriptor>,
    pub assets: Vec<BranchAssetDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchChecksumEntry {
    pub path: String,
    pub byte_size: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchChecksums {
    pub format_version: u32,
    pub algorithm: String,
    pub entries: Vec<BranchChecksumEntry>,
}

fn pretty_lf<T: Serialize>(value: &T) -> Result<Vec<u8>, LifeBranchError> {
    let mut bytes = serde_json::to_vec_pretty(value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

fn invalid(message: &'static str) -> LifeBranchError {
    LifeBranchError::Validation(message)
}

impl BranchManifest {
    pub fn bytes(&self) -> Result<Vec<u8>, LifeBranchError> {
        pretty_lf(self)
    }

    pub fn parse(bytes: &[u8]) -> Result<Self, LifeBranchError> {
        if bytes.len() > domain::MAX_MANIFEST_BYTES {
            return Err(invalid("Branch manifest exceeds 256 KiB."));
        }
        Ok(serde_json::from_slice(bytes)?)
    }

    pub fn validate(&self) -> Result<(), LifeBranchError> {
        if self.format != domain::BRANCH_FORMAT
            || self.format_version != domain::BRANCH_FORMAT_VERSION
        {
            return Err(LifeBranchError::Unsupported);
        }
        if self.producer.application != "lifeweave-desktop"
            || self.tree_path != domain::TREE_PATH
            || self.asset_policy != domain::ASSET_POLICY
            || !domain::valid_package_key(&self.source_root_key)
            || !crate::life::domain::valid_title(&self.source_root_title)
            || chrono::DateTime::parse_from_rfc3339(&self.exported_at).is_err()
            || self.maximum_depth > domain::MAX_RELATIVE_DEPTH
        {
            return Err(invalid("Branch manifest metadata is invalid."));
        }
        if self.counts.nodes as usize > domain::MAX_NODES
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
            return Err(invalid("Branch manifest counts are inconsistent."));
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
                return Err(invalid("Branch manifest document descriptor is invalid."));
            }
            match (document.kind, &document.narrative) {
                (LifeBranchDocumentKind::BasicLeaf, None) => {}
                (LifeBranchDocumentKind::NarrativeCanvas, Some(value))
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
                _ => return Err(invalid("Branch manifest narrative metadata is invalid.")),
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
                return Err(invalid("Branch manifest asset descriptor is invalid."));
            }
            let mut prior_document: Option<&str> = None;
            for reference in &asset.references {
                if prior_document.is_some_and(|prior| prior >= reference.document_key.as_str())
                    || !document_keys.contains(reference.document_key.as_str())
                    || reference.reference_count == 0
                {
                    return Err(invalid("Branch manifest asset reference is invalid."));
                }
                prior_document = Some(&reference.document_key);
            }
            previous = Some(&asset.key);
        }
        Ok(())
    }
}

impl BranchChecksums {
    pub fn from_entries<'a>(entries: impl Iterator<Item = (&'a String, &'a Vec<u8>)>) -> Self {
        Self {
            format_version: 1,
            algorithm: "sha256".into(),
            entries: entries
                .map(|(path, bytes)| BranchChecksumEntry {
                    path: path.clone(),
                    byte_size: bytes.len() as u64,
                    sha256: domain::sha256(bytes),
                })
                .collect(),
        }
    }
    pub fn bytes(&self) -> Result<Vec<u8>, LifeBranchError> {
        pretty_lf(self)
    }
    pub fn parse(bytes: &[u8]) -> Result<Self, LifeBranchError> {
        if bytes.len() > domain::MAX_CHECKSUMS_BYTES {
            return Err(invalid("Branch checksum inventory exceeds 256 KiB."));
        }
        Ok(serde_json::from_slice(bytes)?)
    }
    pub fn validate(&self) -> Result<(), LifeBranchError> {
        if self.format_version != 1 || self.algorithm != "sha256" {
            return Err(LifeBranchError::Unsupported);
        }
        if self.entries.len() > domain::MAX_ENTRY_COUNT {
            return Err(invalid("Branch checksum inventory is too large."));
        }
        let mut previous: Option<&str> = None;
        for entry in &self.entries {
            if !domain::safe_archive_path(&entry.path)
                || entry.path == "checksums.json"
                || previous.is_some_and(|prior| prior >= entry.path.as_str())
                || !domain::valid_sha256(&entry.sha256)
            {
                return Err(invalid("Branch checksum inventory is invalid."));
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

pub fn readme(manifest: &BranchManifest) -> Vec<u8> {
    format!(
        "# Lifeweave Life branch package\n\n\
         - Branch: {}\n\
         - Nodes: {}\n\
         - Documents: {} ({} Basic Leaf, {} Narrative Canvas)\n\
         - Assets: {}\n\
         - Tags: {}\n\
         - Internal links: {}\n\
         - Exported by: {} {}\n\
         - Package format: {} v{}\n\n\
         ## Files\n\
         - content/tree.json — structural authority for this branch\n\
         - content/documents/*.json — canonical document authority\n\
         - content/documents/*.md — human-readable fallback\n\
         - assets/ — privacy-sanitized local visual payloads\n\
         - manifest.json — package metadata\n\
         - checksums.json — SHA-256 integrity data\n\n\
         ## Important\n\
         This package contains one Life branch. It is not a full Lifeweave backup.\n\
         Importing creates a new branch with new local identities; the identifiers in this package\n\
         are provenance only and never overwrite or merge anything you already have.\n\
         Canonical JSON is the authority and Markdown is a fallback projection.\n\
         Archived nodes, drafts, revision and operation history, pins, navigation state, Tasks,\n\
         Focus Plans, Saved Views, analytics, settings, and links leaving this branch are not\n\
         transferred.\n",
        scalar(&manifest.source_root_title),
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

#[cfg(test)]
mod tests {
    use super::*;

    fn key(n: u8) -> String {
        format!("00000000-0000-7000-8000-0000000000{n:02}")
    }

    pub(super) fn fixture() -> BranchManifest {
        BranchManifest {
            format: domain::BRANCH_FORMAT.into(),
            format_version: 1,
            producer: BranchProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-07T00:00:00Z".into(),
            source_schema_version: 25,
            source_root_key: key(1),
            source_root_title: "Nghiên cứu".into(),
            tree_path: domain::TREE_PATH.into(),
            asset_policy: domain::ASSET_POLICY.into(),
            counts: BranchCounts {
                nodes: 4,
                branches: 1,
                basic_leaf_documents: 1,
                narrative_documents: 1,
                empty_leaves: 1,
                documents: 2,
                assets: 0,
                tags: 0,
                internal_links: 1,
            },
            maximum_depth: 1,
            omissions: BranchOmissions::default(),
            documents: vec![
                BranchDocumentDescriptor {
                    kind: LifeBranchDocumentKind::BasicLeaf,
                    key: key(20),
                    life_node_key: key(2),
                    schema_version: 1,
                    title: "Leaf".into(),
                    canonical_path: domain::document_canonical_path(&key(20)),
                    markdown_path: domain::document_markdown_path(&key(20)),
                    narrative: None,
                },
                BranchDocumentDescriptor {
                    kind: LifeBranchDocumentKind::NarrativeCanvas,
                    key: key(30),
                    life_node_key: key(3),
                    schema_version: 1,
                    title: "Canvas".into(),
                    canonical_path: domain::document_canonical_path(&key(30)),
                    markdown_path: domain::document_markdown_path(&key(30)),
                    narrative: Some(BranchNarrativeMetadata {
                        template_id: "knowledge_dossier".into(),
                        template_version: 1,
                        visual_world_id: "paper".into(),
                        scene_count: 3,
                    }),
                },
            ],
            assets: vec![],
        }
    }

    #[test]
    fn round_trips_and_rejects_unknown_fields() {
        let value = fixture();
        let bytes = value.bytes().unwrap();
        assert_eq!(BranchManifest::parse(&bytes).unwrap(), value);
        value.validate().unwrap();
        let mut json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        json["extra"] = serde_json::json!(true);
        assert!(BranchManifest::parse(&serde_json::to_vec(&json).unwrap()).is_err());
    }

    #[test]
    fn locked_identity_fields_reject_drift() {
        for mutate in [
            (|m: &mut BranchManifest| m.format = "lifeweave_portable_package".into())
                as fn(&mut BranchManifest),
            |m| m.format_version = 2,
        ] {
            let mut value = fixture();
            mutate(&mut value);
            assert!(matches!(
                value.validate(),
                Err(LifeBranchError::Unsupported)
            ));
        }
        for mutate in [
            (|m: &mut BranchManifest| m.producer.application = "other".into())
                as fn(&mut BranchManifest),
            |m| m.tree_path = "tree.json".into(),
            |m| m.asset_policy = "original_bytes".into(),
            |m| m.source_root_key = "life-root".into(),
            |m| m.source_root_title = "  ".into(),
            |m| m.exported_at = "yesterday".into(),
            |m| m.maximum_depth = domain::MAX_RELATIVE_DEPTH + 1,
        ] {
            let mut value = fixture();
            mutate(&mut value);
            assert!(value.validate().is_err());
        }
    }

    #[test]
    fn inconsistent_counts_are_rejected() {
        for mutate in [
            (|m: &mut BranchManifest| m.counts.nodes = 9) as fn(&mut BranchManifest),
            |m| m.counts.documents = 3,
            |m| m.counts.basic_leaf_documents = 2,
            |m| m.counts.assets = 1,
            |m| m.counts.branches = 0,
            |m| m.counts.nodes = domain::MAX_NODES as u32 + 1,
            |m| m.counts.internal_links = domain::MAX_INTERNAL_LINKS as u32 + 1,
        ] {
            let mut value = fixture();
            mutate(&mut value);
            assert!(value.validate().is_err());
        }
    }

    #[test]
    fn document_descriptors_must_be_sorted_unique_and_path_consistent() {
        let mut unsorted = fixture();
        unsorted.documents.swap(0, 1);
        assert!(unsorted.validate().is_err());

        let mut shared_node = fixture();
        shared_node.documents[1].life_node_key = shared_node.documents[0].life_node_key.clone();
        assert!(
            shared_node.validate().is_err(),
            "one node cannot own two documents"
        );

        let mut bad_path = fixture();
        bad_path.documents[0].canonical_path = "content/documents/other.json".into();
        assert!(bad_path.validate().is_err());

        let mut basic_with_narrative = fixture();
        basic_with_narrative.documents[0].narrative =
            basic_with_narrative.documents[1].narrative.clone();
        assert!(basic_with_narrative.validate().is_err());

        let mut narrative_without = fixture();
        narrative_without.documents[1].narrative = None;
        assert!(narrative_without.validate().is_err());

        for mutate in [
            (|d: &mut BranchNarrativeMetadata| d.template_id = "unknown".into())
                as fn(&mut BranchNarrativeMetadata),
            |d| d.template_version = 2,
            |d| d.visual_world_id = "custom".into(),
            |d| d.scene_count = 0,
            |d| d.scene_count = 21,
        ] {
            let mut value = fixture();
            mutate(value.documents[1].narrative.as_mut().unwrap());
            assert!(value.validate().is_err());
        }
    }

    #[test]
    fn asset_descriptors_are_sorted_path_consistent_and_reference_real_documents() {
        let mut value = fixture();
        value.counts.assets = 1;
        value.assets = vec![BranchAssetDescriptor {
            key: key(60),
            path: domain::asset_path(&key(60), "image/png"),
            original_name: "pixel.png".into(),
            mime: "image/png".into(),
            byte_size: 70,
            width: 1,
            height: 1,
            sha256: "a".repeat(64),
            references: vec![BranchAssetReference {
                document_key: key(20),
                reference_count: 2,
            }],
        }];
        value.validate().unwrap();

        for mutate in [
            (|a: &mut BranchAssetDescriptor| a.path = "assets/evil.png".into())
                as fn(&mut BranchAssetDescriptor),
            |a| a.mime = "image/svg+xml".into(),
            |a| a.byte_size = 0,
            |a| a.width = 0,
            |a| a.height = 12001,
            |a| a.sha256 = "A".repeat(64),
            |a| a.original_name = "../CON.png".into(),
            |a| a.references = vec![],
            |a| a.references[0].reference_count = 0,
            |a| a.references[0].document_key = "00000000-0000-7000-8000-000000000099".into(),
        ] {
            let mut invalid = value.clone();
            mutate(&mut invalid.assets[0]);
            assert!(invalid.validate().is_err());
        }
    }

    #[test]
    fn checksums_are_sorted_strict_and_exclude_themselves() {
        let entries = std::collections::BTreeMap::from([
            ("README.md".into(), b"readme".to_vec()),
            ("manifest.json".into(), b"{}".to_vec()),
        ]);
        let value = BranchChecksums::from_entries(entries.iter());
        value.validate().unwrap();
        assert_eq!(value.entries[0].path, "README.md");

        let mut duplicate = value.clone();
        duplicate.entries.push(duplicate.entries[0].clone());
        assert!(duplicate.validate().is_err());

        let mut itself = value.clone();
        itself.entries[0].path = "checksums.json".into();
        assert!(itself.validate().is_err());

        let mut uppercase = value.clone();
        uppercase.entries[0].sha256 = "A".repeat(64);
        assert!(uppercase.validate().is_err());

        let mut algorithm = value;
        algorithm.algorithm = "md5".into();
        assert!(matches!(
            algorithm.validate(),
            Err(LifeBranchError::Unsupported)
        ));
    }

    #[test]
    fn readme_is_deterministic_privacy_safe_and_states_the_contract() {
        let mut value = fixture();
        value.source_root_title = "Line one\r\nLine two".into();
        let text = String::from_utf8(readme(&value)).unwrap();
        assert!(text.contains("- Branch: Line one Line two\n"));
        assert!(text.contains("It is not a full Lifeweave backup."));
        assert!(text.contains("new local identities"));
        assert!(text.contains("Canonical JSON is the authority"));
        assert!(text.contains("links leaving this branch are not\ntransferred."));
        assert_eq!(readme(&value), readme(&value));
        assert!(readme(&value).len() <= domain::MAX_README_BYTES);
    }

    #[test]
    fn omission_total_sums_every_category() {
        let value = BranchOmissions {
            archived_nodes: 1,
            drafts: 2,
            pins: 3,
            task_references: 4,
            focus_plan_references: 5,
            outgoing_cross_boundary_links: 6,
            incoming_cross_boundary_links: 7,
            archived_tag_assignments: 8,
        };
        assert_eq!(value.total(), 36);
        assert_eq!(BranchOmissions::default().total(), 0);
    }
}
