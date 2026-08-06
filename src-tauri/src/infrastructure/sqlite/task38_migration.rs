use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task37_migration};

pub const TASK38_SCHEMA_VERSION: u32 = 22;

// Task 38 one-off Task deadline persistence.
//
// `tasks` is the only canonical one-off Task authority, so it is the only table that receives a
// deadline. Recurring series, occurrences, overrides, and evaluations deliberately receive
// nothing: recurring deadline policy is unresolved and must not be guessed here.
//
// A deadline is date-only and local. It is independent of the scheduled `local_date`, so no
// cross-column constraint is declared: scheduling work after its own deadline is a real user
// state the product surfaces rather than repairs.
//
// The index is partial because every deadline query filters NULLs out and scans a bounded
// range, so unscheduled-for-deadline rows never enter the index.
const MIGRATION_22_SQL: &str = r#"
ALTER TABLE tasks ADD COLUMN deadline_local_date TEXT NULL
    CHECK(deadline_local_date IS NULL
          OR deadline_local_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
CREATE INDEX tasks_deadline_idx ON tasks(deadline_local_date)
    WHERE deadline_local_date IS NOT NULL;
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK38_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK38_SCHEMA_VERSION,
        });
    }
    if current == TASK38_SCHEMA_VERSION {
        return Ok(());
    }

    task37_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK38_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task37_migration::TASK37_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK38_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_22_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK38_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK38_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    fn column_exists(conn: &Connection, table: &str, column: &str) -> bool {
        conn.query_row::<i64, _, _>(
            &format!("SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name=?1"),
            params![column],
            |row| row.get(0),
        )
        .unwrap()
            == 1
    }

    fn seed_task(conn: &Connection, id: &str, date: &str) {
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at) VALUES(?1,?2,600,660,'Study','','general','medium','1','1')",
            params![id, date],
        )
        .unwrap();
    }

    #[test]
    fn fresh_database_reaches_schema_22_once() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        run_all_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 22);
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM schema_migrations WHERE version=22",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn schema_21_upgrades_and_leaves_existing_tasks_without_a_deadline() {
        let mut conn = open_memory_connection().unwrap();
        task37_migration::run_all_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 21);
        seed_task(&conn, "task-1", "2026-08-06");

        run_all_migrations(&mut conn).unwrap();

        assert_eq!(current_schema_version(&conn).unwrap(), 22);
        let row: (String, String, Option<String>) = conn
            .query_row(
                "SELECT title,local_date,deadline_local_date FROM tasks WHERE id='task-1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(row, ("Study".into(), "2026-08-06".into(), None));
    }

    #[test]
    fn deadline_column_exists_only_on_the_one_off_task_authority() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        assert!(column_exists(&conn, "tasks", "deadline_local_date"));
        // Recurring deadline policy is unresolved; nothing else may own a deadline.
        for table in [
            "task_series",
            "task_occurrence_overrides",
            "task_evaluations",
            "evaluation_operations",
        ] {
            assert!(
                !column_exists(&conn, table, "deadline_local_date"),
                "{table} must not own a deadline"
            );
        }
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='tasks_deadline_idx'",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn stored_deadline_must_be_a_date_shaped_value() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        seed_task(&conn, "task-1", "2026-08-06");
        assert!(
            conn.execute(
                "UPDATE tasks SET deadline_local_date='06-08-2026' WHERE id='task-1'",
                [],
            )
            .is_err(),
            "malformed deadline must be rejected by the column constraint"
        );
        conn.execute(
            "UPDATE tasks SET deadline_local_date='2026-08-12' WHERE id='task-1'",
            [],
        )
        .unwrap();
        conn.execute(
            "UPDATE tasks SET deadline_local_date=NULL WHERE id='task-1'",
            [],
        )
        .unwrap();
    }

    #[test]
    fn bounded_deadline_range_uses_the_partial_index() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let plan: String = conn
            .query_row(
                "EXPLAIN QUERY PLAN SELECT id FROM tasks
                 WHERE deadline_local_date IS NOT NULL
                   AND deadline_local_date BETWEEN '2026-07-07' AND '2026-08-20'",
                [],
                |row| row.get(3),
            )
            .unwrap();
        assert!(
            plan.contains("tasks_deadline_idx"),
            "deadline range scan did not use the partial index: {plan}"
        );
    }
}
