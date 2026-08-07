//! Explicit actual-time sessions for one-off Tasks.
//!
//! A session is a wall-clock interval the user explicitly started and explicitly ended. Rust owns
//! both timestamps as UTC epoch milliseconds read from `SystemTime`; `Instant` is never persisted
//! or serialized because it is meaningless across a process restart.
//!
//! Elapsed time deliberately includes app close and reopen, backgrounding, and machine sleep. There
//! is no idle subtraction, no automatic start or stop, and no monitoring of any kind — the user is
//! the only thing that starts a timer.
//!
//! The single-active invariant is enforced by the `task_actual_time_single_active` partial unique
//! index, so two racing Start calls cannot both succeed even if both pass the pre-check.

use super::dto::{ActiveTaskActualTimeView, TaskActualTimeView};
use super::repository::TaskError;
use rusqlite::{Connection, OptionalExtension, params};
use std::collections::BTreeMap;

pub const MAX_ACTUAL_TIME_SESSIONS_PER_TASK: i64 = 10_000;

/// Authoritative wall-clock reading. Milliseconds since the Unix epoch.
fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis() as i64)
        .unwrap_or(0)
}

fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

fn valid_operation_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}

/// Whole seconds, rounding down. Durations are always non-negative here because the database
/// refuses `ended_at_ms < started_at_ms` and Stop refuses a backwards clock.
fn to_seconds(millis: i64) -> i64 {
    millis / 1_000
}

#[derive(Debug, Clone)]
struct SessionRow {
    id: String,
    task_id: String,
    started_at_ms: i64,
    ended_at_ms: Option<i64>,
}

fn read_session(conn: &Connection, session_id: &str) -> Result<Option<SessionRow>, TaskError> {
    Ok(conn
        .query_row(
            "SELECT id,task_id,started_at_ms,ended_at_ms FROM task_actual_time_sessions WHERE id=?1",
            [session_id],
            |row| {
                Ok(SessionRow {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    started_at_ms: row.get(2)?,
                    ended_at_ms: row.get(3)?,
                })
            },
        )
        .optional()?)
}

/// Completed-segment totals for one Task, plus its active segment when it owns one.
pub fn task_view(conn: &Connection, task_id: &str) -> Result<TaskActualTimeView, TaskError> {
    let mut statement = conn.prepare(
        "SELECT id,started_at_ms,ended_at_ms FROM task_actual_time_sessions WHERE task_id=?1 ORDER BY started_at_ms,id",
    )?;
    let rows = statement
        .query_map([task_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<i64>>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut total_ms: i64 = 0;
    let mut completed_session_count: u32 = 0;
    let mut active_session_id = None;
    let mut active_started_at_ms = None;
    for (id, started, ended) in rows {
        match ended {
            Some(end) => {
                let duration = end
                    .checked_sub(started)
                    .ok_or(TaskError::Validation("Recorded time is invalid."))?;
                total_ms = total_ms
                    .checked_add(duration)
                    .ok_or(TaskError::Validation("Recorded time overflowed."))?;
                completed_session_count += 1;
            }
            None => {
                active_session_id = Some(id);
                active_started_at_ms = Some(started);
            }
        }
    }
    Ok(TaskActualTimeView {
        total_completed_seconds: to_seconds(total_ms),
        completed_session_count,
        active_session_id,
        active_started_at_ms,
    })
}

/// The one globally active session, if any. Independent of any viewed date: the running Task may be
/// scheduled on a completely different day than the one Today is showing.
pub fn active_view(conn: &Connection) -> Result<Option<ActiveTaskActualTimeView>, TaskError> {
    if !session_table_exists(conn)? {
        return Ok(None);
    }
    let row = conn
        .query_row(
            "SELECT s.id,s.task_id,s.started_at_ms,t.title,t.local_date
               FROM task_actual_time_sessions s JOIN tasks t ON t.id=s.task_id
              WHERE s.ended_at_ms IS NULL",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                ))
            },
        )
        .optional()?;
    let Some((session_id, task_id, started_at_ms, task_title, task_local_date)) = row else {
        return Ok(None);
    };
    let totals = task_view(conn, &task_id)?;
    Ok(Some(ActiveTaskActualTimeView {
        session_id,
        task_id,
        task_title,
        task_local_date,
        started_at_ms,
        completed_seconds_before_active: totals.total_completed_seconds,
    }))
}

/// Batched totals for every one-off Task scheduled on `local_date`.
///
/// One grouped query for the whole day, so Today never issues a per-row session query. `SUM` and
/// `COUNT` run inside SQLite, which raises on integer overflow rather than wrapping.
pub fn totals_for_date(
    conn: &Connection,
    local_date: &str,
) -> Result<BTreeMap<String, TaskActualTimeView>, TaskError> {
    // Today may render against a database that predates schema 26 — for instance immediately after
    // restoring an older backup. No session table means no recorded time, not an error.
    if !session_table_exists(conn)? {
        return Ok(BTreeMap::new());
    }
    let mut statement = conn.prepare(
        "SELECT s.task_id,
                COALESCE(SUM(CASE WHEN s.ended_at_ms IS NOT NULL THEN s.ended_at_ms - s.started_at_ms END),0),
                COUNT(CASE WHEN s.ended_at_ms IS NOT NULL THEN 1 END),
                MAX(CASE WHEN s.ended_at_ms IS NULL THEN s.id END),
                MAX(CASE WHEN s.ended_at_ms IS NULL THEN s.started_at_ms END)
           FROM task_actual_time_sessions s
           JOIN tasks t ON t.id=s.task_id
          WHERE t.local_date=?1
          GROUP BY s.task_id",
    )?;
    let mut out = BTreeMap::new();
    for row in statement.query_map([local_date], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<i64>>(4)?,
        ))
    })? {
        let (task_id, total_ms, completed, active_id, active_started) = row?;
        if total_ms < 0 {
            return Err(TaskError::Validation("Recorded time is invalid."));
        }
        out.insert(
            task_id,
            TaskActualTimeView {
                total_completed_seconds: to_seconds(total_ms),
                completed_session_count: u32::try_from(completed)
                    .map_err(|_| TaskError::Validation("Recorded time is invalid."))?,
                active_session_id: active_id,
                active_started_at_ms: active_started,
            },
        );
    }
    Ok(out)
}

pub fn start(
    conn: &mut Connection,
    task_id: &str,
    operation_id: &str,
) -> Result<TaskActualTimeView, TaskError> {
    start_at(conn, task_id, operation_id, now_ms())
}

/// Test seam. `now_ms` is injected so session behaviour is deterministic; it never reaches IPC,
/// configuration, or any user-facing surface.
pub(crate) fn start_at(
    conn: &mut Connection,
    task_id: &str,
    operation_id: &str,
    now_ms: i64,
) -> Result<TaskActualTimeView, TaskError> {
    if !valid_operation_id(operation_id) {
        return Err(TaskError::Validation("Choose a valid timer operation."));
    }
    if now_ms < 0 {
        return Err(TaskError::Validation(
            "The system clock is before 1970; the timer was not started.",
        ));
    }

    let tx = conn.transaction()?;

    // Replay first: a retried Start must resolve to the original session rather than open a second
    // segment, and it must still resolve after that session has been stopped.
    let replay: Option<(String, String)> = tx
        .query_row(
            "SELECT id,task_id FROM task_actual_time_sessions WHERE start_operation_id=?1",
            [operation_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;
    if let Some((_, existing_task)) = replay {
        if existing_task != task_id {
            return Err(TaskError::Validation(
                "Timer operation identity does not match this task.",
            ));
        }
        let view = task_view(&tx, task_id)?;
        tx.commit()?;
        return Ok(view);
    }

    // A session may only belong to an existing one-off Task. Recurring occurrences are structurally
    // excluded because `task_id` references `tasks(id)`.
    if tx
        .query_row("SELECT 1 FROM tasks WHERE id=?1", [task_id], |_| Ok(()))
        .optional()?
        .is_none()
    {
        return Err(TaskError::NotFound);
    }

    if super::evaluation::current_for_one_off(&tx, task_id)?.is_some() {
        return Err(TaskError::Validation(
            "Undo this task's assessment before tracking more time.",
        ));
    }

    // Pre-check for a clearer message; the partial unique index is the real defense.
    if tx
        .query_row(
            "SELECT 1 FROM task_actual_time_sessions WHERE ended_at_ms IS NULL",
            [],
            |_| Ok(()),
        )
        .optional()?
        .is_some()
    {
        return Err(TaskError::Validation(
            "Another task timer is already running. Stop it first.",
        ));
    }

    let count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM task_actual_time_sessions WHERE task_id=?1",
        [task_id],
        |row| row.get(0),
    )?;
    if count >= MAX_ACTUAL_TIME_SESSIONS_PER_TASK {
        return Err(TaskError::Validation(
            "This task has reached its recorded session limit.",
        ));
    }

    tx.execute(
        "INSERT INTO task_actual_time_sessions VALUES(?1,?2,?3,?4,NULL)",
        params![new_id(), task_id, operation_id, now_ms],
    )?;
    let view = task_view(&tx, task_id)?;
    tx.commit()?;
    Ok(view)
}

pub fn stop(conn: &mut Connection, session_id: &str) -> Result<TaskActualTimeView, TaskError> {
    stop_at(conn, session_id, now_ms())
}

pub(crate) fn stop_at(
    conn: &mut Connection,
    session_id: &str,
    now_ms: i64,
) -> Result<TaskActualTimeView, TaskError> {
    let tx = conn.transaction()?;
    let session = read_session(&tx, session_id)?.ok_or(TaskError::NotFound)?;

    // Repeated Stop of an already-completed session is stable and changes nothing.
    if session.ended_at_ms.is_some() {
        let view = task_view(&tx, &session.task_id)?;
        tx.commit()?;
        return Ok(view);
    }

    // A backwards clock never fabricates or clamps a duration. The session stays active and
    // untouched so the user can discard it deliberately.
    if now_ms < session.started_at_ms {
        return Err(TaskError::Validation(
            "The system clock moved backwards; stop was not recorded. Discard this segment instead.",
        ));
    }

    tx.execute(
        "UPDATE task_actual_time_sessions SET ended_at_ms=?1 WHERE id=?2 AND ended_at_ms IS NULL",
        params![now_ms, session.id],
    )?;
    super::analytics::bump_source_revision(&tx)?;
    let view = task_view(&tx, &session.task_id)?;
    tx.commit()?;
    Ok(view)
}

/// Removes the currently active segment. A completed segment is immutable and can never be
/// discarded, edited, or deleted.
pub fn discard(conn: &mut Connection, session_id: &str) -> Result<TaskActualTimeView, TaskError> {
    let tx = conn.transaction()?;
    let session = read_session(&tx, session_id)?.ok_or(TaskError::NotFound)?;
    if session.ended_at_ms.is_some() {
        return Err(TaskError::Validation(
            "A completed time segment cannot be discarded.",
        ));
    }
    tx.execute(
        "DELETE FROM task_actual_time_sessions WHERE id=?1 AND ended_at_ms IS NULL",
        [&session.id],
    )?;
    let view = task_view(&tx, &session.task_id)?;
    tx.commit()?;
    Ok(view)
}

/// A database predating schema 26 has no session table. Callers treat that as "no timer running"
/// rather than as a failure, because it is exactly what an older snapshot means.
fn session_table_exists(conn: &Connection) -> Result<bool, TaskError> {
    Ok(conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='task_actual_time_sessions')",
        [],
        |row| row.get(0),
    )?)
}

/// True when this one-off Task currently owns the active session. Used by the evaluation and delete
/// guards.
///
/// Like [`any_session_active`], a database older than schema 26 has no session table and therefore
/// no running timer; that is a legitimate state, not an error.
pub(crate) fn has_active_session(conn: &Connection, task_id: &str) -> Result<bool, TaskError> {
    if !session_table_exists(conn)? {
        return Ok(false);
    }
    Ok(conn
        .query_row(
            "SELECT 1 FROM task_actual_time_sessions WHERE task_id=?1 AND ended_at_ms IS NULL",
            [task_id],
            |_| Ok(()),
        )
        .optional()?
        .is_some())
}

/// True when any session anywhere is active. Used by the backup precondition.
///
/// A database older than schema 26 has no session table at all, which is a legitimate state during
/// restore of a historical backup — and it means no timer can possibly be running. Genuine query
/// failures still propagate rather than being swallowed.
pub fn any_session_active(conn: &Connection) -> Result<bool, TaskError> {
    if !session_table_exists(conn)? {
        return Ok(false);
    }
    Ok(conn
        .query_row(
            "SELECT 1 FROM task_actual_time_sessions WHERE ended_at_ms IS NULL",
            [],
            |_| Ok(()),
        )
        .optional()?
        .is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task43_migration::run_all_migrations,
    };
    use crate::task::dto::EvaluateTaskInput;

    const T0: i64 = 1_770_000_000_000;

    fn db() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn task(conn: &Connection, id: &str, title: &str) {
        conn.execute(
            "INSERT INTO tasks (id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES(?1,'2026-08-07',600,660,?2,'','general','low','1','1')",
            params![id, title],
        )
        .unwrap();
    }

    fn task_on(conn: &Connection, id: &str, title: &str, date: &str) {
        conn.execute(
            "INSERT INTO tasks (id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES(?1,?3,600,660,?2,'','general','low','1','1')",
            params![id, title, date],
        )
        .unwrap();
    }

    fn active_id(conn: &Connection, task_id: &str) -> String {
        task_view(conn, task_id).unwrap().active_session_id.unwrap()
    }

    fn row_count(conn: &Connection) -> i64 {
        conn.query_row("SELECT COUNT(*) FROM task_actual_time_sessions", [], |r| {
            r.get(0)
        })
        .unwrap()
    }

    fn analytics_revision(conn: &Connection) -> i64 {
        conn.query_row(
            "SELECT source_revision FROM analytics_meta WHERE id=1",
            [],
            |row| row.get(0),
        )
        .unwrap()
    }

    #[test]
    fn start_persists_one_active_segment_and_contributes_no_completed_time_yet() {
        let mut conn = db();
        task(&conn, "task-a", "Write");

        let view = start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        assert_eq!(view.total_completed_seconds, 0);
        assert_eq!(view.completed_session_count, 0);
        assert_eq!(view.active_started_at_ms, Some(T0));
        assert!(view.active_session_id.is_some());
        assert_eq!(row_count(&conn), 1);

        // The persisted row is open and carries the authoritative start.
        let (started, ended): (i64, Option<i64>) = conn
            .query_row(
                "SELECT started_at_ms,ended_at_ms FROM task_actual_time_sessions",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(started, T0);
        assert_eq!(ended, None);
    }

    #[test]
    fn the_same_start_operation_replays_and_never_opens_a_second_segment() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        let first = start_at(&mut conn, "task-a", "op-1", T0).unwrap();

        // Replay while still running.
        let replay = start_at(&mut conn, "task-a", "op-1", T0 + 5_000).unwrap();
        assert_eq!(replay.active_session_id, first.active_session_id);
        assert_eq!(
            replay.active_started_at_ms,
            Some(T0),
            "start is not rewritten"
        );
        assert_eq!(row_count(&conn), 1);

        // Replay must still resolve after the session has been stopped.
        let session = active_id(&conn, "task-a");
        stop_at(&mut conn, &session, T0 + 60_000).unwrap();
        let after_stop = start_at(&mut conn, "task-a", "op-1", T0 + 90_000).unwrap();
        assert_eq!(after_stop.completed_session_count, 1);
        assert_eq!(after_stop.total_completed_seconds, 60);
        assert_eq!(after_stop.active_session_id, None);
        assert_eq!(row_count(&conn), 1, "replay never creates a new segment");
    }

    #[test]
    fn a_start_operation_cannot_be_reused_against_another_task() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        task(&conn, "task-b", "Read");
        start_at(&mut conn, "task-a", "shared", T0).unwrap();
        let session = active_id(&conn, "task-a");
        stop_at(&mut conn, &session, T0 + 1_000).unwrap();

        assert!(matches!(
            start_at(&mut conn, "task-b", "shared", T0 + 2_000),
            Err(TaskError::Validation(
                "Timer operation identity does not match this task."
            ))
        ));
        assert_eq!(row_count(&conn), 1);
    }

    #[test]
    fn a_second_task_cannot_become_concurrently_active_and_the_first_keeps_running() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        task(&conn, "task-b", "Read");
        start_at(&mut conn, "task-a", "op-a", T0).unwrap();

        assert!(matches!(
            start_at(&mut conn, "task-b", "op-b", T0 + 1_000),
            Err(TaskError::Validation(
                "Another task timer is already running. Stop it first."
            ))
        ));
        // The running session is never auto-stopped or switched.
        assert_eq!(
            task_view(&conn, "task-a").unwrap().active_started_at_ms,
            Some(T0)
        );
        assert_eq!(task_view(&conn, "task-b").unwrap().active_session_id, None);
        assert_eq!(row_count(&conn), 1);
    }

    #[test]
    fn the_partial_unique_index_refuses_a_second_active_row_even_past_the_pre_check() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        task(&conn, "task-b", "Read");
        start_at(&mut conn, "task-a", "op-a", T0).unwrap();

        // Bypass the Rust pre-check entirely: the database is the real defense.
        assert!(
            conn.execute(
                "INSERT INTO task_actual_time_sessions VALUES('forced','task-b','forced-op',?1,NULL)",
                params![T0 + 1],
            )
            .is_err(),
            "the single-active invariant must hold below the service layer"
        );
    }

    #[test]
    fn stop_uses_the_authoritative_clock_and_repeats_stably() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let session = active_id(&conn, "task-a");

        let stopped = stop_at(&mut conn, &session, T0 + 90_500).unwrap();
        assert_eq!(
            stopped.total_completed_seconds, 90,
            "rounds down to whole seconds"
        );
        assert_eq!(stopped.completed_session_count, 1);
        assert_eq!(stopped.active_session_id, None);

        // Repeating Stop returns the same answer and never extends the segment.
        let again = stop_at(&mut conn, &session, T0 + 999_999).unwrap();
        assert_eq!(again, stopped);
        assert_eq!(
            conn.query_row(
                "SELECT ended_at_ms FROM task_actual_time_sessions WHERE id=?1",
                [&session],
                |r| r.get::<_, i64>(0),
            )
            .unwrap(),
            T0 + 90_500
        );
    }

    #[test]
    fn only_the_first_successful_stop_bumps_analytics_revision() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        let initial = analytics_revision(&conn);

        start_at(&mut conn, "task-a", "revision-op-1", T0).unwrap();
        assert_eq!(
            analytics_revision(&conn),
            initial,
            "Start contributes nothing"
        );
        let first = active_id(&conn, "task-a");

        assert!(matches!(
            stop_at(&mut conn, &first, T0 - 1),
            Err(TaskError::Validation(message)) if message.contains("moved backwards")
        ));
        assert_eq!(analytics_revision(&conn), initial);

        stop_at(&mut conn, &first, T0 + 1_000).unwrap();
        assert_eq!(analytics_revision(&conn), initial + 1);
        stop_at(&mut conn, &first, T0 + 90_000).unwrap();
        assert_eq!(
            analytics_revision(&conn),
            initial + 1,
            "replayed Stop is read-only"
        );

        start_at(&mut conn, "task-a", "revision-op-2", T0 + 100_000).unwrap();
        assert_eq!(analytics_revision(&conn), initial + 1);
        let discarded = active_id(&conn, "task-a");
        discard(&mut conn, &discarded).unwrap();
        assert_eq!(
            analytics_revision(&conn),
            initial + 1,
            "Discard removes only non-contributing source data"
        );
    }

    #[test]
    fn a_backwards_clock_rejects_stop_without_mutating_or_fabricating_anything() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let session = active_id(&conn, "task-a");

        assert!(matches!(
            stop_at(&mut conn, &session, T0 - 1),
            Err(TaskError::Validation(message)) if message.contains("moved backwards")
        ));

        // Still active, still unmodified, still contributing no completed time.
        let view = task_view(&conn, "task-a").unwrap();
        assert_eq!(view.active_session_id.as_deref(), Some(session.as_str()));
        assert_eq!(view.active_started_at_ms, Some(T0));
        assert_eq!(view.total_completed_seconds, 0);
        assert_eq!(view.completed_session_count, 0);

        // Discard remains available as the documented escape hatch.
        let discarded = discard(&mut conn, &session).unwrap();
        assert_eq!(discarded.active_session_id, None);
        assert_eq!(discarded.total_completed_seconds, 0);
        assert_eq!(row_count(&conn), 0);
    }

    #[test]
    fn discard_removes_only_an_active_segment_and_never_a_completed_one() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let completed = active_id(&conn, "task-a");
        stop_at(&mut conn, &completed, T0 + 30_000).unwrap();

        assert!(matches!(
            discard(&mut conn, &completed),
            Err(TaskError::Validation(
                "A completed time segment cannot be discarded."
            ))
        ));
        assert_eq!(
            task_view(&conn, "task-a").unwrap().total_completed_seconds,
            30
        );

        start_at(&mut conn, "task-a", "op-2", T0 + 40_000).unwrap();
        let active = active_id(&conn, "task-a");
        let view = discard(&mut conn, &active).unwrap();
        assert_eq!(
            view.total_completed_seconds, 30,
            "the discarded segment contributes zero"
        );
        assert_eq!(view.completed_session_count, 1);
        assert_eq!(row_count(&conn), 1);

        assert!(matches!(
            discard(&mut conn, "missing"),
            Err(TaskError::NotFound)
        ));
    }

    #[test]
    fn many_segments_accumulate_and_a_running_segment_is_never_folded_in() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        for index in 0..5i64 {
            start_at(
                &mut conn,
                "task-a",
                &format!("op-{index}"),
                T0 + index * 100_000,
            )
            .unwrap();
            let session = active_id(&conn, "task-a");
            stop_at(&mut conn, &session, T0 + index * 100_000 + 10_000).unwrap();
        }
        let view = task_view(&conn, "task-a").unwrap();
        assert_eq!(view.completed_session_count, 5);
        assert_eq!(view.total_completed_seconds, 50);

        // A sixth, still-running segment does not change the completed total.
        start_at(&mut conn, "task-a", "op-live", T0 + 900_000).unwrap();
        let live = task_view(&conn, "task-a").unwrap();
        assert_eq!(live.total_completed_seconds, 50);
        assert_eq!(live.completed_session_count, 5);
        assert_eq!(live.active_started_at_ms, Some(T0 + 900_000));
    }

    #[test]
    fn the_per_task_session_bound_is_enforced() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        {
            let tx = conn.transaction().unwrap();
            for index in 0..MAX_ACTUAL_TIME_SESSIONS_PER_TASK {
                tx.execute(
                    "INSERT INTO task_actual_time_sessions VALUES(?1,'task-a',?2,?3,?4)",
                    params![
                        format!("seed-{index}"),
                        format!("seed-op-{index}"),
                        index * 10,
                        index * 10 + 1
                    ],
                )
                .unwrap();
            }
            tx.commit().unwrap();
        }
        assert!(matches!(
            start_at(&mut conn, "task-a", "one-too-many", T0),
            Err(TaskError::Validation(
                "This task has reached its recorded session limit."
            ))
        ));
        assert_eq!(row_count(&conn), MAX_ACTUAL_TIME_SESSIONS_PER_TASK);
    }

    #[test]
    fn start_requires_an_existing_task_and_a_valid_operation_identity() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        assert!(matches!(
            start_at(&mut conn, "missing", "op-1", T0),
            Err(TaskError::NotFound)
        ));
        for bad in ["", "has space", "semi;colon", &"x".repeat(129)] {
            assert!(
                start_at(&mut conn, "task-a", bad, T0).is_err(),
                "operation identity {bad:?} must be refused"
            );
        }
        assert_eq!(row_count(&conn), 0, "a refused start writes nothing");
    }

    #[test]
    fn an_evaluated_task_cannot_start_until_its_evaluation_is_undone() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        let state: String = conn
            .query_row(
                "SELECT id FROM completion_states WHERE archived_at IS NULL LIMIT 1",
                [],
                |r| r.get(0),
            )
            .unwrap();
        crate::task::evaluation::evaluate_at(
            &mut conn,
            EvaluateTaskInput {
                subject_kind: "one_off".into(),
                task_id: Some("task-a".into()),
                series_id: None,
                original_local_date: None,
                state_id: state,
                operation_id: "eval-1".into(),
                observed_local_date: "2026-08-08".into(),
                observed_local_minute: 700,
            },
            crate::task::evaluation::ObservedLocalTime {
                date: "2026-08-08".into(),
                minute: 700,
            },
        )
        .unwrap();

        assert!(matches!(
            start_at(&mut conn, "task-a", "op-1", T0),
            Err(TaskError::Validation(
                "Undo this task's assessment before tracking more time."
            ))
        ));
        assert_eq!(row_count(&conn), 0);

        crate::task::evaluation::undo(&mut conn, "eval-1").unwrap();
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        assert_eq!(row_count(&conn), 1, "undo re-enables tracking");
    }

    #[test]
    fn a_task_with_a_running_timer_cannot_be_assessed() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let state: String = conn
            .query_row(
                "SELECT id FROM completion_states WHERE archived_at IS NULL LIMIT 1",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let input = |op: &str| EvaluateTaskInput {
            subject_kind: "one_off".into(),
            task_id: Some("task-a".into()),
            series_id: None,
            original_local_date: None,
            state_id: state.clone(),
            operation_id: op.into(),
            observed_local_date: "2026-08-08".into(),
            observed_local_minute: 700,
        };
        let observed = crate::task::evaluation::ObservedLocalTime {
            date: "2026-08-08".into(),
            minute: 700,
        };

        assert!(matches!(
            crate::task::evaluation::evaluate_at(&mut conn, input("eval-1"), observed.clone()),
            Err(TaskError::Validation(
                "Stop or discard the running timer before assessing this task."
            ))
        ));
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM task_evaluations", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            0
        );

        // Stopping clears the obstruction; actual time never chooses the state.
        let session = active_id(&conn, "task-a");
        stop_at(&mut conn, &session, T0 + 60_000).unwrap();
        crate::task::evaluation::evaluate_at(&mut conn, input("eval-1"), observed).unwrap();
        assert_eq!(
            task_view(&conn, "task-a").unwrap().total_completed_seconds,
            60
        );
    }

    #[test]
    fn a_running_timer_blocks_deletion_and_stopping_restores_cascade_delete() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();

        assert!(matches!(
            crate::task::repository::delete(&conn, "task-a"),
            Err(TaskError::Validation(
                "Stop or discard the running timer before deleting this task."
            ))
        ));
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM tasks WHERE id='task-a'", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            1
        );

        let session = active_id(&conn, "task-a");
        stop_at(&mut conn, &session, T0 + 60_000).unwrap();
        crate::task::repository::delete(&conn, "task-a").unwrap();
        assert_eq!(row_count(&conn), 0, "delete cascades the recorded history");
    }

    #[test]
    fn editing_a_task_while_its_timer_runs_preserves_the_session() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let session = active_id(&conn, "task-a");

        // Rescheduling and retitling are ordinary edits; the session is attached by stable ID.
        conn.execute(
            "UPDATE tasks SET local_date='2026-09-01',start_minute=900,end_minute=960,title='Renamed' WHERE id='task-a'",
            [],
        )
        .unwrap();

        let view = task_view(&conn, "task-a").unwrap();
        assert_eq!(view.active_session_id.as_deref(), Some(session.as_str()));
        assert_eq!(
            view.active_started_at_ms,
            Some(T0),
            "schedule edits never rewrite recorded time"
        );
        let active = active_view(&conn).unwrap().unwrap();
        assert_eq!(active.task_title, "Renamed");
        assert_eq!(active.task_local_date, "2026-09-01");
    }

    #[test]
    fn the_active_query_finds_a_timer_scheduled_on_another_date() {
        let mut conn = db();
        task_on(&conn, "task-elsewhere", "Yesterday work", "2026-08-01");
        start_at(&mut conn, "task-elsewhere", "op-1", T0).unwrap();

        let active = active_view(&conn).unwrap().unwrap();
        assert_eq!(active.task_id, "task-elsewhere");
        assert_eq!(active.task_local_date, "2026-08-01");
        assert_eq!(active.started_at_ms, T0);
        assert_eq!(active.completed_seconds_before_active, 0);

        // Today is viewing a different day, and still learns about the running timer.
        let totals = totals_for_date(&conn, "2026-08-07").unwrap();
        assert!(totals.is_empty());
    }

    #[test]
    fn active_view_reports_time_already_banked_before_the_running_segment() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let first = active_id(&conn, "task-a");
        stop_at(&mut conn, &first, T0 + 120_000).unwrap();
        start_at(&mut conn, "task-a", "op-2", T0 + 200_000).unwrap();

        let active = active_view(&conn).unwrap().unwrap();
        assert_eq!(active.completed_seconds_before_active, 120);
        assert_eq!(active.started_at_ms, T0 + 200_000);
        assert_eq!(active.task_title, "Write");
    }

    #[test]
    fn no_active_session_reports_none() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        assert!(active_view(&conn).unwrap().is_none());
        assert!(!any_session_active(&conn).unwrap());
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        assert!(any_session_active(&conn).unwrap());
        let session = active_id(&conn, "task-a");
        stop_at(&mut conn, &session, T0 + 1_000).unwrap();
        assert!(!any_session_active(&conn).unwrap());
        assert!(active_view(&conn).unwrap().is_none());
    }

    #[test]
    fn totals_for_a_date_are_loaded_in_one_grouped_query_without_per_row_lookups() {
        let mut conn = db();
        for index in 0..25 {
            task(&conn, &format!("task-{index}"), &format!("Task {index}"));
        }
        for index in 0..25i64 {
            for round in 0..3i64 {
                let op = format!("op-{index}-{round}");
                start_at(
                    &mut conn,
                    &format!("task-{index}"),
                    &op,
                    T0 + round * 10_000,
                )
                .unwrap();
                let session = active_id(&conn, &format!("task-{index}"));
                stop_at(&mut conn, &session, T0 + round * 10_000 + 5_000).unwrap();
            }
        }
        let totals = totals_for_date(&conn, "2026-08-07").unwrap();
        assert_eq!(totals.len(), 25);
        for index in 0..25 {
            let view = &totals[&format!("task-{index}")];
            assert_eq!(view.total_completed_seconds, 15);
            assert_eq!(view.completed_session_count, 3);
            assert_eq!(view.active_session_id, None);
        }

        // The batch query is a single grouped statement over an index, not a per-row scan.
        let plan: Vec<String> = conn
            .prepare(
                "EXPLAIN QUERY PLAN SELECT s.task_id, SUM(s.ended_at_ms - s.started_at_ms)
                   FROM task_actual_time_sessions s JOIN tasks t ON t.id=s.task_id
                  WHERE t.local_date=?1 GROUP BY s.task_id",
            )
            .unwrap()
            .query_map(["2026-08-07"], |row| row.get::<_, String>(3))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let joined = plan.join("\n");
        assert!(
            joined.contains("task_actual_time_by_task") || joined.contains("SEARCH"),
            "the batched total must use the by-task index: {joined}"
        );
    }

    #[test]
    fn a_running_segment_surfaces_in_the_batched_totals_for_its_own_date() {
        let mut conn = db();
        task(&conn, "task-a", "Write");
        task(&conn, "task-b", "Read");
        start_at(&mut conn, "task-a", "op-1", T0).unwrap();
        let session = active_id(&conn, "task-a");
        stop_at(&mut conn, &session, T0 + 45_000).unwrap();
        start_at(&mut conn, "task-a", "op-2", T0 + 50_000).unwrap();

        let totals = totals_for_date(&conn, "2026-08-07").unwrap();
        let view = &totals["task-a"];
        assert_eq!(view.total_completed_seconds, 45);
        assert_eq!(view.completed_session_count, 1);
        assert_eq!(view.active_started_at_ms, Some(T0 + 50_000));
        assert!(
            !totals.contains_key("task-b"),
            "untimed tasks are simply absent"
        );
    }

    #[test]
    fn a_recurring_occurrence_can_never_own_a_session() {
        let mut conn = db();
        conn.execute(
            "INSERT INTO task_series (id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at)
             VALUES('series-1','Daily','','general','low',600,660,'2026-08-07','UTC','FREQ=DAILY','1','1')",
            [],
        )
        .unwrap();
        // A series id is not a task id, so the foreign key alone forbids it.
        assert!(matches!(
            start_at(&mut conn, "series-1", "op-1", T0),
            Err(TaskError::NotFound)
        ));
        assert!(
            conn.execute(
                "INSERT INTO task_actual_time_sessions VALUES('x','series-1','op-x',1,NULL)",
                [],
            )
            .is_err(),
            "the schema itself excludes recurring subjects"
        );
        assert_eq!(row_count(&conn), 0);
    }

    #[test]
    fn an_active_session_survives_closing_and_reopening_the_database() {
        let root = std::env::temp_dir().join(format!("lw_actual_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&root).unwrap();
        let path = root.join("lifeweave.db");

        let session = {
            let mut conn =
                crate::infrastructure::sqlite::connection::open_file_connection(&path).unwrap();
            run_all_migrations(&mut conn).unwrap();
            task(&conn, "task-a", "Write");
            start_at(&mut conn, "task-a", "op-1", T0).unwrap();
            active_id(&conn, "task-a")
        };

        // Reopen: nothing invents, closes, or advances a session.
        let mut reopened =
            crate::infrastructure::sqlite::connection::open_existing_file_connection(&path)
                .unwrap();
        run_all_migrations(&mut reopened).unwrap();
        let view = task_view(&reopened, "task-a").unwrap();
        assert_eq!(view.active_session_id.as_deref(), Some(session.as_str()));
        assert_eq!(view.active_started_at_ms, Some(T0));
        assert_eq!(view.total_completed_seconds, 0);

        // Elapsed is wall-clock: stopping much later records the whole interval by design.
        let stopped = stop_at(&mut reopened, &session, T0 + 3_600_000).unwrap();
        assert_eq!(stopped.total_completed_seconds, 3_600);

        drop(reopened);
        std::fs::remove_dir_all(root).unwrap();
    }
}
