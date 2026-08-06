use std::collections::{HashMap, HashSet};

use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{Connection, params};

use super::{
    domain::validate_date,
    dto::{CalendarDayProjection, MonthProjection},
    recurrence,
    repository::TaskError,
};

pub const ALGORITHM_VERSION: i32 = 1;
const MORNING: (i32, i32) = (240, 720);
const AFTERNOON: (i32, i32) = (720, 1080);
const EVENING: (i32, i32) = (1080, 1440);

#[derive(Clone)]
struct Item {
    start: i32,
    end: i32,
    category: String,
    priority: String,
    evaluated: bool,
}

#[derive(Clone)]
struct Series {
    id: String,
    category: String,
    priority: String,
    start: i32,
    end: i32,
    dtstart: String,
    rule: String,
}

#[derive(Clone)]
struct Override {
    replacement: Option<String>,
    category: Option<String>,
    priority: Option<String>,
    start: Option<i32>,
    end: Option<i32>,
    cancelled: bool,
}

pub fn month_projection(
    conn: &Connection,
    year: i32,
    month: u32,
    selected_date: &str,
    today: &str,
) -> Result<MonthProjection, TaskError> {
    if !(1..=9999).contains(&year) || !validate_date(selected_date) || !validate_date(today) {
        return Err(TaskError::Validation("Enter a valid calendar date."));
    }
    let first = NaiveDate::from_ymd_opt(year, month, 1)
        .ok_or(TaskError::Validation("Enter a valid calendar month."))?;
    let next = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .ok_or(TaskError::Validation("Enter a valid calendar month."))?;
    let end = next - Duration::days(1);
    let start_text = first.format("%Y-%m-%d").to_string();
    let end_text = end.format("%Y-%m-%d").to_string();

    let categories = load_categories(conn)?;
    let mut by_date = load_one_off(conn, &start_text, &end_text)?;
    let series = load_series(conn, &end_text)?;
    let overrides = load_overrides(conn, &start_text, &end_text)?;
    let evaluated = load_recurring_evaluations(conn, &start_text, &end_text)?;

    let mut date = first;
    while date <= end {
        let date_text = date.format("%Y-%m-%d").to_string();
        for master in &series {
            let key = (master.id.clone(), date_text.clone());
            let occurrence_override = overrides.get(&key);
            let occurs = recurrence::occurs_on(&master.dtstart, &date_text, &master.rule)?;
            if occurs || occurrence_override.is_some() {
                if let Some(item) = projected_item(
                    master,
                    occurrence_override,
                    &date_text,
                    evaluated.contains(&(master.id.clone(), date_text.clone())),
                ) {
                    by_date.entry(date_text.clone()).or_default().push(item);
                }
            }
        }
        date += Duration::days(1);
    }

    for ((series_id, original), occurrence_override) in &overrides {
        let Some(replacement) = occurrence_override.replacement.as_deref() else {
            continue;
        };
        if replacement == original
            || replacement < start_text.as_str()
            || replacement > end_text.as_str()
        {
            continue;
        }
        if let Some(master) = series.iter().find(|series| &series.id == series_id) {
            if let Some(item) = projected_item(
                master,
                Some(occurrence_override),
                replacement,
                evaluated.contains(&(master.id.clone(), original.clone())),
            ) {
                by_date
                    .entry(replacement.to_string())
                    .or_default()
                    .push(item);
            }
        }
    }

    let mut days = Vec::with_capacity(end.day() as usize);
    let mut date = first;
    while date <= end {
        let date_text = date.format("%Y-%m-%d").to_string();
        let items = by_date.remove(&date_text).unwrap_or_default();
        days.push(aggregate_day(
            date_text.clone(),
            items,
            &categories,
            date_text == today,
            date_text == selected_date,
            date_text.as_str() < today,
        ));
        date += Duration::days(1);
    }
    Ok(MonthProjection {
        month: format!("{year:04}-{month:02}"),
        algorithm_version: ALGORITHM_VERSION,
        days,
    })
}

fn load_categories(conn: &Connection) -> Result<HashMap<String, String>, TaskError> {
    let mut statement = conn.prepare("SELECT id, icon_key FROM task_categories")?;
    Ok(statement
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<HashMap<_, _>, _>>()?)
}

fn load_one_off(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<HashMap<String, Vec<Item>>, TaskError> {
    let mut statement = conn.prepare("SELECT t.local_date,t.start_minute,t.end_minute,t.category_id,t.priority,EXISTS(SELECT 1 FROM task_evaluations e WHERE e.subject_kind='one_off' AND e.task_id=t.id AND e.is_current=1) FROM tasks t WHERE t.local_date BETWEEN ?1 AND ?2")?;
    let mut result: HashMap<String, Vec<Item>> = HashMap::new();
    for row in statement.query_map(params![start, end], |row| {
        Ok((
            row.get::<_, String>(0)?,
            Item {
                start: row.get(1)?,
                end: row.get(2)?,
                category: row.get(3)?,
                priority: row.get(4)?,
                evaluated: row.get::<_, i32>(5)? != 0,
            },
        ))
    })? {
        let (date, item) = row?;
        result.entry(date).or_default().push(item);
    }
    Ok(result)
}

fn load_series(conn: &Connection, end: &str) -> Result<Vec<Series>, TaskError> {
    let mut statement = conn.prepare("SELECT id,category_id,priority,start_minute,end_minute,dtstart_local_date,rrule FROM task_series WHERE archived_at IS NULL AND dtstart_local_date<=?1")?;
    Ok(statement
        .query_map(params![end], |row| {
            Ok(Series {
                id: row.get(0)?,
                category: row.get(1)?,
                priority: row.get(2)?,
                start: row.get(3)?,
                end: row.get(4)?,
                dtstart: row.get(5)?,
                rule: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}

fn load_overrides(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<HashMap<(String, String), Override>, TaskError> {
    let mut statement = conn.prepare("SELECT series_id,original_local_date,replacement_local_date,category_id_override,priority_override,start_minute_override,end_minute_override,cancelled FROM task_occurrence_overrides WHERE original_local_date BETWEEN ?1 AND ?2 OR replacement_local_date BETWEEN ?1 AND ?2")?;
    Ok(statement
        .query_map(params![start, end], |row| {
            Ok((
                (row.get(0)?, row.get(1)?),
                Override {
                    replacement: row.get(2)?,
                    category: row.get(3)?,
                    priority: row.get(4)?,
                    start: row.get(5)?,
                    end: row.get(6)?,
                    cancelled: row.get::<_, i32>(7)? != 0,
                },
            ))
        })?
        .collect::<Result<HashMap<_, _>, _>>()?)
}

fn load_recurring_evaluations(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<HashSet<(String, String)>, TaskError> {
    let mut statement = conn.prepare("SELECT e.series_id,e.original_local_date FROM task_evaluations e LEFT JOIN task_occurrence_overrides o ON o.series_id=e.series_id AND o.original_local_date=e.original_local_date WHERE e.subject_kind='recurring' AND e.is_current=1 AND (e.original_local_date BETWEEN ?1 AND ?2 OR o.replacement_local_date BETWEEN ?1 AND ?2)")?;
    Ok(statement
        .query_map(params![start, end], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<HashSet<_>, _>>()?)
}

fn projected_item(
    master: &Series,
    occurrence_override: Option<&Override>,
    date: &str,
    evaluated: bool,
) -> Option<Item> {
    if occurrence_override.is_some_and(|value| value.cancelled) {
        return None;
    }
    if occurrence_override
        .and_then(|value| value.replacement.as_deref())
        .is_some_and(|replacement| replacement != date)
    {
        return None;
    }
    Some(Item {
        start: occurrence_override
            .and_then(|value| value.start)
            .unwrap_or(master.start),
        end: occurrence_override
            .and_then(|value| value.end)
            .unwrap_or(master.end),
        category: occurrence_override
            .and_then(|value| value.category.clone())
            .unwrap_or_else(|| master.category.clone()),
        priority: occurrence_override
            .and_then(|value| value.priority.clone())
            .unwrap_or_else(|| master.priority.clone()),
        evaluated,
    })
}

fn aggregate_day(
    date: String,
    items: Vec<Item>,
    category_icons: &HashMap<String, String>,
    is_today: bool,
    is_selected: bool,
    is_past: bool,
) -> CalendarDayProjection {
    let mut category_totals: HashMap<String, (i32, i32)> = HashMap::new();
    for item in &items {
        let entry = category_totals.entry(item.category.clone()).or_default();
        entry.0 += item.end - item.start;
        entry.1 = entry.1.max(priority_weight(&item.priority));
    }
    let mut categories = category_totals.into_iter().collect::<Vec<_>>();
    categories.sort_by(|left, right| {
        right
            .1
            .0
            .cmp(&left.1.0)
            .then(right.1.1.cmp(&left.1.1))
            .then(left.0.cmp(&right.0))
    });
    let category_icon_keys = categories
        .iter()
        .take(3)
        .filter_map(|(id, _)| category_icons.get(id).cloned())
        .collect::<Vec<_>>();
    CalendarDayProjection {
        date,
        is_today,
        is_selected,
        task_count: items.len() as i32,
        scheduled_minutes: items.iter().map(|item| item.end - item.start).sum(),
        category_icon_keys,
        extra_category_count: categories.len().saturating_sub(3) as i32,
        morning_load_ratio: load_ratio(&items, MORNING),
        afternoon_load_ratio: load_ratio(&items, AFTERNOON),
        evening_load_ratio: load_ratio(&items, EVENING),
        has_missed: is_past && items.iter().any(|item| !item.evaluated),
    }
}

fn load_ratio(items: &[Item], period: (i32, i32)) -> f64 {
    let mut intervals = items
        .iter()
        .filter_map(|item| {
            let start = item.start.max(period.0);
            let end = item.end.min(period.1);
            (start < end).then_some((start, end))
        })
        .collect::<Vec<_>>();
    intervals.sort_unstable();
    let mut occupied = 0;
    let mut current: Option<(i32, i32)> = None;
    for interval in intervals {
        match current {
            Some((start, end)) if interval.0 <= end => current = Some((start, end.max(interval.1))),
            Some((start, end)) => {
                occupied += end - start;
                current = Some(interval);
            }
            None => current = Some(interval),
        }
    }
    if let Some((start, end)) = current {
        occupied += end - start;
    }
    (occupied as f64 / (period.1 - period.0) as f64).clamp(0.0, 1.0)
}

fn priority_weight(priority: &str) -> i32 {
    match priority {
        "high" => 3,
        "medium" => 2,
        _ => 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        infrastructure::sqlite::{
            connection::open_memory_connection,
            task39_migration::run_all_migrations as run_migrations,
        },
        task::{
            dto::{
                CreateRecurringTaskInput, CreateTaskInput, EvaluateTaskInput, OccurrenceEditScope,
                UpdateRecurringOccurrenceInput,
            },
            evaluation::{self, ObservedLocalTime},
            repository,
        },
    };

    fn database() -> Connection {
        let mut connection = open_memory_connection().unwrap();
        run_migrations(&mut connection).unwrap();
        connection
    }

    #[test]
    fn month_lengths_and_flags_are_deterministic() {
        let connection = database();
        assert_eq!(
            month_projection(&connection, 2024, 2, "2024-02-29", "2024-02-29")
                .unwrap()
                .days
                .len(),
            29
        );
        assert_eq!(
            month_projection(&connection, 2025, 2, "2025-02-01", "2025-02-02")
                .unwrap()
                .days
                .len(),
            28
        );
        let selected = month_projection(&connection, 2026, 8, "2026-08-02", "2026-08-01").unwrap();
        assert!(selected.days[0].is_today);
        assert!(selected.days[1].is_selected);
    }

    #[test]
    fn aggregation_sums_duration_but_unions_exact_groups_for_load() {
        let connection = database();
        for title in ["A", "B"] {
            repository::create(
                &connection,
                CreateTaskInput {
                    title: title.into(),
                    description: "".into(),
                    local_date: "2026-08-02".into(),
                    start_minute: 480,
                    end_minute: 540,
                    category_id: "general".into(),
                    priority: "high".into(),
                    life_node_id: None,
                    focus_plan_id: None,
                    deadline_local_date: None,
                    tag_ids: vec![],
                },
            )
            .unwrap();
        }
        let day = &month_projection(&connection, 2026, 8, "2026-08-02", "2026-08-03")
            .unwrap()
            .days[1];
        assert_eq!(day.task_count, 2);
        assert_eq!(day.scheduled_minutes, 120);
        assert_eq!(day.morning_load_ratio, 60.0 / 480.0);
        assert!(day.has_missed);
    }

    #[test]
    fn evaluation_and_undo_drive_calendar_missed_semantics() {
        let mut connection = database();
        let task_id = repository::create(
            &connection,
            CreateTaskInput {
                title: "Past".into(),
                description: "".into(),
                local_date: "2026-08-01".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                focus_plan_id: None,
                deadline_local_date: None,
                tag_ids: vec![],
            },
        )
        .unwrap()
        .id;
        let before = month_projection(&connection, 2026, 8, "2026-08-02", "2026-08-02").unwrap();
        assert!(before.days[0].has_missed);

        evaluation::evaluate_at(
            &mut connection,
            EvaluateTaskInput {
                subject_kind: "one_off".into(),
                task_id: Some(task_id),
                series_id: None,
                original_local_date: None,
                state_id: "completion-met".into(),
                operation_id: "calendar-missed-operation".into(),
                observed_local_date: "2026-08-02".into(),
                observed_local_minute: 720,
            },
            ObservedLocalTime {
                date: "2026-08-02".into(),
                minute: 720,
            },
        )
        .unwrap();
        let evaluated = month_projection(&connection, 2026, 8, "2026-08-02", "2026-08-02").unwrap();
        assert!(!evaluated.days[0].has_missed);

        evaluation::undo(&mut connection, "calendar-missed-operation").unwrap();
        let undone = month_projection(&connection, 2026, 8, "2026-08-02", "2026-08-02").unwrap();
        assert!(undone.days[0].has_missed);
    }

    #[test]
    fn recurrence_moves_and_cancellations_project_once() {
        let mut connection = database();
        let series = repository::create_recurring(
            &mut connection,
            CreateRecurringTaskInput {
                title: "Weekly".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 720,
                end_minute: 780,
                category_id: "general".into(),
                priority: "medium".into(),
                frequency: "weekly".into(),
                interval: 1,
                weekdays: vec![0],
                until: None,
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        repository::update_recurring(
            &mut connection,
            UpdateRecurringOccurrenceInput {
                series_id: series.clone(),
                original_local_date: "2026-08-10".into(),
                replacement_local_date: Some("2026-08-11".into()),
                title: None,
                description: None,
                category_id: None,
                priority: None,
                start_minute: None,
                end_minute: None,
                scope: OccurrenceEditScope::OnlyThisOccurrence,
                cancelled: false,
                frequency: None,
                interval: None,
                weekdays: None,
                until: None,
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                series_tag_ids: None,
            },
        )
        .unwrap();
        repository::update_recurring(
            &mut connection,
            UpdateRecurringOccurrenceInput {
                series_id: series,
                original_local_date: "2026-08-17".into(),
                replacement_local_date: None,
                title: None,
                description: None,
                category_id: None,
                priority: None,
                start_minute: None,
                end_minute: None,
                scope: OccurrenceEditScope::OnlyThisOccurrence,
                cancelled: true,
                frequency: None,
                interval: None,
                weekdays: None,
                until: None,
                count: None,
                life_node_id: None,
                focus_plan_id: None,
                series_tag_ids: None,
            },
        )
        .unwrap();
        let month = month_projection(&connection, 2026, 8, "2026-08-01", "2026-08-01").unwrap();
        assert_eq!(month.days[9].task_count, 0);
        assert_eq!(month.days[10].task_count, 1);
        assert_eq!(month.days[16].task_count, 0);
    }

    #[test]
    fn load_ratio_intersects_periods_and_clamps() {
        let items = vec![
            Item {
                start: 690,
                end: 750,
                category: "a".into(),
                priority: "low".into(),
                evaluated: false,
            },
            Item {
                start: 700,
                end: 1080,
                category: "b".into(),
                priority: "low".into(),
                evaluated: false,
            },
        ];
        assert_eq!(load_ratio(&items, MORNING), 30.0 / 480.0);
        assert_eq!(load_ratio(&items, AFTERNOON), 1.0);
        assert_eq!(load_ratio(&items, EVENING), 0.0);
    }

    #[test]
    fn category_ranking_is_duration_priority_then_stable_id_with_a_cap() {
        let icons = HashMap::from([
            ("a".into(), "icon-a".into()),
            ("b".into(), "icon-b".into()),
            ("c".into(), "icon-c".into()),
            ("d".into(), "icon-d".into()),
        ]);
        let items = vec![
            Item {
                start: 480,
                end: 600,
                category: "d".into(),
                priority: "low".into(),
                evaluated: false,
            },
            Item {
                start: 600,
                end: 720,
                category: "b".into(),
                priority: "high".into(),
                evaluated: false,
            },
            Item {
                start: 720,
                end: 780,
                category: "c".into(),
                priority: "medium".into(),
                evaluated: false,
            },
            Item {
                start: 780,
                end: 840,
                category: "a".into(),
                priority: "medium".into(),
                evaluated: false,
            },
        ];
        let day = aggregate_day("2026-08-02".into(), items, &icons, false, false, false);
        assert_eq!(day.category_icon_keys, ["icon-b", "icon-d", "icon-a"]);
        assert_eq!(day.extra_category_count, 1);
    }
}
