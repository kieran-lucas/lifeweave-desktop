use crate::tag::dto::TagSummaryView;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskLifeTargetView {
    pub id: String,
    pub title: String,
    pub breadcrumb: String,
}

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
    pub tags: Vec<TagSummaryView>,
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
    pub tags: Vec<TagSummaryView>,
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
    pub undo_token: Option<String>,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeNavigationPreferenceView {
    pub node_id: String,
    pub mode: String,
    pub path_version: i32,
    pub viewport_anchor: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeOperationContext {
    pub operation_id: String,
    pub expected_tree_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateLifeNodeOperationInput {
    pub context: LifeOperationContext,
    pub parent_id: String,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub theme_variant: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct EditLifeNodeTextInput {
    pub context: LifeOperationContext,
    pub node_id: String,
    pub value: String,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct EditLifeNodeMetadataInput {
    pub context: LifeOperationContext,
    pub node_id: String,
    pub short_description: String,
    pub icon_key: String,
    pub theme_variant: String,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct EditLifeNodeAppearanceInput {
    pub context: LifeOperationContext,
    pub node_id: String,
    pub value: String,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct EditLifeNodeStateInput {
    pub context: LifeOperationContext,
    pub node_id: String,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReorderLifeSiblingInput {
    pub context: LifeOperationContext,
    pub node_id: String,
    pub new_index: i32,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReparentLifeNodeInput {
    pub context: LifeOperationContext,
    pub node_id: String,
    pub new_parent_id: String,
    pub new_index: i32,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UndoLifeOperationInput {
    pub undo_token: String,
    pub expected_tree_revision: i32,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeEditNodeView {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub theme_variant: String,
    pub sort_key: i32,
    pub depth: i32,
    pub child_count: i32,
    pub is_leaf: bool,
    pub is_pinned: bool,
    pub revision: i32,
    pub tags: Vec<TagSummaryView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeEditProjection {
    pub root_id: String,
    pub tree_revision: i32,
    pub nodes: Vec<LifeEditNodeView>,
    pub archived_nodes: Vec<LifeEditNodeView>,
    pub latest_undo: Option<String>,
}

/// `document_kind` is `Some` only for a leaf carrying exactly one committed supported document. A
/// branch, an empty leaf, and a leaf whose document is unavailable are all `None`, matching the
/// Task 41 endpoint rule.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeGraphNodeView {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon_key: String,
    pub sort_key: i32,
    pub depth: i32,
    pub is_leaf: bool,
    pub document_kind: Option<crate::life_link::dto::LifeLinkDocumentKind>,
    pub outgoing_link_count: i32,
    pub incoming_link_count: i32,
}

/// `availability` is `Active` when both endpoints are documented leaves, otherwise `Unavailable`.
/// The edge stays visible either way; `Archived` cannot occur because archived endpoints lie
/// outside the active tree and their edges are absent from the projection entirely.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeGraphLinkView {
    pub link_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub availability: crate::life_link::dto::LifeLinkAvailability,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct LifeGraphProjection {
    pub root_id: String,
    pub tree_revision: i32,
    pub nodes: Vec<LifeGraphNodeView>,
    pub links: Vec<LifeGraphLinkView>,
}
