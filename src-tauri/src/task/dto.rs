use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct TaskCategoryView {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
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
}
#[derive(Debug, Deserialize, Clone)]
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
