use super::{
    domain::{self, PortableDocumentKind, PortableError},
    manifest::{self, PortableChecksums, PortableManifest},
};
use crate::document::assets::{self, PreparedDocumentAsset};
use std::{
    collections::{BTreeMap, BTreeSet},
    io::{Cursor, Read, Seek, Write},
};
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

#[derive(Debug, Clone)]
pub struct PortableArchiveAsset {
    pub path: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug)]
pub struct ValidatedPortablePackage {
    pub manifest: PortableManifest,
    pub canonical_json: String,
    pub markdown: String,
    pub assets: BTreeMap<String, PreparedDocumentAsset>,
}

fn canonical_pretty_lf(raw: &str) -> Result<Vec<u8>, PortableError> {
    let value: serde_json::Value = serde_json::from_str(raw)?;
    let mut bytes = serde_json::to_vec_pretty(&value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

pub fn build_package(
    manifest: &PortableManifest,
    canonical_json: &str,
    markdown: &str,
    assets: Vec<PortableArchiveAsset>,
) -> Result<Vec<u8>, PortableError> {
    manifest.validate()?;
    let mut entries = BTreeMap::<String, Vec<u8>>::new();
    entries.insert("README.md".into(), manifest::readme(manifest));
    entries.insert(
        "content/document.json".into(),
        canonical_pretty_lf(canonical_json)?,
    );
    entries.insert("content/document.md".into(), markdown.as_bytes().to_vec());
    entries.insert("manifest.json".into(), manifest.bytes()?);
    for asset in assets {
        if entries.insert(asset.path, asset.bytes).is_some() {
            return Err(PortableError::Validation(
                "Portable package has duplicate entries.",
            ));
        }
    }
    let checksums = PortableChecksums::from_entries(entries.iter());
    entries.insert("checksums.json".into(), checksums.bytes()?);
    let cursor = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
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
        return Err(PortableError::Validation(
            "Portable package exceeds 64 MiB.",
        ));
    }
    Ok(bytes)
}

fn entry_limit(path: &str) -> Option<u64> {
    match path {
        "README.md" => Some(domain::MAX_README_BYTES as u64),
        "manifest.json" => Some(domain::MAX_MANIFEST_BYTES as u64),
        "checksums.json" => Some(domain::MAX_CHECKSUMS_BYTES as u64),
        "content/document.json" => Some(domain::MAX_CANONICAL_BYTES as u64),
        "content/document.md" => Some(domain::MAX_MARKDOWN_BYTES as u64),
        value if value.starts_with("assets/") => {
            Some(crate::document::domain::MAX_ASSET_BYTES as u64)
        }
        _ => None,
    }
}

fn inspect<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<BTreeMap<String, Vec<u8>>, PortableError> {
    if archive.is_empty() || archive.len() > domain::MAX_ENTRY_COUNT {
        return Err(PortableError::Validation(
            "Portable package entry count is invalid.",
        ));
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
            return Err(PortableError::Validation(
                "Portable ZIP inventory is unsafe or ambiguous.",
            ));
        }
        if let Some(mode) = file.unix_mode() {
            let kind = mode & 0o170000;
            if kind != 0 && kind != 0o100000 {
                return Err(PortableError::Validation(
                    "Portable ZIP contains a non-regular entry.",
                ));
            }
        }
        let limit = entry_limit(&name).ok_or(PortableError::Validation(
            "Portable ZIP contains an unexpected entry.",
        ))?;
        let declared_size = file.size();
        if declared_size > limit || (declared_size == 0 && name != "content/document.md") {
            return Err(PortableError::Validation(
                "Portable ZIP entry size is invalid.",
            ));
        }
        total = total
            .checked_add(declared_size)
            .ok_or(PortableError::Validation("Portable ZIP size overflow."))?;
        if total > domain::MAX_TOTAL_ENTRY_BYTES {
            return Err(PortableError::Validation(
                "Portable ZIP declared size exceeds 64 MiB.",
            ));
        }
        let mut bytes = Vec::with_capacity(declared_size as usize);
        file.take(limit + 1).read_to_end(&mut bytes)?;
        if bytes.len() as u64 != declared_size {
            return Err(PortableError::Validation(
                "Portable ZIP entry byte size is invalid.",
            ));
        }
        entries.insert(name, bytes);
    }
    Ok(entries)
}

fn validate_archive<R: Read + Seek>(
    mut archive: ZipArchive<R>,
    package_bytes: u64,
) -> Result<ValidatedPortablePackage, PortableError> {
    if package_bytes == 0 || package_bytes > domain::MAX_PACKAGE_BYTES as u64 {
        return Err(PortableError::Validation(
            "Portable package must be 64 MiB or smaller.",
        ));
    }
    let entries = inspect(&mut archive)?;
    let manifest_bytes = entries
        .get("manifest.json")
        .ok_or(PortableError::Validation("Portable manifest is missing."))?;
    let manifest = PortableManifest::parse(manifest_bytes)?;
    manifest.validate()?;
    if entries
        .get("README.md")
        .is_none_or(|value| value != &manifest::readme(&manifest))
    {
        return Err(PortableError::Validation(
            "Portable README does not match its manifest.",
        ));
    }
    let checksums = PortableChecksums::parse(entries.get("checksums.json").ok_or(
        PortableError::Validation("Portable checksum inventory is missing."),
    )?)?;
    checksums.validate()?;
    let expected_paths: BTreeSet<String> = [
        "README.md",
        "content/document.json",
        "content/document.md",
        "manifest.json",
    ]
    .into_iter()
    .map(str::to_owned)
    .chain(manifest.assets.iter().map(|asset| asset.path.clone()))
    .collect();
    let actual_non_checksum: BTreeSet<String> = entries
        .keys()
        .filter(|path| path.as_str() != "checksums.json")
        .cloned()
        .collect();
    let checksum_paths: BTreeSet<String> = checksums
        .entries
        .iter()
        .map(|entry| entry.path.clone())
        .collect();
    if expected_paths != actual_non_checksum
        || checksum_paths != expected_paths
        || entries.len() != expected_paths.len() + 1
    {
        return Err(PortableError::Validation(
            "Portable ZIP inventory does not match its manifest and checksums.",
        ));
    }
    for checksum in &checksums.entries {
        let payload = entries
            .get(&checksum.path)
            .ok_or(PortableError::Validation(
                "Portable checksum entry is missing.",
            ))?;
        if payload.len() as u64 != checksum.byte_size || domain::sha256(payload) != checksum.sha256
        {
            return Err(PortableError::Validation(
                "Portable package checksum verification failed.",
            ));
        }
    }
    let canonical_bytes = entries.get("content/document.json").unwrap();
    let markdown_bytes = entries.get("content/document.md").unwrap();
    let canonical_json = std::str::from_utf8(canonical_bytes)
        .map_err(|_| PortableError::Validation("Portable canonical JSON is not UTF-8."))?;
    let markdown = std::str::from_utf8(markdown_bytes)
        .map_err(|_| PortableError::Validation("Portable Markdown is not UTF-8."))?;
    let (canonical_compact, expected_markdown, canonical_assets) = match manifest.document.kind {
        PortableDocumentKind::BasicLeaf => {
            let valid = crate::document::schema::validate(canonical_json).map_err(|_| {
                PortableError::Validation("Portable Basic Leaf canonical JSON is invalid.")
            })?;
            let expected =
                crate::document::markdown::export(&valid.canonical_json).map_err(|_| {
                    PortableError::Validation("Portable Basic Leaf Markdown projection failed.")
                })?;
            (valid.canonical_json, expected, valid.assets)
        }
        PortableDocumentKind::NarrativeCanvas => {
            let valid = crate::narrative::schema::validate(
                canonical_json,
                Some(&manifest.document.source_document_id),
            )
            .map_err(|_| {
                PortableError::Validation("Portable Narrative canonical JSON is invalid.")
            })?;
            let expected =
                crate::narrative::markdown::export(&valid.canonical_json).map_err(|_| {
                    PortableError::Validation("Portable Narrative Markdown projection failed.")
                })?;
            let value: serde_json::Value = serde_json::from_str(&valid.canonical_json)?;
            let meta = manifest.narrative.as_ref().unwrap();
            if value["title"].as_str() != Some(&manifest.document.title)
                || value["templateId"].as_str() != Some(&meta.template_id)
                || value["templateVersion"].as_i64() != Some(meta.template_version as i64)
                || value
                    .get("visualWorldId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("paper")
                    != meta.visual_world_id
                || value["scenes"].as_array().map(|v| v.len() as u32) != Some(meta.scene_count)
            {
                return Err(PortableError::Validation(
                    "Portable Narrative metadata does not match canonical JSON.",
                ));
            }
            (valid.canonical_json, expected, valid.assets)
        }
    };
    if canonical_pretty_lf(&canonical_compact)?.as_slice() != canonical_bytes.as_slice() {
        return Err(PortableError::Validation(
            "Portable canonical JSON is not pretty UTF-8 JSON with a trailing LF.",
        ));
    }
    if markdown.as_bytes() != expected_markdown.as_bytes() {
        return Err(PortableError::Validation(
            "Portable Markdown differs from canonical JSON.",
        ));
    }
    let manifest_counts: BTreeMap<String, i32> = manifest
        .assets
        .iter()
        .map(|asset| (asset.source_asset_id.clone(), asset.reference_count as i32))
        .collect();
    if canonical_assets != manifest_counts {
        return Err(PortableError::Validation(
            "Portable asset references do not match the manifest.",
        ));
    }
    let mut prepared = BTreeMap::new();
    for asset in &manifest.assets {
        let payload = entries.get(&asset.path).unwrap();
        if payload.len() as u64 != asset.byte_size || domain::sha256(payload) != asset.sha256 {
            return Err(PortableError::Validation(
                "Portable asset payload does not match its manifest.",
            ));
        }
        let value = assets::prepare_imported_asset(&asset.original_name, payload.clone())
            .map_err(|_| PortableError::Validation("Portable asset is corrupt or unsupported."))?;
        if value.mime != asset.mime
            || value.width != asset.width
            || value.height != asset.height
            || value.checksum != asset.sha256
        {
            return Err(PortableError::Validation(
                "Portable asset metadata does not match decoded payload.",
            ));
        }
        prepared.insert(asset.source_asset_id.clone(), value);
    }
    Ok(ValidatedPortablePackage {
        manifest,
        canonical_json: canonical_compact,
        markdown: markdown.into(),
        assets: prepared,
    })
}

pub fn validate_package_bytes(bytes: &[u8]) -> Result<ValidatedPortablePackage, PortableError> {
    let archive = ZipArchive::new(Cursor::new(bytes))?;
    validate_archive(archive, bytes.len() as u64)
}

pub fn validate_package_file(
    path: &std::path::Path,
) -> Result<ValidatedPortablePackage, PortableError> {
    let size = std::fs::metadata(path)?.len();
    if size == 0 || size > domain::MAX_PACKAGE_BYTES as u64 {
        return Err(PortableError::Validation(
            "Portable package must be 64 MiB or smaller.",
        ));
    }
    let archive = ZipArchive::new(std::fs::File::open(path)?)?;
    validate_archive(archive, size)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::portable::manifest::*;
    fn fixture() -> PortableManifest {
        PortableManifest {
            format_version: 1,
            producer: PortableProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-04T00:00:00Z".into(),
            document: PortableDocumentMetadata {
                kind: PortableDocumentKind::BasicLeaf,
                schema_version: 1,
                title: "Leaf".into(),
                source_document_id: "00000000-0000-7000-8000-000000000001".into(),
                canonical_path: "content/document.json".into(),
                markdown_path: "content/document.md".into(),
                asset_policy: "privacy_sanitized_visual_v1".into(),
            },
            narrative: None,
            assets: vec![],
        }
    }
    fn valid_bytes() -> Vec<u8> {
        let json = r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Xin chào"}]}]}"#;
        let md = crate::document::markdown::export(json).unwrap();
        build_package(&fixture(), json, &md, vec![]).unwrap()
    }
    fn rewrite(bytes: &[u8], change: impl FnOnce(&mut BTreeMap<String, Vec<u8>>)) -> Vec<u8> {
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
    fn raw_zip(entries: &[(&str, &[u8], u32)]) -> Vec<u8> {
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
    fn force_zip_flags(mut bytes: Vec<u8>, method: Option<u16>, encrypted: bool) -> Vec<u8> {
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
    fn duplicate_name_zip() -> Vec<u8> {
        let mut bytes = raw_zip(&[
            ("manifestA.json", b"x", 0o644),
            ("manifestB.json", b"y", 0o644),
        ]);
        for index in 0..=bytes.len() - "manifestB.json".len() {
            if &bytes[index..index + "manifestB.json".len()] == b"manifestB.json" {
                bytes[index..index + "manifestA.json".len()].copy_from_slice(b"manifestA.json");
            }
        }
        bytes
    }
    fn valid_asset_bytes() -> Vec<u8> {
        let source_asset_id = "00000000-0000-7000-8000-000000000099";
        let bytes = crate::document::assets::tiny_png();
        let prepared =
            crate::document::assets::prepare_imported_asset("pixel.png", bytes.clone()).unwrap();
        let mut manifest = fixture();
        manifest.assets.push(PortableManifestAsset {
            source_asset_id: source_asset_id.into(),
            path: format!("assets/{source_asset_id}.png"),
            original_name: "pixel.png".into(),
            mime: prepared.mime,
            byte_size: prepared.byte_size,
            width: prepared.width,
            height: prepared.height,
            reference_count: 2,
            sha256: prepared.checksum,
        });
        let json = serde_json::json!({"type":"doc","content":[
            {"type":"image","attrs":{"assetId":source_asset_id}},
            {"type":"image","attrs":{"assetId":source_asset_id}}
        ]})
        .to_string();
        let markdown = crate::document::markdown::export(&json).unwrap();
        build_package(
            &manifest,
            &json,
            &markdown,
            vec![PortableArchiveAsset {
                path: format!("assets/{source_asset_id}.png"),
                bytes,
            }],
        )
        .unwrap()
    }
    #[test]
    fn writer_is_stored_sorted_and_round_trips() {
        let bytes = valid_bytes();
        let mut zip = ZipArchive::new(Cursor::new(&bytes)).unwrap();
        let names: Vec<_> = (0..zip.len())
            .map(|i| zip.by_index(i).unwrap().name().to_owned())
            .collect();
        assert_eq!(
            names,
            vec![
                "README.md",
                "checksums.json",
                "content/document.json",
                "content/document.md",
                "manifest.json"
            ]
        );
        for i in 0..zip.len() {
            assert_eq!(
                zip.by_index(i).unwrap().compression(),
                CompressionMethod::Stored
            );
        }
        let valid = validate_package_bytes(&bytes).unwrap();
        assert_eq!(valid.manifest.document.title, "Leaf");
    }
    #[test]
    fn rejects_deflate_and_traversal() {
        for name in [
            "../evil",
            "/absolute",
            "C:\\evil",
            "a\\b",
            "a/../b",
            "a\u{0001}b",
        ] {
            assert!(
                validate_package_bytes(&raw_zip(&[(name, b"x", 0o644)])).is_err(),
                "{name}"
            );
        }
        for method in [8u16, 12, 93] {
            let bytes =
                force_zip_flags(raw_zip(&[("README.md", b"x", 0o644)]), Some(method), false);
            assert!(validate_package_bytes(&bytes).is_err(), "method {method}");
        }
        let encrypted = force_zip_flags(raw_zip(&[("README.md", b"x", 0o644)]), None, true);
        assert!(validate_package_bytes(&encrypted).is_err());
    }
    #[test]
    fn rejects_extra_files_and_checksum_or_markdown_divergence() {
        let bytes = valid_bytes();
        assert!(
            validate_package_bytes(&rewrite(&bytes, |entries| {
                entries.insert("extra.txt".into(), b"x".to_vec());
            }))
            .is_err()
        );
        assert!(
            validate_package_bytes(&rewrite(&bytes, |entries| {
                entries.insert("content/document.md".into(), b"different\n".to_vec());
            }))
            .is_err()
        );
    }
    #[test]
    fn rejects_unknown_manifest_fields_and_directory_entries() {
        let bytes = valid_bytes();
        let unknown = rewrite(&bytes, |entries| {
            let mut value: serde_json::Value =
                serde_json::from_slice(&entries["manifest.json"]).unwrap();
            value["unknown"] = serde_json::json!(true);
            entries.insert("manifest.json".into(), serde_json::to_vec(&value).unwrap());
        });
        assert!(validate_package_bytes(&unknown).is_err());
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        writer
            .add_directory("assets/", SimpleFileOptions::default())
            .unwrap();
        assert!(validate_package_bytes(&writer.finish().unwrap().into_inner()).is_err());
    }
    #[test]
    fn rejects_duplicate_symlink_long_and_excessive_inventories() {
        assert!(validate_package_bytes(&duplicate_name_zip()).is_err());
        assert!(validate_package_bytes(&raw_zip(&[("manifest.json", b"x", 0o120777)])).is_err());
        let long = format!("assets/{}.png", "a".repeat(domain::MAX_PATH_BYTES));
        assert!(validate_package_bytes(&raw_zip(&[(&long, b"x", 0o644)])).is_err());
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
    fn rejects_malformed_text_checksums_and_asset_inventory() {
        let base = valid_bytes();
        for changed in [
            rewrite(&base, |entries| {
                entries.insert("manifest.json".into(), b"{".to_vec());
            }),
            rewrite(&base, |entries| {
                entries.insert("checksums.json".into(), b"{".to_vec());
            }),
            rewrite(&base, |entries| {
                entries.insert("content/document.json".into(), vec![0xff]);
            }),
            rewrite(&base, |entries| {
                entries.remove("checksums.json");
            }),
        ] {
            assert!(validate_package_bytes(&changed).is_err());
        }
        let asset = valid_asset_bytes();
        assert!(
            validate_package_bytes(&rewrite(&asset, |entries| {
                entries.remove("assets/00000000-0000-7000-8000-000000000099.png");
            }))
            .is_err()
        );
        assert!(
            validate_package_bytes(&rewrite(&asset, |entries| {
                entries.insert(
                    "assets/00000000-0000-7000-8000-000000000099.png".into(),
                    b"not an image".to_vec(),
                );
            }))
            .is_err()
        );
    }
    #[test]
    fn empty_markdown_reaches_semantic_validation_instead_of_inventory_rejection() {
        let json = r#"{"type":"doc","content":[]}"#;
        let bytes = build_package(&fixture(), json, "", vec![]).unwrap();
        assert!(matches!(
            validate_package_bytes(&bytes),
            Err(PortableError::Validation(
                "Portable Markdown differs from canonical JSON."
            ))
        ));
    }
    #[test]
    fn file_backed_validation_matches_raw_validation() {
        let root = std::env::temp_dir().join(format!("lw_portable_file_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&root).unwrap();
        let path = root.join("fixture.lifeweave.zip");
        std::fs::write(&path, valid_bytes()).unwrap();
        assert_eq!(
            validate_package_file(&path)
                .unwrap()
                .manifest
                .document
                .title,
            "Leaf"
        );
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn fixed_timestamp_and_no_comments_are_emitted() {
        let bytes = valid_bytes();
        let mut zip = ZipArchive::new(Cursor::new(bytes)).unwrap();
        assert_eq!(zip.comment(), b"");
        for index in 0..zip.len() {
            let file = zip.by_index(index).unwrap();
            assert_eq!(file.last_modified(), Some(zip::DateTime::default()));
            assert_eq!(file.comment(), "");
        }
    }
    #[test]
    #[ignore = "writes an evidence-only archive to an explicitly supplied target path"]
    fn portable_archive_inspection_fixture() {
        let output = std::env::var_os("LIFEWEAVE_PORTABLE_INSPECTION_PATH")
            .expect("LIFEWEAVE_PORTABLE_INSPECTION_PATH is required");
        std::fs::write(output, valid_bytes()).unwrap();
    }
}
