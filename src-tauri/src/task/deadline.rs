//! Task 38 deadline queue.
//!
//! This is a deliberately separate projection rather than another `TaskPlanningMode` branch.
//! Planning rows are grouped by *scheduled* day and carry `local_date` and `scheduled_minutes`
//! with schedule meaning. A deadline queue groups by deadline state and must report both dates
//! independently, so reusing those DTOs would make their field names lie.

use std::collections::HashMap;

use chrono::{Duration, NaiveDate};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

use super::{
    domain::{DeadlineState, deadline_state, scheduled_after_deadline, validate_date},
    dto::{TaskFocusPlanView, TaskLifeAreaView},
    planning::{MAX_PLANNING_ITEMS, OVERDUE_DAYS, UPCOMING_DAYS, load_categories},
    repository::{TaskError, focus_plan_map, life_area_map},
};
use crate::tag::dto::TagSummaryView;
use crate::tag::repository as tag_repo;

const TOO_MANY: &str = "This deadline range contains too many tasks. Use Calendar or Search to review a narrower period.";

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct GetDeadlineQueueInput {
    pub anchor_local_date: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DeadlineQueueItemView {
    pub id: String,
    pub title: String,
    pub description: String,
    /// When the work is planned. Distinct from `deadline_local_date` by design.
    pub scheduled_local_date: String,
    pub start_minute: i32,
    pub end_minute: i32,
    pub deadline_local_date: String,
    pub deadline_state: DeadlineState,
    pub scheduled_after_deadline: bool,
    pub category_id: String,
    pub category_name: String,
    pub category_icon_key: String,
    pub category_color_key: String,
    pub priority: String,
    pub life_area: Option<TaskLifeAreaView>,
    pub focus_plan: Option<TaskFocusPlanView>,
    pub tags: Vec<TagSummaryView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DeadlineQueueGroup {
    pub state: DeadlineState,
    pub item_count: u32,
    pub items: Vec<DeadlineQueueItemView>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
pub struct DeadlineQueueProjection {
    pub anchor_local_date: String,
    pub range_start_local_date: String,
    pub range_end_local_date: String,
    pub total_item_count: u32,
    /// Always the three states in fixed order, including empty groups.
    pub groups: Vec<DeadlineQueueGroup>,
}

/// The queue window is inclusive of the anchor day itself, unlike Upcoming and Overdue which
/// deliberately exclude it. Reuses the planning horizons so all three views stay aligned.
pub fn window_for(anchor: &str) -> Result<(String, String), TaskError> {
    if !validate_date(anchor) {
        return Err(TaskError::Validation("Enter a valid anchor date."));
    }
    let date = NaiveDate::parse_from_str(anchor, "%Y-%m-%d")
        .map_err(|_| TaskError::Validation("Enter a valid anchor date."))?;
    let start = date
        .checked_sub_signed(Duration::days(OVERDUE_DAYS))
        .ok_or(TaskError::Validation("Deadline range is out of bounds."))?;
    let end = date
        .checked_add_signed(Duration::days(UPCOMING_DAYS))
        .ok_or(TaskError::Validation("Deadline range is out of bounds."))?;
    Ok((
        start.format("%Y-%m-%d").to_string(),
        end.format("%Y-%m-%d").to_string(),
    ))
}

fn priority_rank(value: &str) -> i32 {
    match value {
        "high" => 0,
        "medium" => 1,
        _ => 2,
    }
}

/// Deterministic across all three groups: deadline ascending puts the oldest overdue first and
/// the nearest upcoming first, and a schedule conflict outranks a clean row on the same day.
fn compare_items(
    left: &DeadlineQueueItemView,
    right: &DeadlineQueueItemView,
) -> std::cmp::Ordering {
    left.deadline_local_date
        .cmp(&right.deadline_local_date)
        .then(
            right
                .scheduled_after_deadline
                .cmp(&left.scheduled_after_deadline),
        )
        .then(priority_rank(&left.priority).cmp(&priority_rank(&right.priority)))
        .then(left.scheduled_local_date.cmp(&right.scheduled_local_date))
        .then(left.start_minute.cmp(&right.start_minute))
        .then(left.title.cmp(&right.title))
        .then(left.id.cmp(&right.id))
}

pub fn projection(
    conn: &Connection,
    input: GetDeadlineQueueInput,
) -> Result<DeadlineQueueProjection, TaskError> {
    let anchor = input.anchor_local_date;
    let (range_start, range_end) = window_for(&anchor)?;
    let categories = load_categories(conn)?;
    let life_areas = life_area_map(conn)?;
    let focus_plans = focus_plan_map(conn)?;

    // Only one-off Tasks are queried at all: recurring work owns no deadline in Task 38.
    // The partial index on `deadline_local_date` serves this bounded range.
    let mut statement = conn.prepare(
        "SELECT t.id,t.title,t.description,t.local_date,t.start_minute,t.end_minute,
                t.deadline_local_date,t.category_id,t.priority,t.life_node_id,t.focus_plan_id
         FROM tasks t
         WHERE t.deadline_local_date IS NOT NULL
           AND t.deadline_local_date BETWEEN ?1 AND ?2
           AND NOT EXISTS(
                 SELECT 1 FROM task_evaluations e
                 WHERE e.subject_kind='one_off' AND e.task_id=t.id AND e.is_current=1
               )",
    )?;
    let rows = statement.query_map(params![range_start, range_end], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, i32>(4)?,
            row.get::<_, i32>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
            row.get::<_, String>(8)?,
            row.get::<_, Option<String>>(9)?,
            row.get::<_, Option<String>>(10)?,
        ))
    })?;

    let mut items: Vec<DeadlineQueueItemView> = Vec::new();
    for row in rows {
        let (
            id,
            title,
            description,
            scheduled_local_date,
            start_minute,
            end_minute,
            deadline_local_date,
            category_id,
            priority,
            life_node_id,
            focus_plan_id,
        ) = row?;
        let category = categories.get(&category_id).ok_or(TaskError::Validation(
            "Task category metadata is unavailable.",
        ))?;
        items.push(DeadlineQueueItemView {
            deadline_state: deadline_state(&deadline_local_date, &anchor),
            scheduled_after_deadline: scheduled_after_deadline(
                &scheduled_local_date,
                &deadline_local_date,
            ),
            id,
            title,
            description,
            scheduled_local_date,
            start_minute,
            end_minute,
            deadline_local_date,
            category_name: category.name.clone(),
            category_icon_key: category.icon.clone(),
            category_color_key: category.color.clone(),
            category_id,
            priority,
            life_area: life_node_id.and_then(|id| life_areas.get(&id).cloned()),
            focus_plan: focus_plan_id.and_then(|id| focus_plans.get(&id).cloned()),
            tags: vec![],
        });
        if items.len() > MAX_PLANNING_ITEMS {
            return Err(TaskError::Validation(TOO_MANY));
        }
    }

    let task_ids: Vec<String> = items.iter().map(|item| item.id.clone()).collect();
    if !task_ids.is_empty() {
        let tag_map = tag_repo::batch_load_task_tags(conn, &task_ids).map_err(TaskError::Db)?;
        for item in &mut items {
            if let Some(tags) = tag_map.get(&item.id) {
                item.tags = tags.clone();
            }
        }
    }

    items.sort_by(compare_items);
    let total_item_count = items.len() as u32;

    let mut grouped: HashMap<&'static str, Vec<DeadlineQueueItemView>> = HashMap::new();
    for item in items {
        grouped
            .entry(item.deadline_state.as_str())
            .or_default()
            .push(item);
    }
    let groups = [
        DeadlineState::Overdue,
        DeadlineState::DueToday,
        DeadlineState::Upcoming,
    ]
    .into_iter()
    .map(|state| {
        let items = grouped.remove(state.as_str()).unwrap_or_default();
        DeadlineQueueGroup {
            state,
            item_count: items.len() as u32,
            items,
        }
    })
    .collect();

    Ok(DeadlineQueueProjection {
        anchor_local_date: anchor,
        range_start_local_date: range_start,
        range_end_local_date: range_end,
        total_item_count,
        groups,
    })
}

/// Task IDs currently eligible for the queue. Used by tests and callers that only need
/// membership, without materialising the full projection.
#[cfg(test)]
pub(crate) fn eligible_ids(
    conn: &Connection,
    anchor: &str,
) -> Result<std::collections::HashSet<String>, TaskError> {
    Ok(projection(
        conn,
        GetDeadlineQueueInput {
            anchor_local_date: anchor.to_string(),
        },
    )?
    .groups
    .into_iter()
    .flat_map(|group| group.items)
    .map(|item| item.id)
    .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task38_migration::run_all_migrations,
    };
    use crate::task::dto::{CreateTaskInput, UpdateTaskInput};
    use crate::task::repository as task_repository;

    fn db() -> Connection {
        let mut c = open_memory_connection().unwrap();
        run_all_migrations(&mut c).unwrap();
        c
    }

    fn task(
        title: &str,
        scheduled: &str,
        start: i32,
        deadline: Option<&str>,
        priority: &str,
    ) -> CreateTaskInput {
        CreateTaskInput {
            title: title.into(),
            description: String::new(),
            local_date: scheduled.into(),
            start_minute: start,
            end_minute: start + 60,
            category_id: "general".into(),
            priority: priority.into(),
            life_node_id: None,
            focus_plan_id: None,
            deadline_local_date: deadline.map(str::to_string),
            tag_ids: vec![],
        }
    }

    fn queue(conn: &Connection, anchor: &str) -> DeadlineQueueProjection {
        projection(
            conn,
            GetDeadlineQueueInput {
                anchor_local_date: anchor.into(),
            },
        )
        .unwrap()
    }

    fn group(view: &DeadlineQueueProjection, state: DeadlineState) -> &DeadlineQueueGroup {
        view.groups
            .iter()
            .find(|group| group.state == state)
            .expect("all three groups are always present")
    }

    fn titles(view: &DeadlineQueueProjection, state: DeadlineState) -> Vec<&str> {
        group(view, state)
            .items
            .iter()
            .map(|item| item.title.as_str())
            .collect()
    }

    #[test]
    fn window_is_inclusive_at_both_edges_and_excludes_one_day_beyond() {
        let c = db();
        let (start, end) = window_for("2026-08-06").unwrap();
        assert_eq!((start.as_str(), end.as_str()), ("2026-07-07", "2026-08-20"));

        task_repository::create(
            &c,
            task(
                "Edge oldest",
                "2026-08-06",
                480,
                Some("2026-07-07"),
                "medium",
            ),
        )
        .unwrap();
        task_repository::create(
            &c,
            task(
                "Edge newest",
                "2026-08-06",
                600,
                Some("2026-08-20"),
                "medium",
            ),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Too old", "2026-08-06", 720, Some("2026-07-06"), "medium"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Too far", "2026-08-06", 840, Some("2026-08-21"), "medium"),
        )
        .unwrap();
        task_repository::create(&c, task("No deadline", "2026-08-06", 960, None, "medium"))
            .unwrap();

        let view = queue(&c, "2026-08-06");
        assert_eq!(view.total_item_count, 2);
        assert_eq!(titles(&view, DeadlineState::Overdue), ["Edge oldest"]);
        assert_eq!(titles(&view, DeadlineState::Upcoming), ["Edge newest"]);
        assert!(group(&view, DeadlineState::DueToday).items.is_empty());
    }

    #[test]
    fn groups_are_always_present_in_fixed_order() {
        let c = db();
        let view = queue(&c, "2026-08-06");
        let states: Vec<DeadlineState> = view.groups.iter().map(|group| group.state).collect();
        assert_eq!(
            states,
            [
                DeadlineState::Overdue,
                DeadlineState::DueToday,
                DeadlineState::Upcoming
            ]
        );
        assert_eq!(view.total_item_count, 0);
    }

    #[test]
    fn overdue_is_oldest_first_and_upcoming_is_nearest_first() {
        let c = db();
        task_repository::create(
            &c,
            task("Older", "2026-08-06", 480, Some("2026-07-20"), "medium"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Newer", "2026-08-06", 600, Some("2026-08-05"), "medium"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Soon", "2026-08-06", 720, Some("2026-08-08"), "medium"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Later", "2026-08-06", 840, Some("2026-08-18"), "medium"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Today", "2026-08-06", 960, Some("2026-08-06"), "medium"),
        )
        .unwrap();

        let view = queue(&c, "2026-08-06");
        assert_eq!(titles(&view, DeadlineState::Overdue), ["Older", "Newer"]);
        assert_eq!(titles(&view, DeadlineState::DueToday), ["Today"]);
        assert_eq!(titles(&view, DeadlineState::Upcoming), ["Soon", "Later"]);
        assert_eq!(view.total_item_count, 5);
    }

    #[test]
    fn ties_break_by_conflict_then_priority_then_schedule() {
        let c = db();
        // All four share one deadline date, so every later tie-breaker is exercised.
        task_repository::create(
            &c,
            task("Clean high", "2026-08-09", 480, Some("2026-08-10"), "high"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Clean low", "2026-08-09", 600, Some("2026-08-10"), "low"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task("Conflict low", "2026-08-11", 720, Some("2026-08-10"), "low"),
        )
        .unwrap();
        task_repository::create(
            &c,
            task(
                "Clean medium",
                "2026-08-09",
                840,
                Some("2026-08-10"),
                "medium",
            ),
        )
        .unwrap();

        let view = queue(&c, "2026-08-06");
        assert_eq!(
            titles(&view, DeadlineState::Upcoming),
            ["Conflict low", "Clean high", "Clean medium", "Clean low"],
            "a scheduled-after-deadline row outranks clean rows on the same deadline"
        );
        let conflicted = &group(&view, DeadlineState::Upcoming).items[0];
        assert!(conflicted.scheduled_after_deadline);
        assert_eq!(conflicted.scheduled_local_date, "2026-08-11");
        assert_eq!(conflicted.deadline_local_date, "2026-08-10");
    }

    #[test]
    fn evaluated_tasks_leave_the_queue_and_undo_restores_them() {
        use crate::task::dto::EvaluateTaskInput;
        use crate::task::evaluation::{self, ObservedLocalTime};

        let mut c = db();
        let created = task_repository::create(
            &c,
            task("Essay", "2026-08-05", 480, Some("2026-08-10"), "medium"),
        )
        .unwrap();
        assert!(
            eligible_ids(&c, "2026-08-06")
                .unwrap()
                .contains(&created.id)
        );

        let state_id: String = c
            .query_row("SELECT id FROM completion_states LIMIT 1", [], |r| r.get(0))
            .unwrap();
        // The clock-injectable entry point; `evaluate` would reject a fixed test date.
        evaluation::evaluate_at(
            &mut c,
            EvaluateTaskInput {
                subject_kind: "one_off".into(),
                task_id: Some(created.id.clone()),
                series_id: None,
                original_local_date: None,
                state_id,
                operation_id: "op-1".into(),
                observed_local_date: "2026-08-06".into(),
                observed_local_minute: 1200,
            },
            ObservedLocalTime {
                date: "2026-08-06".into(),
                minute: 1200,
            },
        )
        .unwrap();

        assert!(
            !eligible_ids(&c, "2026-08-06")
                .unwrap()
                .contains(&created.id),
            "an evaluated Task leaves the active queue"
        );
        let stored: Option<String> = c
            .query_row(
                "SELECT deadline_local_date FROM tasks WHERE id=?1",
                params![created.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            stored.as_deref(),
            Some("2026-08-10"),
            "evaluation must never erase the stored deadline"
        );

        evaluation::undo(&mut c, "op-1").unwrap();
        assert!(
            eligible_ids(&c, "2026-08-06")
                .unwrap()
                .contains(&created.id),
            "undo restores queue eligibility"
        );
    }

    #[test]
    fn recurring_work_never_enters_the_queue() {
        let mut c = db();
        c.execute(
            "INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at) VALUES('series-1','Weekly review','','general','medium',600,660,'2026-08-01','local','FREQ=DAILY;INTERVAL=1','1','1')",
            [],
        )
        .unwrap();
        let view = queue(&c, "2026-08-06");
        assert_eq!(view.total_item_count, 0);
        let _ = &mut c;
    }

    #[test]
    fn queue_projects_life_focus_plan_and_tags_without_per_item_queries() {
        let mut c = db();
        c.execute("INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('study','life-root','Study','','life-leaf','neutral',1,NULL,'0','0',0)", []).unwrap();
        let tx = c.transaction().unwrap();
        tx.execute("INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at) VALUES('plan-1','variant-1','AI Foundations','active','','[]',0,'now','now')", []).unwrap();
        tx.execute("INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at) VALUES('variant-1','plan-1','A','{\"type\":\"doc\",\"content\":[]}','',0,'now','now')", []).unwrap();
        tx.commit().unwrap();

        let mut input = task("Essay", "2026-08-09", 480, Some("2026-08-10"), "medium");
        input.life_node_id = Some("study".into());
        input.focus_plan_id = Some("plan-1".into());
        task_repository::create(&c, input).unwrap();

        let view = queue(&c, "2026-08-06");
        let item = &group(&view, DeadlineState::Upcoming).items[0];
        assert_eq!(item.life_area.as_ref().unwrap().id, "study");
        assert_eq!(item.focus_plan.as_ref().unwrap().title, "AI Foundations");
        assert_eq!(item.category_name, "General");
    }

    #[test]
    fn an_invalid_anchor_is_rejected() {
        let c = db();
        assert!(matches!(
            projection(
                &c,
                GetDeadlineQueueInput {
                    anchor_local_date: "06-08-2026".into()
                }
            ),
            Err(TaskError::Validation(_))
        ));
        assert!(matches!(
            window_for("2026-02-30"),
            Err(TaskError::Validation(_))
        ));
    }

    #[test]
    fn deadline_survives_reschedule_and_is_independent_of_the_schedule() {
        let c = db();
        let created = task_repository::create(
            &c,
            task("Essay", "2026-08-09", 480, Some("2026-08-10"), "medium"),
        )
        .unwrap();
        let deadline = created.deadline.as_ref().unwrap();
        assert_eq!(deadline.deadline_local_date, "2026-08-10");
        assert!(!deadline.scheduled_after_deadline);

        let reschedule = |date: &str, deadline: Option<&str>| UpdateTaskInput {
            id: created.id.clone(),
            title: created.title.clone(),
            description: created.description.clone(),
            local_date: date.into(),
            start_minute: created.start_minute,
            end_minute: created.end_minute,
            category_id: created.category_id.clone(),
            priority: created.priority.clone(),
            life_node_id: None,
            focus_plan_id: None,
            deadline_local_date: deadline.map(str::to_string),
            tag_ids: vec![],
        };

        // Moving the schedule earlier and later never moves the deadline.
        let earlier =
            task_repository::update(&c, reschedule("2026-08-07", Some("2026-08-10"))).unwrap();
        assert_eq!(
            earlier.deadline.as_ref().unwrap().deadline_local_date,
            "2026-08-10"
        );
        let later =
            task_repository::update(&c, reschedule("2026-08-14", Some("2026-08-10"))).unwrap();
        assert_eq!(
            later.deadline.as_ref().unwrap().deadline_local_date,
            "2026-08-10"
        );
        assert!(
            later.deadline.as_ref().unwrap().scheduled_after_deadline,
            "scheduling past the deadline is accepted and flagged, not repaired"
        );
        assert_eq!(
            later.local_date, "2026-08-14",
            "the schedule is preserved too"
        );

        // Clearing the deadline leaves the schedule alone.
        let cleared = task_repository::update(&c, reschedule("2026-08-14", None)).unwrap();
        assert!(cleared.deadline.is_none());
        assert_eq!(cleared.local_date, "2026-08-14");
    }

    #[test]
    fn an_invalid_deadline_is_rejected_on_create_and_update() {
        let c = db();
        assert!(matches!(
            task_repository::create(
                &c,
                task("Bad", "2026-08-09", 480, Some("2026-02-30"), "medium")
            ),
            Err(TaskError::Validation(_))
        ));
        assert!(matches!(
            task_repository::create(
                &c,
                task("Bad", "2026-08-09", 480, Some("10-08-2026"), "medium")
            ),
            Err(TaskError::Validation(_))
        ));
        let created = task_repository::create(
            &c,
            task("Good", "2026-08-09", 480, Some("2026-08-10"), "medium"),
        )
        .unwrap();
        assert!(matches!(
            task_repository::update(
                &c,
                UpdateTaskInput {
                    id: created.id,
                    title: "Good".into(),
                    description: String::new(),
                    local_date: "2026-08-09".into(),
                    start_minute: 480,
                    end_minute: 540,
                    category_id: "general".into(),
                    priority: "medium".into(),
                    life_node_id: None,
                    focus_plan_id: None,
                    deadline_local_date: Some("not-a-date".into()),
                    tag_ids: vec![],
                }
            ),
            Err(TaskError::Validation(_))
        ));
    }

    #[test]
    fn a_deadline_never_participates_in_overlap_detection() {
        let c = db();
        task_repository::create(
            &c,
            task("First", "2026-08-09", 480, Some("2026-08-20"), "medium"),
        )
        .unwrap();
        // Same deadline date, non-overlapping schedule: must be accepted.
        task_repository::create(
            &c,
            task("Second", "2026-08-09", 600, Some("2026-08-20"), "medium"),
        )
        .unwrap();
        // Overlapping schedule still conflicts regardless of deadlines.
        assert!(matches!(
            task_repository::create(
                &c,
                task("Overlap", "2026-08-09", 500, Some("2026-09-01"), "medium")
            ),
            Err(TaskError::Conflict)
        ));
        assert_eq!(queue(&c, "2026-08-06").total_item_count, 2);
    }

    #[test]
    fn a_task_can_sit_in_both_scheduled_overdue_and_the_deadline_queue() {
        use crate::task::dto::{GetTaskPlanningProjectionInput, TaskPlanningMode};
        use crate::task::planning;

        let c = db();
        // Scheduled in the past and unevaluated -> scheduled Overdue.
        // Deadline still ahead -> upcoming deadline. The views answer different questions.
        let created = task_repository::create(
            &c,
            task("Essay", "2026-08-01", 480, Some("2026-08-12"), "medium"),
        )
        .unwrap();

        let overdue = planning::projection(
            &c,
            GetTaskPlanningProjectionInput {
                mode: TaskPlanningMode::Overdue,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap();
        let in_overdue = overdue
            .groups
            .iter()
            .flat_map(|group| group.items.iter())
            .any(|item| item.id == created.id);
        assert!(in_overdue, "missed scheduled work still belongs to Overdue");

        let view = queue(&c, "2026-08-06");
        assert_eq!(titles(&view, DeadlineState::Upcoming), ["Essay"]);
        assert!(
            group(&view, DeadlineState::Overdue).items.is_empty(),
            "a missed schedule must not be reported as a missed deadline"
        );

        // The same identity in both views, so navigation cannot collide.
        let queued = &group(&view, DeadlineState::Upcoming).items[0];
        assert_eq!(queued.id, created.id);
        assert_eq!(queued.scheduled_local_date, "2026-08-01");
    }

    #[test]
    fn scheduled_overdue_keeps_its_meaning_when_no_deadline_exists() {
        use crate::task::dto::{GetTaskPlanningProjectionInput, TaskPlanningMode};
        use crate::task::planning;

        let c = db();
        task_repository::create(&c, task("No deadline", "2026-08-01", 480, None, "medium"))
            .unwrap();
        let overdue = planning::projection(
            &c,
            GetTaskPlanningProjectionInput {
                mode: TaskPlanningMode::Overdue,
                anchor_local_date: "2026-08-06".into(),
            },
        )
        .unwrap();
        assert_eq!(overdue.total_item_count, 1);
        let item = overdue.groups[0].items.first().unwrap();
        assert!(item.deadline.is_none());
        assert_eq!(queue(&c, "2026-08-06").total_item_count, 0);
    }

    #[test]
    fn deadlines_survive_close_and_reopen() {
        let path = std::env::temp_dir().join(format!(
            "lw_task38_deadline_{}_{}.db",
            std::process::id(),
            uuid::Uuid::now_v7()
        ));
        let id;
        {
            let mut conn =
                crate::infrastructure::sqlite::connection::open_file_connection(&path).unwrap();
            run_all_migrations(&mut conn).unwrap();
            id = task_repository::create(
                &conn,
                task("Essay", "2026-08-09", 480, Some("2026-08-12"), "medium"),
            )
            .unwrap()
            .id;
        }
        {
            let mut conn =
                crate::infrastructure::sqlite::connection::open_file_connection(&path).unwrap();
            run_all_migrations(&mut conn).unwrap();
            let view = queue(&conn, "2026-08-06");
            assert_eq!(view.total_item_count, 1);
            let item = &group(&view, DeadlineState::Upcoming).items[0];
            assert_eq!(item.id, id);
            assert_eq!(item.deadline_local_date, "2026-08-12");
            assert_eq!(item.scheduled_local_date, "2026-08-09");
        }
        for suffix in ["", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{suffix}", path.display()));
        }
    }
}
