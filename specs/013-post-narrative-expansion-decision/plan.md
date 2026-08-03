# Slice 013 Plan — Post-Narrative Expansion Decision (Reaudit)

## Scope

**In:** Evaluate 13 expansion candidates under the exact approved 12-criterion 100-point model; apply 14-filter matrix with PASS/CONDITIONAL/FAIL; score all candidates; run five-profile × 1,000,000-sample sensitivity simulation; apply eligible-candidate mask; write spec, ADR 0017 (preliminary), ADR 0018 (accepted), audit, remediation audit, and STATUS/ROADMAP updates; commit and push.

**Out:** Any production code, schema, migration, IPC command, UI component, dependency, or capability change.

## Steps

1. Verify starting state: branch=main, HEAD=origin/main, worktree clean, no Task 24 code.
2. Read all authority documents: STATUS.md, ROADMAP.md, ADR 0006, ADR 0010, ADR 0016, task-17 and task-22 audits, live schema, narrative module.
3. Apply 14 hard filters to all 13 candidates; derive PASS/CONDITIONAL/FAIL outcomes.
4. Apply approved 12-criterion weighted model with documented score rationale.
5. Design five sensitivity profiles against the approved criteria (each summing to 100).
6. Rewrite `analysis.py` with exact approved criteria, profile validation, eligible-candidate mask, top-1/top-3/mean-rank/pairwise/convergence outputs.
7. Run simulation; verify `--check` passes.
8. Rewrite `specs/013-post-narrative-expansion-decision/`: README, spec, plan, tasks, acceptance, risk-register.
9. Update `docs/adr/0017-post-narrative-expansion-portfolio.md` (preliminary status note).
10. Write `docs/adr/0018-post-narrative-expansion-reaudit.md` (accepted, supersedes 0017).
11. Update `docs/audits/task-23-post-narrative-expansion.md`.
12. Write `docs/audits/task-23-acceptance-remediation.md`.
13. Update `docs/STATUS.md` (remediation section at top).
14. Update `docs/ROADMAP.md` (Slice 013 entry updated).
15. Run full gate sequence: `pnpm verify`, `pnpm typecheck`, `pnpm test`, `pnpm build`; `cargo check/fmt/clippy/test`; `python analysis.py --check`.
16. Commit `rerun post-narrative expansion model`; push to origin/main.
