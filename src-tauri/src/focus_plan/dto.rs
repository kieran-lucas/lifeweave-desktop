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
    pub base_revision: u64,
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
    pub expected_revision: u64,
    pub operation_id: String,
    pub mutation: FocusPlanMutationAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanMutationResult {
    pub plan_id: String,
    pub revision: u64,
    pub created_id: Option<String>,
    pub replayed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanSummaryView {
    pub id: String,
    pub title: String,
    pub lifecycle: FocusPlanLifecycle,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub life_node_id: Option<String>,
    pub life_title: Option<String>,
    pub selected_variant_label: String,
    pub active_variant_count: u32,
    pub active_phase_count: u32,
    pub tag_names: Vec<String>,
    pub revision: u64,
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
    pub revision: u64,
    pub reason: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct FocusPlanRecoveryDraftView {
    pub base_revision: u64,
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
    pub revision: u64,
    pub created_at: String,
    pub updated_at: String,
    pub archived: bool,
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
}
