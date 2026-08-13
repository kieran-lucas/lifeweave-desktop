pub mod application;
pub mod document;
pub mod domain;
pub mod focus_plan;
pub mod infrastructure;
pub mod ipc;
pub mod life;
pub mod life_branch;
pub mod life_link;
pub mod life_tree;
pub mod narrative;
pub mod platform;
pub mod portable;
pub mod search;
pub mod tag;
pub mod task;

use tauri::Manager;

use document::service::{
    create_reader_document, discard_reader_draft, export_reader_markdown, get_document_asset,
    get_reader_document, import_document_asset, import_reader_markdown, recover_reader_draft,
    save_reader_document, save_reader_draft,
};
use focus_plan::service::{
    create_focus_plan, create_focus_plan_review, discard_focus_plan_draft, get_focus_plan,
    get_focus_plan_analytics_projection, get_focus_plan_linked_work, list_focus_plan_reviews,
    list_focus_plans, mutate_focus_plan, save_focus_plan_draft,
};
use infrastructure::backup::lifecycle::{
    StartupDisposition, preflight_startup_check, recover_if_interrupted,
};
use infrastructure::sqlite::{
    connection::{open_existing_file_connection, open_file_connection},
    runtime::DatabaseRuntime,
    task52_migration::run_all_migrations,
    worker::DbWorkerHandle,
};
use ipc::backup::{backup_database, list_backups, restore_database};
use ipc::foundation_record::{
    archive_foundation_record, create_foundation_record, list_archived_foundation_records,
    list_foundation_records, restore_foundation_record, update_foundation_record,
};
use ipc::search::search_global;
use ipc::tag::{
    archive_tag, create_tag, list_tags, merge_tags, rename_tag, restore_tag, set_life_node_tags,
};
use ipc::task::{
    archive_task_saved_view, create_recurring_task, create_task, create_task_saved_view,
    delete_task, discard_task_actual_time, evaluate_task, get_active_task_actual_time,
    get_analytics_projection, get_deadline_queue, get_month_projection,
    get_related_tasks_for_life_node, get_task_planning_projection, get_task_saved_view,
    get_task_saved_view_editor_options, get_task_saved_view_projection,
    list_archived_task_saved_views, list_completion_states, list_focus_plan_targets,
    list_recurring_occurrences, list_task_categories, list_task_saved_views, list_tasks_for_date,
    list_today_items, reorder_task_saved_views, restore_task_saved_view, start_task_actual_time,
    stop_task_actual_time, undo_task_evaluation, update_category_goals,
    update_recurring_occurrence, update_task, update_task_saved_view,
};
use life::service::{
    archive_life_node, create_life_node, get_life_browse_projection, get_life_edit_projection,
    get_life_graph_projection, get_pinned_life_nodes, list_task_life_targets, pin_life_node,
    rename_life_node, reorder_life_sibling, reparent_life_node, restore_life_node,
    save_life_navigation_preference, set_life_node_icon, set_life_node_theme_variant,
    undo_life_operation, unpin_life_node, update_life_node_summary,
};
use life_branch::{
    confirm_life_branch_import, discard_life_branch_import, prepare_life_branch_export,
    preview_life_branch_import, read_life_branch_export,
};
use life_link::service::{
    create_life_link, get_life_link_panel, remove_life_link, search_life_link_targets,
};
use life_tree::{
    confirm_life_tree_import, discard_life_tree_import, prepare_life_tree_export,
    preview_life_tree_import, read_life_tree_export,
};
use narrative::service::{
    create_narrative_document, discard_narrative_draft, export_narrative_markdown,
    get_narrative_document, import_narrative_markdown, preview_narrative_markdown,
    recover_narrative_draft, save_narrative_document, save_narrative_draft,
};
use portable::{
    confirm_portable_package_import, discard_portable_package_import,
    prepare_portable_package_export, preview_portable_package_import, read_portable_package_export,
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
            let app_data_root = app_data_directory(app.handle()).expect("app data dir unavailable");
            std::fs::create_dir_all(&app_data_root)?;
            portable::cleanup_stale_portable_artifacts(&app_data_root);
            life_branch::cleanup_stale_life_branch_artifacts(&app_data_root);
            life_tree::cleanup_stale_life_tree_artifacts(&app_data_root);
            let db_path = app_data_root.join("lifeweave.db");

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
            run_all_migrations(&mut conn).expect("database migration failed");

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
            list_focus_plan_targets,
            get_related_tasks_for_life_node,
            list_tasks_for_date,
            create_task,
            update_task,
            delete_task,
            create_recurring_task,
            list_recurring_occurrences,
            update_recurring_occurrence,
            list_today_items,
            get_task_planning_projection,
            get_deadline_queue,
            list_task_saved_views,
            list_archived_task_saved_views,
            get_task_saved_view,
            create_task_saved_view,
            update_task_saved_view,
            archive_task_saved_view,
            restore_task_saved_view,
            reorder_task_saved_views,
            get_task_saved_view_editor_options,
            get_task_saved_view_projection,
            get_month_projection,
            list_completion_states,
            get_active_task_actual_time,
            start_task_actual_time,
            stop_task_actual_time,
            discard_task_actual_time,
            evaluate_task,
            undo_task_evaluation,
            update_category_goals,
            get_analytics_projection,
            get_life_browse_projection,
            get_pinned_life_nodes,
            list_task_life_targets,
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
            get_life_link_panel,
            search_life_link_targets,
            create_life_link,
            remove_life_link,
            get_life_graph_projection,
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
            get_narrative_document,
            create_narrative_document,
            save_narrative_document,
            save_narrative_draft,
            discard_narrative_draft,
            recover_narrative_draft,
            export_narrative_markdown,
            import_narrative_markdown,
            preview_narrative_markdown,
            prepare_portable_package_export,
            read_portable_package_export,
            preview_portable_package_import,
            confirm_portable_package_import,
            discard_portable_package_import,
            prepare_life_branch_export,
            read_life_branch_export,
            preview_life_branch_import,
            confirm_life_branch_import,
            discard_life_branch_import,
            prepare_life_tree_export,
            read_life_tree_export,
            preview_life_tree_import,
            confirm_life_tree_import,
            discard_life_tree_import,
            search_global,
            list_tags,
            create_tag,
            rename_tag,
            archive_tag,
            restore_tag,
            merge_tags,
            set_life_node_tags,
            list_focus_plans,
            get_focus_plan,
            create_focus_plan,
            mutate_focus_plan,
            save_focus_plan_draft,
            discard_focus_plan_draft,
            get_focus_plan_linked_work,
            list_focus_plan_reviews,
            create_focus_plan_review,
            get_focus_plan_analytics_projection,
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
