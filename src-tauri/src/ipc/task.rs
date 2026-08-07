use crate::infrastructure::sqlite::{DbError, runtime::DatabaseRuntime};
use crate::ipc::error::IpcError;
use crate::task::{
    analytics, calendar,
    dto::{
        AnalyticsProjection, AnalyticsProjectionInput, CompletionStateView, CreateTaskInput,
        EvaluateTaskInput, GetTaskPlanningProjectionInput, MonthProjection, TaskCategoryView,
        TaskEvaluationView, TaskPlanningProjection, TaskView, UndoTaskEvaluationInput,
        UpdateCategoryGoalsInput, UpdateTaskInput,
    },
    evaluation, planning,
    repository::{self, TaskError},
    saved_view,
};
use tauri::State;

fn map_db(e: DbError) -> IpcError {
    match e {
        DbError::Maintenance => IpcError::Validation {
            message: "Database is busy; try again.".into(),
        },
        DbError::SchemaTooNew { .. }
        | DbError::PragmaAssertion { .. }
        | DbError::InvalidMigrationList => IpcError::Corruption,
        _ => IpcError::Storage,
    }
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn update_category_goals(
    state: State<'_, DatabaseRuntime>,
    input: UpdateCategoryGoalsInput,
) -> Result<TaskCategoryView, IpcError> {
    state
        .execute(move |conn| Ok(analytics::update_category_goals(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_analytics_projection(
    state: State<'_, DatabaseRuntime>,
    input: AnalyticsProjectionInput,
) -> Result<AnalyticsProjection, IpcError> {
    state
        .execute(move |conn| Ok(analytics::projection(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}
fn map_task(e: TaskError) -> IpcError {
    match e {
        TaskError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        TaskError::NotFound => IpcError::NotFound,
        TaskError::Conflict => IpcError::Validation {
            message: "This interval overlaps another task.".into(),
        },
        TaskError::Db(_) => IpcError::Storage,
    }
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn list_task_categories(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<TaskCategoryView>, IpcError> {
    state
        .execute(|conn| Ok(repository::categories(conn)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn list_focus_plan_targets(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<crate::task::dto::TaskFocusPlanTargetView>, IpcError> {
    state
        .execute(|conn| Ok(repository::focus_plan_targets(conn)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
pub fn get_related_tasks_for_life_node(
    state: State<'_, DatabaseRuntime>,
    node_id: String,
    anchor_local_date: String,
) -> Result<Vec<crate::task::dto::RelatedTaskView>, IpcError> {
    state
        .execute(move |conn| {
            Ok(repository::related_for_life_node(
                conn,
                &node_id,
                &anchor_local_date,
            ))
        })
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn list_tasks_for_date(
    state: State<'_, DatabaseRuntime>,
    local_date: String,
    observed_local_date: String,
) -> Result<Vec<TaskView>, IpcError> {
    state
        .execute(move |conn| Ok(repository::list(conn, &local_date, &observed_local_date)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_task(
    state: State<'_, DatabaseRuntime>,
    input: CreateTaskInput,
) -> Result<TaskView, IpcError> {
    state
        .execute(move |conn| Ok(repository::create(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn update_task(
    state: State<'_, DatabaseRuntime>,
    input: UpdateTaskInput,
) -> Result<TaskView, IpcError> {
    state
        .execute(move |conn| Ok(repository::update(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
#[tracing::instrument(skip(state, id))]
pub fn delete_task(state: State<'_, DatabaseRuntime>, id: String) -> Result<(), IpcError> {
    state
        .execute(move |conn| Ok(repository::delete(conn, &id)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
pub fn create_recurring_task(
    state: State<'_, DatabaseRuntime>,
    input: crate::task::dto::CreateRecurringTaskInput,
) -> Result<String, IpcError> {
    state
        .execute(move |conn| Ok(repository::create_recurring(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
pub fn list_recurring_occurrences(
    state: State<'_, DatabaseRuntime>,
    local_date: String,
) -> Result<Vec<crate::task::dto::RecurringOccurrenceView>, IpcError> {
    state
        .execute(move |conn| Ok(repository::recurring_for_date(conn, &local_date)))
        .map_err(map_db)?
        .map_err(map_task)
}
#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn list_today_items(
    state: State<'_, DatabaseRuntime>,
    local_date: String,
    observed_local_date: String,
) -> Result<Vec<crate::task::dto::TodayItemView>, IpcError> {
    state
        .execute(move |conn| {
            Ok(repository::today_items(
                conn,
                &local_date,
                &observed_local_date,
            ))
        })
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input), fields(mode = ?input.mode))]
pub fn get_task_planning_projection(
    state: State<'_, DatabaseRuntime>,
    input: GetTaskPlanningProjectionInput,
) -> Result<TaskPlanningProjection, IpcError> {
    state
        .execute(move |conn| Ok(planning::projection(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_deadline_queue(
    state: State<'_, DatabaseRuntime>,
    input: crate::task::deadline::GetDeadlineQueueInput,
) -> Result<crate::task::deadline::DeadlineQueueProjection, IpcError> {
    state
        .execute(move |conn| Ok(crate::task::deadline::projection(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn list_task_saved_views(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<saved_view::TaskSavedViewView>, IpcError> {
    state
        .execute(|conn| Ok(saved_view::list_active(conn)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn list_archived_task_saved_views(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<saved_view::TaskSavedViewView>, IpcError> {
    state
        .execute(|conn| Ok(saved_view::list_archived(conn)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn get_task_saved_view(
    state: State<'_, DatabaseRuntime>,
    id: String,
) -> Result<saved_view::TaskSavedViewDetail, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::get(conn, &id)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn create_task_saved_view(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::CreateTaskSavedViewInput,
) -> Result<saved_view::TaskSavedViewDetail, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::create(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn update_task_saved_view(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::UpdateTaskSavedViewInput,
) -> Result<saved_view::TaskSavedViewDetail, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::update(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn archive_task_saved_view(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::MutateTaskSavedViewInput,
) -> Result<saved_view::TaskSavedViewDetail, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::archive(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn restore_task_saved_view(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::MutateTaskSavedViewInput,
) -> Result<saved_view::TaskSavedViewDetail, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::restore(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn reorder_task_saved_views(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::ReorderTaskSavedViewsInput,
) -> Result<Vec<saved_view::TaskSavedViewView>, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::reorder(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn get_task_saved_view_editor_options(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::GetTaskSavedViewEditorOptionsInput,
) -> Result<saved_view::TaskSavedViewEditorOptions, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::editor_options(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn get_task_saved_view_projection(
    state: State<'_, DatabaseRuntime>,
    input: saved_view::GetTaskSavedViewProjectionInput,
) -> Result<saved_view::TaskSavedViewProjection, IpcError> {
    state
        .execute(move |conn| Ok(saved_view::projection(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, selected_date, today))]
pub fn get_month_projection(
    state: State<'_, DatabaseRuntime>,
    year: i32,
    month: u32,
    selected_date: String,
    today: String,
) -> Result<MonthProjection, IpcError> {
    state
        .execute(move |conn| {
            Ok(calendar::month_projection(
                conn,
                year,
                month,
                &selected_date,
                &today,
            ))
        })
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn list_completion_states(
    state: State<'_, DatabaseRuntime>,
) -> Result<Vec<CompletionStateView>, IpcError> {
    state
        .execute(|conn| Ok(evaluation::list_states(conn)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub fn get_active_task_actual_time(
    state: State<'_, DatabaseRuntime>,
) -> Result<Option<crate::task::dto::ActiveTaskActualTimeView>, IpcError> {
    state
        .execute(|conn| Ok(crate::task::actual_time::active_view(conn)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn start_task_actual_time(
    state: State<'_, DatabaseRuntime>,
    input: crate::task::dto::StartTaskActualTimeInput,
) -> Result<crate::task::dto::TaskActualTimeView, IpcError> {
    state
        .execute(move |conn| {
            Ok(crate::task::actual_time::start(
                conn,
                &input.task_id,
                &input.operation_id,
            ))
        })
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn stop_task_actual_time(
    state: State<'_, DatabaseRuntime>,
    input: crate::task::dto::TaskActualTimeSessionInput,
) -> Result<crate::task::dto::TaskActualTimeView, IpcError> {
    state
        .execute(move |conn| Ok(crate::task::actual_time::stop(conn, &input.session_id)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn discard_task_actual_time(
    state: State<'_, DatabaseRuntime>,
    input: crate::task::dto::TaskActualTimeSessionInput,
) -> Result<crate::task::dto::TaskActualTimeView, IpcError> {
    state
        .execute(move |conn| Ok(crate::task::actual_time::discard(conn, &input.session_id)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn evaluate_task(
    state: State<'_, DatabaseRuntime>,
    input: EvaluateTaskInput,
) -> Result<TaskEvaluationView, IpcError> {
    state
        .execute(move |conn| Ok(evaluation::evaluate(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn undo_task_evaluation(
    state: State<'_, DatabaseRuntime>,
    input: UndoTaskEvaluationInput,
) -> Result<Option<TaskEvaluationView>, IpcError> {
    state
        .execute(move |conn| Ok(evaluation::undo(conn, &input.operation_id)))
        .map_err(map_db)?
        .map_err(map_task)
}

#[tauri::command]
pub fn update_recurring_occurrence(
    state: State<'_, DatabaseRuntime>,
    input: crate::task::dto::UpdateRecurringOccurrenceInput,
) -> Result<(), IpcError> {
    state
        .execute(move |conn| Ok(repository::update_recurring(conn, input)))
        .map_err(map_db)?
        .map_err(map_task)
}
