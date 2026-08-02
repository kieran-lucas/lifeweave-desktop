fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "health_check",
            "create_foundation_record",
            "list_foundation_records",
            "list_archived_foundation_records",
            "update_foundation_record",
            "archive_foundation_record",
            "restore_foundation_record",
            "backup_database",
            "list_backups",
            "restore_database",
        ]),
    ))
    .expect("failed to generate Tauri ACL manifest");
}
