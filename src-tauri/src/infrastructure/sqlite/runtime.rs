use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};

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

struct AdmissionState {
    lifecycle: RuntimeInner,
    in_flight: usize,
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
/// 6. No method acquires `maintenance_lock` and `admission` simultaneously, so
///    there is no deadlock between the two locks.
pub struct DatabaseRuntime {
    db_path: PathBuf,
    /// Serialises backup and restore operations. Held for the entire operation.
    maintenance_lock: Mutex<()>,
    admission: Mutex<AdmissionState>,
    admission_drained: Condvar,
}

struct AdmissionLease<'a> {
    runtime: &'a DatabaseRuntime,
}

impl Drop for AdmissionLease<'_> {
    fn drop(&mut self) {
        let mut guard = self
            .runtime
            .admission
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        debug_assert!(guard.in_flight > 0);
        guard.in_flight -= 1;
        if guard.in_flight == 0 {
            self.runtime.admission_drained.notify_all();
        }
    }
}

impl DatabaseRuntime {
    pub fn new(db_path: PathBuf, worker: DbWorkerHandle) -> Self {
        Self {
            db_path,
            maintenance_lock: Mutex::new(()),
            admission: Mutex::new(AdmissionState {
                lifecycle: RuntimeInner::Ready(Arc::new(worker)),
                in_flight: 0,
            }),
            admission_drained: Condvar::new(),
        }
    }

    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    /// Dispatches a closure to the worker thread and blocks until it completes.
    ///
    /// Admission increments an in-flight lease while cloning the worker. The
    /// lease is held through enqueue and completion, so maintenance cannot pass
    /// an admitted caller before its command is accounted for.
    ///
    /// Returns `DbError::Maintenance` if a backup or restore holds the gate.
    /// Returns `DbError::WorkerGone` if the worker has been shut down.
    pub fn execute<F, R>(&self, f: F) -> Result<R, DbError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DbError> + Send + 'static,
        R: Send + 'static,
    {
        self.execute_impl(f, || {})
    }

    fn execute_impl<F, R, H>(&self, f: F, after_admission: H) -> Result<R, DbError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DbError> + Send + 'static,
        R: Send + 'static,
        H: FnOnce(),
    {
        let worker = {
            let mut guard = self.admission.lock().map_err(|_| DbError::WorkerGone)?;
            match &guard.lifecycle {
                RuntimeInner::Ready(arc) => {
                    let worker = Arc::clone(arc);
                    guard.in_flight += 1;
                    Ok(worker)
                }
                RuntimeInner::Maintenance => Err(DbError::Maintenance),
                RuntimeInner::Gone => Err(DbError::WorkerGone),
            }
        }?;
        let _lease = AdmissionLease { runtime: self };
        after_admission();
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
        self.seal_worker_impl(|| {})
    }

    fn seal_worker_impl<H>(&self, after_seal: H) -> Result<Arc<DbWorkerHandle>, DbError>
    where
        H: FnOnce(),
    {
        let mut guard = self.admission.lock().map_err(|_| DbError::WorkerGone)?;
        let worker = match std::mem::replace(&mut guard.lifecycle, RuntimeInner::Maintenance) {
            RuntimeInner::Ready(arc) => arc,
            other => {
                guard.lifecycle = other;
                return Err(DbError::Maintenance);
            }
        };
        after_seal();
        while guard.in_flight != 0 {
            guard = match self.admission_drained.wait(guard) {
                Ok(guard) => guard,
                Err(poisoned) => {
                    let mut guard = poisoned.into_inner();
                    guard.lifecycle = RuntimeInner::Ready(Arc::clone(&worker));
                    return Err(DbError::WorkerGone);
                }
            };
        }
        Ok(worker)
    }

    #[cfg(test)]
    pub(crate) fn execute_with_admission_hook<F, R, H>(
        &self,
        f: F,
        after_admission: H,
    ) -> Result<R, DbError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DbError> + Send + 'static,
        R: Send + 'static,
        H: FnOnce(),
    {
        self.execute_impl(f, after_admission)
    }

    #[cfg(test)]
    pub(crate) fn seal_worker_with_admission_hook<H>(
        &self,
        after_seal: H,
    ) -> Result<Arc<DbWorkerHandle>, DbError>
    where
        H: FnOnce(),
    {
        self.seal_worker_impl(after_seal)
    }

    /// Transitions `Maintenance → Gone`. Must only be called after `arc.shutdown()`
    /// has returned and the worker thread has exited.
    ///
    /// Must only be called while holding the maintenance guard.
    pub(crate) fn set_gone(&self) {
        let mut guard = self
            .admission
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        debug_assert_eq!(guard.in_flight, 0);
        guard.lifecycle = RuntimeInner::Gone;
    }

    /// Installs a new worker, transitioning any state to `Ready`.
    ///
    /// May be called from `Gone` (normal post-restore path) or `Maintenance`
    /// (rollback path where shutdown already happened). Must only be called while
    /// holding the maintenance guard.
    pub(crate) fn install_worker(&self, worker: DbWorkerHandle) {
        let mut guard = self
            .admission
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        debug_assert_eq!(guard.in_flight, 0);
        guard.lifecycle = RuntimeInner::Ready(Arc::new(worker));
    }

    /// Transitions `Maintenance → Ready` with the worker Arc returned by
    /// `seal_worker()`, without shutting the worker down.
    ///
    /// Used when an error occurs after sealing but before the connection has
    /// been closed. Avoids the overhead of a full shutdown + reopen round-trip
    /// and ensures no window where `execute()` would return `WorkerGone`.
    ///
    /// Must only be called while holding the maintenance guard.
    pub(crate) fn unseal_worker(&self, worker: Arc<DbWorkerHandle>) {
        let mut guard = self
            .admission
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        debug_assert_eq!(guard.in_flight, 0);
        guard.lifecycle = RuntimeInner::Ready(worker);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, migrations::run_migrations,
    };
    use std::sync::{Arc, Barrier, mpsc};
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
    fn runtime_unseal_worker_restores_execute_without_shutdown() {
        let rt = make_runtime();
        let worker_arc = rt.seal_worker().unwrap();
        // Simulate an early rollback: reverse the seal without shutting down.
        rt.unseal_worker(worker_arc);
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 77", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 77);
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

    // F-01: admission is linearized before enqueue. Once maintenance closes
    // admission, seal cannot pass the drain barrier until this caller completes.
    #[test]
    fn f01_admitted_before_enqueue_completes_before_seal_returns() {
        let rt = Arc::new(make_runtime());
        let admitted = Arc::new(Barrier::new(2));
        let release = Arc::new(Barrier::new(2));

        let mutation_rt = Arc::clone(&rt);
        let mutation_admitted = Arc::clone(&admitted);
        let mutation_release = Arc::clone(&release);
        let mutation = thread::spawn(move || {
            mutation_rt.execute_with_admission_hook(
                |conn| {
                    conn.execute_batch(
                        "CREATE TABLE f01_probe(value INTEGER NOT NULL);\n\
                         INSERT INTO f01_probe(value) VALUES (41);",
                    )
                    .map_err(DbError::from)
                },
                move || {
                    mutation_admitted.wait();
                    mutation_release.wait();
                },
            )
        });

        admitted.wait();

        let seal_rt = Arc::clone(&rt);
        let (sealed_tx, sealed_rx) = mpsc::channel();
        let (worker_tx, worker_rx) = mpsc::channel();
        let seal = thread::spawn(move || {
            let worker = seal_rt
                .seal_worker_with_admission_hook(|| sealed_tx.send(()).unwrap())
                .unwrap();
            worker_tx.send(worker).unwrap();
        });

        sealed_rx.recv().unwrap();
        assert!(matches!(rt.execute(|_| Ok(())), Err(DbError::Maintenance)));
        assert!(
            matches!(worker_rx.try_recv(), Err(mpsc::TryRecvError::Empty)),
            "seal must wait for the admitted caller before returning the worker"
        );

        release.wait();
        mutation.join().unwrap().unwrap();
        let worker = worker_rx.recv().unwrap();
        let value: i64 = worker
            .execute(|conn| {
                conn.query_row("SELECT value FROM f01_probe", [], |row| row.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(value, 41, "the quiesced worker must contain the mutation");

        worker.shutdown();
        rt.set_gone();
        drop(worker);
        seal.join().unwrap();
    }

    // F-01: every admitted caller, including one returning an error, releases
    // its lease and allows the maintenance barrier to complete without deadlock.
    #[test]
    fn f01_multiple_admitted_callers_and_error_path_drain() {
        let rt = Arc::new(make_runtime());
        let admitted = Arc::new(Barrier::new(3));
        let release = Arc::new(Barrier::new(3));
        let mut callers = Vec::new();

        for should_error in [false, true] {
            let caller_rt = Arc::clone(&rt);
            let caller_admitted = Arc::clone(&admitted);
            let caller_release = Arc::clone(&release);
            callers.push(thread::spawn(move || {
                caller_rt.execute_with_admission_hook(
                    move |_| {
                        if should_error {
                            Err(DbError::WorkerGone)
                        } else {
                            Ok(())
                        }
                    },
                    move || {
                        caller_admitted.wait();
                        caller_release.wait();
                    },
                )
            }));
        }

        admitted.wait();
        let seal_rt = Arc::clone(&rt);
        let (sealed_tx, sealed_rx) = mpsc::channel();
        let (worker_tx, worker_rx) = mpsc::channel();
        let seal = thread::spawn(move || {
            let worker = seal_rt
                .seal_worker_with_admission_hook(|| sealed_tx.send(()).unwrap())
                .unwrap();
            worker_tx.send(worker).unwrap();
        });

        sealed_rx.recv().unwrap();
        assert!(matches!(
            worker_rx.try_recv(),
            Err(mpsc::TryRecvError::Empty)
        ));
        release.wait();

        assert!(callers.remove(0).join().unwrap().is_ok());
        assert!(matches!(
            callers.remove(0).join().unwrap(),
            Err(DbError::WorkerGone)
        ));
        let worker = worker_rx.recv().unwrap();
        worker.shutdown();
        rt.set_gone();
        drop(worker);
        seal.join().unwrap();
    }
}
