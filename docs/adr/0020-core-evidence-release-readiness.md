# ADR 0020 — Core evidence and release readiness

**Status:** Accepted

Task 25 keeps feature scope closed. Ordinary Canvas tests assert deterministic scale/correctness only; the existing 50 ms p95 target is retained in a serial, release-mode ignored test. Markdown preview reads the existing asset authority and gives actionable unavailable-asset warnings, while Confirm retains transaction validation. Scene tabs use the existing controls with APG-style roving keyboard focus. Backup asset discovery includes both Basic Leaf and Narrative Canvas references.

No migration, dependency, IPC command, remote workflow, or Task 26 behavior is approved.
