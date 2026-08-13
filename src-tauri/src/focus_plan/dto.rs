use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum FocusPlanLifecycle {
    Draft,
    Active,
    Paused,
    Completed,
}

impl FocusPlanLifecycle {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Completed => "completed",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum FocusPlanPortfolio {
    Draft,
    Active,
    Paused,
    Completed,
    Archived,
}

impl FocusPlanPortfolio {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Archived => "archived",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanListInput {
    pub portfolio: FocusPlanPortfolio,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateFocusPlanInput {
    pub title: String,
    pub life_node_id: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub outcome: String,
    pub success_criteria: Vec<String>,
    pub initial_variant_label: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveFocusPlanDraftInput {
    pub plan_id: String,
    pub base_revision: u32,
    pub draft_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanIdInput {
    pub plan_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "action", rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum FocusPlanMutationAction {
    UpdatePlan {
        title: String,
        lifecycle: FocusPlanLifecycle,
        life_node_id: Option<String>,
        start_date: Option<String>,
        target_date: Option<String>,
        outcome: String,
        success_criteria: Vec<String>,
        tag_ids: Vec<String>,
    },
    SetScore {
        score: Option<u32>,
    },
    AddVariant {
        label: String,
    },
    RenameVariant {
        variant_id: String,
        label: String,
    },
    SelectVariant {
        variant_id: String,
    },
    UpdateVariantBody {
        variant_id: String,
        canonical_json: String,
        plain_text: String,
    },
    ArchiveVariant {
        variant_id: String,
    },
    RestoreVariant {
        variant_id: String,
    },
    AddPhase {
        variant_id: String,
        title: String,
    },
    RenamePhase {
        variant_id: String,
        phase_id: String,
        title: String,
    },
    MovePhase {
        variant_id: String,
        phase_id: String,
        new_index: u32,
    },
    ArchivePhase {
        variant_id: String,
        phase_id: String,
    },
    RestorePhase {
        variant_id: String,
        phase_id: String,
    },
    ArchivePlan,
    RestorePlan,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MutateFocusPlanInput {
    pub plan_id: String,
    pub expected_revision: u32,
    pub operation_id: String,
    pub mutation: FocusPlanMutationAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanMutationResult {
    pub plan_id: String,
    pub revision: u32,
    pub created_id: Option<String>,
    pub replayed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanSummaryView {
    pub id: String,
    pub title: String,
    pub lifecycle: FocusPlanLifecycle,
    pub score: Option<u32>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub life_node_id: Option<String>,
    pub life_title: Option<String>,
    pub selected_variant_label: String,
    pub active_variant_count: u32,
    pub active_phase_count: u32,
    pub tag_names: Vec<String>,
    pub revision: u32,
    pub updated_at: String,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanPhaseView {
    pub id: String,
    pub title: String,
    pub sort_key: u32,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanVariantView {
    pub id: String,
    pub label: String,
    pub canonical_json: String,
    pub plain_text: String,
    pub sort_key: u32,
    pub archived: bool,
    pub phases: Vec<FocusPlanPhaseView>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanTagView {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanRevisionView {
    pub revision: u32,
    pub reason: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanRecoveryDraftView {
    pub base_revision: u32,
    pub draft_json: String,
    pub conflict: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanDetailView {
    pub id: String,
    pub title: String,
    pub lifecycle: FocusPlanLifecycle,
    pub score: Option<u32>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub life_node_id: Option<String>,
    pub life_title: Option<String>,
    pub outcome: String,
    pub success_criteria: Vec<String>,
    pub selected_variant_id: String,
    pub variants: Vec<FocusPlanVariantView>,
    pub tags: Vec<FocusPlanTagView>,
    pub revisions: Vec<FocusPlanRevisionView>,
    pub recovery_draft: Option<FocusPlanRecoveryDraftView>,
    pub revision: u32,
    pub created_at: String,
    pub updated_at: String,
    pub archived: bool,
}

/// A user-authored manual review. Task 37 authorises creation and reading only: reviews carry
/// no lifecycle, revision, or archive state and never mutate the Plan they belong to.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanReviewView {
    pub id: String,
    pub reviewed_local_date: String,
    pub reflection: String,
    pub next_focus: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateFocusPlanReviewInput {
    pub plan_id: String,
    pub operation_id: String,
    pub reviewed_local_date: String,
    pub reflection: String,
    pub next_focus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanReviewListInput {
    pub plan_id: String,
    pub limit: Option<u32>,
}

/// Newest-first history plus the factual metadata the detail region displays.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanReviewHistoryView {
    pub review_count: u32,
    pub latest_reviewed_local_date: Option<String>,
    pub reviews: Vec<FocusPlanReviewView>,
}

/// Linked work for one Focus Plan. `items` reuses the Related Tasks navigation projection so a
/// recurring series resolves to its appropriate occurrence date.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanLinkedWorkView {
    pub one_off_count: u32,
    pub series_count: u32,
    pub items: Vec<crate::task::dto::RelatedTaskView>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanLinkedWorkInput {
    pub plan_id: String,
    pub anchor_local_date: String,
}

/// Period selection for the Focus Plan activity projection. The four fields are exactly the
/// Objective Analytics period contract, so both projections answer for the same window.
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanAnalyticsInput {
    pub period_kind: crate::task::dto::AnalyticsPeriodKind,
    pub anchor_local_date: String,
    pub observed_local_date: String,
    pub observed_local_minute: i32,
}

/// Factual activity for one Focus Plan in the requested period.
///
/// Every field is retrospective evidence. There is deliberately no percentage, ratio, score,
/// health, or completion field: ADR 0043 reports what happened and never grades a Plan.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanAnalyticsPlanView {
    pub plan_id: String,
    pub title: String,
    pub lifecycle: FocusPlanLifecycle,
    pub archived: bool,
    pub scheduled_minutes: i64,
    pub work_item_count: u32,
    pub one_off_task_count: u32,
    pub recurring_occurrence_count: u32,
    pub evaluated_count: u32,
    pub missed_count: u32,
    pub review_count: u32,
    pub latest_reviewed_local_date: Option<String>,
    pub actual_time: crate::task::dto::AnalyticsActualTimeSummaryView,
}

/// The whole bounded projection. Overall fields are the exact sums of `plans`, and `plan_count`
/// is `plans.len()`.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanAnalyticsProjection {
    pub period_start: String,
    pub period_end: String,
    pub plan_count: u32,
    pub scheduled_minutes: i64,
    pub work_item_count: u32,
    pub evaluated_count: u32,
    pub missed_count: u32,
    pub review_count: u32,
    pub actual_time: crate::task::dto::AnalyticsActualTimeSummaryView,
    pub plans: Vec<FocusPlanAnalyticsPlanView>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_serializes_as_stable_snake_case() {
        assert_eq!(
            serde_json::to_string(&FocusPlanLifecycle::Active).unwrap(),
            "\"active\""
        );
    }

    #[test]
    fn mutation_is_externally_tagged_by_action() {
        let value = serde_json::to_value(FocusPlanMutationAction::AddVariant {
            label: "Course first".into(),
        })
        .unwrap();
        assert_eq!(value["action"], "add_variant");
        assert_eq!(value["label"], "Course first");
    }

    #[test]
    fn score_mutation_serializes_nullable_manual_authority() {
        let value =
            serde_json::to_value(FocusPlanMutationAction::SetScore { score: Some(88) }).unwrap();
        assert_eq!(value["action"], "set_score");
        assert_eq!(value["score"], 88);
    }
}
