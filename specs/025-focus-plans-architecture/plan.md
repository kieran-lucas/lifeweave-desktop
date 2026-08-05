# Task 35 Execution Plan

## Phase 0 — Safety and activation

1. Confirm `main`, exact HEAD, and Project State.
2. Create Slice 025 specification.
3. Set `PROJECT_STATE.active_spec` to Slice 025.
4. Mark Task 35 active in STATUS/ROADMAP/START_HERE/handoff.
5. Prohibit production changes and Tasks 36–37.

**Gate:** repository authority is internally consistent.

## Phase 1 — Repository reconstruction

Trace:

- Life tree authority and leaf/document mutual exclusion;
- Basic Leaf and Narrative Canvas identity/revision/recovery;
- Task and recurring-series authority;
- Task/Life relationship cardinality;
- tags and Search indexing;
- backup, restore, export, and portable-package boundaries;
- prototype conventions from Task 20;
- current schema and migration policy.

**Output:** `research.md` repository evidence section.

## Phase 2 — External workflow trace

Study current official documentation for systems that separate:

- projects/objectives from granular tasks;
- phases/milestones from task execution;
- structured updates/reviews from ordinary notes;
- project entities from generic database templates;
- project notes from daily tasks.

External products are workflow analogies, not Lifeweave user evidence.

**Output:** `research.md` market analogy section.

## Phase 3 — Architecture options

For A/B/C, define:

- identity;
- persistence envelope;
- lifecycle;
- dates;
- variants;
- phases;
- body;
- Life relation;
- future Task/series relation;
- Search/tags;
- archive/restore;
- backup/export;
- navigation;
- migration and rollback;
- accessibility;
- performance bounds.

**Output:** `architecture-options.md`.

## Phase 4 — Interaction prototypes

Create an isolated static prototype with the shared AI Foundations fixture.

Required views:

- Plans portfolio/list;
- Plan overview;
- variants;
- phases;
- linked Life context;
- future linked Tasks;
- review/history placeholder;
- keyboard-first navigation;
- non-visual semantic outline.

The prototype must visibly expose the costs of A and C rather than cosmetically
making all options identical.

**Output:** `prototype/`.

## Phase 5 — Domain adapter prototype

Implement A/B/C under the shared 30-operation contract.

Required:

- deterministic fixtures;
- semantic export;
- invariant checks;
- randomized operation generator;
- archive/restore probes;
- task/series-link probes;
- canonical hash;
- structural-cost metrics.

**Output:** `prototype.py`, `prototype_test.py`, `prototype-results.json`.

## Phase 6 — Benchmark and failure analysis

Fixtures:

```text
small: 1 plan
medium: 100 plans
large: 1,000 plans
```

Measure:

- portfolio projection;
- open-plan projection;
- normalized Search projection;
- canonical export;
- archive/restore;
- structural Life-node cost;
- relation ambiguity;
- storage rows and joins.

**Gate:** no result may be described as production performance.

## Phase 7 — Hard filters and scoring

1. Complete 3 × 18 hard-filter matrix.
2. Freeze criteria and weights.
3. Score only after filters.
4. Include rationale and uncertainty for every score.
5. Red-team the Product Owner-preferred option B.
6. Preserve any option that wins a legitimate profile.

## Phase 8 — Sensitivity analysis

Use a deterministic model with:

- at least six canonical profiles;
- at least 200,000 samples/profile;
- disclosed seed;
- candidate uncertainty;
- weight/profile perturbation;
- aggregate top-1 and pairwise results;
- convergence checkpoints;
- `--check` reproducibility.

**Output:** `analysis.py`, `analysis-results.json`.

## Phase 9 — Canonical decision

Write:

- `decision.md`;
- accepted or rejected ADR;
- Task 36 activation packet;
- Task 37 reservation boundary;
- reversal conditions.

No production implementation begins.

## Phase 10 — Verification and ten-round audit

Run ten independent rounds:

1. Git authority and diff scope;
2. source/decision traceability;
3. option fairness;
4. adapter completeness;
5. invariant/data-loss review;
6. benchmark and arithmetic review;
7. sensitivity and anti-anchoring review;
8. accessibility/navigation review;
9. governance/evidence truth review;
10. closure and Tasks 36–37 prohibition review.

Every finding is corrected before closure.

## Phase 11 — Closure

- close Task 35 and Slice 025;
- keep latest feature Task 33 unless production code changed;
- keep schema 19;
- set active spec null;
- set next action Product Owner gate;
- record selected architecture candidate;
- update issue #1;
- push final evidence commit;
- verify `main` ref.
