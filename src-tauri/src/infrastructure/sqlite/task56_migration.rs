use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task55_migration};

pub const TASK56_SCHEMA_VERSION: u32 = 33;

// ADR 0053 gives a Focus Plan one explicitly user-authored priority. The column is NOT NULL because
// the four-level Plan scale already carries its own neutral level, so an absent priority would be
// indistinguishable from 'normal' while forcing every ordering query to handle a NULL bucket.
// Migrations 1-32 remain immutable.
const MIGRATION_33_SQL: &str = r#"
ALTER TABLE focus_plans
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('critical','high','normal','low'));
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK56_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK56_SCHEMA_VERSION,
        });
    }
    if current == TASK56_SCHEMA_VERSION {
        return Ok(());
    }

    task55_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current != task55_migration::TASK55_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK56_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_33_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK56_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK56_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    const INSERT_PLAN_SQL: &str = "BEGIN;
         PRAGMA defer_foreign_keys=ON;
         INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at)
         VALUES('plan-1','variant-1','Existing','active','','[]',0,'1','1');
         INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at)
         VALUES('variant-1','plan-1','Primary','{\"type\":\"doc\",\"content\":[]}','',0,'1','1');
         COMMIT;";

    #[test]
    fn fresh_and_schema_32_databases_reach_33_once() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 33);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=33",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        // A Plan written before the upgrade keeps every other field and converges on the neutral level.
        let mut upgraded = open_memory_connection().unwrap();
        task55_migration::run_all_migrations(&mut upgraded).unwrap();
        upgraded.execute_batch(INSERT_PLAN_SQL).unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        assert_eq!(current_schema_version(&upgraded).unwrap(), 33);
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT priority,title,lifecycle FROM focus_plans WHERE id='plan-1'",
                    [],
                    |row| Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    )),
                )
                .unwrap(),
            ("normal".into(), "Existing".into(), "active".into()),
        );
    }

    #[test]
    fn sqlite_rejects_priorities_outside_the_four_plan_levels() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn.execute_batch(INSERT_PLAN_SQL).unwrap();
        for invalid in ["medium", "urgent", ""] {
            assert!(
                conn.execute(
                    "UPDATE focus_plans SET priority=?1 WHERE id='plan-1'",
                    [invalid],
                )
                .is_err()
            );
        }
        for valid in ["critical", "high", "normal", "low"] {
            conn.execute(
                "UPDATE focus_plans SET priority=?1 WHERE id='plan-1'",
                [valid],
            )
            .unwrap();
        }
    }
}
