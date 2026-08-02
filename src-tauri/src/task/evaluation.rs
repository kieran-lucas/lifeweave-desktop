use std::collections::HashMap;

use chrono::{Datelike, Local, Timelike};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use uuid::{NoContext, Timestamp, Uuid};

use super::{
    domain::validate_date,
    dto::{CompletionStateView, EvaluateTaskInput, TaskEvaluationView},
    repository::{self, TaskError},
};

pub(crate) type EvaluationsForDate = (
    HashMap<String, TaskEvaluationView>,
    HashMap<(String, String), TaskEvaluationView>,
);

#[derive(Clone, Debug, PartialEq, Eq)]
struct Subject {
    kind: &'static str,
    task_id: Option<String>,
    series_id: Option<String>,
    original_local_date: Option<String>,
}

#[derive(Clone, Debug)]
pub(crate) struct ObservedLocalTime {
    pub date: String,
    pub minute: i32,
}

fn now_id() -> String {
    Uuid::new_v7(Timestamp::now(NoContext)).to_string()
}

fn timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

pub fn list_states(conn: &Connection) -> Result<Vec<CompletionStateView>, TaskError> {
    let mut statement = conn.prepare("SELECT id,internal_key,label,sort_key,visual_token FROM completion_states WHERE archived_at IS NULL ORDER BY sort_key,id")?;
    Ok(statement
        .query_map([], |row| {
            Ok(CompletionStateView {
                id: row.get(0)?,
                internal_key: row.get(1)?,
                label: row.get(2)?,
                sort_key: row.get(3)?,
                visual_token: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}

pub fn evaluate(
    conn: &mut Connection,
    input: EvaluateTaskInput,
) -> Result<TaskEvaluationView, TaskError> {
    let now = Local::now();
    evaluate_at(
        conn,
        input,
        ObservedLocalTime {
            date: format!("{:04}-{:02}-{:02}", now.year(), now.month(), now.day()),
            minute: (now.hour() * 60 + now.minute()) as i32,
        },
    )
}

pub(crate) fn evaluate_at(
    conn: &mut Connection,
    input: EvaluateTaskInput,
    authoritative_now: ObservedLocalTime,
) -> Result<TaskEvaluationView, TaskError> {
    validate_operation_id(&input.operation_id)?;
    let subject = parse_subject(&input)?;
    let tx = conn.transaction()?;

    if let Some(existing) = operation_subject(&tx, &input.operation_id)? {
        if existing.0 != subject {
            return Err(TaskError::Validation(
                "Operation identity does not match this task.",
            ));
        }
        if existing.2 {
            return Err(TaskError::Validation(
                "This evaluation operation has already been undone.",
            ));
        }
        let result = evaluation_by_id(&tx, &existing.1)?;
        if result.state_id != input.state_id {
            return Err(TaskError::Validation(
                "Operation identity does not match this assessment.",
            ));
        }
        tx.commit()?;
        return Ok(result);
    }

    validate_clock(&input, &authoritative_now)?;
    let (_, scheduled_date, end_minute) = resolve_subject(&tx, &subject)?;
    if scheduled_date > authoritative_now.date
        || (scheduled_date == authoritative_now.date && end_minute > authoritative_now.minute)
    {
        return Err(TaskError::Validation(
            "This task can only be assessed after it ends.",
        ));
    }

    let state: (String, i32, String) = tx
        .query_row(
            "SELECT label,hidden_value_bp,visual_token FROM completion_states WHERE id=?1 AND archived_at IS NULL",
            params![input.state_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?
        .ok_or(TaskError::Validation("Choose an active completion state."))?;

    let previous = current_id(&tx, &subject)?;
    set_current(&tx, &subject, false)?;
    let evaluation_id = now_id();
    let evaluated_at = timestamp();
    tx.execute(
        "INSERT INTO task_evaluations(id,subject_kind,task_id,series_id,original_local_date,state_id,state_label_snapshot,state_value_bp_snapshot,state_visual_snapshot,evaluated_at,operation_id,supersedes_evaluation_id,is_current) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,1)",
        params![evaluation_id,subject.kind,subject.task_id,subject.series_id,subject.original_local_date,input.state_id,state.0,state.1,state.2,evaluated_at,input.operation_id,previous],
    )?;
    tx.execute(
        "INSERT INTO evaluation_operations(operation_id,subject_kind,task_id,series_id,original_local_date,previous_evaluation_id,new_evaluation_id,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        params![input.operation_id,subject.kind,subject.task_id,subject.series_id,subject.original_local_date,previous,evaluation_id,evaluated_at],
    )?;
    let result = evaluation_by_id(&tx, &evaluation_id)?;
    crate::task::analytics::bump_source_revision(&tx)?;
    tx.commit()?;
    Ok(result)
}

pub fn undo(
    conn: &mut Connection,
    operation_id: &str,
) -> Result<Option<TaskEvaluationView>, TaskError> {
    validate_operation_id(operation_id)?;
    let tx = conn.transaction()?;
    let operation = tx
        .query_row(
            "SELECT subject_kind,task_id,series_id,original_local_date,previous_evaluation_id,new_evaluation_id,undone_at FROM evaluation_operations WHERE operation_id=?1",
            params![operation_id],
            |row| Ok((row.get::<_,String>(0)?,row.get::<_,Option<String>>(1)?,row.get::<_,Option<String>>(2)?,row.get::<_,Option<String>>(3)?,row.get::<_,Option<String>>(4)?,row.get::<_,String>(5)?,row.get::<_,Option<String>>(6)?)),
        )
        .optional()?
        .ok_or(TaskError::NotFound)?;
    let subject = subject_from_parts(&operation.0, operation.1, operation.2, operation.3)?;
    if operation.6.is_some() {
        let result = current_view(&tx, &subject)?;
        tx.commit()?;
        return Ok(result);
    }
    if current_id(&tx, &subject)?.as_deref() != Some(operation.5.as_str()) {
        return Err(TaskError::Validation(
            "Only the latest assessment can be undone.",
        ));
    }
    set_current(&tx, &subject, false)?;
    if let Some(previous) = operation.4.as_deref() {
        tx.execute(
            "UPDATE task_evaluations SET is_current=1 WHERE id=?1",
            params![previous],
        )?;
    }
    tx.execute(
        "UPDATE evaluation_operations SET undone_at=?2 WHERE operation_id=?1",
        params![operation_id, timestamp()],
    )?;
    let result = current_view(&tx, &subject)?;
    crate::task::analytics::bump_source_revision(&tx)?;
    tx.commit()?;
    Ok(result)
}

#[cfg(test)]
pub(crate) fn current_for_one_off(
    conn: &Connection,
    task_id: &str,
) -> Result<Option<TaskEvaluationView>, TaskError> {
    current_view(
        conn,
        &Subject {
            kind: "one_off",
            task_id: Some(task_id.into()),
            series_id: None,
            original_local_date: None,
        },
    )
}

#[cfg(test)]
pub(crate) fn current_for_recurring(
    conn: &Connection,
    series_id: &str,
    original_local_date: &str,
) -> Result<Option<TaskEvaluationView>, TaskError> {
    current_view(
        conn,
        &Subject {
            kind: "recurring",
            task_id: None,
            series_id: Some(series_id.into()),
            original_local_date: Some(original_local_date.into()),
        },
    )
}

pub(crate) fn current_for_date(
    conn: &Connection,
    date: &str,
) -> Result<EvaluationsForDate, TaskError> {
    let mut one_off = HashMap::new();
    let mut statement = conn.prepare("SELECT e.task_id,e.state_id,e.state_label_snapshot,e.state_visual_snapshot,e.evaluated_at,e.operation_id FROM task_evaluations e JOIN tasks t ON t.id=e.task_id WHERE e.subject_kind='one_off' AND e.is_current=1 AND t.local_date=?1")?;
    for row in statement.query_map(params![date], |row| {
        Ok((
            row.get::<_, String>(0)?,
            TaskEvaluationView {
                state_id: row.get(1)?,
                label: row.get(2)?,
                visual_token: row.get(3)?,
                evaluated_at: row.get(4)?,
                operation_id: row.get(5)?,
            },
        ))
    })? {
        let (id, view) = row?;
        one_off.insert(id, view);
    }

    let mut recurring = HashMap::new();
    let mut statement = conn.prepare("SELECT e.series_id,e.original_local_date,e.state_id,e.state_label_snapshot,e.state_visual_snapshot,e.evaluated_at,e.operation_id FROM task_evaluations e JOIN task_series s ON s.id=e.series_id LEFT JOIN task_occurrence_overrides o ON o.series_id=e.series_id AND o.original_local_date=e.original_local_date WHERE e.subject_kind='recurring' AND e.is_current=1 AND s.archived_at IS NULL AND (e.original_local_date=?1 OR o.replacement_local_date=?1)")?;
    for row in statement.query_map(params![date], |row| {
        Ok((
            (row.get::<_, String>(0)?, row.get::<_, String>(1)?),
            TaskEvaluationView {
                state_id: row.get(2)?,
                label: row.get(3)?,
                visual_token: row.get(4)?,
                evaluated_at: row.get(5)?,
                operation_id: row.get(6)?,
            },
        ))
    })? {
        let (key, view) = row?;
        recurring.insert(key, view);
    }
    Ok((one_off, recurring))
}

fn validate_clock(input: &EvaluateTaskInput, now: &ObservedLocalTime) -> Result<(), TaskError> {
    if !validate_date(&input.observed_local_date)
        || !(0..1440).contains(&input.observed_local_minute)
        || input.observed_local_date != now.date
        || (input.observed_local_minute - now.minute).abs() > 2
    {
        return Err(TaskError::Validation(
            "The local clock changed; try assessing again.",
        ));
    }
    Ok(())
}

fn validate_operation_id(value: &str) -> Result<(), TaskError> {
    if value.is_empty()
        || value.len() > 100
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
    {
        Err(TaskError::Validation("Use a valid operation identifier."))
    } else {
        Ok(())
    }
}

fn parse_subject(input: &EvaluateTaskInput) -> Result<Subject, TaskError> {
    subject_from_parts(
        &input.subject_kind,
        input.task_id.clone(),
        input.series_id.clone(),
        input.original_local_date.clone(),
    )
}

fn subject_from_parts(
    kind: &str,
    task_id: Option<String>,
    series_id: Option<String>,
    original_local_date: Option<String>,
) -> Result<Subject, TaskError> {
    match (kind, task_id, series_id, original_local_date) {
        ("one_off", Some(task_id), None, None) if !task_id.is_empty() => Ok(Subject {
            kind: "one_off",
            task_id: Some(task_id),
            series_id: None,
            original_local_date: None,
        }),
        ("recurring", None, Some(series_id), Some(original))
            if !series_id.is_empty() && validate_date(&original) =>
        {
            Ok(Subject {
                kind: "recurring",
                task_id: None,
                series_id: Some(series_id),
                original_local_date: Some(original),
            })
        }
        _ => Err(TaskError::Validation("Choose a valid task subject.")),
    }
}

fn resolve_subject(
    conn: &Connection,
    subject: &Subject,
) -> Result<(String, String, i32), TaskError> {
    if subject.kind == "one_off" {
        return conn
            .query_row(
                "SELECT id,local_date,end_minute FROM tasks WHERE id=?1",
                params![subject.task_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|error| {
                if matches!(error, rusqlite::Error::QueryReturnedNoRows) {
                    TaskError::NotFound
                } else {
                    TaskError::Db(error)
                }
            });
    }
    let series = subject.series_id.as_deref().ok_or(TaskError::NotFound)?;
    let original = subject
        .original_local_date
        .as_deref()
        .ok_or(TaskError::NotFound)?;
    let replacement: Option<(Option<String>, i32)> = conn
        .query_row("SELECT replacement_local_date,cancelled FROM task_occurrence_overrides WHERE series_id=?1 AND original_local_date=?2",params![series,original],|row|Ok((row.get(0)?,row.get(1)?)))
        .optional()?;
    if replacement.as_ref().is_some_and(|value| value.1 != 0) {
        return Err(TaskError::Validation(
            "Cancelled occurrences cannot be assessed.",
        ));
    }
    let display_date = replacement
        .and_then(|value| value.0)
        .unwrap_or_else(|| original.to_string());
    let occurrence = repository::recurring_for_date(conn, &display_date)?
        .into_iter()
        .find(|item| item.series_id == series && item.original_local_date == original)
        .ok_or(TaskError::NotFound)?;
    Ok((
        occurrence.occurrence_id,
        occurrence.local_date,
        occurrence.end_minute,
    ))
}

fn current_id(conn: &Connection, subject: &Subject) -> Result<Option<String>, TaskError> {
    let sql = if subject.kind == "one_off" {
        "SELECT id FROM task_evaluations WHERE subject_kind='one_off' AND task_id=?1 AND is_current=1"
    } else {
        "SELECT id FROM task_evaluations WHERE subject_kind='recurring' AND series_id=?1 AND original_local_date=?2 AND is_current=1"
    };
    let value = if subject.kind == "one_off" {
        conn.query_row(sql, params![subject.task_id], |row| row.get(0))
            .optional()?
    } else {
        conn.query_row(
            sql,
            params![subject.series_id, subject.original_local_date],
            |row| row.get(0),
        )
        .optional()?
    };
    Ok(value)
}

fn set_current(conn: &Connection, subject: &Subject, current: bool) -> Result<(), TaskError> {
    let value = i32::from(current);
    if subject.kind == "one_off" {
        conn.execute("UPDATE task_evaluations SET is_current=?2 WHERE subject_kind='one_off' AND task_id=?1 AND is_current<>?2",params![subject.task_id,value])?;
    } else {
        conn.execute("UPDATE task_evaluations SET is_current=?3 WHERE subject_kind='recurring' AND series_id=?1 AND original_local_date=?2 AND is_current<>?3",params![subject.series_id,subject.original_local_date,value])?;
    }
    Ok(())
}

fn current_view(
    conn: &Connection,
    subject: &Subject,
) -> Result<Option<TaskEvaluationView>, TaskError> {
    let Some(id) = current_id(conn, subject)? else {
        return Ok(None);
    };
    Ok(Some(evaluation_by_id(conn, &id)?))
}

fn evaluation_by_id(conn: &Connection, id: &str) -> Result<TaskEvaluationView, TaskError> {
    conn.query_row("SELECT state_id,state_label_snapshot,state_visual_snapshot,evaluated_at,operation_id FROM task_evaluations WHERE id=?1",params![id],|row|Ok(TaskEvaluationView{state_id:row.get(0)?,label:row.get(1)?,visual_token:row.get(2)?,evaluated_at:row.get(3)?,operation_id:row.get(4)?})).map_err(Into::into)
}

fn operation_subject(
    conn: &Transaction<'_>,
    operation_id: &str,
) -> Result<Option<(Subject, String, bool)>, TaskError> {
    let value=conn.query_row("SELECT subject_kind,task_id,series_id,original_local_date,new_evaluation_id,undone_at IS NOT NULL FROM evaluation_operations WHERE operation_id=?1",params![operation_id],|row|Ok((row.get::<_,String>(0)?,row.get(1)?,row.get(2)?,row.get(3)?,row.get::<_,String>(4)?,row.get::<_,bool>(5)?))).optional()?;
    value
        .map(|parts| {
            Ok((
                subject_from_parts(&parts.0, parts.1, parts.2, parts.3)?,
                parts.4,
                parts.5,
            ))
        })
        .transpose()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        infrastructure::sqlite::{connection::open_memory_connection, migrations::run_migrations},
        task::dto::{
            CreateRecurringTaskInput, CreateTaskInput, OccurrenceEditScope,
            UpdateRecurringOccurrenceInput,
        },
    };

    fn db() -> Connection {
        let mut connection = open_memory_connection().unwrap();
        run_migrations(&mut connection).unwrap();
        connection
    }
    fn task(connection: &Connection, date: &str, end: i32) -> String {
        repository::create(
            connection,
            CreateTaskInput {
                title: "Past".into(),
                description: "".into(),
                local_date: date.into(),
                start_minute: end - 60,
                end_minute: end,
                category_id: "general".into(),
                priority: "medium".into(),
            },
        )
        .unwrap()
        .id
    }
    fn input(task_id: &str, state: &str, operation: &str) -> EvaluateTaskInput {
        EvaluateTaskInput {
            subject_kind: "one_off".into(),
            task_id: Some(task_id.into()),
            series_id: None,
            original_local_date: None,
            state_id: state.into(),
            operation_id: operation.into(),
            observed_local_date: "2026-08-02".into(),
            observed_local_minute: 720,
        }
    }
    fn clock() -> ObservedLocalTime {
        ObservedLocalTime {
            date: "2026-08-02".into(),
            minute: 720,
        }
    }

    #[test]
    fn seeded_states_are_stable_ordered_and_hide_values_from_projection() {
        let connection = db();
        let states = list_states(&connection).unwrap();
        assert_eq!(
            states
                .iter()
                .map(|s| s.internal_key.as_str())
                .collect::<Vec<_>>(),
            ["none", "below", "met", "excellent"]
        );
        assert!(connection.execute("INSERT INTO completion_states(id,internal_key,label,sort_key,hidden_value_bp,visual_token,created_at,updated_at) VALUES('invalid','invalid','Invalid',9,10001,'invalid','0','0')",[]).is_err());
        assert_eq!(
            states.iter().map(|s| s.id.as_str()).collect::<Vec<_>>(),
            [
                "completion-none",
                "completion-below",
                "completion-met",
                "completion-excellent"
            ]
        );
    }
    #[test]
    fn one_off_reassessment_history_idempotency_and_undo() {
        let mut connection = db();
        let id = task(&connection, "2026-08-01", 600);
        let first = evaluate_at(
            &mut connection,
            input(&id, "completion-met", "operation-1"),
            clock(),
        )
        .unwrap();
        let replay = evaluate_at(
            &mut connection,
            input(&id, "completion-met", "operation-1"),
            ObservedLocalTime {
                date: "2026-08-03".into(),
                minute: 900,
            },
        )
        .unwrap();
        assert_eq!(first.operation_id, replay.operation_id);
        assert!(matches!(
            evaluate_at(
                &mut connection,
                input(&id, "completion-below", "operation-1"),
                clock()
            ),
            Err(TaskError::Validation(_))
        ));
        let second = evaluate_at(
            &mut connection,
            input(&id, "completion-excellent", "operation-2"),
            clock(),
        )
        .unwrap();
        assert_eq!(second.label, "Very good");
        assert!(matches!(
            undo(&mut connection, "operation-1"),
            Err(TaskError::Validation(_))
        ));
        assert_eq!(
            undo(&mut connection, "operation-2").unwrap().unwrap().label,
            "Met expectation"
        );
        assert_eq!(
            undo(&mut connection, "operation-2").unwrap().unwrap().label,
            "Met expectation"
        );
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM task_evaluations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 2);
        assert!(matches!(
            evaluate_at(
                &mut connection,
                input(&id, "completion-met", "operation-2"),
                clock()
            ),
            Err(TaskError::Validation(_))
        ));
    }
    #[test]
    fn undo_first_evaluation_restores_unevaluated() {
        let mut connection = db();
        let id = task(&connection, "2026-08-01", 600);
        evaluate_at(
            &mut connection,
            input(&id, "completion-below", "operation-a"),
            clock(),
        )
        .unwrap();
        assert!(undo(&mut connection, "operation-a").unwrap().is_none());
        assert!(undo(&mut connection, "operation-a").unwrap().is_none());
    }
    #[test]
    fn future_and_active_tasks_and_archived_states_are_rejected() {
        let mut connection = db();
        let future = task(&connection, "2026-08-03", 600);
        assert!(matches!(
            evaluate_at(
                &mut connection,
                input(&future, "completion-met", "future-op"),
                clock()
            ),
            Err(TaskError::Validation(_))
        ));
        let active = task(&connection, "2026-08-02", 780);
        assert!(matches!(
            evaluate_at(
                &mut connection,
                input(&active, "completion-met", "active-op"),
                clock()
            ),
            Err(TaskError::Validation(_))
        ));
        connection
            .execute(
                "UPDATE completion_states SET archived_at='x' WHERE id='completion-met'",
                [],
            )
            .unwrap();
        let past = task(&connection, "2026-07-31", 600);
        assert!(matches!(
            evaluate_at(
                &mut connection,
                input(&past, "completion-met", "archived-op"),
                clock()
            ),
            Err(TaskError::Validation(_))
        ));
    }
    #[test]
    fn recurring_moved_identity_and_cancellation_are_occurrence_specific() {
        let mut connection = db();
        let series = repository::create_recurring(
            &mut connection,
            CreateRecurringTaskInput {
                title: "Series".into(),
                description: "".into(),
                local_date: "2026-08-01".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "medium".into(),
                frequency: "daily".into(),
                interval: 1,
                weekdays: vec![],
                until: None,
                count: Some(3),
            },
        )
        .unwrap();
        let moved = UpdateRecurringOccurrenceInput {
            series_id: series.clone(),
            original_local_date: "2026-08-01".into(),
            replacement_local_date: Some("2026-08-02".into()),
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
        };
        repository::update_recurring(&mut connection, moved).unwrap();
        let recurring = EvaluateTaskInput {
            subject_kind: "recurring".into(),
            task_id: None,
            series_id: Some(series.clone()),
            original_local_date: Some("2026-08-01".into()),
            state_id: "completion-met".into(),
            operation_id: "recurring-op".into(),
            observed_local_date: "2026-08-02".into(),
            observed_local_minute: 720,
        };
        assert_eq!(
            evaluate_at(&mut connection, recurring, clock())
                .unwrap()
                .label,
            "Met expectation"
        );
        assert!(
            current_for_recurring(&connection, &series, "2026-08-01")
                .unwrap()
                .is_some()
        );
        let cancel = UpdateRecurringOccurrenceInput {
            series_id: series.clone(),
            original_local_date: "2026-08-03".into(),
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
        };
        repository::update_recurring(&mut connection, cancel).unwrap();
        let cancelled = EvaluateTaskInput {
            subject_kind: "recurring".into(),
            task_id: None,
            series_id: Some(series),
            original_local_date: Some("2026-08-03".into()),
            state_id: "completion-met".into(),
            operation_id: "cancel-op".into(),
            observed_local_date: "2026-08-02".into(),
            observed_local_minute: 720,
        };
        assert!(evaluate_at(&mut connection, cancelled, clock()).is_err());
    }
    #[test]
    fn snapshots_survive_state_metadata_changes() {
        let mut connection = db();
        let id = task(&connection, "2026-08-01", 600);
        evaluate_at(
            &mut connection,
            input(&id, "completion-met", "snapshot-op"),
            clock(),
        )
        .unwrap();
        connection.execute("UPDATE completion_states SET label='Renamed',hidden_value_bp=8000,visual_token='changed' WHERE id='completion-met'",[]).unwrap();
        let view = current_for_one_off(&connection, &id).unwrap().unwrap();
        assert_eq!(view.label, "Met expectation");
        assert_eq!(view.visual_token, "met");
        let value:i32=connection.query_row("SELECT state_value_bp_snapshot FROM task_evaluations WHERE operation_id='snapshot-op'",[],|row|row.get(0)).unwrap();
        assert_eq!(value, 7500);
    }
    #[test]
    fn operation_insert_failure_rolls_back_current_pointer() {
        let mut connection = db();
        let id = task(&connection, "2026-08-01", 600);
        evaluate_at(
            &mut connection,
            input(&id, "completion-met", "before-trigger"),
            clock(),
        )
        .unwrap();
        connection.execute_batch("CREATE TRIGGER fail_evaluation_operation BEFORE INSERT ON evaluation_operations BEGIN SELECT RAISE(ABORT,'injected'); END;").unwrap();
        assert!(
            evaluate_at(
                &mut connection,
                input(&id, "completion-excellent", "after-trigger"),
                clock()
            )
            .is_err()
        );
        assert_eq!(
            current_for_one_off(&connection, &id)
                .unwrap()
                .unwrap()
                .label,
            "Met expectation"
        );
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM task_evaluations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn evaluation_history_reopens_from_file_storage() {
        use crate::infrastructure::sqlite::connection::open_file_connection;
        let directory = std::env::temp_dir().join(format!("lifeweave-evaluation-{}", now_id()));
        std::fs::create_dir(&directory).unwrap();
        let database = directory.join("lifeweave.db");
        let task_id;
        {
            let mut connection = open_file_connection(&database).unwrap();
            run_migrations(&mut connection).unwrap();
            task_id = task(&connection, "2026-08-01", 600);
            evaluate_at(
                &mut connection,
                input(&task_id, "completion-excellent", "reopen-operation"),
                clock(),
            )
            .unwrap();
        }
        {
            let connection = open_file_connection(&database).unwrap();
            let current = current_for_one_off(&connection, &task_id).unwrap().unwrap();
            assert_eq!(current.label, "Very good");
            let operations: i64 = connection
                .query_row("SELECT COUNT(*) FROM evaluation_operations", [], |row| {
                    row.get(0)
                })
                .unwrap();
            assert_eq!(operations, 1);
        }
        for suffix in ["", "-wal", "-shm"] {
            let path = if suffix.is_empty() {
                database.clone()
            } else {
                directory.join(format!("lifeweave.db{suffix}"))
            };
            if path.exists() {
                std::fs::remove_file(path).unwrap();
            }
        }
        std::fs::remove_dir(directory).unwrap();
    }
}
