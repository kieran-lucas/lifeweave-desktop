use std::sync::{Mutex, mpsc};
use std::thread;

use rusqlite::Connection;

use super::DbError;

type AnyResult = Result<Box<dyn std::any::Any + Send>, DbError>;
type Work = Box<dyn FnOnce(&mut Connection) -> AnyResult + Send>;

enum DbCommand {
    Execute {
        work: Work,
        tx: mpsc::SyncSender<AnyResult>,
    },
    Shutdown,
}

/// Handle to the dedicated SQLite writer thread.
///
/// The connection is owned exclusively by the worker thread after `spawn`.
/// All writes and reads that require a consistent connection view go through
/// `execute`, which blocks the caller until the closure completes on the
/// worker thread — proving that no write ever runs on the renderer/UI thread.
///
/// `DbWorkerHandle` is `Send + Sync`: the `SyncSender` is `Sync` when its
/// item type is `Send`, and the `JoinHandle` is wrapped in `Mutex`.
/// Dropping the handle calls `shutdown` automatically.
pub struct DbWorkerHandle {
    tx: mpsc::SyncSender<DbCommand>,
    thread: Mutex<Option<thread::JoinHandle<()>>>,
}

impl DbWorkerHandle {
    /// Spawns the worker thread, taking exclusive ownership of `conn`.
    ///
    /// Bounded queue depth: 32 pending commands. Senders block when full.
    pub fn spawn(mut conn: Connection) -> Self {
        let (tx, rx) = mpsc::sync_channel::<DbCommand>(32);
        let handle = thread::Builder::new()
            .name("lifeweave-db".into())
            .spawn(move || {
                while let Ok(cmd) = rx.recv() {
                    match cmd {
                        DbCommand::Execute { work, tx: resp } => {
                            let result = work(&mut conn);
                            let _ = resp.send(result);
                        }
                        DbCommand::Shutdown => break,
                    }
                }
                // `conn` is dropped here, closing the SQLite connection cleanly.
            })
            .expect("failed to spawn lifeweave-db worker thread");

        Self {
            tx,
            thread: Mutex::new(Some(handle)),
        }
    }

    /// Executes a closure on the worker thread and returns its typed result.
    ///
    /// Blocks the caller until the worker completes the closure.
    /// Returns `DbError::WorkerGone` if the worker thread has already stopped.
    pub fn execute<F, R>(&self, f: F) -> Result<R, DbError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DbError> + Send + 'static,
        R: Send + 'static,
    {
        let (resp_tx, resp_rx) = mpsc::sync_channel::<AnyResult>(0);
        let work: Work =
            Box::new(move |conn| f(conn).map(|r| Box::new(r) as Box<dyn std::any::Any + Send>));
        self.tx
            .send(DbCommand::Execute { work, tx: resp_tx })
            .map_err(|_| DbError::WorkerGone)?;
        let any_result = resp_rx.recv().map_err(|_| DbError::WorkerGone)?;
        any_result.map(|any| {
            *any.downcast::<R>().expect(
                "DbWorkerHandle::execute: type downcast failed — impossible by construction",
            )
        })
    }

    /// Sends `Shutdown` and waits for the worker thread to exit cleanly.
    ///
    /// After this call, all subsequent `execute` calls return `DbError::WorkerGone`.
    /// Calling `shutdown` more than once is safe (subsequent calls are no-ops).
    pub fn shutdown(&self) {
        let _ = self.tx.send(DbCommand::Shutdown);
        if let Ok(mut guard) = self.thread.lock() {
            if let Some(t) = guard.take() {
                let _ = t.join();
            }
        }
    }
}

impl Drop for DbWorkerHandle {
    fn drop(&mut self) {
        self.shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;
    use crate::infrastructure::sqlite::migrations::{current_schema_version, run_migrations};

    fn make_handle() -> DbWorkerHandle {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        DbWorkerHandle::spawn(conn)
    }

    #[test]
    fn worker_executes_on_different_thread() {
        let caller_id = thread::current().id();
        let handle = make_handle();
        let worker_id = handle.execute(|_conn| Ok(thread::current().id())).unwrap();
        assert_ne!(
            caller_id, worker_id,
            "write closure ran on the caller thread — should run on the DB worker thread"
        );
    }

    #[test]
    fn worker_returns_typed_result() {
        let handle = make_handle();
        let v: i64 = handle
            .execute(|conn| {
                let n: i64 = conn.query_row("SELECT 42", [], |r| r.get(0))?;
                Ok(n)
            })
            .unwrap();
        assert_eq!(v, 42);
    }

    #[test]
    fn worker_can_run_migrations() {
        let conn = open_memory_connection().unwrap();
        let handle = DbWorkerHandle::spawn(conn);
        handle.execute(run_migrations).unwrap();
        let version = handle.execute(|conn| current_schema_version(conn)).unwrap();
        // The worker applies every immutable migration known to this binary.
        assert_eq!(version, 8);
    }

    #[test]
    fn worker_shutdown_is_clean() {
        let handle = make_handle();
        handle.shutdown();
        let result = handle.execute(|_| Ok(()));
        assert!(
            matches!(result, Err(DbError::WorkerGone)),
            "expected WorkerGone after shutdown"
        );
    }

    #[test]
    fn worker_dropped_joins_without_panic() {
        let handle = make_handle();
        drop(handle);
        // If the thread panics or hangs on drop, this test times out or panics.
    }

    #[test]
    fn worker_processes_multiple_sequential_commands() {
        let handle = make_handle();
        for i in 0_i64..5 {
            let v: i64 = handle
                .execute(move |conn| {
                    conn.query_row("SELECT ?1", rusqlite::params![i], |r| r.get(0))
                        .map_err(DbError::from)
                })
                .unwrap();
            assert_eq!(v, i);
        }
    }
}
