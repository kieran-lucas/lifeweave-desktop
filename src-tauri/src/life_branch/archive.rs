//! Life Branch Package ZIP construction and validation.
//!
//! The threat model and the entry policy are the same as Portable Package v1: Stored entries only,
//! fixed header metadata, no encryption, comment, directory entry, or symlink, no duplicate or
//! unenclosed path, and an exact path allowlist. What differs is the allowlist itself, which is
//! derived from the manifest rather than fixed, and the structural authority, which is
//! `content/tree.json`.

use super::{
    domain::{self, LifeBranchDocumentKind, LifeBranchError},
    manifest::{self, BranchChecksums, BranchManifest},
    tree::{BranchTree, VerifiedTree},
};
use crate::document::assets::{self, PreparedDocumentAsset};
use std::{
    collections::{BTreeMap, BTreeSet},
    io::{Cursor, Read, Seek, Write},
};
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

#[derive(Debug, Clone)]
pub struct BranchArchiveAsset {
    pub path: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct BranchDocumentPayload {
    pub key: String,
    pub canonical_json: String,
    pub markdown: String,
}

#[derive(Debug)]
pub struct ValidatedBranchPackage {
    pub manifest: BranchManifest,
    pub tree: VerifiedTree,
    /// Compact canonical JSON by document key, already validated by the owning Rust authority.
    pub documents: BTreeMap<String, String>,
    pub assets: BTreeMap<String, PreparedDocumentAsset>,
}

fn invalid(message: &'static str) -> LifeBranchError {
    LifeBranchError::Validation(message)
}

fn canonical_pretty_lf(raw: &str) -> Result<Vec<u8>, LifeBranchError> {
    let value: serde_json::Value = serde_json::from_str(raw)?;
    let mut bytes = serde_json::to_vec_pretty(&value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

pub fn build_package(
    manifest: &BranchManifest,
    tree: &BranchTree,
    documents: &[BranchDocumentPayload],
    assets: Vec<BranchArchiveAsset>,
) -> Result<Vec<u8>, LifeBranchError> {
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
            return Err(invalid("Branch package has duplicate document entries."));
        }
    }
    for asset in assets {
        if entries.insert(asset.path, asset.bytes).is_some() {
            return Err(invalid("Branch package has duplicate asset entries."));
        }
    }
    let checksums = BranchChecksums::from_entries(entries.iter());
    entries.insert("checksums.json".into(), checksums.bytes()?);
    if entries.len() > domain::MAX_ENTRY_COUNT {
        return Err(invalid("Branch package entry count exceeds the maximum."));
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
        return Err(invalid("Branch package exceeds 64 MiB."));
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
) -> Result<BTreeMap<String, Vec<u8>>, LifeBranchError> {
    if archive.is_empty() || archive.len() > domain::MAX_ENTRY_COUNT {
        return Err(invalid("Branch package entry count is invalid."));
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
            return Err(invalid("Branch ZIP inventory is unsafe or ambiguous."));
        }
        if let Some(mode) = file.unix_mode() {
            let kind = mode & 0o170000;
            if kind != 0 && kind != 0o100000 {
                return Err(invalid("Branch ZIP contains a non-regular entry."));
            }
        }
        let limit = entry_limit(&name)
            .ok_or_else(|| invalid("Branch ZIP contains an unexpected entry."))?;
        let declared = file.size();
        // Markdown is the only payload that may legitimately be empty.
        if declared > limit || (declared == 0 && !name.ends_with(".md")) {
            return Err(invalid("Branch ZIP entry size is invalid."));
        }
        total = total
            .checked_add(declared)
            .ok_or_else(|| invalid("Branch ZIP size overflow."))?;
        if total > domain::MAX_TOTAL_ENTRY_BYTES {
            return Err(invalid("Branch ZIP declared size exceeds 64 MiB."));
        }
        let mut bytes = Vec::with_capacity(declared as usize);
        file.take(limit + 1).read_to_end(&mut bytes)?;
        if bytes.len() as u64 != declared {
            return Err(invalid("Branch ZIP entry byte size is invalid."));
        }
        entries.insert(name, bytes);
    }
    Ok(entries)
}

fn validate_archive<R: Read + Seek>(
    mut archive: ZipArchive<R>,
    package_bytes: u64,
) -> Result<ValidatedBranchPackage, LifeBranchError> {
    if package_bytes == 0 || package_bytes > domain::MAX_PACKAGE_BYTES as u64 {
        return Err(invalid("Branch package must be 64 MiB or smaller."));
    }
    let entries = inspect(&mut archive)?;

    let manifest = BranchManifest::parse(
        entries
            .get("manifest.json")
            .ok_or_else(|| invalid("Branch manifest is missing."))?,
    )?;
    manifest.validate()?;
    if entries
        .get("README.md")
        .is_none_or(|value| value != &manifest::readme(&manifest))
    {
        return Err(invalid("Branch README does not match its manifest."));
    }

    let checksums = BranchChecksums::parse(
        entries
            .get("checksums.json")
            .ok_or_else(|| invalid("Branch checksum inventory is missing."))?,
    )?;
    checksums.validate()?;

    // ── Exact inventory: manifest, checksums, and actual entries must agree completely.
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
            "Branch ZIP inventory does not match its manifest and checksums.",
        ));
    }
    for entry in &checksums.entries {
        let payload = entries
            .get(&entry.path)
            .ok_or_else(|| invalid("Branch checksum entry is missing."))?;
        if payload.len() as u64 != entry.byte_size || domain::sha256(payload) != entry.sha256 {
            return Err(invalid("Branch package checksum verification failed."));
        }
    }

    // ── Structural authority.
    let tree = BranchTree::parse(
        entries
            .get(domain::TREE_PATH)
            .ok_or_else(|| invalid("Branch tree is missing."))?,
    )?
    .verify()?;
    if tree.tree.root_key != manifest.source_root_key
        || tree.node_count() != manifest.counts.nodes
        || tree.branch_count != manifest.counts.branches
        || tree.basic_leaf_count != manifest.counts.basic_leaf_documents
        || tree.narrative_count != manifest.counts.narrative_documents
        || tree.empty_leaf_count != manifest.counts.empty_leaves
        || tree.maximum_depth != manifest.maximum_depth
        || tree.tree.tags.len() as u32 != manifest.counts.tags
        || tree.tree.links.len() as u32 != manifest.counts.internal_links
        || tree
            .node(&tree.tree.root_key)
            .is_none_or(|node| node.title != manifest.source_root_title)
    {
        return Err(invalid("Branch manifest does not describe its tree."));
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
        return Err(invalid(
            "Branch document descriptors do not match the tree.",
        ));
    }

    // ── Documents: canonical JSON is validated by its owning authority; Markdown must match it.
    let mut documents = BTreeMap::new();
    let mut asset_demand: BTreeMap<String, BTreeMap<String, i32>> = BTreeMap::new();
    for descriptor in &manifest.documents {
        let canonical_bytes = entries.get(&descriptor.canonical_path).unwrap();
        let markdown_bytes = entries.get(&descriptor.markdown_path).unwrap();
        let canonical_json = std::str::from_utf8(canonical_bytes)
            .map_err(|_| invalid("Branch canonical JSON is not UTF-8."))?;
        let markdown = std::str::from_utf8(markdown_bytes)
            .map_err(|_| invalid("Branch Markdown is not UTF-8."))?;

        let (compact, expected_markdown, referenced) = match descriptor.kind {
            LifeBranchDocumentKind::BasicLeaf => {
                let valid = crate::document::schema::validate(canonical_json)
                    .map_err(|_| invalid("Branch Basic Leaf canonical JSON is invalid."))?;
                let expected = crate::document::markdown::export(&valid.canonical_json)
                    .map_err(|_| invalid("Branch Basic Leaf Markdown projection failed."))?;
                (valid.canonical_json, expected, valid.assets)
            }
            LifeBranchDocumentKind::NarrativeCanvas => {
                let valid =
                    crate::narrative::schema::validate(canonical_json, Some(&descriptor.key))
                        .map_err(|_| invalid("Branch Narrative canonical JSON is invalid."))?;
                let expected = crate::narrative::markdown::export(&valid.canonical_json)
                    .map_err(|_| invalid("Branch Narrative Markdown projection failed."))?;
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
                        "Branch Narrative metadata does not match canonical JSON.",
                    ));
                }
                (valid.canonical_json, expected, valid.assets)
            }
        };
        if canonical_pretty_lf(&compact)?.as_slice() != canonical_bytes.as_slice() {
            return Err(invalid(
                "Branch canonical JSON is not pretty UTF-8 JSON with a trailing LF.",
            ));
        }
        if markdown.as_bytes() != expected_markdown.as_bytes() {
            return Err(invalid("Branch Markdown differs from canonical JSON."));
        }
        asset_demand.insert(descriptor.key.clone(), referenced);
        documents.insert(descriptor.key.clone(), compact);
    }

    // ── Assets: the manifest's per-document reference counts must equal what the documents ask for.
    let mut declared: BTreeMap<String, BTreeMap<String, i32>> = BTreeMap::new();
    for asset in &manifest.assets {
        for reference in &asset.references {
            let count = i32::try_from(reference.reference_count)
                .map_err(|_| invalid("Branch asset reference count is invalid."))?;
            declared
                .entry(reference.document_key.clone())
                .or_default()
                .insert(asset.key.clone(), count);
        }
    }
    asset_demand.retain(|_, value| !value.is_empty());
    if declared != asset_demand {
        return Err(invalid(
            "Branch asset references do not match the documents.",
        ));
    }

    let mut prepared = BTreeMap::new();
    for asset in &manifest.assets {
        let payload = entries.get(&asset.path).unwrap();
        if payload.len() as u64 != asset.byte_size || domain::sha256(payload) != asset.sha256 {
            return Err(invalid("Branch asset payload does not match its manifest."));
        }
        let value = assets::prepare_imported_asset(&asset.original_name, payload.clone())
            .map_err(|_| invalid("Branch asset is corrupt or unsupported."))?;
        if value.mime != asset.mime
            || value.width != asset.width
            || value.height != asset.height
            || value.checksum != asset.sha256
        {
            return Err(invalid(
                "Branch asset metadata does not match decoded payload.",
            ));
        }
        prepared.insert(asset.key.clone(), value);
    }

    Ok(ValidatedBranchPackage {
        manifest,
        tree,
        documents,
        assets: prepared,
    })
}

pub fn validate_package_bytes(bytes: &[u8]) -> Result<ValidatedBranchPackage, LifeBranchError> {
    validate_archive(ZipArchive::new(Cursor::new(bytes))?, bytes.len() as u64)
}

pub fn validate_package_file(
    path: &std::path::Path,
) -> Result<ValidatedBranchPackage, LifeBranchError> {
    let size = std::fs::metadata(path)?.len();
    if size == 0 || size > domain::MAX_PACKAGE_BYTES as u64 {
        return Err(invalid("Branch package must be 64 MiB or smaller."));
    }
    validate_archive(ZipArchive::new(std::fs::File::open(path)?)?, size)
}

#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;
    use crate::life_branch::manifest::*;
    use crate::life_branch::tree::*;

    pub fn key(n: u8) -> String {
        format!("00000000-0000-7000-8000-0000000000{n:02}")
    }

    pub fn basic_json(text: &str) -> String {
        serde_json::json!({"type":"doc","content":[
            {"type":"paragraph","content":[{"type":"text","text":text}]}
        ]})
        .to_string()
    }

    /// Built by the production template scaffold so the fixture can never drift from the schema.
    pub fn narrative_json(document_key: &str, title: &str) -> String {
        crate::narrative::templates::seed_document(
            crate::narrative::templates::NarrativeTemplateId::KnowledgeDossier,
            document_key,
            title,
        )
    }

    /// root(1) ─ basic leaf(2) ─ narrative leaf(3) ─ empty leaf(4), one internal link 2→3.
    pub struct Fixture {
        pub manifest: BranchManifest,
        pub tree: BranchTree,
        pub documents: Vec<BranchDocumentPayload>,
        pub assets: Vec<BranchArchiveAsset>,
    }

    pub fn fixture() -> Fixture {
        let basic = basic_json("Xin chào");
        let narrative =
            crate::narrative::schema::validate(&narrative_json(&key(30), "Canvas"), Some(&key(30)))
                .expect("narrative fixture must be valid")
                .canonical_json;

        let tree = BranchTree {
            format_version: 1,
            root_key: key(1),
            nodes: vec![
                BranchNode {
                    key: key(1),
                    parent_key: None,
                    sibling_index: 0,
                    title: "Nghiên cứu".into(),
                    short_description: "Root".into(),
                    icon_key: "life-branch".into(),
                    theme_variant: "neutral".into(),
                    document: None,
                    tag_keys: vec![],
                },
                BranchNode {
                    key: key(2),
                    parent_key: Some(key(1)),
                    sibling_index: 0,
                    title: "Leaf".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    theme_variant: "neutral".into(),
                    document: Some(BranchNodeDocument {
                        kind: LifeBranchDocumentKind::BasicLeaf,
                        key: key(20),
                    }),
                    tag_keys: vec![],
                },
                BranchNode {
                    key: key(3),
                    parent_key: Some(key(1)),
                    sibling_index: 1,
                    title: "Canvas".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    theme_variant: "neutral".into(),
                    document: Some(BranchNodeDocument {
                        kind: LifeBranchDocumentKind::NarrativeCanvas,
                        key: key(30),
                    }),
                    tag_keys: vec![],
                },
                BranchNode {
                    key: key(4),
                    parent_key: Some(key(1)),
                    sibling_index: 2,
                    title: "Empty".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    theme_variant: "neutral".into(),
                    document: None,
                    tag_keys: vec![],
                },
            ],
            tags: vec![],
            links: vec![BranchLink {
                source_key: key(2),
                target_key: key(3),
            }],
        };

        let manifest = BranchManifest {
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
        };

        let documents = vec![
            BranchDocumentPayload {
                key: key(20),
                markdown: crate::document::markdown::export(&basic).unwrap(),
                canonical_json: basic,
            },
            BranchDocumentPayload {
                key: key(30),
                markdown: crate::narrative::markdown::export(&narrative).unwrap(),
                canonical_json: narrative,
            },
        ];

        Fixture {
            manifest,
            tree,
            documents,
            assets: vec![],
        }
    }

    pub fn valid_bytes() -> Vec<u8> {
        let value = fixture();
        build_package(&value.manifest, &value.tree, &value.documents, value.assets).unwrap()
    }

    /// A fixture whose Basic Leaf embeds one image twice, exercising asset reference counting.
    pub fn asset_fixture() -> Fixture {
        let mut value = fixture();
        let asset_key = key(60);
        let bytes = crate::document::assets::tiny_png();
        let prepared =
            crate::document::assets::prepare_imported_asset("pixel.png", bytes.clone()).unwrap();
        let json = serde_json::json!({"type":"doc","content":[
            {"type":"image","attrs":{"assetId":asset_key}},
            {"type":"image","attrs":{"assetId":asset_key}}
        ]})
        .to_string();
        value.documents[0].markdown = crate::document::markdown::export(&json).unwrap();
        value.documents[0].canonical_json = json;
        value.manifest.counts.assets = 1;
        value.manifest.assets = vec![BranchAssetDescriptor {
            key: asset_key.clone(),
            path: domain::asset_path(&asset_key, &prepared.mime),
            original_name: "pixel.png".into(),
            mime: prepared.mime.clone(),
            byte_size: prepared.byte_size,
            width: prepared.width,
            height: prepared.height,
            sha256: prepared.checksum.clone(),
            references: vec![BranchAssetReference {
                document_key: key(20),
                reference_count: 2,
            }],
        }];
        value.assets = vec![BranchArchiveAsset {
            path: domain::asset_path(&asset_key, &prepared.mime),
            bytes,
        }];
        value
    }

    pub fn asset_bytes() -> Vec<u8> {
        let value = asset_fixture();
        build_package(&value.manifest, &value.tree, &value.documents, value.assets).unwrap()
    }

    pub fn rewrite(bytes: &[u8], change: impl FnOnce(&mut BTreeMap<String, Vec<u8>>)) -> Vec<u8> {
        let mut input = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut entries = BTreeMap::new();
        for index in 0..input.len() {
            let mut file = input.by_index(index).unwrap();
            let name = file.name().to_owned();
            let mut value = Vec::new();
            file.read_to_end(&mut value).unwrap();
            entries.insert(name, value);
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

    pub fn force_zip_flags(mut bytes: Vec<u8>, method: Option<u16>, encrypted: bool) -> Vec<u8> {
        let mut index = 0;
        while index + 12 <= bytes.len() {
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
            index += 1;
        }
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::*;
    use super::*;

    #[test]
    fn writer_emits_stored_sorted_fixed_header_entries_that_round_trip() {
        let bytes = valid_bytes();
        let mut zip = ZipArchive::new(Cursor::new(&bytes)).unwrap();
        let names: Vec<_> = (0..zip.len())
            .map(|index| zip.by_index(index).unwrap().name().to_owned())
            .collect();
        assert_eq!(
            names,
            vec![
                "README.md",
                "checksums.json",
                "content/documents/00000000-0000-7000-8000-000000000020.json",
                "content/documents/00000000-0000-7000-8000-000000000020.md",
                "content/documents/00000000-0000-7000-8000-000000000030.json",
                "content/documents/00000000-0000-7000-8000-000000000030.md",
                "content/tree.json",
                "manifest.json",
            ]
        );
        assert_eq!(zip.comment(), b"");
        for index in 0..zip.len() {
            let file = zip.by_index(index).unwrap();
            assert_eq!(file.compression(), CompressionMethod::Stored);
            assert_eq!(file.last_modified(), Some(zip::DateTime::default()));
            assert_eq!(file.comment(), "");
        }

        let valid = validate_package_bytes(&bytes).unwrap();
        assert_eq!(valid.manifest.source_root_title, "Nghiên cứu");
        assert_eq!(valid.tree.preorder.len(), 4);
        assert_eq!(valid.documents.len(), 2);
        assert!(valid.assets.is_empty());
    }

    #[test]
    fn rejects_traversal_absolute_backslash_control_and_long_paths() {
        for name in [
            "../evil",
            "/absolute",
            "C:\\evil",
            "a\\b",
            "a/../b",
            "a\u{0001}b",
            "content/documents/../../evil.json",
        ] {
            assert!(
                validate_package_bytes(&raw_zip(&[(name, b"x", 0o644)])).is_err(),
                "{name}"
            );
        }
        let long = format!("assets/{}.png", "a".repeat(domain::MAX_PATH_BYTES));
        assert!(validate_package_bytes(&raw_zip(&[(&long, b"x", 0o644)])).is_err());
    }

    #[test]
    fn rejects_deflate_encryption_symlinks_directories_and_duplicate_names() {
        for method in [8u16, 12, 93] {
            let bytes =
                force_zip_flags(raw_zip(&[("README.md", b"x", 0o644)]), Some(method), false);
            assert!(validate_package_bytes(&bytes).is_err(), "method {method}");
        }
        let encrypted = force_zip_flags(raw_zip(&[("README.md", b"x", 0o644)]), None, true);
        assert!(validate_package_bytes(&encrypted).is_err());
        assert!(validate_package_bytes(&raw_zip(&[("manifest.json", b"x", 0o120777)])).is_err());

        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        writer
            .add_directory("content/", SimpleFileOptions::default())
            .unwrap();
        assert!(validate_package_bytes(&writer.finish().unwrap().into_inner()).is_err());

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
    fn allowlist_rejects_every_unexpected_path_including_near_misses() {
        for name in [
            "extra.txt",
            "content/tree.jsonx",
            "content/documents/00000000-0000-7000-8000-000000000020.txt",
            "content/other/file.json",
            "assets/../manifest.json",
            "Manifest.json",
            "content/document.json",
        ] {
            assert!(
                entry_limit(name).is_none()
                    || validate_package_bytes(&raw_zip(&[(name, b"x", 0o644)])).is_err(),
                "{name} must not be accepted"
            );
        }
        let base = valid_bytes();
        assert!(
            validate_package_bytes(&rewrite(&base, |entries| {
                entries.insert("extra.txt".into(), b"x".to_vec());
            }))
            .is_err()
        );
        assert!(
            validate_package_bytes(&rewrite(&base, |entries| {
                entries.remove("content/tree.json");
            }))
            .is_err()
        );
    }

    #[test]
    fn rejects_empty_oversized_and_entry_count_overflow() {
        assert!(validate_package_bytes(&[]).is_err());
        let owned: Vec<_> = (0..=domain::MAX_ENTRY_COUNT)
            .map(|index| (format!("assets/{index}.png"), vec![index as u8]))
            .collect();
        let borrowed: Vec<_> = owned
            .iter()
            .map(|(name, bytes)| (name.as_str(), bytes.as_slice(), 0o644))
            .collect();
        assert!(validate_package_bytes(&raw_zip(&borrowed)).is_err());
    }

    #[test]
    fn rejects_checksum_manifest_tree_and_markdown_divergence() {
        let base = valid_bytes();
        for (label, changed) in [
            (
                "tampered markdown",
                rewrite(&base, |entries| {
                    entries.insert(
                        "content/documents/00000000-0000-7000-8000-000000000020.md".into(),
                        b"different\n".to_vec(),
                    );
                }),
            ),
            (
                "malformed manifest",
                rewrite(&base, |entries| {
                    entries.insert("manifest.json".into(), b"{".to_vec());
                }),
            ),
            (
                "malformed checksums",
                rewrite(&base, |entries| {
                    entries.insert("checksums.json".into(), b"{".to_vec());
                }),
            ),
            (
                "missing checksums",
                rewrite(&base, |entries| {
                    entries.remove("checksums.json");
                }),
            ),
            (
                "non-utf8 canonical",
                rewrite(&base, |entries| {
                    entries.insert(
                        "content/documents/00000000-0000-7000-8000-000000000020.json".into(),
                        vec![0xff],
                    );
                }),
            ),
            (
                "malformed tree",
                rewrite(&base, |entries| {
                    entries.insert("content/tree.json".into(), b"{}".to_vec());
                }),
            ),
            (
                "unknown manifest field",
                rewrite(&base, |entries| {
                    let mut value: serde_json::Value =
                        serde_json::from_slice(&entries["manifest.json"]).unwrap();
                    value["unknown"] = serde_json::json!(true);
                    entries.insert("manifest.json".into(), serde_json::to_vec(&value).unwrap());
                }),
            ),
        ] {
            assert!(validate_package_bytes(&changed).is_err(), "{label}");
        }
    }

    #[test]
    fn manifest_must_agree_with_the_tree_it_ships() {
        let base = valid_bytes();
        for mutate in [
            (|value: &mut serde_json::Value| value["counts"]["nodes"] = serde_json::json!(3))
                as fn(&mut serde_json::Value),
            |value| value["maximum_depth"] = serde_json::json!(2),
            |value| value["counts"]["internal_links"] = serde_json::json!(0),
            |value| value["source_root_title"] = serde_json::json!("Renamed"),
            |value| value["counts"]["empty_leaves"] = serde_json::json!(0),
        ] {
            let changed = rewrite(&base, |entries| {
                let mut value: serde_json::Value =
                    serde_json::from_slice(&entries["manifest.json"]).unwrap();
                mutate(&mut value);
                let mut bytes = serde_json::to_vec_pretty(&value).unwrap();
                bytes.push(b'\n');
                entries.insert("manifest.json".into(), bytes);
            });
            // Re-checksum so the failure is proven to come from the cross-check, not the digest.
            let resealed = reseal(&changed);
            assert!(validate_package_bytes(&resealed).is_err());
        }
    }

    /// Recomputes `checksums.json` and `README.md` so a mutation test exercises semantic validation
    /// rather than stopping at the integrity layer.
    fn reseal(bytes: &[u8]) -> Vec<u8> {
        let mut input = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut entries = BTreeMap::new();
        for index in 0..input.len() {
            let mut file = input.by_index(index).unwrap();
            let name = file.name().to_owned();
            let mut value = Vec::new();
            file.read_to_end(&mut value).unwrap();
            entries.insert(name, value);
        }
        if let Ok(manifest) = BranchManifest::parse(&entries["manifest.json"]) {
            entries.insert("README.md".into(), manifest::readme(&manifest));
        }
        entries.remove("checksums.json");
        let checksums = BranchChecksums::from_entries(entries.iter());
        entries.insert("checksums.json".into(), checksums.bytes().unwrap());
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

    #[test]
    fn asset_payloads_counts_and_decoding_are_all_verified() {
        let bytes = asset_bytes();
        let valid = validate_package_bytes(&bytes).unwrap();
        assert_eq!(valid.assets.len(), 1);
        assert_eq!(valid.manifest.assets[0].references[0].reference_count, 2);

        assert!(
            validate_package_bytes(&rewrite(&bytes, |entries| {
                entries.remove("assets/00000000-0000-7000-8000-000000000060.png");
            }))
            .is_err(),
            "a missing asset payload must fail"
        );
        assert!(
            validate_package_bytes(&rewrite(&bytes, |entries| {
                entries.insert(
                    "assets/00000000-0000-7000-8000-000000000060.png".into(),
                    b"not an image".to_vec(),
                );
            }))
            .is_err(),
            "a corrupt asset payload must fail"
        );
        let miscounted = reseal(&rewrite(&bytes, |entries| {
            let mut value: serde_json::Value =
                serde_json::from_slice(&entries["manifest.json"]).unwrap();
            value["assets"][0]["references"][0]["reference_count"] = serde_json::json!(1);
            let mut out = serde_json::to_vec_pretty(&value).unwrap();
            out.push(b'\n');
            entries.insert("manifest.json".into(), out);
        }));
        assert!(
            validate_package_bytes(&miscounted).is_err(),
            "a reference count that disagrees with the document must fail"
        );
    }

    #[test]
    fn file_backed_validation_matches_raw_validation() {
        let root = std::env::temp_dir().join(format!("lw_branch_file_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&root).unwrap();
        let path = root.join("fixture.lifeweave-branch.zip");
        std::fs::write(&path, valid_bytes()).unwrap();
        assert_eq!(
            validate_package_file(&path)
                .unwrap()
                .manifest
                .source_root_title,
            "Nghiên cứu"
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_portable_package_is_not_accepted_as_a_branch_package() {
        let json = basic_json("Xin chào");
        let markdown = crate::document::markdown::export(&json).unwrap();
        let portable = crate::portable::archive::build_package(
            &crate::portable::manifest::PortableManifest {
                format_version: 1,
                producer: crate::portable::manifest::PortableProducer {
                    application: "lifeweave-desktop".into(),
                    app_version: "0.0.0".into(),
                },
                exported_at: "2026-08-07T00:00:00Z".into(),
                document: crate::portable::manifest::PortableDocumentMetadata {
                    kind: crate::portable::domain::PortableDocumentKind::BasicLeaf,
                    schema_version: 1,
                    title: "Leaf".into(),
                    source_document_id: key(20),
                    canonical_path: "content/document.json".into(),
                    markdown_path: "content/document.md".into(),
                    asset_policy: "privacy_sanitized_visual_v1".into(),
                },
                narrative: None,
                assets: vec![],
            },
            &json,
            &markdown,
            vec![],
        )
        .unwrap();
        assert!(
            validate_package_bytes(&portable).is_err(),
            "the two formats must not be interchangeable"
        );
        assert!(
            crate::portable::archive::validate_package_bytes(&valid_bytes()).is_err(),
            "and the reverse must also hold"
        );
    }
}
