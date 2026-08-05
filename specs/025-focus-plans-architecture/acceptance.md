# Task 35 Acceptance Contract

## Scope

Task 35 is a prototype/decision slice.

Allowed paths:

```text
START_HERE.md
docs/**
specs/025-focus-plans-architecture/**
```

No production path is allowed.

## Required prototype evidence

- three implemented options A/B/C;
- one common 30-operation contract;
- deterministic shared fixtures;
- archive/restore and recovery behavior;
- Life fragmentation measurement;
- relation ambiguity measurement;
- Task/series readiness probes;
- Search projection;
- canonical export and hash;
- 100,000 applied operations per option;
- small/medium/large projection benchmarks;
- complete tests.

## Required decision evidence

- 3 × 18 hard-filter matrix;
- 14 criteria, weights totaling 100;
- every score tied to evidence;
- uncertainty disclosed;
- at least six profiles;
- at least 200,000 samples/profile;
- reproducible seed and `--check`;
- Product Owner preference not encoded as a forced winner;
- strongest counter-case documented;
- reversal conditions documented.

## Required architecture result

The selected model must state:

```text
identity
lifecycle
dates
Life cardinality
Task cardinality
series cardinality
variant ownership
phase ownership
body authority
draft/revision/recovery
Search/tags
archive/restore
backup/export
navigation
migration
rollback
Task 36 scope
Task 37 scope
```

## Required verification

Run where available:

```powershell
python -m unittest scripts.tests.test_check_project_state
python -m unittest discover specs/025-focus-plans-architecture -p "*_test.py"
python specs/025-focus-plans-architecture/prototype.py --check
python specs/025-focus-plans-architecture/analysis.py --check
python -m json.tool docs/PROJECT_STATE.json > $null
python -m json.tool specs/025-focus-plans-architecture/prototype-results.json > $null
python -m json.tool specs/025-focus-plans-architecture/analysis-results.json > $null
pnpm source:verify
pnpm governance:check
pnpm index:check
pnpm verify
git diff --check
```

Production frontend/Rust/native/release gates may be reused only when no product
or build input changed, and reuse must be labeled truthfully.

## Ten-round closure gate

All ten rounds in `self-review.md` must show:

```text
finding
correction
result
```

A round with an unresolved P0/P1 blocks closure.

## Final state

```text
latest_closed_task = 35
latest_closed_slice = 25
latest_feature_task = 33
latest_feature_checkpoint = 4d1b65c816312a9e6ae8aa39f4a565555af9feb9
database_schema_version = 19
active_spec = null
next_action = product_owner_gate
forbidden_feature_jump = true
recommended_next_candidate = selected Task 36 architecture identifier
Task 36 = not started
Task 37 = not started
```
