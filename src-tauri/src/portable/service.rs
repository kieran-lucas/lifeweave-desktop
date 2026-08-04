use super::{
    archive,
    domain::{self, PortableError},
    dto::*,
    manifest::*,
    repository,
};
use crate::{
    document::assets,
    infrastructure::{
        durability,
        sqlite::{DbError, runtime::DatabaseRuntime},
    },
    ipc::error::IpcError,
};
use std::{
    fs::OpenOptions,
    io::Write as _,
    path::{Path, PathBuf},
};
use tauri::State;

fn map_db(error: DbError) -> IpcError {
    match error {
        DbError::Maintenance => IpcError::Validation {
            message: "Database is busy; try again.".into(),
        },
        DbError::SchemaTooNew { .. }
        | DbError::PragmaAssertion { .. }
        | DbError::InvalidMigrationList => IpcError::Corruption,
        _ => IpcError::Storage,
    }
}
fn map(error: PortableError) -> IpcError {
    match error {
        PortableError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        PortableError::NotFound => IpcError::NotFound,
        PortableError::Conflict => IpcError::Validation {
            message: "Portable import operation authority conflicts.".into(),
        },
        PortableError::Unsupported => IpcError::Unsupported,
        PortableError::Json(_) | PortableError::Zip(_) => IpcError::Validation {
            message: "Portable package structure is invalid.".into(),
        },
        PortableError::Db(_) | PortableError::Io(_) => IpcError::Storage,
    }
}

fn app_root(state: &DatabaseRuntime) -> PathBuf {
    state
        .db_path()
        .parent()
        .unwrap_or(Path::new("."))
        .to_path_buf()
}
fn export_root(root: &Path) -> PathBuf {
    root.join("exports/portable")
}
fn import_root(root: &Path) -> PathBuf {
    root.join("imports/portable")
}
fn ticket_path(root: &Path, id: &str) -> PathBuf {
    export_root(root).join(format!("{id}.ticket.json"))
}
fn package_path(root: &Path, id: &str) -> PathBuf {
    export_root(root).join(format!("{id}.lifeweave.zip"))
}

fn cleanup_stale_exports_where(root: &Path, stale: impl Fn(&std::fs::DirEntry) -> bool) {
    let directory = export_root(root);
    let Ok(entries) = std::fs::read_dir(&directory) else {
        return;
    };
    for entry in entries.take(domain::MAX_STALE_CLEANUP_ENTRIES).flatten() {
        let Ok(kind) = entry.file_type() else {
            continue;
        };
        if !kind.is_file() || kind.is_symlink() {
            continue;
        }
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        let id = name
            .strip_suffix(".lifeweave.zip")
            .or_else(|| name.strip_suffix(".ticket.json"))
            .or_else(|| {
                name.strip_prefix('.')
                    .and_then(|value| value.strip_suffix(".staging"))
            });
        if !id.is_some_and(domain::valid_opaque_id) {
            continue;
        }
        if stale(&entry) {
            let _ = durability::durable_remove_file(&entry.path());
        }
    }
}

fn cleanup_stale_exports(root: &Path) {
    let now = std::time::SystemTime::now();
    cleanup_stale_exports_where(root, |entry| {
        entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .is_ok_and(|modified| domain::staging_is_stale(modified, now))
    });
}

fn cleanup_stale_imports_where(root: &Path, stale: impl Fn(&std::fs::DirEntry) -> bool) {
    let directory = import_root(root);
    let Ok(entries) = std::fs::read_dir(&directory) else {
        return;
    };
    for entry in entries.take(domain::MAX_STALE_CLEANUP_ENTRIES).flatten() {
        let Ok(kind) = entry.file_type() else {
            continue;
        };
        if !kind.is_dir() || kind.is_symlink() {
            continue;
        }
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if !domain::valid_opaque_id(&name) {
            continue;
        }
        if stale(&entry) {
            let _ = durability::durable_remove_dir_all(&entry.path());
        }
    }
}

fn cleanup_stale_imports(root: &Path) {
    let now = std::time::SystemTime::now();
    cleanup_stale_imports_where(root, |entry| {
        entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .is_ok_and(|modified| domain::staging_is_stale(modified, now))
    });
}

pub(crate) fn cleanup_stale_portable_artifacts(root: &Path) {
    cleanup_stale_exports(root);
    cleanup_stale_imports(root);
}

fn assemble_export(
    root: &Path,
    source: repository::PortableExportSource,
) -> Result<PortablePackageExportTicket, PortableError> {
    cleanup_stale_exports(root);
    let mut manifest_assets = Vec::new();
    let mut archive_assets = Vec::new();
    for asset in &source.assets {
        let original = assets::read_verified_original(root, &asset.relative_path, &asset.checksum)
            .map_err(|_| PortableError::Validation("Document asset authority is invalid."))?;
        let sanitized = assets::sanitized_export(&original, &asset.mime)
            .map_err(|_| PortableError::Validation("Asset privacy sanitization failed."))?;
        let prepared = assets::prepare_imported_asset(&asset.original_name, sanitized.clone())
            .map_err(|_| PortableError::Validation("Sanitized asset validation failed."))?;
        let path = format!("assets/{}.{}", asset.source_asset_id, prepared.extension);
        manifest_assets.push(PortableManifestAsset {
            source_asset_id: asset.source_asset_id.clone(),
            path: path.clone(),
            original_name: domain::safe_original_name(&asset.original_name),
            mime: prepared.mime,
            byte_size: prepared.byte_size,
            width: prepared.width,
            height: prepared.height,
            reference_count: asset.reference_count,
            sha256: prepared.checksum,
        });
        archive_assets.push(archive::PortableArchiveAsset {
            path,
            bytes: sanitized,
        });
    }
    let manifest = PortableManifest {
        format_version: 1,
        producer: PortableProducer {
            application: "lifeweave-desktop".into(),
            app_version: env!("CARGO_PKG_VERSION").into(),
        },
        exported_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        document: PortableDocumentMetadata {
            kind: source.kind,
            schema_version: source.schema_version,
            title: source.title.clone(),
            source_document_id: source.document_id.clone(),
            canonical_path: "content/document.json".into(),
            markdown_path: "content/document.md".into(),
            asset_policy: "privacy_sanitized_visual_v1".into(),
        },
        narrative: source.narrative,
        assets: manifest_assets,
    };
    let bytes = archive::build_package(
        &manifest,
        &source.canonical_json,
        &source.markdown,
        archive_assets,
    )?;
    let export_id = domain::new_opaque_id();
    let directory = export_root(root);
    std::fs::create_dir_all(&directory)?;
    let staging = directory.join(format!(".{export_id}.staging"));
    let final_path = package_path(root, &export_id);
    let publish = (|| -> Result<(), PortableError> {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&staging)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        drop(file);
        durability::durable_rename(&staging, &final_path)?;
        Ok(())
    })();
    if let Err(error) = publish {
        let _ = std::fs::remove_file(&staging);
        let _ = durability::durable_remove_file(&final_path);
        return Err(error);
    }
    let published_bytes = std::fs::read(&final_path)?;
    if published_bytes != bytes {
        let _ = durability::durable_remove_file(&final_path);
        return Err(PortableError::Validation(
            "Published portable package verification failed.",
        ));
    }
    let mut warnings = vec![
        "Asset metadata is removed from the portable visual payload.".into(),
        "This package is not a full application backup.".into(),
    ];
    if source.has_recoverable_draft {
        warnings.insert(0, "A recoverable draft exists and is not included.".into());
    }
    let ticket = PortablePackageExportTicket {
        export_id: export_id.clone(),
        file_name: format!("{}.lifeweave.zip", domain::safe_file_stem(&source.title)),
        byte_size: bytes.len() as u64,
        sha256: domain::sha256(&bytes),
        document_kind: source.kind,
        title: source.title,
        asset_count: manifest.assets.len() as u32,
        warnings,
    };
    let mut ticket_bytes = serde_json::to_vec_pretty(&ticket)?;
    ticket_bytes.push(b'\n');
    if let Err(error) = durability::durable_write(&ticket_path(root, &export_id), &ticket_bytes) {
        let _ = durability::durable_remove_file(&final_path);
        let _ = durability::durable_remove_file(&ticket_path(root, &export_id));
        return Err(error.into());
    }
    Ok(ticket)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub async fn prepare_portable_package_export(
    state: State<'_, DatabaseRuntime>,
    input: PreparePortablePackageExportInput,
) -> Result<PortablePackageExportTicket, IpcError> {
    let root = app_root(&state);
    let kind = input.document_kind;
    let id = input.document_id;
    let source = state
        .execute(move |conn| Ok(repository::export_source(conn, kind, &id)))
        .map_err(map_db)?
        .map_err(map)?;
    tauri::async_runtime::spawn_blocking(move || assemble_export(&root, source))
        .await
        .map_err(|_| IpcError::Storage)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, export_id))]
pub fn read_portable_package_export(
    state: State<'_, DatabaseRuntime>,
    export_id: String,
) -> Result<tauri::ipc::Response, IpcError> {
    if !domain::valid_opaque_id(&export_id) {
        return Err(IpcError::NotFound);
    }
    let root = app_root(&state);
    let ticket: PortablePackageExportTicket = serde_json::from_slice(
        &std::fs::read(ticket_path(&root, &export_id)).map_err(|_| IpcError::NotFound)?,
    )
    .map_err(|_| IpcError::Storage)?;
    if ticket.export_id != export_id {
        return Err(IpcError::Storage);
    }
    let bytes = std::fs::read(package_path(&root, &export_id)).map_err(|_| IpcError::NotFound)?;
    if bytes.len() > domain::MAX_PACKAGE_BYTES
        || bytes.len() as u64 != ticket.byte_size
        || domain::sha256(&bytes) != ticket.sha256
    {
        return Err(IpcError::Storage);
    }
    let _ = durability::durable_remove_file(&package_path(&root, &export_id));
    let _ = durability::durable_remove_file(&ticket_path(&root, &export_id));
    Ok(tauri::ipc::Response::new(bytes))
}

fn stage_preview(
    root: &Path,
    bytes: Vec<u8>,
) -> Result<PortablePackageImportPreview, PortableError> {
    cleanup_stale_imports(root);
    if bytes.is_empty() || bytes.len() > domain::MAX_PACKAGE_BYTES {
        return Err(PortableError::Validation(
            "Portable package must be 64 MiB or smaller.",
        ));
    }
    let import_id = domain::new_opaque_id();
    let base = import_root(root);
    std::fs::create_dir_all(&base)?;
    let owned = base.join(&import_id);
    std::fs::create_dir(&owned)?;
    let result = (|| -> Result<PortablePackageImportPreview, PortableError> {
        let package_path = owned.join("package.lifeweave.zip");
        durability::durable_write(&package_path, &bytes)?;
        let package = archive::validate_package_file(&package_path)?;
        let narrative = package.manifest.narrative.as_ref();
        let preview = PortablePackageImportPreview {
            import_id: import_id.clone(),
            document_kind: package.manifest.document.kind,
            title: package.manifest.document.title,
            document_schema_version: package.manifest.document.schema_version,
            template_id: narrative.map(|v| v.template_id.clone()),
            template_version: narrative.map(|v| v.template_version),
            visual_world_id: narrative.map(|v| v.visual_world_id.clone()),
            scene_count: narrative.map(|v| v.scene_count),
            asset_count: package.manifest.assets.len() as u32,
            total_asset_bytes: package.manifest.assets.iter().map(|v| v.byte_size).sum(),
            package_bytes: bytes.len() as u64,
            warnings: vec![
                "The imported document will receive new local identities.".into(),
                "The target Life leaf title and tree placement will not change.".into(),
                "Drafts and revision history are not included.".into(),
                "Asset metadata was removed during export.".into(),
            ],
        };
        let mut sidecar = serde_json::to_vec_pretty(&preview)?;
        sidecar.push(b'\n');
        durability::durable_write(&owned.join("preview.json"), &sidecar)?;
        Ok(preview)
    })();
    if result.is_err() {
        let _ = durability::durable_remove_dir_all(&owned);
    }
    result
}

#[tauri::command]
#[tracing::instrument(skip(state, request))]
pub async fn preview_portable_package_import(
    state: State<'_, DatabaseRuntime>,
    request: tauri::ipc::Request<'_>,
) -> Result<PortablePackageImportPreview, IpcError> {
    let bytes = import_request_bytes(request.body())?;
    let root = app_root(&state);
    tauri::async_runtime::spawn_blocking(move || stage_preview(&root, bytes))
        .await
        .map_err(|_| IpcError::Storage)?
        .map_err(map)
}

fn import_request_bytes(body: &tauri::ipc::InvokeBody) -> Result<Vec<u8>, IpcError> {
    match body {
        tauri::ipc::InvokeBody::Raw(value) if value.len() <= domain::MAX_PACKAGE_BYTES => {
            Ok(value.clone())
        }
        tauri::ipc::InvokeBody::Raw(_) => Err(IpcError::Validation {
            message: "Portable package must be 64 MiB or smaller.".into(),
        }),
        tauri::ipc::InvokeBody::Json(_) => Err(IpcError::Validation {
            message: "Portable import requires a raw binary request.".into(),
        }),
    }
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub async fn confirm_portable_package_import(
    state: State<'_, DatabaseRuntime>,
    input: ConfirmPortablePackageImportInput,
) -> Result<PortablePackageImportResult, IpcError> {
    if !domain::valid_opaque_id(&input.import_id) {
        return Err(IpcError::NotFound);
    }
    let operation_check = input.clone();
    if let Some(result) = state
        .execute(move |conn| Ok(repository::existing_operation_any(conn, &operation_check)))
        .map_err(map_db)?
        .map_err(map)?
    {
        let preview_path = import_root(&app_root(&state))
            .join(&input.import_id)
            .join("preview.json");
        if let Ok(bytes) = std::fs::read(preview_path) {
            let preview: PortablePackageImportPreview =
                serde_json::from_slice(&bytes).map_err(|_| IpcError::Storage)?;
            if preview.document_kind != result.document_kind {
                return Err(IpcError::Validation {
                    message: "Portable import operation belongs to another document kind.".into(),
                });
            }
        }
        return Ok(result);
    }
    let preview: PortablePackageImportPreview = serde_json::from_slice(
        &std::fs::read(
            import_root(&app_root(&state))
                .join(&input.import_id)
                .join("preview.json"),
        )
        .map_err(|_| IpcError::NotFound)?,
    )
    .map_err(|_| IpcError::Storage)?;
    let kind = preview.document_kind;
    let check = input.clone();
    if let Some(result) = state
        .execute(move |conn| Ok(repository::existing_operation(conn, &check, kind)))
        .map_err(map_db)?
        .map_err(map)?
    {
        return Ok(result);
    }
    let root = app_root(&state);
    let staged = import_root(&root).join(&input.import_id);
    let package_path = staged.join("package.lifeweave.zip");
    if !package_path.is_file() {
        return Err(IpcError::NotFound);
    }
    let package =
        tauri::async_runtime::spawn_blocking(move || archive::validate_package_file(&package_path))
            .await
            .map_err(|_| IpcError::Storage)?
            .map_err(map)?;
    if package.manifest.document.kind != kind {
        return Err(IpcError::Storage);
    }
    let tx_root = root.clone();
    let result = state
        .execute(move |conn| Ok(repository::confirm_import(conn, &tx_root, input, package)))
        .map_err(map_db)?
        .map_err(map)?;
    let _ = durability::durable_remove_dir_all(&staged);
    Ok(result)
}

#[tauri::command]
#[tracing::instrument(skip(state, import_id))]
pub fn discard_portable_package_import(
    state: State<'_, DatabaseRuntime>,
    import_id: String,
) -> Result<(), IpcError> {
    if !domain::valid_opaque_id(&import_id) {
        return Err(IpcError::NotFound);
    }
    let owned = import_root(&app_root(&state)).join(import_id);
    if !owned.exists() {
        return Ok(());
    }
    let metadata = std::fs::symlink_metadata(&owned).map_err(|_| IpcError::Storage)?;
    if !metadata.file_type().is_dir() || metadata.file_type().is_symlink() {
        return Err(IpcError::Storage);
    }
    durability::durable_remove_dir_all(&owned).map_err(|_| IpcError::Storage)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        document,
        infrastructure::sqlite::{connection::open_memory_connection, migrations::run_migrations},
        life, narrative,
        portable::domain::PortableDocumentKind,
    };
    use rusqlite::Connection;
    fn root(name: &str) -> PathBuf {
        let path =
            std::env::temp_dir().join(format!("lw_portable_{name}_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&path).unwrap();
        path
    }
    fn db() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }
    fn leaf(conn: &mut Connection, title: &str) -> String {
        life::repository::create(
            conn,
            life::dto::CreateLifeNodeInput {
                parent_id: "life-root".into(),
                title: title.into(),
                short_description: "".into(),
                icon_key: "life-leaf".into(),
                branch_theme_id: "neutral".into(),
            },
        )
        .unwrap()
        .node
        .id
    }
    #[test]
    fn opaque_paths_never_accept_arbitrary_ids() {
        assert!(!domain::valid_opaque_id("../escape"));
        assert_eq!(
            import_request_bytes(&tauri::ipc::InvokeBody::Raw(vec![1, 2, 3])).unwrap(),
            vec![1, 2, 3]
        );
        assert!(
            import_request_bytes(&tauri::ipc::InvokeBody::Json(serde_json::json!([1, 2, 3])))
                .is_err()
        );
        assert!(
            import_request_bytes(&tauri::ipc::InvokeBody::Raw(vec![
                0;
                domain::MAX_PACKAGE_BYTES
                    + 1
            ]))
            .is_err()
        );
    }

    #[test]
    fn stale_cleanup_is_owned_bounded_idempotent_and_missing_safe() {
        let root = root("stale-cleanup");
        cleanup_stale_portable_artifacts(&root);

        let exports = export_root(&root);
        let imports = import_root(&root);
        std::fs::create_dir_all(&exports).unwrap();
        std::fs::create_dir_all(&imports).unwrap();
        let stale_export = domain::new_opaque_id();
        let fresh_export = domain::new_opaque_id();
        for suffix in [".lifeweave.zip", ".ticket.json"] {
            std::fs::write(exports.join(format!("{stale_export}{suffix}")), b"stale").unwrap();
            std::fs::write(exports.join(format!("{fresh_export}{suffix}")), b"fresh").unwrap();
        }
        std::fs::write(exports.join(format!(".{stale_export}.staging")), b"stale").unwrap();
        std::fs::write(exports.join("unrelated.txt"), b"keep").unwrap();
        let stale_import = domain::new_opaque_id();
        let fresh_import = domain::new_opaque_id();
        std::fs::create_dir(imports.join(&stale_import)).unwrap();
        std::fs::write(
            imports.join(&stale_import).join("package.lifeweave.zip"),
            b"x",
        )
        .unwrap();
        std::fs::create_dir(imports.join(&fresh_import)).unwrap();
        std::fs::create_dir(imports.join("not-an-owned-id")).unwrap();

        cleanup_stale_exports_where(&root, |entry| {
            entry.file_name().to_string_lossy().contains(&stale_export)
        });
        cleanup_stale_imports_where(&root, |entry| {
            entry.file_name().to_string_lossy() == stale_import
        });
        assert!(
            !exports
                .join(format!("{stale_export}.lifeweave.zip"))
                .exists()
        );
        assert!(!exports.join(format!("{stale_export}.ticket.json")).exists());
        assert!(!exports.join(format!(".{stale_export}.staging")).exists());
        assert!(
            exports
                .join(format!("{fresh_export}.lifeweave.zip"))
                .exists()
        );
        assert!(exports.join(format!("{fresh_export}.ticket.json")).exists());
        assert!(exports.join("unrelated.txt").exists());
        assert!(!imports.join(&stale_import).exists());
        assert!(imports.join(&fresh_import).exists());
        assert!(imports.join("not-an-owned-id").exists());

        cleanup_stale_exports_where(&root, |_| true);
        cleanup_stale_imports_where(&root, |_| true);
        assert!(exports.join("unrelated.txt").exists());
        assert!(imports.join("not-an-owned-id").exists());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn stale_cleanup_inspects_at_most_the_direct_child_cap() {
        let root = root("stale-cap");
        let exports = export_root(&root);
        std::fs::create_dir_all(&exports).unwrap();
        for _ in 0..=domain::MAX_STALE_CLEANUP_ENTRIES {
            std::fs::write(
                exports.join(format!("{}.ticket.json", domain::new_opaque_id())),
                b"stale",
            )
            .unwrap();
        }
        cleanup_stale_exports_where(&root, |_| true);
        assert_eq!(std::fs::read_dir(&exports).unwrap().count(), 1);
        std::fs::remove_dir_all(root).unwrap();
    }

    fn minimal_package_bytes() -> Vec<u8> {
        let manifest = PortableManifest {
            format_version: 1,
            producer: PortableProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-04T00:00:00Z".into(),
            document: PortableDocumentMetadata {
                kind: PortableDocumentKind::BasicLeaf,
                schema_version: 1,
                title: "Minimal".into(),
                source_document_id: "00000000-0000-7000-8000-000000000131".into(),
                canonical_path: "content/document.json".into(),
                markdown_path: "content/document.md".into(),
                asset_policy: "privacy_sanitized_visual_v1".into(),
            },
            narrative: None,
            assets: vec![],
        };
        let canonical = r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Minimal"}]}]}"#;
        let markdown = document::markdown::export(canonical).unwrap();
        archive::build_package(&manifest, canonical, &markdown, vec![]).unwrap()
    }

    #[test]
    fn preview_publication_failures_leave_no_valid_ticket_or_owned_directory() {
        let root = root("preview-faults");
        for barrier in 0..=3 {
            crate::infrastructure::durability::fail_after(barrier);
            assert!(
                stage_preview(&root, minimal_package_bytes()).is_err(),
                "barrier {barrier}"
            );
            let directory = import_root(&root);
            if directory.exists() {
                assert_eq!(
                    std::fs::read_dir(&directory).unwrap().count(),
                    0,
                    "barrier {barrier}"
                );
            }
        }
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn export_durability_failures_publish_neither_package_nor_ticket() {
        let root = root("export-faults");
        let mut conn = db();
        let node = leaf(&mut conn, "Fault fixture");
        let document = document::repository::create(
            &mut conn,
            document::dto::CreateReaderDocumentInput {
                life_node_id: node,
                operation_id: "fault-create".into(),
            },
        )
        .unwrap();
        for barrier in 0..=3 {
            let source =
                repository::export_source(&conn, PortableDocumentKind::BasicLeaf, &document.id)
                    .unwrap();
            crate::infrastructure::durability::fail_after(barrier);
            assert!(assemble_export(&root, source).is_err(), "barrier {barrier}");
            let directory = export_root(&root);
            if directory.exists() {
                assert_eq!(
                    std::fs::read_dir(&directory).unwrap().count(),
                    0,
                    "barrier {barrier}"
                );
            }
        }
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn basic_leaf_package_round_trip_remaps_asset_and_is_idempotent() {
        let root = root("basic");
        let mut conn = db();
        let source_node = leaf(&mut conn, "Nguồn");
        let asset = document::assets::import(
            &mut conn,
            &root,
            document::dto::ImportDocumentAssetInput {
                original_name: "photo.png".into(),
                bytes: document::assets::tiny_png(),
            },
        )
        .unwrap();
        let doc = document::repository::create(
            &mut conn,
            document::dto::CreateReaderDocumentInput {
                life_node_id: source_node.clone(),
                operation_id: "create-source".into(),
            },
        )
        .unwrap();
        let canonical = serde_json::json!({"type":"doc","content":[
            {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Tiếng Việt","marks":[{"type":"bold"}]}]},
            {"type":"paragraph","content":[{"type":"text","text":"Portable paragraph","marks":[{"type":"italic"},{"type":"link","attrs":{"href":"https://example.com"}}]}]},
            {"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"Quote"}]}]},
            {"type":"callout","attrs":{"variant":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Callout"}]}]},
            {"type":"codeBlock","content":[{"type":"text","text":"let portable = true;"}]},
            {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Bullet"}]}]}]},
            {"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Ordered"}]}]}]},
            {"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Header"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell"}]}]}]}]},
            {"type":"image","attrs":{"assetId":asset.asset_id,"alt":"Portable image"}},
            {"type":"image","attrs":{"assetId":asset.asset_id,"alt":"Portable image repeated"}}
        ]}).to_string();
        document::repository::save(
            &mut conn,
            document::dto::SaveReaderDocumentInput {
                document_id: doc.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: canonical.clone(),
                operation_id: "save-source".into(),
            },
        )
        .unwrap();
        let source = repository::export_source(
            &conn,
            super::super::domain::PortableDocumentKind::BasicLeaf,
            &doc.id,
        )
        .unwrap();
        let ticket = assemble_export(&root, source).unwrap();
        let bytes = std::fs::read(package_path(&root, &ticket.export_id)).unwrap();
        let package = archive::validate_package_bytes(&bytes).unwrap();
        assert_eq!(package.manifest.assets[0].reference_count, 2);
        let target = leaf(&mut conn, "Target unchanged");
        let input = ConfirmPortablePackageImportInput {
            import_id: domain::new_opaque_id(),
            life_node_id: target.clone(),
            operation_id: "portable-basic".into(),
        };
        let result = repository::confirm_import(&mut conn, &root, input.clone(), package).unwrap();
        assert_ne!(result.document_id, doc.id);
        let imported: (i32, String) = conn
            .query_row(
                "SELECT revision,canonical_json FROM reader_documents WHERE id=?1",
                [&result.document_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(imported.0, 0);
        assert!(imported.1.contains("Tiếng Việt"));
        let imported_asset: (String, i32) = conn
            .query_row(
                "SELECT asset_id,reference_count FROM document_assets WHERE document_id=?1",
                [&result.document_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(imported_asset.1, 2);
        assert!(document::assets::get(&conn, &root, &imported_asset.0).is_ok());
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM reader_document_revisions WHERE document_id=?1",
                [&result.document_id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM reader_document_drafts WHERE document_id=?1",
                [&result.document_id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
        assert_eq!(
            conn.query_row(
                "SELECT canonical_json FROM reader_documents WHERE id=?1",
                [&doc.id],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
            canonical
        );
        assert_eq!(
            conn.query_row(
                "SELECT title FROM life_nodes WHERE id=?1",
                [&target],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
            "Target unchanged"
        );
        assert_eq!(
            repository::existing_operation(
                &conn,
                &input,
                super::super::domain::PortableDocumentKind::BasicLeaf
            )
            .unwrap()
            .unwrap()
            .document_id,
            result.document_id
        );
        let wrong_target = ConfirmPortablePackageImportInput {
            life_node_id: source_node,
            ..input.clone()
        };
        assert!(
            repository::existing_operation(&conn, &wrong_target, PortableDocumentKind::BasicLeaf)
                .is_err()
        );
        assert!(
            repository::existing_operation(&conn, &input, PortableDocumentKind::NarrativeCanvas)
                .is_err()
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn narrative_package_round_trip_preserves_template_world_and_scene_identity() {
        let root = root("narrative");
        let mut conn = db();
        let source_node = leaf(&mut conn, "Canvas source");
        let doc = narrative::repository::create(
            &mut conn,
            narrative::dto::CreateNarrativeDocumentInput {
                life_node_id: source_node,
                operation_id: "canvas-create".into(),
                template_id: "project_blueprint".into(),
            },
        )
        .unwrap();
        let mut value: serde_json::Value = serde_json::from_str(&doc.canonical_json).unwrap();
        value["visualWorldId"] = serde_json::json!("nocturne");
        value["scenes"].as_array_mut().unwrap().truncate(3);
        value["scenes"][0]["blocks"].as_array_mut().unwrap().push(
            serde_json::json!({"kind":"custom_widget","id":narrative::domain::new_id(),"data":{"vietnamese":"Giữ nguyên"}}),
        );
        let scene_id = value["scenes"][0]["id"].as_str().unwrap().to_owned();
        narrative::repository::save(
            &mut conn,
            narrative::dto::SaveNarrativeDocumentInput {
                document_id: doc.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: value.to_string(),
                operation_id: "canvas-save".into(),
            },
        )
        .unwrap();
        let source = repository::export_source(
            &conn,
            super::super::domain::PortableDocumentKind::NarrativeCanvas,
            &doc.id,
        )
        .unwrap();
        let ticket = assemble_export(&root, source).unwrap();
        let package = archive::validate_package_bytes(
            &std::fs::read(package_path(&root, &ticket.export_id)).unwrap(),
        )
        .unwrap();
        let target = leaf(&mut conn, "Canvas target");
        let result = repository::confirm_import(
            &mut conn,
            &root,
            ConfirmPortablePackageImportInput {
                import_id: domain::new_opaque_id(),
                life_node_id: target,
                operation_id: "portable-canvas".into(),
            },
            package,
        )
        .unwrap();
        let imported: (i32, String, String) = conn
            .query_row(
                "SELECT revision,canonical_json,template_id FROM narrative_documents WHERE id=?1",
                [&result.document_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        let json: serde_json::Value = serde_json::from_str(&imported.1).unwrap();
        assert_eq!(imported.0, 0);
        assert_eq!(imported.2, "project_blueprint");
        assert_eq!(json["visualWorldId"], "nocturne");
        assert_eq!(json["scenes"].as_array().unwrap().len(), 3);
        assert_eq!(json["scenes"][0]["id"], scene_id);
        assert_eq!(
            json["scenes"][0]["blocks"]
                .as_array()
                .unwrap()
                .last()
                .unwrap()["kind"],
            "custom_widget"
        );
        assert_eq!(
            json["scenes"][0]["blocks"]
                .as_array()
                .unwrap()
                .last()
                .unwrap()["data"]["vietnamese"],
            "Giữ nguyên"
        );
        assert_eq!(json["documentId"], result.document_id);
        assert_ne!(result.document_id, doc.id);
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM narrative_document_revisions WHERE document_id=?1",
                [&result.document_id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM narrative_document_drafts WHERE document_id=?1",
                [&result.document_id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn all_locked_templates_and_visual_worlds_round_trip() {
        let root = root("narrative-catalog");
        let mut conn = db();
        for (template_index, template) in
            ["knowledge_dossier", "project_blueprint", "learning_journey"]
                .into_iter()
                .enumerate()
        {
            for (world_index, world) in ["paper", "sakura", "aurora", "nocturne"]
                .into_iter()
                .enumerate()
            {
                let source_node = leaf(&mut conn, &format!("Source {template} {world}"));
                let doc = narrative::repository::create(
                    &mut conn,
                    narrative::dto::CreateNarrativeDocumentInput {
                        life_node_id: source_node,
                        operation_id: format!("catalog-create-{template_index}-{world_index}"),
                        template_id: template.into(),
                    },
                )
                .unwrap();
                let mut value: serde_json::Value =
                    serde_json::from_str(&doc.canonical_json).unwrap();
                value["visualWorldId"] = serde_json::json!(world);
                narrative::repository::save(
                    &mut conn,
                    narrative::dto::SaveNarrativeDocumentInput {
                        document_id: doc.id.clone(),
                        expected_revision: 0,
                        schema_version: 1,
                        canonical_json: value.to_string(),
                        operation_id: format!("catalog-save-{template_index}-{world_index}"),
                    },
                )
                .unwrap();
                let source = repository::export_source(
                    &conn,
                    PortableDocumentKind::NarrativeCanvas,
                    &doc.id,
                )
                .unwrap();
                let ticket = assemble_export(&root, source).unwrap();
                let package =
                    archive::validate_package_file(&package_path(&root, &ticket.export_id))
                        .unwrap();
                let target = leaf(&mut conn, &format!("Target {template} {world}"));
                let result = repository::confirm_import(
                    &mut conn,
                    &root,
                    ConfirmPortablePackageImportInput {
                        import_id: domain::new_opaque_id(),
                        life_node_id: target,
                        operation_id: format!("catalog-confirm-{template_index}-{world_index}"),
                    },
                    package,
                )
                .unwrap();
                let canonical: String = conn
                    .query_row(
                        "SELECT canonical_json FROM narrative_documents WHERE id=?1",
                        [&result.document_id],
                        |row| row.get(0),
                    )
                    .unwrap();
                let imported: serde_json::Value = serde_json::from_str(&canonical).unwrap();
                assert_eq!(imported["templateId"], template);
                assert_eq!(imported["templateVersion"], 1);
                assert_eq!(imported["visualWorldId"], world);
            }
        }
        std::fs::remove_dir_all(root).unwrap();
    }

    fn single_asset_package() -> archive::ValidatedPortablePackage {
        let source_asset_id = "00000000-0000-7000-8000-000000000121";
        let source_document_id = "00000000-0000-7000-8000-000000000122";
        let bytes = document::assets::tiny_png();
        let prepared =
            document::assets::prepare_imported_asset("pixel.png", bytes.clone()).unwrap();
        let manifest = PortableManifest {
            format_version: 1,
            producer: PortableProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-04T00:00:00Z".into(),
            document: PortableDocumentMetadata {
                kind: PortableDocumentKind::BasicLeaf,
                schema_version: 1,
                title: "Fault package".into(),
                source_document_id: source_document_id.into(),
                canonical_path: "content/document.json".into(),
                markdown_path: "content/document.md".into(),
                asset_policy: "privacy_sanitized_visual_v1".into(),
            },
            narrative: None,
            assets: vec![PortableManifestAsset {
                source_asset_id: source_asset_id.into(),
                path: format!("assets/{source_asset_id}.png"),
                original_name: "pixel.png".into(),
                mime: prepared.mime,
                byte_size: prepared.byte_size,
                width: prepared.width,
                height: prepared.height,
                reference_count: 1,
                sha256: prepared.checksum,
            }],
        };
        let canonical = serde_json::json!({"type":"doc","content":[{"type":"image","attrs":{"assetId":source_asset_id}}]}).to_string();
        let markdown = document::markdown::export(&canonical).unwrap();
        let package = archive::build_package(
            &manifest,
            &canonical,
            &markdown,
            vec![archive::PortableArchiveAsset {
                path: format!("assets/{source_asset_id}.png"),
                bytes,
            }],
        )
        .unwrap();
        archive::validate_package_bytes(&package).unwrap()
    }

    #[test]
    fn document_join_and_operation_failures_roll_back_database_and_new_asset_file() {
        for (index, trigger) in [
            "CREATE TEMP TRIGGER portable_fail BEFORE INSERT ON reader_documents BEGIN SELECT RAISE(FAIL, 'document'); END;",
            "CREATE TEMP TRIGGER portable_fail BEFORE INSERT ON document_assets BEGIN SELECT RAISE(FAIL, 'join'); END;",
            "CREATE TEMP TRIGGER portable_fail BEFORE INSERT ON reader_save_operations BEGIN SELECT RAISE(FAIL, 'operation'); END;",
        ].into_iter().enumerate() {
            let root = root(&format!("transaction-fault-{index}"));
            let mut conn = db();
            let target = leaf(&mut conn, "Fault target");
            conn.execute_batch(trigger).unwrap();
            let result = repository::confirm_import(
                &mut conn, &root,
                ConfirmPortablePackageImportInput {
                    import_id: domain::new_opaque_id(), life_node_id: target.clone(),
                    operation_id: format!("transaction-fault-{index}"),
                }, single_asset_package(),
            );
            assert!(result.is_err());
            for table in ["reader_documents", "document_assets", "reader_save_operations", "assets"] {
                let count: i64 = conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| row.get(0)).unwrap();
                assert_eq!(count, 0, "{table}");
            }
            let directory = root.join("assets/original");
            if directory.exists() { assert_eq!(std::fs::read_dir(directory).unwrap().count(), 0); }
            std::fs::remove_dir_all(root).unwrap();
        }
    }

    #[test]
    fn corrupt_checksum_match_blocks_portable_document_and_join_commit() {
        for defect in ["deleted", "modified"] {
            let root = root(&format!("dedup-authority-{defect}"));
            let mut conn = db();
            let existing = document::assets::import(
                &mut conn,
                &root,
                document::dto::ImportDocumentAssetInput {
                    original_name: "pixel.png".into(),
                    bytes: document::assets::tiny_png(),
                },
            )
            .unwrap();
            let relative: String = conn
                .query_row(
                    "SELECT relative_original_path FROM assets WHERE id=?1",
                    [&existing.asset_id],
                    |row| row.get(0),
                )
                .unwrap();
            let backing = root.join(relative);
            if defect == "deleted" {
                std::fs::remove_file(&backing).unwrap();
            } else {
                std::fs::write(&backing, b"corrupt").unwrap();
            }
            let target = leaf(&mut conn, "Dedup authority target");
            assert!(
                repository::confirm_import(
                    &mut conn,
                    &root,
                    ConfirmPortablePackageImportInput {
                        import_id: domain::new_opaque_id(),
                        life_node_id: target,
                        operation_id: format!("dedup-authority-{defect}"),
                    },
                    single_asset_package(),
                )
                .is_err()
            );
            for table in [
                "reader_documents",
                "document_assets",
                "reader_save_operations",
            ] {
                assert_eq!(
                    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                        row.get::<_, i64>(0)
                    })
                    .unwrap(),
                    0,
                    "{defect}: {table}"
                );
            }
            assert_eq!(
                conn.query_row("SELECT COUNT(*) FROM assets", [], |row| row
                    .get::<_, i64>(0))
                    .unwrap(),
                1
            );
            assert_eq!(
                std::fs::read_dir(root.join("assets/original"))
                    .unwrap()
                    .count(),
                if defect == "deleted" { 0 } else { 1 }
            );
            std::fs::remove_dir_all(root).unwrap();
        }
    }

    #[test]
    fn identical_package_payloads_deduplicate_and_sum_reference_counts() {
        let root = root("dedup");
        let mut conn = db();
        let first = "00000000-0000-7000-8000-000000000101";
        let second = "00000000-0000-7000-8000-000000000102";
        let source_document_id = "00000000-0000-7000-8000-000000000103";
        let bytes = document::assets::tiny_png();
        let prepared =
            document::assets::prepare_imported_asset("pixel.png", bytes.clone()).unwrap();
        let manifest_asset = |id: &str, count: u32| PortableManifestAsset {
            source_asset_id: id.into(),
            path: format!("assets/{id}.png"),
            original_name: "pixel.png".into(),
            mime: prepared.mime.clone(),
            byte_size: prepared.byte_size,
            width: prepared.width,
            height: prepared.height,
            reference_count: count,
            sha256: prepared.checksum.clone(),
        };
        let manifest = PortableManifest {
            format_version: 1,
            producer: PortableProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-04T00:00:00Z".into(),
            document: PortableDocumentMetadata {
                kind: PortableDocumentKind::BasicLeaf,
                schema_version: 1,
                title: "Deduplicated".into(),
                source_document_id: source_document_id.into(),
                canonical_path: "content/document.json".into(),
                markdown_path: "content/document.md".into(),
                asset_policy: "privacy_sanitized_visual_v1".into(),
            },
            narrative: None,
            assets: vec![manifest_asset(first, 2), manifest_asset(second, 1)],
        };
        let canonical = serde_json::json!({"type":"doc","content":[
            {"type":"image","attrs":{"assetId":first}}, {"type":"image","attrs":{"assetId":first}},
            {"type":"image","attrs":{"assetId":second}}
        ]})
        .to_string();
        let markdown = document::markdown::export(&canonical).unwrap();
        let package_bytes = archive::build_package(
            &manifest,
            &canonical,
            &markdown,
            vec![
                archive::PortableArchiveAsset {
                    path: format!("assets/{first}.png"),
                    bytes: bytes.clone(),
                },
                archive::PortableArchiveAsset {
                    path: format!("assets/{second}.png"),
                    bytes,
                },
            ],
        )
        .unwrap();
        let package = archive::validate_package_bytes(&package_bytes).unwrap();
        let target = leaf(&mut conn, "Dedup target");
        let result = repository::confirm_import(
            &mut conn,
            &root,
            ConfirmPortablePackageImportInput {
                import_id: domain::new_opaque_id(),
                life_node_id: target,
                operation_id: "dedup-confirm".into(),
            },
            package,
        )
        .unwrap();
        let (join_count, reference_count): (i64, i32) = conn
            .query_row(
                "SELECT COUNT(*),SUM(reference_count) FROM document_assets WHERE document_id=?1",
                [&result.document_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!((join_count, reference_count), (1, 3));
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM assets", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    #[ignore = "release-mode portable package performance evidence"]
    fn portable_release_performance_evidence() {
        use std::time::Instant;
        fn p95(mut values: Vec<f64>) -> f64 {
            values.sort_by(f64::total_cmp);
            values[((values.len() as f64 * 0.95).ceil() as usize).saturating_sub(1)]
        }
        let root = root("performance");
        let mut conn = db();
        let small_node = leaf(&mut conn, "Small portable fixture");
        let small_doc = document::repository::create(
            &mut conn,
            document::dto::CreateReaderDocumentInput {
                life_node_id: small_node,
                operation_id: "perf-small-create".into(),
            },
        )
        .unwrap();
        let text = "x".repeat(25 * 1024);
        let canonical = serde_json::json!({"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":text}]}]}).to_string();
        document::repository::save(
            &mut conn,
            document::dto::SaveReaderDocumentInput {
                document_id: small_doc.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: canonical,
                operation_id: "perf-small-save".into(),
            },
        )
        .unwrap();
        let mut small_export = Vec::new();
        let mut small_preview = Vec::new();
        for _ in 0..20 {
            let start = Instant::now();
            let source = repository::export_source(
                &conn,
                super::super::domain::PortableDocumentKind::BasicLeaf,
                &small_doc.id,
            )
            .unwrap();
            let ticket = assemble_export(&root, source).unwrap();
            small_export.push(start.elapsed().as_secs_f64() * 1000.0);
            let path = package_path(&root, &ticket.export_id);
            let start = Instant::now();
            archive::validate_package_file(&path).unwrap();
            small_preview.push(start.elapsed().as_secs_f64() * 1000.0);
        }

        let medium_node = leaf(&mut conn, "Medium portable fixture");
        let medium_doc = document::repository::create(
            &mut conn,
            document::dto::CreateReaderDocumentInput {
                life_node_id: medium_node,
                operation_id: "perf-medium-create".into(),
            },
        )
        .unwrap();
        let mut ids = Vec::new();
        for seed in 0..5u32 {
            let image = image::RgbaImage::from_fn(800, 600, |x, y| {
                image::Rgba([
                    ((x * 31 + y * 17 + seed * 13) % 251) as u8,
                    ((x * 7 + y * 29 + seed * 23) % 253) as u8,
                    ((x * 19 + y * 11 + seed * 41) % 255) as u8,
                    255,
                ])
            });
            let mut cursor = std::io::Cursor::new(Vec::new());
            image::DynamicImage::ImageRgba8(image)
                .write_to(&mut cursor, image::ImageFormat::Png)
                .unwrap();
            let asset = document::assets::import(
                &mut conn,
                &root,
                document::dto::ImportDocumentAssetInput {
                    original_name: format!("fixture-{seed}.png"),
                    bytes: cursor.into_inner(),
                },
            )
            .unwrap();
            ids.push(asset.asset_id);
        }
        let content: Vec<_> = ids
            .iter()
            .map(|id| serde_json::json!({"type":"image","attrs":{"assetId":id}}))
            .collect();
        let canonical = serde_json::json!({"type":"doc","content":content}).to_string();
        document::repository::save(
            &mut conn,
            document::dto::SaveReaderDocumentInput {
                document_id: medium_doc.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: canonical,
                operation_id: "perf-medium-save".into(),
            },
        )
        .unwrap();
        let mut medium_export = Vec::new();
        let mut medium_preview = Vec::new();
        let mut medium_confirm = Vec::new();
        let mut package_bytes = 0usize;
        for index in 0..5 {
            let start = Instant::now();
            let source = repository::export_source(
                &conn,
                super::super::domain::PortableDocumentKind::BasicLeaf,
                &medium_doc.id,
            )
            .unwrap();
            let ticket = assemble_export(&root, source).unwrap();
            medium_export.push(start.elapsed().as_secs_f64() * 1000.0);
            let path = package_path(&root, &ticket.export_id);
            package_bytes = std::fs::metadata(&path).unwrap().len() as usize;
            let start = Instant::now();
            let package = archive::validate_package_file(&path).unwrap();
            medium_preview.push(start.elapsed().as_secs_f64() * 1000.0);
            let target = leaf(&mut conn, &format!("Performance target {index}"));
            let start = Instant::now();
            repository::confirm_import(
                &mut conn,
                &root,
                ConfirmPortablePackageImportInput {
                    import_id: domain::new_opaque_id(),
                    life_node_id: target,
                    operation_id: format!("perf-confirm-{index}"),
                },
                package,
            )
            .unwrap();
            medium_confirm.push(start.elapsed().as_secs_f64() * 1000.0);
        }
        let values = (
            p95(small_export),
            p95(small_preview),
            p95(medium_export),
            p95(medium_preview),
            p95(medium_confirm),
        );
        println!(
            "portable performance: small export p95={:.2}ms preview p95={:.2}ms; medium export p95={:.2}ms preview p95={:.2}ms confirm p95={:.2}ms; medium package={} bytes",
            values.0, values.1, values.2, values.3, values.4, package_bytes
        );
        assert!(
            values.0 <= 250.0
                && values.1 <= 250.0
                && values.2 <= 3000.0
                && values.3 <= 2000.0
                && values.4 <= 3000.0
        );
        assert!(package_bytes <= domain::MAX_PACKAGE_BYTES);

        let maximum_node = leaf(&mut conn, "Maximum representative fixture");
        let maximum_doc = document::repository::create(
            &mut conn,
            document::dto::CreateReaderDocumentInput {
                life_node_id: maximum_node,
                operation_id: "perf-maximum-create".into(),
            },
        )
        .unwrap();
        let mut maximum_ids = Vec::new();
        for seed in 0..8u32 {
            let image = image::RgbaImage::from_fn(1600, 1200, |x, y| {
                image::Rgba([
                    ((x * 31 + y * 17 + seed * 13) % 251) as u8,
                    ((x * 7 + y * 29 + seed * 23) % 253) as u8,
                    ((x * 19 + y * 11 + seed * 41) % 255) as u8,
                    255,
                ])
            });
            let mut cursor = std::io::Cursor::new(Vec::new());
            image::DynamicImage::ImageRgba8(image)
                .write_to(&mut cursor, image::ImageFormat::Png)
                .unwrap();
            let asset = document::assets::import(
                &mut conn,
                &root,
                document::dto::ImportDocumentAssetInput {
                    original_name: format!("maximum-{seed}.png"),
                    bytes: cursor.into_inner(),
                },
            )
            .unwrap();
            maximum_ids.push(asset.asset_id);
        }
        let maximum_content: Vec<_> = maximum_ids
            .iter()
            .map(|id| serde_json::json!({"type":"image","attrs":{"assetId":id}}))
            .collect();
        document::repository::save(
            &mut conn,
            document::dto::SaveReaderDocumentInput {
                document_id: maximum_doc.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: serde_json::json!({"type":"doc","content":maximum_content})
                    .to_string(),
                operation_id: "perf-maximum-save".into(),
            },
        )
        .unwrap();
        let maximum_start = Instant::now();
        let maximum_source = repository::export_source(
            &conn,
            super::super::domain::PortableDocumentKind::BasicLeaf,
            &maximum_doc.id,
        )
        .unwrap();
        let maximum_ticket = assemble_export(&root, maximum_source).unwrap();
        let maximum_path = package_path(&root, &maximum_ticket.export_id);
        let maximum_bytes = std::fs::metadata(&maximum_path).unwrap().len() as usize;
        archive::validate_package_file(&maximum_path).unwrap();
        println!(
            "portable performance: maximum representative export+preview={:.2}ms package={} bytes (working-set observation unavailable inside the isolated Rust harness)",
            maximum_start.elapsed().as_secs_f64() * 1000.0,
            maximum_bytes
        );
        assert!((40 * 1024 * 1024..=domain::MAX_PACKAGE_BYTES).contains(&maximum_bytes));
        std::fs::remove_dir_all(root).unwrap();
    }
}
