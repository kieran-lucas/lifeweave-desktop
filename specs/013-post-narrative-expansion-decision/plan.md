# Slice 013 Plan — Post-Narrative Expansion Decision

## Scope

**In:** Evaluate 13 expansion candidates against hard filters and a 12-criterion weighted model; run five-profile × one-million-sample sensitivity simulation; write spec, ADR, audit, and STATUS/ROADMAP updates; commit and push.

**Out:** Any production code, schema, migration, IPC command, UI component, dependency, or capability change.

## Steps

1. Verify starting state: branch=main, HEAD=origin/main, worktree clean.
2. Read all authority documents: STATUS.md, ROADMAP.md, ADR 0006, ADR 0010, ADR 0016, task-17 and task-22 audit, live schema/narrative module.
3. Evaluate all 13 candidates independently; assign hard-filter results.
4. Design 12-criterion weighted model with disclosed priors.
5. Design five sensitivity profiles with Dirichlet α vectors.
6. Write `analysis.py`; run simulation (seed 20260803, 5,000,000 total samples).
7. Verify `--check` passes.
8. Write `specs/013-post-narrative-expansion-decision/`: README, spec, plan, tasks, acceptance, risk-register.
9. Write `docs/adr/0017-post-narrative-expansion-portfolio.md`.
10. Write `docs/audits/task-23-post-narrative-expansion.md`.
11. Update `docs/STATUS.md` (Task 23 section at top).
12. Update `docs/ROADMAP.md` (Slice 013 entry).
13. Run gate sequence: `pnpm verify`, `pnpm typecheck`, `pnpm test`, `pnpm build`; `cargo check/fmt/clippy/test`; `python analysis.py --check`.
14. Commit `decide post-narrative expansion`; push to origin/main.
