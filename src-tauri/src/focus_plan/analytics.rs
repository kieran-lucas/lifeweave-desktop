//! Focus Plan activity Analytics (ADR 0043).
//!
//! This module is a bounded, read-only projection of authority that already exists elsewhere. It
//! summarizes current Plan-linked scheduled work, existing evaluation facts, manual review dates,
//! and completed one-off actual-time sessions. It writes nothing, stores no aggregate, assigns no
//! work to phases, and deliberately produces no percentage, score, health signal, or completion
//! inference — those remain prohibited.
//!
//! Attribution is always *current*: a work item's Plan comes from `tasks.focus_plan_id` or its
//! authoritative series' `task_series.focus_plan_id` at read time. Relinking therefore changes what
//! a past period reports, because Lifeweave stores no historical Plan-link snapshot.

use std::collections::BTreeMap;

use chrono::{Local, NaiveDate, Timelike};
use rusqlite::{Connection, params, params_from_iter};

use super::{
    dto::{
        FocusPlanAnalyticsInput, FocusPlanAnalyticsPlanView, FocusPlanAnalyticsProjection,
        FocusPlanLifecycle,
    },
    repository::{FocusPlanError, lifecycle_from_db},
};
use crate::task::{
    analytics as task_analytics, domain::validate_date, dto::AnalyticsActualTimeSummaryView,
    repository::TaskError,
};

type Result<T> = std::result::Result<T, FocusPlanError>;

/// A period that qualifies more Plans than this is rejected rather than silently truncated: a
/// partial Plan list reads as "these are the Plans you worked on", which would be false.
pub const MAX_FOCUS_PLAN_ANALYTICS_ROWS: usize = 500;

/// Completed sessions on Plan-linked one-off Tasks only. Recurring occurrences cannot own a
/// session at all (ADR 0037), so the recurring case needs no exclusion clause here — there is
/// nothing to exclude.
const PLAN_ACTUAL_TIME_QUERY: &str = "
    SELECT t.focus_plan_id,t.start_minute,t.end_minute,
           SUM(s.ended_at_ms-s.started_at_ms),COUNT(*)
      FROM tasks AS t INDEXED BY tasks_by_date
      CROSS JOIN task_actual_time_sessions AS s INDEXED BY task_actual_time_by_task
     WHERE t.local_date BETWEEN ?1 AND ?2
       AND t.focus_plan_id IS NOT NULL
       AND s.task_id=t.id
       AND s.ended_at_ms IS NOT NULL
     GROUP BY t.focus_plan_id,t.id,t.start_minute,t.end_minute
     ORDER BY t.id";

/// `reviewed_local_date` is the user-selected review date and the only period authority;
/// `created_at` records when the row was written and is deliberately not used here.
const PLAN_REVIEW_QUERY: &str = "
    SELECT plan_id,COUNT(*),MAX(reviewed_local_date)
      FROM focus_plan_reviews
     WHERE reviewed_local_date BETWEEN ?1 AND ?2
     GROUP BY plan_id";

fn map_task(error: TaskError) -> FocusPlanError {
    match error {
        TaskError::NotFound => FocusPlanError::NotFound,
        TaskError::Validation(message) => FocusPlanError::Validation(message.into()),
        TaskError::Conflict => {
            FocusPlanError::Validation("Focus Plan activity could not be projected".into())
        }
        TaskError::Db(error) => FocusPlanError::Db(error.into()),
    }
}

fn overflowed() -> FocusPlanError {
    FocusPlanError::Validation("Focus Plan activity totals overflowed".into())
}

/// Everything accumulated for one Plan before its stored metadata is attached.
#[derive(Default)]
struct Accumulator {
    scheduled_minutes: i64,
    one_off_task_count: u32,
    recurring_occurrence_count: u32,
    evaluated_count: u32,
    missed_count: u32,
    review_count: u32,
    latest_reviewed_local_date: Option<String>,
    actual_time: AnalyticsActualTimeSummaryView,
}

pub fn projection(
    conn: &Connection,
    input: FocusPlanAnalyticsInput,
) -> Result<FocusPlanAnalyticsProjection> {
    let now = Local::now();
    projection_at(
        conn,
        input,
        now.date_naive(),
        (now.hour() * 60 + now.minute()) as i32,
    )
}

fn projection_at(
    conn: &Connection,
    input: FocusPlanAnalyticsInput,
    authoritative_date: NaiveDate,
    authoritative_minute: i32,
) -> Result<FocusPlanAnalyticsProjection> {
    if !validate_date(&input.anchor_local_date)
        || !validate_date(&input.observed_local_date)
        || !(0..1440).contains(&input.observed_local_minute)
    {
        return Err(FocusPlanError::Validation(
            "Choose a valid Analytics period.".into(),
        ));
    }
    let anchor = task_analytics::parse_date(&input.anchor_local_date).map_err(map_task)?;
    let observed = task_analytics::parse_date(&input.observed_local_date).map_err(map_task)?;
    // Missed work depends on the observed minute, so a caller may not invent an observation.
    if observed != authoritative_date
        || (input.observed_local_minute - authoritative_minute).abs() > 1
    {
        return Err(FocusPlanError::Validation(
            "Refresh Analytics using the current local time.".into(),
        ));
    }
    let (start, end) = task_analytics::period_bounds(&input.period_kind, anchor);
    if (end - start).num_days() + 1 > task_analytics::MAX_ANALYTICS_DAYS {
        return Err(FocusPlanError::Validation(
            "Analytics period is too large.".into(),
        ));
    }

    let mut plans: BTreeMap<String, Accumulator> = BTreeMap::new();

    // (1) One Task-domain period work projection. Recurrence generation, moves, cancellations,
    // effective times, evaluation snapshots, and missed semantics are Objective Analytics'.
    for fact in task_analytics::focus_plan_work_facts(
        conn,
        start,
        end,
        observed,
        input.observed_local_minute,
    )
    .map_err(map_task)?
    {
        let entry = plans.entry(fact.plan_id).or_default();
        entry.scheduled_minutes = entry
            .scheduled_minutes
            .checked_add(i64::from(fact.scheduled_minutes))
            .ok_or_else(overflowed)?;
        let counter = if fact.recurring {
            &mut entry.recurring_occurrence_count
        } else {
            &mut entry.one_off_task_count
        };
        *counter = counter.checked_add(1).ok_or_else(overflowed)?;
        if fact.evaluated {
            entry.evaluated_count = entry
                .evaluated_count
                .checked_add(1)
                .ok_or_else(overflowed)?;
        }
        if fact.missed {
            entry.missed_count = entry.missed_count.checked_add(1).ok_or_else(overflowed)?;
        }
    }

    // (2) One grouped review read.
    let mut statement = conn.prepare(PLAN_REVIEW_QUERY)?;
    let reviews = statement
        .query_map(
            params![
                task_analytics::format_date(start),
                task_analytics::format_date(end)
            ],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, u32>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    for (plan_id, count, latest) in reviews {
        let entry = plans.entry(plan_id).or_default();
        entry.review_count = count;
        entry.latest_reviewed_local_date = latest;
    }

    // (3) One grouped completed one-off actual-time read, folded with unchanged ADR 0040
    // arithmetic so a Task reports the same recorded time in both Analytics sections.
    let mut statement = conn.prepare(PLAN_ACTUAL_TIME_QUERY)?;
    let sessions = statement
        .query_map(
            params![
                task_analytics::format_date(start),
                task_analytics::format_date(end)
            ],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                ))
            },
        )?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    for (plan_id, start_minute, end_minute, total_ms, session_count) in sessions {
        let summary = task_analytics::tracked_task_actual_time(
            start_minute,
            end_minute,
            total_ms,
            session_count,
        )
        .map_err(map_task)?;
        let entry = plans.entry(plan_id).or_default();
        task_analytics::add_actual_time(&mut entry.actual_time, &summary).map_err(map_task)?;
    }

    if plans.len() > MAX_FOCUS_PLAN_ANALYTICS_ROWS {
        return Err(FocusPlanError::Validation(format!(
            "This period has activity for more than {MAX_FOCUS_PLAN_ANALYTICS_ROWS} Focus Plans; choose a shorter period."
        )));
    }

    // (4) One batched Plan metadata read over exactly the qualifying identities.
    let ids: Vec<String> = plans.keys().cloned().collect();
    let metadata = load_plan_metadata(conn, &ids)?;

    let mut rows = Vec::with_capacity(plans.len());
    for (plan_id, entry) in plans {
        let (title, lifecycle, archived) = metadata
            .get(&plan_id)
            .cloned()
            .ok_or_else(|| FocusPlanError::Validation("Focus Plan data is unavailable".into()))?;
        rows.push(FocusPlanAnalyticsPlanView {
            plan_id,
            title,
            lifecycle,
            archived,
            scheduled_minutes: entry.scheduled_minutes,
            work_item_count: entry
                .one_off_task_count
                .checked_add(entry.recurring_occurrence_count)
                .ok_or_else(overflowed)?,
            one_off_task_count: entry.one_off_task_count,
            recurring_occurrence_count: entry.recurring_occurrence_count,
            evaluated_count: entry.evaluated_count,
            missed_count: entry.missed_count,
            review_count: entry.review_count,
            latest_reviewed_local_date: entry.latest_reviewed_local_date,
            actual_time: entry.actual_time,
        });
    }
    // Most linked scheduled time first, then most work, then a stable human order. `plan_id` is
    // unique, so the comparison is total and two runs can never disagree.
    rows.sort_by(|left, right| {
        right
            .scheduled_minutes
            .cmp(&left.scheduled_minutes)
            .then(right.work_item_count.cmp(&left.work_item_count))
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
            .then_with(|| left.plan_id.cmp(&right.plan_id))
    });

    let mut overall = FocusPlanAnalyticsProjection {
        period_start: task_analytics::format_date(start),
        period_end: task_analytics::format_date(end),
        plan_count: u32::try_from(rows.len()).map_err(|_| overflowed())?,
        scheduled_minutes: 0,
        work_item_count: 0,
        evaluated_count: 0,
        missed_count: 0,
        review_count: 0,
        actual_time: AnalyticsActualTimeSummaryView::default(),
        plans: Vec::new(),
    };
    for row in &rows {
        overall.scheduled_minutes = overall
            .scheduled_minutes
            .checked_add(row.scheduled_minutes)
            .ok_or_else(overflowed)?;
        overall.work_item_count = overall
            .work_item_count
            .checked_add(row.work_item_count)
            .ok_or_else(overflowed)?;
        overall.evaluated_count = overall
            .evaluated_count
            .checked_add(row.evaluated_count)
            .ok_or_else(overflowed)?;
        overall.missed_count = overall
            .missed_count
            .checked_add(row.missed_count)
            .ok_or_else(overflowed)?;
        overall.review_count = overall
            .review_count
            .checked_add(row.review_count)
            .ok_or_else(overflowed)?;
        task_analytics::add_actual_time(&mut overall.actual_time, &row.actual_time)
            .map_err(map_task)?;
    }
    overall.plans = rows;
    Ok(overall)
}

/// Archived, completed, and paused Plans stay visible with their factual current state, so this
/// read deliberately applies no lifecycle or archive filter.
fn load_plan_metadata(
    conn: &Connection,
    ids: &[String],
) -> Result<BTreeMap<String, (String, FocusPlanLifecycle, bool)>> {
    if ids.is_empty() {
        return Ok(BTreeMap::new());
    }
    let placeholders = std::iter::repeat_n("?", ids.len())
        .collect::<Vec<_>>()
        .join(",");
    let mut statement = conn.prepare(&format!(
        "SELECT id,title,lifecycle,archived_at IS NOT NULL FROM focus_plans WHERE id IN ({placeholders})"
    ))?;
    let rows = statement
        .query_map(params_from_iter(ids.iter()), |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, bool>(3)?,
            ))
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    let mut out = BTreeMap::new();
    for (id, title, lifecycle, archived) in rows {
        out.insert(id, (title, lifecycle_from_db(&lifecycle)?, archived));
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        focus_plan::{
            dto::{
                CreateFocusPlanInput, CreateFocusPlanReviewInput, FocusPlanMutationAction,
                MutateFocusPlanInput,
            },
            repository as plan_repository,
        },
        infrastructure::sqlite::{
            connection::open_memory_connection, task51_migration::run_all_migrations,
        },
        task::{
            actual_time,
            dto::{
                AnalyticsPeriodKind, AnalyticsProjectionInput, CreateRecurringTaskInput,
                CreateTaskInput, EvaluateTaskInput, OccurrenceEditScope,
                UpdateRecurringOccurrenceInput, UpdateTaskInput,
            },
            evaluation::{self, ObservedLocalTime},
            repository as task_repository,
        },
    };
    use rusqlite::OptionalExtension;

    const MONDAY: &str = "2026-08-03";

    fn db() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn plan(conn: &mut Connection, title: &str) -> String {
        plan_repository::create(
            conn,
            CreateFocusPlanInput {
                title: title.into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: String::new(),
                success_criteria: vec![],
                initial_variant_label: "Primary approach".into(),
                operation_id: format!("create-{title}"),
            },
        )
        .unwrap()
        .id
    }

    fn one_off(
        conn: &Connection,
        title: &str,
        date: &str,
        start: i32,
        end: i32,
        plan_id: Option<&str>,
    ) -> String {
        task_repository::create(
            conn,
            CreateTaskInput {
                title: title.into(),
                description: String::new(),
                local_date: date.into(),
                start_minute: start,
                end_minute: end,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                focus_plan_id: plan_id.map(str::to_string),
                deadline_local_date: None,
                tag_ids: vec![],
            },
        )
        .unwrap()
        .id
    }

    fn relink(
        conn: &Connection,
        task_id: &str,
        date: &str,
        start: i32,
        end: i32,
        plan: Option<&str>,
    ) {
        task_repository::update(
            conn,
            UpdateTaskInput {
                id: task_id.into(),
                title: "Relinked".into(),
                description: String::new(),
                local_date: date.into(),
                start_minute: start,
                end_minute: end,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                focus_plan_id: plan.map(str::to_string),
                deadline_local_date: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
    }

    fn daily_series(
        conn: &mut Connection,
        title: &str,
        start: i32,
        end: i32,
        count: i32,
        plan_id: Option<&str>,
    ) -> String {
        task_repository::create_recurring(
            conn,
            CreateRecurringTaskInput {
                title: title.into(),
                description: String::new(),
                local_date: MONDAY.into(),
                start_minute: start,
                end_minute: end,
                category_id: "general".into(),
                priority: "medium".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: None,
                count: Some(count),
                life_node_id: None,
                focus_plan_id: plan_id.map(str::to_string),
                tag_ids: vec![],
            },
        )
        .unwrap()
    }

    /// `OnlyThisOccurrence` rejects any Plan value other than the series' own, so an occurrence
    /// edit must carry the series relation forward unchanged.
    fn occurrence_edit(
        series_id: &str,
        original: &str,
        series_plan: &str,
    ) -> UpdateRecurringOccurrenceInput {
        UpdateRecurringOccurrenceInput {
            series_id: series_id.into(),
            original_local_date: original.into(),
            replacement_local_date: None,
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
            focus_plan_id: Some(series_plan.into()),
            series_tag_ids: None,
        }
    }

    fn evaluate_one_off(conn: &mut Connection, task_id: &str, observed: &str, operation: &str) {
        evaluation::evaluate_at(
            conn,
            EvaluateTaskInput {
                subject_kind: "one_off".into(),
                task_id: Some(task_id.into()),
                series_id: None,
                original_local_date: None,
                state_id: "completion-met".into(),
                operation_id: operation.into(),
                observed_local_date: observed.into(),
                observed_local_minute: 720,
            },
            ObservedLocalTime {
                date: observed.into(),
                minute: 720,
            },
        )
        .unwrap();
    }

    fn review(conn: &mut Connection, plan_id: &str, date: &str, operation: &str, reflection: &str) {
        plan_repository::create_review(
            conn,
            CreateFocusPlanReviewInput {
                plan_id: plan_id.into(),
                operation_id: operation.into(),
                reviewed_local_date: date.into(),
                reflection: reflection.into(),
                next_focus: Some("Private next focus".into()),
            },
        )
        .unwrap();
    }

    fn complete_segment(conn: &mut Connection, task_id: &str, operation: &str, from: i64, to: i64) {
        let started = actual_time::start_at(conn, task_id, operation, from).unwrap();
        actual_time::stop_at(conn, started.active_session_id.as_deref().unwrap(), to).unwrap();
    }

    fn project_at(
        conn: &Connection,
        kind: AnalyticsPeriodKind,
        anchor: &str,
        observed: &str,
    ) -> Result<FocusPlanAnalyticsProjection> {
        let observed_date = NaiveDate::parse_from_str(observed, "%Y-%m-%d").unwrap();
        super::projection_at(
            conn,
            FocusPlanAnalyticsInput {
                period_kind: kind,
                anchor_local_date: anchor.into(),
                observed_local_date: observed.into(),
                observed_local_minute: 720,
            },
            observed_date,
            720,
        )
    }

    fn week(conn: &Connection, observed: &str) -> FocusPlanAnalyticsProjection {
        project_at(conn, AnalyticsPeriodKind::Week, MONDAY, observed).unwrap()
    }

    fn row<'a>(
        projection: &'a FocusPlanAnalyticsProjection,
        plan_id: &str,
    ) -> Option<&'a FocusPlanAnalyticsPlanView> {
        projection.plans.iter().find(|row| row.plan_id == plan_id)
    }

    /// Every table that stores a Focus Plan relation. ADR 0031 fixes this set at exactly two, and
    /// Task 49 must not extend it with a reporting snapshot.
    fn tables_with_focus_plan_column(conn: &Connection) -> Vec<String> {
        let mut statement = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap();
        let names: Vec<String> = statement
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<std::result::Result<_, _>>()
            .unwrap();
        names
            .into_iter()
            .filter(|name| {
                let mut columns = conn.prepare(&format!("PRAGMA table_info({name})")).unwrap();
                columns
                    .query_map([], |row| row.get::<_, String>(1))
                    .unwrap()
                    .any(|column| column.unwrap() == "focus_plan_id")
            })
            .collect()
    }

    #[test]
    fn linked_one_off_contributes_to_its_current_plan_and_unlinked_work_does_not() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Linked");
        one_off(&conn, "Linked task", MONDAY, 480, 540, Some(&plan_id));
        one_off(&conn, "Unlinked task", MONDAY, 600, 660, None);

        let projection = week(&conn, "2026-08-10");
        assert_eq!(projection.plan_count, 1);
        assert_eq!(projection.work_item_count, 1);
        let linked = row(&projection, &plan_id).unwrap();
        assert_eq!(linked.one_off_task_count, 1);
        assert_eq!(linked.recurring_occurrence_count, 0);
        assert_eq!(linked.scheduled_minutes, 60);
        // The unlinked hour is real scheduled work; it simply belongs to no Plan.
        assert_eq!(projection.scheduled_minutes, 60);
    }

    #[test]
    fn relinking_moves_historical_attribution_and_stores_no_snapshot() {
        let mut conn = db();
        let first = plan(&mut conn, "First");
        let second = plan(&mut conn, "Second");
        let task = one_off(&conn, "Movable", MONDAY, 480, 540, Some(&first));

        let before = week(&conn, "2026-08-10");
        assert_eq!(row(&before, &first).unwrap().work_item_count, 1);
        assert!(row(&before, &second).is_none());

        relink(&conn, &task, MONDAY, 480, 540, Some(&second));

        // The *historical* period now reports the new Plan, because the current relationship is
        // the only attribution authority there is.
        let after = week(&conn, "2026-08-10");
        assert!(row(&after, &first).is_none());
        assert_eq!(row(&after, &second).unwrap().work_item_count, 1);
        assert_eq!(
            tables_with_focus_plan_column(&conn),
            vec!["task_series".to_string(), "tasks".to_string()]
        );
    }

    #[test]
    fn occurrence_override_and_evaluation_rows_never_own_a_plan_relation() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Recurring");
        let series = daily_series(&mut conn, "Daily", 480, 540, 3, Some(&plan_id));
        let mut moved = occurrence_edit(&series, "2026-08-04", &plan_id);
        moved.replacement_local_date = Some("2026-08-06".into());
        task_repository::update_recurring(&mut conn, moved).unwrap();
        evaluation::evaluate_at(
            &mut conn,
            EvaluateTaskInput {
                subject_kind: "recurring".into(),
                task_id: None,
                series_id: Some(series.clone()),
                original_local_date: Some(MONDAY.into()),
                state_id: "completion-met".into(),
                operation_id: "recurring-evaluation".into(),
                observed_local_date: "2026-08-10".into(),
                observed_local_minute: 720,
            },
            ObservedLocalTime {
                date: "2026-08-10".into(),
                minute: 720,
            },
        )
        .unwrap();

        assert_eq!(
            tables_with_focus_plan_column(&conn),
            vec!["task_series".to_string(), "tasks".to_string()]
        );
        let projection = week(&conn, "2026-08-10");
        let linked = row(&projection, &plan_id).unwrap();
        assert_eq!(linked.recurring_occurrence_count, 3);
        assert_eq!(linked.one_off_task_count, 0);
        assert_eq!(linked.evaluated_count, 1);
    }

    #[test]
    fn recurring_cancellation_and_scope_edits_follow_existing_recurrence_authority() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Scoped");
        let other = plan(&mut conn, "Future segment");
        let series = daily_series(&mut conn, "Daily", 480, 540, 4, Some(&plan_id));

        let mut cancelled = occurrence_edit(&series, "2026-08-04", &plan_id);
        cancelled.cancelled = true;
        task_repository::update_recurring(&mut conn, cancelled).unwrap();

        let after_cancel = week(&conn, "2026-08-10");
        assert_eq!(row(&after_cancel, &plan_id).unwrap().work_item_count, 3);

        // A ThisAndFuture split mints a new series that owns its own relation; the old series keeps
        // its own. Neither series inherits the other's Plan.
        let mut split = occurrence_edit(&series, "2026-08-06", &plan_id);
        split.scope = OccurrenceEditScope::ThisAndFuture;
        split.focus_plan_id = Some(other.clone());
        task_repository::update_recurring(&mut conn, split).unwrap();

        // The old series keeps 08-03 and 08-05 (08-04 stays cancelled). The new future series
        // carries the rule forward from 08-06 and reports against the Plan chosen for that segment
        // alone. Task 49 asserts whatever the existing split authority generates, not its own
        // count: the point is that neither segment inherits the other's Plan.
        let after_split = week(&conn, "2026-08-10");
        assert_eq!(row(&after_split, &plan_id).unwrap().work_item_count, 2);
        assert_eq!(row(&after_split, &other).unwrap().work_item_count, 4);

        let objective = crate::task::analytics::projection_at(
            &mut conn,
            AnalyticsProjectionInput {
                period_kind: AnalyticsPeriodKind::Week,
                anchor_local_date: MONDAY.into(),
                observed_local_date: "2026-08-10".into(),
                observed_local_minute: 720,
            },
            NaiveDate::from_ymd_opt(2026, 8, 10).unwrap(),
            720,
        )
        .unwrap();
        // Every generated occurrence is linked, so the two projections must agree exactly.
        assert_eq!(after_split.work_item_count as i32, objective.task_count);
        assert_eq!(
            after_split.scheduled_minutes,
            objective.scheduled_minutes as i64
        );
    }

    #[test]
    fn entire_series_relinking_reattributes_every_generated_occurrence() {
        let mut conn = db();
        let original = plan(&mut conn, "Original");
        let replacement = plan(&mut conn, "Replacement");
        let series = daily_series(&mut conn, "Daily", 480, 540, 3, Some(&original));

        let mut whole = occurrence_edit(&series, MONDAY, &original);
        whole.scope = OccurrenceEditScope::EntireSeries;
        whole.focus_plan_id = Some(replacement.clone());
        whole.series_tag_ids = Some(vec![]);
        task_repository::update_recurring(&mut conn, whole).unwrap();

        let projection = week(&conn, "2026-08-10");
        assert!(row(&projection, &original).is_none());
        assert_eq!(
            row(&projection, &replacement)
                .unwrap()
                .recurring_occurrence_count,
            3
        );
    }

    #[test]
    fn evaluated_missed_and_future_semantics_match_objective_analytics() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "States");
        let evaluated = one_off(&conn, "Evaluated", MONDAY, 480, 540, Some(&plan_id));
        one_off(&conn, "Missed", "2026-08-04", 480, 540, Some(&plan_id));
        one_off(&conn, "Future", "2026-08-07", 480, 540, Some(&plan_id));
        evaluate_one_off(&mut conn, &evaluated, "2026-08-05", "state-evaluation");

        let projection =
            project_at(&conn, AnalyticsPeriodKind::Week, MONDAY, "2026-08-05").unwrap();
        let row = row(&projection, &plan_id).unwrap();
        assert_eq!((row.evaluated_count, row.missed_count), (1, 1));
        assert_eq!(row.work_item_count, 3);

        let objective = crate::task::analytics::projection_at(
            &mut conn,
            AnalyticsProjectionInput {
                period_kind: AnalyticsPeriodKind::Week,
                anchor_local_date: MONDAY.into(),
                observed_local_date: "2026-08-05".into(),
                observed_local_minute: 720,
            },
            NaiveDate::from_ymd_opt(2026, 8, 5).unwrap(),
            720,
        )
        .unwrap();
        assert_eq!(
            (objective.evaluated_count, objective.missed_count),
            (row.evaluated_count as i32, row.missed_count as i32)
        );
        assert_eq!(objective.period_start, projection.period_start);
        assert_eq!(objective.period_end, projection.period_end);
    }

    #[test]
    fn reviews_use_the_review_date_count_independently_and_expose_no_content() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Reviewed");
        review(
            &mut conn,
            &plan_id,
            "2026-08-05",
            "review-a",
            "First reflection",
        );
        review(
            &mut conn,
            &plan_id,
            "2026-08-05",
            "review-b",
            "Second reflection",
        );
        review(
            &mut conn,
            &plan_id,
            "2026-08-20",
            "review-c",
            "Out of period",
        );

        let projection = week(&conn, "2026-08-25");
        let row = row(&projection, &plan_id).unwrap();
        // Two same-date reviews are two reviews; the out-of-period one is absent even though every
        // row was created in the same instant, because `created_at` is not period authority.
        assert_eq!(row.review_count, 2);
        assert_eq!(
            row.latest_reviewed_local_date.as_deref(),
            Some("2026-08-05")
        );
        assert_eq!(row.work_item_count, 0);
        assert_eq!(projection.review_count, 2);

        let serialized = serde_json::to_string(&projection).unwrap();
        assert!(!serialized.contains("reflection"));
        assert!(!serialized.contains("First reflection"));
        assert!(!serialized.contains("Private next focus"));
    }

    #[test]
    fn completed_one_off_sessions_contribute_while_running_sessions_do_not() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Tracked");
        let tracked = one_off(&conn, "Tracked", MONDAY, 480, 540, Some(&plan_id));
        let running = one_off(&conn, "Running", "2026-08-04", 480, 540, Some(&plan_id));

        // Two sub-second segments sum to 1.2s and floor once, exactly as Task 46 requires.
        complete_segment(&mut conn, &tracked, "floor-a", 1_000_000, 1_000_600);
        complete_segment(&mut conn, &tracked, "floor-b", 2_000_000, 2_000_600);
        actual_time::start_at(&mut conn, &running, "still-running", 3_000_000).unwrap();

        let projection = week(&conn, "2026-08-10");
        let row = row(&projection, &plan_id).unwrap();
        assert_eq!(
            row.actual_time,
            AnalyticsActualTimeSummaryView {
                actual_seconds: 1,
                tracked_scheduled_seconds: 3_600,
                tracked_task_count: 1,
                completed_session_count: 2,
                variance_seconds: -3_599,
            }
        );
    }

    #[test]
    fn recurring_work_never_enters_the_actual_time_denominator() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Mixed");
        daily_series(&mut conn, "Daily", 600, 660, 3, Some(&plan_id));
        let tracked = one_off(&conn, "Tracked", MONDAY, 480, 540, Some(&plan_id));
        complete_segment(&mut conn, &tracked, "tracked", 1_000, 61_000);

        let projection = week(&conn, "2026-08-10");
        let row = row(&projection, &plan_id).unwrap();
        assert_eq!(row.recurring_occurrence_count, 3);
        assert_eq!(row.work_item_count, 4);
        // Three recurring hours are scheduled but only the one-off hour can be tracked at all.
        assert_eq!(row.scheduled_minutes, 240);
        assert_eq!(row.actual_time.tracked_task_count, 1);
        assert_eq!(row.actual_time.tracked_scheduled_seconds, 3_600);
        assert_eq!(row.actual_time.actual_seconds, 60);
    }

    #[test]
    fn relinking_moves_recorded_actual_time_between_plans() {
        let mut conn = db();
        let first = plan(&mut conn, "First");
        let second = plan(&mut conn, "Second");
        let task = one_off(&conn, "Tracked", MONDAY, 480, 540, Some(&first));
        complete_segment(&mut conn, &task, "tracked", 1_000, 121_000);

        assert_eq!(
            row(&week(&conn, "2026-08-10"), &first)
                .unwrap()
                .actual_time
                .actual_seconds,
            120
        );
        relink(&conn, &task, MONDAY, 480, 540, Some(&second));
        let after = week(&conn, "2026-08-10");
        assert!(row(&after, &first).is_none());
        assert_eq!(
            row(&after, &second).unwrap().actual_time.actual_seconds,
            120
        );
        // Attribution moved without rewriting the immutable session row.
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM task_actual_time_sessions WHERE task_id=?1",
                params![task],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn overall_totals_are_the_exact_sums_of_the_plan_rows() {
        let mut conn = db();
        let first = plan(&mut conn, "First");
        let second = plan(&mut conn, "Second");
        let evaluated = one_off(&conn, "Evaluated", MONDAY, 480, 540, Some(&first));
        one_off(&conn, "Missed", "2026-08-04", 480, 540, Some(&first));
        daily_series(&mut conn, "Daily", 600, 660, 2, Some(&second));
        let tracked = one_off(&conn, "Tracked", "2026-08-05", 480, 540, Some(&second));
        complete_segment(&mut conn, &tracked, "tracked", 1_000, 31_000);
        evaluate_one_off(&mut conn, &evaluated, "2026-08-06", "sum-evaluation");
        review(&mut conn, &first, "2026-08-06", "sum-review", "Reflection");

        let projection =
            project_at(&conn, AnalyticsPeriodKind::Week, MONDAY, "2026-08-06").unwrap();
        assert_eq!(projection.plan_count as usize, projection.plans.len());
        assert_eq!(
            projection.scheduled_minutes,
            projection
                .plans
                .iter()
                .map(|row| row.scheduled_minutes)
                .sum::<i64>()
        );
        for row in &projection.plans {
            assert_eq!(
                row.work_item_count,
                row.one_off_task_count + row.recurring_occurrence_count
            );
        }
        assert_eq!(
            projection.work_item_count,
            projection
                .plans
                .iter()
                .map(|row| row.work_item_count)
                .sum::<u32>()
        );
        assert_eq!(
            projection.evaluated_count,
            projection
                .plans
                .iter()
                .map(|row| row.evaluated_count)
                .sum::<u32>()
        );
        assert_eq!(
            projection.missed_count,
            projection
                .plans
                .iter()
                .map(|row| row.missed_count)
                .sum::<u32>()
        );
        assert_eq!(
            projection.review_count,
            projection
                .plans
                .iter()
                .map(|row| row.review_count)
                .sum::<u32>()
        );
        assert_eq!(
            projection.actual_time.actual_seconds,
            projection
                .plans
                .iter()
                .map(|row| row.actual_time.actual_seconds)
                .sum::<i64>()
        );
        assert_eq!(
            projection.actual_time.variance_seconds,
            projection.actual_time.actual_seconds
                - projection.actual_time.tracked_scheduled_seconds
        );
    }

    #[test]
    fn archived_and_completed_plans_with_activity_stay_visible_but_idle_plans_do_not() {
        let mut conn = db();
        let archived = plan(&mut conn, "Archived");
        let completed = plan(&mut conn, "Completed");
        let idle = plan(&mut conn, "Idle");
        one_off(&conn, "Archived work", MONDAY, 480, 540, Some(&archived));
        one_off(&conn, "Completed work", MONDAY, 600, 660, Some(&completed));

        plan_repository::mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: completed.clone(),
                expected_revision: 0,
                operation_id: "complete-plan".into(),
                mutation: FocusPlanMutationAction::UpdatePlan {
                    title: "Completed".into(),
                    lifecycle: FocusPlanLifecycle::Completed,
                    life_node_id: None,
                    start_date: None,
                    target_date: None,
                    outcome: String::new(),
                    success_criteria: vec![],
                    tag_ids: vec![],
                },
            },
        )
        .unwrap();
        plan_repository::mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: archived.clone(),
                expected_revision: 0,
                operation_id: "archive-plan".into(),
                mutation: FocusPlanMutationAction::ArchivePlan,
            },
        )
        .unwrap();

        let projection = week(&conn, "2026-08-10");
        assert_eq!(projection.plan_count, 2);
        assert!(row(&projection, &idle).is_none());
        assert!(row(&projection, &archived).unwrap().archived);
        assert_eq!(
            row(&projection, &completed).unwrap().lifecycle,
            FocusPlanLifecycle::Completed
        );
        assert!(!row(&projection, &completed).unwrap().archived);
    }

    #[test]
    fn ordering_is_deterministic_across_time_work_title_and_identity() {
        let mut conn = db();
        let big = plan(&mut conn, "Big");
        let two_items = plan(&mut conn, "Two items");
        let one_item = plan(&mut conn, "One item");
        let beta = plan(&mut conn, "beta");
        let alpha = plan(&mut conn, "Alpha");

        one_off(&conn, "Big work", MONDAY, 480, 660, Some(&big));
        one_off(&conn, "Two a", MONDAY, 660, 690, Some(&two_items));
        one_off(&conn, "Two b", MONDAY, 690, 720, Some(&two_items));
        one_off(&conn, "One", MONDAY, 720, 780, Some(&one_item));
        // Equal scheduled minutes and equal work counts, so only case-insensitive title decides.
        one_off(&conn, "Beta work", "2026-08-04", 480, 540, Some(&beta));
        one_off(&conn, "Alpha work", "2026-08-04", 540, 600, Some(&alpha));

        let projection = week(&conn, "2026-08-10");
        let order: Vec<&str> = projection
            .plans
            .iter()
            .map(|row| row.title.as_str())
            .collect();
        // 180 minutes outranks every 60-minute Plan; among those, two work items outrank one; the
        // remaining ties fall to case-insensitive title, so lowercase `beta` sorts after `Alpha`.
        assert_eq!(order, vec!["Big", "Two items", "Alpha", "beta", "One item"]);
        // A second read of the same period returns the same order.
        assert_eq!(week(&conn, "2026-08-10").plans, projection.plans);
    }

    #[test]
    fn more_than_the_maximum_qualifying_plans_is_rejected_rather_than_truncated() {
        let mut conn = db();
        let transaction = conn.transaction().unwrap();
        for index in 0..=MAX_FOCUS_PLAN_ANALYTICS_ROWS {
            let plan_id = format!("plan-{index:04}");
            let variant_id = format!("variant-{index:04}");
            transaction.execute(
                "INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at) VALUES(?1,?2,?3,'active','','[]',0,'now','now')",
                params![plan_id, variant_id, format!("Plan {index:04}")],
            )
            .unwrap();
            transaction.execute(
                "INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at) VALUES(?1,?2,'A','{\"type\":\"doc\",\"content\":[]}','',0,'now','now')",
                params![variant_id, plan_id],
            )
            .unwrap();
            transaction.execute(
                "INSERT INTO focus_plan_reviews(id,plan_id,operation_id,reviewed_local_date,reflection,next_focus,created_at) VALUES(?1,?2,?3,?4,'Reflection',NULL,'now')",
                params![format!("review-{index:04}"), plan_id, format!("op-{index:04}"), MONDAY],
            )
            .unwrap();
        }
        transaction.commit().unwrap();

        let error = project_at(&conn, AnalyticsPeriodKind::Week, MONDAY, "2026-08-10").unwrap_err();
        assert!(matches!(error, FocusPlanError::Validation(_)));

        conn.execute(
            "DELETE FROM focus_plan_reviews WHERE plan_id=?1",
            params![format!("plan-{MAX_FOCUS_PLAN_ANALYTICS_ROWS:04}")],
        )
        .unwrap();
        let projection = week(&conn, "2026-08-10");
        assert_eq!(
            projection.plan_count as usize,
            MAX_FOCUS_PLAN_ANALYTICS_ROWS
        );
    }

    #[test]
    fn period_bounds_and_span_limits_match_objective_analytics() {
        let mut conn = db();
        let plan_id = plan(&mut conn, "Bounds");
        one_off(&conn, "Inside", "2026-08-09", 480, 540, Some(&plan_id));
        one_off(&conn, "Outside", "2026-08-10", 480, 540, Some(&plan_id));

        let week = week(&conn, "2026-08-31");
        assert_eq!(
            (week.period_start.as_str(), week.period_end.as_str()),
            (MONDAY, "2026-08-09")
        );
        assert_eq!(week.work_item_count, 1);

        let month = project_at(
            &conn,
            AnalyticsPeriodKind::Month,
            "2026-08-15",
            "2026-09-05",
        )
        .unwrap();
        assert_eq!(
            (month.period_start.as_str(), month.period_end.as_str()),
            ("2026-08-01", "2026-08-31")
        );
        assert_eq!(month.work_item_count, 2);

        let year =
            project_at(&conn, AnalyticsPeriodKind::Year, "2026-03-01", "2027-01-04").unwrap();
        assert_eq!(
            (year.period_start.as_str(), year.period_end.as_str()),
            ("2026-01-01", "2026-12-31")
        );

        // Observation must be the real current local time, exactly as Objective Analytics requires.
        assert!(
            project_at(&conn, AnalyticsPeriodKind::Week, MONDAY, "2026-08-10")
                .map(|_| ())
                .is_ok()
        );
        assert!(
            super::projection_at(
                &conn,
                FocusPlanAnalyticsInput {
                    period_kind: AnalyticsPeriodKind::Week,
                    anchor_local_date: MONDAY.into(),
                    observed_local_date: "2026-08-10".into(),
                    observed_local_minute: 720,
                },
                NaiveDate::from_ymd_opt(2026, 8, 11).unwrap(),
                720,
            )
            .is_err()
        );
    }

    #[test]
    fn schema_stays_at_twenty_eight_with_no_persistent_plan_analytics_table() {
        let conn = db();
        assert_eq!(
            crate::infrastructure::sqlite::task51_migration::current_schema_version(&conn).unwrap(),
            28
        );
        let existing: Option<String> = conn
            .query_row(
                "SELECT name FROM sqlite_master WHERE type IN ('table','view') \
                 AND name LIKE '%focus_plan%' AND name LIKE '%analytic%'",
                [],
                |row| row.get(0),
            )
            .optional()
            .unwrap();
        assert_eq!(existing, None);
        assert_eq!(
            tables_with_focus_plan_column(&conn),
            vec!["task_series".to_string(), "tasks".to_string()]
        );
    }
}
