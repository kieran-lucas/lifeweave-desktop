use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task42_migration};

pub const TASK43_SCHEMA_VERSION: u32 = 26;

// Explicit Actual Time Sessions stores one immutable segment per completed interval, plus at most
// one open segment globally.
//
// `task_actual_time_single_active` is the authoritative concurrency defense: a partial unique index
// over a constant expression admits exactly one row satisfying `ended_at_ms IS NULL` while leaving
// closed rows unconstrained. Enforcing this in the database rather than in Rust means two racing
// Start calls cannot both succeed.
//
// `start_operation_id` is UNIQUE so a retried Start resolves to the original session instead of
// creating a second segment. `ON DELETE CASCADE` ties history to the owning one-off Task; recurring
// occurrences are structurally excluded because a session can only reference `tasks.id`.
// See docs/adr/0037-explicit-actual-time-sessions.md.
const MIGRATION_26_SQL: &str = r#"
CREATE TABLE task_actual_time_sessions (
    id                 TEXT PRIMARY KEY NOT NULL,
    task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_operation_id TEXT NOT NULL UNIQUE,
    started_at_ms      INTEGER NOT NULL CHECK(started_at_ms >= 0),
    ended_at_ms        INTEGER CHECK(
        ended_at_ms IS NULL OR ended_at_ms >= started_at_ms
    )
);
CREATE INDEX task_actual_time_by_task
    ON task_actual_time_sessions(task_id, started_at_ms, id);
CREATE UNIQUE INDEX task_actual_time_single_active
    ON task_actual_time_sessions((1))
    WHERE ended_at_ms IS NULL;
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK43_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK43_SCHEMA_VERSION,
        });
    }
    if current == TASK43_SCHEMA_VERSION {
        return Ok(());
    }

    task42_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK43_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task42_migration::TASK42_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK43_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_26_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK43_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK43_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    fn task(conn: &Connection, id: &str) {
        conn.execute(
            "INSERT INTO tasks (id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES(?1,'2026-08-07',600,660,'Task','','general','low','1','1')",
            params![id],
        )
        .unwrap();
    }

    fn session(
        conn: &Connection,
        id: &str,
        task_id: &str,
        op: &str,
        start: i64,
        end: Option<i64>,
    ) -> rusqlite::Result<usize> {
        conn.execute(
            "INSERT INTO task_actual_time_sessions VALUES(?1,?2,?3,?4,?5)",
            params![id, task_id, op, start, end],
        )
    }

    #[test]
    fn fresh_and_schema_25_databases_reach_26_once_and_preserve_existing_data() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 26);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=26",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        let mut upgraded = open_memory_connection().unwrap();
        task42_migration::run_all_migrations(&mut upgraded).unwrap();
        task(&upgraded, "preserved-task");
        upgraded
            .execute(
                "INSERT INTO life_nodes VALUES('preserved','life-root','Preserved','','life-leaf','neutral',1,NULL,'1','1',0)",
                [],
            )
            .unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        assert_eq!(current_schema_version(&upgraded).unwrap(), 26);
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT title FROM tasks WHERE id='preserved-task'",
                    [],
                    |r| r.get::<_, String>(0)
                )
                .unwrap(),
            "Task"
        );
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT title FROM life_nodes WHERE id='preserved'",
                    [],
                    |r| r.get::<_, String>(0)
                )
                .unwrap(),
            "Preserved"
        );
        assert_eq!(
            upgraded
                .query_row("SELECT COUNT(*) FROM task_actual_time_sessions", [], |r| {
                    r.get::<_, i64>(0)
                })
                .unwrap(),
            0,
            "an upgraded database starts with no recorded time"
        );
    }

    #[test]
    fn table_has_exact_columns_checks_cascade_and_both_indexes() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();

        let columns = conn
            .prepare("SELECT name FROM pragma_table_info('task_actual_time_sessions') ORDER BY cid")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            columns,
            [
                "id",
                "task_id",
                "start_operation_id",
                "started_at_ms",
                "ended_at_ms"
            ],
            "no pause, adjustment, recurring-subject, snapshot, aggregate, or telemetry column"
        );

        let fks = conn
            .prepare("SELECT \"from\", \"table\", \"to\", on_delete FROM pragma_foreign_key_list('task_actual_time_sessions')")
            .unwrap()
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            fks,
            vec![(
                "task_id".into(),
                "tasks".into(),
                "id".into(),
                "CASCADE".into()
            )]
        );

        for index in ["task_actual_time_by_task", "task_actual_time_single_active"] {
            assert_eq!(
                conn.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?1",
                    [index],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
                1,
                "{index} must exist"
            );
        }
        assert!(
            conn.query_row(
                "SELECT sql FROM sqlite_master WHERE name='task_actual_time_single_active'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap()
            .contains("WHERE ended_at_ms IS NULL"),
            "the single-active index must stay partial"
        );

        task(&conn, "task-a");
        // Non-negative start and end-at-or-after-start are database invariants.
        assert!(session(&conn, "neg", "task-a", "op-neg", -1, None).is_err());
        assert!(session(&conn, "back", "task-a", "op-back", 100, Some(99)).is_err());
        session(&conn, "equal", "task-a", "op-equal", 100, Some(100)).unwrap();
        assert!(
            session(&conn, "orphan", "missing-task", "op-orphan", 1, Some(2)).is_err(),
            "a session cannot reference a task that does not exist"
        );
    }

    #[test]
    fn only_one_session_can_be_active_while_closed_segments_are_unlimited() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        task(&conn, "task-a");
        task(&conn, "task-b");

        session(&conn, "s1", "task-a", "op-1", 1_000, None).unwrap();
        // A second active row is refused regardless of which task it belongs to.
        assert!(session(&conn, "s2", "task-a", "op-2", 2_000, None).is_err());
        assert!(session(&conn, "s3", "task-b", "op-3", 2_000, None).is_err());

        conn.execute(
            "UPDATE task_actual_time_sessions SET ended_at_ms=2000 WHERE id='s1'",
            [],
        )
        .unwrap();
        // Once closed, another session may open, and closed segments accumulate freely.
        session(&conn, "s2", "task-b", "op-2", 3_000, None).unwrap();
        for index in 0..50 {
            session(
                &conn,
                &format!("closed-{index}"),
                "task-a",
                &format!("op-closed-{index}"),
                index * 10,
                Some(index * 10 + 5),
            )
            .unwrap();
        }
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM task_actual_time_sessions WHERE ended_at_ms IS NULL",
                [],
                |r| r.get::<_, i64>(0),
            )
            .unwrap(),
            1
        );
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM task_actual_time_sessions", [], |r| {
                r.get::<_, i64>(0)
            })
            .unwrap(),
            52
        );
    }

    #[test]
    fn start_operation_identity_is_unique_and_task_delete_cascades_history() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        task(&conn, "task-a");
        task(&conn, "task-b");

        session(&conn, "s1", "task-a", "shared-op", 1, Some(2)).unwrap();
        assert!(
            session(&conn, "s2", "task-a", "shared-op", 3, Some(4)).is_err(),
            "a start operation identity cannot be reused on the same task"
        );
        assert!(
            session(&conn, "s3", "task-b", "shared-op", 3, Some(4)).is_err(),
            "nor on a different task"
        );

        session(&conn, "s4", "task-a", "op-4", 5, Some(6)).unwrap();
        session(&conn, "s5", "task-b", "op-5", 7, Some(8)).unwrap();
        conn.execute("DELETE FROM tasks WHERE id='task-a'", [])
            .unwrap();
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM task_actual_time_sessions WHERE task_id='task-a'",
                [],
                |r| r.get::<_, i64>(0),
            )
            .unwrap(),
            0,
            "deleting a task removes its actual-time history"
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM task_actual_time_sessions WHERE task_id='task-b'",
                [],
                |r| r.get::<_, i64>(0),
            )
            .unwrap(),
            1,
            "and leaves every other task untouched"
        );
        assert_eq!(
            conn.prepare("PRAGMA foreign_key_check")
                .unwrap()
                .query_map([], |_| Ok(()))
                .unwrap()
                .count(),
            0
        );
    }

    #[test]
    fn schema_too_new_is_rejected_without_writes() {
        let mut conn = open_memory_connection().unwrap();
        task42_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO schema_migrations(version,applied_at) VALUES(27,'1')",
            [],
        )
        .unwrap();
        assert!(matches!(
            run_all_migrations(&mut conn),
            Err(DbError::SchemaTooNew {
                stored: 27,
                supported: 26
            })
        ));
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='task_actual_time_sessions'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            0,
            "a refused upgrade must not create the table"
        );
    }
}
