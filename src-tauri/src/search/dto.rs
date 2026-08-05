use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SearchGlobalInput {
    pub query: String,
    pub observed_local_date: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum SearchEntityKind {
    TaskOneOff,
    TaskSeries,
    TaskOverride,
    LifeNode,
    ReaderDocument,
    FocusPlan,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SearchNavigationTarget {
    Today {
        local_date: String,
        task_id: Option<String>,
        series_id: Option<String>,
        original_local_date: Option<String>,
    },
    LifeBrowse {
        node_id: String,
    },
    LifeReader {
        node_id: String,
    },
    FocusPlan {
        plan_id: String,
    },
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SearchTextFragment {
    pub text: String,
    pub emphasized: bool,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SearchResultView {
    pub entity_id: String,
    pub entity_kind: SearchEntityKind,
    pub title: String,
    pub title_fragments: Vec<SearchTextFragment>,
    pub context_text: String,
    pub snippet_fragments: Vec<SearchTextFragment>,
    pub navigation_target: SearchNavigationTarget,
    pub rank: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum SearchResultGroupKind {
    Tasks,
    Life,
    Documents,
    Plans,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct SearchResultGroup {
    pub kind: SearchResultGroupKind,
    pub results: Vec<SearchResultView>,
    pub total_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GlobalSearchProjection {
    pub groups: Vec<SearchResultGroup>,
    pub total_visible_results: usize,
}
