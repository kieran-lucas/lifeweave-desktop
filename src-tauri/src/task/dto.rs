use serde::{Deserialize, Serialize};

use crate::tag::dto::TagSummaryView;
use crate::task::domain::DeadlineState;

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskCategoryView {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub weekly_minimum_minutes: Option<i32>,
    pub weekly_target_minutes: Option<i32>,
    pub goal_revision: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UpdateCategoryGoalsInput {
    pub category_id: String,
    pub weekly_minimum_minutes: Option<i32>,
    pub weekly_target_minutes: Option<i32>,
    pub expected_revision: i32,
    pub operation_id: String,
    pub observed_local_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum AnalyticsPeriodKind {
    Week,
    Month,
    Year,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct AnalyticsProjectionInput {
    pub period_kind: AnalyticsPeriodKind,
    pub anchor_local_date: String,
    pub observed_local_date: String,
    pub observed_local_minute: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct AnalyticsCategoryView {
    pub category_id: String,
    pub category_name: String,
    pub category_icon_key: String,
    pub category_color_key: String,
    pub scheduled_minutes: i32,
    pub weekly_minimum_minutes: Option<i32>,
    pub weekly_target_minutes: Option<i32>,
    pub minimum_attained_minutes: i32,
    pub target_attained_minutes: i32,
    pub minimum_shortfall_minutes: i32,
    pub target_shortfall_minutes: i32,
    pub minimum_overage_minutes: i32,
    pub target_overage_minutes: i32,
    pub eligible_week_count: i32,
    pub minimum_week_count: i32,
    pub target_week_count: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct AnalyticsCompletionDistributionView {
    pub state_id: String,
    pub label: String,
    pub visual_token: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct AnalyticsStreakView {
    pub category_id: String,
    pub threshold_kind: String,
    pub current_length: i32,
    pub longest_length: i32,
    pub current_start: Option<String>,
    pub longest_start: Option<String>,
    pub last_break_week: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct AnalyticsProjection {
    pub period_kind: AnalyticsPeriodKind,
    pub period_start: String,
    pub period_end: String,
    pub is_complete: bool,
    pub algorithm_version: i32,
    pub computed_at: String,
    pub source_revision: String,
    pub scheduled_minutes: i32,
    pub task_count: i32,
    pub evaluated_count: i32,
    pub missed_count: i32,
    pub categories: Vec<AnalyticsCategoryView>,
    pub completion_distribution: Vec<AnalyticsCompletionDistributionView>,
    pub streaks: Vec<AnalyticsStreakView>,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskView {
    pub id: String,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub title: String,
    pub description: String,
    pub category_id: String,
    pub priority: String,
    pub created_at: String,
    pub updated_at: String,
    pub life_area: Option<TaskLifeAreaView>,
    pub focus_plan: Option<TaskFocusPlanView>,
    pub deadline: Option<TaskDeadlineView>,
    pub tags: Vec<TagSummaryView>,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskLifeAreaView {
    pub id: String,
    pub title: String,
    pub breadcrumb: String,
    pub archived: bool,
}
/// Inherited or direct Focus Plan context for a Task row. Occurrences project this from
/// their authoritative series and never own the relation themselves.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskFocusPlanView {
    pub id: String,
    pub title: String,
    pub archived: bool,
}
/// Deadline context for a one-off Task row. `state` is relative to the observed local date the
/// caller supplied; recurring items never carry this because they own no deadline.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskDeadlineView {
    pub deadline_local_date: String,
    pub state: DeadlineState,
    pub scheduled_after_deadline: bool,
}
/// A Focus Plan that may be newly assigned to a Task or series. Archived Plans are excluded.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskFocusPlanTargetView {
    pub id: String,
    pub title: String,
    pub lifecycle: String,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum RelatedTaskKind {
    OneOff,
    Recurring,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct RelatedTaskView {
    pub id: String,
    pub kind: RelatedTaskKind,
    pub title: String,
    pub group: String,
    pub navigation_local_date: String,
    pub series_id: Option<String>,
    pub tags: Vec<TagSummaryView>,
}
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateTaskInput {
    pub title: String,
    pub description: String,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub category_id: String,
    pub priority: String,
    pub life_node_id: Option<String>,
    pub focus_plan_id: Option<String>,
    pub deadline_local_date: Option<String>,
    pub tag_ids: Vec<String>,
}
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: String,
    pub description: String,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub category_id: String,
    pub priority: String,
    pub life_node_id: Option<String>,
    pub focus_plan_id: Option<String>,
    pub deadline_local_date: Option<String>,
    pub tag_ids: Vec<String>,
}
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct RecurringOccurrenceView {
    pub occurrence_id: String,
    pub series_id: String,
    pub original_local_date: String,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub title: String,
    pub description: String,
    pub category_id: String,
    pub priority: String,
    pub is_recurring: bool,
    pub is_override: bool,
    pub life_area: Option<TaskLifeAreaView>,
    /// Inherited from the authoritative series; occurrences own no relation.
    pub focus_plan: Option<TaskFocusPlanView>,
    pub tags: Vec<TagSummaryView>,
}
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CreateRecurringTaskInput {
    pub title: String,
    pub description: String,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub category_id: String,
    pub priority: String,
    pub frequency: String,
    pub interval: i32,
    pub weekdays: Vec<i32>,
    pub until: Option<String>,
    pub count: Option<i32>,
    pub life_node_id: Option<String>,
    pub focus_plan_id: Option<String>,
    pub tag_ids: Vec<String>,
}
#[derive(Debug, Deserialize, Clone, PartialEq)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum OccurrenceEditScope {
    OnlyThisOccurrence,
    ThisAndFuture,
    EntireSeries,
}
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UpdateRecurringOccurrenceInput {
    pub series_id: String,
    pub original_local_date: String,
    pub replacement_local_date: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub priority: Option<String>,
    pub start_minute: Option<i32>,
    pub end_minute: Option<i32>,
    pub scope: OccurrenceEditScope,
    pub cancelled: bool,
    pub frequency: Option<String>,
    pub interval: Option<i32>,
    pub weekdays: Option<Vec<i32>>,
    pub until: Option<String>,
    pub count: Option<i32>,
    pub life_node_id: Option<String>,
    /// Series-owned Focus Plan relation. Rejected at OnlyThisOccurrence scope when it
    /// differs from the series value; applied to the new series on a ThisAndFuture split.
    pub focus_plan_id: Option<String>,
    /// Only used for EntireSeries scope. Must be None for OnlyThisOccurrence
    /// and ThisAndFuture scopes.
    pub series_tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum TodayItemKind {
    OneOff,
    Recurring,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TodayItemView {
    pub kind: TodayItemKind,
    pub id: String,
    pub occurrence_id: Option<String>,
    pub series_id: Option<String>,
    pub original_local_date: Option<String>,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub title: String,
    pub description: String,
    pub category_id: String,
    pub category_name: String,
    pub category_icon_key: String,
    pub category_color_key: String,
    pub priority: String,
    pub is_override: bool,
    pub evaluation: Option<TaskEvaluationView>,
    pub life_area: Option<TaskLifeAreaView>,
    pub focus_plan: Option<TaskFocusPlanView>,
    pub deadline: Option<TaskDeadlineView>,
    pub tags: Vec<TagSummaryView>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum TaskPlanningMode {
    Upcoming,
    Overdue,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GetTaskPlanningProjectionInput {
    pub mode: TaskPlanningMode,
    pub anchor_local_date: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskPlanningItemView {
    pub kind: TodayItemKind,
    pub id: String,
    pub occurrence_id: Option<String>,
    pub series_id: Option<String>,
    pub original_local_date: Option<String>,
    pub local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub title: String,
    pub description: String,
    pub category_id: String,
    pub category_name: String,
    pub category_icon_key: String,
    pub category_color_key: String,
    pub priority: String,
    pub is_override: bool,
    pub life_area: Option<TaskLifeAreaView>,
    pub focus_plan: Option<TaskFocusPlanView>,
    pub deadline: Option<TaskDeadlineView>,
    pub tags: Vec<TagSummaryView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskPlanningDayGroup {
    pub local_date: String,
    pub scheduled_minutes: i32,
    pub items: Vec<TaskPlanningItemView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskPlanningProjection {
    pub mode: TaskPlanningMode,
    pub algorithm_version: i32,
    pub anchor_local_date: String,
    pub range_start_local_date: String,
    pub range_end_local_date: String,
    pub total_item_count: u32,
    pub scheduled_minutes: i32,
    pub groups: Vec<TaskPlanningDayGroup>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CompletionStateView {
    pub id: String,
    pub internal_key: String,
    pub label: String,
    pub sort_key: i32,
    pub visual_token: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskEvaluationView {
    pub state_id: String,
    pub label: String,
    pub visual_token: String,
    pub evaluated_at: String,
    pub operation_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct EvaluateTaskInput {
    pub subject_kind: String,
    pub task_id: Option<String>,
    pub series_id: Option<String>,
    pub original_local_date: Option<String>,
    pub state_id: String,
    pub operation_id: String,
    pub observed_local_date: String,
    pub observed_local_minute: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct UndoTaskEvaluationInput {
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct CalendarDayProjection {
    pub date: String,
    pub is_today: bool,
    pub is_selected: bool,
    pub task_count: i32,
    pub scheduled_minutes: i32,
    pub category_icon_keys: Vec<String>,
    pub extra_category_count: i32,
    pub morning_load_ratio: f64,
    pub afternoon_load_ratio: f64,
    pub evening_load_ratio: f64,
    pub has_missed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct MonthProjection {
    pub month: String,
    pub algorithm_version: i32,
    pub days: Vec<CalendarDayProjection>,
}
