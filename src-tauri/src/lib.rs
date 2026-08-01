pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ipc;
pub mod platform;

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
        .invoke_handler(tauri::generate_handler![ipc::health_check])
        .run(tauri::generate_context!())
        .expect("failed to run Lifeweave");
}
