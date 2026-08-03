# Spec 010 — Task Evidence (complete reaudit)

## Acceptance summary

Task 20/60 is complete. See `docs/audits/task-20-complete-reaudit.md` for full evidence.

## Test evidence

- 90 prototype tests in `prototype.test.ts`: all pass
- 3 simulation tests in `simulation.test.ts`: all pass
- 28 benchmark tests in `benchmark.test.ts`: all pass
- 193 pre-existing frontend tests: all pass
- Total frontend: 314 tests, 0 failing, 19 test files

## Simulation results (seed 20260803, 100,000 applied ops each)

| Strategy | Ops applied | Attempted | Skipped | Undos | Redos | Batches | Final hash |
|---|---|---|---|---|---|---|---|
| A | 100,000 | 133,175 | 33,175 | 6,615 | 502 | 2,787 | 8cc892e |
| B | 100,000 | 133,175 | 33,175 | 6,615 | 502 | 2,787 | 8cc892e |

Both strategies produce identical final-state hash, confirming semantic equivalence.

## Benchmark results (key figures)

### FIXTURE_S (8 scenes × 5 blocks)

| Operation | A p50 | B p50 |
|---|---|---|
| parse | 0.068ms | 0.159ms |
| serialize | 0.034ms | 0.080ms |
| projectToStatic | 0.008ms | 0.035ms |
| extractPlainText | 0.017ms | 0.032ms |

### FIXTURE_MEDIUM (100 scenes × 5 blocks)

| Operation | A p50 | A p95 | B p50 | B p95 |
|---|---|---|---|---|
| parse | 0.525ms | 0.834ms | 1.051ms | 1.953ms |
| projectToStatic | 0.074ms | — | 0.189ms | — |
| extractPlainText | 0.172ms | — | 0.193ms | — |

## Decision matrix

| Strategy | Score / 100 |
|---|---|
| A (domain envelope) | 82.8 |
| B (full PM document) | 67.9 |

Gap: 14.9 points (threshold: 10 points). Strategy A selected.

## Hard veto re-evaluation

ADR 0009 applied two hard vetoes against Strategy B. Both resolved by fair implementation:

- **Static rendering veto:** Resolved by `strategy-b/static-reader.ts` which walks raw JSON without PM import. Test confirms match with `projectToStatic`.
- **Migration veto:** Resolved by `strategy-b/codec.ts` fair pre-validation + migration before `nodeFromJSON`. Test confirms `narrativeType` preserved across v1→v2 migration.

Decision is based on total weighted score (82.8 vs 67.9), not hard vetoes.
