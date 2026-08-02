pub mod backup;
pub mod error;
pub mod foundation_record;
pub mod task;

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
        use foundation_record::{
            CreateFoundationRecordInput, FoundationRecordView, MutateFoundationRecordInput,
            UpdateFoundationRecordInput,
        };

        let out = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("CARGO_MANIFEST_DIR has no parent")
            .join("frontend/src/ipc/generated/");
        HealthCheck::export_all_to(&out).expect("ts binding export failed for HealthCheck");
        error::IpcError::export_all_to(&out).expect("ts binding export failed for IpcError");
        FoundationRecordView::export_all_to(&out)
            .expect("ts binding export failed for FoundationRecordView");
        CreateFoundationRecordInput::export_all_to(&out)
            .expect("ts binding export failed for CreateFoundationRecordInput");
        UpdateFoundationRecordInput::export_all_to(&out)
            .expect("ts binding export failed for UpdateFoundationRecordInput");
        MutateFoundationRecordInput::export_all_to(&out)
            .expect("ts binding export failed for MutateFoundationRecordInput");
        use crate::task::dto::{CreateTaskInput, TaskCategoryView, TaskView, UpdateTaskInput};
        TaskCategoryView::export_all_to(&out).unwrap();
        TaskView::export_all_to(&out).unwrap();
        CreateTaskInput::export_all_to(&out).unwrap();
        UpdateTaskInput::export_all_to(&out).unwrap();
        use crate::task::dto::{CreateRecurringTaskInput, RecurringOccurrenceView};
        CreateRecurringTaskInput::export_all_to(&out).unwrap();
        RecurringOccurrenceView::export_all_to(&out).unwrap();
    }
}
