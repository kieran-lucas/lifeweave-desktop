use std::path::Path;

use rusqlite::Connection;

use super::DbError;

/// Opens and fully configures a file-based SQLite connection.
///
/// Creates the file if it does not exist (normal first-run behavior).
/// Asserts WAL journal mode, foreign_keys ON, and busy_timeout after setting them.
/// Returns an error if any assertion fails rather than silently continuing.
pub fn open_file_connection(path: &Path) -> Result<Connection, DbError> {
    let conn = Connection::open(path)?;
    apply_pragmas(&conn, true)?;
    Ok(conn)
}

/// Opens a file-based SQLite connection, refusing to create a new file.
///
/// Used in restore and recovery paths where silently creating a blank database
/// would be catastrophic. Returns `DbError::FileNotFound` if `path` does not exist.
pub fn open_existing_file_connection(path: &Path) -> Result<Connection, DbError> {
    if !path.exists() {
        return Err(DbError::FileNotFound {
            path: path.to_path_buf(),
        });
    }
    open_file_connection(path)
}

/// Opens a read-only SQLite connection without modifying the database file.
///
/// Unlike `open_file_connection`, this does not set WAL mode or any other
/// pragma that writes to the file. Used to inspect backup packages without
/// mutating them.
pub fn open_readonly_connection(path: &Path) -> Result<Connection, DbError> {
    use rusqlite::OpenFlags;
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(DbError::Rusqlite)
}

/// Opens an in-memory SQLite connection for tests.
///
/// WAL is not available on :memory: databases (SQLite returns "memory" instead);
/// foreign_keys and busy_timeout are still asserted.
pub fn open_memory_connection() -> Result<Connection, DbError> {
    let conn = Connection::open_in_memory()?;
    apply_pragmas(&conn, false)?;
    Ok(conn)
}

fn apply_pragmas(conn: &Connection, is_file: bool) -> Result<(), DbError> {
    if is_file {
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        let jm: String = conn.query_row("PRAGMA journal_mode", [], |r| r.get(0))?;
        if jm != "wal" {
            return Err(DbError::PragmaAssertion {
                pragma: "journal_mode",
                expected: "wal".into(),
                actual: jm,
            });
        }
    }

    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA synchronous = NORMAL;",
    )?;

    let fk: i64 = conn.query_row("PRAGMA foreign_keys", [], |r| r.get(0))?;
    if fk != 1 {
        return Err(DbError::PragmaAssertion {
            pragma: "foreign_keys",
            expected: "1".into(),
            actual: fk.to_string(),
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU32, Ordering};

    use super::*;

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_db_path(tag: &str) -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut p = std::env::temp_dir();
        p.push(format!("lifeweave_conn_{tag}_{n}.db"));
        p
    }

    #[test]
    fn memory_connection_enables_foreign_keys() {
        let conn = open_memory_connection().unwrap();
        let fk: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fk, 1);
    }

    #[test]
    fn memory_connection_sets_busy_timeout() {
        let conn = open_memory_connection().unwrap();
        let timeout: i64 = conn
            .query_row("PRAGMA busy_timeout", [], |r| r.get(0))
            .unwrap();
        assert_eq!(timeout, 5000);
    }

    #[test]
    fn file_connection_enables_wal() {
        let path = temp_db_path("wal");
        let conn = open_file_connection(&path).unwrap();
        let jm: String = conn
            .query_row("PRAGMA journal_mode", [], |r| r.get(0))
            .unwrap();
        assert_eq!(jm, "wal");
        drop(conn);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }

    #[test]
    fn file_connection_enables_foreign_keys() {
        let path = temp_db_path("fk");
        let conn = open_file_connection(&path).unwrap();
        let fk: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fk, 1);
        drop(conn);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }
}
