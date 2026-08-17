//! Task 39 Saved Views.
//!
//! A Saved View never compiles its predicate to SQL. The canonical Today/planning/deadline
//! source runs first with its existing bounds and semantics; this module then normalizes the
//! bounded rows and evaluates a typed v1 predicate in Rust.

use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap, HashSet};

use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;
use uuid::{NoContext, Timestamp, Uuid};

use super::deadline::{self, GetDeadlineQueueInput};
use super::domain::{DeadlineState, validate_date};
use super::dto::{
    GetTaskPlanningProjectionInput, TaskDeadlineView, TaskEvaluationView, TaskFocusPlanView,
    TaskLifeAreaView, TaskPlanningMode, TodayItemKind,
};
use super::{planning, repository};

pub const PREDICATE_VERSION: i32 = 1;
pub const MAX_ACTIVE_VIEWS: i64 = 50;
pub const MAX_CLAUSES: usize = 9;
pub const MAX_IDS_PER_CLAUSE: usize = 12;
pub const MAX_REFERENCED_IDS: usize = 48;

const INVALID_NAME: &str = "View name is required and must be 80 characters or fewer.";
const INVALID_PREDICATE: &str = "The Saved View filter is invalid.";
const INVALID_REFERENCE: &str = "Choose active filter references.";
const IDENTICAL_TO_SOURCE: &str =
    "Choose at least one filter, a non-default sort, or a non-default group.";
const STALE_WRITE: &str = "This Saved View changed elsewhere. Reload it and try again.";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TaskSavedViewBaseScope {
    Today,
    Upcoming,
    Overdue,
    Deadlines,
}

impl TaskSavedViewBaseScope {
    fn as_str(self) -> &'static str {
        match self {
            Self::Today => "today",
            Self::Upcoming => "upcoming",
            Self::Overdue => "overdue",
            Self::Deadlines => "deadlines",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "today" => Some(Self::Today),
            "upcoming" => Some(Self::Upcoming),
            "overdue" => Some(Self::Overdue),
            "deadlines" => Some(Self::Deadlines),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TaskSavedViewSortMode {
    BaseDefault,
    ScheduledAscending,
    PriorityThenScheduled,
    TitleAscending,
}

impl TaskSavedViewSortMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::BaseDefault => "base_default",
            Self::ScheduledAscending => "scheduled_ascending",
            Self::PriorityThenScheduled => "priority_then_scheduled",
            Self::TitleAscending => "title_ascending",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "base_default" => Some(Self::BaseDefault),
            "scheduled_ascending" => Some(Self::ScheduledAscending),
            "priority_then_scheduled" => Some(Self::PriorityThenScheduled),
            "title_ascending" => Some(Self::TitleAscending),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TaskSavedViewGroupMode {
    BaseDefault,
    None,
    Category,
    LifeArea,
    FocusPlan,
}

impl TaskSavedViewGroupMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::BaseDefault => "base_default",
            Self::None => "none",
            Self::Category => "category",
            Self::LifeArea => "life_area",
            Self::FocusPlan => "focus_plan",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "base_default" => Some(Self::BaseDefault),
            "none" => Some(Self::None),
            "category" => Some(Self::Category),
            "life_area" => Some(Self::LifeArea),
            "focus_plan" => Some(Self::FocusPlan),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TaskSavedViewTaskKind {
    OneOff,
    Recurring,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TaskSavedViewPriority {
    Low,
    Medium,
    High,
}

impl TaskSavedViewPriority {
    fn as_str(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum TaskSavedViewClause {
    TaskKindIn { values: Vec<TaskSavedViewTaskKind> },
    PriorityIn { values: Vec<TaskSavedViewPriority> },
    CategoryIdIn { ids: Vec<String> },
    TagIdAny { ids: Vec<String> },
    LifeAreaIdIn { ids: Vec<String> },
    FocusPlanIdIn { ids: Vec<String> },
    HasDeadlineIs { value: bool },
    DeadlineStateIn { values: Vec<DeadlineState> },
    ScheduledAfterDeadlineIs { value: bool },
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum StrictTaskSavedViewClause {
    TaskKindIn { values: Vec<TaskSavedViewTaskKind> },
    PriorityIn { values: Vec<TaskSavedViewPriority> },
    CategoryIdIn { ids: Vec<String> },
    TagIdAny { ids: Vec<String> },
    LifeAreaIdIn { ids: Vec<String> },
    FocusPlanIdIn { ids: Vec<String> },
    HasDeadlineIs { value: bool },
    DeadlineStateIn { values: Vec<DeadlineState> },
    ScheduledAfterDeadlineIs { value: bool },
}

impl From<StrictTaskSavedViewClause> for TaskSavedViewClause {
    fn from(value: StrictTaskSavedViewClause) -> Self {
        match value {
            StrictTaskSavedViewClause::TaskKindIn { values } => Self::TaskKindIn { values },
            StrictTaskSavedViewClause::PriorityIn { values } => Self::PriorityIn { values },
            StrictTaskSavedViewClause::CategoryIdIn { ids } => Self::CategoryIdIn { ids },
            StrictTaskSavedViewClause::TagIdAny { ids } => Self::TagIdAny { ids },
            StrictTaskSavedViewClause::LifeAreaIdIn { ids } => Self::LifeAreaIdIn { ids },
            StrictTaskSavedViewClause::FocusPlanIdIn { ids } => Self::FocusPlanIdIn { ids },
            StrictTaskSavedViewClause::HasDeadlineIs { value } => Self::HasDeadlineIs { value },
            StrictTaskSavedViewClause::DeadlineStateIn { values } => {
                Self::DeadlineStateIn { values }
            }
            StrictTaskSavedViewClause::ScheduledAfterDeadlineIs { value } => {
                Self::ScheduledAfterDeadlineIs { value }
            }
        }
    }
}

impl<'de> Deserialize<'de> for TaskSavedViewClause {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        StrictTaskSavedViewClause::deserialize(deserializer).map(Into::into)
    }
}

impl TaskSavedViewClause {
    fn order(&self) -> u8 {
        match self {
            Self::TaskKindIn { .. } => 0,
            Self::PriorityIn { .. } => 1,
            Self::CategoryIdIn { .. } => 2,
            Self::TagIdAny { .. } => 3,
            Self::LifeAreaIdIn { .. } => 4,
            Self::FocusPlanIdIn { .. } => 5,
            Self::HasDeadlineIs { .. } => 6,
            Self::DeadlineStateIn { .. } => 7,
            Self::ScheduledAfterDeadlineIs { .. } => 8,
        }
    }

    fn ids(&self) -> Option<&[String]> {
        match self {
            Self::CategoryIdIn { ids }
            | Self::TagIdAny { ids }
            | Self::LifeAreaIdIn { ids }
            | Self::FocusPlanIdIn { ids } => Some(ids),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TaskSavedViewPredicate {
    All { clauses: Vec<TaskSavedViewClause> },
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
enum StrictTaskSavedViewPredicate {
    All { clauses: Vec<TaskSavedViewClause> },
}

impl<'de> Deserialize<'de> for TaskSavedViewPredicate {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        match StrictTaskSavedViewPredicate::deserialize(deserializer)? {
            StrictTaskSavedViewPredicate::All { clauses } => Ok(Self::All { clauses }),
        }
    }
}

impl TaskSavedViewPredicate {
    fn clauses(&self) -> &[TaskSavedViewClause] {
        match self {
            Self::All { clauses } => clauses,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateTaskSavedViewInput {
    pub name: String,
    pub base_scope: TaskSavedViewBaseScope,
    pub predicate: TaskSavedViewPredicate,
    pub sort_mode: TaskSavedViewSortMode,
    pub group_mode: TaskSavedViewGroupMode,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UpdateTaskSavedViewInput {
    pub id: String,
    pub expected_revision: i32,
    pub name: String,
    pub base_scope: TaskSavedViewBaseScope,
    pub predicate: TaskSavedViewPredicate,
    pub sort_mode: TaskSavedViewSortMode,
    pub group_mode: TaskSavedViewGroupMode,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MutateTaskSavedViewInput {
    pub id: String,
    pub expected_revision: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct ReorderTaskSavedViewsInput {
    pub ordered_ids: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GetTaskSavedViewProjectionInput {
    pub view_id: String,
    pub anchor_local_date: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GetTaskSavedViewEditorOptionsInput {
    pub view_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TaskSavedViewSupportState {
    Supported,
    UnsupportedVersion,
    MalformedPredicate,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewView {
    pub id: String,
    pub name: String,
    pub base_scope: TaskSavedViewBaseScope,
    pub predicate_version: i32,
    pub sort_mode: TaskSavedViewSortMode,
    pub group_mode: TaskSavedViewGroupMode,
    pub position: i32,
    pub revision: i32,
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
    pub support_state: TaskSavedViewSupportState,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewDetail {
    pub view: TaskSavedViewView,
    pub predicate: Option<TaskSavedViewPredicate>,
    pub unsupported_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewReferenceOption {
    pub id: String,
    pub label: String,
    pub archived: bool,
    pub merged_from_id: Option<String>,
    pub missing: bool,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewEditorOptions {
    pub categories: Vec<TaskSavedViewReferenceOption>,
    pub tags: Vec<TaskSavedViewReferenceOption>,
    pub life_areas: Vec<TaskSavedViewReferenceOption>,
    pub focus_plans: Vec<TaskSavedViewReferenceOption>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewWarning {
    pub code: String,
    pub clause_kind: String,
    pub reference_id: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewTagView {
    pub id: String,
    pub name: String,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewResultItem {
    pub kind: TaskSavedViewTaskKind,
    pub task_id: Option<String>,
    pub occurrence_id: Option<String>,
    pub series_id: Option<String>,
    pub original_local_date: Option<String>,
    pub scheduled_local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub title: String,
    pub description: String,
    pub category_id: String,
    pub category_name: String,
    pub category_archived: bool,
    pub priority: String,
    pub is_override: bool,
    pub evaluation: Option<TaskEvaluationView>,
    pub life_area: Option<TaskLifeAreaView>,
    pub focus_plan: Option<TaskFocusPlanView>,
    pub deadline: Option<TaskDeadlineView>,
    pub tags: Vec<TaskSavedViewTagView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewResultGroup {
    pub key: String,
    pub label: String,
    pub items: Vec<TaskSavedViewResultItem>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskSavedViewProjection {
    pub view: TaskSavedViewView,
    pub anchor_local_date: String,
    pub range_start_local_date: String,
    pub range_end_local_date: String,
    pub total_source_count: u32,
    pub total_visible_count: u32,
    pub warnings: Vec<TaskSavedViewWarning>,
    pub unsupported_reason: Option<String>,
    pub groups: Vec<TaskSavedViewResultGroup>,
}

#[derive(Debug, Clone)]
struct StoredView {
    view: TaskSavedViewView,
    predicate_json: String,
}

#[derive(Debug, Clone)]
struct RefMeta {
    label: String,
    archived: bool,
    merged_into: Option<String>,
}

#[derive(Debug)]
struct ReferenceCatalog {
    categories: HashMap<String, RefMeta>,
    tags: HashMap<String, RefMeta>,
    life: HashMap<String, RefMeta>,
    plans: HashMap<String, RefMeta>,
}

impl ReferenceCatalog {
    fn load(conn: &Connection) -> Result<Self, repository::TaskError> {
        let mut categories = HashMap::new();
        let mut statement =
            conn.prepare("SELECT id,name,archived_at IS NOT NULL FROM task_categories")?;
        for row in statement.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                RefMeta {
                    label: row.get(1)?,
                    archived: row.get(2)?,
                    merged_into: None,
                },
            ))
        })? {
            let (id, value) = row?;
            categories.insert(id, value);
        }

        let mut tags = HashMap::new();
        let mut statement =
            conn.prepare("SELECT id,name,archived_at IS NOT NULL,merged_into_tag_id FROM tags")?;
        for row in statement.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                RefMeta {
                    label: row.get(1)?,
                    archived: row.get(2)?,
                    merged_into: row.get(3)?,
                },
            ))
        })? {
            let (id, value) = row?;
            tags.insert(id, value);
        }

        let life = repository::life_area_map(conn)?
            .into_iter()
            .map(|(id, value)| {
                (
                    id,
                    RefMeta {
                        label: value.breadcrumb,
                        archived: value.archived,
                        merged_into: None,
                    },
                )
            })
            .collect();
        let plans = repository::focus_plan_map(conn)?
            .into_iter()
            .map(|(id, value)| {
                (
                    id,
                    RefMeta {
                        label: value.title,
                        archived: value.archived,
                        merged_into: None,
                    },
                )
            })
            .collect();
        Ok(Self {
            categories,
            tags,
            life,
            plans,
        })
    }

    fn canonical_tag(&self, id: &str) -> Option<String> {
        let mut current = id;
        let mut seen = HashSet::new();
        for _ in 0..32 {
            if !seen.insert(current.to_string()) {
                return None;
            }
            let meta = self.tags.get(current)?;
            match meta.merged_into.as_deref() {
                Some(next) => current = next,
                None => return Some(current.to_string()),
            }
        }
        None
    }
}

fn now() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

fn new_id() -> String {
    Uuid::new_v7(Timestamp::now(NoContext)).to_string()
}

fn normalize_name(raw: &str) -> Result<(String, String), repository::TaskError> {
    if raw.chars().any(char::is_control) {
        return Err(repository::TaskError::Validation(INVALID_NAME));
    }
    let canonical = raw
        .nfkc()
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if canonical.is_empty() || canonical.chars().count() > 80 {
        return Err(repository::TaskError::Validation(INVALID_NAME));
    }
    let normalized = canonical.chars().flat_map(char::to_lowercase).collect();
    Ok((canonical, normalized))
}

fn ensure_unique_values<T: Eq + std::hash::Hash + Copy>(values: &[T]) -> bool {
    !values.is_empty() && values.iter().copied().collect::<HashSet<_>>().len() == values.len()
}

fn ensure_unique_ids(ids: &[String]) -> bool {
    !ids.is_empty()
        && ids.len() <= MAX_IDS_PER_CLAUSE
        && ids
            .iter()
            .all(|id| !id.is_empty() && !id.chars().any(char::is_control))
        && ids.iter().collect::<HashSet<_>>().len() == ids.len()
}

fn old_ids(predicate: Option<&TaskSavedViewPredicate>, order: u8) -> HashSet<String> {
    predicate
        .into_iter()
        .flat_map(TaskSavedViewPredicate::clauses)
        .find(|clause| clause.order() == order)
        .and_then(TaskSavedViewClause::ids)
        .unwrap_or_default()
        .iter()
        .cloned()
        .collect()
}

fn validate_reference(
    catalog: &ReferenceCatalog,
    order: u8,
    id: &str,
    existing: &HashSet<String>,
) -> bool {
    if existing.contains(id) {
        return true;
    }
    let map = match order {
        2 => &catalog.categories,
        4 => &catalog.life,
        5 => &catalog.plans,
        _ => return false,
    };
    map.get(id).is_some_and(|meta| !meta.archived)
}

fn canonicalize_predicate(
    catalog: &ReferenceCatalog,
    mut predicate: TaskSavedViewPredicate,
    previous: Option<&TaskSavedViewPredicate>,
) -> Result<TaskSavedViewPredicate, repository::TaskError> {
    let TaskSavedViewPredicate::All { clauses } = &mut predicate;
    if clauses.len() > MAX_CLAUSES {
        return Err(repository::TaskError::Validation(INVALID_PREDICATE));
    }
    let mut kinds = HashSet::new();
    let mut referenced = 0usize;
    for clause in clauses.iter_mut() {
        let order = clause.order();
        if !kinds.insert(order) {
            return Err(repository::TaskError::Validation(INVALID_PREDICATE));
        }
        match clause {
            TaskSavedViewClause::TaskKindIn { values } => {
                if !ensure_unique_values(values) {
                    return Err(repository::TaskError::Validation(INVALID_PREDICATE));
                }
                values.sort();
            }
            TaskSavedViewClause::PriorityIn { values } => {
                if !ensure_unique_values(values) {
                    return Err(repository::TaskError::Validation(INVALID_PREDICATE));
                }
                values.sort();
            }
            TaskSavedViewClause::DeadlineStateIn { values } => {
                if values.is_empty()
                    || values
                        .iter()
                        .map(|value| value.as_str())
                        .collect::<HashSet<_>>()
                        .len()
                        != values.len()
                {
                    return Err(repository::TaskError::Validation(INVALID_PREDICATE));
                }
                values.sort_by_key(|state| match state {
                    DeadlineState::Overdue => 0,
                    DeadlineState::DueToday => 1,
                    DeadlineState::Upcoming => 2,
                });
            }
            TaskSavedViewClause::CategoryIdIn { ids }
            | TaskSavedViewClause::LifeAreaIdIn { ids }
            | TaskSavedViewClause::FocusPlanIdIn { ids } => {
                if !ensure_unique_ids(ids) {
                    return Err(repository::TaskError::Validation(INVALID_PREDICATE));
                }
                referenced += ids.len();
                let existing = old_ids(previous, order);
                if ids
                    .iter()
                    .any(|id| !validate_reference(catalog, order, id, &existing))
                {
                    return Err(repository::TaskError::Validation(INVALID_REFERENCE));
                }
                ids.sort();
            }
            TaskSavedViewClause::TagIdAny { ids } => {
                if !ensure_unique_ids(ids) {
                    return Err(repository::TaskError::Validation(INVALID_PREDICATE));
                }
                referenced += ids.len();
                let existing = old_ids(previous, order);
                let mut canonical = Vec::with_capacity(ids.len());
                for id in ids.iter() {
                    let Some(target) = catalog.canonical_tag(id) else {
                        if existing.contains(id) {
                            canonical.push(id.clone());
                            continue;
                        }
                        return Err(repository::TaskError::Validation(INVALID_REFERENCE));
                    };
                    let active = catalog
                        .tags
                        .get(&target)
                        .is_some_and(|meta| !meta.archived && meta.merged_into.is_none());
                    if !active && !existing.contains(id) && !existing.contains(&target) {
                        return Err(repository::TaskError::Validation(INVALID_REFERENCE));
                    }
                    canonical.push(target);
                }
                canonical.sort();
                // Distinct historical aliases may later converge on one canonical tag. Literal
                // duplicate input was rejected above; collapse only resolution-introduced
                // duplicates so projection and the next explicit save remain truthful.
                canonical.dedup();
                *ids = canonical;
            }
            TaskSavedViewClause::HasDeadlineIs { .. }
            | TaskSavedViewClause::ScheduledAfterDeadlineIs { .. } => {}
        }
    }
    if referenced > MAX_REFERENCED_IDS {
        return Err(repository::TaskError::Validation(INVALID_PREDICATE));
    }
    clauses.sort_by_key(TaskSavedViewClause::order);
    Ok(predicate)
}

fn validate_meaningful(
    predicate: &TaskSavedViewPredicate,
    sort_mode: TaskSavedViewSortMode,
    group_mode: TaskSavedViewGroupMode,
) -> Result<(), repository::TaskError> {
    if predicate.clauses().is_empty()
        && sort_mode == TaskSavedViewSortMode::BaseDefault
        && group_mode == TaskSavedViewGroupMode::BaseDefault
    {
        Err(repository::TaskError::Validation(IDENTICAL_TO_SOURCE))
    } else {
        Ok(())
    }
}

fn stored_shape_is_valid(
    predicate: &TaskSavedViewPredicate,
    sort_mode: TaskSavedViewSortMode,
    group_mode: TaskSavedViewGroupMode,
) -> bool {
    let clauses = predicate.clauses();
    if clauses.len() > MAX_CLAUSES
        || clauses
            .iter()
            .map(TaskSavedViewClause::order)
            .collect::<HashSet<_>>()
            .len()
            != clauses.len()
    {
        return false;
    }
    let mut referenced = 0usize;
    for clause in clauses {
        let valid = match clause {
            TaskSavedViewClause::TaskKindIn { values } => ensure_unique_values(values),
            TaskSavedViewClause::PriorityIn { values } => ensure_unique_values(values),
            TaskSavedViewClause::DeadlineStateIn { values } => {
                !values.is_empty()
                    && values
                        .iter()
                        .map(|value| value.as_str())
                        .collect::<HashSet<_>>()
                        .len()
                        == values.len()
            }
            TaskSavedViewClause::CategoryIdIn { ids }
            | TaskSavedViewClause::TagIdAny { ids }
            | TaskSavedViewClause::LifeAreaIdIn { ids }
            | TaskSavedViewClause::FocusPlanIdIn { ids } => {
                referenced += ids.len();
                ensure_unique_ids(ids)
            }
            TaskSavedViewClause::HasDeadlineIs { .. }
            | TaskSavedViewClause::ScheduledAfterDeadlineIs { .. } => true,
        };
        if !valid {
            return false;
        }
    }
    referenced <= MAX_REFERENCED_IDS
        && validate_meaningful(predicate, sort_mode, group_mode).is_ok()
}

fn parse_stored(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredView> {
    let base: String = row.get(2)?;
    let sort: String = row.get(5)?;
    let group: String = row.get(6)?;
    Ok(StoredView {
        view: TaskSavedViewView {
            id: row.get(0)?,
            name: row.get(1)?,
            base_scope: TaskSavedViewBaseScope::parse(&base).expect("storage check"),
            predicate_version: row.get(3)?,
            sort_mode: TaskSavedViewSortMode::parse(&sort).expect("storage check"),
            group_mode: TaskSavedViewGroupMode::parse(&group).expect("storage check"),
            position: row.get(7)?,
            revision: row.get(8)?,
            archived: row.get::<_, Option<String>>(9)?.is_some(),
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            support_state: TaskSavedViewSupportState::Supported,
        },
        predicate_json: row.get(4)?,
    })
}

const VIEW_COLUMNS: &str = "id,name,base_scope,predicate_version,predicate_json,sort_mode,group_mode,position,revision,archived_at,created_at,updated_at";

fn load_stored(conn: &Connection, id: &str) -> Result<StoredView, repository::TaskError> {
    conn.query_row(
        &format!("SELECT {VIEW_COLUMNS} FROM task_saved_views WHERE id=?1"),
        params![id],
        parse_stored,
    )
    .optional()?
    .ok_or(repository::TaskError::NotFound)
}

fn decode(mut stored: StoredView) -> TaskSavedViewDetail {
    if stored.view.predicate_version != PREDICATE_VERSION {
        stored.view.support_state = TaskSavedViewSupportState::UnsupportedVersion;
        return TaskSavedViewDetail {
            unsupported_reason: Some(format!(
                "Predicate version {} is not supported by this app.",
                stored.view.predicate_version
            )),
            view: stored.view,
            predicate: None,
        };
    }
    match serde_json::from_str::<TaskSavedViewPredicate>(&stored.predicate_json) {
        Ok(predicate)
            if stored_shape_is_valid(&predicate, stored.view.sort_mode, stored.view.group_mode) =>
        {
            TaskSavedViewDetail {
                view: stored.view,
                predicate: Some(predicate),
                unsupported_reason: None,
            }
        }
        Ok(_) | Err(_) => {
            stored.view.support_state = TaskSavedViewSupportState::MalformedPredicate;
            TaskSavedViewDetail {
                view: stored.view,
                predicate: None,
                unsupported_reason: Some(
                    "The stored predicate is malformed and was not executed.".into(),
                ),
            }
        }
    }
}

fn list_where(
    conn: &Connection,
    archived: bool,
) -> Result<Vec<TaskSavedViewView>, repository::TaskError> {
    let sql = if archived {
        format!(
            "SELECT {VIEW_COLUMNS} FROM task_saved_views WHERE archived_at IS NOT NULL ORDER BY archived_at DESC,id"
        )
    } else {
        format!(
            "SELECT {VIEW_COLUMNS} FROM task_saved_views WHERE archived_at IS NULL ORDER BY position,id"
        )
    };
    let mut statement = conn.prepare(&sql)?;
    let rows = statement.query_map([], parse_stored)?;
    let mut views = Vec::new();
    for row in rows {
        views.push(decode(row?).view);
    }
    Ok(views)
}

pub fn list_active(conn: &Connection) -> Result<Vec<TaskSavedViewView>, repository::TaskError> {
    list_where(conn, false)
}

pub fn list_archived(conn: &Connection) -> Result<Vec<TaskSavedViewView>, repository::TaskError> {
    list_where(conn, true)
}

pub fn get(conn: &Connection, id: &str) -> Result<TaskSavedViewDetail, repository::TaskError> {
    Ok(decode(load_stored(conn, id)?))
}

fn name_available(
    conn: &Connection,
    normalized: &str,
    excluding: Option<&str>,
) -> Result<bool, repository::TaskError> {
    Ok(conn.query_row(
        "SELECT NOT EXISTS(SELECT 1 FROM task_saved_views WHERE normalized_name=?1 AND (?2 IS NULL OR id<>?2))",
        params![normalized, excluding],
        |row| row.get(0),
    )?)
}

pub fn create(
    conn: &mut Connection,
    input: CreateTaskSavedViewInput,
) -> Result<TaskSavedViewDetail, repository::TaskError> {
    let (name, normalized) = normalize_name(&input.name)?;
    if !name_available(conn, &normalized, None)? {
        return Err(repository::TaskError::Validation(
            "A Saved View with this name already exists.",
        ));
    }
    if conn.query_row(
        "SELECT COUNT(*) FROM task_saved_views WHERE archived_at IS NULL",
        [],
        |row| row.get::<_, i64>(0),
    )? >= MAX_ACTIVE_VIEWS
    {
        return Err(repository::TaskError::Validation(
            "Archive a Saved View before creating another one.",
        ));
    }
    let catalog = ReferenceCatalog::load(conn)?;
    let predicate = canonicalize_predicate(&catalog, input.predicate, None)?;
    validate_meaningful(&predicate, input.sort_mode, input.group_mode)?;
    let predicate_json = serde_json::to_string(&predicate)
        .map_err(|_| repository::TaskError::Validation(INVALID_PREDICATE))?;
    let id = new_id();
    let timestamp = now();
    let position: i32 = conn.query_row(
        "SELECT COALESCE(MAX(position),-1)+1 FROM task_saved_views WHERE archived_at IS NULL",
        [],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO task_saved_views(id,name,normalized_name,base_scope,predicate_version,predicate_json,sort_mode,group_mode,position,revision,archived_at,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,0,NULL,?10,?10)",
        params![id, name, normalized, input.base_scope.as_str(), PREDICATE_VERSION, predicate_json, input.sort_mode.as_str(), input.group_mode.as_str(), position, timestamp],
    )?;
    get(conn, &id)
}

pub fn update(
    conn: &mut Connection,
    input: UpdateTaskSavedViewInput,
) -> Result<TaskSavedViewDetail, repository::TaskError> {
    let stored = load_stored(conn, &input.id)?;
    if stored.view.revision != input.expected_revision {
        return Err(repository::TaskError::Validation(STALE_WRITE));
    }
    let previous = decode(stored).predicate;
    let (name, normalized) = normalize_name(&input.name)?;
    if !name_available(conn, &normalized, Some(&input.id))? {
        return Err(repository::TaskError::Validation(
            "A Saved View with this name already exists.",
        ));
    }
    let catalog = ReferenceCatalog::load(conn)?;
    let predicate = canonicalize_predicate(&catalog, input.predicate, previous.as_ref())?;
    validate_meaningful(&predicate, input.sort_mode, input.group_mode)?;
    let predicate_json = serde_json::to_string(&predicate)
        .map_err(|_| repository::TaskError::Validation(INVALID_PREDICATE))?;
    let changed = conn.execute(
        "UPDATE task_saved_views SET name=?2,normalized_name=?3,base_scope=?4,predicate_version=?5,predicate_json=?6,sort_mode=?7,group_mode=?8,revision=revision+1,updated_at=?9
         WHERE id=?1 AND revision=?10",
        params![input.id, name, normalized, input.base_scope.as_str(), PREDICATE_VERSION, predicate_json, input.sort_mode.as_str(), input.group_mode.as_str(), now(), input.expected_revision],
    )?;
    if changed != 1 {
        return Err(repository::TaskError::Validation(STALE_WRITE));
    }
    get(conn, &input.id)
}

fn archive_in_tx(
    tx: &Transaction<'_>,
    input: &MutateTaskSavedViewInput,
) -> Result<(), repository::TaskError> {
    let state: Option<(i32, i32, bool)> = tx
        .query_row(
            "SELECT position,revision,archived_at IS NOT NULL FROM task_saved_views WHERE id=?1",
            params![input.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;
    let Some((position, revision, archived)) = state else {
        return Err(repository::TaskError::NotFound);
    };
    if revision != input.expected_revision {
        return Err(repository::TaskError::Validation(STALE_WRITE));
    }
    if archived {
        return Err(repository::TaskError::Validation(
            "This Saved View is already archived.",
        ));
    }
    let timestamp = now();
    tx.execute(
        "UPDATE task_saved_views SET archived_at=?2,revision=revision+1,updated_at=?2 WHERE id=?1 AND revision=?3",
        params![input.id, timestamp, input.expected_revision],
    )?;
    tx.execute(
        "UPDATE task_saved_views SET position=position+1000 WHERE archived_at IS NULL AND position>?1",
        params![position],
    )?;
    tx.execute(
        "UPDATE task_saved_views SET position=position-1001 WHERE archived_at IS NULL AND position>?1",
        params![position + 1000],
    )?;
    Ok(())
}

pub fn archive(
    conn: &mut Connection,
    input: MutateTaskSavedViewInput,
) -> Result<TaskSavedViewDetail, repository::TaskError> {
    let tx = conn.transaction()?;
    archive_in_tx(&tx, &input)?;
    tx.commit()?;
    get(conn, &input.id)
}

pub fn restore(
    conn: &mut Connection,
    input: MutateTaskSavedViewInput,
) -> Result<TaskSavedViewDetail, repository::TaskError> {
    let tx = conn.transaction()?;
    let state: Option<(i32, bool)> = tx
        .query_row(
            "SELECT revision,archived_at IS NOT NULL FROM task_saved_views WHERE id=?1",
            params![input.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;
    let Some((revision, archived)) = state else {
        return Err(repository::TaskError::NotFound);
    };
    if revision != input.expected_revision {
        return Err(repository::TaskError::Validation(STALE_WRITE));
    }
    if !archived {
        return Err(repository::TaskError::Validation(
            "This Saved View is already active.",
        ));
    }
    let count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM task_saved_views WHERE archived_at IS NULL",
        [],
        |row| row.get(0),
    )?;
    if count >= MAX_ACTIVE_VIEWS {
        return Err(repository::TaskError::Validation(
            "Archive a Saved View before restoring this one.",
        ));
    }
    let position: i32 = tx.query_row(
        "SELECT COALESCE(MAX(position),-1)+1 FROM task_saved_views WHERE archived_at IS NULL",
        [],
        |row| row.get(0),
    )?;
    tx.execute(
        "UPDATE task_saved_views SET archived_at=NULL,position=?2,revision=revision+1,updated_at=?3 WHERE id=?1 AND revision=?4",
        params![input.id, position, now(), input.expected_revision],
    )?;
    tx.commit()?;
    get(conn, &input.id)
}

pub fn reorder(
    conn: &mut Connection,
    input: ReorderTaskSavedViewsInput,
) -> Result<Vec<TaskSavedViewView>, repository::TaskError> {
    if input.ordered_ids.iter().collect::<HashSet<_>>().len() != input.ordered_ids.len() {
        return Err(repository::TaskError::Validation(
            "Reorder must include every active Saved View exactly once.",
        ));
    }
    let tx = conn.transaction()?;
    let mut statement =
        tx.prepare("SELECT id FROM task_saved_views WHERE archived_at IS NULL ORDER BY id")?;
    let active = statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);
    let mut requested = input.ordered_ids.clone();
    requested.sort();
    if requested != active {
        return Err(repository::TaskError::Validation(
            "Reorder must include every active Saved View exactly once.",
        ));
    }
    tx.execute(
        "UPDATE task_saved_views SET position=position+1000 WHERE archived_at IS NULL",
        [],
    )?;
    let timestamp = now();
    for (position, id) in input.ordered_ids.iter().enumerate() {
        tx.execute(
            "UPDATE task_saved_views SET position=?2,updated_at=?3 WHERE id=?1 AND archived_at IS NULL",
            params![id, position as i32, timestamp],
        )?;
    }
    tx.commit()?;
    list_active(conn)
}

fn referenced_by_kind(predicate: Option<&TaskSavedViewPredicate>, order: u8) -> HashSet<String> {
    old_ids(predicate, order)
}

fn options_for(
    map: &HashMap<String, RefMeta>,
    referenced: &HashSet<String>,
) -> Vec<TaskSavedViewReferenceOption> {
    let mut ids = map
        .iter()
        .filter(|(_, value)| !value.archived && value.merged_into.is_none())
        .map(|(id, _)| id.clone())
        .collect::<HashSet<_>>();
    ids.extend(referenced.iter().cloned());
    let mut options = ids
        .into_iter()
        .map(|id| match map.get(&id) {
            Some(value) => TaskSavedViewReferenceOption {
                id,
                label: value.label.clone(),
                archived: value.archived,
                merged_from_id: None,
                missing: false,
            },
            None => TaskSavedViewReferenceOption {
                label: format!("Missing reference ({id})"),
                id,
                archived: false,
                merged_from_id: None,
                missing: true,
            },
        })
        .collect::<Vec<_>>();
    options.sort_by(|left, right| {
        left.missing
            .cmp(&right.missing)
            .then(left.archived.cmp(&right.archived))
            .then(left.label.to_lowercase().cmp(&right.label.to_lowercase()))
            .then(left.id.cmp(&right.id))
    });
    options
}

pub fn editor_options(
    conn: &Connection,
    input: GetTaskSavedViewEditorOptionsInput,
) -> Result<TaskSavedViewEditorOptions, repository::TaskError> {
    let predicate = match input.view_id {
        Some(id) => get(conn, &id)?.predicate,
        None => None,
    };
    let catalog = ReferenceCatalog::load(conn)?;
    let category_refs = referenced_by_kind(predicate.as_ref(), 2);
    let tag_refs = referenced_by_kind(predicate.as_ref(), 3);
    let life_refs = referenced_by_kind(predicate.as_ref(), 4);
    let plan_refs = referenced_by_kind(predicate.as_ref(), 5);
    let mut tags = options_for(&catalog.tags, &HashSet::new());
    for original in tag_refs {
        match catalog.canonical_tag(&original) {
            Some(canonical) => {
                if canonical == original {
                    if !tags.iter().any(|option| option.id == canonical) {
                        if let Some(value) = catalog.tags.get(&canonical) {
                            tags.push(TaskSavedViewReferenceOption {
                                id: canonical,
                                label: value.label.clone(),
                                archived: value.archived,
                                merged_from_id: None,
                                missing: false,
                            });
                        }
                    }
                    continue;
                }
                if let Some(option) = tags
                    .iter_mut()
                    .find(|option| option.id == canonical && option.merged_from_id.is_none())
                {
                    option.merged_from_id = Some(original);
                } else if !tags.iter().any(|option| {
                    option.id == canonical && option.merged_from_id.as_deref() == Some(&original)
                }) && let Some(value) = catalog.tags.get(&canonical)
                {
                    // The DTO deliberately stays singular. Multiple rows with the same canonical
                    // ID retain every alias mapping; React collapses them to one visible option
                    // after normalizing the draft.
                    tags.push(TaskSavedViewReferenceOption {
                        id: canonical,
                        label: value.label.clone(),
                        archived: value.archived,
                        merged_from_id: Some(original),
                        missing: false,
                    });
                }
            }
            None => tags.push(TaskSavedViewReferenceOption {
                label: format!("Missing reference ({original})"),
                id: original,
                archived: false,
                merged_from_id: None,
                missing: true,
            }),
        }
    }
    tags.sort_by_key(|option| option.label.to_lowercase());
    Ok(TaskSavedViewEditorOptions {
        categories: options_for(&catalog.categories, &category_refs),
        tags,
        life_areas: options_for(&catalog.life, &life_refs),
        focus_plans: options_for(&catalog.plans, &plan_refs),
    })
}

#[derive(Clone)]
struct NormalizedRow {
    result: TaskSavedViewResultItem,
    source_index: usize,
    base_group_key: String,
    base_group_label: String,
    base_group_order: usize,
}

fn category_archived(catalog: &ReferenceCatalog, id: &str) -> bool {
    catalog
        .categories
        .get(id)
        .is_some_and(|value| value.archived)
}

fn normalize_today(
    conn: &Connection,
    anchor: &str,
    catalog: &ReferenceCatalog,
) -> Result<(String, String, Vec<NormalizedRow>), repository::TaskError> {
    let items = repository::today_items(conn, anchor, anchor)?;
    let rows = items
        .into_iter()
        .enumerate()
        .map(|(source_index, item)| {
            let (period_order, period_label) = if item.start_minute < 720 {
                (0, "Morning")
            } else if item.start_minute < 1080 {
                (1, "Afternoon")
            } else {
                (2, "Evening")
            };
            let slot_label = format!(
                "{period_label} · {:02}:{:02}–{:02}:{:02}",
                item.start_minute / 60,
                item.start_minute % 60,
                item.end_minute / 60,
                item.end_minute % 60
            );
            let slot_order = period_order * 2_000_000
                + item.start_minute as usize * 2_000
                + item.end_minute as usize;
            let kind = match item.kind {
                TodayItemKind::OneOff => TaskSavedViewTaskKind::OneOff,
                TodayItemKind::Recurring => TaskSavedViewTaskKind::Recurring,
            };
            NormalizedRow {
                result: TaskSavedViewResultItem {
                    kind,
                    task_id: (kind == TaskSavedViewTaskKind::OneOff).then_some(item.id),
                    occurrence_id: item.occurrence_id,
                    series_id: item.series_id,
                    original_local_date: item.original_local_date,
                    scheduled_local_date: item.local_date,
                    start_minute: item.start_minute,
                    end_minute: item.end_minute,
                    title: item.title,
                    description: item.description,
                    category_archived: category_archived(catalog, &item.category_id),
                    category_id: item.category_id,
                    category_name: item.category_name,
                    priority: item.priority,
                    is_override: item.is_override,
                    evaluation: item.evaluation,
                    life_area: item.life_area,
                    focus_plan: item.focus_plan,
                    deadline: item.deadline,
                    tags: vec![],
                },
                source_index,
                base_group_key: format!(
                    "today-{period_order}-{}-{}",
                    item.start_minute, item.end_minute
                ),
                base_group_label: slot_label,
                base_group_order: slot_order,
            }
        })
        .collect();
    Ok((anchor.into(), anchor.into(), rows))
}

fn normalize_planning(
    conn: &Connection,
    anchor: &str,
    mode: TaskPlanningMode,
    catalog: &ReferenceCatalog,
) -> Result<(String, String, Vec<NormalizedRow>), repository::TaskError> {
    let projection = planning::projection(
        conn,
        GetTaskPlanningProjectionInput {
            mode,
            anchor_local_date: anchor.into(),
        },
    )?;
    let mut source_index = 0usize;
    let mut rows = Vec::new();
    for (group_order, group) in projection.groups.into_iter().enumerate() {
        let group_date = group.local_date;
        for item in group.items {
            let kind = match item.kind {
                TodayItemKind::OneOff => TaskSavedViewTaskKind::OneOff,
                TodayItemKind::Recurring => TaskSavedViewTaskKind::Recurring,
            };
            rows.push(NormalizedRow {
                result: TaskSavedViewResultItem {
                    kind,
                    task_id: (kind == TaskSavedViewTaskKind::OneOff).then_some(item.id),
                    occurrence_id: item.occurrence_id,
                    series_id: item.series_id,
                    original_local_date: item.original_local_date,
                    scheduled_local_date: item.local_date,
                    start_minute: item.start_minute,
                    end_minute: item.end_minute,
                    title: item.title,
                    description: item.description,
                    category_archived: category_archived(catalog, &item.category_id),
                    category_id: item.category_id,
                    category_name: item.category_name,
                    priority: item.priority,
                    is_override: item.is_override,
                    evaluation: None,
                    life_area: item.life_area,
                    focus_plan: item.focus_plan,
                    deadline: item.deadline,
                    tags: vec![],
                },
                source_index,
                base_group_key: format!("scheduled-{group_date}"),
                base_group_label: group_date.clone(),
                base_group_order: group_order,
            });
            source_index += 1;
        }
    }
    Ok((
        projection.range_start_local_date,
        projection.range_end_local_date,
        rows,
    ))
}

fn normalize_deadlines(
    conn: &Connection,
    anchor: &str,
    catalog: &ReferenceCatalog,
) -> Result<(String, String, Vec<NormalizedRow>), repository::TaskError> {
    let projection = deadline::projection(
        conn,
        GetDeadlineQueueInput {
            anchor_local_date: anchor.into(),
        },
    )?;
    let mut source_index = 0usize;
    let mut rows = Vec::new();
    for (group_order, group) in projection.groups.into_iter().enumerate() {
        let label = match group.state {
            DeadlineState::Overdue => "Overdue deadlines",
            DeadlineState::DueToday => "Due today",
            DeadlineState::Upcoming => "Upcoming deadlines",
        };
        for item in group.items {
            rows.push(NormalizedRow {
                result: TaskSavedViewResultItem {
                    kind: TaskSavedViewTaskKind::OneOff,
                    task_id: Some(item.id),
                    occurrence_id: None,
                    series_id: None,
                    original_local_date: None,
                    scheduled_local_date: item.scheduled_local_date,
                    start_minute: item.start_minute,
                    end_minute: item.end_minute,
                    title: item.title,
                    description: item.description,
                    category_archived: category_archived(catalog, &item.category_id),
                    category_id: item.category_id,
                    category_name: item.category_name,
                    priority: item.priority,
                    is_override: false,
                    evaluation: None,
                    life_area: item.life_area,
                    focus_plan: item.focus_plan,
                    deadline: Some(TaskDeadlineView {
                        deadline_local_date: item.deadline_local_date,
                        state: item.deadline_state,
                        scheduled_after_deadline: item.scheduled_after_deadline,
                    }),
                    tags: vec![],
                },
                source_index,
                base_group_key: format!("deadline-{}", group.state.as_str()),
                base_group_label: label.into(),
                base_group_order: group_order,
            });
            source_index += 1;
        }
    }
    Ok((
        projection.range_start_local_date,
        projection.range_end_local_date,
        rows,
    ))
}

fn load_saved_view_tags(
    conn: &Connection,
    rows: &mut [NormalizedRow],
    catalog: &ReferenceCatalog,
) -> Result<(), repository::TaskError> {
    let task_ids = rows
        .iter()
        .filter_map(|row| row.result.task_id.clone())
        .collect::<Vec<_>>();
    let series_ids = rows
        .iter()
        .filter_map(|row| row.result.series_id.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let task_tags = load_tag_assignments(conn, "task_tags", "task_id", &task_ids, catalog)?;
    let series_tags =
        load_tag_assignments(conn, "task_series_tags", "series_id", &series_ids, catalog)?;
    for row in rows {
        let tags = match (&row.result.task_id, &row.result.series_id) {
            (Some(id), _) => task_tags.get(id),
            (_, Some(id)) => series_tags.get(id),
            _ => None,
        };
        if let Some(tags) = tags {
            row.result.tags = tags.clone();
        }
    }
    Ok(())
}

fn load_tag_assignments(
    conn: &Connection,
    table: &str,
    owner_column: &str,
    ids: &[String],
    catalog: &ReferenceCatalog,
) -> Result<HashMap<String, Vec<TaskSavedViewTagView>>, repository::TaskError> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    let placeholders = (1..=ids.len())
        .map(|index| format!("?{index}"))
        .collect::<Vec<_>>()
        .join(",");
    // `table` and `owner_column` are fixed module constants selected above, never predicate or
    // user input. Values remain bound parameters.
    let sql = format!(
        "SELECT a.{owner_column},a.tag_id FROM {table} a WHERE a.{owner_column} IN ({placeholders}) ORDER BY a.{owner_column},a.tag_id"
    );
    let mut statement = conn.prepare(&sql)?;
    let rows = statement.query_map(rusqlite::params_from_iter(ids), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut result: HashMap<String, Vec<TaskSavedViewTagView>> = HashMap::new();
    for row in rows {
        let (owner, assigned) = row?;
        let canonical = catalog
            .canonical_tag(&assigned)
            .unwrap_or_else(|| assigned.clone());
        if let Some(meta) = catalog.tags.get(&canonical) {
            let values = result.entry(owner).or_default();
            if !values.iter().any(|value| value.id == canonical) {
                values.push(TaskSavedViewTagView {
                    id: canonical,
                    name: meta.label.clone(),
                    archived: meta.archived,
                });
            }
        }
    }
    Ok(result)
}

fn reference_warnings(
    predicate: &TaskSavedViewPredicate,
    catalog: &ReferenceCatalog,
) -> (Vec<TaskSavedViewWarning>, HashSet<u8>) {
    let mut warnings = Vec::new();
    let mut missing_clauses = HashSet::new();
    for clause in predicate.clauses() {
        let (kind, map): (&str, Option<&HashMap<String, RefMeta>>) = match clause {
            TaskSavedViewClause::CategoryIdIn { .. } => {
                ("category_id_in", Some(&catalog.categories))
            }
            TaskSavedViewClause::TagIdAny { .. } => ("tag_id_any", Some(&catalog.tags)),
            TaskSavedViewClause::LifeAreaIdIn { .. } => ("life_area_id_in", Some(&catalog.life)),
            TaskSavedViewClause::FocusPlanIdIn { .. } => ("focus_plan_id_in", Some(&catalog.plans)),
            _ => ("", None),
        };
        let Some(map) = map else { continue };
        for id in clause.ids().unwrap_or_default() {
            let resolved = if matches!(clause, TaskSavedViewClause::TagIdAny { .. }) {
                catalog.canonical_tag(id)
            } else {
                Some(id.clone())
            };
            match resolved.as_deref().and_then(|resolved| map.get(resolved)) {
                None => {
                    missing_clauses.insert(clause.order());
                    warnings.push(TaskSavedViewWarning {
                        code: "missing_reference".into(),
                        clause_kind: kind.into(),
                        reference_id: Some(id.clone()),
                        message:
                            "A referenced item no longer exists; this clause matches no tasks."
                                .into(),
                    });
                }
                Some(meta) if meta.archived => warnings.push(TaskSavedViewWarning {
                    code: "archived_reference".into(),
                    clause_kind: kind.into(),
                    reference_id: Some(id.clone()),
                    message: format!("Archived reference: {}", meta.label),
                }),
                Some(_) => {}
            }
        }
    }
    (warnings, missing_clauses)
}

fn matches_predicate(
    row: &TaskSavedViewResultItem,
    predicate: &TaskSavedViewPredicate,
    missing_clauses: &HashSet<u8>,
    catalog: &ReferenceCatalog,
) -> bool {
    predicate.clauses().iter().all(|clause| {
        if missing_clauses.contains(&clause.order()) {
            return false;
        }
        match clause {
            TaskSavedViewClause::TaskKindIn { values } => values.contains(&row.kind),
            TaskSavedViewClause::PriorityIn { values } => {
                values.iter().any(|value| value.as_str() == row.priority)
            }
            TaskSavedViewClause::CategoryIdIn { ids } => ids.contains(&row.category_id),
            TaskSavedViewClause::TagIdAny { ids } => {
                let expected = ids
                    .iter()
                    .filter_map(|id| catalog.canonical_tag(id))
                    .collect::<HashSet<_>>();
                row.tags.iter().any(|tag| expected.contains(&tag.id))
            }
            TaskSavedViewClause::LifeAreaIdIn { ids } => row
                .life_area
                .as_ref()
                .is_some_and(|area| ids.contains(&area.id)),
            TaskSavedViewClause::FocusPlanIdIn { ids } => row
                .focus_plan
                .as_ref()
                .is_some_and(|plan| ids.contains(&plan.id)),
            TaskSavedViewClause::HasDeadlineIs { value } => row.deadline.is_some() == *value,
            TaskSavedViewClause::DeadlineStateIn { values } => row
                .deadline
                .as_ref()
                .is_some_and(|deadline| values.contains(&deadline.state)),
            TaskSavedViewClause::ScheduledAfterDeadlineIs { value } => row
                .deadline
                .as_ref()
                .is_some_and(|deadline| deadline.scheduled_after_deadline == *value),
        }
    })
}

fn priority_rank(value: &str) -> i32 {
    match value {
        "high" => 0,
        "medium" => 1,
        _ => 2,
    }
}

fn stable_identity(row: &TaskSavedViewResultItem) -> String {
    match row.kind {
        TaskSavedViewTaskKind::OneOff => row.task_id.clone().unwrap_or_default(),
        TaskSavedViewTaskKind::Recurring => format!(
            "{}:{}",
            row.series_id.as_deref().unwrap_or_default(),
            row.original_local_date.as_deref().unwrap_or_default()
        ),
    }
}

fn compare_rows(
    left: &NormalizedRow,
    right: &NormalizedRow,
    mode: TaskSavedViewSortMode,
) -> Ordering {
    let scheduled = || {
        left.result
            .scheduled_local_date
            .cmp(&right.result.scheduled_local_date)
            .then(left.result.start_minute.cmp(&right.result.start_minute))
            .then(left.result.end_minute.cmp(&right.result.end_minute))
    };
    let identity = || stable_identity(&left.result).cmp(&stable_identity(&right.result));
    match mode {
        TaskSavedViewSortMode::BaseDefault => left.source_index.cmp(&right.source_index),
        TaskSavedViewSortMode::ScheduledAscending => scheduled().then_with(identity),
        TaskSavedViewSortMode::PriorityThenScheduled => priority_rank(&left.result.priority)
            .cmp(&priority_rank(&right.result.priority))
            .then_with(scheduled)
            .then_with(identity),
        TaskSavedViewSortMode::TitleAscending => left
            .result
            .title
            .to_lowercase()
            .cmp(&right.result.title.to_lowercase())
            .then_with(scheduled)
            .then_with(identity),
    }
}

fn group_key(row: &NormalizedRow, mode: TaskSavedViewGroupMode) -> (usize, String, String, bool) {
    match mode {
        TaskSavedViewGroupMode::BaseDefault => (
            row.base_group_order,
            row.base_group_key.clone(),
            row.base_group_label.clone(),
            false,
        ),
        TaskSavedViewGroupMode::None => (0, "all".into(), "All tasks".into(), false),
        TaskSavedViewGroupMode::Category => (
            0,
            format!("category-{}", row.result.category_id),
            format!(
                "{}{}",
                row.result.category_name,
                if row.result.category_archived {
                    " (archived)"
                } else {
                    ""
                }
            ),
            false,
        ),
        TaskSavedViewGroupMode::LifeArea => match &row.result.life_area {
            Some(area) => (
                0,
                format!("life-{}", area.id),
                format!(
                    "{}{}",
                    area.title,
                    if area.archived { " (archived)" } else { "" }
                ),
                false,
            ),
            None => (1, "life-none".into(), "No Life area".into(), true),
        },
        TaskSavedViewGroupMode::FocusPlan => match &row.result.focus_plan {
            Some(plan) => (
                0,
                format!("plan-{}", plan.id),
                format!(
                    "{}{}",
                    plan.title,
                    if plan.archived { " (archived)" } else { "" }
                ),
                false,
            ),
            None => (1, "plan-none".into(), "No Focus Plan".into(), true),
        },
    }
}

pub fn projection(
    conn: &Connection,
    input: GetTaskSavedViewProjectionInput,
) -> Result<TaskSavedViewProjection, repository::TaskError> {
    if !validate_date(&input.anchor_local_date) {
        return Err(repository::TaskError::Validation(
            "Enter a valid anchor date.",
        ));
    }
    let detail = get(conn, &input.view_id)?;
    if detail.view.archived {
        return Err(repository::TaskError::Validation(
            "Restore this Saved View before opening it.",
        ));
    }
    let Some(predicate) = detail.predicate else {
        return Ok(TaskSavedViewProjection {
            view: detail.view,
            anchor_local_date: input.anchor_local_date,
            range_start_local_date: String::new(),
            range_end_local_date: String::new(),
            total_source_count: 0,
            total_visible_count: 0,
            warnings: vec![],
            unsupported_reason: detail.unsupported_reason,
            groups: vec![],
        });
    };
    // Re-validate the stored shape without enforcing active-reference rules. This catches JSON
    // that is syntactically typed but violates v1 bounds and keeps it non-executable.
    let catalog = ReferenceCatalog::load(conn)?;
    let predicate = match canonicalize_predicate(&catalog, predicate.clone(), Some(&predicate)) {
        Ok(predicate) => predicate,
        Err(_) => {
            let mut view = detail.view;
            view.support_state = TaskSavedViewSupportState::MalformedPredicate;
            return Ok(TaskSavedViewProjection {
                view,
                anchor_local_date: input.anchor_local_date,
                range_start_local_date: String::new(),
                range_end_local_date: String::new(),
                total_source_count: 0,
                total_visible_count: 0,
                warnings: vec![],
                unsupported_reason: Some(
                    "The stored predicate violates v1 bounds and was not executed.".into(),
                ),
                groups: vec![],
            });
        }
    };
    if validate_meaningful(&predicate, detail.view.sort_mode, detail.view.group_mode).is_err() {
        let mut view = detail.view;
        view.support_state = TaskSavedViewSupportState::MalformedPredicate;
        return Ok(TaskSavedViewProjection {
            view,
            anchor_local_date: input.anchor_local_date,
            range_start_local_date: String::new(),
            range_end_local_date: String::new(),
            total_source_count: 0,
            total_visible_count: 0,
            warnings: vec![],
            unsupported_reason: Some(
                "The stored view is identical to its base scope and was not executed.".into(),
            ),
            groups: vec![],
        });
    }
    let (range_start, range_end, mut rows) = match detail.view.base_scope {
        TaskSavedViewBaseScope::Today => normalize_today(conn, &input.anchor_local_date, &catalog)?,
        TaskSavedViewBaseScope::Upcoming => normalize_planning(
            conn,
            &input.anchor_local_date,
            TaskPlanningMode::Upcoming,
            &catalog,
        )?,
        TaskSavedViewBaseScope::Overdue => normalize_planning(
            conn,
            &input.anchor_local_date,
            TaskPlanningMode::Overdue,
            &catalog,
        )?,
        TaskSavedViewBaseScope::Deadlines => {
            normalize_deadlines(conn, &input.anchor_local_date, &catalog)?
        }
    };
    let total_source_count = rows.len() as u32;
    if rows.len() > planning::MAX_PLANNING_ITEMS {
        return Err(repository::TaskError::Validation(
            "This Saved View source contains too many tasks.",
        ));
    }
    load_saved_view_tags(conn, &mut rows, &catalog)?;
    let (warnings, missing_clauses) = reference_warnings(&predicate, &catalog);
    rows.retain(|row| matches_predicate(&row.result, &predicate, &missing_clauses, &catalog));
    if rows.len() > planning::MAX_PLANNING_ITEMS {
        return Err(repository::TaskError::Validation(
            "This Saved View contains too many results.",
        ));
    }
    rows.sort_by(|left, right| compare_rows(left, right, detail.view.sort_mode));

    let mut grouped: BTreeMap<(usize, String, String, bool), Vec<NormalizedRow>> = BTreeMap::new();
    for row in rows {
        let mut key = group_key(&row, detail.view.group_mode);
        if detail.view.group_mode != TaskSavedViewGroupMode::BaseDefault {
            key.0 = if key.3 { 1 } else { 0 };
            key.1 = format!("{}:{}", key.2.to_lowercase(), key.1);
        }
        grouped.entry(key).or_default().push(row);
    }
    let groups = grouped
        .into_iter()
        .map(|((_, key, label, _), rows)| TaskSavedViewResultGroup {
            key,
            label,
            items: rows.into_iter().map(|row| row.result).collect(),
        })
        .collect::<Vec<_>>();
    let total_visible_count = groups.iter().map(|group| group.items.len() as u32).sum();
    Ok(TaskSavedViewProjection {
        view: detail.view,
        anchor_local_date: input.anchor_local_date,
        range_start_local_date: range_start,
        range_end_local_date: range_end,
        total_source_count,
        total_visible_count,
        warnings,
        unsupported_reason: None,
        groups,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::focus_plan::dto::CreateFocusPlanInput;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task56_migration::run_all_migrations,
    };
    use crate::tag::dto::MergeTagsInput;
    use crate::task::dto::{
        CreateRecurringTaskInput, CreateTaskInput, OccurrenceEditScope,
        UpdateRecurringOccurrenceInput,
    };

    fn db() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn all(clauses: Vec<TaskSavedViewClause>) -> TaskSavedViewPredicate {
        TaskSavedViewPredicate::All { clauses }
    }

    fn create_input(name: &str, clauses: Vec<TaskSavedViewClause>) -> CreateTaskSavedViewInput {
        CreateTaskSavedViewInput {
            name: name.into(),
            base_scope: TaskSavedViewBaseScope::Today,
            predicate: all(clauses),
            sort_mode: TaskSavedViewSortMode::ScheduledAscending,
            group_mode: TaskSavedViewGroupMode::None,
        }
    }

    fn configured_input(
        name: &str,
        base_scope: TaskSavedViewBaseScope,
        clauses: Vec<TaskSavedViewClause>,
        sort_mode: TaskSavedViewSortMode,
        group_mode: TaskSavedViewGroupMode,
    ) -> CreateTaskSavedViewInput {
        CreateTaskSavedViewInput {
            name: name.into(),
            base_scope,
            predicate: all(clauses),
            sort_mode,
            group_mode,
        }
    }

    fn result_items(projection: &TaskSavedViewProjection) -> Vec<&TaskSavedViewResultItem> {
        projection
            .groups
            .iter()
            .flat_map(|group| group.items.iter())
            .collect()
    }

    fn execute(conn: &Connection, id: &str) -> TaskSavedViewProjection {
        projection(
            conn,
            GetTaskSavedViewProjectionInput {
                view_id: id.into(),
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap()
    }

    fn task(title: &str, priority: &str, tag_ids: Vec<String>) -> CreateTaskInput {
        CreateTaskInput {
            title: title.into(),
            description: String::new(),
            local_date: "2026-08-06".into(),
            start_minute: if title == "Alpha" { 600 } else { 700 },
            end_minute: if title == "Alpha" { 660 } else { 760 },
            category_id: "general".into(),
            priority: priority.into(),
            life_node_id: None,
            focus_plan_id: None,
            deadline_local_date: None,
            tag_ids,
        }
    }

    #[test]
    fn canonical_json_is_deterministic_and_rejects_duplicate_empty_or_over_limit_shapes() {
        let conn = db();
        let catalog = ReferenceCatalog::load(&conn).unwrap();
        let left = all(vec![
            TaskSavedViewClause::PriorityIn {
                values: vec![TaskSavedViewPriority::Low, TaskSavedViewPriority::High],
            },
            TaskSavedViewClause::TaskKindIn {
                values: vec![
                    TaskSavedViewTaskKind::Recurring,
                    TaskSavedViewTaskKind::OneOff,
                ],
            },
        ]);
        let right = all(vec![
            TaskSavedViewClause::TaskKindIn {
                values: vec![
                    TaskSavedViewTaskKind::OneOff,
                    TaskSavedViewTaskKind::Recurring,
                ],
            },
            TaskSavedViewClause::PriorityIn {
                values: vec![TaskSavedViewPriority::High, TaskSavedViewPriority::Low],
            },
        ]);
        let left = canonicalize_predicate(&catalog, left, None).unwrap();
        let right = canonicalize_predicate(&catalog, right, None).unwrap();
        assert_eq!(
            serde_json::to_string(&left).unwrap(),
            serde_json::to_string(&right).unwrap()
        );
        assert!(
            canonicalize_predicate(
                &catalog,
                all(vec![TaskSavedViewClause::PriorityIn { values: vec![] }]),
                None
            )
            .is_err()
        );
        assert!(
            canonicalize_predicate(
                &catalog,
                all(vec![TaskSavedViewClause::CategoryIdIn {
                    ids: (0..13).map(|index| format!("category-{index}")).collect(),
                }]),
                None,
            )
            .is_err()
        );
        assert!(
            canonicalize_predicate(
                &catalog,
                all(vec![
                    TaskSavedViewClause::HasDeadlineIs { value: true },
                    TaskSavedViewClause::HasDeadlineIs { value: false },
                ]),
                None
            )
            .is_err()
        );
        assert!(
            canonicalize_predicate(
                &catalog,
                all((0..13)
                    .map(|index| TaskSavedViewClause::CategoryIdIn {
                        ids: vec![format!("category-{index}")]
                    })
                    .collect()),
                None
            )
            .is_err()
        );
    }

    #[test]
    fn lifecycle_normalizes_names_protects_revisions_and_compacts_order() {
        let mut conn = db();
        let first = create(&mut conn, create_input("  My   Work  ", vec![])).unwrap();
        assert_eq!(first.view.name, "My Work");
        assert!(create(&mut conn, create_input("my work", vec![])).is_err());
        assert!(create(&mut conn, create_input("bad\nname", vec![])).is_err());
        assert!(create(&mut conn, create_input(&"x".repeat(81), vec![])).is_err());
        assert!(
            create(
                &mut conn,
                configured_input(
                    "Identical",
                    TaskSavedViewBaseScope::Today,
                    vec![],
                    TaskSavedViewSortMode::BaseDefault,
                    TaskSavedViewGroupMode::BaseDefault,
                )
            )
            .is_err()
        );
        let second = create(&mut conn, create_input("Second", vec![])).unwrap();
        let third = create(&mut conn, create_input("Third", vec![])).unwrap();
        assert!(
            archive(
                &mut conn,
                MutateTaskSavedViewInput {
                    id: second.view.id.clone(),
                    expected_revision: 99
                }
            )
            .is_err()
        );
        let archived = archive(
            &mut conn,
            MutateTaskSavedViewInput {
                id: second.view.id.clone(),
                expected_revision: second.view.revision,
            },
        )
        .unwrap();
        assert!(archived.view.archived);
        assert_eq!(
            list_active(&conn)
                .unwrap()
                .iter()
                .map(|view| view.position)
                .collect::<Vec<_>>(),
            vec![0, 1]
        );
        let restored = restore(
            &mut conn,
            MutateTaskSavedViewInput {
                id: second.view.id,
                expected_revision: archived.view.revision,
            },
        )
        .unwrap();
        assert_eq!(restored.view.position, 2);
        assert!(
            reorder(
                &mut conn,
                ReorderTaskSavedViewsInput {
                    ordered_ids: vec![first.view.id.clone()]
                }
            )
            .is_err()
        );
        let reordered = reorder(
            &mut conn,
            ReorderTaskSavedViewsInput {
                ordered_ids: vec![third.view.id, restored.view.id, first.view.id],
            },
        )
        .unwrap();
        assert_eq!(
            reordered
                .iter()
                .map(|view| view.position)
                .collect::<Vec<_>>(),
            vec![0, 1, 2]
        );

        let current = get(&conn, &reordered[0].id).unwrap();
        let updated = update(
            &mut conn,
            UpdateTaskSavedViewInput {
                id: current.view.id.clone(),
                expected_revision: current.view.revision,
                name: "Renamed".into(),
                base_scope: current.view.base_scope,
                predicate: current.predicate.unwrap(),
                sort_mode: current.view.sort_mode,
                group_mode: current.view.group_mode,
            },
        )
        .unwrap();
        assert_eq!(updated.view.revision, current.view.revision + 1);
        assert!(
            update(
                &mut conn,
                UpdateTaskSavedViewInput {
                    id: updated.view.id,
                    expected_revision: current.view.revision,
                    name: "Stale".into(),
                    base_scope: updated.view.base_scope,
                    predicate: updated.predicate.unwrap(),
                    sort_mode: updated.view.sort_mode,
                    group_mode: updated.view.group_mode,
                }
            )
            .is_err()
        );
    }

    #[test]
    fn active_limit_applies_to_create_and_restore() {
        let mut conn = db();
        let mut first = None;
        for index in 0..MAX_ACTIVE_VIEWS {
            let view = create(&mut conn, create_input(&format!("View {index}"), vec![])).unwrap();
            first.get_or_insert(view);
        }
        assert!(create(&mut conn, create_input("Overflow", vec![])).is_err());
        let first = first.unwrap();
        let archived = archive(
            &mut conn,
            MutateTaskSavedViewInput {
                id: first.view.id,
                expected_revision: first.view.revision,
            },
        )
        .unwrap();
        create(&mut conn, create_input("Replacement", vec![])).unwrap();
        assert!(
            restore(
                &mut conn,
                MutateTaskSavedViewInput {
                    id: archived.view.id,
                    expected_revision: archived.view.revision,
                }
            )
            .is_err()
        );
    }

    #[test]
    fn malformed_and_unsupported_predicates_stay_visible_but_do_not_execute() {
        let mut conn = db();
        let view = create(&mut conn, create_input("Visible", vec![])).unwrap();
        conn.execute(
            "UPDATE task_saved_views SET predicate_json='not-json' WHERE id=?1",
            params![view.view.id],
        )
        .unwrap();
        let malformed = get(&conn, &view.view.id).unwrap();
        assert_eq!(
            malformed.view.support_state,
            TaskSavedViewSupportState::MalformedPredicate
        );
        assert!(malformed.predicate.is_none());
        conn.execute(
            "UPDATE task_saved_views SET predicate_version=2,predicate_json='{}' WHERE id=?1",
            params![view.view.id],
        )
        .unwrap();
        let unsupported = projection(
            &conn,
            GetTaskSavedViewProjectionInput {
                view_id: view.view.id,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap();
        assert_eq!(
            unsupported.view.support_state,
            TaskSavedViewSupportState::UnsupportedVersion
        );
        assert!(unsupported.groups.is_empty());
    }

    #[test]
    fn unknown_root_fields_are_malformed_recoverable_and_never_execute() {
        let mut conn = db();
        let view = create(&mut conn, create_input("Strict root", vec![])).unwrap();
        conn.execute(
            "UPDATE task_saved_views SET predicate_json=?2 WHERE id=?1",
            params![
                view.view.id,
                r#"{"type":"all","operator":"or","clauses":[]}"#
            ],
        )
        .unwrap();

        let malformed = get(&conn, &view.view.id).unwrap();
        assert_eq!(
            malformed.view.support_state,
            TaskSavedViewSupportState::MalformedPredicate
        );
        assert!(malformed.predicate.is_none());
        assert!(
            malformed
                .unsupported_reason
                .as_deref()
                .is_some_and(|reason| reason.contains("was not executed"))
        );
        assert_eq!(
            list_active(&conn)
                .unwrap()
                .into_iter()
                .find(|candidate| candidate.id == view.view.id)
                .unwrap()
                .support_state,
            TaskSavedViewSupportState::MalformedPredicate
        );
        let projection = execute(&conn, &view.view.id);
        assert_eq!(projection.total_source_count, 0);
        assert!(projection.groups.is_empty());
        assert!(projection.unsupported_reason.is_some());

        let archived = archive(
            &mut conn,
            MutateTaskSavedViewInput {
                id: view.view.id,
                expected_revision: malformed.view.revision,
            },
        )
        .unwrap();
        assert!(archived.view.archived);
    }

    #[test]
    fn unknown_clause_fields_cannot_partially_execute_a_matching_clause() {
        let mut conn = db();
        repository::create(&conn, task("Alpha", "high", vec![])).unwrap();
        let view = create(
            &mut conn,
            create_input(
                "Strict clause",
                vec![TaskSavedViewClause::PriorityIn {
                    values: vec![TaskSavedViewPriority::High],
                }],
            ),
        )
        .unwrap();
        conn.execute(
            "UPDATE task_saved_views SET predicate_json=?2 WHERE id=?1",
            params![
                view.view.id,
                r#"{"type":"all","clauses":[{"kind":"priority_in","values":["high"],"negated":true}]}"#
            ],
        )
        .unwrap();

        let malformed = get(&conn, &view.view.id).unwrap();
        assert_eq!(
            malformed.view.support_state,
            TaskSavedViewSupportState::MalformedPredicate
        );
        assert!(malformed.predicate.is_none());
        let projection = execute(&conn, &view.view.id);
        assert_eq!(projection.total_source_count, 0);
        assert_eq!(projection.total_visible_count, 0);
        assert!(projection.groups.is_empty());
    }

    #[test]
    fn application_canonical_json_remains_supported_and_executable() {
        let mut conn = db();
        repository::create(&conn, task("Alpha", "high", vec![])).unwrap();
        let view = create(
            &mut conn,
            create_input(
                "Canonical round trip",
                vec![TaskSavedViewClause::PriorityIn {
                    values: vec![TaskSavedViewPriority::High],
                }],
            ),
        )
        .unwrap();
        let stored: String = conn
            .query_row(
                "SELECT predicate_json FROM task_saved_views WHERE id=?1",
                params![view.view.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            stored,
            r#"{"type":"all","clauses":[{"kind":"priority_in","values":["high"]}]}"#
        );
        assert!(serde_json::from_str::<TaskSavedViewPredicate>(&stored).is_ok());
        assert!(
            serde_json::from_str::<TaskSavedViewPredicate>(
                r#"{ "clauses": [ { "value": true, "kind": "has_deadline_is" } ], "type": "all" }"#
            )
            .is_ok()
        );
        assert!(
            serde_json::from_str::<TaskSavedViewPredicate>(
                r#"{"type":"all","clauses":[{"kind":"has_deadline_is","value":true,"future_mode":"inherited"}]}"#
            )
            .is_err()
        );
        let detail = get(&conn, &view.view.id).unwrap();
        assert_eq!(
            detail.view.support_state,
            TaskSavedViewSupportState::Supported
        );
        assert!(detail.predicate.is_some());
        assert_eq!(execute(&conn, &view.view.id).total_visible_count, 1);
    }

    #[test]
    fn predicates_apply_and_or_semantics_to_one_off_and_recurring_tags() {
        let mut conn = db();
        let tag = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Study".into(),
            },
        )
        .unwrap();
        repository::create(&conn, task("Alpha", "high", vec![tag.id.clone()])).unwrap();
        repository::create(&conn, task("Beta", "low", vec![])).unwrap();
        repository::create_recurring(
            &mut conn,
            CreateRecurringTaskInput {
                title: "Recurring study".into(),
                description: String::new(),
                local_date: "2026-08-06".into(),
                start_minute: 800,
                end_minute: 860,
                category_id: "general".into(),
                priority: "high".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: Some("2026-08-06".into()),
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                tag_ids: vec![tag.id.clone()],
            },
        )
        .unwrap();
        let view = create(
            &mut conn,
            create_input(
                "Tagged high",
                vec![
                    TaskSavedViewClause::PriorityIn {
                        values: vec![TaskSavedViewPriority::High],
                    },
                    TaskSavedViewClause::TagIdAny { ids: vec![tag.id] },
                ],
            ),
        )
        .unwrap();
        let result = projection(
            &conn,
            GetTaskSavedViewProjectionInput {
                view_id: view.view.id,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap();
        assert_eq!(result.total_source_count, 3);
        assert_eq!(result.total_visible_count, 2);
        assert_eq!(
            result.groups[0]
                .items
                .iter()
                .map(|item| item.kind)
                .collect::<HashSet<_>>(),
            HashSet::from([
                TaskSavedViewTaskKind::OneOff,
                TaskSavedViewTaskKind::Recurring
            ])
        );
    }

    #[test]
    fn missing_reference_warns_and_makes_the_whole_clause_match_nothing() {
        let mut conn = db();
        repository::create(&conn, task("Alpha", "high", vec![])).unwrap();
        let view = create(
            &mut conn,
            create_input(
                "Category",
                vec![TaskSavedViewClause::CategoryIdIn {
                    ids: vec!["general".into()],
                }],
            ),
        )
        .unwrap();
        let missing = all(vec![TaskSavedViewClause::CategoryIdIn {
            ids: vec!["missing-category".into()],
        }]);
        conn.execute(
            "UPDATE task_saved_views SET predicate_json=?2 WHERE id=?1",
            params![view.view.id, serde_json::to_string(&missing).unwrap()],
        )
        .unwrap();
        let result = projection(
            &conn,
            GetTaskSavedViewProjectionInput {
                view_id: view.view.id,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap();
        assert_eq!(result.total_source_count, 1);
        assert_eq!(result.total_visible_count, 0);
        assert_eq!(result.warnings[0].code, "missing_reference");
    }

    #[test]
    fn all_source_scopes_preserve_canonical_membership_and_moved_identity() {
        let mut conn = db();
        for (title, date, minute, deadline) in [
            ("Overdue one-off", "2026-08-05", 500, None),
            ("Today one-off", "2026-08-06", 600, Some("2026-08-07")),
            ("Upcoming one-off", "2026-08-07", 700, None),
        ] {
            let mut input = task(title, "medium", vec![]);
            input.local_date = date.into();
            input.start_minute = minute;
            input.end_minute = minute + 60;
            input.deadline_local_date = deadline.map(str::to_string);
            repository::create(&conn, input).unwrap();
        }
        let series_id = repository::create_recurring(
            &mut conn,
            CreateRecurringTaskInput {
                title: "Moved recurring".into(),
                description: String::new(),
                local_date: "2026-08-05".into(),
                start_minute: 800,
                end_minute: 860,
                category_id: "general".into(),
                priority: "high".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: Some("2026-08-07".into()),
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let occurrence_change =
            |original: &str, replacement: Option<&str>, cancelled| UpdateRecurringOccurrenceInput {
                series_id: series_id.clone(),
                original_local_date: original.into(),
                replacement_local_date: replacement.map(str::to_string),
                title: None,
                description: None,
                category_id: None,
                priority: None,
                start_minute: None,
                end_minute: None,
                scope: OccurrenceEditScope::OnlyThisOccurrence,
                cancelled,
                frequency: None,
                interval: None,
                weekdays: None,
                until: None,
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                series_tag_ids: None,
            };
        repository::update_recurring(
            &mut conn,
            occurrence_change("2026-08-05", Some("2026-08-06"), false),
        )
        .unwrap();
        repository::update_recurring(&mut conn, occurrence_change("2026-08-06", None, true))
            .unwrap();

        for (name, scope) in [
            ("Today source", TaskSavedViewBaseScope::Today),
            ("Upcoming source", TaskSavedViewBaseScope::Upcoming),
            ("Overdue source", TaskSavedViewBaseScope::Overdue),
            ("Deadline source", TaskSavedViewBaseScope::Deadlines),
        ] {
            let saved = create(
                &mut conn,
                configured_input(
                    name,
                    scope,
                    vec![],
                    TaskSavedViewSortMode::BaseDefault,
                    TaskSavedViewGroupMode::None,
                ),
            )
            .unwrap();
            let projected = execute(&conn, &saved.view.id);
            let canonical_count = match scope {
                TaskSavedViewBaseScope::Today => {
                    repository::today_items(&conn, "2026-08-06", "2026-08-06")
                        .unwrap()
                        .len()
                }
                TaskSavedViewBaseScope::Upcoming => {
                    planning::projection(
                        &conn,
                        GetTaskPlanningProjectionInput {
                            mode: TaskPlanningMode::Upcoming,
                            anchor_local_date: "2026-08-06".into(),
                        },
                    )
                    .unwrap()
                    .total_item_count as usize
                }
                TaskSavedViewBaseScope::Overdue => {
                    planning::projection(
                        &conn,
                        GetTaskPlanningProjectionInput {
                            mode: TaskPlanningMode::Overdue,
                            anchor_local_date: "2026-08-06".into(),
                        },
                    )
                    .unwrap()
                    .total_item_count as usize
                }
                TaskSavedViewBaseScope::Deadlines => {
                    deadline::projection(
                        &conn,
                        GetDeadlineQueueInput {
                            anchor_local_date: "2026-08-06".into(),
                        },
                    )
                    .unwrap()
                    .total_item_count as usize
                }
            };
            assert_eq!(
                projected.total_source_count as usize, canonical_count,
                "{name}"
            );
            assert_eq!(
                projected.total_visible_count as usize, canonical_count,
                "{name}"
            );
        }

        let today_view = list_active(&conn).unwrap().remove(0);
        let today = execute(&conn, &today_view.id);
        let moved = result_items(&today)
            .into_iter()
            .find(|item| item.series_id.as_deref() == Some(&series_id))
            .unwrap();
        assert_eq!(moved.original_local_date.as_deref(), Some("2026-08-05"));
        assert_eq!(moved.scheduled_local_date, "2026-08-06");
        assert!(moved.is_override);

        let exact = create(
            &mut conn,
            configured_input(
                "Exact slots",
                TaskSavedViewBaseScope::Today,
                vec![TaskSavedViewClause::HasDeadlineIs { value: true }],
                TaskSavedViewSortMode::BaseDefault,
                TaskSavedViewGroupMode::BaseDefault,
            ),
        )
        .unwrap();
        let exact = execute(&conn, &exact.view.id);
        assert_eq!(exact.groups[0].label, "Morning · 10:00–11:00");
    }

    #[test]
    fn every_predicate_sort_and_group_mode_executes_with_locked_semantics() {
        let mut conn = db();
        conn.execute("INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('study','life-root','Study','','life-leaf','neutral',1,NULL,'0','0',0)", []).unwrap();
        let plan = crate::focus_plan::repository::create(
            &mut conn,
            CreateFocusPlanInput {
                priority: crate::focus_plan::dto::FocusPlanPriority::Normal,
                title: "Plan A".into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: "Outcome".into(),
                success_criteria: vec!["Done".into()],
                initial_variant_label: "Primary".into(),
                operation_id: "saved-view-plan".into(),
            },
        )
        .unwrap();
        let tag = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Study".into(),
            },
        )
        .unwrap();
        let cases = [
            ("Alpha", "high", 600, Some("2026-08-05"), true),
            ("Beta", "low", 700, None, false),
            ("Gamma", "medium", 800, Some("2026-08-06"), false),
            ("Delta", "low", 900, Some("2026-08-10"), false),
        ];
        for (title, priority, minute, deadline, related) in cases {
            let mut input = task(
                title,
                priority,
                if title == "Alpha" {
                    vec![tag.id.clone()]
                } else {
                    vec![]
                },
            );
            input.start_minute = minute;
            input.end_minute = minute + 60;
            input.deadline_local_date = deadline.map(str::to_string);
            if related {
                input.life_node_id = Some("study".into());
                input.focus_plan_id = Some(plan.id.clone());
            }
            repository::create(&conn, input).unwrap();
        }
        repository::create_recurring(
            &mut conn,
            CreateRecurringTaskInput {
                title: "Recurring".into(),
                description: String::new(),
                local_date: "2026-08-06".into(),
                start_minute: 1000,
                end_minute: 1060,
                category_id: "general".into(),
                priority: "high".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: Some("2026-08-06".into()),
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                tag_ids: vec![tag.id.clone()],
            },
        )
        .unwrap();

        let cases = vec![
            (
                "Kind",
                TaskSavedViewClause::TaskKindIn {
                    values: vec![TaskSavedViewTaskKind::Recurring],
                },
                1,
            ),
            (
                "Priority",
                TaskSavedViewClause::PriorityIn {
                    values: vec![TaskSavedViewPriority::High],
                },
                2,
            ),
            (
                "Category",
                TaskSavedViewClause::CategoryIdIn {
                    ids: vec!["general".into()],
                },
                5,
            ),
            (
                "Tag",
                TaskSavedViewClause::TagIdAny {
                    ids: vec![tag.id.clone()],
                },
                2,
            ),
            (
                "Life",
                TaskSavedViewClause::LifeAreaIdIn {
                    ids: vec!["study".into()],
                },
                1,
            ),
            (
                "Plan",
                TaskSavedViewClause::FocusPlanIdIn {
                    ids: vec![plan.id.clone()],
                },
                1,
            ),
            (
                "No deadline",
                TaskSavedViewClause::HasDeadlineIs { value: false },
                2,
            ),
            (
                "Due today",
                TaskSavedViewClause::DeadlineStateIn {
                    values: vec![DeadlineState::DueToday],
                },
                1,
            ),
            (
                "After deadline",
                TaskSavedViewClause::ScheduledAfterDeadlineIs { value: true },
                1,
            ),
        ];
        for (name, clause, count) in cases {
            let view = create(&mut conn, create_input(name, vec![clause])).unwrap();
            assert_eq!(
                execute(&conn, &view.view.id).total_visible_count,
                count,
                "{name}"
            );
        }
        let false_after = create(
            &mut conn,
            create_input(
                "Not after",
                vec![TaskSavedViewClause::ScheduledAfterDeadlineIs { value: false }],
            ),
        )
        .unwrap();
        assert_eq!(execute(&conn, &false_after.view.id).total_visible_count, 2);
        let upcoming_deadline = create(
            &mut conn,
            create_input(
                "Upcoming deadline",
                vec![TaskSavedViewClause::DeadlineStateIn {
                    values: vec![DeadlineState::Upcoming],
                }],
            ),
        )
        .unwrap();
        assert_eq!(
            execute(&conn, &upcoming_deadline.view.id).total_visible_count,
            1
        );
        let combined = create(
            &mut conn,
            create_input(
                "High deadline",
                vec![
                    TaskSavedViewClause::PriorityIn {
                        values: vec![TaskSavedViewPriority::High],
                    },
                    TaskSavedViewClause::HasDeadlineIs { value: true },
                ],
            ),
        )
        .unwrap();
        assert_eq!(execute(&conn, &combined.view.id).total_visible_count, 1);

        for (name, sort, expected) in [
            (
                "Base sort",
                TaskSavedViewSortMode::BaseDefault,
                vec!["Alpha", "Beta", "Gamma", "Delta", "Recurring"],
            ),
            (
                "Scheduled sort",
                TaskSavedViewSortMode::ScheduledAscending,
                vec!["Alpha", "Beta", "Gamma", "Delta", "Recurring"],
            ),
            (
                "Priority sort",
                TaskSavedViewSortMode::PriorityThenScheduled,
                vec!["Alpha", "Recurring", "Gamma", "Beta", "Delta"],
            ),
            (
                "Title sort",
                TaskSavedViewSortMode::TitleAscending,
                vec!["Alpha", "Beta", "Delta", "Gamma", "Recurring"],
            ),
        ] {
            let view = create(
                &mut conn,
                configured_input(
                    name,
                    TaskSavedViewBaseScope::Today,
                    vec![],
                    sort,
                    TaskSavedViewGroupMode::None,
                ),
            )
            .unwrap();
            assert_eq!(
                result_items(&execute(&conn, &view.view.id))
                    .into_iter()
                    .map(|item| item.title.as_str())
                    .collect::<Vec<_>>(),
                expected,
                "{name}"
            );
        }
        for (name, group, expected_labels) in [
            (
                "Native group",
                TaskSavedViewGroupMode::BaseDefault,
                vec![
                    "Morning · 10:00–11:00",
                    "Morning · 11:40–12:40",
                    "Afternoon · 13:20–14:20",
                    "Afternoon · 15:00–16:00",
                    "Afternoon · 16:40–17:40",
                ],
            ),
            ("No group", TaskSavedViewGroupMode::None, vec!["All tasks"]),
            (
                "Category group",
                TaskSavedViewGroupMode::Category,
                vec!["General"],
            ),
            (
                "Life group",
                TaskSavedViewGroupMode::LifeArea,
                vec!["Study", "No Life area"],
            ),
            (
                "Plan group",
                TaskSavedViewGroupMode::FocusPlan,
                vec!["Plan A", "No Focus Plan"],
            ),
        ] {
            let view = create(
                &mut conn,
                configured_input(
                    name,
                    TaskSavedViewBaseScope::Today,
                    vec![],
                    TaskSavedViewSortMode::ScheduledAscending,
                    group,
                ),
            )
            .unwrap();
            assert_eq!(
                execute(&conn, &view.view.id)
                    .groups
                    .into_iter()
                    .map(|group| group.label)
                    .collect::<Vec<_>>(),
                expected_labels,
                "{name}"
            );
        }
    }

    #[test]
    fn archived_references_survive_and_tag_merges_match_the_canonical_target() {
        let mut conn = db();
        conn.execute("INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('study','life-root','Study','','life-leaf','neutral',1,NULL,'0','0',0)", []).unwrap();
        let plan = crate::focus_plan::repository::create(
            &mut conn,
            CreateFocusPlanInput {
                priority: crate::focus_plan::dto::FocusPlanPriority::Normal,
                title: "Plan A".into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: "Outcome".into(),
                success_criteria: vec!["Done".into()],
                initial_variant_label: "Primary".into(),
                operation_id: "refs-plan".into(),
            },
        )
        .unwrap();
        let source = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Alias".into(),
            },
        )
        .unwrap();
        let source_two = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Second alias".into(),
            },
        )
        .unwrap();
        let target = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Canonical".into(),
            },
        )
        .unwrap();
        let mut input = task("Referenced", "high", vec![source.id.clone()]);
        input.life_node_id = Some("study".into());
        input.focus_plan_id = Some(plan.id.clone());
        repository::create(&conn, input).unwrap();
        let alias_view = create(
            &mut conn,
            create_input(
                "Alias view",
                vec![TaskSavedViewClause::TagIdAny {
                    ids: vec![source.id.clone(), source_two.id.clone()],
                }],
            ),
        )
        .unwrap();
        let first_merge = crate::tag::repository::merge(
            &conn,
            MergeTagsInput {
                source_tag_id: source.id.clone(),
                target_tag_id: target.id.clone(),
                source_expected_revision: source.revision,
                target_expected_revision: target.revision,
            },
        )
        .unwrap();
        crate::tag::repository::merge(
            &conn,
            MergeTagsInput {
                source_tag_id: source_two.id.clone(),
                target_tag_id: target.id.clone(),
                source_expected_revision: source_two.revision,
                target_expected_revision: first_merge.target.revision,
            },
        )
        .unwrap();
        let stored_before_projection: String = conn
            .query_row(
                "SELECT predicate_json FROM task_saved_views WHERE id=?1",
                params![alias_view.view.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(execute(&conn, &alias_view.view.id).total_visible_count, 1);
        let stored_after_projection: String = conn
            .query_row(
                "SELECT predicate_json FROM task_saved_views WHERE id=?1",
                params![alias_view.view.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stored_after_projection, stored_before_projection);
        let alias_options = editor_options(
            &conn,
            GetTaskSavedViewEditorOptionsInput {
                view_id: Some(alias_view.view.id.clone()),
            },
        )
        .unwrap();
        for alias in [&source.id, &source_two.id] {
            assert!(alias_options.tags.iter().any(|option| {
                option.id == target.id && option.merged_from_id.as_deref() == Some(alias.as_str())
            }));
        }

        let refs = create(
            &mut conn,
            configured_input(
                "All refs",
                TaskSavedViewBaseScope::Today,
                vec![
                    TaskSavedViewClause::CategoryIdIn {
                        ids: vec!["general".into()],
                    },
                    TaskSavedViewClause::TagIdAny {
                        ids: vec![target.id.clone()],
                    },
                    TaskSavedViewClause::LifeAreaIdIn {
                        ids: vec!["study".into()],
                    },
                    TaskSavedViewClause::FocusPlanIdIn {
                        ids: vec![plan.id.clone()],
                    },
                ],
                TaskSavedViewSortMode::BaseDefault,
                TaskSavedViewGroupMode::None,
            ),
        )
        .unwrap();
        conn.execute(
            "UPDATE task_categories SET archived_at='1' WHERE id='general'",
            [],
        )
        .unwrap();
        conn.execute(
            "UPDATE tags SET archived_at='1' WHERE id=?1",
            params![target.id],
        )
        .unwrap();
        conn.execute("UPDATE life_nodes SET archived_at='1' WHERE id='study'", [])
            .unwrap();
        conn.execute(
            "UPDATE focus_plans SET archived_at='1' WHERE id=?1",
            params![plan.id],
        )
        .unwrap();
        let result = execute(&conn, &refs.view.id);
        assert_eq!(result.total_visible_count, 1);
        assert_eq!(
            result
                .warnings
                .iter()
                .filter(|warning| warning.code == "archived_reference")
                .count(),
            4
        );
        let options = editor_options(
            &conn,
            GetTaskSavedViewEditorOptionsInput {
                view_id: Some(refs.view.id),
            },
        )
        .unwrap();
        assert!(
            options
                .categories
                .iter()
                .any(|option| option.id == "general" && option.archived)
        );
        assert!(
            options
                .tags
                .iter()
                .any(|option| option.id == target.id && option.archived)
        );
        assert!(
            options
                .life_areas
                .iter()
                .any(|option| option.id == "study" && option.archived)
        );
        assert!(
            options
                .focus_plans
                .iter()
                .any(|option| option.id == plan.id && option.archived)
        );
        assert!(
            create(
                &mut conn,
                create_input(
                    "Archived new",
                    vec![TaskSavedViewClause::CategoryIdIn {
                        ids: vec!["general".into()]
                    }]
                )
            )
            .is_err()
        );
    }

    #[test]
    fn typed_but_invalid_or_identical_persisted_filters_never_execute() {
        let mut conn = db();
        repository::create(&conn, task("Alpha", "high", vec![])).unwrap();
        let view = create(&mut conn, create_input("Stored", vec![])).unwrap();
        let duplicate = all(vec![
            TaskSavedViewClause::HasDeadlineIs { value: true },
            TaskSavedViewClause::HasDeadlineIs { value: false },
        ]);
        conn.execute(
            "UPDATE task_saved_views SET predicate_json=?2 WHERE id=?1",
            params![view.view.id, serde_json::to_string(&duplicate).unwrap()],
        )
        .unwrap();
        assert!(execute(&conn, &view.view.id).unsupported_reason.is_some());
        conn.execute("UPDATE task_saved_views SET predicate_json='{\"type\":\"all\",\"clauses\":[]}',sort_mode='base_default',group_mode='base_default' WHERE id=?1", params![view.view.id]).unwrap();
        let identical = execute(&conn, &view.view.id);
        assert!(identical.unsupported_reason.is_some());
        assert_eq!(identical.total_source_count, 0);
    }

    #[test]
    fn projection_errors_instead_of_truncating_above_the_five_thousand_cap() {
        let mut conn = db();
        let view = create(&mut conn, create_input("Bounded", vec![])).unwrap();
        let tx = conn.transaction().unwrap();
        {
            let mut insert = tx.prepare(
                "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
                 VALUES(?1,'2026-08-06',600,660,?1,'','general','medium','1','1')",
            ).unwrap();
            for index in 0..=planning::MAX_PLANNING_ITEMS {
                insert.execute(params![format!("bounded-{index}")]).unwrap();
            }
        }
        tx.commit().unwrap();
        let error = projection(
            &conn,
            GetTaskSavedViewProjectionInput {
                view_id: view.view.id,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap_err();
        assert!(matches!(error, repository::TaskError::Validation(_)));
    }
}
