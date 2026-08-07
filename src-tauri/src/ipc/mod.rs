pub mod backup;
pub mod error;
pub mod foundation_record;
pub mod search;
pub mod tag;
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
            CreateTaskInput, RelatedTaskKind, RelatedTaskView, TaskCategoryView,
            TaskFocusPlanTargetView, TaskFocusPlanView, TaskLifeAreaView, TaskView,
            UpdateTaskInput,
        };
        TaskCategoryView::export_all_to(&out).unwrap();
        TaskView::export_all_to(&out).unwrap();
        TaskLifeAreaView::export_all_to(&out).unwrap();
        crate::task::dto::TaskDeadlineView::export_all_to(&out).unwrap();
        crate::task::domain::DeadlineState::export_all_to(&out).unwrap();
        crate::task::deadline::GetDeadlineQueueInput::export_all_to(&out).unwrap();
        crate::task::deadline::DeadlineQueueItemView::export_all_to(&out).unwrap();
        crate::task::deadline::DeadlineQueueGroup::export_all_to(&out).unwrap();
        crate::task::deadline::DeadlineQueueProjection::export_all_to(&out).unwrap();
        TaskFocusPlanView::export_all_to(&out).unwrap();
        TaskFocusPlanTargetView::export_all_to(&out).unwrap();
        RelatedTaskKind::export_all_to(&out).unwrap();
        RelatedTaskView::export_all_to(&out).unwrap();
        CreateTaskInput::export_all_to(&out).unwrap();
        UpdateTaskInput::export_all_to(&out).unwrap();
        use crate::task::dto::{CreateRecurringTaskInput, RecurringOccurrenceView};
        CreateRecurringTaskInput::export_all_to(&out).unwrap();
        RecurringOccurrenceView::export_all_to(&out).unwrap();
        crate::task::dto::UpdateRecurringOccurrenceInput::export_all_to(&out).unwrap();
        crate::task::dto::TodayItemView::export_all_to(&out).unwrap();
        crate::task::dto::TaskActualTimeView::export_all_to(&out).unwrap();
        crate::task::dto::ActiveTaskActualTimeView::export_all_to(&out).unwrap();
        crate::task::dto::StartTaskActualTimeInput::export_all_to(&out).unwrap();
        crate::task::dto::TaskActualTimeSessionInput::export_all_to(&out).unwrap();
        crate::task::dto::TodayItemKind::export_all_to(&out).unwrap();
        crate::task::dto::TaskPlanningMode::export_all_to(&out).unwrap();
        crate::task::dto::GetTaskPlanningProjectionInput::export_all_to(&out).unwrap();
        crate::task::dto::TaskPlanningItemView::export_all_to(&out).unwrap();
        crate::task::dto::TaskPlanningDayGroup::export_all_to(&out).unwrap();
        crate::task::dto::TaskPlanningProjection::export_all_to(&out).unwrap();
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
        use crate::task::saved_view::*;
        TaskSavedViewBaseScope::export_all_to(&out).unwrap();
        TaskSavedViewSortMode::export_all_to(&out).unwrap();
        TaskSavedViewGroupMode::export_all_to(&out).unwrap();
        TaskSavedViewTaskKind::export_all_to(&out).unwrap();
        TaskSavedViewPriority::export_all_to(&out).unwrap();
        TaskSavedViewClause::export_all_to(&out).unwrap();
        TaskSavedViewPredicate::export_all_to(&out).unwrap();
        CreateTaskSavedViewInput::export_all_to(&out).unwrap();
        UpdateTaskSavedViewInput::export_all_to(&out).unwrap();
        MutateTaskSavedViewInput::export_all_to(&out).unwrap();
        ReorderTaskSavedViewsInput::export_all_to(&out).unwrap();
        GetTaskSavedViewProjectionInput::export_all_to(&out).unwrap();
        GetTaskSavedViewEditorOptionsInput::export_all_to(&out).unwrap();
        TaskSavedViewSupportState::export_all_to(&out).unwrap();
        TaskSavedViewView::export_all_to(&out).unwrap();
        TaskSavedViewDetail::export_all_to(&out).unwrap();
        TaskSavedViewReferenceOption::export_all_to(&out).unwrap();
        TaskSavedViewEditorOptions::export_all_to(&out).unwrap();
        TaskSavedViewWarning::export_all_to(&out).unwrap();
        TaskSavedViewTagView::export_all_to(&out).unwrap();
        TaskSavedViewResultItem::export_all_to(&out).unwrap();
        TaskSavedViewResultGroup::export_all_to(&out).unwrap();
        TaskSavedViewProjection::export_all_to(&out).unwrap();
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
        use crate::portable::{domain::PortableDocumentKind, dto::*};
        PortableDocumentKind::export_all_to(&out).unwrap();
        PreparePortablePackageExportInput::export_all_to(&out).unwrap();
        PortablePackageExportTicket::export_all_to(&out).unwrap();
        PortablePackageImportPreview::export_all_to(&out).unwrap();
        ConfirmPortablePackageImportInput::export_all_to(&out).unwrap();
        PortablePackageImportResult::export_all_to(&out).unwrap();
        use crate::life_branch::dto::*;
        PrepareLifeBranchExportInput::export_all_to(&out).unwrap();
        LifeBranchCountsView::export_all_to(&out).unwrap();
        LifeBranchExportTicket::export_all_to(&out).unwrap();
        LifeBranchImportPreview::export_all_to(&out).unwrap();
        ConfirmLifeBranchImportInput::export_all_to(&out).unwrap();
        LifeBranchImportResult::export_all_to(&out).unwrap();
        DiscardLifeBranchImportInput::export_all_to(&out).unwrap();
        use crate::tag::dto::*;
        TagSummaryView::export_all_to(&out).unwrap();
        TagView::export_all_to(&out).unwrap();
        CreateTagInput::export_all_to(&out).unwrap();
        RenameTagInput::export_all_to(&out).unwrap();
        MutateTagInput::export_all_to(&out).unwrap();
        MergeTagsInput::export_all_to(&out).unwrap();
        MergeTagsResult::export_all_to(&out).unwrap();
        SetLifeNodeTagsInput::export_all_to(&out).unwrap();
        SetLifeNodeTagsResult::export_all_to(&out).unwrap();
        use crate::life_link::dto::*;
        LifeLinkDocumentKind::export_all_to(&out).unwrap();
        LifeLinkAvailability::export_all_to(&out).unwrap();
        LifeLinkSourceView::export_all_to(&out).unwrap();
        LifeLinkRowView::export_all_to(&out).unwrap();
        LifeLinkPanel::export_all_to(&out).unwrap();
        LifeLinkTargetView::export_all_to(&out).unwrap();
        GetLifeLinkPanelInput::export_all_to(&out).unwrap();
        SearchLifeLinkTargetsInput::export_all_to(&out).unwrap();
        CreateLifeLinkInput::export_all_to(&out).unwrap();
        RemoveLifeLinkInput::export_all_to(&out).unwrap();
        LifeLinkMutationResult::export_all_to(&out).unwrap();
    }
}
