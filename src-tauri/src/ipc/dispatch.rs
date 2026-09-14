use std::sync::{Arc, Mutex};
use tauri::{Runtime, ipc::Invoke};

/// Keep command argument decoding, synchronous services and response serialization off the
/// native window thread. The generated handler still owns command lookup and ACL validation;
/// DatabaseRuntime still owns admission, serialization and backup/restore exclusion.
/// Use the blocking pool: waiting for SQLite must not occupy an async executor worker either.
pub fn off_main_thread<R: Runtime>(
    handler: fn(Invoke<R>) -> bool,
) -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static {
    // Synchronous services may take multiple DB snapshots and publish files between them.
    // Preserve their existing mutual exclusion instead of silently introducing concurrency.
    // Existing async commands release this guard when the generated handler schedules them,
    // exactly as they previously returned control to the native event loop.
    let serial = Arc::new(Mutex::new(()));
    move |invoke| {
        let resolver = invoke.resolver.clone();
        let serial = Arc::clone(&serial);
        dispatch(move || {
            let Ok(_guard) = serial.lock() else {
                resolver.reject("Application command worker unavailable");
                return;
            };
            if !handler(invoke) {
                // We already accepted this request on the window thread. Complete unknown
                // commands explicitly instead of leaving their frontend promises pending.
                resolver.reject("Unknown application command");
            }
        });
        true
    }
}

fn dispatch(work: impl FnOnce() + Send + 'static) {
    tauri::async_runtime::spawn_blocking(work);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{sync::mpsc, thread, time::Duration};

    #[test]
    fn slow_command_does_not_hold_caller_or_async_executor() {
        let caller = thread::current().id();
        let (started_tx, started_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel();
        let (done_tx, done_rx) = mpsc::channel();
        dispatch(move || {
            started_tx.send(thread::current().id()).unwrap();
            release_rx.recv_timeout(Duration::from_secs(5)).unwrap();
            done_tx.send(()).unwrap();
        });
        assert_ne!(
            started_rx.recv_timeout(Duration::from_secs(2)).unwrap(),
            caller
        );
        let (pulse_tx, pulse_rx) = mpsc::channel();
        tauri::async_runtime::spawn(async move { pulse_tx.send(()).unwrap() });
        pulse_rx.recv_timeout(Duration::from_secs(2)).unwrap();
        // The caller can release a command that is still waiting, without a timing threshold.
        release_tx.send(()).unwrap();
        done_rx.recv_timeout(Duration::from_secs(2)).unwrap();
    }
}
