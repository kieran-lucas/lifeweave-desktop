//! Tauri command surface and bounded opaque app-data staging.
//!
//! No command accepts or returns a filesystem path, and no log or warning carries document content
//! or a path. Binary bytes move only as raw IPC bodies keyed by opaque identifiers.

use super::{
    archive::{self, TreeArchiveAsset},
    domain::{self, LifeTreeError},
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

fn map(error: LifeTreeError) -> IpcError {
    match error {
        LifeTreeError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        LifeTreeError::NotFound => IpcError::NotFound,
        LifeTreeError::Conflict => IpcError::Validation {
            message: "Tree import operation authority conflicts.".into(),
        },
        LifeTreeError::Stale => IpcError::Validation {
            message: "The Life tree changed; refresh and try again.".into(),
        },
        LifeTreeError::Unsupported => IpcError::Unsupported,
        LifeTreeError::Json(_) | LifeTreeError::Zip(_) => IpcError::Validation {
            message: "Tree package structure is invalid.".into(),
        },
        LifeTreeError::Db(_) | LifeTreeError::Io(_) => IpcError::Storage,
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
    root.join("exports/life-tree")
}
fn import_root(root: &Path) -> PathBuf {
    root.join("imports/life-tree")
}
fn ticket_path(root: &Path, id: &str) -> PathBuf {
    export_root(root).join(format!("{id}.ticket.json"))
}
fn package_path(root: &Path, id: &str) -> PathBuf {
    export_root(root).join(format!("{id}.{}", domain::TREE_EXTENSION))
}

fn cleanup_stale_exports_where(root: &Path, stale: impl Fn(&std::fs::DirEntry) -> bool) {
    let Ok(entries) = std::fs::read_dir(export_root(root)) else {
        return;
    };
    let suffix = format!(".{}", domain::TREE_EXTENSION);
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
            .strip_suffix(&suffix)
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
    let Ok(entries) = std::fs::read_dir(import_root(root)) else {
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

pub(crate) fn cleanup_stale_life_tree_artifacts(root: &Path) {
    cleanup_stale_exports(root);
    cleanup_stale_imports(root);
}

fn counts_view(manifest: &TreeManifest) -> LifeTreeCountsView {
    LifeTreeCountsView {
        top_level_nodes: manifest.counts.top_level_nodes,
        nodes: manifest.counts.nodes,
        branches: manifest.counts.branches,
        basic_leaf_documents: manifest.counts.basic_leaf_documents,
        narrative_documents: manifest.counts.narrative_documents,
        empty_leaves: manifest.counts.empty_leaves,
        documents: manifest.counts.documents,
        assets: manifest.counts.assets,
        tags: manifest.counts.tags,
        internal_links: manifest.counts.internal_links,
        maximum_depth: manifest.maximum_depth,
    }
}

fn omission_warnings(omissions: &TreeOmissions) -> Vec<String> {
    let mut warnings = Vec::new();
    for (count, message) in [
        (
            omissions.archived_nodes,
            "archived Life node(s) and their descendants",
        ),
        (omissions.drafts, "unsaved draft(s)"),
        (omissions.pins, "pinned Life node(s)"),
        (omissions.task_references, "Task or series reference(s)"),
        (omissions.focus_plan_references, "Focus Plan reference(s)"),
        (
            omissions.outgoing_cross_boundary_links,
            "cross-boundary link(s) leaving the active forest",
        ),
        (
            omissions.incoming_cross_boundary_links,
            "cross-boundary link(s) entering the active forest",
        ),
        (
            omissions.archived_tag_assignments,
            "archived or superseded tag assignment(s)",
        ),
    ] {
        if count > 0 {
            warnings.push(format!("{count} {message} are not included."));
        }
    }
    warnings
}

fn assemble_export(
    root: &Path,
    source: repository::TreeExportSource,
) -> Result<LifeTreeExportTicket, LifeTreeError> {
    cleanup_stale_exports(root);

    let mut descriptors = Vec::new();
    let mut archive_assets = Vec::new();
    let mut total_asset_bytes = 0u64;
    for asset in &source.assets {
        let original = assets::read_verified_original(root, &asset.relative_path, &asset.checksum)
            .map_err(|_| LifeTreeError::Validation("Tree asset authority is invalid."))?;
        let sanitized = assets::sanitized_export(&original, &asset.mime)
            .map_err(|_| LifeTreeError::Validation("Asset privacy sanitization failed."))?;
        let prepared = assets::prepare_imported_asset(&asset.original_name, sanitized.clone())
            .map_err(|_| LifeTreeError::Validation("Sanitized asset validation failed."))?;
        let path = domain::asset_path(&asset.asset_key, &prepared.mime);
        total_asset_bytes = total_asset_bytes
            .checked_add(prepared.byte_size)
            .ok_or(LifeTreeError::Validation("Tree asset size overflowed."))?;
        let mut references: Vec<TreeAssetReference> = asset
            .references
            .iter()
            .map(|(document_key, count)| TreeAssetReference {
                document_key: document_key.clone(),
                reference_count: *count,
            })
            .collect();
        references.sort_by(|a, b| a.document_key.cmp(&b.document_key));
        descriptors.push(TreeAssetDescriptor {
            key: asset.asset_key.clone(),
            path: path.clone(),
            original_name: domain::safe_original_name(&asset.original_name),
            mime: prepared.mime,
            byte_size: prepared.byte_size,
            width: prepared.width,
            height: prepared.height,
            sha256: prepared.checksum,
            references,
        });
        archive_assets.push(TreeArchiveAsset {
            path,
            bytes: sanitized,
        });
    }
    descriptors.sort_by(|a, b| a.key.cmp(&b.key));

    let verified = &source.verified;
    let manifest = TreeManifest {
        format: domain::TREE_FORMAT.into(),
        format_version: domain::TREE_FORMAT_VERSION,
        producer: TreeProducer {
            application: "lifeweave-desktop".into(),
            app_version: env!("CARGO_PKG_VERSION").into(),
        },
        exported_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        source_schema_version: source.source_schema_version,
        tree_path: domain::TREE_PATH.into(),
        asset_policy: domain::ASSET_POLICY.into(),
        counts: TreeCounts {
            top_level_nodes: verified.top_level_count(),
            nodes: verified.node_count(),
            branches: verified.branch_count,
            basic_leaf_documents: verified.basic_leaf_count,
            narrative_documents: verified.narrative_count,
            empty_leaves: verified.empty_leaf_count,
            documents: verified.document_count(),
            assets: descriptors.len() as u32,
            tags: source.tree.tags.len() as u32,
            internal_links: source.tree.links.len() as u32,
        },
        maximum_depth: verified.maximum_depth,
        omissions: source.omissions,
        documents: source.document_descriptors.clone(),
        assets: descriptors,
    };

    let bytes = archive::build_package(&manifest, &source.tree, &source.documents, archive_assets)?;
    // The package we just wrote must satisfy the same validator an imported package faces.
    archive::validate_package_bytes(&bytes)?;

    let export_id = domain::new_opaque_id();
    let directory = export_root(root);
    std::fs::create_dir_all(&directory)?;
    let staging = directory.join(format!(".{export_id}.staging"));
    let final_path = package_path(root, &export_id);
    let publish = (|| -> Result<(), LifeTreeError> {
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
    if std::fs::read(&final_path)? != bytes {
        let _ = durability::durable_remove_file(&final_path);
        return Err(LifeTreeError::Validation(
            "Published tree package verification failed.",
        ));
    }

    let mut warnings = vec![
        "This package contains the complete active non-root Life forest. It is not a full application backup.".into(),
        "Asset metadata is removed from the exported visual payload.".into(),
    ];
    warnings.extend(omission_warnings(&source.omissions));

    let ticket = LifeTreeExportTicket {
        export_id: export_id.clone(),
        file_name: "Life.lifeweave-tree.zip".into(),
        byte_size: bytes.len() as u64,
        sha256: domain::sha256(&bytes),
        counts: counts_view(&manifest),
        total_asset_bytes,
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
pub async fn prepare_life_tree_export(
    state: State<'_, DatabaseRuntime>,
    input: PrepareLifeTreeExportInput,
) -> Result<LifeTreeExportTicket, IpcError> {
    let root = app_root(&state);
    let node_id = input.node_id;
    let source = state
        .execute(move |conn| Ok(repository::export_source(conn, &node_id)))
        .map_err(map_db)?
        .map_err(map)?;
    tauri::async_runtime::spawn_blocking(move || assemble_export(&root, source))
        .await
        .map_err(|_| IpcError::Storage)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, export_id))]
pub fn read_life_tree_export(
    state: State<'_, DatabaseRuntime>,
    export_id: String,
) -> Result<tauri::ipc::Response, IpcError> {
    if !domain::valid_opaque_id(&export_id) {
        return Err(IpcError::NotFound);
    }
    let root = app_root(&state);
    let ticket: LifeTreeExportTicket = serde_json::from_slice(
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

fn import_request_bytes(body: &tauri::ipc::InvokeBody) -> Result<Vec<u8>, IpcError> {
    match body {
        tauri::ipc::InvokeBody::Raw(value) if value.len() <= domain::MAX_PACKAGE_BYTES => {
            Ok(value.clone())
        }
        tauri::ipc::InvokeBody::Raw(_) => Err(IpcError::Validation {
            message: "Tree package must be 64 MiB or smaller.".into(),
        }),
        tauri::ipc::InvokeBody::Json(_) => Err(IpcError::Validation {
            message: "Tree import requires a raw binary request.".into(),
        }),
    }
}

fn stage_preview(root: &Path, bytes: Vec<u8>) -> Result<LifeTreeImportPreview, LifeTreeError> {
    cleanup_stale_imports(root);
    if bytes.is_empty() || bytes.len() > domain::MAX_PACKAGE_BYTES {
        return Err(LifeTreeError::Validation(
            "Tree package must be 64 MiB or smaller.",
        ));
    }
    let import_id = domain::new_opaque_id();
    let base = import_root(root);
    std::fs::create_dir_all(&base)?;
    let owned = base.join(&import_id);
    std::fs::create_dir(&owned)?;
    let result = (|| -> Result<LifeTreeImportPreview, LifeTreeError> {
        let staged = owned.join(format!("package.{}", domain::TREE_EXTENSION));
        durability::durable_write(&staged, &bytes)?;
        let package = archive::validate_package_file(&staged)?;
        let mut warnings = vec![
            "Imported nodes, documents, links, and assets will receive new local identities."
                .into(),
            "Nothing you already have is merged, renamed, or overwritten.".into(),
            "This import cannot be undone.".into(),
        ];
        warnings.extend(omission_warnings(&package.manifest.omissions));
        let preview = LifeTreeImportPreview {
            import_id: import_id.clone(),
            package_sha256: domain::sha256(&bytes),
            counts: counts_view(&package.manifest),
            total_asset_bytes: package.manifest.assets.iter().map(|a| a.byte_size).sum(),
            package_bytes: bytes.len() as u64,
            supported: true,
            warnings,
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
pub async fn preview_life_tree_import(
    state: State<'_, DatabaseRuntime>,
    request: tauri::ipc::Request<'_>,
) -> Result<LifeTreeImportPreview, IpcError> {
    let bytes = import_request_bytes(request.body())?;
    let root = app_root(&state);
    tauri::async_runtime::spawn_blocking(move || stage_preview(&root, bytes))
        .await
        .map_err(|_| IpcError::Storage)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub async fn confirm_life_tree_import(
    state: State<'_, DatabaseRuntime>,
    input: ConfirmLifeTreeImportInput,
) -> Result<LifeTreeImportResult, IpcError> {
    if !domain::valid_opaque_id(&input.import_id) || !domain::valid_sha256(&input.package_sha256) {
        return Err(IpcError::NotFound);
    }

    // An identical successful retry answers from the ledger, so it stays correct after the staged
    // package has been cleaned up.
    let replay = input.clone();
    if let Some(result) = state
        .execute(move |conn| Ok(repository::existing_operation(conn, &replay)))
        .map_err(map_db)?
        .map_err(map)?
    {
        return Ok(result);
    }

    let root = app_root(&state);
    let staged = import_root(&root).join(&input.import_id);
    let staged_package = staged.join(format!("package.{}", domain::TREE_EXTENSION));
    if !staged_package.is_file() {
        return Err(IpcError::NotFound);
    }

    // Re-authenticate the staged bytes against the digest the user actually confirmed.
    let digest = input.package_sha256.clone();
    let authenticate = staged_package.clone();
    let package = tauri::async_runtime::spawn_blocking(move || {
        let bytes = std::fs::read(&authenticate)?;
        if bytes.len() > domain::MAX_PACKAGE_BYTES || domain::sha256(&bytes) != digest {
            return Err(LifeTreeError::Validation(
                "The staged tree package no longer matches the reviewed package.",
            ));
        }
        archive::validate_package_file(&authenticate)
    })
    .await
    .map_err(|_| IpcError::Storage)?
    .map_err(map)?;

    let tx_root = root.clone();
    let result = state
        .execute(move |conn| Ok(repository::confirm_import(conn, &tx_root, input, package)))
        .map_err(map_db)?
        .map_err(map)?;
    let _ = durability::durable_remove_dir_all(&staged);
    Ok(result)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn discard_life_tree_import(
    state: State<'_, DatabaseRuntime>,
    input: DiscardLifeTreeImportInput,
) -> Result<(), IpcError> {
    if !domain::valid_opaque_id(&input.import_id) {
        return Err(IpcError::NotFound);
    }
    let owned = import_root(&app_root(&state)).join(input.import_id);
    if !owned.exists() {
        return Ok(());
    }
    let metadata = std::fs::symlink_metadata(&owned).map_err(|_| IpcError::Storage)?;
    if !metadata.file_type().is_dir() || metadata.file_type().is_symlink() {
        return Err(IpcError::Storage);
    }
    durability::durable_remove_dir_all(&owned).map_err(|_| IpcError::Storage)
}

/// Test-only seam around opaque staging and publication. Product commands still expose no paths.
#[cfg(test)]
pub(crate) mod testing {
    use super::*;

    pub fn stage(root: &Path, bytes: Vec<u8>) -> Result<LifeTreeImportPreview, LifeTreeError> {
        stage_preview(root, bytes)
    }
    pub fn export(
        root: &Path,
        source: repository::TreeExportSource,
    ) -> Result<LifeTreeExportTicket, LifeTreeError> {
        assemble_export(root, source)
    }
    pub fn staged_directory(root: &Path, import_id: &str) -> PathBuf {
        import_root(root).join(import_id)
    }
    pub fn exported_package(root: &Path, export_id: &str) -> PathBuf {
        package_path(root, export_id)
    }
    pub fn request_bytes(body: &tauri::ipc::InvokeBody) -> Result<Vec<u8>, IpcError> {
        import_request_bytes(body)
    }
    pub fn omissions(value: &TreeOmissions) -> Vec<String> {
        omission_warnings(value)
    }
}

#[cfg(test)]
mod tests {
    use super::testing::*;
    use super::*;
    use crate::{
        life_branch::repository::harness::{db, scenario, temp_root},
        life_tree::repository,
    };

    #[test]
    fn raw_binary_is_required_and_bounded_before_staging() {
        assert_eq!(
            request_bytes(&tauri::ipc::InvokeBody::Raw(vec![1, 2, 3])).unwrap(),
            vec![1, 2, 3]
        );
        assert!(
            request_bytes(&tauri::ipc::InvokeBody::Json(serde_json::json!([1, 2, 3]))).is_err()
        );
        assert!(
            request_bytes(&tauri::ipc::InvokeBody::Raw(vec![
                0;
                domain::MAX_PACKAGE_BYTES
                    + 1
            ]))
            .is_err()
        );
    }

    #[test]
    fn export_and_preview_publish_only_opaque_bounded_aggregate_authority() {
        let conn = db();
        scenario(&conn);
        let root = temp_root("tree-service");
        let ticket = export(
            &root,
            repository::export_source(&conn, crate::life::domain::ROOT_ID).unwrap(),
        )
        .unwrap();
        assert_eq!(ticket.file_name, "Life.lifeweave-tree.zip");
        assert_eq!(ticket.counts.top_level_nodes, 2);
        assert_eq!(ticket.counts.nodes, 6);
        assert!(
            ticket
                .warnings
                .iter()
                .any(|value| value.contains("complete active non-root Life forest"))
        );
        let bytes = std::fs::read(exported_package(&root, &ticket.export_id)).unwrap();
        assert_eq!(bytes.len() as u64, ticket.byte_size);
        let preview = stage(&root, bytes).unwrap();
        assert_eq!(preview.counts.top_level_nodes, 2);
        assert_eq!(preview.package_sha256, ticket.sha256);
        assert!(staged_directory(&root, &preview.import_id).is_dir());
        let json = serde_json::to_string(&preview).unwrap();
        assert!(!json.contains(root.to_string_lossy().as_ref()));
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejected_preview_leaves_no_attempt_directory_and_warnings_are_counts_only() {
        let root = temp_root("tree-rejected-preview");
        assert!(stage(&root, b"not a zip".to_vec()).is_err());
        let imports = root.join("imports/life-tree");
        assert!(
            std::fs::read_dir(&imports)
                .map(|mut entries| entries.next().is_none())
                .unwrap_or(true)
        );
        let warnings = omissions(&TreeOmissions {
            archived_nodes: 3,
            drafts: 2,
            ..TreeOmissions::default()
        });
        assert_eq!(warnings.len(), 2);
        assert!(
            warnings
                .iter()
                .all(|warning| warning.contains('3') || warning.contains('2'))
        );
        assert!(!warnings.join(" ").contains("life-root"));
        std::fs::remove_dir_all(root).unwrap();
    }
}
