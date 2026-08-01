use rusqlite::{Connection, params};

use super::DbError;

/// Infrastructure-layer row returned by all repository functions.
/// The IPC layer maps this to `FoundationRecordRow` for serialization.
#[derive(Debug)]
pub struct FoundationRecordRow {
    pub id: String,
    pub label: String,
    pub created_at: String,
    pub updated_at: String,
    pub revision: u32,
    pub archived_at: Option<String>,
}

#[derive(Debug)]
pub enum RepoError {
    Db(DbError),
    NotFound,
    StaleRevision,
}

impl From<DbError> for RepoError {
    fn from(e: DbError) -> Self {
        RepoError::Db(e)
    }
}

impl From<rusqlite::Error> for RepoError {
    fn from(e: rusqlite::Error) -> Self {
        RepoError::Db(DbError::Rusqlite(e))
    }
}

pub fn create(conn: &mut Connection, label: &str) -> Result<FoundationRecordRow, DbError> {
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO foundation_records (id, label, created_at, updated_at, revision)
         VALUES (
             lower(hex(randomblob(16))),
             ?1,
             strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
             strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
             0
         )",
        params![label],
    )?;
    let record = tx.query_row(
        "SELECT id, label, created_at, updated_at, revision, archived_at
         FROM foundation_records
         WHERE rowid = last_insert_rowid()",
        [],
        map_row,
    )?;
    tx.commit()?;
    Ok(record)
}

pub fn list_active(conn: &Connection) -> Result<Vec<FoundationRecordRow>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, label, created_at, updated_at, revision, archived_at
         FROM foundation_records
         WHERE archived_at IS NULL
         ORDER BY created_at ASC, id ASC",
    )?;
    let rows = stmt
        .query_map([], map_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn update(
    conn: &mut Connection,
    id: &str,
    label: &str,
    expected_revision: u32,
) -> Result<FoundationRecordRow, RepoError> {
    let tx = conn.transaction()?;
    let affected = tx.execute(
        "UPDATE foundation_records
         SET label = ?1,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
             revision = revision + 1
         WHERE id = ?2 AND revision = ?3 AND archived_at IS NULL",
        params![label, id, expected_revision],
    )?;
    if affected == 0 {
        let exists: bool = tx
            .query_row(
                "SELECT COUNT(*) FROM foundation_records WHERE id = ?1",
                params![id],
                |r| r.get::<_, i64>(0),
            )
            .map(|n| n > 0)?;
        return if exists {
            Err(RepoError::StaleRevision)
        } else {
            Err(RepoError::NotFound)
        };
    }
    let record = tx.query_row(
        "SELECT id, label, created_at, updated_at, revision, archived_at
         FROM foundation_records WHERE id = ?1",
        params![id],
        map_row,
    )?;
    tx.commit()?;
    Ok(record)
}

pub fn archive(conn: &mut Connection, id: &str, expected_revision: u32) -> Result<(), RepoError> {
    let tx = conn.transaction()?;
    let affected = tx.execute(
        "UPDATE foundation_records
         SET archived_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
             revision = revision + 1,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?1 AND revision = ?2 AND archived_at IS NULL",
        params![id, expected_revision],
    )?;
    if affected == 0 {
        let exists: bool = tx
            .query_row(
                "SELECT COUNT(*) FROM foundation_records WHERE id = ?1",
                params![id],
                |r| r.get::<_, i64>(0),
            )
            .map(|n| n > 0)?;
        return if exists {
            Err(RepoError::StaleRevision)
        } else {
            Err(RepoError::NotFound)
        };
    }
    tx.commit()?;
    Ok(())
}

pub fn restore(conn: &mut Connection, id: &str, expected_revision: u32) -> Result<(), RepoError> {
    let tx = conn.transaction()?;
    let affected = tx.execute(
        "UPDATE foundation_records
         SET archived_at = NULL,
             revision = revision + 1,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?1 AND revision = ?2 AND archived_at IS NOT NULL",
        params![id, expected_revision],
    )?;
    if affected == 0 {
        let exists: bool = tx
            .query_row(
                "SELECT COUNT(*) FROM foundation_records WHERE id = ?1",
                params![id],
                |r| r.get::<_, i64>(0),
            )
            .map(|n| n > 0)?;
        return if exists {
            Err(RepoError::StaleRevision)
        } else {
            Err(RepoError::NotFound)
        };
    }
    tx.commit()?;
    Ok(())
}

fn map_row(row: &rusqlite::Row<'_>) -> Result<FoundationRecordRow, rusqlite::Error> {
    Ok(FoundationRecordRow {
        id: row.get(0)?,
        label: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
        revision: row.get::<_, i64>(4)? as u32,
        archived_at: row.get(5)?,
    })
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU32, Ordering};

    use super::*;
    use crate::infrastructure::sqlite::connection::{open_file_connection, open_memory_connection};
    use crate::infrastructure::sqlite::migrations::run_migrations;

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_db_path(tag: &str) -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut p = std::env::temp_dir();
        p.push(format!("lifeweave_fr_{tag}_{n}.db"));
        p
    }

    fn cleanup(path: &std::path::Path) {
        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }

    fn migrated_memory() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn create_returns_record_with_expected_fields() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "My first record").unwrap();
        assert_eq!(r.label, "My first record");
        assert_eq!(r.revision, 0);
        assert!(r.archived_at.is_none());
        assert!(!r.id.is_empty());
        assert!(!r.created_at.is_empty());
    }

    #[test]
    fn list_active_returns_only_active_records() {
        let mut conn = migrated_memory();
        let r1 = create(&mut conn, "Active").unwrap();
        let r2 = create(&mut conn, "Will archive").unwrap();
        archive(&mut conn, &r2.id, r2.revision).unwrap();

        let active = list_active(&conn).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].id, r1.id);
    }

    #[test]
    fn list_active_returns_both_active_records() {
        let mut conn = migrated_memory();
        let r1 = create(&mut conn, "First").unwrap();
        let r2 = create(&mut conn, "Second").unwrap();
        let active = list_active(&conn).unwrap();
        assert_eq!(active.len(), 2);
        // Both IDs present regardless of order (created_at resolution is 1s so order is by id)
        let ids: Vec<&str> = active.iter().map(|r| r.id.as_str()).collect();
        assert!(ids.contains(&r1.id.as_str()));
        assert!(ids.contains(&r2.id.as_str()));
    }

    #[test]
    fn update_increments_revision_and_returns_new_label() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "Original").unwrap();
        let updated = update(&mut conn, &r.id, "Updated", r.revision).unwrap();
        assert_eq!(updated.label, "Updated");
        assert_eq!(updated.revision, 1);
    }

    #[test]
    fn update_stale_revision_returns_stale_revision_error() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "Original").unwrap();
        // Use a wrong expected revision
        let result = update(&mut conn, &r.id, "Updated", 99);
        assert!(matches!(result, Err(RepoError::StaleRevision)));
    }

    #[test]
    fn update_nonexistent_id_returns_not_found() {
        let mut conn = migrated_memory();
        let result = update(&mut conn, "nonexistent-id", "Label", 0);
        assert!(matches!(result, Err(RepoError::NotFound)));
    }

    #[test]
    fn archive_sets_archived_at_and_removes_from_active_list() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "To archive").unwrap();
        archive(&mut conn, &r.id, r.revision).unwrap();

        let active = list_active(&conn).unwrap();
        assert!(active.is_empty());
    }

    #[test]
    fn archive_stale_revision_returns_stale_revision_error() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "Record").unwrap();
        let result = archive(&mut conn, &r.id, 99);
        assert!(matches!(result, Err(RepoError::StaleRevision)));
    }

    #[test]
    fn restore_makes_record_active_again() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "Record").unwrap();
        let archived = archive(&mut conn, &r.id, r.revision);
        assert!(archived.is_ok());

        // revision is now 1 after archive
        restore(&mut conn, &r.id, 1).unwrap();

        let active = list_active(&conn).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].id, r.id);
        assert!(active[0].archived_at.is_none());
    }

    #[test]
    fn restore_stale_revision_returns_stale_revision_error() {
        let mut conn = migrated_memory();
        let r = create(&mut conn, "Record").unwrap();
        archive(&mut conn, &r.id, r.revision).unwrap();
        // Correct revision after archive is 1, using 0 here is stale
        let result = restore(&mut conn, &r.id, 0);
        assert!(matches!(result, Err(RepoError::StaleRevision)));
    }

    #[test]
    fn data_survives_close_reopen() {
        let path = temp_db_path("reopen");

        let id = {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            let r = create(&mut conn, "Persistent").unwrap();
            r.id
        };

        {
            let conn = open_file_connection(&path).unwrap();
            let active = list_active(&conn).unwrap();
            assert_eq!(active.len(), 1);
            assert_eq!(active[0].id, id);
            assert_eq!(active[0].label, "Persistent");
        }

        cleanup(&path);
    }

    #[test]
    fn ids_are_unique_across_inserts() {
        let mut conn = migrated_memory();
        let r1 = create(&mut conn, "A").unwrap();
        let r2 = create(&mut conn, "B").unwrap();
        assert_ne!(r1.id, r2.id);
        assert_eq!(r1.id.len(), 32);
    }
}
