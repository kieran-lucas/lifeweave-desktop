// Durable restore lifecycle marker. Written before any file mutation during
// restore; read at startup to recover from interrupted operations.
//
// Stage transitions during a restore:
//   Prepared → LiveMovedAside → CandidateInstalled → ReopenedValidated → (marker removed)
//
// Sibling artifacts are derived from the live database path at startup, NOT stored
// in the marker. This prevents path-traversal attacks and stale-path bugs when the
// app data directory moves between restores.
//
// All sibling paths live in the same directory as the live database:
//   - .old:       lifeweave.db.old         (original live DB, kept until candidate validated)
//   - candidate:  _restore_candidate.db    (copy of backup DB before it becomes live)
//   - marker:     restore_marker.json      (durable stage record)
//   - tmp marker: restore_marker.json.tmp  (atomic write scratch space)

use std::io::Write as _;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::BackupError;
use crate::infrastructure::sqlite::connection::open_readonly_connection;
use crate::infrastructure::sqlite::migrations::max_supported_schema_version;

/// Format version for the restore marker JSON. Increment when the schema changes
/// in a backwards-incompatible way so recovery code can detect mismatches.
pub(crate) const MARKER_FORMAT_VERSION: u32 = 1;

/// The stage at which the durable marker was last written.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RestoreStage {
    /// Pre-swap validation and safety backup are complete; the file swap has not started.
    /// Live DB is intact at live_path. Candidate file may or may not exist.
    Prepared,
    /// rename(live → old) succeeded; rename(candidate → live) has not yet run.
    /// live_path does not contain a usable DB; old_path contains the original.
    LiveMovedAside,
    /// Both renames succeeded; candidate is now at live_path; old is at old_path.
    /// The new worker has not yet been opened or validated.
    CandidateInstalled,
    /// The new worker was opened and post-swap checks passed.
    /// old_path still exists and can be deleted.
    ReopenedValidated,
}

/// Describes whether the app is starting fresh or reopening an existing database.
/// Returned by `preflight_startup_check` so the caller can choose between
/// `open_file_connection` (may create) and `open_existing_file_connection` (refuses to create).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupDisposition {
    /// No prior database or recovery artifacts detected. Caller may create a new DB file.
    PristineFirstRun,
    /// A database file or recovery artifacts exist. Caller must not create a blank DB.
    ExistingOrRecovered,
}

/// Durable marker written to disk before any file mutation during a restore.
///
/// Does NOT store absolute paths. Sibling paths are derived from the trusted
/// db_path argument passed to `recover_if_interrupted` at startup.
#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreMarker {
    pub format_version: u32,
    /// Correlation ID for log tracing. Generated once per restore operation.
    pub op_id: String,
    pub stage: RestoreStage,
}

impl RestoreMarker {
    /// Atomically publishes the marker: write to `.tmp` → fsync → rename → verify.
    ///
    /// If the previous marker file exists it is replaced atomically (Windows-safe:
    /// delete-then-rename). On any failure the old marker (if any) is left intact.
    /// Does not return until the final file is verified readable and parseable.
    pub fn write(&self, marker_path: &Path) -> Result<(), BackupError> {
        // cfg(test) failpoint: tests can set a countdown to trigger a write failure
        // at a specific write number. Uses thread_local so parallel tests don't interfere.
        #[cfg(test)]
        {
            let should_fail = MARKER_WRITE_FAIL_AT.with(|c| {
                let n = c.get();
                if n >= 0 {
                    if n == 0 {
                        c.set(-1);
                        true
                    } else {
                        c.set(n - 1);
                        false
                    }
                } else {
                    false
                }
            });
            if should_fail {
                return Err(BackupError::Io(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "test-injected marker write failure",
                )));
            }
        }

        let tmp_str = format!("{}.tmp", marker_path.to_string_lossy());
        let tmp_path = PathBuf::from(&tmp_str);

        let json = serde_json::to_string(self).map_err(BackupError::ManifestSerialize)?;

        {
            let mut f = std::fs::OpenOptions::new()
                .create(true)
                .truncate(true)
                .write(true)
                .open(&tmp_path)
                .map_err(BackupError::Io)?;
            f.write_all(json.as_bytes()).map_err(BackupError::Io)?;
            f.sync_all().map_err(BackupError::Io)?;
        }

        // Windows: rename fails if destination exists; remove first.
        // If remove succeeds but rename fails, no marker will exist (tmp is also
        // cleaned). The restore operation must abort; artifacts remain in place so
        // the next startup triggers RecoveryAmbiguous rather than creating a blank DB.
        let _ = std::fs::remove_file(marker_path);
        std::fs::rename(&tmp_path, marker_path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp_path);
            BackupError::Io(e)
        })?;

        // Verify the written marker is readable and parseable before returning.
        // This catches filesystem-level write corruption or partial flushes.
        Self::read(marker_path)?.ok_or(BackupError::RestoreMarkerMalformed)?;
        Ok(())
    }

    /// Reads the marker file at `marker_path`.
    ///
    /// Returns:
    /// - `Ok(None)` if the file does not exist.
    /// - `Err(RestoreMarkerUnreadable)` if the file exists but cannot be read (I/O error).
    /// - `Err(RestoreMarkerMalformed)` if empty, truncated, or not valid JSON.
    /// - `Err(RestoreMarkerUnsupported)` if the JSON parses but carries an unknown format_version.
    /// - `Ok(Some(marker))` on success.
    pub fn read(marker_path: &Path) -> Result<Option<Self>, BackupError> {
        let bytes = match std::fs::read(marker_path) {
            Ok(b) => b,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(BackupError::RestoreMarkerUnreadable(e)),
        };
        if bytes.is_empty() {
            return Err(BackupError::RestoreMarkerMalformed);
        }
        let marker: Self =
            serde_json::from_slice(&bytes).map_err(|_| BackupError::RestoreMarkerMalformed)?;
        if marker.format_version != MARKER_FORMAT_VERSION {
            return Err(BackupError::RestoreMarkerUnsupported {
                format_version: marker.format_version,
            });
        }
        Ok(Some(marker))
    }

    /// Removes the marker file. Returns the underlying I/O result so callers can
    /// observe whether the removal succeeded. `NotFound` is treated as success
    /// (idempotent: the marker is already gone).
    pub fn remove(marker_path: &Path) -> std::io::Result<()> {
        match std::fs::remove_file(marker_path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e),
        }
    }

    /// Returns a clone of this marker with the stage updated.
    pub fn with_stage(&self, stage: RestoreStage) -> Self {
        Self {
            format_version: self.format_version,
            op_id: self.op_id.clone(),
            stage,
        }
    }
}

/// Generates a unique correlation ID for a restore operation.
/// Not cryptographic; used for log tracing only.
pub(super) fn generate_op_id() -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static CTR: AtomicU32 = AtomicU32::new(0);
    let n = CTR.fetch_add(1, Ordering::Relaxed);
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{ts}_{n}")
}

/// Derives sibling paths that exist alongside the live database.
/// All are in the same directory as `db_path`.
pub(super) fn derive_sibling_paths(db_path: &Path) -> (PathBuf, PathBuf) {
    let db_dir = db_path.parent().unwrap_or(Path::new("."));
    (
        db_dir.join("lifeweave.db.old"),
        db_dir.join("_restore_candidate.db"),
    )
}

/// Opens `path` as a read-only SQLite connection and validates that the database
/// passes integrity and foreign-key checks, has a readable `schema_migrations` table,
/// and its schema version does not exceed the maximum supported version.
///
/// Returns `true` only if all checks pass. Returns `false` on any error or violation.
fn validate_for_recovery(path: &Path) -> bool {
    let conn = match open_readonly_connection(path) {
        Ok(c) => c,
        Err(_) => return false,
    };

    let ic: rusqlite::Result<String> =
        conn.query_row("PRAGMA integrity_check", [], |row| row.get(0));
    if ic.as_deref() != Ok("ok") {
        return false;
    }

    let fk_ok = conn
        .prepare("PRAGMA foreign_key_check")
        .and_then(|mut stmt| {
            let mut rows = stmt.query([])?;
            let mut count = 0usize;
            while rows.next()?.is_some() {
                count += 1;
            }
            Ok(count == 0)
        })
        .unwrap_or(false);
    if !fk_ok {
        return false;
    }

    let schema_version: rusqlite::Result<u32> = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    );
    matches!(schema_version, Ok(v) if v <= max_supported_schema_version())
}

/// Renames a file during recovery. Supports test-seam failpoints.
fn recovery_rename(src: &Path, dst: &Path) -> std::io::Result<()> {
    #[cfg(test)]
    if RECOVERY_RENAME_FAIL.with(|c| c.get()) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "test-injected recovery rename failure",
        ));
    }
    std::fs::rename(src, dst)
}

/// Removes `path` if it exists. `NotFound` is treated as success (idempotent).
/// Uses a countdown failpoint for tests: set 0 to fail the next call, 1 to fail
/// the second call, etc. `-1` disables the failpoint.
pub(super) fn remove_if_exists(path: &Path) -> Result<(), BackupError> {
    #[cfg(test)]
    {
        let should_fail = REMOVE_IF_EXISTS_FAIL_AT.with(|c| {
            let n = c.get();
            if n >= 0 {
                if n == 0 {
                    c.set(-1);
                    true
                } else {
                    c.set(n - 1);
                    false
                }
            } else {
                false
            }
        });
        if should_fail {
            return Err(BackupError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "test-injected remove_if_exists failure",
            )));
        }
    }
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(BackupError::Io(e)),
    }
}

/// Runs a startup preflight before the live database connection is opened.
///
/// Call BEFORE `recover_if_interrupted` and BEFORE any `Connection::open` call.
///
/// Returns `StartupDisposition::PristineFirstRun` only when ALL of these are absent:
///   `lifeweave.db`, `lifeweave.db-wal`, `lifeweave.db-shm`, `restore_marker.json`,
///   `restore_marker.json.tmp`, `lifeweave.db.old`, `_restore_candidate.db`.
///
/// Returns `StartupDisposition::ExistingOrRecovered` when any evidence of prior activity
/// exists (DB file present, marker present, or DB present with WAL/SHM siblings).
///
/// Fails closed when:
/// - WAL or SHM siblings exist but the main DB is absent (partial close or truncation).
/// - A `.tmp` marker exists without a corresponding final marker (interrupted atomic write).
/// - Recovery artifacts (`.old`, candidate) exist without a marker.
pub fn preflight_startup_check(db_path: &Path) -> Result<StartupDisposition, BackupError> {
    let db_dir = db_path.parent().unwrap_or(Path::new("."));
    let marker_path = db_dir.join("restore_marker.json");
    let tmp_marker_str = format!("{}.tmp", marker_path.to_string_lossy());
    let tmp_marker_path = PathBuf::from(&tmp_marker_str);
    let (old_path, candidate_path) = derive_sibling_paths(db_path);

    let db_name = db_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("lifeweave.db");
    let wal_path = db_dir.join(format!("{db_name}-wal"));
    let shm_path = db_dir.join(format!("{db_name}-shm"));

    let has_db = db_path.exists();
    let has_wal = wal_path.exists();
    let has_shm = shm_path.exists();
    let has_tmp = tmp_marker_path.exists();
    let has_marker = marker_path.exists();
    let has_old = old_path.exists();
    let has_candidate = candidate_path.exists();

    // WAL or SHM without the main DB file indicates a partial close or filesystem
    // truncation. Fail closed; do not create a blank DB over these artifacts.
    if (has_wal || has_shm) && !has_db {
        return Err(BackupError::RecoveryAmbiguous);
    }

    if has_tmp && !has_marker {
        // Tmp without final: the atomic marker write was interrupted mid-rename.
        // We don't know which stage to record. Fail closed.
        return Err(BackupError::RestoreMarkerUnreadable(std::io::Error::other(
            "incomplete marker write: tmp present, final absent",
        )));
    }

    if has_tmp && has_marker {
        // Both present: tmp is stale from an interrupted marker update cycle
        // (write succeeded, but the process died before cleanup). Final is authoritative.
        // Fail closed if removal fails: we cannot determine which copy to trust.
        #[cfg(test)]
        if PREFLIGHT_TMP_REMOVE_FAIL.with(|c| c.get()) {
            return Err(BackupError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "test-injected preflight tmp remove failure",
            )));
        }
        std::fs::remove_file(&tmp_marker_path).map_err(BackupError::Io)?;
    }

    // Truly clean state: no DB, no WAL/SHM, no marker, no artifacts.
    if !has_db && !has_wal && !has_shm && !has_marker && !has_old && !has_candidate {
        return Ok(StartupDisposition::PristineFirstRun);
    }

    // Marker present: recover_if_interrupted will handle it.
    if has_marker {
        return Ok(StartupDisposition::ExistingOrRecovered);
    }

    // DB exists without any recovery artifacts: normal startup.
    if has_db && !has_old && !has_candidate {
        return Ok(StartupDisposition::ExistingOrRecovered);
    }

    // Recovery artifacts without a marker. Either the marker write failed during
    // a restore, or a prior recovery removed the marker but left artifacts.
    // Fail closed: do not destroy artifacts, do not create a blank DB.
    Err(BackupError::RecoveryAmbiguous)
}

/// Checks for an interrupted restore marker at `marker_path` and recovers.
///
/// Must be called AFTER `preflight_startup_check` and BEFORE opening the live database.
/// This prevents SQLite from creating a blank database at a path that should hold
/// a recovered original.
///
/// Sibling paths (`.old`, candidate) are derived from `db_path`; no paths are
/// read from the marker itself (which prevents path-traversal after a compromised
/// marker file).
pub fn recover_if_interrupted(marker_path: &Path, db_path: &Path) -> Result<(), BackupError> {
    let marker = match RestoreMarker::read(marker_path)? {
        None => return Ok(()),
        Some(m) => m,
    };

    let (old_path, candidate_path) = derive_sibling_paths(db_path);

    match marker.stage {
        RestoreStage::Prepared => {
            // Interrupted before any rename. Live DB must still be at db_path.
            // Candidate (if any) is a staging copy that was never installed.
            match (db_path.exists(), old_path.exists()) {
                (true, true) => {
                    // Unusual: both live and old exist. Old is a stale artifact from
                    // a previous restore that did not complete cleanup. Remove it along
                    // with the candidate and marker. If old removal fails, keep the
                    // marker so the next startup retries — removing stale old without
                    // a marker would leave the fs in RecoveryAmbiguous state.
                    let _ = std::fs::remove_file(&candidate_path);
                    if remove_if_exists(&old_path).is_err() {
                        return Ok(());
                    }
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (true, false) => {
                    // Normal: live DB is intact. Candidate is stale staging.
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (false, true) => {
                    // Unusual: live missing but old exists. Restore old first, then
                    // clean up candidate (authority established before cleanup).
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (false, false) => {
                    // Both missing. No copy of the database exists. Fail closed.
                    // Preserve candidate (the only artifact, even if useless).
                    Err(BackupError::RecoveryAmbiguous)
                }
            }
        }

        RestoreStage::LiveMovedAside => {
            // rename(live → old) succeeded; rename(candidate → live) did not.
            match (db_path.exists(), old_path.exists()) {
                (false, true) => {
                    // Normal recovery: rename old → live, then clean up.
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (true, false) => {
                    // Live present, old absent. This occurs after a successful rollback
                    // that crashed before cleaning up the marker: old was renamed back to
                    // live_path in a prior run. Validate live and proceed if it is a
                    // valid database.
                    if !validate_for_recovery(db_path) {
                        return Err(BackupError::PostSwapValidationFailed(
                            "live DB failed recovery validation during LiveMovedAside replay"
                                .into(),
                        ));
                    }
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (true, true) => {
                    // Both exist. Old is authoritative (it is the original DB; whatever
                    // is at live_path is suspect). Remove the suspect file, restore old.
                    std::fs::remove_file(db_path).map_err(BackupError::Io)?;
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (false, false) => {
                    // Both missing. No database. Fail closed.
                    Err(BackupError::RecoveryAmbiguous)
                }
            }
        }

        RestoreStage::CandidateInstalled => {
            // Both renames succeeded. live_path has the unvalidated candidate;
            // old_path has the original (if rollback hasn't started).
            match (db_path.exists(), old_path.exists()) {
                (true, true) => {
                    // Conservative rollback: old is authoritative. Remove the
                    // unvalidated candidate at live_path, then restore old.
                    std::fs::remove_file(db_path).map_err(BackupError::Io)?;
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (true, false) => {
                    // Old missing. Live is the only copy; cannot confirm its provenance.
                    Err(BackupError::RecoveryAmbiguous)
                }
                (false, true) => {
                    // Live missing, old present. The candidate was removed during a
                    // prior rollback attempt but the old→live rename did not complete.
                    // Old is the authoritative original; restore it.
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = std::fs::remove_file(&candidate_path);
                    let _ = RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (false, false) => Err(BackupError::RecoveryAmbiguous),
            }
        }

        RestoreStage::ReopenedValidated => {
            // Candidate was validated during restore. live_path should have the new DB.
            // old_path (if still present) is stale and should be cleaned up.

            if !db_path.exists() {
                // Live missing. Try to auto-restore from .old if it exists and is valid.
                if old_path.exists() && validate_for_recovery(&old_path) {
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = RestoreMarker::remove(marker_path);
                    return Ok(());
                }
                return Err(BackupError::RecoveryAmbiguous);
            }

            if !validate_for_recovery(db_path) {
                // Live invalid. Try to auto-restore from .old if it exists and is valid.
                if old_path.exists() && validate_for_recovery(&old_path) {
                    std::fs::remove_file(db_path).map_err(BackupError::Io)?;
                    recovery_rename(&old_path, db_path).map_err(BackupError::Io)?;
                    let _ = RestoreMarker::remove(marker_path);
                    return Ok(());
                }
                // Neither live nor old is usable. Fail closed; preserve all artifacts.
                return Err(BackupError::PostSwapValidationFailed(
                    "live DB failed recovery validation during ReopenedValidated replay".into(),
                ));
            }

            // Live is valid. Attempt idempotent removal of stale old. NotFound is
            // success (already removed). If removal fails for another reason, keep
            // the marker at ReopenedValidated so the next startup retries cleanup.
            // Live remains authoritative and usable either way.
            if remove_if_exists(&old_path).is_err() {
                return Ok(());
            }
            // Also clean candidate if it unexpectedly lingered.
            let _ = remove_if_exists(&candidate_path);
            let _ = RestoreMarker::remove(marker_path);
            Ok(())
        }
    }
}

// cfg(test) failpoint: set to N to fail the (N+1)-th call to `RestoreMarker::write`
// on the current thread, where 0 means fail immediately on the next call.
// Thread-local so parallel tests cannot interfere with each other.
#[cfg(test)]
thread_local! {
    static MARKER_WRITE_FAIL_AT: std::cell::Cell<i32> = const { std::cell::Cell::new(-1) };
}

/// Sets the per-thread marker write failpoint. Call with `0` to fail the next
/// write, `1` to succeed once then fail, etc. `-1` disables the failpoint.
#[cfg(test)]
pub(super) fn set_marker_write_fail_at(writes_before_fail: i32) {
    MARKER_WRITE_FAIL_AT.with(|c| c.set(writes_before_fail));
}

// cfg(test) failpoints. Thread-local so parallel tests cannot interfere.
#[cfg(test)]
thread_local! {
    static RECOVERY_RENAME_FAIL: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    // Countdown for remove_if_exists: N ≥ 0 means fail after N successes; -1 = disabled.
    static REMOVE_IF_EXISTS_FAIL_AT: std::cell::Cell<i32> = const { std::cell::Cell::new(-1) };
    // Boolean for preflight stale-tmp removal.
    static PREFLIGHT_TMP_REMOVE_FAIL: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}

#[cfg(test)]
pub(super) fn set_recovery_rename_fail(fail: bool) {
    RECOVERY_RENAME_FAIL.with(|c| c.set(fail));
}

#[cfg(test)]
pub(super) fn set_remove_if_exists_fail_at(n: i32) {
    REMOVE_IF_EXISTS_FAIL_AT.with(|c| c.set(n));
}

#[cfg(test)]
pub(super) fn set_preflight_tmp_remove_fail(fail: bool) {
    PREFLIGHT_TMP_REMOVE_FAIL.with(|c| c.set(fail));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_file_connection;
    use crate::infrastructure::sqlite::migrations::run_migrations;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn next_id() -> u32 {
        COUNTER.fetch_add(1, Ordering::Relaxed)
    }

    fn temp_dir() -> PathBuf {
        let p = std::env::temp_dir().join(format!("lw_lc_{}_{}", std::process::id(), next_id()));
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    fn write_bytes(path: &Path, content: &[u8]) {
        std::fs::write(path, content).unwrap();
    }

    fn make_marker(stage: RestoreStage) -> RestoreMarker {
        RestoreMarker {
            format_version: MARKER_FORMAT_VERSION,
            op_id: "test-op".into(),
            stage,
        }
    }

    /// Creates a real, fully-migrated SQLite database at `path` for tests that
    /// require full connection validation (not just header bytes).
    fn make_real_db(path: &Path) {
        let mut conn = open_file_connection(path).expect("open_file_connection failed");
        run_migrations(&mut conn).expect("run_migrations failed");
    }

    fn make_paths(dir: &Path) -> (PathBuf, PathBuf, PathBuf, PathBuf, PathBuf) {
        let db = dir.join("lifeweave.db");
        let old = dir.join("lifeweave.db.old");
        let cand = dir.join("_restore_candidate.db");
        let marker = dir.join("restore_marker.json");
        let tmp_marker = dir.join("restore_marker.json.tmp");
        (db, old, cand, marker, tmp_marker)
    }

    // ── Marker write/read atomicity ───────────────────────────────────────────

    #[test]
    fn marker_atomic_write_round_trips() {
        let dir = temp_dir();
        let (_, _, _, marker_path, _) = make_paths(&dir);
        let m = make_marker(RestoreStage::Prepared);
        m.write(&marker_path).unwrap();
        let read = RestoreMarker::read(&marker_path).unwrap().unwrap();
        assert_eq!(read.stage, RestoreStage::Prepared);
        assert_eq!(read.format_version, MARKER_FORMAT_VERSION);
    }

    #[test]
    fn marker_write_removes_tmp_on_success() {
        let dir = temp_dir();
        let (_, _, _, marker_path, tmp_marker_path) = make_paths(&dir);
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();
        assert!(
            !tmp_marker_path.exists(),
            "tmp marker must be removed after successful write"
        );
        assert!(marker_path.exists(), "final marker must exist");
    }

    #[test]
    fn marker_with_stage_updates_stage() {
        let m = make_marker(RestoreStage::Prepared);
        let m2 = m.with_stage(RestoreStage::LiveMovedAside);
        assert_eq!(m2.stage, RestoreStage::LiveMovedAside);
        assert_eq!(m2.op_id, m.op_id);
    }

    // ── Marker read error classification (tests 6–9) ─────────────────────────

    #[test] // test-6: truncated marker
    fn truncated_marker_is_malformed() {
        let dir = temp_dir();
        let (_, _, _, marker_path, _) = make_paths(&dir);
        write_bytes(
            &marker_path,
            b"{\"format_version\":1,\"op_id\":\"x\",\"stag",
        );
        let result = RestoreMarker::read(&marker_path);
        assert!(
            matches!(result, Err(BackupError::RestoreMarkerMalformed)),
            "{result:?}"
        );
    }

    #[test] // test-7: empty marker
    fn empty_marker_is_malformed() {
        let dir = temp_dir();
        let (_, _, _, marker_path, _) = make_paths(&dir);
        write_bytes(&marker_path, b"");
        let result = RestoreMarker::read(&marker_path);
        assert!(
            matches!(result, Err(BackupError::RestoreMarkerMalformed)),
            "{result:?}"
        );
    }

    #[test] // test-8: malformed JSON
    fn malformed_json_marker_is_malformed() {
        let dir = temp_dir();
        let (_, _, _, marker_path, _) = make_paths(&dir);
        write_bytes(&marker_path, b"not json at all");
        let result = RestoreMarker::read(&marker_path);
        assert!(
            matches!(result, Err(BackupError::RestoreMarkerMalformed)),
            "{result:?}"
        );
    }

    #[test] // test-9: unsupported format_version
    fn unsupported_version_marker_is_rejected() {
        let dir = temp_dir();
        let (_, _, _, marker_path, _) = make_paths(&dir);
        write_bytes(
            &marker_path,
            br#"{"format_version":999,"op_id":"x","stage":"prepared"}"#,
        );
        let result = RestoreMarker::read(&marker_path);
        assert!(
            matches!(
                result,
                Err(BackupError::RestoreMarkerUnsupported {
                    format_version: 999
                })
            ),
            "{result:?}"
        );
    }

    // Malformed marker must NOT be silently treated as absent.
    #[test]
    fn malformed_marker_propagates_error_not_absent() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        write_bytes(&marker_path, b"not json");
        // db does NOT exist — if we silently treated malformed as absent, we'd proceed
        // and open_file_connection would create a blank DB.
        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RestoreMarkerMalformed)),
            "expected RestoreMarkerMalformed, got {result:?}"
        );
        assert!(
            old.exists(),
            ".old must be preserved when marker is malformed"
        );
        assert!(!db.exists(), "blank DB must not be created");
    }

    // ── Preflight (tests 11, 28, 29) ─────────────────────────────────────────

    #[test] // test-11a: tmp marker exists without final marker
    fn tmp_marker_without_final_fails_preflight() {
        let dir = temp_dir();
        let (db, _, _, _, tmp_marker_path) = make_paths(&dir);
        write_bytes(&db, b"SQLite format 3\0 dummy");
        write_bytes(&tmp_marker_path, b"some incomplete write");
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Err(BackupError::RestoreMarkerUnreadable(_))),
            "expected RestoreMarkerUnreadable, got {result:?}"
        );
    }

    #[test] // test-11b: both tmp and final exist → tmp cleaned, final trusted
    fn stale_tmp_with_valid_final_is_cleaned() {
        let dir = temp_dir();
        let (db, _, _, marker_path, tmp_marker_path) = make_paths(&dir);
        write_bytes(&db, b"SQLite format 3\0 dummy");
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();
        // Recreate tmp to simulate a stale interrupted update cycle.
        write_bytes(&tmp_marker_path, b"stale");
        let result = preflight_startup_check(&db);
        assert!(
            result.is_ok(),
            "should succeed when final exists: {result:?}"
        );
        assert!(!tmp_marker_path.exists(), "preflight must remove stale tmp");
    }

    #[test] // test-28: marker absent + old artifact exists
    fn preflight_fails_when_old_exists_without_marker() {
        let dir = temp_dir();
        let (db, old, _, _, _) = make_paths(&dir);
        write_bytes(&db, b"SQLite format 3\0 dummy");
        write_bytes(&old, b"original db");
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(old.exists(), ".old must not be deleted by preflight");
    }

    #[test] // test-29: marker absent + candidate exists
    fn preflight_fails_when_candidate_exists_without_marker() {
        let dir = temp_dir();
        let (db, _, cand, _, _) = make_paths(&dir);
        write_bytes(&db, b"SQLite format 3\0 dummy");
        write_bytes(&cand, b"candidate db");
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(cand.exists(), "candidate must not be deleted by preflight");
    }

    #[test]
    fn preflight_permits_clean_state_without_any_artifacts() {
        let dir = temp_dir();
        let (db, _, _, _, _) = make_paths(&dir);
        // No db, no marker, no old, no candidate: first-run state.
        let result = preflight_startup_check(&db);
        assert!(
            result.is_ok(),
            "first-run state must pass preflight: {result:?}"
        );
    }

    // ── No-marker is a no-op ──────────────────────────────────────────────────

    #[test]
    fn no_marker_is_a_no_op() {
        let dir = temp_dir();
        let (db, _, _, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"SQLite format 3\0 dummy");
        assert!(!marker_path.exists());
        assert!(recover_if_interrupted(&marker_path, &db).is_ok());
    }

    // ── Filesystem reconciliation: Prepared (tests 16–18) ────────────────────

    #[test] // test-16: Prepared + live exists
    fn prepared_live_present_cleans_candidate_and_marker() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"live db");
        write_bytes(&cand, b"candidate");
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "live DB must remain intact");
        assert!(!cand.exists(), "candidate must be removed");
        assert!(!marker_path.exists(), "marker must be removed");
        assert!(!old.exists(), ".old must not exist");
    }

    #[test] // test-17: Prepared + live missing + old exists
    fn prepared_live_missing_old_present_rolls_back() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "original must be at live_path");
        let content = std::fs::read(&db).unwrap();
        assert_eq!(content, b"original db");
        assert!(!old.exists(), ".old must be gone after rename");
        assert!(!cand.exists());
        assert!(!marker_path.exists());
    }

    #[test] // test-18: Prepared + both missing → fail closed
    fn prepared_both_missing_fails_closed() {
        let dir = temp_dir();
        let (db, _, _, marker_path, _) = make_paths(&dir);
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(marker_path.exists(), "marker must be preserved on failure");
        assert!(!db.exists(), "blank DB must not be created");
    }

    // ── Filesystem reconciliation: LiveMovedAside (tests 19–21) ─────────────

    #[test] // test-19: LiveMovedAside + only old exists
    fn live_moved_aside_only_old_restores_live() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "original must be at live_path");
        let content = std::fs::read(&db).unwrap();
        assert_eq!(content, b"original db");
        assert!(!old.exists(), ".old must be gone after rename");
        assert!(!marker_path.exists());
    }

    #[test] // test-20: LiveMovedAside + live and old both exist → old is authoritative
    fn live_moved_aside_both_present_restores_old() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"suspect at live_path");
        write_bytes(&old, b"original db");
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "original must be at live_path after rollback");
        let content = std::fs::read(&db).unwrap();
        assert_eq!(content, b"original db", "live must have original content");
        assert!(!old.exists(), ".old must be gone after rename");
        assert!(!cand.exists(), "candidate must be cleaned up");
        assert!(!marker_path.exists(), "marker must be removed");
    }

    #[test] // test-21: LiveMovedAside + neither exists → fail closed
    fn live_moved_aside_neither_fails_closed() {
        let dir = temp_dir();
        let (db, _, _, marker_path, _) = make_paths(&dir);
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
    }

    // ── Filesystem reconciliation: CandidateInstalled (tests 22–24) ──────────

    #[test] // test-22: CandidateInstalled + live and old exist → rollback to old
    fn candidate_installed_both_present_rolls_back_to_old() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"unvalidated candidate");
        write_bytes(&old, b"original db");
        make_marker(RestoreStage::CandidateInstalled)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "original must be at live_path after rollback");
        let content = std::fs::read(&db).unwrap();
        assert_eq!(content, b"original db");
        assert!(!old.exists(), ".old must be gone after rename");
        assert!(!marker_path.exists());
        assert!(!cand.exists());
    }

    #[test] // test-23: CandidateInstalled + live exists but old missing → explicit error
    fn candidate_installed_live_present_old_missing_fails_closed() {
        let dir = temp_dir();
        let (db, _, _, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"only copy (unknown provenance)");
        make_marker(RestoreStage::CandidateInstalled)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(db.exists(), "live must be preserved");
    }

    #[test] // test-24: CandidateInstalled + old exists but live missing → restores old
    fn candidate_installed_live_missing_old_present_restores_old() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::CandidateInstalled)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "original must be at live_path after restore");
        let content = std::fs::read(&db).unwrap();
        assert_eq!(content, b"original db", "live must have original content");
        assert!(!old.exists(), ".old must be gone after rename");
        assert!(!cand.exists(), "candidate must be cleaned up");
        assert!(!marker_path.exists(), "marker must be removed");
    }

    // ── Filesystem reconciliation: ReopenedValidated (tests 25–27) ───────────

    #[test] // test-25: ReopenedValidated + real valid live + old → removes both old and marker
    fn reopened_validated_real_valid_live_removes_old() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        // Use a real, fully-migrated SQLite database so validate_for_recovery passes.
        make_real_db(&db);
        write_bytes(&old, b"original db (stale)");
        make_marker(RestoreStage::ReopenedValidated)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "new DB must remain at live_path");
        assert!(!old.exists(), ".old must be removed");
        assert!(!marker_path.exists(), "marker must be removed");
    }

    #[test] // test-26: ReopenedValidated + corrupt live + valid old → fail closed
    fn reopened_validated_corrupt_live_fails_closed() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"this is NOT a sqlite file");
        write_bytes(&old, b"valid original db");
        make_marker(RestoreStage::ReopenedValidated)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::PostSwapValidationFailed(_))),
            "expected PostSwapValidationFailed, got {result:?}"
        );
        assert!(old.exists(), ".old must be preserved when live is corrupt");
        assert!(db.exists(), "corrupt live must be preserved (not deleted)");
    }

    #[test] // test-27: ReopenedValidated + live missing + valid old → fail closed
    fn reopened_validated_live_missing_fails_closed() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"valid original db");
        make_marker(RestoreStage::ReopenedValidated)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(old.exists(), ".old must be preserved");
        assert!(!db.exists(), "live must not be created");
    }

    // ── test-30: marker malformed + live missing + old exists ────────────────

    #[test]
    fn malformed_marker_live_missing_old_present_fails_closed() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        write_bytes(&marker_path, b"{ totally not valid json ]");

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RestoreMarkerMalformed)),
            "expected RestoreMarkerMalformed, got {result:?}"
        );
        assert!(old.exists(), ".old must not be deleted");
        assert!(!db.exists(), "blank DB must not be created");
    }

    // ── StartupDisposition and WAL/SHM detection ──────────────────────────────

    #[test]
    fn pristine_first_run_permits_creation() {
        let dir = temp_dir();
        let (db, _, _, _, _) = make_paths(&dir);
        // No DB, no WAL, no SHM, no marker, no old, no candidate.
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Ok(StartupDisposition::PristineFirstRun)),
            "expected PristineFirstRun, got {result:?}"
        );
    }

    #[test]
    fn existing_db_returns_existing_or_recovered() {
        let dir = temp_dir();
        let (db, _, _, _, _) = make_paths(&dir);
        write_bytes(&db, b"some database content");
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Ok(StartupDisposition::ExistingOrRecovered)),
            "expected ExistingOrRecovered, got {result:?}"
        );
    }

    #[test]
    fn missing_main_plus_wal_fails_closed() {
        let dir = temp_dir();
        let (db, _, _, _, _) = make_paths(&dir);
        let wal_path = dir.join("lifeweave.db-wal");
        write_bytes(&wal_path, b"wal content");
        // DB file does not exist.
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous for WAL without DB, got {result:?}"
        );
        assert!(wal_path.exists(), "WAL must not be deleted by preflight");
    }

    #[test]
    fn missing_main_plus_shm_fails_closed() {
        let dir = temp_dir();
        let (db, _, _, _, _) = make_paths(&dir);
        let shm_path = dir.join("lifeweave.db-shm");
        write_bytes(&shm_path, b"shm content");
        // DB file does not exist.
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous for SHM without DB, got {result:?}"
        );
        assert!(shm_path.exists(), "SHM must not be deleted by preflight");
    }

    #[test]
    fn marker_present_returns_existing_or_recovered() {
        let dir = temp_dir();
        let (db, _, _, marker_path, _) = make_paths(&dir);
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();
        // No DB file; but marker is present → ExistingOrRecovered, not PristineFirstRun.
        let result = preflight_startup_check(&db);
        assert!(
            matches!(result, Ok(StartupDisposition::ExistingOrRecovered)),
            "expected ExistingOrRecovered when marker present, got {result:?}"
        );
    }

    // ── LiveMovedAside replay: live present, old absent ───────────────────────

    #[test]
    fn live_moved_aside_live_present_old_absent_validates_and_proceeds() {
        let dir = temp_dir();
        let (db, _, cand, marker_path, _) = make_paths(&dir);
        // Replay scenario: old was successfully renamed back to live_path in a
        // prior run, but the marker cleanup failed before completion.
        make_real_db(&db);
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "live DB must still be present");
        assert!(!cand.exists(), "stale candidate must be removed");
        assert!(!marker_path.exists(), "marker must be removed");
    }

    #[test]
    fn live_moved_aside_live_present_old_absent_invalid_fails_closed() {
        let dir = temp_dir();
        let (db, _, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"not a valid sqlite file at all");
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::PostSwapValidationFailed(_))),
            "invalid live must fail closed, got {result:?}"
        );
        assert!(db.exists(), "live must be preserved");
        assert!(cand.exists(), "candidate must be preserved on failure");
        assert!(marker_path.exists(), "marker must be preserved on failure");
    }

    // ── ReopenedValidated: old deletion failure keeps marker for retry ─────────

    #[test]
    fn old_deletion_failure_after_validated_commit_keeps_marker_replayable() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        make_real_db(&db);
        write_bytes(&old, b"stale original");
        make_marker(RestoreStage::ReopenedValidated)
            .write(&marker_path)
            .unwrap();

        // Inject old-removal failure via the remove_if_exists countdown failpoint.
        set_remove_if_exists_fail_at(0);
        let result = recover_if_interrupted(&marker_path, &db);
        // Countdown auto-resets to -1 after firing; no explicit reset needed.

        // Live is usable; marker is kept at ReopenedValidated for retry.
        assert!(
            result.is_ok(),
            "must return Ok even when old deletion fails: {result:?}"
        );
        assert!(db.exists(), "live DB must remain usable");
        assert!(
            old.exists(),
            ".old must still exist (removal was injected to fail)"
        );
        assert!(marker_path.exists(), "marker must be kept for retry");

        // Second call: old removal now succeeds → cleanup completes.
        recover_if_interrupted(&marker_path, &db).unwrap();
        assert!(!old.exists(), ".old must be removed on retry");
        assert!(!marker_path.exists(), "marker must be removed on retry");
        assert!(db.exists(), "live DB must still be present after cleanup");
    }

    // ── Rename failure preserves all artifacts ────────────────────────────────

    #[test]
    fn recovery_rename_failure_preserves_all_artifacts() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        set_recovery_rename_fail(true);
        let result = recover_if_interrupted(&marker_path, &db);
        set_recovery_rename_fail(false);

        assert!(
            matches!(result, Err(BackupError::Io(_))),
            "rename failure must return Io error, got {result:?}"
        );
        assert!(!db.exists(), "live DB must not exist (rename failed)");
        assert!(old.exists(), ".old must be preserved when rename fails");
        assert!(
            cand.exists(),
            "candidate must be preserved when rename fails"
        );
        assert!(
            marker_path.exists(),
            "marker must be preserved when rename fails"
        );
    }

    // ── Prepared (true, true): stale .old removed along with marker ──────────

    #[test]
    fn prepared_live_and_old_both_present_removes_stale_old() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"live db");
        write_bytes(&old, b"stale old from prior restore");
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "live DB must remain intact");
        assert!(!old.exists(), "stale .old must be removed");
        assert!(!cand.exists(), "candidate must be removed");
        assert!(!marker_path.exists(), "marker must be removed");
    }

    #[test]
    fn prepared_live_and_old_old_removal_failure_keeps_marker() {
        let dir = temp_dir();
        let (db, old, cand, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"live db");
        write_bytes(&old, b"stale old from prior restore");
        write_bytes(&cand, b"stale candidate");
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();

        // Inject old-removal failure.
        set_remove_if_exists_fail_at(0);
        let result = recover_if_interrupted(&marker_path, &db);

        assert!(
            result.is_ok(),
            "must return Ok even when old removal fails: {result:?}"
        );
        assert!(db.exists(), "live DB must remain intact");
        assert!(old.exists(), ".old must be preserved on removal failure");
        assert!(!cand.exists(), "candidate should still be removed");
        assert!(marker_path.exists(), "marker must be kept for retry");

        // Retry: old removal now succeeds.
        recover_if_interrupted(&marker_path, &db).unwrap();
        assert!(!old.exists(), ".old must be removed on retry");
        assert!(!marker_path.exists(), "marker must be removed on retry");
    }

    // ── Stale tmp + final marker + tmp removal failure ────────────────────────

    #[test]
    fn stale_tmp_with_final_and_tmp_removal_failure_fails_closed() {
        let dir = temp_dir();
        let (db, _, _, marker_path, tmp_marker_path) = make_paths(&dir);
        write_bytes(&db, b"SQLite format 3\0 dummy");
        make_marker(RestoreStage::Prepared)
            .write(&marker_path)
            .unwrap();
        write_bytes(&tmp_marker_path, b"stale tmp");

        set_preflight_tmp_remove_fail(true);
        let result = preflight_startup_check(&db);
        set_preflight_tmp_remove_fail(false);

        assert!(
            matches!(result, Err(BackupError::Io(_))),
            "tmp removal failure must fail closed: {result:?}"
        );
        assert!(
            tmp_marker_path.exists(),
            "tmp must be preserved on removal failure"
        );
        assert!(marker_path.exists(), "final marker must be preserved");
    }

    // ── Idempotency: second call after clean recovery is a no-op ─────────────

    #[test]
    fn recovery_invoked_twice_is_idempotent() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        // First call: restores old to live, removes marker.
        recover_if_interrupted(&marker_path, &db).unwrap();
        assert!(db.exists());
        assert!(!marker_path.exists());

        // Second call: no marker → returns Ok immediately.
        recover_if_interrupted(&marker_path, &db).unwrap();
        assert!(db.exists(), "live DB must remain after idempotent call");
    }
}
