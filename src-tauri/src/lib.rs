pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ipc;
pub mod platform;

use tauri::Manager;

use infrastructure::sqlite::{
    connection::open_file_connection, migrations::run_migrations, worker::DbWorkerHandle,
};
use ipc::foundation_record::{
    archive_foundation_record, create_foundation_record, list_archived_foundation_records,
    list_foundation_records, restore_foundation_record, update_foundation_record,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();
    tauri::Builder::default()
        .setup(|app| {
            let db_path = app
                .path()
                .app_data_dir()
                .expect("app data dir unavailable")
                .join("lifeweave.db");

            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let mut conn = open_file_connection(&db_path).expect("failed to open SQLite database");
            run_migrations(&mut conn).expect("database migration failed");

            let worker = DbWorkerHandle::spawn(conn);
            app.manage(worker);
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
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Lifeweave");
}
