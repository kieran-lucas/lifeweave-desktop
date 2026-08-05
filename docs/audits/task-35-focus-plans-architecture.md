# Task 35 Audit — Focus Plans Architecture Prototype

## Scope

Task 35 is a prototype/decision slice. It adds no product behavior, migration,
dependency, IPC, capability, route, generated binding, or native E2E phase.

## Baseline

```text
starting HEAD: 321da59282098a2f83b6530421c53b09704dddd7
latest product checkpoint: 4d1b65c816312a9e6ae8aa39f4a565555af9feb9
schema: 19
issue: #1
```

## Options

- A — third Life document type;
- B — standalone Focus Plan entity;
- C — Basic Leaf template with metadata.

## Prototype evidence

```text
shared operations: 30
applied operations: 100,000 per option
uncaught errors: 0
invariant errors: 0
semantic final hash equality: PASS
unit tests: 23 passed
fixtures: 1 / 100 / 1,000 Plans
```

At 1,000 Plans, A and C each require 1,000 Life nodes; B requires none. B has no
synthetic unassigned branch and no ambiguity with existing Task→Life authority.

Wall-clock benchmark numbers are prototype environment evidence only. The
`--check` contract compares deterministic semantic/structural evidence and
validates the benchmark record shape rather than requiring byte-identical
wall-clock timings.

## Decision evidence

```text
hard filters: 3 × 18 complete
A: FAIL
B: PASS
C: FAIL
criteria: 14
weight total: 100
A base score: 5.430
B base score: 8.850
C base score: 5.685
canonical profiles: 6
stress profiles: 3
samples/profile: 200,000
seed: 20260805
selected: B_standalone_entity
stability: ROBUST
```

The extreme editor-reuse stress profile produced B 51.9370% and C 48.0600%
top-1, preserving a genuine reversal scenario instead of hardcoding B.

Monte Carlo output is model sensitivity, not product-success probability.

## Canonical decision

ADR 0030 selects the standalone entity. Task 36 is bounded to Plan core,
lifecycle, variants/phases, revisions/recovery, tags, Search, backup, and a lazy
Plans workspace. Task/series links and review workflow remain Task 37.

## Verification performed in prototype environment

```text
python prototype.py
python prototype.py --check
python analysis.py
python analysis.py --check
python -m unittest discover . -p "*_test.py"
python -m py_compile prototype.py analysis.py prototype_test.py analysis.test.py
python -m json.tool prototype-results.json
python -m json.tool analysis-results.json
```

Result: 23 tests passed; deterministic checks passed; JSON and Python syntax
passed.

Repository wrapper and product gates must be classified truthfully at closure.
No production/build input changed, so accepted Task 33 product evidence may be
reused under the governance-only policy.

## Pending before closure

- ten-round self-review;
- Project State closure validation;
- authority file updates;
- issue #1 disposition;
- final Git diff/ref verification.
