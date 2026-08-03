# Slice 013 Acceptance

Task 23 passes only when:

## Model integrity

- the exact approved 12-criterion 100-point model is used (weights [16,10,10,12,9,9,8,7,6,5,5,3]);
- no criterion is substituted, renamed, or reordered;
- higher scores always mean better on every criterion;
- maintenance cost scoring is explicitly inverted (10 = low burden);
- all 5 profile weight vectors sum exactly to 100;
- profile emphases target the approved criteria (user value/frequency/boundedness for utility; differentiation for visual; data safety/accessibility/maintenance/performance for safety; data safety/interop/evidence/accessibility for recovery);

## Candidate inventory

- all 13 candidates are evaluated;
- the hardening candidate is `No Expansion / Core Evidence + Release Readiness Hardening`, not a zero-change baseline;
- the hardening candidate is scored on its actual engineering and user value;

## Hard-filter matrix

- a 13 × 14 hard-filter matrix is present;
- every cell is PASS, CONDITIONAL, or FAIL;
- every non-PASS cell has a concise evidence note;
- `HOLD_FOR_PRODUCT_OWNER` is a portfolio-layer label, not a hard-filter result;
- candidates with unresolved Product Owner decisions are CONDITIONAL, not PASS;
- candidates with undefined user value or semantics are CONDITIONAL or FAIL;
- at least one FAIL filter blocks the candidate;

## Simulation

- `analysis.py` uses the exact approved 12 criteria;
- seed is 20260803, 1,000,000 samples per profile, 5 profiles = 5,000,000 total;
- `python analysis.py --check` exits 0;
- `results.json` contains top-1, top-3, mean rank, pairwise, and convergence data;
- convergence drift is within 5 % across 100k/500k/1M checkpoints;
- the simulation is explicitly described as sensitivity analysis, not empirical evidence;

## Activation decision

- activation decision is derived from the model, not assumed in advance;
- base-score lead (not aggregate lead) is used to check the 0.35 threshold;
- all activation thresholds are checked and published: base_score ≥ 7.0, base_lead ≥ 0.35, aggregate top-1 ≥ 55 %;
- result is either valid ACTIVATE_NEXT with all thresholds met, or NO_ACTIVATION with documented reason;
- at most one candidate is ACTIVATE_NEXT;

## Documentation

- two-layer vocabulary: hard-filter (PASS/CONDITIONAL/FAIL) and portfolio (ACTIVATE_NEXT/HOLD_FOR_PRODUCT_OWNER/DEFER/RECOMMEND_REMOVE);
- each candidate has exactly one value per layer;
- prerequisite graph distinguishes satisfied / conditional / unsatisfied;
- Task 24 contract defines scope, exclusions, data model, migration, IPC, accessibility, acceptance gate, kill criteria;
- `docs/adr/0018-post-narrative-expansion-reaudit.md` exists and supersedes ADR 0017 as acceptance authority;
- `docs/audits/task-23-acceptance-remediation.md` exists;
- preliminary commit `0dce8e9` is identified as the substituted-criteria draft;

## Gates

- no production dependency, migration, IPC, capability, route, or UI file changed;
- `pnpm verify` passes all governance gates;
- `pnpm typecheck`, `pnpm test`, `pnpm build` pass;
- `cargo check/fmt/clippy/test` pass;
- final commit is pushed and worktree is clean.
