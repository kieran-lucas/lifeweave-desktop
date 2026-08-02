use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeNodeView {
    pub id: String,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub branch_theme_id: String,
    pub child_count: i32,
    pub is_leaf: bool,
    pub is_pinned: bool,
    pub revision: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeBrowseProjection {
    pub root_id: String,
    pub selected: LifeNodeView,
    pub parent: Option<LifeNodeView>,
    pub children: Vec<LifeNodeView>,
    pub breadcrumb: Vec<LifeNodeView>,
    pub selected_is_pinned: bool,
    pub child_page: i32,
    pub child_page_count: i32,
    pub tree_revision: i32,
    pub resolved_from_fallback: bool,
    pub preferred_mode: String,
    pub viewport_anchor: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct PinnedLifeNodeView {
    pub node_id: String,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub branch_theme_id: String,
    pub child_count: i32,
    pub is_leaf: bool,
    pub available: bool,
    pub revision: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GetLifeBrowseInput {
    pub node_id: Option<String>,
    pub child_page: i32,
}
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateLifeNodeInput {
    pub parent_id: String,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub branch_theme_id: String,
}
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct RenameLifeNodeInput {
    pub node_id: String,
    pub title: String,
    pub expected_revision: i32,
}
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UpdateLifeNodeSummaryInput {
    pub node_id: String,
    pub short_description: String,
    pub icon_key: String,
    pub branch_theme_id: String,
    pub expected_revision: i32,
}
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MutateLifeNodeInput {
    pub node_id: String,
    pub expected_revision: i32,
}
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeNodeIdInput {
    pub node_id: String,
}
#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveLifeNavigationPreferenceInput {
    pub node_id: String,
    pub mode: String,
    pub path_version: i32,
    pub viewport_anchor: Option<String>,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeMutationResult {
    pub node: LifeNodeView,
    pub tree_revision: i32,
    pub invalidation: Vec<String>,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeNavigationPreferenceView {
    pub node_id: String,
    pub mode: String,
    pub path_version: i32,
    pub viewport_anchor: Option<String>,
}
