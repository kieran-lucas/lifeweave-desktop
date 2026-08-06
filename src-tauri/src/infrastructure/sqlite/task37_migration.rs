use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration};

pub const TASK37_SCHEMA_VERSION: u32 = 21;

// Task 37 relationship + review persistence.
//
// `tasks` and `task_series` are the two canonical Task authorities, so both receive the
// nullable relationship column exactly as migration 16 did for `life_node_id`. Occurrence,
// override, and evaluation rows are projections and intentionally receive no column: a
// recurring occurrence inherits its Focus Plan from its authoritative series.
//
// Target validity (exists and not archived) is enforced in Rust at commit time rather than by
// a trigger, so that an existing link to a later-archived Plan survives unrelated edits.
//
// Reviews are user-authored history owned by the Plan. `operation_id` is UNIQUE so a retried
// creation resolves to the existing row instead of duplicating. They are deliberately not
// Search-indexed and carry no dirty-scope trigger.
const MIGRATION_21_SQL: &str = r#"
ALTER TABLE tasks ADD COLUMN focus_plan_id TEXT NULL REFERENCES focus_plans(id) ON DELETE RESTRICT;
ALTER TABLE task_series ADD COLUMN focus_plan_id TEXT NULL REFERENCES focus_plans(id) ON DELETE RESTRICT;
CREATE INDEX tasks_focus_plan_idx ON tasks(focus_plan_id);
CREATE INDEX task_series_focus_plan_idx ON task_series(focus_plan_id);

CREATE TABLE focus_plan_reviews (
    id                  TEXT PRIMARY KEY NOT NULL,
    plan_id             TEXT NOT NULL REFERENCES focus_plans(id) ON DELETE CASCADE,
    operation_id        TEXT NOT NULL UNIQUE,
    reviewed_local_date TEXT NOT NULL CHECK(reviewed_local_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    reflection          TEXT NOT NULL CHECK(length(trim(reflection)) BETWEEN 1 AND 4000),
    next_focus          TEXT CHECK(next_focus IS NULL OR length(next_focus) <= 2000),
    created_at          TEXT NOT NULL
);
CREATE INDEX focus_plan_reviews_history_idx
    ON focus_plan_reviews(plan_id,reviewed_local_date DESC,created_at DESC,id DESC);
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK37_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK37_SCHEMA_VERSION,
        });
    }
    if current == TASK37_SCHEMA_VERSION {
        return Ok(());
    }

    task36_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK37_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task36_migration::TASK36_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK37_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_21_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK37_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK37_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    fn column_exists(conn: &Connection, table: &str, column: &str) -> bool {
        let count: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name=?1"),
                params![column],
                |row| row.get(0),
            )
            .unwrap();
        count == 1
    }

    fn index_exists(conn: &Connection, name: &str) -> bool {
        conn.query_row::<i64, _, _>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?1",
            params![name],
            |row| row.get(0),
        )
        .unwrap()
            == 1
    }

    // `focus_plans.selected_variant_id` is DEFERRABLE INITIALLY DEFERRED, so the plan and its
    // first variant must be inserted inside one transaction.
    fn seed_plan(conn: &mut Connection, plan_id: &str) {
        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at) VALUES(?1,?2,'Plan','active','','[]',0,'now','now')",
            params![plan_id, format!("variant-{plan_id}")],
        )
        .unwrap();
        tx.execute(
            "INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at) VALUES(?1,?2,'A','{\"type\":\"doc\",\"content\":[]}','',0,'now','now')",
            params![format!("variant-{plan_id}"), plan_id],
        )
        .unwrap();
        tx.commit().unwrap();
    }

    fn seed_task(conn: &Connection, id: &str) {
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at) VALUES(?1,'2026-08-06',600,660,'Study','','general','medium','1','1')",
            params![id],
        )
        .unwrap();
    }

    fn seed_series(conn: &Connection, id: &str) {
        conn.execute(
            "INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at) VALUES(?1,'Weekly review','','general','medium',600,660,'2026-08-06','local','FREQ=WEEKLY;INTERVAL=1','1','1')",
            params![id],
        )
        .unwrap();
    }

    #[test]
    fn fresh_database_reaches_schema_21_once() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        run_all_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 21);
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM schema_migrations WHERE version=21",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn schema_20_upgrades_and_leaves_existing_work_unlinked() {
        let mut conn = open_memory_connection().unwrap();
        task36_migration::run_all_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 20);
        seed_task(&conn, "task-1");
        seed_series(&conn, "series-1");

        run_all_migrations(&mut conn).unwrap();

        assert_eq!(current_schema_version(&conn).unwrap(), 21);
        let task: (String, Option<String>) = conn
            .query_row(
                "SELECT title,focus_plan_id FROM tasks WHERE id='task-1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(task, ("Study".to_string(), None));
        let series: (String, Option<String>) = conn
            .query_row(
                "SELECT title,focus_plan_id FROM task_series WHERE id='series-1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(series, ("Weekly review".to_string(), None));
    }

    #[test]
    fn relation_columns_exist_only_on_the_two_task_authorities() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        for table in ["tasks", "task_series"] {
            assert!(
                column_exists(&conn, table, "focus_plan_id"),
                "{table} is missing focus_plan_id"
            );
        }
        for table in [
            "task_occurrence_overrides",
            "task_evaluations",
            "evaluation_operations",
        ] {
            assert!(
                !column_exists(&conn, table, "focus_plan_id"),
                "{table} must not own a Focus Plan relation"
            );
        }
        assert!(index_exists(&conn, "tasks_focus_plan_idx"));
        assert!(index_exists(&conn, "task_series_focus_plan_idx"));
        assert!(index_exists(&conn, "focus_plan_reviews_history_idx"));
    }

    #[test]
    fn foreign_keys_reject_an_unknown_focus_plan_target() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        seed_task(&conn, "task-1");
        let result = conn.execute(
            "UPDATE tasks SET focus_plan_id='missing-plan' WHERE id='task-1'",
            [],
        );
        assert!(result.is_err(), "foreign key was not enforced");
    }

    #[test]
    fn archiving_a_plan_preserves_linked_work() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        seed_plan(&mut conn, "plan-1");
        seed_task(&conn, "task-1");
        conn.execute(
            "UPDATE tasks SET focus_plan_id='plan-1' WHERE id='task-1'",
            [],
        )
        .unwrap();
        conn.execute(
            "UPDATE focus_plans SET archived_at='now' WHERE id='plan-1'",
            [],
        )
        .unwrap();
        conn.execute("UPDATE tasks SET title='Study more' WHERE id='task-1'", [])
            .unwrap();
        let linked: Option<String> = conn
            .query_row(
                "SELECT focus_plan_id FROM tasks WHERE id='task-1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(linked.as_deref(), Some("plan-1"));
    }

    #[test]
    fn review_rows_enforce_bounds_and_idempotent_operation_ids() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        seed_plan(&mut conn, "plan-1");
        let insert = "INSERT INTO focus_plan_reviews(id,plan_id,operation_id,reviewed_local_date,reflection,next_focus,created_at) VALUES(?1,'plan-1',?2,?3,?4,NULL,'1')";

        conn.execute(
            insert,
            params!["review-1", "op-1", "2026-08-06", "Steady progress."],
        )
        .unwrap();
        assert!(
            conn.execute(
                insert,
                params!["review-2", "op-1", "2026-08-07", "Duplicate operation."]
            )
            .is_err(),
            "operation_id must be unique"
        );
        assert!(
            conn.execute(insert, params!["review-3", "op-3", "2026-08-06", "   "])
                .is_err(),
            "whitespace-only reflection must be rejected"
        );
        assert!(
            conn.execute(
                insert,
                params!["review-4", "op-4", "06-08-2026", "Bad date."]
            )
            .is_err(),
            "malformed review date must be rejected"
        );
        conn.execute(
            insert,
            params!["review-5", "op-5", "2026-08-06", "Same date is allowed."],
        )
        .unwrap();
        assert_eq!(
            conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM focus_plan_reviews", [], |r| r
                .get(0))
                .unwrap(),
            2
        );
    }
}
