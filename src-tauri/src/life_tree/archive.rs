//! Life Tree Package ZIP construction and validation.
//!
//! The threat model and the entry policy are the same as Portable Package v1: Stored entries only,
//! fixed header metadata, no encryption, comment, directory entry, or symlink, no duplicate or
//! unenclosed path, and an exact path allowlist. What differs is the allowlist itself, which is
//! derived from the manifest rather than fixed, and the structural authority, which is
//! `content/tree.json`.

use super::{
    domain::{self, LifeTreeDocumentKind, LifeTreeError},
    manifest::{self, TreeChecksums, TreeManifest},
    tree::{TreePackageTree, VerifiedTree},
};
use crate::document::assets::{self, PreparedDocumentAsset};
use std::{
    collections::{BTreeMap, BTreeSet},
    io::{Cursor, Read, Seek, Write},
};
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

#[derive(Debug, Clone)]
pub struct TreeArchiveAsset {
    pub path: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct TreeDocumentPayload {
    pub key: String,
    pub canonical_json: String,
    pub markdown: String,
}

#[derive(Debug)]
pub struct ValidatedTreePackage {
    pub manifest: TreeManifest,
    pub tree: VerifiedTree,
    /// Compact canonical JSON by document key, already validated by the owning Rust authority.
    pub documents: BTreeMap<String, String>,
    pub assets: BTreeMap<String, PreparedDocumentAsset>,
}

fn invalid(message: &'static str) -> LifeTreeError {
    LifeTreeError::Validation(message)
}

fn canonical_pretty_lf(raw: &str) -> Result<Vec<u8>, LifeTreeError> {
    let value: serde_json::Value = serde_json::from_str(raw)?;
    let mut bytes = serde_json::to_vec_pretty(&value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

pub fn build_package(
    manifest: &TreeManifest,
    tree: &TreePackageTree,
    documents: &[TreeDocumentPayload],
    assets: Vec<TreeArchiveAsset>,
) -> Result<Vec<u8>, LifeTreeError> {
    manifest.validate()?;
    let mut entries = BTreeMap::<String, Vec<u8>>::new();
    entries.insert("README.md".into(), manifest::readme(manifest));
    entries.insert("manifest.json".into(), manifest.bytes()?);
    entries.insert(domain::TREE_PATH.into(), tree.bytes()?);
    for document in documents {
        if entries
            .insert(
                domain::document_canonical_path(&document.key),
                canonical_pretty_lf(&document.canonical_json)?,
            )
            .is_some()
            || entries
                .insert(
                    domain::document_markdown_path(&document.key),
                    document.markdown.as_bytes().to_vec(),
                )
                .is_some()
        {
            return Err(invalid("Tree package has duplicate document entries."));
        }
    }
    for asset in assets {
        if entries.insert(asset.path, asset.bytes).is_some() {
            return Err(invalid("Tree package has duplicate asset entries."));
        }
    }
    let checksums = TreeChecksums::from_entries(entries.iter());
    entries.insert("checksums.json".into(), checksums.bytes()?);
    if entries.len() > domain::MAX_ENTRY_COUNT {
        return Err(invalid("Tree package entry count exceeds the maximum."));
    }

    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .last_modified_time(zip::DateTime::default())
        .unix_permissions(0o644);
    for (path, bytes) in entries {
        writer.start_file(path, options)?;
        writer.write_all(&bytes)?;
    }
    let bytes = writer.finish()?.into_inner();
    if bytes.len() > domain::MAX_PACKAGE_BYTES {
        return Err(invalid("Tree package exceeds 64 MiB."));
    }
    Ok(bytes)
}

/// Per-path uncompressed ceiling. `None` means the path is not on the allowlist at all.
fn entry_limit(path: &str) -> Option<u64> {
    match path {
        "README.md" => Some(domain::MAX_README_BYTES as u64),
        "manifest.json" => Some(domain::MAX_MANIFEST_BYTES as u64),
        "checksums.json" => Some(domain::MAX_CHECKSUMS_BYTES as u64),
        domain::TREE_PATH => Some(domain::MAX_TREE_BYTES as u64),
        value if value.starts_with("content/documents/") => {
            if value.ends_with(".json") {
                Some(domain::MAX_CANONICAL_BYTES as u64)
            } else if value.ends_with(".md") {
                Some(domain::MAX_MARKDOWN_BYTES as u64)
            } else {
                None
            }
        }
        value if value.starts_with("assets/") => {
            Some(crate::document::domain::MAX_ASSET_BYTES as u64)
        }
        _ => None,
    }
}

fn inspect<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<BTreeMap<String, Vec<u8>>, LifeTreeError> {
    if archive.is_empty() || archive.len() > domain::MAX_ENTRY_COUNT {
        return Err(invalid("Tree package entry count is invalid."));
    }
    let mut total = 0u64;
    let mut names = BTreeSet::new();
    let mut entries = BTreeMap::new();
    for index in 0..archive.len() {
        let file = archive.by_index(index)?;
        let name = file.name().to_owned();
        if !domain::safe_archive_path(&name)
            || file.enclosed_name().is_none()
            || file.is_dir()
            || file.encrypted()
            || file.compression() != CompressionMethod::Stored
            || !names.insert(name.clone())
        {
            return Err(invalid("Tree ZIP inventory is unsafe or ambiguous."));
        }
        if let Some(mode) = file.unix_mode() {
            let kind = mode & 0o170000;
            if kind != 0 && kind != 0o100000 {
                return Err(invalid("Tree ZIP contains a non-regular entry."));
            }
        }
        let limit =
            entry_limit(&name).ok_or_else(|| invalid("Tree ZIP contains an unexpected entry."))?;
        let declared = file.size();
        // Markdown is the only payload that may legitimately be empty.
        if declared > limit || (declared == 0 && !name.ends_with(".md")) {
            return Err(invalid("Tree ZIP entry size is invalid."));
        }
        total = total
            .checked_add(declared)
            .ok_or_else(|| invalid("Tree ZIP size overflow."))?;
        if total > domain::MAX_TOTAL_ENTRY_BYTES {
            return Err(invalid("Tree ZIP declared size exceeds 64 MiB."));
        }
        let mut bytes = Vec::with_capacity(declared as usize);
        file.take(limit + 1).read_to_end(&mut bytes)?;
        if bytes.len() as u64 != declared {
            return Err(invalid("Tree ZIP entry byte size is invalid."));
        }
        entries.insert(name, bytes);
    }
    Ok(entries)
}

fn validate_archive<R: Read + Seek>(
    mut archive: ZipArchive<R>,
    package_bytes: u64,
) -> Result<ValidatedTreePackage, LifeTreeError> {
    if package_bytes == 0 || package_bytes > domain::MAX_PACKAGE_BYTES as u64 {
        return Err(invalid("Tree package must be 64 MiB or smaller."));
    }
    let entries = inspect(&mut archive)?;

    let manifest = TreeManifest::parse(
        entries
            .get("manifest.json")
            .ok_or_else(|| invalid("Tree manifest is missing."))?,
    )?;
    manifest.validate()?;
    if entries
        .get("README.md")
        .is_none_or(|value| value != &manifest::readme(&manifest))
    {
        return Err(invalid("Tree README does not match its manifest."));
    }

    let checksums = TreeChecksums::parse(
        entries
            .get("checksums.json")
            .ok_or_else(|| invalid("Tree checksum inventory is missing."))?,
    )?;
    checksums.validate()?;

    // â”€â”€ Exact inventory: manifest, checksums, and actual entries must agree completely.
    let expected: BTreeSet<String> = ["README.md", "manifest.json", domain::TREE_PATH]
        .into_iter()
        .map(str::to_owned)
        .chain(manifest.documents.iter().flat_map(|document| {
            [
                document.canonical_path.clone(),
                document.markdown_path.clone(),
            ]
        }))
        .chain(manifest.assets.iter().map(|asset| asset.path.clone()))
        .collect();
    let actual: BTreeSet<String> = entries
        .keys()
        .filter(|path| path.as_str() != "checksums.json")
        .cloned()
        .collect();
    let listed: BTreeSet<String> = checksums
        .entries
        .iter()
        .map(|entry| entry.path.clone())
        .collect();
    if expected != actual || listed != expected || entries.len() != expected.len() + 1 {
        return Err(invalid(
            "Tree ZIP inventory does not match its manifest and checksums.",
        ));
    }
    for entry in &checksums.entries {
        let payload = entries
            .get(&entry.path)
            .ok_or_else(|| invalid("Tree checksum entry is missing."))?;
        if payload.len() as u64 != entry.byte_size || domain::sha256(payload) != entry.sha256 {
            return Err(invalid("Tree package checksum verification failed."));
        }
    }

    // â”€â”€ Structural authority.
    let tree = TreePackageTree::parse(
        entries
            .get(domain::TREE_PATH)
            .ok_or_else(|| invalid("Tree tree is missing."))?,
    )?
    .verify()?;
    if tree.top_level_count() != manifest.counts.top_level_nodes
        || tree.node_count() != manifest.counts.nodes
        || tree.branch_count != manifest.counts.branches
        || tree.basic_leaf_count != manifest.counts.basic_leaf_documents
        || tree.narrative_count != manifest.counts.narrative_documents
        || tree.empty_leaf_count != manifest.counts.empty_leaves
        || tree.maximum_depth != manifest.maximum_depth
        || tree.tree.tags.len() as u32 != manifest.counts.tags
        || tree.tree.links.len() as u32 != manifest.counts.internal_links
    {
        return Err(invalid("Tree manifest does not describe its tree."));
    }
    // Every manifest document must name the node that actually owns it, and vice versa.
    let mut tree_documents = BTreeMap::new();
    for node in &tree.tree.nodes {
        if let Some(document) = &node.document {
            tree_documents.insert(document.key.clone(), (node.key.clone(), document.kind));
        }
    }
    if tree_documents.len() != manifest.documents.len()
        || manifest.documents.iter().any(|descriptor| {
            tree_documents.get(&descriptor.key)
                != Some(&(descriptor.life_node_key.clone(), descriptor.kind))
        })
    {
        return Err(invalid("Tree document descriptors do not match the tree."));
    }

    // â”€â”€ Documents: canonical JSON is validated by its owning authority; Markdown must match it.
    let mut documents = BTreeMap::new();
    let mut asset_demand: BTreeMap<String, BTreeMap<String, i32>> = BTreeMap::new();
    for descriptor in &manifest.documents {
        let canonical_bytes = entries.get(&descriptor.canonical_path).unwrap();
        let markdown_bytes = entries.get(&descriptor.markdown_path).unwrap();
        let canonical_json = std::str::from_utf8(canonical_bytes)
            .map_err(|_| invalid("Tree canonical JSON is not UTF-8."))?;
        let markdown = std::str::from_utf8(markdown_bytes)
            .map_err(|_| invalid("Tree Markdown is not UTF-8."))?;

        let (compact, expected_markdown, referenced) = match descriptor.kind {
            LifeTreeDocumentKind::BasicLeaf => {
                let valid = crate::document::schema::validate(canonical_json)
                    .map_err(|_| invalid("Tree Basic Leaf canonical JSON is invalid."))?;
                let expected = crate::document::markdown::export(&valid.canonical_json)
                    .map_err(|_| invalid("Tree Basic Leaf Markdown projection failed."))?;
                (valid.canonical_json, expected, valid.assets)
            }
            LifeTreeDocumentKind::NarrativeCanvas => {
                let valid =
                    crate::narrative::schema::validate(canonical_json, Some(&descriptor.key))
                        .map_err(|_| invalid("Tree Narrative canonical JSON is invalid."))?;
                let expected = crate::narrative::markdown::export(&valid.canonical_json)
                    .map_err(|_| invalid("Tree Narrative Markdown projection failed."))?;
                let value: serde_json::Value = serde_json::from_str(&valid.canonical_json)?;
                let meta = descriptor.narrative.as_ref().unwrap();
                if value["title"].as_str() != Some(&descriptor.title)
                    || value["templateId"].as_str() != Some(&meta.template_id)
                    || value["templateVersion"].as_i64() != Some(meta.template_version as i64)
                    || value
                        .get("visualWorldId")
                        .and_then(|v| v.as_str())
                        .unwrap_or("paper")
                        != meta.visual_world_id
                    || value["scenes"].as_array().map(|v| v.len() as u32) != Some(meta.scene_count)
                {
                    return Err(invalid(
                        "Tree Narrative metadata does not match canonical JSON.",
                    ));
                }
                (valid.canonical_json, expected, valid.assets)
            }
        };
        if canonical_pretty_lf(&compact)?.as_slice() != canonical_bytes.as_slice() {
            return Err(invalid(
                "Tree canonical JSON is not pretty UTF-8 JSON with a trailing LF.",
            ));
        }
        if markdown.as_bytes() != expected_markdown.as_bytes() {
            return Err(invalid("Tree Markdown differs from canonical JSON."));
        }
        asset_demand.insert(descriptor.key.clone(), referenced);
        documents.insert(descriptor.key.clone(), compact);
    }

    // â”€â”€ Assets: the manifest's per-document reference counts must equal what the documents ask for.
    let mut declared: BTreeMap<String, BTreeMap<String, i32>> = BTreeMap::new();
    for asset in &manifest.assets {
        for reference in &asset.references {
            let count = i32::try_from(reference.reference_count)
                .map_err(|_| invalid("Tree asset reference count is invalid."))?;
            declared
                .entry(reference.document_key.clone())
                .or_default()
                .insert(asset.key.clone(), count);
        }
    }
    asset_demand.retain(|_, value| !value.is_empty());
    if declared != asset_demand {
        return Err(invalid("Tree asset references do not match the documents."));
    }

    let mut prepared = BTreeMap::new();
    for asset in &manifest.assets {
        let payload = entries.get(&asset.path).unwrap();
        if payload.len() as u64 != asset.byte_size || domain::sha256(payload) != asset.sha256 {
            return Err(invalid("Tree asset payload does not match its manifest."));
        }
        let value = assets::prepare_imported_asset(&asset.original_name, payload.clone())
            .map_err(|_| invalid("Tree asset is corrupt or unsupported."))?;
        if value.mime != asset.mime
            || value.width != asset.width
            || value.height != asset.height
            || value.checksum != asset.sha256
        {
            return Err(invalid(
                "Tree asset metadata does not match decoded payload.",
            ));
        }
        prepared.insert(asset.key.clone(), value);
    }

    Ok(ValidatedTreePackage {
        manifest,
        tree,
        documents,
        assets: prepared,
    })
}

pub fn validate_package_bytes(bytes: &[u8]) -> Result<ValidatedTreePackage, LifeTreeError> {
    validate_archive(ZipArchive::new(Cursor::new(bytes))?, bytes.len() as u64)
}

pub fn validate_package_file(
    path: &std::path::Path,
) -> Result<ValidatedTreePackage, LifeTreeError> {
    let size = std::fs::metadata(path)?.len();
    if size == 0 || size > domain::MAX_PACKAGE_BYTES as u64 {
        return Err(invalid("Tree package must be 64 MiB or smaller."));
    }
    validate_archive(ZipArchive::new(std::fs::File::open(path)?)?, size)
}

#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;
    use crate::life_tree::{manifest::*, tree::*};

    fn key(n: u8) -> String {
        format!("00000000-0000-7000-8000-0000000000{n:02}")
    }

    pub fn valid_bytes() -> Vec<u8> {
        let tree = TreePackageTree {
            format_version: 1,
            root_keys: vec![key(1), key(2)],
            nodes: vec![
                TreeNode {
                    key: key(1),
                    parent_key: None,
                    sibling_index: 0,
                    title: "First".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    theme_variant: "neutral".into(),
                    document: None,
                    tag_keys: vec![],
                },
                TreeNode {
                    key: key(2),
                    parent_key: None,
                    sibling_index: 1,
                    title: "Second".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    theme_variant: "neutral".into(),
                    document: None,
                    tag_keys: vec![],
                },
            ],
            tags: vec![],
            links: vec![],
        };
        let manifest = TreeManifest {
            format: domain::TREE_FORMAT.into(),
            format_version: 1,
            producer: TreeProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-08T00:00:00Z".into(),
            source_schema_version: 27,
            tree_path: domain::TREE_PATH.into(),
            asset_policy: domain::ASSET_POLICY.into(),
            counts: TreeCounts {
                top_level_nodes: 2,
                nodes: 2,
                empty_leaves: 2,
                ..TreeCounts::default()
            },
            maximum_depth: 1,
            omissions: TreeOmissions::default(),
            documents: vec![],
            assets: vec![],
        };
        build_package(&manifest, &tree, &[], vec![]).unwrap()
    }

    pub fn rewrite(bytes: &[u8], change: impl FnOnce(&mut BTreeMap<String, Vec<u8>>)) -> Vec<u8> {
        let mut input = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut entries = BTreeMap::new();
        for index in 0..input.len() {
            let mut file = input.by_index(index).unwrap();
            let mut value = Vec::new();
            file.read_to_end(&mut value).unwrap();
            entries.insert(file.name().to_owned(), value);
        }
        change(&mut entries);
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, value) in entries {
            writer
                .start_file(
                    name,
                    SimpleFileOptions::default().compression_method(CompressionMethod::Stored),
                )
                .unwrap();
            writer.write_all(&value).unwrap();
        }
        writer.finish().unwrap().into_inner()
    }

    pub fn raw_zip(entries: &[(&str, &[u8], u32)]) -> Vec<u8> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, value, mode) in entries {
            writer
                .start_file(
                    *name,
                    SimpleFileOptions::default()
                        .compression_method(CompressionMethod::Stored)
                        .unix_permissions(*mode),
                )
                .unwrap();
            writer.write_all(value).unwrap();
        }
        writer.finish().unwrap().into_inner()
    }

    pub fn force_flags(mut bytes: Vec<u8>, method: Option<u16>, encrypted: bool) -> Vec<u8> {
        for index in 0..bytes.len().saturating_sub(12) {
            if &bytes[index..index + 4] == b"PK\x03\x04" {
                if encrypted {
                    bytes[index + 6] |= 1;
                }
                if let Some(value) = method {
                    bytes[index + 8..index + 10].copy_from_slice(&value.to_le_bytes());
                }
            } else if &bytes[index..index + 4] == b"PK\x01\x02" {
                if encrypted {
                    bytes[index + 8] |= 1;
                }
                if let Some(value) = method {
                    bytes[index + 10..index + 12].copy_from_slice(&value.to_le_bytes());
                }
            }
        }
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::*;
    use super::*;

    #[test]
    fn writer_is_stored_sorted_commentless_and_round_trips_a_multi_root_forest() {
        let bytes = valid_bytes();
        let mut zip = ZipArchive::new(Cursor::new(&bytes)).unwrap();
        let names: Vec<_> = (0..zip.len())
            .map(|index| zip.by_index(index).unwrap().name().to_owned())
            .collect();
        assert_eq!(
            names,
            [
                "README.md",
                "checksums.json",
                "content/tree.json",
                "manifest.json"
            ]
        );
        assert_eq!(zip.comment(), b"");
        for index in 0..zip.len() {
            let file = zip.by_index(index).unwrap();
            assert_eq!(file.compression(), CompressionMethod::Stored);
            assert_eq!(file.last_modified(), Some(zip::DateTime::default()));
        }
        let value = validate_package_bytes(&bytes).unwrap();
        assert_eq!(
            value.tree.preorder,
            [
                "00000000-0000-7000-8000-000000000001",
                "00000000-0000-7000-8000-000000000002"
            ]
        );
    }

    #[test]
    fn rejects_unsafe_paths_links_directories_compression_encryption_and_duplicates() {
        for name in [
            "../evil",
            "/absolute",
            "C:\\evil",
            "a\\b",
            "a/../b",
            "a\u{1}b",
        ] {
            assert!(
                validate_package_bytes(&raw_zip(&[(name, b"x", 0o644)])).is_err(),
                "{name}"
            );
        }
        assert!(validate_package_bytes(&raw_zip(&[("manifest.json", b"x", 0o120777)])).is_err());
        assert!(
            validate_package_bytes(&force_flags(
                raw_zip(&[("README.md", b"x", 0o644)]),
                Some(8),
                false
            ))
            .is_err()
        );
        assert!(
            validate_package_bytes(&force_flags(
                raw_zip(&[("README.md", b"x", 0o644)]),
                None,
                true
            ))
            .is_err()
        );
        let mut directory = ZipWriter::new(Cursor::new(Vec::new()));
        directory
            .add_directory("content/", SimpleFileOptions::default())
            .unwrap();
        assert!(validate_package_bytes(&directory.finish().unwrap().into_inner()).is_err());
        let mut duplicate = raw_zip(&[
            ("manifestA.json", b"x", 0o644),
            ("manifestB.json", b"y", 0o644),
        ]);
        for index in 0..=duplicate.len() - "manifestB.json".len() {
            if &duplicate[index..index + "manifestB.json".len()] == b"manifestB.json" {
                duplicate[index..index + "manifestA.json".len()].copy_from_slice(b"manifestA.json");
            }
        }
        assert!(validate_package_bytes(&duplicate).is_err());
    }

    #[test]
    fn exact_allowlist_checksums_strict_manifest_and_forest_cross_checks_are_enforced() {
        let base = valid_bytes();
        for changed in [
            rewrite(&base, |entries| {
                entries.insert("extra.txt".into(), b"x".to_vec());
            }),
            rewrite(&base, |entries| {
                entries.remove("checksums.json");
            }),
            rewrite(&base, |entries| {
                entries.insert("content/tree.json".into(), b"{}".to_vec());
            }),
            rewrite(&base, |entries| {
                entries.insert("manifest.json".into(), b"{".to_vec());
            }),
            rewrite(&base, |entries| {
                let mut value: serde_json::Value =
                    serde_json::from_slice(&entries["manifest.json"]).unwrap();
                value["unknown"] = true.into();
                entries.insert("manifest.json".into(), serde_json::to_vec(&value).unwrap());
            }),
        ] {
            assert!(validate_package_bytes(&changed).is_err());
        }
    }

    #[test]
    fn branch_and_portable_formats_are_rejected() {
        assert!(
            validate_package_bytes(&crate::life_branch::archive::fixtures::valid_bytes()).is_err()
        );
        let portable = crate::portable::archive::build_package(
            &crate::portable::manifest::PortableManifest {
                format_version: 1,
                producer: crate::portable::manifest::PortableProducer {
                    application: "lifeweave-desktop".into(),
                    app_version: "0.0.0".into(),
                },
                exported_at: "2026-08-08T00:00:00Z".into(),
                document: crate::portable::manifest::PortableDocumentMetadata {
                    kind: crate::portable::domain::PortableDocumentKind::BasicLeaf,
                    schema_version: 1,
                    title: "Leaf".into(),
                    source_document_id: "00000000-0000-7000-8000-000000000020".into(),
                    canonical_path: "content/document.json".into(),
                    markdown_path: "content/document.md".into(),
                    asset_policy: "privacy_sanitized_visual_v1".into(),
                },
                narrative: None,
                assets: vec![],
            },
            "{\"type\":\"doc\",\"content\":[]}",
            "",
            vec![],
        )
        .unwrap();
        assert!(validate_package_bytes(&portable).is_err());
    }
}
