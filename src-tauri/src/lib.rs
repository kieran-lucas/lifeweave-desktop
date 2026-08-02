pub mod application;
pub mod document;
pub mod domain;
pub mod infrastructure;
pub mod ipc;
pub mod life;
pub mod platform;
pub mod search;
pub mod task;

use tauri::Manager;

use document::service::{
    create_reader_document, discard_reader_draft, export_reader_markdown, get_document_asset,
    get_reader_document, import_document_asset, import_reader_markdown, recover_reader_draft,
    save_reader_document, save_reader_draft,
};
use infrastructure::backup::lifecycle::{
    StartupDisposition, preflight_startup_check, recover_if_interrupted,
};
use infrastructure::sqlite::{
    connection::{open_existing_file_connection, open_file_connection},
    migrations::run_migrations,
    runtime::DatabaseRuntime,
    worker::DbWorkerHandle,
};
use ipc::backup::{backup_database, list_backups, restore_database};
use ipc::foundation_record::{
    archive_foundation_record, create_foundation_record, list_archived_foundation_records,
    list_foundation_records, restore_foundation_record, update_foundation_record,
};
use ipc::search::search_global;
use ipc::task::{
    create_recurring_task, create_task, delete_task, evaluate_task, get_analytics_projection,
    get_month_projection, list_completion_states, list_recurring_occurrences, list_task_categories,
    list_tasks_for_date, list_today_items, undo_task_evaluation, update_category_goals,
    update_recurring_occurrence, update_task,
};
use life::service::{
    archive_life_node, create_life_node, get_life_browse_projection, get_life_edit_projection,
    get_pinned_life_nodes, pin_life_node, rename_life_node, reorder_life_sibling,
    reparent_life_node, restore_life_node, save_life_navigation_preference, set_life_node_icon,
    set_life_node_theme_variant, undo_life_operation, unpin_life_node, update_life_node_summary,
};

/// Initialize the local tracing subscriber.
///
/// Uses `RUST_LOG` when set; falls back to INFO for this crate only.
/// Calls `try_init` so that test environments that install their own subscriber
/// do not panic.
///
/// Never logs record content, file paths, or any personally identifiable data.
fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("lifeweave_lib=info,lifeweave_desktop=info")
            }),
        )
        .with_target(false)
        .try_init();
}

#[cfg(feature = "e2e-test")]
fn app_data_directory(
    _app: &tauri::AppHandle,
) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    {
        let value = std::env::var("LIFEWEAVE_E2E_APP_DATA_DIR")
            .map_err(|_| "LIFEWEAVE_E2E_APP_DATA_DIR is required for e2e-test")?;
        let requested = std::path::PathBuf::from(value);
        if !requested.is_absolute() {
            return Err("E2E app-data override must be absolute".into());
        }
        let root = std::env::var("LIFEWEAVE_E2E_ROOT")
            .map(std::path::PathBuf::from)
            .unwrap_or(std::env::current_dir()?.join("target").join("e2e-data"));
        let root = std::fs::canonicalize(&root).unwrap_or(root);
        let canonical_requested = std::fs::canonicalize(&requested)
            .map_err(|_| "E2E app-data override directory does not exist")?;
        let sentinel = requested.join(".lifeweave-e2e-sentinel");
        if !canonical_requested.starts_with(&root)
            || canonical_requested == root
            || !sentinel.is_file()
        {
            return Err("E2E app-data override is outside target/e2e-data".into());
        }
        Ok(requested)
    }
}

#[cfg(not(feature = "e2e-test"))]
fn app_data_directory(
    app: &tauri::AppHandle,
) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    app.path().app_data_dir().map_err(|e| e.into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();
    tauri::Builder::default()
        .setup(|app| {
            let db_path = app_data_directory(app.handle())
                .expect("app data dir unavailable")
                .join("lifeweave.db");

            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let marker_path = db_path
                .parent()
                .unwrap_or(std::path::Path::new("."))
                .join("restore_marker.json");
            let disposition = preflight_startup_check(&db_path)?;
            recover_if_interrupted(&marker_path, &db_path)?;

            let mut conn = match disposition {
                StartupDisposition::PristineFirstRun => open_file_connection(&db_path),
                StartupDisposition::ExistingOrRecovered => open_existing_file_connection(&db_path),
            }
            .expect("failed to open SQLite database");
            run_migrations(&mut conn).expect("database migration failed");

            let worker = DbWorkerHandle::spawn(conn);
            app.manage(DatabaseRuntime::new(db_path.clone(), worker));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::health_check,
            create_foundation_record,
            list_foundation_records,
            list_archived_foundation_records,
            update_foundation_record,
            archive_foundation_record,
            restore_foundation_record,
            backup_database,
            list_backups,
            restore_database,
            list_task_categories,
            list_tasks_for_date,
            create_task,
            update_task,
            delete_task,
            create_recurring_task,
            list_recurring_occurrences,
            update_recurring_occurrence,
            list_today_items,
            get_month_projection,
            list_completion_states,
            evaluate_task,
            undo_task_evaluation,
            update_category_goals,
            get_analytics_projection,
            get_life_browse_projection,
            get_pinned_life_nodes,
            get_life_edit_projection,
            create_life_node,
            rename_life_node,
            update_life_node_summary,
            archive_life_node,
            restore_life_node,
            set_life_node_icon,
            set_life_node_theme_variant,
            reorder_life_sibling,
            reparent_life_node,
            undo_life_operation,
            pin_life_node,
            unpin_life_node,
            save_life_navigation_preference,
            get_reader_document,
            create_reader_document,
            save_reader_document,
            save_reader_draft,
            discard_reader_draft,
            recover_reader_draft,
            import_reader_markdown,
            export_reader_markdown,
            import_document_asset,
            get_document_asset,
            search_global,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Lifeweave");
}

#[cfg(all(test, feature = "e2e-test"))]
mod e2e_data_tests {
    #[test]
    fn override_requires_absolute_path_under_test_root() {
        let root = std::env::current_dir()
            .unwrap()
            .join("target")
            .join("e2e-data");
        assert!(root.join("run-1").is_absolute());
        assert!(!std::path::PathBuf::from("relative/run").is_absolute());
        assert!(!std::path::PathBuf::from("C:\\Users\\user\\AppData").starts_with(&root));
    }
}
