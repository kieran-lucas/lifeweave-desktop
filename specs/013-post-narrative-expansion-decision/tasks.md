# Slice 013 Tasks

## Original Task 23 (preliminary)

- [x] Verify Task 22 baseline and worktree state.
- [x] Read all authority documents.
- [x] Evaluate 13 candidates against hard filters (preliminary: 12 filters, substituted criteria).
- [x] Preliminary weighted model (substituted 12 criteria).
- [x] Preliminary simulation (seed 20260803, 5M samples, substituted criteria).
- [x] Preliminary spec, ADR 0017, audit, STATUS, ROADMAP. ← `0dce8e9` (FAIL acceptance)

## Task 23 Acceptance Remediation

- [x] Identify and document all P1/High acceptance defects.
- [x] Verify starting state: branch=main, HEAD=0dce8e9=origin/main, clean.
- [x] Restore exact approved 12-criterion 100-point model.
- [x] Apply all 14 hard filters to all 13 candidates; build 13×14 matrix.
- [x] Reclassify PASS/CONDITIONAL/FAIL honestly (no HOLD_FOR_PRODUCT_OWNER as hard-filter result).
- [x] Restore "No Expansion / Core Evidence + Release Readiness Hardening" candidate.
- [x] Rebuild five profiles against the approved criteria.
- [x] Rewrite `analysis.py` with exact criteria, profile validation, eligible mask, all required outputs.
- [x] Run simulation and verify `python analysis.py --check` exits 0.
- [x] Rewrite `specs/013-post-narrative-expansion-decision/spec.md`.
- [x] Rewrite `specs/013-post-narrative-expansion-decision/README.md`.
- [x] Rewrite `specs/013-post-narrative-expansion-decision/plan.md`.
- [x] Rewrite `specs/013-post-narrative-expansion-decision/tasks.md`.
- [x] Rewrite `specs/013-post-narrative-expansion-decision/acceptance.md` (process-verifying, not winner-hardcoding).
- [x] Rewrite `specs/013-post-narrative-expansion-decision/risk-register.md`.
- [x] Update `docs/adr/0017-post-narrative-expansion-portfolio.md` (preliminary status note).
- [x] Write `docs/adr/0018-post-narrative-expansion-reaudit.md`.
- [x] Update `docs/audits/task-23-post-narrative-expansion.md`.
- [x] Write `docs/audits/task-23-acceptance-remediation.md`.
- [x] Update `docs/STATUS.md`.
- [x] Update `docs/ROADMAP.md`.
- [x] Run full gate sequence; verify zero production-code changes.
- [x] Commit `rerun post-narrative expansion model`; push once.
