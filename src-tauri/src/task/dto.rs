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
