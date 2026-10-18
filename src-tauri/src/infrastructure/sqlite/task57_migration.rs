use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task56_migration};

pub const TASK57_SCHEMA_VERSION: u32 = 34;

const MIGRATION_34_SQL: &str = r#"
CREATE TABLE task_progress_notes (
    subject_key TEXT PRIMARY KEY NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    series_id TEXT REFERENCES task_series(id) ON DELETE CASCADE,
    original_local_date TEXT,
    note TEXT NOT NULL CHECK(length(note) <= 2000),
    CHECK ((task_id IS NOT NULL AND series_id IS NULL AND original_local_date IS NULL)
        OR (task_id IS NULL AND series_id IS NOT NULL AND original_local_date IS NOT NULL))
);
CREATE UNIQUE INDEX progress_note_task ON task_progress_notes(task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX progress_note_occurrence ON task_progress_notes(series_id,original_local_date) WHERE series_id IS NOT NULL;
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK57_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK57_SCHEMA_VERSION,
        });
    }
    if current == TASK57_SCHEMA_VERSION {
        return Ok(());
    }
    task56_migration::run_all_migrations(conn)?;
    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_34_SQL)?;
    tx.execute("INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))", params![TASK57_SCHEMA_VERSION])?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK57_SCHEMA_VERSION
}
pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    #[test]
    fn fresh_and_schema_33_upgrade_are_idempotent_and_preserve_evaluations() {
        for upgrade in [false, true] {
            let mut conn = open_memory_connection().unwrap();
            if upgrade {
                task56_migration::run_all_migrations(&mut conn).unwrap();
                conn.execute("INSERT INTO tasks(id,title,description,local_date,start_minute,end_minute,category_id,priority,created_at,updated_at) VALUES('existing','Keep me','Original goal','2026-01-01',480,540,'general','medium','1','1')", []).unwrap();
                crate::task::evaluation::evaluate_at(
                    &mut conn,
                    crate::task::dto::EvaluateTaskInput {
                        subject_kind: "one_off".into(),
                        task_id: Some("existing".into()),
                        series_id: None,
                        original_local_date: None,
                        state_id: "completion-below".into(),
                        operation_id: "before-upgrade".into(),
                        observed_local_date: "2026-01-02".into(),
                        observed_local_minute: 720,
                    },
                    crate::task::evaluation::ObservedLocalTime {
                        date: "2026-01-02".into(),
                        minute: 720,
                    },
                )
                .unwrap();
            }
            run_all_migrations(&mut conn).unwrap();
            run_all_migrations(&mut conn).unwrap();
            assert_eq!(current_schema_version(&conn).unwrap(), 34);
            assert_eq!(
                conn.query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=34",
                    [],
                    |r| r.get::<_, i64>(0)
                )
                .unwrap(),
                1
            );
            assert_eq!(
                conn.query_row("SELECT COUNT(*) FROM completion_states", [], |r| r
                    .get::<_, i64>(0))
                    .unwrap(),
                4
            );
            assert!(
                conn.execute(
                    "INSERT INTO task_progress_notes(subject_key,note) VALUES('bad','note')",
                    []
                )
                .is_err()
            );
            if upgrade {
                let rows = crate::task::repository::today_items(&conn, "2026-01-01", "2026-01-02")
                    .unwrap();
                assert_eq!(rows[0].description, "Original goal");
                assert_eq!(
                    rows[0].evaluation.as_ref().unwrap().operation_id,
                    "before-upgrade"
                );
                assert!(rows[0].progress_note.is_none());
            }
        }
    }

    #[test]
    fn future_schema_is_rejected_without_creating_a_note_table() {
        let mut conn = open_memory_connection().unwrap();
        task56_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO schema_migrations(version,applied_at) VALUES(35,'future')",
            [],
        )
        .unwrap();
        assert!(matches!(
            run_all_migrations(&mut conn),
            Err(DbError::SchemaTooNew {
                stored: 35,
                supported: 34
            })
        ));
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE name='task_progress_notes'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
    }
}
