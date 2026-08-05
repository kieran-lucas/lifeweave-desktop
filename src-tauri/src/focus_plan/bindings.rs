use super::dto::*;
use ts_rs::TS as _;

#[test]
fn export_focus_plan_bindings() {
    let out = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("CARGO_MANIFEST_DIR has no parent")
        .join("frontend/src/ipc/generated/");
    FocusPlanLifecycle::export_all_to(&out).unwrap();
    FocusPlanPortfolio::export_all_to(&out).unwrap();
    FocusPlanListInput::export_all_to(&out).unwrap();
    CreateFocusPlanInput::export_all_to(&out).unwrap();
    SaveFocusPlanDraftInput::export_all_to(&out).unwrap();
    FocusPlanIdInput::export_all_to(&out).unwrap();
    FocusPlanMutationAction::export_all_to(&out).unwrap();
    MutateFocusPlanInput::export_all_to(&out).unwrap();
    FocusPlanMutationResult::export_all_to(&out).unwrap();
    FocusPlanSummaryView::export_all_to(&out).unwrap();
    FocusPlanPhaseView::export_all_to(&out).unwrap();
    FocusPlanVariantView::export_all_to(&out).unwrap();
    FocusPlanTagView::export_all_to(&out).unwrap();
    FocusPlanRevisionView::export_all_to(&out).unwrap();
    FocusPlanRecoveryDraftView::export_all_to(&out).unwrap();
    FocusPlanDetailView::export_all_to(&out).unwrap();
}
