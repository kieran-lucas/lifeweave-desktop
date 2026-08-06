use std::collections::{BTreeMap, HashMap, HashSet};

use chrono::{Duration, NaiveDate};
use rusqlite::{Connection, params};

use super::{
    domain::validate_date,
    dto::{
        GetTaskPlanningProjectionInput, TaskFocusPlanView, TaskLifeAreaView, TaskPlanningDayGroup,
        TaskPlanningItemView, TaskPlanningMode, TaskPlanningProjection, TodayItemKind,
    },
    recurrence::{MAX_EXPANSION_OCCURRENCES, occurrences_between},
    repository::{TaskError, deadline_view, focus_plan_map, life_area_map},
};

pub const UPCOMING_DAYS: i64 = 14;
pub const OVERDUE_DAYS: i64 = 30;
pub const MAX_PLANNING_ITEMS: usize = 5_000;
pub const PLANNING_ALGORITHM_VERSION: i32 = 1;
const TOO_MANY: &str =
    "This planning range contains too many tasks. Use Calendar to review a narrower period.";

#[derive(Clone)]
pub(crate) struct Category {
    pub name: String,
    pub icon: String,
    pub color: String,
}

#[derive(Clone)]
struct Series {
    id: String,
    title: String,
    description: String,
    category_id: String,
    priority: String,
    start_minute: i32,
    end_minute: i32,
    dtstart: String,
    rule: String,
    life_node_id: Option<String>,
    focus_plan_id: Option<String>,
}

#[derive(Clone)]
struct Override {
    original: String,
    replacement: Option<String>,
    title: Option<String>,
    description: Option<String>,
    category_id: Option<String>,
    priority: Option<String>,
    start_minute: Option<i32>,
    end_minute: Option<i32>,
    cancelled: bool,
}

pub fn range_for(mode: TaskPlanningMode, anchor: &str) -> Result<(String, String), TaskError> {
    if !validate_date(anchor) {
        return Err(TaskError::Validation("Enter a valid anchor date."));
    }
    let date = NaiveDate::parse_from_str(anchor, "%Y-%m-%d")
        .map_err(|_| TaskError::Validation("Enter a valid anchor date."))?;
    let (start, end) = match mode {
        TaskPlanningMode::Upcoming => (
            date.checked_add_signed(Duration::days(1)),
            date.checked_add_signed(Duration::days(UPCOMING_DAYS)),
        ),
        TaskPlanningMode::Overdue => (
            date.checked_sub_signed(Duration::days(OVERDUE_DAYS)),
            date.checked_sub_signed(Duration::days(1)),
        ),
    };
    let start = start.ok_or(TaskError::Validation(
        "Planning date range is out of bounds.",
    ))?;
    let end = end.ok_or(TaskError::Validation(
        "Planning date range is out of bounds.",
    ))?;
    Ok((
        start.format("%Y-%m-%d").to_string(),
        end.format("%Y-%m-%d").to_string(),
    ))
}

pub fn projection(
    conn: &Connection,
    input: GetTaskPlanningProjectionInput,
) -> Result<TaskPlanningProjection, TaskError> {
    let mode = input.mode;
    let (range_start, range_end) = range_for(mode, &input.anchor_local_date)?;
    let life_areas = life_area_map(conn)?;
    let focus_plans = focus_plan_map(conn)?;
    let categories = load_categories(conn)?;
    let row_context = RowContext {
        categories: &categories,
        life_areas: &life_areas,
        focus_plans: &focus_plans,
        observed_local_date: &input.anchor_local_date,
    };
    let mut items = load_one_offs(conn, mode, &range_start, &range_end, &row_context)?;
    if items.len() > MAX_PLANNING_ITEMS {
        return Err(TaskError::Validation(TOO_MANY));
    }

    let series = load_series(conn, &range_end)?;
    let overrides = load_overrides(conn, &range_start, &range_end)?;
    let evaluations = if mode == TaskPlanningMode::Overdue {
        load_recurring_evaluations(conn, &range_start, &range_end)?
    } else {
        HashSet::new()
    };

    for source in series {
        let source_overrides = overrides.get(&source.id);
        let mut candidates: HashMap<String, (String, Option<&Override>)> = HashMap::new();
        for original in occurrences_between(
            &source.dtstart,
            &range_start,
            &range_end,
            &source.rule,
            MAX_EXPANSION_OCCURRENCES,
        )? {
            let occurrence_override = source_overrides.and_then(|values| values.get(&original));
            match occurrence_override {
                Some(value) if value.cancelled => {}
                Some(value) if value.replacement.is_some() => {
                    let displayed = value.replacement.as_ref().expect("checked");
                    if displayed >= &range_start && displayed <= &range_end {
                        candidates.insert(original, (displayed.clone(), Some(value)));
                    }
                }
                Some(value) => {
                    candidates.insert(original.clone(), (original, Some(value)));
                }
                None => {
                    candidates.insert(original.clone(), (original, None));
                }
            }
        }
        if let Some(values) = source_overrides {
            for value in values.values() {
                if value.cancelled {
                    continue;
                }
                if let Some(displayed) = value.replacement.as_ref() {
                    if displayed >= &range_start && displayed <= &range_end {
                        candidates.insert(value.original.clone(), (displayed.clone(), Some(value)));
                    }
                }
            }
        }
        for (original, (displayed, occurrence_override)) in candidates {
            if mode == TaskPlanningMode::Overdue
                && evaluations.contains(&(source.id.clone(), original.clone()))
            {
                continue;
            }
            let category_id = occurrence_override
                .and_then(|value| value.category_id.clone())
                .unwrap_or_else(|| source.category_id.clone());
            let category = categories.get(&category_id).ok_or(TaskError::Validation(
                "Task category metadata is unavailable.",
            ))?;
            let identity = format!("{}:{}", source.id, original);
            items.push(TaskPlanningItemView {
                kind: TodayItemKind::Recurring,
                id: identity.clone(),
                occurrence_id: Some(identity),
                series_id: Some(source.id.clone()),
                original_local_date: Some(original),
                local_date: displayed,
                start_minute: occurrence_override
                    .and_then(|value| value.start_minute)
                    .unwrap_or(source.start_minute),
                end_minute: occurrence_override
                    .and_then(|value| value.end_minute)
                    .unwrap_or(source.end_minute),
                title: occurrence_override
                    .and_then(|value| value.title.clone())
                    .unwrap_or_else(|| source.title.clone()),
                description: occurrence_override
                    .and_then(|value| value.description.clone())
                    .unwrap_or_else(|| source.description.clone()),
                category_id,
                category_name: category.name.clone(),
                category_icon_key: category.icon.clone(),
                category_color_key: category.color.clone(),
                priority: occurrence_override
                    .and_then(|value| value.priority.clone())
                    .unwrap_or_else(|| source.priority.clone()),
                is_override: occurrence_override.is_some(),
                life_area: source
                    .life_node_id
                    .as_ref()
                    .and_then(|id| life_areas.get(id).cloned()),
                focus_plan: source
                    .focus_plan_id
                    .as_ref()
                    .and_then(|id| focus_plans.get(id).cloned()),
                // Recurring work owns no deadline in Task 38.
                deadline: None,
                tags: vec![],
            });
            if items.len() > MAX_PLANNING_ITEMS {
                return Err(TaskError::Validation(TOO_MANY));
            }
        }
    }

    items.sort_by(compare_items);
    let mut grouped: BTreeMap<String, Vec<TaskPlanningItemView>> = BTreeMap::new();
    for item in items {
        grouped
            .entry(item.local_date.clone())
            .or_default()
            .push(item);
    }
    let mut groups = grouped
        .into_iter()
        .map(|(local_date, items)| TaskPlanningDayGroup {
            scheduled_minutes: items
                .iter()
                .map(|item| item.end_minute - item.start_minute)
                .sum(),
            local_date,
            items,
        })
        .collect::<Vec<_>>();
    if mode == TaskPlanningMode::Overdue {
        groups.reverse();
    }
    let total_item_count = groups.iter().map(|group| group.items.len() as u32).sum();
    let scheduled_minutes = groups.iter().map(|group| group.scheduled_minutes).sum();
    Ok(TaskPlanningProjection {
        mode,
        algorithm_version: PLANNING_ALGORITHM_VERSION,
        anchor_local_date: input.anchor_local_date,
        range_start_local_date: range_start,
        range_end_local_date: range_end,
        total_item_count,
        scheduled_minutes,
        groups,
    })
}

pub(crate) fn load_categories(conn: &Connection) -> Result<HashMap<String, Category>, TaskError> {
    let mut statement = conn.prepare("SELECT id,name,icon_key,color_key FROM task_categories")?;
    let mut categories = HashMap::new();
    for row in statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            Category {
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
            },
        ))
    })? {
        let (id, category) = row?;
        categories.insert(id, category);
    }
    Ok(categories)
}

/// Batched lookups plus the observed date, shared by every row this projection decorates.
struct RowContext<'a> {
    categories: &'a HashMap<String, Category>,
    life_areas: &'a HashMap<String, TaskLifeAreaView>,
    focus_plans: &'a HashMap<String, TaskFocusPlanView>,
    observed_local_date: &'a str,
}

fn load_one_offs(
    conn: &Connection,
    mode: TaskPlanningMode,
    start: &str,
    end: &str,
    context: &RowContext<'_>,
) -> Result<Vec<TaskPlanningItemView>, TaskError> {
    let RowContext {
        categories,
        life_areas,
        focus_plans,
        observed_local_date,
    } = *context;
    let mut statement = conn.prepare(
        "SELECT t.id,t.local_date,t.start_minute,t.end_minute,t.title,t.description,t.category_id,t.priority,t.life_node_id,t.focus_plan_id,t.deadline_local_date,
                EXISTS(SELECT 1 FROM task_evaluations e WHERE e.subject_kind='one_off' AND e.task_id=t.id AND e.is_current=1)
         FROM tasks t WHERE t.local_date BETWEEN ?1 AND ?2",
    )?;
    let rows = statement.query_map(params![start, end], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i32>(2)?,
            row.get::<_, i32>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
            row.get::<_, Option<String>>(8)?,
            row.get::<_, Option<String>>(9)?,
            row.get::<_, Option<String>>(10)?,
            row.get::<_, bool>(11)?,
        ))
    })?;
    let mut items = Vec::new();
    for row in rows {
        let (
            id,
            local_date,
            start_minute,
            end_minute,
            title,
            description,
            category_id,
            priority,
            life_node_id,
            focus_plan_id,
            deadline_local_date,
            evaluated,
        ) = row?;
        if mode == TaskPlanningMode::Overdue && evaluated {
            continue;
        }
        let category = categories.get(&category_id).ok_or(TaskError::Validation(
            "Task category metadata is unavailable.",
        ))?;
        let deadline = deadline_view(deadline_local_date, &local_date, observed_local_date);
        items.push(TaskPlanningItemView {
            kind: TodayItemKind::OneOff,
            id,
            occurrence_id: None,
            series_id: None,
            original_local_date: None,
            local_date,
            start_minute,
            end_minute,
            title,
            description,
            category_id,
            category_name: category.name.clone(),
            category_icon_key: category.icon.clone(),
            category_color_key: category.color.clone(),
            priority,
            is_override: false,
            life_area: life_node_id
                .as_ref()
                .and_then(|id| life_areas.get(id).cloned()),
            focus_plan: focus_plan_id
                .as_ref()
                .and_then(|id| focus_plans.get(id).cloned()),
            deadline,
            tags: vec![],
        });
    }
    Ok(items)
}

fn load_series(conn: &Connection, range_end: &str) -> Result<Vec<Series>, TaskError> {
    let mut statement = conn.prepare(
        "SELECT id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,rrule,life_node_id,focus_plan_id
         FROM task_series WHERE archived_at IS NULL AND dtstart_local_date<=?1",
    )?;
    Ok(statement
        .query_map(params![range_end], |row| {
            Ok(Series {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                category_id: row.get(3)?,
                priority: row.get(4)?,
                start_minute: row.get(5)?,
                end_minute: row.get(6)?,
                dtstart: row.get(7)?,
                rule: row.get(8)?,
                life_node_id: row.get(9)?,
                focus_plan_id: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}

fn load_overrides(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<HashMap<String, HashMap<String, Override>>, TaskError> {
    let mut statement = conn.prepare(
        "SELECT o.series_id,o.original_local_date,o.replacement_local_date,o.title_override,o.description_override,
                o.category_id_override,o.priority_override,o.start_minute_override,o.end_minute_override,o.cancelled
         FROM task_occurrence_overrides o JOIN task_series s ON s.id=o.series_id
         WHERE s.archived_at IS NULL AND (o.original_local_date BETWEEN ?1 AND ?2 OR o.replacement_local_date BETWEEN ?1 AND ?2)",
    )?;
    let mut values: HashMap<String, HashMap<String, Override>> = HashMap::new();
    for row in statement.query_map(params![start, end], |row| {
        Ok((
            row.get::<_, String>(0)?,
            Override {
                original: row.get(1)?,
                replacement: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                category_id: row.get(5)?,
                priority: row.get(6)?,
                start_minute: row.get(7)?,
                end_minute: row.get(8)?,
                cancelled: row.get::<_, i32>(9)? != 0,
            },
        ))
    })? {
        let (series_id, value) = row?;
        values
            .entry(series_id)
            .or_default()
            .insert(value.original.clone(), value);
    }
    Ok(values)
}

fn load_recurring_evaluations(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<HashSet<(String, String)>, TaskError> {
    let mut statement = conn.prepare(
        "SELECT e.series_id,e.original_local_date FROM task_evaluations e
         LEFT JOIN task_occurrence_overrides o ON o.series_id=e.series_id AND o.original_local_date=e.original_local_date
         WHERE e.subject_kind='recurring' AND e.is_current=1
           AND (e.original_local_date BETWEEN ?1 AND ?2 OR o.replacement_local_date BETWEEN ?1 AND ?2)",
    )?;
    Ok(statement
        .query_map(params![start, end], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<HashSet<_>, _>>()?)
}

fn compare_items(left: &TaskPlanningItemView, right: &TaskPlanningItemView) -> std::cmp::Ordering {
    fn priority(value: &str) -> i32 {
        match value {
            "high" => 0,
            "medium" => 1,
            _ => 2,
        }
    }
    fn kind(value: &TodayItemKind) -> i32 {
        match value {
            TodayItemKind::OneOff => 0,
            TodayItemKind::Recurring => 1,
        }
    }
    left.local_date
        .cmp(&right.local_date)
        .then(left.start_minute.cmp(&right.start_minute))
        .then(left.end_minute.cmp(&right.end_minute))
        .then(priority(&left.priority).cmp(&priority(&right.priority)))
        .then(left.title.cmp(&right.title))
        .then(kind(&left.kind).cmp(&kind(&right.kind)))
        .then(left.id.cmp(&right.id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task39_migration::run_all_migrations as run_migrations,
    };

    fn db() -> Connection {
        let mut connection = open_memory_connection().unwrap();
        run_migrations(&mut connection).unwrap();
        connection
    }

    #[test]
    fn derives_exact_fixed_ranges_across_boundaries() {
        assert_eq!(
            range_for(TaskPlanningMode::Upcoming, "2026-08-04").unwrap(),
            ("2026-08-05".into(), "2026-08-18".into())
        );
        assert_eq!(
            range_for(TaskPlanningMode::Overdue, "2026-08-04").unwrap(),
            ("2026-07-05".into(), "2026-08-03".into())
        );
        assert_eq!(
            range_for(TaskPlanningMode::Upcoming, "2024-02-28")
                .unwrap()
                .0,
            "2024-02-29"
        );
        assert_eq!(
            range_for(TaskPlanningMode::Overdue, "2026-01-01")
                .unwrap()
                .1,
            "2025-12-31"
        );
        assert!(range_for(TaskPlanningMode::Upcoming, "bad").is_err());
    }

    #[test]
    fn projects_one_off_windows_and_any_current_evaluation_reviews_overdue() {
        let connection = db();
        connection.execute_batch(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES('tomorrow','2026-08-05',480,540,'Tomorrow','','general','high','0','0'),
                   ('boundary','2026-08-18',600,660,'Boundary','','general','low','0','0'),
                   ('past','2026-08-03',700,760,'Past','','general','medium','0','0'),
                   ('reviewed','2026-08-02',800,860,'Reviewed','','general','medium','0','0');
             INSERT INTO task_evaluations(id,subject_kind,task_id,series_id,original_local_date,state_id,state_label_snapshot,state_value_bp_snapshot,state_visual_snapshot,evaluated_at,operation_id,is_current)
             VALUES('eval','one_off','reviewed',NULL,NULL,'completion-none','Not done',0,'none','0','operation-review',1);"
        ).unwrap();
        let upcoming = projection(
            &connection,
            GetTaskPlanningProjectionInput {
                mode: TaskPlanningMode::Upcoming,
                anchor_local_date: "2026-08-04".into(),
            },
        )
        .unwrap();
        assert_eq!(upcoming.total_item_count, 2);
        let overdue = projection(
            &connection,
            GetTaskPlanningProjectionInput {
                mode: TaskPlanningMode::Overdue,
                anchor_local_date: "2026-08-04".into(),
            },
        )
        .unwrap();
        assert_eq!(overdue.total_item_count, 1);
        assert_eq!(overdue.groups[0].items[0].id, "past");
    }

    #[test]
    fn recurring_projection_respects_cancel_move_evaluation_archive_and_identity() {
        let connection = db();
        connection.execute_batch(
            "INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at,archived_at)
             VALUES('series','Daily','','general','medium',480,540,'2026-08-01','local','FREQ=DAILY;COUNT=10','0','0',NULL),
                   ('archived','Archived','','general','medium',480,540,'2026-08-01','local','FREQ=DAILY','0','0','1');
             INSERT INTO task_occurrence_overrides(id,series_id,original_local_date,replacement_local_date,title_override,cancelled,created_at,updated_at)
             VALUES('cancel','series','2026-08-03',NULL,NULL,1,'0','0'),
                   ('move','series','2026-08-01','2026-08-05','Moved',0,'0','0');
             INSERT INTO task_evaluations(id,subject_kind,task_id,series_id,original_local_date,state_id,state_label_snapshot,state_value_bp_snapshot,state_visual_snapshot,evaluated_at,operation_id,is_current)
             VALUES('eval','recurring',NULL,'series','2026-08-02','completion-met','Met expectation',7500,'met','0','operation-recurring',1);"
        ).unwrap();
        let overdue = projection(
            &connection,
            GetTaskPlanningProjectionInput {
                mode: TaskPlanningMode::Overdue,
                anchor_local_date: "2026-08-04".into(),
            },
        )
        .unwrap();
        assert_eq!(overdue.total_item_count, 0);
        let upcoming = projection(
            &connection,
            GetTaskPlanningProjectionInput {
                mode: TaskPlanningMode::Upcoming,
                anchor_local_date: "2026-08-04".into(),
            },
        )
        .unwrap();
        let moved = upcoming
            .groups
            .iter()
            .flat_map(|group| &group.items)
            .find(|item| item.original_local_date.as_deref() == Some("2026-08-01"))
            .unwrap();
        assert_eq!(moved.local_date, "2026-08-05");
        assert_eq!(moved.id, "series:2026-08-01");
        assert!(moved.is_override);
        assert!(
            upcoming
                .groups
                .iter()
                .flat_map(|group| &group.items)
                .all(|item| item.series_id.as_deref() != Some("archived"))
        );
    }

    #[test]
    fn item_cap_accepts_five_thousand_and_rejects_five_thousand_one_without_truncation() {
        let mut connection = db();
        let tx = connection.transaction().unwrap();
        {
            let mut statement = tx.prepare(
                "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
                 VALUES(?1,'2026-08-05',480,540,?2,'','general','medium','0','0')",
            ).unwrap();
            for index in 0..5_000 {
                statement
                    .execute(params![format!("cap-{index}"), format!("Task {index}")])
                    .unwrap();
            }
        }
        tx.commit().unwrap();
        let input = || GetTaskPlanningProjectionInput {
            mode: TaskPlanningMode::Upcoming,
            anchor_local_date: "2026-08-04".into(),
        };
        assert_eq!(
            projection(&connection, input()).unwrap().total_item_count,
            5_000
        );
        connection.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES('cap-5000','2026-08-05',480,540,'Overflow','','general','medium','0','0')",
            [],
        ).unwrap();
        assert!(matches!(
            projection(&connection, input()),
            Err(TaskError::Validation(TOO_MANY))
        ));
    }

    #[test]
    #[ignore = "release-mode Task 32 planning performance evidence"]
    fn planning_release_performance_evidence() {
        use std::time::Instant;
        let mut connection = db();
        for index in 1..10 {
            connection.execute(
                "INSERT INTO task_categories(id,name,icon_key,color_key,archived_at) VALUES(?1,?2,'category-general','blue',NULL)",
                params![format!("category-{index}"), format!("Category {index}")],
            ).unwrap();
        }
        for index in 0..100 {
            connection.execute(
                "INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision)
                 VALUES(?1,'life-root',?2,'','life-leaf','neutral',?3,NULL,'0','0',0)",
                params![format!("planning-life-{index}"), format!("Area {index}"), index],
            ).unwrap();
        }
        let base = NaiveDate::from_ymd_opt(2026, 7, 5).unwrap();
        let tx = connection.transaction().unwrap();
        {
            let mut task = tx.prepare(
                "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,life_node_id)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'0','0',?9)"
            ).unwrap();
            for index in 0..5_000 {
                let date = base + Duration::days((index % 60) as i64);
                task.execute(params![
                    format!("planning-task-{index}"),
                    date.format("%Y-%m-%d").to_string(),
                    240 + (index % 1_100) as i32,
                    241 + (index % 1_100) as i32,
                    format!("Task {index}"),
                    "x".repeat(index % 200),
                    if index % 10 == 0 {
                        "general".to_string()
                    } else {
                        format!("category-{}", index % 10)
                    },
                    ["high", "medium", "low"][index % 3],
                    format!("planning-life-{}", index % 100),
                ])
                .unwrap();
            }
        }
        {
            let mut series = tx.prepare(
                "INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at,archived_at,life_node_id)
                 VALUES(?1,?2,'','general','medium',600,660,'2026-07-01','local',?3,'0','0',NULL,?4)"
            ).unwrap();
            let mut occurrence_override = tx.prepare(
                "INSERT INTO task_occurrence_overrides(id,series_id,original_local_date,replacement_local_date,cancelled,created_at,updated_at)
                 VALUES(?1,?2,?3,?4,?5,'0','0')"
            ).unwrap();
            for index in 0..500 {
                let series_id = format!("planning-series-{index}");
                series
                    .execute(params![
                        series_id,
                        format!("Series {index}"),
                        format!(
                            "FREQ=WEEKLY;BYDAY={}",
                            ["MO", "TU", "WE", "TH", "FR"][index % 5]
                        ),
                        format!("planning-life-{}", index % 100)
                    ])
                    .unwrap();
                occurrence_override
                    .execute(params![
                        format!("planning-cancel-{index}"),
                        series_id,
                        "2026-08-03",
                        Option::<String>::None,
                        1
                    ])
                    .unwrap();
                occurrence_override
                    .execute(params![
                        format!("planning-move-{index}"),
                        series_id,
                        "2026-08-20",
                        "2026-08-10",
                        0
                    ])
                    .unwrap();
            }
        }
        {
            let mut evaluation = tx.prepare(
                "INSERT INTO task_evaluations(id,subject_kind,task_id,series_id,original_local_date,state_id,state_label_snapshot,state_value_bp_snapshot,state_visual_snapshot,evaluated_at,operation_id,is_current)
                 VALUES(?1,'one_off',?2,NULL,NULL,'completion-none','Not done',0,'none','0',?3,1)"
            ).unwrap();
            for index in 0..2_500 {
                evaluation
                    .execute(params![
                        format!("planning-eval-{index}"),
                        format!("planning-task-{index}"),
                        format!("planning-operation-{index}")
                    ])
                    .unwrap();
            }
        }
        tx.commit().unwrap();
        let mut upcoming = Vec::new();
        let mut overdue = Vec::new();
        let mut upcoming_count = 0;
        let mut overdue_count = 0;
        for _ in 0..20 {
            let started = Instant::now();
            let result = projection(
                &connection,
                GetTaskPlanningProjectionInput {
                    mode: TaskPlanningMode::Upcoming,
                    anchor_local_date: "2026-08-04".into(),
                },
            )
            .unwrap();
            upcoming.push(started.elapsed().as_secs_f64() * 1_000.0);
            upcoming_count = result.total_item_count;
            let started = Instant::now();
            let result = projection(
                &connection,
                GetTaskPlanningProjectionInput {
                    mode: TaskPlanningMode::Overdue,
                    anchor_local_date: "2026-08-04".into(),
                },
            )
            .unwrap();
            overdue.push(started.elapsed().as_secs_f64() * 1_000.0);
            overdue_count = result.total_item_count;
        }
        upcoming.sort_by(f64::total_cmp);
        overdue.sort_by(f64::total_cmp);
        let p95 = |values: &[f64]| {
            values[((values.len() as f64 * 0.95).ceil() as usize).saturating_sub(1)]
        };
        println!(
            "planning performance: 5000 one-off, 500 series, 1000 overrides, 2500 evaluations, 100 Life nodes, 10 categories; upcoming p95={:.2}ms items={}; overdue p95={:.2}ms items={}; peak-memory observation unavailable",
            p95(&upcoming),
            upcoming_count,
            p95(&overdue),
            overdue_count
        );
        assert!(p95(&upcoming) <= 100.0, "Upcoming p95 exceeded 100 ms");
        assert!(p95(&overdue) <= 150.0, "Overdue p95 exceeded 150 ms");
    }
}
