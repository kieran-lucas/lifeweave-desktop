# Spec 010 — Task Evidence

## Acceptance summary

Task 20/60 is complete. See `docs/audits/task-20-narrative-schema-prototype.md` for full evidence.

## Test evidence

- 60 new prototype tests in `prototype.test.ts`; all pass
- 193 pre-existing frontend tests: all pass
- Total frontend: 253 tests, 0 failing, 17 test files

## Simulation results (seed 20260803, 100,000 ops each)

| Strategy | Ops applied | Errors | Final scenes | Final blocks |
|---|---|---|---|---|
| A | 94,670 | 0 | 5 | 30 |
| B | 94,670 | 0 | 5 | 30 |

Both strategies produce identical final state — confirming semantic equivalence of the 100k deterministic operation sequence.

## Benchmark results (FIXTURE_K, n=1000)

| Operation | A p50 | A p95 | A max | B p50 | B p95 | B max |
|---|---|---|---|---|---|---|
| parse | 0.12ms | 0.16ms | 1.7ms | 0.23ms | 0.41ms | 1.0ms |
| serialize | 0.04ms | 0.04ms | 0.5ms | 0.08ms | 0.18ms | 13.6ms |
| reorder | <0.01ms | <0.01ms | 0.02ms | <0.01ms | <0.01ms | 0.03ms |
| editBlock | <0.01ms | <0.01ms | 0.02ms | <0.01ms | <0.01ms | 0.03ms |
| extractText | <0.01ms | 0.01ms | 0.6ms | <0.01ms | 0.03ms | 1.0ms |

Notes: All Strategy A times are below 2ms. Strategy B parse and serialize are 2–340× slower than A on these metrics but still acceptably fast in isolation. The performance gap is not the primary decision criterion; correctness and migration safety are.

## Decision matrix

| Strategy | Score / 100 |
|---|---|
| A (domain envelope) | 93.6 |
| B (full PM document) | 56.7 |

Gap: 36.9 points. Strategy A is selected.
