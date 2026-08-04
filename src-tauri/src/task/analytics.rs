use std::collections::{BTreeMap, HashMap};

use chrono::{Datelike, Duration, Local, NaiveDate, Timelike};
use rusqlite::{Connection, OptionalExtension, Transaction, params};

use super::{
    domain::validate_date,
    dto::{
        AnalyticsCategoryView, AnalyticsCompletionDistributionView, AnalyticsPeriodKind,
        AnalyticsProjection, AnalyticsProjectionInput, AnalyticsStreakView, TaskCategoryView,
        UpdateCategoryGoalsInput,
    },
    recurrence,
    repository::TaskError,
};

pub const ALGORITHM_VERSION: i32 = 1;
const MAX_ANALYTICS_DAYS: i64 = 366;
const MAX_STREAK_WEEKS: i64 = 520;
type EvaluationSnapshot = (String, String, String);
type RecurringEvaluationMap = HashMap<(String, String), EvaluationSnapshot>;

#[derive(Clone)]
struct Item {
    date: NaiveDate,
    end_minute: i32,
    duration: i32,
    category_id: String,
    category_name: String,
    category_icon: String,
    category_color: String,
    evaluation: Option<EvaluationSnapshot>,
}

#[derive(Clone)]
struct CategoryMeta {
    name: String,
    icon: String,
    color: String,
}

#[derive(Clone)]
struct Series {
    id: String,
    category_id: String,
    category_name: String,
    category_icon: String,
    category_color: String,
    start: i32,
    end: i32,
    dtstart: String,
    rule: String,
}

#[derive(Clone)]
struct Override {
    original: String,
    replacement: Option<String>,
    category: Option<String>,
    start: Option<i32>,
    end: Option<i32>,
    cancelled: bool,
}

#[derive(Clone, Copy)]
struct Goals {
    minimum: i32,
    target: i32,
}

pub fn bump_source_revision(conn: &Connection) -> Result<(), TaskError> {
    conn.execute(
        "UPDATE analytics_meta SET source_revision=source_revision+1 WHERE id=1",
        [],
    )?;
    Ok(())
}

pub fn update_category_goals(
    conn: &mut Connection,
    input: UpdateCategoryGoalsInput,
) -> Result<TaskCategoryView, TaskError> {
    let today = Local::now().date_naive();
    update_category_goals_at(conn, input, today)
}

pub(crate) fn update_category_goals_at(
    conn: &mut Connection,
    input: UpdateCategoryGoalsInput,
    authoritative_today: NaiveDate,
) -> Result<TaskCategoryView, TaskError> {
    validate_goal_input(&input, authoritative_today)?;
    let effective = week_start(authoritative_today)
        .format("%Y-%m-%d")
        .to_string();
    let tx = conn.transaction()?;
    if let Some(saved) = replay_goal_operation(&tx, &input)? {
        tx.commit()?;
        return Ok(saved);
    }
    let current: i32 = tx
        .query_row(
            "SELECT goal_revision FROM task_categories WHERE id=?1 AND archived_at IS NULL",
            params![input.category_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(TaskError::NotFound)?;
    if current != input.expected_revision {
        return Err(TaskError::Validation(
            "Category goals changed; reload and try again.",
        ));
    }
    let revision = current + 1;
    tx.execute("UPDATE task_categories SET weekly_minimum_minutes=?2,weekly_target_minutes=?3,goal_revision=?4 WHERE id=?1",params![input.category_id,input.weekly_minimum_minutes,input.weekly_target_minutes,revision])?;
    tx.execute("INSERT INTO category_goal_history(category_id,effective_week_start,weekly_minimum_minutes,weekly_target_minutes,goal_revision,created_at) VALUES(?1,?2,?3,?4,?5,strftime('%s','now')) ON CONFLICT(category_id,effective_week_start) DO UPDATE SET weekly_minimum_minutes=excluded.weekly_minimum_minutes,weekly_target_minutes=excluded.weekly_target_minutes,goal_revision=excluded.goal_revision,created_at=excluded.created_at",params![input.category_id,effective,input.weekly_minimum_minutes,input.weekly_target_minutes,revision])?;
    tx.execute("INSERT INTO category_goal_operations(operation_id,category_id,weekly_minimum_minutes,weekly_target_minutes,effective_week_start,result_revision,created_at) VALUES(?1,?2,?3,?4,?5,?6,strftime('%s','now'))",params![input.operation_id,input.category_id,input.weekly_minimum_minutes,input.weekly_target_minutes,effective,revision])?;
    bump_source_revision(&tx)?;
    let result = category_by_id(&tx, &input.category_id)?;
    tx.commit()?;
    Ok(result)
}

fn validate_goal_input(
    input: &UpdateCategoryGoalsInput,
    today: NaiveDate,
) -> Result<(), TaskError> {
    if input.category_id.is_empty()
        || input.expected_revision < 0
        || input.operation_id.is_empty()
        || input.operation_id.len() > 100
        || !input
            .operation_id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-')
        || !validate_date(&input.observed_local_date)
        || input.observed_local_date != today.format("%Y-%m-%d").to_string()
    {
        return Err(TaskError::Validation("Use valid category goal input."));
    }
    match (input.weekly_minimum_minutes, input.weekly_target_minutes) {
        (None, None) => Ok(()),
        (Some(minimum), Some(target)) if (0..=target).contains(&minimum) && target <= 10_080 => {
            Ok(())
        }
        _ => Err(TaskError::Validation(
            "Weekly minimum must not exceed the weekly target.",
        )),
    }
}

fn replay_goal_operation(
    tx: &Transaction<'_>,
    input: &UpdateCategoryGoalsInput,
) -> Result<Option<TaskCategoryView>, TaskError> {
    let saved:Option<(String,Option<i32>,Option<i32>,i32)>=tx.query_row("SELECT category_id,weekly_minimum_minutes,weekly_target_minutes,result_revision FROM category_goal_operations WHERE operation_id=?1",params![input.operation_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).optional()?;
    if let Some((category, minimum, target, revision)) = saved {
        if category != input.category_id
            || minimum != input.weekly_minimum_minutes
            || target != input.weekly_target_minutes
        {
            return Err(TaskError::Validation(
                "Operation identity does not match these category goals.",
            ));
        }
        let mut result = category_by_id(tx, &category)?;
        result.goal_revision = revision;
        return Ok(Some(result));
    }
    Ok(None)
}

fn category_by_id(conn: &Connection, id: &str) -> Result<TaskCategoryView, TaskError> {
    conn.query_row("SELECT id,name,icon_key,color_key,weekly_minimum_minutes,weekly_target_minutes,goal_revision FROM task_categories WHERE id=?1",params![id],|r|Ok(TaskCategoryView{id:r.get(0)?,name:r.get(1)?,icon_key:r.get(2)?,color_key:r.get(3)?,weekly_minimum_minutes:r.get(4)?,weekly_target_minutes:r.get(5)?,goal_revision:r.get(6)?})).map_err(Into::into)
}

pub fn projection(
    conn: &mut Connection,
    input: AnalyticsProjectionInput,
) -> Result<AnalyticsProjection, TaskError> {
    let now = Local::now();
    projection_at(
        conn,
        input,
        now.date_naive(),
        (now.hour() * 60 + now.minute()) as i32,
    )
}

fn projection_at(
    conn: &mut Connection,
    input: AnalyticsProjectionInput,
    authoritative_date: NaiveDate,
    authoritative_minute: i32,
) -> Result<AnalyticsProjection, TaskError> {
    validate_projection_input(&input)?;
    let anchor = parse_date(&input.anchor_local_date)?;
    let observed = parse_date(&input.observed_local_date)?;
    if observed != authoritative_date
        || (input.observed_local_minute - authoritative_minute).abs() > 1
    {
        return Err(TaskError::Validation(
            "Refresh Analytics using the current local time.",
        ));
    }
    let (start, end) = period_bounds(&input.period_kind, anchor);
    if (end - start).num_days() + 1 > MAX_ANALYTICS_DAYS {
        return Err(TaskError::Validation("Analytics period is too large."));
    }
    let source: i64 = conn.query_row(
        "SELECT source_revision FROM analytics_meta WHERE id=1",
        [],
        |r| r.get(0),
    )?;
    let kind = period_kind_key(&input.period_kind);
    let start_text = format_date(start);
    let fresh:bool=conn.query_row("SELECT EXISTS(SELECT 1 FROM analytics_period_aggregates WHERE period_kind=?1 AND period_start=?2 AND source_revision=?3 AND algorithm_version=?4 AND observed_local_date=?5 AND observed_local_minute=?6)",params![kind,start_text,source,ALGORITHM_VERSION,input.observed_local_date,input.observed_local_minute],|r|r.get(0))?;
    if !fresh {
        rebuild(
            conn,
            &input.period_kind,
            start,
            end,
            observed,
            input.observed_local_minute,
            source,
        )?;
    }
    read_projection(
        conn,
        input.period_kind,
        start,
        end,
        observed,
        input.observed_local_minute,
        source,
    )
}

fn validate_projection_input(input: &AnalyticsProjectionInput) -> Result<(), TaskError> {
    if !validate_date(&input.anchor_local_date)
        || !validate_date(&input.observed_local_date)
        || !(0..1440).contains(&input.observed_local_minute)
    {
        return Err(TaskError::Validation("Choose a valid Analytics period."));
    }
    Ok(())
}

fn rebuild(
    conn: &mut Connection,
    kind: &AnalyticsPeriodKind,
    start: NaiveDate,
    end: NaiveDate,
    observed: NaiveDate,
    observed_minute: i32,
    source: i64,
) -> Result<(), TaskError> {
    let items = load_items(conn, start, end)?;
    let mut categories: BTreeMap<String, Vec<Item>> = BTreeMap::new();
    let mut category_meta: BTreeMap<String, CategoryMeta> = BTreeMap::new();
    let mut distribution: BTreeMap<(String, String, String), i32> = BTreeMap::new();
    let mut evaluated = 0;
    let mut missed = 0;
    for item in &items {
        category_meta
            .entry(item.category_id.clone())
            .or_insert_with(|| CategoryMeta {
                name: item.category_name.clone(),
                icon: item.category_icon.clone(),
                color: item.category_color.clone(),
            });
        categories
            .entry(item.category_id.clone())
            .or_default()
            .push(item.clone());
        if let Some(snapshot) = &item.evaluation {
            evaluated += 1;
            *distribution.entry(snapshot.clone()).or_default() += 1;
        } else if item.date < observed
            || (item.date == observed && item.end_minute <= observed_minute)
        {
            missed += 1;
        }
    }
    // Configured active categories remain visible even when the requested period has no
    // scheduled work. Their zero-minute shortfall is an important part of the objective
    // read model, and streak rebuilding must not depend on a task happening to exist in
    // the currently viewed period.
    {
        let mut stmt = conn.prepare(
            "SELECT id,name,icon_key,color_key FROM task_categories \
             WHERE archived_at IS NULL AND weekly_minimum_minutes IS NOT NULL \
             ORDER BY id",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                CategoryMeta {
                    name: row.get(1)?,
                    icon: row.get(2)?,
                    color: row.get(3)?,
                },
            ))
        })?;
        for row in rows {
            let (id, meta) = row?;
            category_meta.entry(id.clone()).or_insert(meta);
            categories.entry(id).or_default();
        }
    }
    let scheduled: i32 = items.iter().map(|item| item.duration).sum();
    let tx = conn.transaction()?;
    let key = period_kind_key(kind);
    let start_text = format_date(start);
    let end_text = format_date(end);
    let computed = timestamp();
    tx.execute(
        "DELETE FROM analytics_period_aggregates WHERE period_kind=?1 AND period_start=?2",
        params![key, start_text],
    )?;
    tx.execute(
        "DELETE FROM analytics_category_aggregates WHERE period_kind=?1 AND period_start=?2",
        params![key, start_text],
    )?;
    tx.execute(
        "DELETE FROM analytics_completion_distribution WHERE period_kind=?1 AND period_start=?2",
        params![key, start_text],
    )?;
    tx.execute(
        "INSERT INTO analytics_period_aggregates VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            key,
            start_text,
            end_text,
            format_date(observed),
            observed_minute,
            source,
            ALGORITHM_VERSION,
            computed,
            scheduled,
            items.len() as i32,
            evaluated,
            missed
        ],
    )?;
    for (category_id, category_items) in categories {
        let meta = category_meta
            .get(&category_id)
            .ok_or(TaskError::Validation("Category metadata is unavailable."))?;
        let total: i32 = category_items.iter().map(|item| item.duration).sum();
        let anchor_week = week_start(std::cmp::min(end, observed));
        let current_goal = goals_for_week(&tx, &category_id, anchor_week)?;
        let (eligible, min_weeks, target_weeks) =
            attainment_counts(&tx, &category_id, start, end, observed)?;
        let (minimum, target) = current_goal
            .map(|g| (Some(g.minimum), Some(g.target)))
            .unwrap_or((None, None));
        let min_value = minimum.unwrap_or(0);
        let target_value = target.unwrap_or(0);
        tx.execute("INSERT INTO analytics_category_aggregates VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)",params![key,start_text,category_id,meta.name,meta.icon,meta.color,total,minimum,target,total.min(min_value),total.min(target_value),(min_value-total).max(0),(target_value-total).max(0),(total-min_value).max(0),(total-target_value).max(0),eligible,min_weeks,target_weeks,source,ALGORITHM_VERSION])?;
        rebuild_streaks(&tx, &category_id, observed, source)?;
    }
    for ((state, label, visual), count) in distribution {
        tx.execute(
            "INSERT INTO analytics_completion_distribution VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                key,
                start_text,
                state,
                label,
                visual,
                count,
                source,
                ALGORITHM_VERSION
            ],
        )?;
    }
    tx.commit()?;
    Ok(())
}

fn read_projection(
    conn: &Connection,
    kind: AnalyticsPeriodKind,
    start: NaiveDate,
    end: NaiveDate,
    observed: NaiveDate,
    observed_minute: i32,
    source: i64,
) -> Result<AnalyticsProjection, TaskError> {
    let key = period_kind_key(&kind);
    let start_text = format_date(start);
    let base:(String,i32,i32,i32,i32)=conn.query_row("SELECT computed_at,scheduled_minutes,task_count,evaluated_count,missed_count FROM analytics_period_aggregates WHERE period_kind=?1 AND period_start=?2 AND source_revision=?3 AND algorithm_version=?4 AND observed_local_date=?5 AND observed_local_minute=?6",params![key,start_text,source,ALGORITHM_VERSION,format_date(observed),observed_minute],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?)))?;
    let mut stmt=conn.prepare("SELECT category_id,category_name_snapshot,category_icon_key_snapshot,category_color_key_snapshot,scheduled_minutes,configured_weekly_minimum,configured_weekly_target,minimum_attained_minutes,target_attained_minutes,minimum_shortfall_minutes,target_shortfall_minutes,minimum_overage_minutes,target_overage_minutes,eligible_week_count,minimum_week_count,target_week_count FROM analytics_category_aggregates WHERE period_kind=?1 AND period_start=?2 AND source_revision=?3 ORDER BY scheduled_minutes DESC,category_id")?;
    let categories = stmt
        .query_map(params![key, start_text, source], |r| {
            Ok(AnalyticsCategoryView {
                category_id: r.get(0)?,
                category_name: r.get(1)?,
                category_icon_key: r.get(2)?,
                category_color_key: r.get(3)?,
                scheduled_minutes: r.get(4)?,
                weekly_minimum_minutes: r.get(5)?,
                weekly_target_minutes: r.get(6)?,
                minimum_attained_minutes: r.get(7)?,
                target_attained_minutes: r.get(8)?,
                minimum_shortfall_minutes: r.get(9)?,
                target_shortfall_minutes: r.get(10)?,
                minimum_overage_minutes: r.get(11)?,
                target_overage_minutes: r.get(12)?,
                eligible_week_count: r.get(13)?,
                minimum_week_count: r.get(14)?,
                target_week_count: r.get(15)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut stmt=conn.prepare("SELECT state_id,state_label_snapshot,state_visual_snapshot,count FROM analytics_completion_distribution WHERE period_kind=?1 AND period_start=?2 AND source_revision=?3 ORDER BY state_id,state_label_snapshot")?;
    let completion_distribution = stmt
        .query_map(params![key, start_text, source], |r| {
            Ok(AnalyticsCompletionDistributionView {
                state_id: r.get(0)?,
                label: r.get(1)?,
                visual_token: r.get(2)?,
                count: r.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let through = format_date(week_start(observed) - Duration::days(7));
    let mut stmt=conn.prepare("SELECT category_id,threshold_kind,current_length,longest_length,current_start,longest_start,last_break_week FROM analytics_category_streaks WHERE through_week_start=?1 AND source_revision=?2 ORDER BY category_id,threshold_kind")?;
    let streaks = stmt
        .query_map(params![through, source], |r| {
            Ok(AnalyticsStreakView {
                category_id: r.get(0)?,
                threshold_kind: r.get(1)?,
                current_length: r.get(2)?,
                longest_length: r.get(3)?,
                current_start: r.get(4)?,
                longest_start: r.get(5)?,
                last_break_week: r.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(AnalyticsProjection {
        period_kind: kind,
        period_start: start_text,
        period_end: format_date(end),
        is_complete: end < observed,
        algorithm_version: ALGORITHM_VERSION,
        computed_at: base.0,
        source_revision: source.to_string(),
        scheduled_minutes: base.1,
        task_count: base.2,
        evaluated_count: base.3,
        missed_count: base.4,
        categories,
        completion_distribution,
        streaks,
    })
}

fn load_items(conn: &Connection, start: NaiveDate, end: NaiveDate) -> Result<Vec<Item>, TaskError> {
    let start_text = format_date(start);
    let end_text = format_date(end);
    let mut out = Vec::new();
    let mut stmt=conn.prepare("SELECT t.local_date,t.end_minute,t.end_minute-t.start_minute,c.id,c.name,c.icon_key,c.color_key,e.state_id,e.state_label_snapshot,e.state_visual_snapshot FROM tasks t JOIN task_categories c ON c.id=t.category_id LEFT JOIN task_evaluations e ON e.subject_kind='one_off' AND e.task_id=t.id AND e.is_current=1 WHERE t.local_date BETWEEN ?1 AND ?2")?;
    for row in stmt.query_map(params![start_text, end_text], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get(1)?,
            r.get(2)?,
            r.get(3)?,
            r.get(4)?,
            r.get(5)?,
            r.get(6)?,
            r.get::<_, Option<String>>(7)?,
            r.get::<_, Option<String>>(8)?,
            r.get::<_, Option<String>>(9)?,
        ))
    })? {
        let (
            date,
            end_minute,
            duration,
            category_id,
            category_name,
            category_icon,
            category_color,
            state,
            label,
            visual,
        ) = row?;
        out.push(Item {
            date: parse_date(&date)?,
            end_minute,
            duration,
            category_id,
            category_name,
            category_icon,
            category_color,
            evaluation: state.map(|s| (s, label.unwrap_or_default(), visual.unwrap_or_default())),
        });
    }
    let series = load_series(conn, &end_text)?;
    let overrides = load_overrides(conn, &start_text, &end_text)?;
    let evaluations = load_recurring_evaluations(conn, &start_text, &end_text)?;
    for master in &series {
        let mut date = start.max(parse_date(&master.dtstart)?);
        while date <= end {
            let original = format_date(date);
            if recurrence::occurs_on(&master.dtstart, &original, &master.rule)? {
                if let Some(item) = series_item(
                    conn,
                    master,
                    overrides.get(&(master.id.clone(), original.clone())),
                    &original,
                    &evaluations,
                )? {
                    out.push(item);
                }
            }
            date += Duration::days(1);
        }
    }
    for ((series_id, original), override_) in &overrides {
        let Some(replacement) = override_.replacement.as_deref() else {
            continue;
        };
        let replacement_date = parse_date(replacement)?;
        if replacement_date < start
            || replacement_date > end
            || replacement == original
            || override_.cancelled
        {
            continue;
        }
        if let Some(master) = series.iter().find(|s| &s.id == series_id) {
            if let Some(item) =
                series_item(conn, master, Some(override_), replacement, &evaluations)?
            {
                out.push(item);
            }
        }
    }
    Ok(out)
}

fn load_series(conn: &Connection, end: &str) -> Result<Vec<Series>, TaskError> {
    let mut stmt=conn.prepare("SELECT s.id,s.category_id,c.name,c.icon_key,c.color_key,s.start_minute,s.end_minute,s.dtstart_local_date,s.rrule FROM task_series s JOIN task_categories c ON c.id=s.category_id WHERE s.archived_at IS NULL AND s.dtstart_local_date<=?1")?;
    Ok(stmt
        .query_map(params![end], |r| {
            Ok(Series {
                id: r.get(0)?,
                category_id: r.get(1)?,
                category_name: r.get(2)?,
                category_icon: r.get(3)?,
                category_color: r.get(4)?,
                start: r.get(5)?,
                end: r.get(6)?,
                dtstart: r.get(7)?,
                rule: r.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}
fn load_overrides(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<HashMap<(String, String), Override>, TaskError> {
    let mut stmt=conn.prepare("SELECT series_id,original_local_date,replacement_local_date,category_id_override,start_minute_override,end_minute_override,cancelled FROM task_occurrence_overrides WHERE original_local_date BETWEEN ?1 AND ?2 OR replacement_local_date BETWEEN ?1 AND ?2")?;
    Ok(stmt
        .query_map(params![start, end], |r| {
            let sid: String = r.get(0)?;
            let original: String = r.get(1)?;
            Ok((
                (sid, original.clone()),
                Override {
                    original,
                    replacement: r.get(2)?,
                    category: r.get(3)?,
                    start: r.get(4)?,
                    end: r.get(5)?,
                    cancelled: r.get::<_, i32>(6)? != 0,
                },
            ))
        })?
        .collect::<Result<HashMap<_, _>, _>>()?)
}
fn load_recurring_evaluations(
    conn: &Connection,
    start: &str,
    end: &str,
) -> Result<RecurringEvaluationMap, TaskError> {
    let mut stmt=conn.prepare("SELECT e.series_id,e.original_local_date,e.state_id,e.state_label_snapshot,e.state_visual_snapshot FROM task_evaluations e LEFT JOIN task_occurrence_overrides o ON o.series_id=e.series_id AND o.original_local_date=e.original_local_date WHERE e.subject_kind='recurring' AND e.is_current=1 AND (e.original_local_date BETWEEN ?1 AND ?2 OR o.replacement_local_date BETWEEN ?1 AND ?2)")?;
    Ok(stmt
        .query_map(params![start, end], |r| {
            Ok(((r.get(0)?, r.get(1)?), (r.get(2)?, r.get(3)?, r.get(4)?)))
        })?
        .collect::<Result<HashMap<_, _>, _>>()?)
}
fn series_item(
    conn: &Connection,
    master: &Series,
    override_: Option<&Override>,
    display: &str,
    evaluations: &RecurringEvaluationMap,
) -> Result<Option<Item>, TaskError> {
    if override_.is_some_and(|o| o.cancelled)
        || override_
            .and_then(|o| o.replacement.as_deref())
            .is_some_and(|r| r != display)
    {
        return Ok(None);
    }
    let category_id = override_
        .and_then(|o| o.category.clone())
        .unwrap_or_else(|| master.category_id.clone());
    let (name, icon, color) = if category_id == master.category_id {
        (
            master.category_name.clone(),
            master.category_icon.clone(),
            master.category_color.clone(),
        )
    } else {
        conn.query_row(
            "SELECT name,icon_key,color_key FROM task_categories WHERE id=?1",
            params![category_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?
    };
    let start = override_.and_then(|o| o.start).unwrap_or(master.start);
    let end = override_.and_then(|o| o.end).unwrap_or(master.end);
    let original = override_
        .map(|o| o.original.clone())
        .unwrap_or_else(|| display.to_string());
    Ok(Some(Item {
        date: parse_date(display)?,
        end_minute: end,
        duration: end - start,
        category_id,
        category_name: name,
        category_icon: icon,
        category_color: color,
        evaluation: evaluations.get(&(master.id.clone(), original)).cloned(),
    }))
}

fn attainment_counts(
    conn: &Connection,
    category: &str,
    start: NaiveDate,
    end: NaiveDate,
    observed: NaiveDate,
) -> Result<(i32, i32, i32), TaskError> {
    let mut eligible = 0;
    let mut minimum = 0;
    let mut target = 0;
    let mut week = week_start(start);
    while week <= end {
        let week_end = week + Duration::days(6);
        if week_end < observed && week >= start {
            if let Some(goal) = goals_for_week(conn, category, week)? {
                let total: i32 = load_items(conn, week, week_end)?
                    .into_iter()
                    .filter(|item| item.category_id == category)
                    .map(|item| item.duration)
                    .sum();
                eligible += 1;
                if total >= goal.minimum {
                    minimum += 1
                }
                if total >= goal.target {
                    target += 1
                }
            }
        }
        week += Duration::days(7);
    }
    Ok((eligible, minimum, target))
}
fn goals_for_week(
    conn: &Connection,
    category: &str,
    week: NaiveDate,
) -> Result<Option<Goals>, TaskError> {
    conn.query_row("SELECT weekly_minimum_minutes,weekly_target_minutes FROM category_goal_history WHERE category_id=?1 AND effective_week_start<=?2 ORDER BY effective_week_start DESC LIMIT 1",params![category,format_date(week)],|r|Ok(Goals{minimum:r.get(0)?,target:r.get(1)?})).optional().map_err(Into::into)
}
fn rebuild_streaks(
    conn: &Connection,
    category: &str,
    observed: NaiveDate,
    source: i64,
) -> Result<(), TaskError> {
    let through = week_start(observed) - Duration::days(7);
    let first: Option<String> = conn.query_row(
        "SELECT MIN(effective_week_start) FROM category_goal_history WHERE category_id=?1",
        params![category],
        |r| r.get(0),
    )?;
    let Some(first) = first else { return Ok(()) };
    let mut start = parse_date(&first)?;
    if (through - start).num_weeks() > MAX_STREAK_WEEKS {
        start = through - Duration::weeks(MAX_STREAK_WEEKS)
    }
    let items = load_items(conn, start, through + Duration::days(6))?;
    let mut totals: HashMap<NaiveDate, i32> = HashMap::new();
    for item in items
        .into_iter()
        .filter(|item| item.category_id == category)
    {
        *totals.entry(week_start(item.date)).or_default() += item.duration;
    }
    for (threshold, name) in [(false, "minimum"), (true, "target")] {
        let mut current = 0;
        let mut longest = 0;
        let mut run_start = None;
        let mut longest_start = None;
        let mut last_break = None;
        let mut week = start;
        while week <= through {
            if let Some(goal) = goals_for_week(conn, category, week)? {
                let required = if threshold { goal.target } else { goal.minimum };
                if totals.get(&week).copied().unwrap_or(0) >= required {
                    if current == 0 {
                        run_start = Some(week)
                    }
                    current += 1;
                    if current > longest {
                        longest = current;
                        longest_start = run_start;
                    }
                } else {
                    current = 0;
                    run_start = None;
                    last_break = Some(week);
                }
            }
            week += Duration::days(7);
        }
        conn.execute("INSERT INTO analytics_category_streaks VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10) ON CONFLICT(category_id,threshold_kind,through_week_start) DO UPDATE SET current_length=excluded.current_length,longest_length=excluded.longest_length,current_start=excluded.current_start,longest_start=excluded.longest_start,last_break_week=excluded.last_break_week,algorithm_version=excluded.algorithm_version,source_revision=excluded.source_revision",params![category,name,format_date(through),current,longest,run_start.map(format_date),longest_start.map(format_date),last_break.map(format_date),ALGORITHM_VERSION,source])?;
    }
    Ok(())
}

fn period_bounds(kind: &AnalyticsPeriodKind, anchor: NaiveDate) -> (NaiveDate, NaiveDate) {
    match kind {
        AnalyticsPeriodKind::Week => {
            let start = week_start(anchor);
            (start, start + Duration::days(6))
        }
        AnalyticsPeriodKind::Month => {
            let start = anchor.with_day(1).unwrap();
            let next = if start.month() == 12 {
                NaiveDate::from_ymd_opt(start.year() + 1, 1, 1).unwrap()
            } else {
                NaiveDate::from_ymd_opt(start.year(), start.month() + 1, 1).unwrap()
            };
            (start, next - Duration::days(1))
        }
        AnalyticsPeriodKind::Year => {
            let start = NaiveDate::from_ymd_opt(anchor.year(), 1, 1).unwrap();
            (
                start,
                NaiveDate::from_ymd_opt(anchor.year(), 12, 31).unwrap(),
            )
        }
    }
}
fn week_start(date: NaiveDate) -> NaiveDate {
    date - Duration::days(date.weekday().num_days_from_monday() as i64)
}
fn parse_date(value: &str) -> Result<NaiveDate, TaskError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| TaskError::Validation("Choose a valid Analytics date."))
}
fn format_date(value: NaiveDate) -> String {
    value.format("%Y-%m-%d").to_string()
}
fn period_kind_key(kind: &AnalyticsPeriodKind) -> &'static str {
    match kind {
        AnalyticsPeriodKind::Week => "week",
        AnalyticsPeriodKind::Month => "month",
        AnalyticsPeriodKind::Year => "year",
    }
}
fn timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        infrastructure::sqlite::{
            connection::{open_file_connection, open_memory_connection},
            migrations::run_migrations,
        },
        task::{
            dto::{
                CreateRecurringTaskInput, CreateTaskInput, EvaluateTaskInput, OccurrenceEditScope,
                UpdateRecurringOccurrenceInput, UpdateTaskInput,
            },
            evaluation::{self, ObservedLocalTime},
            repository,
        },
    };
    fn db() -> Connection {
        let mut c = open_memory_connection().unwrap();
        run_migrations(&mut c).unwrap();
        c
    }
    fn goal(c: &mut Connection, min: i32, target: i32) {
        update_category_goals_at(
            c,
            UpdateCategoryGoalsInput {
                category_id: "general".into(),
                weekly_minimum_minutes: Some(min),
                weekly_target_minutes: Some(target),
                expected_revision: 0,
                operation_id: "goal-operation".into(),
                observed_local_date: "2026-08-03".into(),
            },
            NaiveDate::from_ymd_opt(2026, 8, 3).unwrap(),
        )
        .unwrap();
    }
    fn projection_input(
        kind: AnalyticsPeriodKind,
        anchor: &str,
        today: &str,
    ) -> AnalyticsProjectionInput {
        AnalyticsProjectionInput {
            period_kind: kind,
            anchor_local_date: anchor.into(),
            observed_local_date: today.into(),
            observed_local_minute: 720,
        }
    }
    fn project(
        conn: &mut Connection,
        input: AnalyticsProjectionInput,
    ) -> Result<AnalyticsProjection, TaskError> {
        let date = parse_date(&input.observed_local_date)?;
        let minute = input.observed_local_minute;
        projection_at(conn, input, date, minute)
    }
    fn revision(c: &Connection) -> i64 {
        c.query_row("SELECT source_revision FROM analytics_meta", [], |row| {
            row.get(0)
        })
        .unwrap()
    }
    #[test]
    fn migration_seeds_revision_and_goal_validation_is_atomic_idempotent() {
        let mut c = db();
        assert_eq!(
            c.query_row::<i64, _, _>("SELECT source_revision FROM analytics_meta", [], |r| r
                .get(0))
                .unwrap(),
            0
        );
        goal(&mut c, 60, 120);
        let revision: i64 = c
            .query_row("SELECT source_revision FROM analytics_meta", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(revision, 1);
        let replay = update_category_goals_at(
            &mut c,
            UpdateCategoryGoalsInput {
                category_id: "general".into(),
                weekly_minimum_minutes: Some(60),
                weekly_target_minutes: Some(120),
                expected_revision: 0,
                operation_id: "goal-operation".into(),
                observed_local_date: "2026-08-03".into(),
            },
            NaiveDate::from_ymd_opt(2026, 8, 3).unwrap(),
        )
        .unwrap();
        assert_eq!(replay.goal_revision, 1);
        assert_eq!(
            c.query_row::<i64, _, _>("SELECT source_revision FROM analytics_meta", [], |r| r
                .get(0))
                .unwrap(),
            revision
        );
    }
    #[test]
    fn week_aggregation_classifies_evaluated_missed_and_future_without_score() {
        let mut c = db();
        goal(&mut c, 60, 120);
        for (title, date, start, end) in [
            ("Evaluated", "2026-08-03", 480, 540),
            ("Missed", "2026-08-04", 480, 540),
            ("Future", "2026-08-09", 480, 540),
        ] {
            repository::create(
                &c,
                CreateTaskInput {
                    title: title.into(),
                    description: "".into(),
                    local_date: date.into(),
                    start_minute: start,
                    end_minute: end,
                    category_id: "general".into(),
                    priority: "medium".into(),
                    life_node_id: None,
                    tag_ids: vec![],
                },
            )
            .unwrap();
        }
        let id = repository::list(&c, "2026-08-03").unwrap()[0].id.clone();
        evaluation::evaluate_at(
            &mut c,
            EvaluateTaskInput {
                subject_kind: "one_off".into(),
                task_id: Some(id),
                series_id: None,
                original_local_date: None,
                state_id: "completion-met".into(),
                operation_id: "analytics-evaluation".into(),
                observed_local_date: "2026-08-05".into(),
                observed_local_minute: 720,
            },
            ObservedLocalTime {
                date: "2026-08-05".into(),
                minute: 720,
            },
        )
        .unwrap();
        let p = project(
            &mut c,
            projection_input(AnalyticsPeriodKind::Week, "2026-08-05", "2026-08-05"),
        )
        .unwrap();
        assert_eq!(
            (
                p.task_count,
                p.scheduled_minutes,
                p.evaluated_count,
                p.missed_count
            ),
            (3, 180, 1, 1)
        );
        assert_eq!(p.completion_distribution[0].label, "Met expectation");
    }
    #[test]
    fn recurring_moved_cancelled_and_exact_tasks_aggregate_once() {
        let mut c = db();
        let sid = repository::create_recurring(
            &mut c,
            CreateRecurringTaskInput {
                title: "Daily".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: None,
                count: Some(3),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        use crate::task::dto::{OccurrenceEditScope, UpdateRecurringOccurrenceInput};
        repository::update_recurring(
            &mut c,
            UpdateRecurringOccurrenceInput {
                series_id: sid.clone(),
                original_local_date: "2026-08-04".into(),
                replacement_local_date: Some("2026-08-06".into()),
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
                series_tag_ids: None,
            },
        )
        .unwrap();
        repository::update_recurring(
            &mut c,
            UpdateRecurringOccurrenceInput {
                series_id: sid,
                original_local_date: "2026-08-05".into(),
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
                series_tag_ids: None,
            },
        )
        .unwrap();
        let p = project(
            &mut c,
            projection_input(AnalyticsPeriodKind::Week, "2026-08-03", "2026-08-10"),
        )
        .unwrap();
        assert_eq!((p.task_count, p.scheduled_minutes), (2, 120));
    }
    #[test]
    fn stale_rows_rebuild_idempotently_and_query_plan_is_indexed() {
        let mut c = db();
        repository::create(
            &c,
            CreateTaskInput {
                title: "A".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let input = projection_input(AnalyticsPeriodKind::Month, "2026-08-15", "2026-09-01");
        let first = project(&mut c, input.clone()).unwrap();
        let second = project(&mut c, input).unwrap();
        assert_eq!(first.source_revision, second.source_revision);
        let plan:String=c.query_row("EXPLAIN QUERY PLAN SELECT * FROM tasks INDEXED BY tasks_by_date WHERE local_date BETWEEN '2026-08-01' AND '2026-08-31'",[],|r|r.get(3)).unwrap();
        assert!(plan.contains("tasks_by_date"));
    }
    #[test]
    fn completed_week_attainment_and_streaks_ignore_current_week() {
        let mut c = db();
        update_category_goals_at(
            &mut c,
            UpdateCategoryGoalsInput {
                category_id: "general".into(),
                weekly_minimum_minutes: Some(60),
                weekly_target_minutes: Some(120),
                expected_revision: 0,
                operation_id: "history-goal".into(),
                observed_local_date: "2026-07-20".into(),
            },
            NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        )
        .unwrap();
        for date in [
            "2026-07-20",
            "2026-07-21",
            "2026-07-27",
            "2026-07-28",
            "2026-08-03",
        ] {
            repository::create(
                &c,
                CreateTaskInput {
                    title: date.into(),
                    description: "".into(),
                    local_date: date.into(),
                    start_minute: 480,
                    end_minute: 540,
                    category_id: "general".into(),
                    priority: "medium".into(),
                    life_node_id: None,
                    tag_ids: vec![],
                },
            )
            .unwrap();
        }
        let p = project(
            &mut c,
            projection_input(AnalyticsPeriodKind::Year, "2026-01-01", "2026-08-05"),
        )
        .unwrap();
        let category = &p.categories[0];
        assert_eq!(category.minimum_week_count, 2);
        assert_eq!(category.target_week_count, 2);
        let minimum = p
            .streaks
            .iter()
            .find(|s| s.threshold_kind == "minimum")
            .unwrap();
        assert_eq!((minimum.current_length, minimum.longest_length), (2, 2));
    }
    #[test]
    fn injected_rebuild_failure_preserves_raw_authority() {
        let mut c = db();
        repository::create(
            &c,
            CreateTaskInput {
                title: "Raw".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        c.execute_batch("CREATE TRIGGER fail_aggregate BEFORE INSERT ON analytics_period_aggregates BEGIN SELECT RAISE(ABORT,'injected'); END;").unwrap();
        assert!(
            project(
                &mut c,
                projection_input(AnalyticsPeriodKind::Week, "2026-08-03", "2026-08-10")
            )
            .is_err()
        );
        assert_eq!(repository::list(&c, "2026-08-03").unwrap().len(), 1);
    }

    #[test]
    fn configured_category_without_tasks_reports_zero_progress_and_shortfall() {
        let mut c = db();
        goal(&mut c, 60, 120);
        let p = project(
            &mut c,
            projection_input(AnalyticsPeriodKind::Week, "2026-08-03", "2026-08-05"),
        )
        .unwrap();
        assert_eq!(p.task_count, 0);
        assert_eq!(p.categories.len(), 1);
        let category = &p.categories[0];
        assert_eq!(category.scheduled_minutes, 0);
        assert_eq!(category.minimum_shortfall_minutes, 60);
        assert_eq!(category.target_shortfall_minutes, 120);
    }

    #[test]
    fn goal_changes_are_prospective_from_the_current_week() {
        let mut c = db();
        update_category_goals_at(
            &mut c,
            UpdateCategoryGoalsInput {
                category_id: "general".into(),
                weekly_minimum_minutes: Some(60),
                weekly_target_minutes: Some(120),
                expected_revision: 0,
                operation_id: "goal-first".into(),
                observed_local_date: "2026-07-20".into(),
            },
            NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        )
        .unwrap();
        update_category_goals_at(
            &mut c,
            UpdateCategoryGoalsInput {
                category_id: "general".into(),
                weekly_minimum_minutes: Some(180),
                weekly_target_minutes: Some(240),
                expected_revision: 1,
                operation_id: "goal-second".into(),
                observed_local_date: "2026-08-03".into(),
            },
            NaiveDate::from_ymd_opt(2026, 8, 3).unwrap(),
        )
        .unwrap();
        let historical =
            goals_for_week(&c, "general", NaiveDate::from_ymd_opt(2026, 7, 27).unwrap())
                .unwrap()
                .unwrap();
        let current = goals_for_week(&c, "general", NaiveDate::from_ymd_opt(2026, 8, 3).unwrap())
            .unwrap()
            .unwrap();
        assert_eq!((historical.minimum, historical.target), (60, 120));
        assert_eq!((current.minimum, current.target), (180, 240));
    }

    #[test]
    fn period_boundaries_cover_leap_month_and_year_crossover() {
        assert_eq!(
            period_bounds(
                &AnalyticsPeriodKind::Month,
                NaiveDate::from_ymd_opt(2024, 2, 15).unwrap()
            ),
            (
                NaiveDate::from_ymd_opt(2024, 2, 1).unwrap(),
                NaiveDate::from_ymd_opt(2024, 2, 29).unwrap()
            )
        );
        assert_eq!(
            period_bounds(
                &AnalyticsPeriodKind::Year,
                NaiveDate::from_ymd_opt(2026, 12, 31).unwrap()
            ),
            (
                NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
                NaiveDate::from_ymd_opt(2026, 12, 31).unwrap()
            )
        );
        assert_eq!(
            period_bounds(
                &AnalyticsPeriodKind::Week,
                NaiveDate::from_ymd_opt(2027, 1, 1).unwrap()
            ),
            (
                NaiveDate::from_ymd_opt(2026, 12, 28).unwrap(),
                NaiveDate::from_ymd_opt(2027, 1, 3).unwrap()
            )
        );
    }

    #[test]
    fn every_committed_task_evaluation_and_recurrence_mutation_bumps_once() {
        let mut c = db();
        let mut expected = revision(&c);
        let task = repository::create(
            &c,
            CreateTaskInput {
                title: "One".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);
        repository::update(
            &c,
            UpdateTaskInput {
                id: task.id.clone(),
                title: "One updated".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);
        evaluation::evaluate_at(
            &mut c,
            EvaluateTaskInput {
                subject_kind: "one_off".into(),
                task_id: Some(task.id.clone()),
                series_id: None,
                original_local_date: None,
                state_id: "completion-met".into(),
                operation_id: "revision-evaluation".into(),
                observed_local_date: "2026-08-04".into(),
                observed_local_minute: 600,
            },
            ObservedLocalTime {
                date: "2026-08-04".into(),
                minute: 600,
            },
        )
        .unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);
        evaluation::undo(&mut c, "revision-evaluation").unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);
        repository::delete(&c, &task.id).unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);

        let series = repository::create_recurring(
            &mut c,
            CreateRecurringTaskInput {
                title: "Series".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 600,
                end_minute: 660,
                category_id: "general".into(),
                priority: "medium".into(),
                frequency: "weekly".into(),
                interval: 1,
                weekdays: vec![0],
                until: None,
                count: Some(3),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);
        repository::update_recurring(
            &mut c,
            UpdateRecurringOccurrenceInput {
                series_id: series,
                original_local_date: "2026-08-03".into(),
                replacement_local_date: None,
                title: Some("Series updated".into()),
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
                series_tag_ids: None,
            },
        )
        .unwrap();
        expected += 1;
        assert_eq!(revision(&c), expected);
    }

    #[test]
    fn month_and_year_aggregate_bounded_recurring_occurrences() {
        let mut c = db();
        repository::create_recurring(
            &mut c,
            CreateRecurringTaskInput {
                title: "Month edge".into(),
                description: "".into(),
                local_date: "2026-12-31".into(),
                start_minute: 600,
                end_minute: 660,
                category_id: "general".into(),
                priority: "medium".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: None,
                count: Some(2),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let december = project(
            &mut c,
            projection_input(AnalyticsPeriodKind::Month, "2026-12-15", "2027-01-02"),
        )
        .unwrap();
        let next_year = project(
            &mut c,
            projection_input(AnalyticsPeriodKind::Year, "2027-01-01", "2027-01-02"),
        )
        .unwrap();
        assert_eq!((december.task_count, next_year.task_count), (1, 1));
        assert_eq!(
            (december.scheduled_minutes, next_year.scheduled_minutes),
            (60, 60)
        );
    }

    #[test]
    fn observation_clock_changes_refresh_missed_counts_and_reject_spoofed_time() {
        let mut c = db();
        repository::create(
            &c,
            CreateTaskInput {
                title: "Clock boundary".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let make_input = |minute| AnalyticsProjectionInput {
            period_kind: AnalyticsPeriodKind::Week,
            anchor_local_date: "2026-08-03".into(),
            observed_local_date: "2026-08-03".into(),
            observed_local_minute: minute,
        };
        let date = NaiveDate::from_ymd_opt(2026, 8, 3).unwrap();
        let before = projection_at(&mut c, make_input(500), date, 500).unwrap();
        assert_eq!(before.missed_count, 0);
        let after = projection_at(&mut c, make_input(600), date, 600).unwrap();
        assert_eq!(after.missed_count, 1);
        let spoofed = AnalyticsProjectionInput {
            observed_local_date: "2026-08-04".into(),
            ..make_input(600)
        };
        assert!(matches!(
            projection_at(&mut c, spoofed, date, 600),
            Err(TaskError::Validation(_))
        ));
    }

    #[test]
    fn file_reopen_preserves_goals_and_rebuilds_missing_derived_rows() {
        let path = std::env::temp_dir().join(format!(
            "lifeweave_analytics_reopen_{}_{}.db",
            std::process::id(),
            timestamp()
        ));
        let mut c = open_file_connection(&path).unwrap();
        run_migrations(&mut c).unwrap();
        goal(&mut c, 90, 180);
        repository::create(
            &c,
            CreateTaskInput {
                title: "Persistent raw authority".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 600,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let input = projection_input(AnalyticsPeriodKind::Week, "2026-08-03", "2026-08-10");
        assert_eq!(
            project(&mut c, input.clone()).unwrap().scheduled_minutes,
            120
        );
        drop(c);

        let mut reopened = open_file_connection(&path).unwrap();
        run_migrations(&mut reopened).unwrap();
        reopened
            .execute("DELETE FROM analytics_period_aggregates", [])
            .unwrap();
        reopened
            .execute("DELETE FROM analytics_category_aggregates", [])
            .unwrap();
        let rebuilt = project(&mut reopened, input).unwrap();
        assert_eq!(rebuilt.scheduled_minutes, 120);
        assert_eq!(rebuilt.categories[0].weekly_minimum_minutes, Some(90));
        drop(reopened);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }
}
