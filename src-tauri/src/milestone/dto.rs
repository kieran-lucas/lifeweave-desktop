use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MilestoneView {
    pub id: String,
    pub title: String,
    pub date: String,
    pub description: String,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
    pub revision: u32,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SaveMilestoneInput {
    pub id: String,
    pub title: String,
    pub date: String,
    pub description: String,
    pub pinned: bool,
    pub expected_revision: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum MilestoneAction {
    Pin,
    Unpin,
    Delete,
    Restore,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MutateMilestoneInput {
    pub id: String,
    pub expected_revision: u32,
    pub action: MilestoneAction,
}
