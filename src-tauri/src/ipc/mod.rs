pub mod backup;
pub mod error;
pub mod foundation_record;
pub mod search;
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
        use crate::task::dto::{
            CreateTaskInput, RelatedTaskKind, RelatedTaskView, TaskCategoryView, TaskLifeAreaView,
            TaskView, UpdateTaskInput,
        };
        TaskCategoryView::export_all_to(&out).unwrap();
        TaskView::export_all_to(&out).unwrap();
        TaskLifeAreaView::export_all_to(&out).unwrap();
        RelatedTaskKind::export_all_to(&out).unwrap();
        RelatedTaskView::export_all_to(&out).unwrap();
        CreateTaskInput::export_all_to(&out).unwrap();
        UpdateTaskInput::export_all_to(&out).unwrap();
        use crate::task::dto::{CreateRecurringTaskInput, RecurringOccurrenceView};
        CreateRecurringTaskInput::export_all_to(&out).unwrap();
        RecurringOccurrenceView::export_all_to(&out).unwrap();
        crate::task::dto::UpdateRecurringOccurrenceInput::export_all_to(&out).unwrap();
        crate::task::dto::TodayItemView::export_all_to(&out).unwrap();
        crate::task::dto::TodayItemKind::export_all_to(&out).unwrap();
        crate::task::dto::CalendarDayProjection::export_all_to(&out).unwrap();
        crate::task::dto::MonthProjection::export_all_to(&out).unwrap();
        crate::task::dto::CompletionStateView::export_all_to(&out).unwrap();
        crate::task::dto::TaskEvaluationView::export_all_to(&out).unwrap();
        crate::task::dto::EvaluateTaskInput::export_all_to(&out).unwrap();
        crate::task::dto::UndoTaskEvaluationInput::export_all_to(&out).unwrap();
        crate::task::dto::UpdateCategoryGoalsInput::export_all_to(&out).unwrap();
        crate::task::dto::AnalyticsPeriodKind::export_all_to(&out).unwrap();
        crate::task::dto::AnalyticsProjectionInput::export_all_to(&out).unwrap();
        crate::task::dto::AnalyticsCategoryView::export_all_to(&out).unwrap();
        crate::task::dto::AnalyticsCompletionDistributionView::export_all_to(&out).unwrap();
        crate::task::dto::AnalyticsStreakView::export_all_to(&out).unwrap();
        crate::task::dto::AnalyticsProjection::export_all_to(&out).unwrap();
        use crate::life::dto::*;
        TaskLifeTargetView::export_all_to(&out).unwrap();
        LifeNodeView::export_all_to(&out).unwrap();
        LifeBrowseProjection::export_all_to(&out).unwrap();
        PinnedLifeNodeView::export_all_to(&out).unwrap();
        GetLifeBrowseInput::export_all_to(&out).unwrap();
        CreateLifeNodeInput::export_all_to(&out).unwrap();
        RenameLifeNodeInput::export_all_to(&out).unwrap();
        UpdateLifeNodeSummaryInput::export_all_to(&out).unwrap();
        MutateLifeNodeInput::export_all_to(&out).unwrap();
        LifeNodeIdInput::export_all_to(&out).unwrap();
        SaveLifeNavigationPreferenceInput::export_all_to(&out).unwrap();
        LifeMutationResult::export_all_to(&out).unwrap();
        LifeNavigationPreferenceView::export_all_to(&out).unwrap();
        LifeOperationContext::export_all_to(&out).unwrap();
        CreateLifeNodeOperationInput::export_all_to(&out).unwrap();
        EditLifeNodeTextInput::export_all_to(&out).unwrap();
        EditLifeNodeMetadataInput::export_all_to(&out).unwrap();
        EditLifeNodeAppearanceInput::export_all_to(&out).unwrap();
        EditLifeNodeStateInput::export_all_to(&out).unwrap();
        ReorderLifeSiblingInput::export_all_to(&out).unwrap();
        ReparentLifeNodeInput::export_all_to(&out).unwrap();
        UndoLifeOperationInput::export_all_to(&out).unwrap();
        LifeEditNodeView::export_all_to(&out).unwrap();
        LifeEditProjection::export_all_to(&out).unwrap();
        use crate::document::dto::*;
        ReaderDocumentView::export_all_to(&out).unwrap();
        ReaderDocumentProjection::export_all_to(&out).unwrap();
        ReaderNodeInput::export_all_to(&out).unwrap();
        CreateReaderDocumentInput::export_all_to(&out).unwrap();
        SaveReaderDocumentInput::export_all_to(&out).unwrap();
        SaveReaderDraftInput::export_all_to(&out).unwrap();
        ReaderDocumentIdInput::export_all_to(&out).unwrap();
        ImportReaderMarkdownInput::export_all_to(&out).unwrap();
        MarkdownExportView::export_all_to(&out).unwrap();
        ImportDocumentAssetInput::export_all_to(&out).unwrap();
        DocumentAssetView::export_all_to(&out).unwrap();
        DocumentAssetIdInput::export_all_to(&out).unwrap();
        DocumentAssetBytes::export_all_to(&out).unwrap();
        use crate::search::dto::*;
        SearchGlobalInput::export_all_to(&out).unwrap();
        SearchEntityKind::export_all_to(&out).unwrap();
        SearchNavigationTarget::export_all_to(&out).unwrap();
        SearchTextFragment::export_all_to(&out).unwrap();
        SearchResultView::export_all_to(&out).unwrap();
        SearchResultGroupKind::export_all_to(&out).unwrap();
        SearchResultGroup::export_all_to(&out).unwrap();
        GlobalSearchProjection::export_all_to(&out).unwrap();
        use crate::narrative::dto::*;
        NarrativeDocumentView::export_all_to(&out).unwrap();
        NarrativeDocumentProjection::export_all_to(&out).unwrap();
        NarrativeNodeInput::export_all_to(&out).unwrap();
        CreateNarrativeDocumentInput::export_all_to(&out).unwrap();
        SaveNarrativeDocumentInput::export_all_to(&out).unwrap();
        SaveNarrativeDraftInput::export_all_to(&out).unwrap();
        NarrativeDocumentIdInput::export_all_to(&out).unwrap();
        PreviewNarrativeMarkdownInput::export_all_to(&out).unwrap();
        NarrativeMarkdownPreview::export_all_to(&out).unwrap();
        ImportNarrativeMarkdownInput::export_all_to(&out).unwrap();
        NarrativeMarkdownExport::export_all_to(&out).unwrap();
    }
}
