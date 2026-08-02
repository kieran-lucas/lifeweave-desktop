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
            "list_task_categories",
            "list_tasks_for_date",
            "create_task",
            "update_task",
            "delete_task",
            "create_recurring_task",
            "list_recurring_occurrences",
            "update_recurring_occurrence",
        ]),
    ))
    .expect("failed to generate Tauri ACL manifest");
}
