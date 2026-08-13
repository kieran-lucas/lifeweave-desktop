use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task53_migration};

pub const TASK54_SCHEMA_VERSION: u32 = 31;

// The task category catalog starts with the Product Owner's small, stable set of workstreams.
// INSERT OR IGNORE is deliberate: an existing category identity and all user-configured goal
// metadata remain authoritative on upgrade.
const MIGRATION_31_SQL: &str = r#"
INSERT OR IGNORE INTO task_categories(id,name,icon_key,color_key,archived_at) VALUES
  ('english','English','category-english','blue',NULL),
  ('lab-research','Lab / Research','category-research','violet',NULL),
  ('code-cs','Code / CS','category-code','indigo',NULL),
  ('physics-olympic','Physics / Olympic','category-physics','amber',NULL),
  ('university','University','category-university','teal',NULL),
  ('projects','Projects','category-projects','pink',NULL),
  ('finance','Finance','category-finance','green',NULL),
  ('health','Health / Gym / Running','category-health','orange',NULL),
  ('home','Home','category-home','neutral',NULL),
  ('administration','Administration','category-administration','violet',NULL);
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK54_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK54_SCHEMA_VERSION,
        });
    }
    if current == TASK54_SCHEMA_VERSION {
        return Ok(());
    }

    task53_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current != task53_migration::TASK53_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK54_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_31_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK54_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK54_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    #[test]
    fn fresh_database_reaches_schema_31_with_the_small_workstream_catalog_once() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        run_all_migrations(&mut conn).unwrap();

        assert_eq!(current_schema_version(&conn).unwrap(), 31);
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM task_categories WHERE archived_at IS NULL",
                [],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            11
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version=31",
                [],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn upgrade_never_overwrites_an_existing_category_identity() {
        let mut conn = open_memory_connection().unwrap();
        task53_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO task_categories(id,name,icon_key,color_key,archived_at) VALUES('english','My English','custom-icon','teal',NULL)",
            [],
        ).unwrap();

        run_all_migrations(&mut conn).unwrap();

        let actual = conn
            .query_row(
                "SELECT name,icon_key,color_key FROM task_categories WHERE id='english'",
                [],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                },
            )
            .unwrap();
        assert_eq!(
            actual,
            ("My English".into(), "custom-icon".into(), "teal".into())
        );
    }
}
