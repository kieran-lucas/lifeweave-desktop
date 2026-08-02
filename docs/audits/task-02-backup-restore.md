# Task 2 — Independent Backup/Restore Audit

## Scope and HEAD

- Audit date: 2026-08-02 (Asia/Saigon).
- Branch: `main`.
- Implementation HEAD audited: `cb6df7912f396084e244f836208f71085c27dc9d`.
- Scope: backup package creation, restore validation, runtime quiescence, marker durability, swap/rollback, startup replay, Windows filesystem behavior, and IPC trust boundary.
- Production implementation changes: none.
- Test data: repository tests use temporary synthetic SQLite databases. No Product Owner database, AppData database, or real backup was opened or restored.

## Specification invariants

The audit applied these binding invariants:

- Rust owns filesystem and backup/restore safety-sensitive paths (`AI_CONSTITUTION.md`, lines 43 and 60–61).
- User data must remain recoverable through transaction, backup, and restore policies (`AI_CONSTITUTION.md`, line 29).
- Backup uses SQLite Online Backup into staging; publication is close/sync then atomic rename where supported (`docs/source-of-truth/...`, lines 4076–4084; `docs/DATA_SAFETY_AND_RECOVERY.md`, lines 47–78).
- Restore must inspect compatibility, verify checksum and SQLite integrity/FK state, close the current database, atomically swap, and reopen before success (`docs/source-of-truth/...`, lines 4076–4084; `specs/000-foundation-proof/spec.md`, lines 108–126).
- Startup must detect interrupted restore state and fail closed rather than create a blank database (`docs/source-of-truth/...`, lines 4228–4235).
- The Foundation test plan requires exact-snapshot restore and automatic pre-restore backup (`specs/000-foundation-proof/test-plan.md`, lines 26–35).

## Commands executed

```text
git fetch origin
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git log -8 --oneline --decorate
git diff --stat 8baabdac4328921576384996251b757910fb88e8..HEAD
git diff 8baabdac4328921576384996251b757910fb88e8..HEAD -- <Task 2 paths>
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo test --manifest-path src-tauri/Cargo.toml --locked infrastructure::backup -- --nocapture
cargo test --manifest-path src-tauri/Cargo.toml --locked -- --list
pnpm typecheck
pnpm test
pnpm build
```

The reviewer also read the mandatory governance/specification, backup/restore, SQLite runtime, IPC, frontend boundary, generated DTO, dependency, and historical-diff inputs listed in the Task 2 brief.

## Baseline evidence

| Gate | Result | Exact evidence |
|---|---|---|
| Starting Git state | Pass | Clean `main`; local HEAD and `origin/main` both `cb6df7912f396084e244f836208f71085c27dc9d`; no reconciliation required. |
| Rust format | Pass | `cargo fmt --check` exit 0. |
| Rust clippy | Pass | All targets with `-D warnings`; exit 0; dev profile completed in 0.65s. |
| Full Rust tests | Pass | 185 passed, 0 failed, 0 ignored, 0 measured, 0 filtered; test runner 3.34s (command wall time 7.469s); Windows x86_64. |
| Focused backup tests | Pass | 119 passed, 0 failed, 0 ignored, 66 filtered; 1.33s. |
| Rust test inventory | Pass | 185 tests listed; 119 under `infrastructure::backup`. |
| Frontend typecheck | Pass | `tsc6 -b --pretty false`; exit 0. |
| Frontend tests | Pass | 2 files, 19 tests passed; 4.72s. |
| Frontend production build | Pass | Vite 8.1.5; 24 modules; built in 479ms. |

Passing baseline tests do not exercise the three blocking interleavings below. No audit-only hook was added because each blocker has a complete source-level proof path and Task 2 must not modify production behavior.

## State-machine review

| Stage | Intended authority | Reviewed transition/result |
|---|---|---|
| `Prepared` | Live database | Candidate is staging only; startup restores `.old` if a crash occurred after live→old but before the marker advanced. |
| `LiveMovedAside` | `.old` | Startup restores `.old`; suspect live is discarded only in the both-present branch. |
| `CandidateInstalled` | `.old` until validation commits | Normal startup conservatively removes candidate sidecars, discards candidate, and restores `.old`. |
| `ReopenedValidated` | Live database | Live is validated and retained; `.old` and candidate cleanup retry while the marker remains. |

Malformed, empty, truncated, unsupported, or scratch-only markers fail closed. Recovery paths derive managed sibling paths rather than trusting paths from marker content. The startup order is preflight → marker replay → existing/pristine open → migrations → worker installation.

The matrix is not sufficient to close the audit because the three findings below reach states outside the assumptions encoded by the stage comments.

## Findings

### P0

### F-01 — Runtime admission is not linearizable with restore sealing

- Severity: P0 (`BLOCKER`).
- Status: verified by complete source-level call path.
- Files/lines: `src-tauri/src/infrastructure/sqlite/runtime.rs:63-76`; `src-tauri/src/infrastructure/sqlite/worker.rs:66-77`; `src-tauri/src/infrastructure/backup/restore.rs:118-129,354-408,182-185,301-315`; coverage gap at `restore.rs:1011-1072`.
- Invariant: no mutation may be admitted after the pre-restore safety snapshot's quiescence point; every acknowledged mutation must remain in either the restored database or a recoverable safety/rollback copy.
- Trigger/state: mutation thread reads `RuntimeInner::Ready`, clones the worker `Arc`, and pauses after releasing `inner` but before `DbWorkerHandle::execute()` sends its command. Restore then seals the runtime and completes the safety Online Backup. The mutation thread resumes and enqueues on the cloned worker before restore enqueues shutdown.
- Actual behavior: `seal_worker()` only prevents a fresh `DatabaseRuntime::execute()` lookup. It cannot revoke an `Arc` already returned by lines 68–75. The late mutation runs after the safety backup, returns success to its caller, is included in the soon-to-be `.old` live database, and is absent from both the selected snapshot and the safety backup. A successful restore later deletes `.old` at lines 307–310.
- Consequence: an acknowledged user mutation can be silently lost with no retained authoritative copy.
- Evidence/reproduction: deterministic scheduler sequence: `execute` lines 68–75 → `seal_worker` line 122 → safety backup worker command lines 384–393 → delayed worker send lines 74–76 → mutation success → shutdown line 183 → swap → `.old` cleanup. The existing `in_flight_command_completes_after_seal` test pauses inside a closure already running on the worker, so the safety backup queues behind it and does not cover the admission-to-enqueue gap.
- Why this severity: the Task 2 P0 definition explicitly includes a race permitting mutation after the safety snapshot but before swap; the result is silent loss of an acknowledged write.
- Required remediation: make command admission/enqueue and maintenance sealing linearizable (for example, a generation-aware admission lease or queue barrier held through enqueue), then add a deterministic regression test that pauses a caller after admission but before enqueue and proves the snapshot cannot pass it.
- Missing test: clone/admission-before-seal, enqueue-after-safety-snapshot interleaving with an asserted persisted record.
- Blocks Task 3: yes.

### F-02 — Restore validates one package file but later copies a mutable replacement

- Severity: P0 (`BLOCKER`).
- Status: verified by complete source-level call path.
- Files/lines: `src-tauri/src/infrastructure/backup/restore.rs:79-116,118-178,279-315`; `src-tauri/src/ipc/backup.rs:53-66`.
- Invariant: the exact snapshot authenticated by manifest size/checksum and SQLite validation must be the snapshot installed and reported as restored.
- Trigger/state: another filesystem actor replaces `backup_dir/lifeweave.db` with a different valid, supported SQLite database after checksum/read-only validation completes at line 116 and before `std::fs::copy` opens the source at line 159. The safety backup and durable marker operations provide a non-zero interval between those accesses.
- Actual behavior: restore validates the external source path, closes that handle, and later reopens the same path for copy. Candidate handling only calls `sync_all`; it does not recheck candidate size/hash against the manifest. Post-swap validation checks generic integrity, FK constraints, and supported schema, not snapshot identity. A different valid database therefore reaches `Ok(RestoreResult)`.
- Consequence: restore can install the wrong snapshot while reporting success.
- Evidence/reproduction: source sequence `sha256_file/open_readonly` (lines 95–116) → closed source handles → safety snapshot/marker (lines 118–145) → second path lookup in `copy` (line 159) → no candidate identity check (lines 164–178) → generic reopen validation and success (lines 279–315). Substituting any other valid schema-v2 Lifeweave database in that interval satisfies every remaining check.
- Why this severity: “restore wrong snapshot but report success” is an explicit Task 2 P0 condition. This is distinct from the deferred UX issue of exposing raw paths.
- Required remediation: copy/open a stable managed candidate first and perform manifest size, checksum, read-only integrity/FK, and compatibility validation on the exact candidate that will be swapped; bind Task 3 opaque IDs to immutable registered packages.
- Missing test: synchronized package replacement between source validation and candidate creation, asserting failure rather than successful restoration of the replacement.
- Blocks Task 3: yes.

### P1

### F-03 — Rollback can delete live before a locked sidecar and strand startup recovery

- Severity: P1 (`BLOCKER`).
- Status: verified by source path plus existing real Windows sharing-violation evidence.
- Files/lines: `src-tauri/src/infrastructure/backup/restore.rs:483-538`; `src-tauri/src/infrastructure/backup/lifecycle.rs:377-403,432-457`; partial tests at `restore.rs:2090-2199`.
- Invariant: rollback must preserve a startup-replayable state and converge whenever the authoritative `.old` database remains intact; sidecar generation must never block marker-guided restoration indefinitely.
- Trigger/state: after candidate installation, rollback has `live=true`, `.old=true`, and a candidate `lifeweave.db-wal` or `-shm` that cannot be deleted on Windows because another handle denies delete sharing.
- Actual behavior: `attempt_rollback` removes the live candidate main file first at line 526, then returns `RollbackFailed` when sidecar removal fails at lines 530–533. The resulting state is `live=false`, `.old=true`, sidecar=true, marker=true. On restart, `preflight_startup_check` checks “sidecar without main” first and returns `RecoveryAmbiguous` at lines 399–403, before `recover_if_interrupted` can use the valid marker and `.old`.
- Consequence: the authoritative original remains, but normal startup cannot converge and requires undesigned manual filesystem recovery.
- Evidence/reproduction: the repository's Windows test at lines 2166–2199 proves an exclusively held file produces the expected sharing-violation removal error. The rollback tests at lines 2090–2164 prove that sidecar deletion failure returns `RollbackFailed`, but construct `live=false` before rollback and manually repair `.old`; the preflight tests independently prove `live=false + WAL/SHM=true` returns `RecoveryAmbiguous`. Combining the production ordering yields the stranded state without speculation.
- Why this severity: this is a concrete Windows crash/restart boundary that does not converge despite a valid authoritative copy, matching the Task 2 P1 definition. It is not P0 because `.old` is preserved.
- Required remediation: do not remove live until candidate sidecars are successfully removed, and/or make marker-aware preflight replay safely remove candidate sidecars before restoring `.old`; preserve authority at every failed deletion.
- Missing test: `live=true + old=true + locked candidate sidecar + valid CandidateInstalled marker`, followed by real startup preflight/replay, with no manual rename.
- Blocks Task 3: yes.

### P2

### F-04 — Directory-flush helper silently discards Windows flush failure

- Severity: P2 (`NON-BLOCKING DEBT`).
- Status: verified debt; no demonstrated data-loss reproduction.
- Files/lines: `src-tauri/src/infrastructure/backup/lifecycle.rs:248-307`.
- Invariant: marker and swap ordering claims should match the durability guarantee actually observed.
- Trigger/state: directory open or `FlushFileBuffers` fails.
- Actual behavior: open failures return silently and the `FlushFileBuffers` return value is ignored, while comments describe a defensible ordering barrier.
- Consequence: power-loss durability is weaker than the strongest comment, but NTFS journal recovery and retained artifacts prevent this audit from proving P0/P1 impact.
- Evidence/reproduction: direct return-value/control-flow inspection at lines 276–287.
- Why this severity: unobserved best-effort durability gap without a proven loss path.
- Required remediation: record/propagate the syscall result where the contract requires a barrier, or narrow the documented guarantee and add platform fault evidence.
- Missing test: Windows syscall-result coverage for directory handle access and flush failure.
- Blocks Task 3: no.

### F-05 — Backup publication lacks explicit file and directory durability barriers

- Severity: P2 (`NON-BLOCKING DEBT`).
- Status: verified debt; live database is not endangered.
- Files/lines: `src-tauri/src/infrastructure/backup/engine.rs:49-108`; `src-tauri/src/infrastructure/backup/manifest.rs:18-22`.
- Invariant: published backup packages should follow staging → sync/close → atomic rename.
- Trigger/state: power loss immediately after a successful backup return.
- Actual behavior: the staging SQLite connection is closed, then checksum and manifest are written and the directory is renamed, but neither backup file/manifest nor parent directory receives an explicit durability barrier in this path.
- Consequence: a just-reported backup may be absent or incomplete after power loss; no proof shows loss of the live database or last authoritative copy.
- Evidence/reproduction: engine control flow contains no `sync_all`/directory flush before or after lines 98–104.
- Why this severity: backup reliability debt without a demonstrated destructive restore or loss of live data.
- Required remediation: add checked file syncs and a checked/accurately documented directory durability policy before reporting publication success.
- Missing test: fault-injection/power-boundary contract around final package publication.
- Blocks Task 3: no.

### F-06 — Renderer still supplies a raw backup directory path

- Severity: P2 (`NON-BLOCKING DEBT`, explicitly deferred to Task 3).
- Status: verified boundary debt.
- Files/lines: `src-tauri/src/ipc/backup.rs:53-66`; `frontend/src/ipc/commands.ts` restore command boundary.
- Invariant: the renderer should select an opaque backend-owned backup identity, not a filesystem authority token.
- Trigger/state: renderer invokes restore with an arbitrary existing directory.
- Actual behavior: backend checks only existence, then reads manifest/database at that path. Restore writes/deletes only fixed managed database siblings, so this audit found no arbitrary destructive operation outside the managed database area.
- Consequence: package selection and identity are weaker than the intended Task 3 boundary; paths are also returned to the renderer in backup results.
- Evidence/reproduction: direct IPC signature and `PathBuf::from` inspection.
- Why this severity: Task 2 policy explicitly treats raw path IPC as P2/deferred unless it enables arbitrary destructive filesystem operations; none was found.
- Required remediation: Task 3 registry/opaque backup ID with containment, canonicalization, and stable package identity.
- Missing test: renderer input cannot select an unregistered/out-of-root package after Task 3.
- Blocks Task 3: no by itself; F-02 must be resolved before Task 3 proceeds.

### P3

No separate P3 finding. Naming/comment issues that materially overstate safety are captured with their underlying P0/P2 findings rather than duplicated.

## Deferred Task 3 boundary items

- Replace raw backup paths in request and result DTOs with opaque backend-owned IDs.
- Introduce a contained backup registry/selector and bind IDs to immutable package identity.
- Add the progress channel/boundary required by the execution roadmap.
- These items remain unimplemented. F-01 through F-03 must be remediated and independently re-audited before Task 3 begins.

## Audit debt

- Prove or narrow Windows directory durability claims (F-04).
- Add explicit backup package publication durability barriers (F-05).
- Retain real Windows lock tests, but distinguish OS sharing proof from failpoint state-machine proof.
- Extend the recovery matrix with every “main removed, sidecar retained, marker present” boundary.
- Add deterministic scheduler instrumentation around runtime admission, queueing, and sealing.

## Blocking remediation candidate

Remediation is implemented in the working implementation lineage, but this document remains an independent-audit record and is not being marked as passed.

### F-01 remediation

- Remediation status: implemented, pending independent re-audit.
- Remediation commit: `199d07d` (`linearize database maintenance admission`).
- Design: `DatabaseRuntime` now stores lifecycle state and an in-flight admission count under one mutex. Admission increments before worker cloning; an RAII lease remains through enqueue and completion. `seal_worker()` changes lifecycle to `Maintenance` atomically and waits on a condition variable until all admitted leases drain.
- Regression tests: `f01_admitted_before_enqueue_completes_before_seal_returns`, `f01_multiple_admitted_callers_and_error_path_drain`, plus the updated in-flight seal test.
- Remaining uncertainty: Windows independent re-audit must verify the intended scheduling invariant against the full application command surface.

### F-02 remediation

- Remediation status: implemented, pending independent re-audit.
- Remediation commit: `56d6940` (`bind restore validation to installed candidate`).
- Design: restore writes a `Prepared` marker, copies into a managed candidate, flushes it, validates candidate size/SHA-256/read-only SQLite integrity/FK/schema, and never reopens the package source for installation after validation. Only the validated candidate is swapped.
- Regression tests: `f02_replacement_at_source_boundary_is_rejected_without_live_mutation` and `f02_source_replacement_after_candidate_validation_does_not_change_restore`.
- Remaining uncertainty: independent review must confirm package replacement behavior on the target Windows filesystem under real external sharing conditions.

### F-03 remediation

- Remediation status: implemented, pending independent re-audit.
- Remediation commit: `56d6940` (`bind restore validation to installed candidate`).
- Design: rollback removes candidate WAL/SHM before removing the failed candidate main file; any sidecar failure returns while both live and `.old` remain. After the failure is released, marker-guided startup replay restores `.old` and converges artifacts.
- Regression tests: `f03_locked_sidecar_preserves_live_and_startup_replays_old`, existing real Windows sharing-violation test, and existing startup replay matrix.
- Remaining uncertainty: independent re-audit must exercise the real Windows lock boundary, not only the deterministic failpoint seam.

## Verdict

`BLOCKED — remediation implemented, independent re-audit required`

Task 2 remains active. F-01 and F-02 were P0 and F-03 was P1 at the audited implementation HEAD; remediation is now present in commits `199d07d` and `56d6940`, but independent re-audit is required. This does not declare Stage E, Foundation, Product Owner acceptance, or production-safe backup/restore.
