use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task47_migration};

pub const TASK51_SCHEMA_VERSION: u32 = 28;

// ADR 0047 adds one current, explicitly user-authored score. It is nullable because an unscored
// Plan is distinct from every value in 1..=100. Migrations 1-27 remain immutable.
const MIGRATION_28_SQL: &str = r#"
ALTER TABLE focus_plans
  ADD COLUMN score INTEGER CHECK(score IS NULL OR (score >= 1 AND score <= 100));
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK51_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK51_SCHEMA_VERSION,
        });
    }
    if current == TASK51_SCHEMA_VERSION {
        return Ok(());
    }

    task47_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current != task47_migration::TASK47_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK51_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_28_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK51_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK51_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    #[test]
    fn fresh_and_schema_27_databases_reach_28_once() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 28);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=28",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        let mut upgraded = open_memory_connection().unwrap();
        task47_migration::run_all_migrations(&mut upgraded).unwrap();
        upgraded
            .execute_batch(
                "BEGIN;
                 PRAGMA defer_foreign_keys=ON;
                 INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at)
                 VALUES('plan-1','variant-1','Existing','active','','[]',0,'1','1');
                 INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at)
                 VALUES('variant-1','plan-1','Primary','{\"type\":\"doc\",\"content\":[]}','',0,'1','1');
                 COMMIT;",
            )
            .unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        assert_eq!(current_schema_version(&upgraded).unwrap(), 28);
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT score FROM focus_plans WHERE id='plan-1'",
                    [],
                    |row| { row.get::<_, Option<u32>>(0) }
                )
                .unwrap(),
            None
        );
    }

    #[test]
    fn sqlite_rejects_scores_outside_one_through_one_hundred() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn.execute_batch(
            "BEGIN;
             PRAGMA defer_foreign_keys=ON;
             INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at)
             VALUES('plan-1','variant-1','Plan','active','','[]',0,'1','1');
             INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at)
             VALUES('variant-1','plan-1','Primary','{\"type\":\"doc\",\"content\":[]}','',0,'1','1');
             COMMIT;",
        )
        .unwrap();
        for invalid in [0, 101] {
            assert!(
                conn.execute(
                    "UPDATE focus_plans SET score=?1 WHERE id='plan-1'",
                    [invalid],
                )
                .is_err()
            );
        }
        conn.execute("UPDATE focus_plans SET score=100 WHERE id='plan-1'", [])
            .unwrap();
    }
}
