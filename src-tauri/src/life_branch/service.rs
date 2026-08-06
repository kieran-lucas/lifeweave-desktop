//! Tauri command surface and bounded opaque app-data staging.
//!
//! No command accepts or returns a filesystem path, and no log or warning carries document content
//! or a path. Binary bytes move only as raw IPC bodies keyed by opaque identifiers.

use super::{
    archive::{self, BranchArchiveAsset},
    domain::{self, LifeBranchError},
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

fn map(error: LifeBranchError) -> IpcError {
    match error {
        LifeBranchError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        LifeBranchError::NotFound => IpcError::NotFound,
        LifeBranchError::Conflict => IpcError::Validation {
            message: "Branch import operation authority conflicts.".into(),
        },
        LifeBranchError::Stale => IpcError::Validation {
            message: "The Life tree changed; refresh and try again.".into(),
        },
        LifeBranchError::Unsupported => IpcError::Unsupported,
        LifeBranchError::Json(_) | LifeBranchError::Zip(_) => IpcError::Validation {
            message: "Branch package structure is invalid.".into(),
        },
        LifeBranchError::Db(_) | LifeBranchError::Io(_) => IpcError::Storage,
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
    root.join("exports/life-branch")
}
fn import_root(root: &Path) -> PathBuf {
    root.join("imports/life-branch")
}
fn ticket_path(root: &Path, id: &str) -> PathBuf {
    export_root(root).join(format!("{id}.ticket.json"))
}
fn package_path(root: &Path, id: &str) -> PathBuf {
    export_root(root).join(format!("{id}.{}", domain::BRANCH_EXTENSION))
}

fn cleanup_stale_exports_where(root: &Path, stale: impl Fn(&std::fs::DirEntry) -> bool) {
    let Ok(entries) = std::fs::read_dir(export_root(root)) else {
        return;
    };
    let suffix = format!(".{}", domain::BRANCH_EXTENSION);
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

pub(crate) fn cleanup_stale_life_branch_artifacts(root: &Path) {
    cleanup_stale_exports(root);
    cleanup_stale_imports(root);
}

fn counts_view(manifest: &BranchManifest) -> LifeBranchCountsView {
    LifeBranchCountsView {
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

fn omission_warnings(omissions: &BranchOmissions) -> Vec<String> {
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
            "link(s) leaving this branch",
        ),
        (
            omissions.incoming_cross_boundary_links,
            "link(s) entering this branch",
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
    source: repository::BranchExportSource,
) -> Result<LifeBranchExportTicket, LifeBranchError> {
    cleanup_stale_exports(root);

    let mut descriptors = Vec::new();
    let mut archive_assets = Vec::new();
    let mut total_asset_bytes = 0u64;
    for asset in &source.assets {
        let original = assets::read_verified_original(root, &asset.relative_path, &asset.checksum)
            .map_err(|_| LifeBranchError::Validation("Branch asset authority is invalid."))?;
        let sanitized = assets::sanitized_export(&original, &asset.mime)
            .map_err(|_| LifeBranchError::Validation("Asset privacy sanitization failed."))?;
        let prepared = assets::prepare_imported_asset(&asset.original_name, sanitized.clone())
            .map_err(|_| LifeBranchError::Validation("Sanitized asset validation failed."))?;
        let path = domain::asset_path(&asset.asset_key, &prepared.mime);
        total_asset_bytes = total_asset_bytes
            .checked_add(prepared.byte_size)
            .ok_or(LifeBranchError::Validation("Branch asset size overflowed."))?;
        let mut references: Vec<BranchAssetReference> = asset
            .references
            .iter()
            .map(|(document_key, count)| BranchAssetReference {
                document_key: document_key.clone(),
                reference_count: *count,
            })
            .collect();
        references.sort_by(|a, b| a.document_key.cmp(&b.document_key));
        descriptors.push(BranchAssetDescriptor {
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
        archive_assets.push(BranchArchiveAsset {
            path,
            bytes: sanitized,
        });
    }
    descriptors.sort_by(|a, b| a.key.cmp(&b.key));

    let verified = &source.verified;
    let manifest = BranchManifest {
        format: domain::BRANCH_FORMAT.into(),
        format_version: domain::BRANCH_FORMAT_VERSION,
        producer: BranchProducer {
            application: "lifeweave-desktop".into(),
            app_version: env!("CARGO_PKG_VERSION").into(),
        },
        exported_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        source_schema_version: source.source_schema_version,
        source_root_key: source.tree.root_key.clone(),
        source_root_title: verified
            .node(&source.tree.root_key)
            .map(|node| node.title.clone())
            .ok_or(LifeBranchError::Validation("Branch root is missing."))?,
        tree_path: domain::TREE_PATH.into(),
        asset_policy: domain::ASSET_POLICY.into(),
        counts: BranchCounts {
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
    let publish = (|| -> Result<(), LifeBranchError> {
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
        return Err(LifeBranchError::Validation(
            "Published branch package verification failed.",
        ));
    }

    let mut warnings = vec![
        "This package contains one Life branch. It is not a full application backup.".into(),
        "Asset metadata is removed from the exported visual payload.".into(),
    ];
    warnings.extend(omission_warnings(&source.omissions));

    let ticket = LifeBranchExportTicket {
        export_id: export_id.clone(),
        file_name: format!(
            "{}.{}",
            domain::safe_file_stem(&manifest.source_root_title),
            domain::BRANCH_EXTENSION
        ),
        byte_size: bytes.len() as u64,
        sha256: domain::sha256(&bytes),
        root_title: manifest.source_root_title.clone(),
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
pub async fn prepare_life_branch_export(
    state: State<'_, DatabaseRuntime>,
    input: PrepareLifeBranchExportInput,
) -> Result<LifeBranchExportTicket, IpcError> {
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
pub fn read_life_branch_export(
    state: State<'_, DatabaseRuntime>,
    export_id: String,
) -> Result<tauri::ipc::Response, IpcError> {
    if !domain::valid_opaque_id(&export_id) {
        return Err(IpcError::NotFound);
    }
    let root = app_root(&state);
    let ticket: LifeBranchExportTicket = serde_json::from_slice(
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
            message: "Branch package must be 64 MiB or smaller.".into(),
        }),
        tauri::ipc::InvokeBody::Json(_) => Err(IpcError::Validation {
            message: "Branch import requires a raw binary request.".into(),
        }),
    }
}

fn stage_preview(root: &Path, bytes: Vec<u8>) -> Result<LifeBranchImportPreview, LifeBranchError> {
    cleanup_stale_imports(root);
    if bytes.is_empty() || bytes.len() > domain::MAX_PACKAGE_BYTES {
        return Err(LifeBranchError::Validation(
            "Branch package must be 64 MiB or smaller.",
        ));
    }
    let import_id = domain::new_opaque_id();
    let base = import_root(root);
    std::fs::create_dir_all(&base)?;
    let owned = base.join(&import_id);
    std::fs::create_dir(&owned)?;
    let result = (|| -> Result<LifeBranchImportPreview, LifeBranchError> {
        let staged = owned.join(format!("package.{}", domain::BRANCH_EXTENSION));
        durability::durable_write(&staged, &bytes)?;
        let package = archive::validate_package_file(&staged)?;
        let mut warnings = vec![
            "Imported nodes, documents, links, and assets will receive new local identities."
                .into(),
            "Nothing you already have is merged, renamed, or overwritten.".into(),
            "This import cannot be undone.".into(),
        ];
        warnings.extend(omission_warnings(&package.manifest.omissions));
        let preview = LifeBranchImportPreview {
            import_id: import_id.clone(),
            package_sha256: domain::sha256(&bytes),
            root_title: package.manifest.source_root_title.clone(),
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
pub async fn preview_life_branch_import(
    state: State<'_, DatabaseRuntime>,
    request: tauri::ipc::Request<'_>,
) -> Result<LifeBranchImportPreview, IpcError> {
    let bytes = import_request_bytes(request.body())?;
    let root = app_root(&state);
    tauri::async_runtime::spawn_blocking(move || stage_preview(&root, bytes))
        .await
        .map_err(|_| IpcError::Storage)?
        .map_err(map)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub async fn confirm_life_branch_import(
    state: State<'_, DatabaseRuntime>,
    input: ConfirmLifeBranchImportInput,
) -> Result<LifeBranchImportResult, IpcError> {
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
    let staged_package = staged.join(format!("package.{}", domain::BRANCH_EXTENSION));
    if !staged_package.is_file() {
        return Err(IpcError::NotFound);
    }

    // Re-authenticate the staged bytes against the digest the user actually confirmed.
    let digest = input.package_sha256.clone();
    let authenticate = staged_package.clone();
    let package = tauri::async_runtime::spawn_blocking(move || {
        let bytes = std::fs::read(&authenticate)?;
        if bytes.len() > domain::MAX_PACKAGE_BYTES || domain::sha256(&bytes) != digest {
            return Err(LifeBranchError::Validation(
                "The staged branch package no longer matches the reviewed package.",
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
pub fn discard_life_branch_import(
    state: State<'_, DatabaseRuntime>,
    input: DiscardLifeBranchImportInput,
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

/// Test-only seam: the command layer needs a Tauri `State`, but the staging, digest, and
/// transaction behaviour underneath it is pure and must be provable without a running app.
#[cfg(test)]
pub(crate) mod testing {
    use super::*;

    pub fn stage(root: &Path, bytes: Vec<u8>) -> Result<LifeBranchImportPreview, LifeBranchError> {
        stage_preview(root, bytes)
    }
    pub fn export(
        root: &Path,
        source: repository::BranchExportSource,
    ) -> Result<LifeBranchExportTicket, LifeBranchError> {
        assemble_export(root, source)
    }
    pub fn staged_package(root: &Path, import_id: &str) -> PathBuf {
        import_root(root)
            .join(import_id)
            .join(format!("package.{}", domain::BRANCH_EXTENSION))
    }
    pub fn staged_directory(root: &Path, import_id: &str) -> PathBuf {
        import_root(root).join(import_id)
    }
    pub fn exported_package(root: &Path, export_id: &str) -> PathBuf {
        package_path(root, export_id)
    }
    pub fn exported_ticket(root: &Path, export_id: &str) -> PathBuf {
        ticket_path(root, export_id)
    }
    pub fn export_directory(root: &Path) -> PathBuf {
        export_root(root)
    }
    pub fn import_directory(root: &Path) -> PathBuf {
        import_root(root)
    }
    pub fn request_bytes(body: &tauri::ipc::InvokeBody) -> Result<Vec<u8>, IpcError> {
        import_request_bytes(body)
    }
    pub fn stale_exports(root: &Path, stale: impl Fn(&std::fs::DirEntry) -> bool) {
        cleanup_stale_exports_where(root, stale);
    }
    pub fn stale_imports(root: &Path, stale: impl Fn(&std::fs::DirEntry) -> bool) {
        cleanup_stale_imports_where(root, stale);
    }
    pub fn omissions(value: &BranchOmissions) -> Vec<String> {
        omission_warnings(value)
    }
}

#[cfg(test)]
mod tests {
    use super::testing::*;
    use super::*;
    use crate::life_branch::repository::{self, harness::*};

    fn package(conn: &rusqlite::Connection, root: &Path, node_id: &str) -> Vec<u8> {
        let source = repository::export_source(conn, node_id).unwrap();
        let ticket = export(root, source).unwrap();
        std::fs::read(exported_package(root, &ticket.export_id)).unwrap()
    }

    #[test]
    fn raw_binary_is_required_and_bounded_before_anything_touches_disk() {
        assert_eq!(
            request_bytes(&tauri::ipc::InvokeBody::Raw(vec![1, 2, 3])).unwrap(),
            vec![1, 2, 3]
        );
        assert!(
            request_bytes(&tauri::ipc::InvokeBody::Json(serde_json::json!([1, 2, 3]))).is_err(),
            "a JSON body must be refused"
        );
        assert!(
            request_bytes(&tauri::ipc::InvokeBody::Raw(vec![
                0;
                domain::MAX_PACKAGE_BYTES
                    + 1
            ]))
            .is_err(),
            "64 MiB is enforced before staging"
        );
    }

    #[test]
    fn opaque_identifiers_never_accept_a_path_fragment() {
        for bad in ["../escape", "..", "a/b", "", "life-root", "package"] {
            assert!(!domain::valid_opaque_id(bad), "{bad:?}");
        }
        assert!(domain::valid_opaque_id(&domain::new_opaque_id()));
    }

    #[test]
    fn export_publishes_a_verifiable_ticket_and_reads_back_exactly_once() {
        let conn = db();
        let root = temp_root("service-export");
        let source = scenario(&conn);

        let exported = repository::export_source(&conn, &source.root).unwrap();
        let ticket = export(&root, exported).unwrap();

        assert_eq!(ticket.file_name, "Research.lifeweave-branch.zip");
        assert_eq!(ticket.counts.nodes, 5);
        assert_eq!(ticket.counts.branches, 2);
        assert_eq!(ticket.counts.basic_leaf_documents, 1);
        assert_eq!(ticket.counts.narrative_documents, 1);
        assert_eq!(ticket.counts.empty_leaves, 1);
        assert_eq!(ticket.counts.internal_links, 1);
        assert_eq!(ticket.counts.maximum_depth, 2);
        assert!(
            ticket
                .warnings
                .iter()
                .any(|warning| warning.contains("not a full application backup")),
            "{:?}",
            ticket.warnings
        );
        assert!(
            ticket
                .warnings
                .iter()
                .any(|warning| warning.contains("link(s) leaving this branch")),
            "cross-boundary omissions must be surfaced: {:?}",
            ticket.warnings
        );

        let path = exported_package(&root, &ticket.export_id);
        let bytes = std::fs::read(&path).unwrap();
        assert_eq!(bytes.len() as u64, ticket.byte_size);
        assert_eq!(domain::sha256(&bytes), ticket.sha256);
        assert!(exported_ticket(&root, &ticket.export_id).is_file());

        // The published bytes satisfy the importer.
        archive::validate_package_bytes(&bytes).unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_safe_file_name_is_derived_from_the_branch_title() {
        let conn = db();
        let root = temp_root("service-filename");
        let branch = add_node(&conn, crate::life::domain::ROOT_ID, "CON", 0);
        add_node(&conn, &branch, "Child", 0);
        let ticket = export(&root, repository::export_source(&conn, &branch).unwrap()).unwrap();
        assert_eq!(
            ticket.file_name, "lifeweave-document.lifeweave-branch.zip",
            "a reserved Windows device name must never become a file name"
        );

        let awkward = add_node(&conn, crate::life::domain::ROOT_ID, "a/b:c*?", 1);
        add_node(&conn, &awkward, "Child", 0);
        let ticket = export(&root, repository::export_source(&conn, &awkward).unwrap()).unwrap();
        assert!(!ticket.file_name.contains('/') && !ticket.file_name.contains(':'));
        assert!(ticket.file_name.ends_with(".lifeweave-branch.zip"));
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn preview_stages_opaquely_reports_counts_and_exposes_no_path() {
        let conn = db();
        let root = temp_root("service-preview");
        let source = scenario(&conn);
        let bytes = package(&conn, &root, &source.root);

        let preview = stage(&root, bytes.clone()).unwrap();
        assert_eq!(preview.package_sha256, domain::sha256(&bytes));
        assert_eq!(preview.root_title, "Research");
        assert_eq!(preview.counts.nodes, 5);
        assert_eq!(preview.package_bytes, bytes.len() as u64);
        assert!(preview.supported);
        assert!(staged_package(&root, &preview.import_id).is_file());

        let rendered = serde_json::to_string(&preview).unwrap();
        for leak in [
            root.to_string_lossy().as_ref(),
            "assets/original",
            "imports/life-branch",
            "Xin ch\u{e0}o",
        ] {
            assert!(!rendered.contains(leak), "the preview leaked {leak:?}");
        }
        assert!(
            preview
                .warnings
                .iter()
                .any(|warning| warning.contains("cannot be undone")),
            "{:?}",
            preview.warnings
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_rejected_package_leaves_no_staging_directory_behind() {
        let root = temp_root("service-reject");
        for bad in [
            Vec::new(),
            b"not a zip".to_vec(),
            vec![0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0],
        ] {
            assert!(stage(&root, bad).is_err());
        }
        let staged = import_directory(&root);
        assert!(
            !staged.exists() || staged.read_dir().unwrap().count() == 0,
            "a rejected package must not leave staging behind"
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn discarding_removes_only_the_named_staging_directory() {
        let conn = db();
        let root = temp_root("service-discard");
        let source = scenario(&conn);
        let bytes = package(&conn, &root, &source.root);

        let first = stage(&root, bytes.clone()).unwrap();
        let second = stage(&root, bytes).unwrap();
        assert_ne!(first.import_id, second.import_id);

        crate::infrastructure::durability::durable_remove_dir_all(&staged_directory(
            &root,
            &first.import_id,
        ))
        .unwrap();
        assert!(!staged_directory(&root, &first.import_id).exists());
        assert!(
            staged_package(&root, &second.import_id).is_file(),
            "an unrelated staged package must be untouched"
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn stale_cleanup_is_owned_bounded_idempotent_and_missing_safe() {
        let root = temp_root("service-stale");
        cleanup_stale_life_branch_artifacts(&root);

        let exports = export_directory(&root);
        let imports = import_directory(&root);
        std::fs::create_dir_all(&exports).unwrap();
        std::fs::create_dir_all(&imports).unwrap();

        let stale_export = domain::new_opaque_id();
        let fresh_export = domain::new_opaque_id();
        for suffix in [".lifeweave-branch.zip", ".ticket.json"] {
            std::fs::write(exports.join(format!("{stale_export}{suffix}")), b"stale").unwrap();
            std::fs::write(exports.join(format!("{fresh_export}{suffix}")), b"fresh").unwrap();
        }
        std::fs::write(exports.join(format!(".{stale_export}.staging")), b"stale").unwrap();
        std::fs::write(exports.join("unrelated.txt"), b"keep").unwrap();
        std::fs::write(
            exports.join("not-an-owned-id.lifeweave-branch.zip"),
            b"keep",
        )
        .unwrap();

        let stale_import = domain::new_opaque_id();
        let fresh_import = domain::new_opaque_id();
        std::fs::create_dir(imports.join(&stale_import)).unwrap();
        std::fs::write(imports.join(&stale_import).join("package.zip"), b"x").unwrap();
        std::fs::create_dir(imports.join(&fresh_import)).unwrap();
        std::fs::create_dir(imports.join("not-an-owned-id")).unwrap();

        // Treat exactly the "stale" artifacts as stale, twice, to prove idempotence.
        for _ in 0..2 {
            stale_exports(&root, |entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .contains(stale_export.as_str())
            });
            stale_imports(&root, |entry| {
                entry.file_name().to_string_lossy() == stale_import.as_str()
            });
        }

        assert!(
            !exports
                .join(format!("{stale_export}.lifeweave-branch.zip"))
                .exists()
        );
        assert!(!exports.join(format!("{stale_export}.ticket.json")).exists());
        assert!(!exports.join(format!(".{stale_export}.staging")).exists());
        assert!(
            exports
                .join(format!("{fresh_export}.lifeweave-branch.zip"))
                .exists()
        );
        assert!(
            exports.join("unrelated.txt").exists(),
            "unowned files are never touched"
        );
        assert!(
            exports
                .join("not-an-owned-id.lifeweave-branch.zip")
                .exists()
        );
        assert!(!imports.join(&stale_import).exists());
        assert!(imports.join(&fresh_import).exists());
        assert!(imports.join("not-an-owned-id").exists());

        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn startup_cleanup_never_touches_committed_data_and_tolerates_a_missing_root() {
        let root = temp_root("service-startup");
        cleanup_stale_life_branch_artifacts(&root.join("does-not-exist"));

        let mut conn = db();
        let source = scenario(&conn);
        let asset = install_asset(&mut conn, &root);
        let relative: String = conn
            .query_row(
                "SELECT relative_original_path FROM assets WHERE id=?1",
                [&asset],
                |row| row.get(0),
            )
            .unwrap();
        let bytes = package(&conn, &root, &source.root);
        let preview = stage(&root, bytes).unwrap();

        cleanup_stale_life_branch_artifacts(&root);

        assert!(
            root.join(&relative).is_file(),
            "committed asset payloads are never cleanup candidates"
        );
        assert!(
            staged_package(&root, &preview.import_id).is_file(),
            "fresh staging survives a startup sweep"
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn omission_warnings_are_counts_only_and_omit_empty_categories() {
        assert!(omissions(&BranchOmissions::default()).is_empty());
        let value = BranchOmissions {
            archived_nodes: 2,
            drafts: 0,
            pins: 1,
            task_references: 0,
            focus_plan_references: 3,
            outgoing_cross_boundary_links: 4,
            incoming_cross_boundary_links: 0,
            archived_tag_assignments: 5,
        };
        let rendered = omissions(&value);
        assert_eq!(rendered.len(), 5, "only non-zero categories are reported");
        let joined = rendered.join(" ");
        assert!(joined.contains("2 archived Life node(s)"));
        assert!(joined.contains("3 Focus Plan reference(s)"));
        assert!(joined.contains("4 link(s) leaving this branch"));
        assert!(joined.contains("5 archived or superseded tag assignment(s)"));
        assert!(!joined.contains("draft"));
    }

    #[test]
    fn the_two_package_formats_use_separate_staging_directories() {
        let root = temp_root("service-separate");
        assert_ne!(export_directory(&root), root.join("exports/portable"));
        assert_ne!(import_directory(&root), root.join("imports/portable"));
        assert!(export_directory(&root).ends_with("life-branch"));
        assert!(import_directory(&root).ends_with("life-branch"));
        std::fs::remove_dir_all(root).unwrap();
    }
}
