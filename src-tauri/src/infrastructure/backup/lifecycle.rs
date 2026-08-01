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
        // If remove fails, the tmp cleanup still prevents partial state.
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

    /// Best-effort removal of the marker file. Never fails; leaves file on error.
    pub fn remove(marker_path: &Path) {
        let _ = std::fs::remove_file(marker_path);
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

/// Lightweight check that `path` begins with the SQLite file-format magic header.
/// Used in recovery to distinguish a SQLite file from an empty or corrupt placeholder
/// without opening a connection.
fn is_valid_sqlite_header(path: &Path) -> bool {
    use std::io::Read;
    let Ok(mut f) = std::fs::File::open(path) else {
        return false;
    };
    let mut header = [0u8; 16];
    f.read_exact(&mut header).is_ok() && header.starts_with(b"SQLite format 3\0")
}

/// Runs a startup preflight before the live database connection is opened.
///
/// Call BEFORE `recover_if_interrupted` and BEFORE any `Connection::open` call.
///
/// First-run DB creation is permitted only when ALL of these are absent:
///   marker, marker tmp, `.old`, candidate.
///
/// Detects and refuses to proceed if:
/// - A `.tmp` marker exists without a corresponding final marker (interrupted atomic write).
/// - Recovery artifacts (`.old`, candidate) exist without a marker (marker write failed
///   or cleanup failed after a previous interrupted restore).
///
/// Cleans up a stale `.tmp` when both `.tmp` and final marker are present (the rename
/// succeeded; the tmp is leftover from a prior write cycle).
pub fn preflight_startup_check(db_path: &Path) -> Result<(), BackupError> {
    let db_dir = db_path.parent().unwrap_or(Path::new("."));
    let marker_path = db_dir.join("restore_marker.json");
    let tmp_marker_str = format!("{}.tmp", marker_path.to_string_lossy());
    let tmp_marker_path = PathBuf::from(&tmp_marker_str);
    let (old_path, candidate_path) = derive_sibling_paths(db_path);

    let has_tmp = tmp_marker_path.exists();
    let has_marker = marker_path.exists();
    let has_old = old_path.exists();
    let has_candidate = candidate_path.exists();

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
        let _ = std::fs::remove_file(&tmp_marker_path);
    }

    // Clean state: first run or normal startup.
    if !has_marker && !has_old && !has_candidate {
        return Ok(());
    }

    // Marker present: recover_if_interrupted will handle it.
    if has_marker {
        return Ok(());
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
            let _ = std::fs::remove_file(&candidate_path);

            match (db_path.exists(), old_path.exists()) {
                (true, _) => {
                    // Normal case: live DB is intact.
                    RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (false, true) => {
                    // Unusual: live missing but old exists. Shouldn't happen at Prepared
                    // (old is created only during LiveMovedAside), but recover anyway.
                    std::fs::rename(&old_path, db_path).map_err(BackupError::Io)?;
                    RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (false, false) => {
                    // Both missing. No copy of the database exists. Fail closed.
                    Err(BackupError::RecoveryAmbiguous)
                }
            }
        }

        RestoreStage::LiveMovedAside => {
            // rename(live → old) succeeded; rename(candidate → live) did not.
            // Candidate (if any) is stale.
            let _ = std::fs::remove_file(&candidate_path);

            match (db_path.exists(), old_path.exists()) {
                (false, true) => {
                    // Normal recovery: rename old → live.
                    std::fs::rename(&old_path, db_path).map_err(BackupError::Io)?;
                    RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (true, false) => {
                    // Live is somehow present but old is missing. The marker says live was
                    // moved aside, so whatever is at live_path is of unknown provenance.
                    // Fail closed: do not delete this file; do not remove old.
                    Err(BackupError::RecoveryAmbiguous)
                }
                (true, true) => {
                    // Both exist. Cannot determine which is authoritative. Fail closed.
                    // Neither file is deleted; manual or support-assisted recovery needed.
                    Err(BackupError::RecoveryAmbiguous)
                }
                (false, false) => {
                    // Both missing. No database. Fatal.
                    Err(BackupError::RecoveryAmbiguous)
                }
            }
        }

        RestoreStage::CandidateInstalled => {
            // Both renames succeeded. live_path has the unvalidated candidate;
            // old_path has the original. The staging candidate file was renamed away.
            let _ = std::fs::remove_file(&candidate_path);

            match (db_path.exists(), old_path.exists()) {
                (true, true) => {
                    // Normal conservative rollback: restore the original.
                    // Remove the unvalidated candidate at live_path first.
                    std::fs::remove_file(db_path).map_err(BackupError::Io)?;
                    std::fs::rename(&old_path, db_path).map_err(BackupError::Io)?;
                    RestoreMarker::remove(marker_path);
                    Ok(())
                }
                (true, false) => {
                    // Old missing. Live is the only copy but we cannot confirm whether
                    // it is the original or the unvalidated candidate. Fail closed.
                    Err(BackupError::RecoveryAmbiguous)
                }
                (false, true) => {
                    // Live missing but old exists. The candidate rename to live must have
                    // partially succeeded then live was deleted. Old is still available.
                    // Per spec: explicit recovery error (do not silently rename old here
                    // since we don't know if live_path is safe to write to).
                    Err(BackupError::RecoveryAmbiguous)
                }
                (false, false) => {
                    // Both missing. Fatal.
                    Err(BackupError::RecoveryAmbiguous)
                }
            }
        }

        RestoreStage::ReopenedValidated => {
            // Candidate was validated during restore. live_path has the new DB.
            // old_path is stale cleanup. Candidate staging file was already renamed away.
            let _ = std::fs::remove_file(&candidate_path);

            if !db_path.exists() {
                // Live gone. Keep old if present; fail closed.
                return Err(BackupError::RecoveryAmbiguous);
            }

            if !is_valid_sqlite_header(db_path) {
                // Live exists but does not start with the SQLite magic bytes.
                // Keep old; fail closed so the user can restore from safety backup.
                return Err(BackupError::PostSwapValidationFailed(
                    "live DB failed SQLite header check during startup recovery".into(),
                ));
            }

            // Live looks good. Remove stale old and clean up.
            let _ = std::fs::remove_file(&old_path);
            RestoreMarker::remove(marker_path);
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

#[cfg(test)]
mod tests {
    use super::*;
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

    #[test] // test-20: LiveMovedAside + live and old both exist → fail closed
    fn live_moved_aside_both_present_fails_closed() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&db, b"suspect at live_path");
        write_bytes(&old, b"original db");
        make_marker(RestoreStage::LiveMovedAside)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(db.exists(), "live must be preserved");
        assert!(old.exists(), ".old must be preserved");
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

    #[test] // test-24: CandidateInstalled + old exists but live missing → explicit error
    fn candidate_installed_live_missing_old_present_fails_closed() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        write_bytes(&old, b"original db");
        make_marker(RestoreStage::CandidateInstalled)
            .write(&marker_path)
            .unwrap();

        let result = recover_if_interrupted(&marker_path, &db);
        assert!(
            matches!(result, Err(BackupError::RecoveryAmbiguous)),
            "expected RecoveryAmbiguous, got {result:?}"
        );
        assert!(old.exists(), ".old must be preserved");
        assert!(!db.exists(), "blank DB must not be created");
    }

    // ── Filesystem reconciliation: ReopenedValidated (tests 25–27) ───────────

    #[test] // test-25: ReopenedValidated + valid live + old
    fn reopened_validated_valid_live_removes_old() {
        let dir = temp_dir();
        let (db, old, _, marker_path, _) = make_paths(&dir);
        // Write real SQLite magic header so is_valid_sqlite_header passes.
        let mut hdr = b"SQLite format 3\0".to_vec();
        hdr.extend_from_slice(&[0u8; 84]);
        write_bytes(&db, &hdr);
        write_bytes(&old, b"original db (stale)");
        make_marker(RestoreStage::ReopenedValidated)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path, &db).unwrap();

        assert!(db.exists(), "new DB must remain at live_path");
        assert!(!old.exists(), ".old must be removed");
        assert!(!marker_path.exists());
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
}
