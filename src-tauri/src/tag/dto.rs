use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TagSummaryView {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TagView {
    pub id: String,
    pub name: String,
    pub revision: i32,
    pub archived: bool,
    pub merged_into: Option<TagSummaryView>,
    pub task_count: u32,
    pub series_count: u32,
    pub life_node_count: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateTagInput {
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct RenameTagInput {
    pub tag_id: String,
    pub name: String,
    pub expected_revision: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MutateTagInput {
    pub tag_id: String,
    pub expected_revision: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MergeTagsInput {
    pub source_tag_id: String,
    pub target_tag_id: String,
    pub source_expected_revision: i32,
    pub target_expected_revision: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MergeTagsResult {
    pub source: TagView,
    pub target: TagView,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SetLifeNodeTagsInput {
    pub node_id: String,
    pub tag_ids: Vec<String>,
    pub expected_node_revision: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SetLifeNodeTagsResult {
    pub tags: Vec<TagSummaryView>,
    pub node_revision: i32,
}
