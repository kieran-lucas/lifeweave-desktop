// Durable restore lifecycle marker. Written before any file mutation during
// restore; read at startup to recover from interrupted operations.
//
// Stage transitions during a restore:
//   Prepared → LiveMovedAside → CandidateInstalled → ReopenedValidated → (marker removed)
//
// The marker and its sibling artifacts (_restore_candidate.db, live.db.old)
// are stored alongside the live database file (in the same directory).

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::BackupError;

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
/// The marker is atomically removed (best-effort) when the restore commits.
#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreMarker {
    pub stage: RestoreStage,
    /// Absolute path of the live database file.
    pub live_path: String,
    /// Absolute path of the .old backup kept for rollback.
    pub old_path: String,
    /// Absolute path of the restore candidate file.
    pub candidate_path: String,
}

impl RestoreMarker {
    pub fn write(&self, marker_path: &Path) -> Result<(), BackupError> {
        let json = serde_json::to_string(self).map_err(BackupError::ManifestSerialize)?;
        std::fs::write(marker_path, json).map_err(BackupError::Io)
    }

    pub fn with_stage(&self, stage: RestoreStage) -> Self {
        RestoreMarker {
            stage,
            live_path: self.live_path.clone(),
            old_path: self.old_path.clone(),
            candidate_path: self.candidate_path.clone(),
        }
    }

    fn read(marker_path: &Path) -> Option<Self> {
        let bytes = std::fs::read(marker_path).ok()?;
        serde_json::from_slice(&bytes).ok()
    }

    pub fn remove(marker_path: &Path) {
        let _ = std::fs::remove_file(marker_path);
    }
}

/// Checks for an interrupted restore marker at `marker_path` and recovers.
///
/// Must be called before opening the live database connection on startup.
/// Performing recovery before the connection is opened prevents SQLite from
/// creating a blank database at a path that should be restored from `.old`.
///
/// Recovery actions by stage:
/// - `Prepared`: live DB intact; clean up candidate artifact; remove marker.
/// - `LiveMovedAside`: live_path missing; rename .old → live; remove marker.
/// - `CandidateInstalled`: conservative rollback — remove candidate-at-live,
///   rename .old → live; remove marker. (Post-swap checks are not re-run here;
///   the safety backup at `_safety/` is available as last resort if old is gone.)
/// - `ReopenedValidated`: candidate is confirmed good; delete .old; remove marker.
pub fn recover_if_interrupted(marker_path: &Path) -> Result<(), BackupError> {
    let marker = match RestoreMarker::read(marker_path) {
        None => return Ok(()),
        Some(m) => m,
    };

    let live_path = PathBuf::from(&marker.live_path);
    let old_path = PathBuf::from(&marker.old_path);
    let candidate_path = PathBuf::from(&marker.candidate_path);

    match marker.stage {
        RestoreStage::Prepared => {
            // Interrupted before any rename. Live DB is intact.
            let _ = std::fs::remove_file(&candidate_path);
            RestoreMarker::remove(marker_path);
            Ok(())
        }

        RestoreStage::LiveMovedAside => {
            // rename(live → old) succeeded, rename(candidate → live) did not.
            // live_path is absent; old_path has the original.
            let _ = std::fs::remove_file(&candidate_path);
            if old_path.exists() && !live_path.exists() {
                std::fs::rename(&old_path, &live_path).map_err(BackupError::Io)?;
            } else if live_path.exists() {
                // Live is somehow back; stale .old can be discarded.
                let _ = std::fs::remove_file(&old_path);
            }
            RestoreMarker::remove(marker_path);
            Ok(())
        }

        RestoreStage::CandidateInstalled => {
            // Both renames succeeded; live_path has the candidate; old_path has original.
            // Conservative rollback: restore the original (we cannot re-validate the
            // candidate without opening it, and we do not want to risk data loss).
            let _ = std::fs::remove_file(&candidate_path);
            if old_path.exists() {
                if live_path.exists() {
                    // Remove the unvalidated candidate first (best-effort).
                    let _ = std::fs::remove_file(&live_path);
                }
                std::fs::rename(&old_path, &live_path).map_err(BackupError::Io)?;
            }
            // If .old is also missing, live_path is the only copy; leave it.
            RestoreMarker::remove(marker_path);
            Ok(())
        }

        RestoreStage::ReopenedValidated => {
            // Candidate was validated; .old is just leftover cleanup.
            let _ = std::fs::remove_file(&old_path);
            let _ = std::fs::remove_file(&candidate_path);
            RestoreMarker::remove(marker_path);
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn next_id() -> u32 {
        COUNTER.fetch_add(1, Ordering::Relaxed)
    }

    fn temp_path(suffix: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "lw_lc_{}_{}_{suffix}",
            std::process::id(),
            next_id()
        ))
    }

    fn write_bytes(path: &Path, content: &[u8]) {
        std::fs::write(path, content).unwrap();
    }

    fn make_marker(stage: RestoreStage, live: &Path, old: &Path, cand: &Path) -> RestoreMarker {
        RestoreMarker {
            stage,
            live_path: live.to_string_lossy().into_owned(),
            old_path: old.to_string_lossy().into_owned(),
            candidate_path: cand.to_string_lossy().into_owned(),
        }
    }

    #[test]
    fn no_marker_is_a_no_op() {
        let marker_path = temp_path("nomarker.json");
        assert!(!marker_path.exists());
        assert!(recover_if_interrupted(&marker_path).is_ok());
    }

    #[test]
    fn prepared_stage_removes_candidate_and_marker() {
        let live = temp_path("live.db");
        let old = temp_path("live.db.old");
        let cand = temp_path("candidate.db");
        let marker_path = temp_path("restore_marker.json");

        write_bytes(&live, b"live db");
        write_bytes(&cand, b"candidate db");

        make_marker(RestoreStage::Prepared, &live, &old, &cand)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path).unwrap();

        assert!(live.exists(), "live DB must remain intact");
        assert!(!cand.exists(), "candidate should be removed");
        assert!(!marker_path.exists(), "marker should be removed");

        let _ = std::fs::remove_file(&live);
    }

    #[test]
    fn live_moved_aside_restores_old_to_live() {
        let live = temp_path("live.db");
        let old = temp_path("live.db.old");
        let cand = temp_path("candidate.db");
        let marker_path = temp_path("restore_marker.json");

        write_bytes(&old, b"original db");

        make_marker(RestoreStage::LiveMovedAside, &live, &old, &cand)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path).unwrap();

        assert!(
            live.exists(),
            "original must be at live_path after recovery"
        );
        assert!(!old.exists(), ".old should be gone after rename");
        assert!(!marker_path.exists());

        let _ = std::fs::remove_file(&live);
    }

    #[test]
    fn candidate_installed_rolls_back_to_old() {
        let live = temp_path("live.db");
        let old = temp_path("live.db.old");
        let cand = temp_path("candidate.db");
        let marker_path = temp_path("restore_marker.json");

        write_bytes(&live, b"candidate at live");
        write_bytes(&old, b"original db");

        make_marker(RestoreStage::CandidateInstalled, &live, &old, &cand)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path).unwrap();

        assert!(
            live.exists(),
            "original must be at live_path after rollback"
        );
        let content = std::fs::read(&live).unwrap();
        assert_eq!(content, b"original db", "live should contain original data");
        assert!(!old.exists());
        assert!(!marker_path.exists());

        let _ = std::fs::remove_file(&live);
    }

    #[test]
    fn reopened_validated_removes_old_and_marker() {
        let live = temp_path("live.db");
        let old = temp_path("live.db.old");
        let cand = temp_path("candidate.db");
        let marker_path = temp_path("restore_marker.json");

        write_bytes(&live, b"new db");
        write_bytes(&old, b"original db (stale)");

        make_marker(RestoreStage::ReopenedValidated, &live, &old, &cand)
            .write(&marker_path)
            .unwrap();

        recover_if_interrupted(&marker_path).unwrap();

        assert!(live.exists(), "new DB must remain at live_path");
        assert!(!old.exists(), ".old should be removed");
        assert!(!marker_path.exists());

        let _ = std::fs::remove_file(&live);
    }

    #[test]
    fn malformed_marker_is_treated_as_absent() {
        let marker_path = temp_path("bad_marker.json");
        write_bytes(&marker_path, b"not json");

        // RestoreMarker::read returns None on parse error → recover_if_interrupted is a no-op
        assert!(recover_if_interrupted(&marker_path).is_ok());
        // Malformed marker is left in place (we don't remove files we can't parse)
        let _ = std::fs::remove_file(&marker_path);
    }
}
