use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task52_migration};

pub const TASK53_SCHEMA_VERSION: u32 = 30;

// A manual Plan score is now a final retrospective assessment. Existing scored Plans must converge
// to the same completed lifecycle as newly scored Plans; otherwise portfolio placement and Task
// relationship eligibility would depend on which app version wrote the score.
const MIGRATION_30_SQL: &str = r#"
UPDATE focus_plans
   SET lifecycle='completed',
       updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
 WHERE score IS NOT NULL
   AND lifecycle!='completed';
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK53_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK53_SCHEMA_VERSION,
        });
    }
    if current == TASK53_SCHEMA_VERSION {
        return Ok(());
    }

    task52_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current != task52_migration::TASK52_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK53_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_30_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK53_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK53_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    fn insert_plan(conn: &mut Connection, id: &str, lifecycle: &str, score: Option<u32>) {
        let variant_id = format!("variant-{id}");
        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO focus_plans(
                id,selected_variant_id,title,lifecycle,score,outcome,success_criteria_json,
                revision,created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,'','[]',0,'2026-08-01','2026-08-01')",
            params![id, variant_id, id, lifecycle, score],
        )
        .unwrap();
        tx.execute(
            "INSERT INTO focus_plan_variants(
                id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at
             ) VALUES(?1,?2,'Primary','{\"type\":\"doc\",\"content\":[]}','',0,'2026-08-01','2026-08-01')",
            params![variant_id, id],
        )
        .unwrap();
        tx.commit().unwrap();
    }

    #[test]
    fn fresh_database_reaches_schema_30_once() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        run_all_migrations(&mut conn).unwrap();

        assert_eq!(current_schema_version(&conn).unwrap(), 30);
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version=30",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn upgrade_completes_existing_scored_plans_only() {
        let mut conn = open_memory_connection().unwrap();
        task52_migration::run_all_migrations(&mut conn).unwrap();
        insert_plan(&mut conn, "scored-active", "active", Some(84));
        insert_plan(&mut conn, "unscored-active", "active", None);

        run_all_migrations(&mut conn).unwrap();

        assert_eq!(
            conn.query_row(
                "SELECT lifecycle FROM focus_plans WHERE id='scored-active'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap(),
            "completed"
        );
        assert_eq!(
            conn.query_row(
                "SELECT lifecycle FROM focus_plans WHERE id='unscored-active'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap(),
            "active"
        );
        assert_eq!(
            conn.query_row(
                "SELECT score FROM focus_plans WHERE id='scored-active'",
                [],
                |row| row.get::<_, u32>(0),
            )
            .unwrap(),
            84
        );
    }
}
