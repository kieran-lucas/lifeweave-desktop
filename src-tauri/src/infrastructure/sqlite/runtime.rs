use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};

use rusqlite::Connection;

use super::{DbError, DbWorkerHandle};

/// Lifecycle state of the database worker.
pub(crate) enum RuntimeInner {
    /// Normal operating state. `execute()` dispatches work to the worker.
    Ready(Arc<DbWorkerHandle>),
    /// A backup or restore is in progress. `execute()` returns `DbError::Maintenance`.
    /// The maintenance lock is held by the operation that set this state.
    Maintenance,
    /// The worker was shut down and has not yet been replaced.
    /// `execute()` returns `DbError::WorkerGone`.
    Gone,
}

/// Tauri managed state that owns the SQLite worker and allows the worker to be
/// replaced after a restore operation.
///
/// # Lifecycle invariants
///
/// 1. Only one backup or restore may run at a time (`maintenance_lock`).
/// 2. During `Maintenance`, `execute()` returns `DbError::Maintenance`.
/// 3. `seal_worker()` transitions `Ready → Maintenance` and hands the caller
///    exclusive ownership of the worker arc. The caller must call `shutdown()`
///    on the arc and then `set_gone()`.
/// 4. `install_worker()` transitions any state to `Ready`.
/// 5. `unseal_worker()` returns to `Ready` from `Maintenance` without shutdown.
///    Used for early rollback before the worker was shut down.
/// 6. No method acquires `maintenance_lock` and `inner` simultaneously, so
///    there is no deadlock between the two locks.
pub struct DatabaseRuntime {
    db_path: PathBuf,
    /// Serialises backup and restore operations. Held for the entire operation.
    maintenance_lock: Mutex<()>,
    inner: Mutex<RuntimeInner>,
}

impl DatabaseRuntime {
    pub fn new(db_path: PathBuf, worker: DbWorkerHandle) -> Self {
        Self {
            db_path,
            maintenance_lock: Mutex::new(()),
            inner: Mutex::new(RuntimeInner::Ready(Arc::new(worker))),
        }
    }

    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    /// Dispatches a closure to the worker thread and blocks until it completes.
    ///
    /// Acquires the `inner` lock only long enough to clone the worker Arc, then
    /// releases it before dispatching. This prevents a deadlock where restore
    /// code holds `inner` while waiting for a worker closure to complete.
    ///
    /// Returns `DbError::Maintenance` if a backup or restore holds the gate.
    /// Returns `DbError::WorkerGone` if the worker has been shut down.
    pub fn execute<F, R>(&self, f: F) -> Result<R, DbError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DbError> + Send + 'static,
        R: Send + 'static,
    {
        let worker = {
            let guard = self.inner.lock().unwrap();
            match &*guard {
                RuntimeInner::Ready(arc) => Ok(Arc::clone(arc)),
                RuntimeInner::Maintenance => Err(DbError::Maintenance),
                RuntimeInner::Gone => Err(DbError::WorkerGone),
            }
        }?;
        worker.execute(f)
    }

    /// Acquires the maintenance lock. Blocks until any current holder releases it.
    ///
    /// The returned guard must be held for the entire backup or restore operation.
    /// Dropping the guard releases the lock and allows the next operation to proceed.
    pub(crate) fn acquire_maintenance(&self) -> Result<MutexGuard<'_, ()>, DbError> {
        self.maintenance_lock
            .lock()
            .map_err(|_| DbError::WorkerGone)
    }

    /// Transitions `Ready → Maintenance` and returns the `Arc<DbWorkerHandle>`.
    ///
    /// After this call, `execute()` returns `DbError::Maintenance` for all callers.
    /// The returned Arc holds the still-running worker. The caller must call
    /// `arc.shutdown()` to drain the queue and close the connection, then call
    /// `set_gone()`. If a rollback is needed before shutdown, call `unseal_worker`
    /// instead.
    ///
    /// Must only be called while holding the maintenance guard.
    pub(crate) fn seal_worker(&self) -> Result<Arc<DbWorkerHandle>, DbError> {
        let mut guard = self.inner.lock().unwrap();
        match std::mem::replace(&mut *guard, RuntimeInner::Maintenance) {
            RuntimeInner::Ready(arc) => Ok(arc),
            other => {
                *guard = other;
                Err(DbError::Maintenance)
            }
        }
    }

    /// Transitions `Maintenance → Gone`. Must only be called after `arc.shutdown()`
    /// has returned and the worker thread has exited.
    ///
    /// Must only be called while holding the maintenance guard.
    pub(crate) fn set_gone(&self) {
        let mut guard = self.inner.lock().unwrap();
        *guard = RuntimeInner::Gone;
    }

    /// Installs a new worker, transitioning any state to `Ready`.
    ///
    /// May be called from `Gone` (normal post-restore path) or `Maintenance`
    /// (rollback path where shutdown already happened). Must only be called while
    /// holding the maintenance guard.
    pub(crate) fn install_worker(&self, worker: DbWorkerHandle) {
        let mut guard = self.inner.lock().unwrap();
        *guard = RuntimeInner::Ready(Arc::new(worker));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, migrations::run_migrations,
    };
    use std::sync::Arc;
    use std::thread;

    fn make_runtime() -> DatabaseRuntime {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        DatabaseRuntime::new(PathBuf::from(":memory:"), worker)
    }

    #[test]
    fn runtime_execute_delegates_to_worker() {
        let rt = make_runtime();
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 42", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 42);
    }

    #[test]
    fn runtime_execute_returns_maintenance_after_seal() {
        let rt = make_runtime();
        let worker_arc = rt.seal_worker().unwrap();
        let result = rt.execute(|_| Ok(()));
        assert!(
            matches!(result, Err(DbError::Maintenance)),
            "expected Maintenance after seal_worker"
        );
        // Restore to Ready state so drop is clean.
        worker_arc.shutdown();
        rt.set_gone();
        drop(worker_arc);
    }

    #[test]
    fn runtime_execute_returns_worker_gone_after_shutdown() {
        let rt = make_runtime();
        let worker_arc = rt.seal_worker().unwrap();
        worker_arc.shutdown();
        rt.set_gone();
        drop(worker_arc);
        let result = rt.execute(|_| Ok(()));
        assert!(
            matches!(result, Err(DbError::WorkerGone)),
            "expected WorkerGone after shutdown + set_gone"
        );
    }

    #[test]
    fn runtime_install_worker_restores_execute() {
        let rt = make_runtime();
        let worker_arc = rt.seal_worker().unwrap();
        worker_arc.shutdown();
        rt.set_gone();
        drop(worker_arc);

        let mut new_conn = open_memory_connection().unwrap();
        run_migrations(&mut new_conn).unwrap();
        rt.install_worker(DbWorkerHandle::spawn(new_conn));

        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 99", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 99);
    }

    #[test]
    fn acquire_maintenance_serializes_concurrent_callers() {
        let rt = Arc::new(make_runtime());
        let rt2 = Arc::clone(&rt);

        let guard = rt.acquire_maintenance().unwrap();
        let handle = thread::spawn(move || {
            let _g = rt2.acquire_maintenance().unwrap();
        });
        drop(guard);
        handle.join().expect("second acquirer panicked");
    }

    #[test]
    fn execute_during_maintenance_returns_maintenance_error() {
        let rt = Arc::new(make_runtime());
        let rt2 = Arc::clone(&rt);

        let worker_arc = rt.seal_worker().unwrap();
        let handle = thread::spawn(move || rt2.execute(|_| Ok(())));
        let result = handle.join().unwrap();
        assert!(matches!(result, Err(DbError::Maintenance)));

        // Clean up.
        worker_arc.shutdown();
        rt.set_gone();
        drop(worker_arc);
    }

    #[test]
    fn two_concurrent_maintenance_acquisitions_are_serialized() {
        let rt = Arc::new(make_runtime());
        let rt2 = Arc::clone(&rt);

        let order = Arc::new(Mutex::new(Vec::<u8>::new()));
        let order2 = Arc::clone(&order);

        let g1 = rt.acquire_maintenance().unwrap();
        order.lock().unwrap().push(1);

        let handle = thread::spawn(move || {
            let _g = rt2.acquire_maintenance().unwrap();
            order2.lock().unwrap().push(2);
        });

        drop(g1);
        handle.join().unwrap();

        let seq = order.lock().unwrap();
        assert_eq!(
            *seq,
            vec![1, 2],
            "second caller must wait for first to release"
        );
    }
}
