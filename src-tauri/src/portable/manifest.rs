use super::domain::{self, PORTABLE_FORMAT_VERSION, PortableDocumentKind, PortableError};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableProducer {
    pub application: String,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableDocumentMetadata {
    pub kind: PortableDocumentKind,
    pub schema_version: i32,
    pub title: String,
    pub source_document_id: String,
    pub canonical_path: String,
    pub markdown_path: String,
    pub asset_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableNarrativeMetadata {
    pub template_id: String,
    pub template_version: i32,
    pub visual_world_id: String,
    pub scene_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableManifestAsset {
    pub source_asset_id: String,
    pub path: String,
    pub original_name: String,
    pub mime: String,
    pub byte_size: u64,
    pub width: u32,
    pub height: u32,
    pub reference_count: u32,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableManifest {
    pub format_version: u32,
    pub producer: PortableProducer,
    pub exported_at: String,
    pub document: PortableDocumentMetadata,
    pub narrative: Option<PortableNarrativeMetadata>,
    pub assets: Vec<PortableManifestAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableChecksumEntry {
    pub path: String,
    pub byte_size: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PortableChecksums {
    pub format_version: u32,
    pub algorithm: String,
    pub entries: Vec<PortableChecksumEntry>,
}

fn pretty_lf<T: Serialize>(value: &T) -> Result<Vec<u8>, PortableError> {
    let mut bytes = serde_json::to_vec_pretty(value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

impl PortableManifest {
    pub fn bytes(&self) -> Result<Vec<u8>, PortableError> {
        pretty_lf(self)
    }
    pub fn parse(bytes: &[u8]) -> Result<Self, PortableError> {
        Ok(serde_json::from_slice(bytes)?)
    }
    pub fn validate(&self) -> Result<(), PortableError> {
        if self.format_version != PORTABLE_FORMAT_VERSION {
            return Err(PortableError::Unsupported);
        }
        if self.producer.application != "lifeweave-desktop"
            || self.document.schema_version != 1
            || self.document.canonical_path != "content/document.json"
            || self.document.markdown_path != "content/document.md"
            || self.document.asset_policy != "privacy_sanitized_visual_v1"
            || !crate::document::domain::valid_id(&self.document.source_document_id)
            || self.document.title.trim().is_empty()
            || self.document.title.len() > 200
            || chrono::DateTime::parse_from_rfc3339(&self.exported_at).is_err()
        {
            return Err(PortableError::Validation(
                "Portable manifest metadata is invalid.",
            ));
        }
        match (self.document.kind, &self.narrative) {
            (PortableDocumentKind::BasicLeaf, None) => {}
            (PortableDocumentKind::NarrativeCanvas, Some(value))
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
            _ => {
                return Err(PortableError::Validation(
                    "Portable narrative metadata is invalid.",
                ));
            }
        }
        if self.assets.len() > domain::MAX_ASSET_COUNT {
            return Err(PortableError::Validation(
                "Portable package has too many assets.",
            ));
        }
        let mut prior = None;
        let mut paths = BTreeSet::new();
        for asset in &self.assets {
            if prior.is_some_and(|value: &String| value >= &asset.source_asset_id)
                || !crate::document::domain::valid_id(&asset.source_asset_id)
                || !domain::safe_archive_path(&asset.path)
                || asset.path
                    != format!(
                        "assets/{}.{}",
                        asset.source_asset_id,
                        match asset.mime.as_str() {
                            "image/png" => "png",
                            "image/jpeg" => "jpg",
                            "image/webp" => "webp",
                            "image/gif" => "gif",
                            _ => "invalid",
                        }
                    )
                || asset.original_name.is_empty()
                || domain::safe_original_name(&asset.original_name) != asset.original_name
                || !matches!(
                    asset.mime.as_str(),
                    "image/png" | "image/jpeg" | "image/webp" | "image/gif"
                )
                || asset.byte_size == 0
                || asset.byte_size > crate::document::domain::MAX_ASSET_BYTES as u64
                || asset.width == 0
                || asset.height == 0
                || asset.width > 12000
                || asset.height > 12000
                || asset.reference_count == 0
                || !domain::valid_sha256(&asset.sha256)
                || !paths.insert(asset.path.clone())
            {
                return Err(PortableError::Validation(
                    "Portable manifest asset is invalid.",
                ));
            }
            prior = Some(&asset.source_asset_id);
        }
        Ok(())
    }
}

impl PortableChecksums {
    pub fn from_entries<'a>(entries: impl Iterator<Item = (&'a String, &'a Vec<u8>)>) -> Self {
        Self {
            format_version: 1,
            algorithm: "sha256".into(),
            entries: entries
                .map(|(path, bytes)| PortableChecksumEntry {
                    path: path.clone(),
                    byte_size: bytes.len() as u64,
                    sha256: domain::sha256(bytes),
                })
                .collect(),
        }
    }
    pub fn bytes(&self) -> Result<Vec<u8>, PortableError> {
        pretty_lf(self)
    }
    pub fn parse(bytes: &[u8]) -> Result<Self, PortableError> {
        Ok(serde_json::from_slice(bytes)?)
    }
    pub fn validate(&self) -> Result<(), PortableError> {
        if self.format_version != 1 || self.algorithm != "sha256" {
            return Err(PortableError::Unsupported);
        }
        let mut previous: Option<&str> = None;
        for entry in &self.entries {
            if !domain::safe_archive_path(&entry.path)
                || entry.path == "checksums.json"
                || previous.is_some_and(|value| value >= entry.path.as_str())
                || !domain::valid_sha256(&entry.sha256)
            {
                return Err(PortableError::Validation(
                    "Portable checksum inventory is invalid.",
                ));
            }
            previous = Some(&entry.path);
        }
        Ok(())
    }
}

fn readme_scalar(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_control() { ' ' } else { ch })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn readme(manifest: &PortableManifest) -> Vec<u8> {
    format!("# Lifeweave portable document\n\n- Title: {}\n- Document type: {}\n- Exported by: {} {}\n- Package format: {}\n- Asset policy: privacy-sanitized visual payloads\n\n## Files\n- content/document.json — canonical authority\n- content/document.md — human-readable fallback\n- assets/ — privacy-sanitized local visual payloads\n- manifest.json — package metadata\n- checksums.json — SHA-256 integrity data\n\n## Important\nThis is a single-document portable package, not a full Lifeweave backup.\nLife tree placement, Tasks, analytics, drafts and revision history are not included.\n",
        readme_scalar(&manifest.document.title), manifest.document.kind.label(),
        readme_scalar(&manifest.producer.application), readme_scalar(&manifest.producer.app_version),
        manifest.format_version).into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn basic() -> PortableManifest {
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
                title: "Ví dụ".into(),
                source_document_id: "00000000-0000-7000-8000-000000000001".into(),
                canonical_path: "content/document.json".into(),
                markdown_path: "content/document.md".into(),
                asset_policy: "privacy_sanitized_visual_v1".into(),
            },
            narrative: None,
            assets: vec![],
        }
    }
    #[test]
    fn basic_round_trip_and_unknown_rejected() {
        let value = basic();
        let bytes = value.bytes().unwrap();
        let parsed = PortableManifest::parse(&bytes).unwrap();
        assert_eq!(parsed, value);
        parsed.validate().unwrap();
        let mut json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        json["extra"] = serde_json::json!(true);
        assert!(PortableManifest::parse(&serde_json::to_vec(&json).unwrap()).is_err());
    }
    #[test]
    fn narrative_contract_is_required_and_validated() {
        let mut value = basic();
        value.document.kind = PortableDocumentKind::NarrativeCanvas;
        assert!(value.validate().is_err());
        value.narrative = Some(PortableNarrativeMetadata {
            template_id: "knowledge_dossier".into(),
            template_version: 1,
            visual_world_id: "paper".into(),
            scene_count: 3,
        });
        value.validate().unwrap();
        for mutation in ["template", "version", "world", "scenes"] {
            let mut invalid = value.clone();
            let narrative = invalid.narrative.as_mut().unwrap();
            match mutation {
                "template" => narrative.template_id = "unknown".into(),
                "version" => narrative.template_version = 2,
                "world" => narrative.visual_world_id = "custom".into(),
                _ => narrative.scene_count = 0,
            }
            assert!(invalid.validate().is_err(), "{mutation}");
        }
        let mut basic_with_narrative = value;
        basic_with_narrative.document.kind = PortableDocumentKind::BasicLeaf;
        assert!(basic_with_narrative.validate().is_err());
    }
    #[test]
    fn checksums_are_sorted_and_strict() {
        let entries = std::collections::BTreeMap::from([
            ("README.md".into(), b"readme".to_vec()),
            ("manifest.json".into(), b"{}".to_vec()),
        ]);
        let value = PortableChecksums::from_entries(entries.iter());
        value.validate().unwrap();
        assert_eq!(value.entries[0].path, "README.md");
        let mut duplicate = value.clone();
        duplicate.entries.push(duplicate.entries[0].clone());
        assert!(duplicate.validate().is_err());
        let mut uppercase = value;
        uppercase.entries[0].sha256 = "A".repeat(64);
        assert!(uppercase.validate().is_err());
    }
    #[test]
    fn locked_manifest_fields_reject_drift() {
        for field in [
            "format",
            "producer",
            "schema",
            "canonical",
            "markdown",
            "policy",
        ] {
            let mut value = basic();
            match field {
                "format" => value.format_version = 2,
                "producer" => value.producer.application = "other".into(),
                "schema" => value.document.schema_version = 2,
                "canonical" => value.document.canonical_path = "document.json".into(),
                "markdown" => value.document.markdown_path = "document.md".into(),
                _ => value.document.asset_policy = "original_bytes".into(),
            }
            assert!(value.validate().is_err(), "{field}");
        }
    }
    #[test]
    fn original_names_and_readme_are_privacy_safe_and_deterministic() {
        assert_eq!(
            domain::safe_original_name("C:\\Users\\name\\photo?.png"),
            "photo_.png"
        );
        assert_eq!(domain::safe_original_name("../CON.png"), "image");
        let mut value = basic();
        value.document.title = "Line one\r\nLine two".into();
        let text = String::from_utf8(readme(&value)).unwrap();
        assert!(text.contains("- Title: Line one Line two\n"));
        assert_eq!(readme(&value), readme(&value));
    }
}
