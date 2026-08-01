pub mod error;

use serde::Serialize;

/// IPC connectivity probe. Returns `{ status: "ok" }` when the application
/// core is reachable. Contains no product state.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct HealthCheck {
    pub status: String,
}

#[tauri::command]
#[tracing::instrument(level = "info")]
pub fn health_check() -> HealthCheck {
    HealthCheck {
        status: "ok".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ts_rs::TS as _;

    #[test]
    fn health_check_does_not_claim_product_readiness() {
        let result = health_check();
        assert_eq!(result.status, "ok");
    }

    #[test]
    fn export_ipc_bindings() {
        let out = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("CARGO_MANIFEST_DIR has no parent")
            .join("frontend/src/ipc/generated/");
        HealthCheck::export_all_to(&out).expect("ts binding export failed for HealthCheck");
        error::IpcError::export_all_to(&out).expect("ts binding export failed for IpcError");
    }
}
