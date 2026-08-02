# Task 2 — Independent Re-audit

## Scope and exact HEAD

- Repository: `lifeweave-desktop`
- Branch: `main`
- Re-audited HEAD: `ff1f7945124cc3d78c3e123264ddcbfe046cf731`
- Original blocking audit: `2581e4ae9e9b5db6e1277c66b6f80b00823dcdbb`
- No production code was changed during this independent re-audit.

## Prior blockers

- F-01 runtime admission race (P0).
- F-02 validated package identity TOCTOU (P0).
- F-03 rollback stranded startup on locked sidecar (P1).
- Candidate-cleanup P1: redundant post-validation sync could remove marker while candidate remained.

## Remediation delta reviewed

Reviewed the complete remediation delta from `2581e4a` through `ff1f794`, including `runtime.rs`, `restore.rs`, `lifecycle.rs`, audit evidence, status and Foundation task evidence.

## Commands and baseline evidence

- `cargo check --locked --all-targets`: pass.
- `cargo fmt --check`: pass.
- `cargo clippy --locked --all-targets -- -D warnings`: pass.
- Full Rust suite: **191 passed, 0 failed, 0 ignored**.
- Focused `infrastructure::backup`: **123 passed, 0 failed, 0 ignored**.
- Frontend frozen install, typecheck, build: pass.
- Frontend tests: **2 files, 19 passed**.
- Source integrity: pass.
- Repository governance: pass (`scripts/check_repository.py`).
- No-remote-resource scan: pass.
- `git diff --check`: pass.
- The repository does not contain the prompt-named `verify_spec_index.py`, `verify_full_coverage.py`, or `verify_repository_governance.py`; the available governance checker was run instead.

## F-01 verdict

**Closed.** `DatabaseRuntime::execute_impl` increments `in_flight` while holding the lifecycle mutex, creates an RAII lease before releasing it, and keeps the lease through worker enqueue and response. `seal_worker_impl` changes `Ready` to `Maintenance` atomically and waits for the counter to drain. Calls after sealing return `Maintenance`; send/receive errors release the lease through drop. Deterministic tests cover admitted-before-enqueue, multiple callers, error paths, and maintenance rejection. No admitted-but-unaccounted gap was found in the reviewed path.

## F-02 verdict

**BLOCKED — P0 finding remains.**

### F-02-R1 — Managed candidate remains mutable after authentication

- Severity: P0.
- Status: verified source-level TOCTOU; blocks Task 3.
- Files/lines: `src-tauri/src/infrastructure/backup/restore.rs:60-125, 213-225, 305-318`.
- Invariant: bytes authenticated by manifest/hash/integrity must be the exact bytes installed and reported successful.
- Trigger/interleaving: `copy_candidate()` closes its file after `sync_all`; `validate_candidate()` then reads size/hash/SQLite checks and closes its read-only connection. Before `durable_rename(&candidate_path, &live_path)`, another local process with access to the managed database directory can open, truncate, overwrite, or replace `_restore_candidate.db`.
- Actual behavior: the later swap uses only the pathname. There is no final size/hash validation, exclusive identity token, open-handle-bound rename, or directory ownership lock covering the candidate between validation and swap.
- Consequence: different valid or corrupted bytes can be installed under the original manifest and restore can return success after post-swap validation, violating exact snapshot identity.
- Evidence/reproduction: complete control flow shows validation at `validate_candidate(&candidate_path, ...)` followed by maintenance/swap and `durable_rename(&candidate_path, &live_path)` with no candidate reauthentication. Existing F-02 tests cover source replacement, not candidate mutation/replacement after validation.
- Why this severity: a concrete external mutation path can install the wrong snapshot while reporting success; this is explicitly a P0 condition.
- Required remediation: bind validation to the exact candidate object through swap, or otherwise prevent/atomically detect candidate mutation (for example final hash/size identity verification immediately before installation with appropriate ownership semantics). Add a deterministic candidate-replacement-after-validation regression test.
- Blocks Task 3: yes.

## F-03 verdict

**Closed for the audited failure paths.** Rollback removes candidate WAL/SHM before candidate main removal; sidecar failure returns with live, `.old`, and marker retained. Checked main removal and old-to-live rename preserve an authoritative copy. Existing deterministic and Windows sharing-violation tests cover the claimed ordering and startup replay.

## Candidate-cleanup verdict

**Closed for the identified P1 path.** The redundant second candidate `sync_all()` is absent. `copy_candidate()` is the single checked candidate durability barrier. `remove_prepared_artifacts()` removes candidate first and only then removes marker; candidate failure therefore preserves marker. The added regression test verifies helper behavior and startup replay convergence. Other cleanup paths reviewed retain markers when candidate/old cleanup fails; ignored marker-removal results occur only after artifact cleanup and leave a safe replayable marker.

## New-regression sweep

- No new F-01 deadlock, admission leak, or worker lifetime race found.
- No new F-03 authoritative-copy loss found in reviewed rollback matrix.
- No candidate-without-marker path found in prepared cleanup ordering.
- F-02-R1 above is a surviving remediation gap, not a new unrelated subsystem issue.

## Remaining P2/P3 debt

- F-04: Windows directory flush durability semantics.
- F-05: explicit backup publication durability barriers.
- F-06: raw backup path IPC / opaque backup IDs, deferred to Task 3.
- Candidate-cleanup regression currently exercises the production cleanup helper directly rather than a full injected `restore_db` pre-swap failure; this is a coverage limitation, but the helper control flow is safe and is non-blocking beside F-02-R1.

## Final verdict

`BLOCKED`

F-01, F-03, and the candidate-cleanup P1 are closed. F-02 remains a verified P0 because the validated managed candidate is not bound immutably to the bytes later installed. Task 2 remains active and Task 3 is prohibited.
