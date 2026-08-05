# Task 34 Acceptance Contract

## 1. Acceptance scope

Task 34 is accepted only as a **decision and activation-planning task**.

It must not implement Task 35 or any product candidate.

## 2. Mandatory repository state

At task start:

```text
branch = main
HEAD == origin/main
working tree = clean
latest closed task = 33
latest closed slice = 23
schema = 19
active spec = Slice 024
Task 35 implementation = prohibited
```

At task closure:

```text
latest closed task = 34
latest closed slice = 24
latest feature task = 33
latest feature checkpoint = exact Task 33 implementation SHA
schema = 19
active spec = null
next action = product_owner_gate
forbidden feature jump = true
recommended next candidate = snake_case ID or null
Task 35 implementation = prohibited pending PO approval
```

## 3. Allowed diff scope

Only these paths may change:

```text
START_HERE.md
docs/**
specs/024-post-unified-tags-expansion-decision/**
```

The following must remain unchanged:

```text
frontend/**
src-tauri/**
e2e-tests/**
scripts/**
.github/workflows/**
package.json
frontend/package.json
pnpm-lock.yaml
Cargo.toml
Cargo.lock
capabilities
migrations
generated bindings
```

Exception: none. If analysis genuinely requires code or script changes, stop for Product Owner review and create a separately authorized task.

## 4. Candidate-set acceptance

The final candidate set must:

- map every candidate to immutable-source or accepted-open authority;
- account explicitly for actual-time semantics;
- account explicitly for deadline semantics;
- account explicitly for saved views/filter AST;
- reassess Backlinks after Tags and Task/Life Relationships;
- distinguish Generic Outline from Basic Leaf heading Outline;
- distinguish Noteboard from Narrative Canvas;
- treat Graph as dependent on explicit relationship authority;
- preserve Score as ineligible while formula remains OPEN;
- preserve Prediction as ineligible without measurable local ground truth;
- distinguish whole-tree interchange from backup and single-document portable package;
- include a bounded no-expansion/hardening option;
- document exclusions such as reminders/notifications and relationship expansion.

Any candidate-set modification after freeze requires:

- version increment;
- rationale;
- Product Owner approval;
- full rerun of filters, scoring, and simulation.

## 5. Current-state evidence acceptance

The capability inventory must cover:

- Task schema, recurrence, evaluation, analytics, Today/Upcoming/Overdue;
- Life hierarchy, Basic Leaf, Narrative Canvas, templates, worlds, scenes;
- Global Search, heading Outline, Task/Life Relationships, Tags;
- backup/restore, Markdown, portable package;
- accessibility, security, performance, release, and native E2E governance.

Every major claim must have:

- repository path or accepted audit citation;
- current/superseded classification;
- confidence level;
- explicit distinction between implemented, partially implemented, and absent.

Acceptance failures:

- treating an old candidate score as current evidence;
- treating database substrate as feature approval;
- inferring absent semantics from UI labels;
- relying on a superseded audit without reconciliation.

## 6. Hard-filter acceptance

The final analysis must include a complete 11-candidate × 16-filter matrix.

For every non-PASS cell:

- identify exact blocker;
- cite supporting evidence;
- state whether blocker is product, prerequisite, policy, accessibility, performance, or evidence related;
- define what would close the blocker.

Eligibility rules:

- any FAIL means not directly activatable;
- any CONDITIONAL means not directly activatable;
- only all-PASS candidates enter direct activation scoring;
- prerequisite slices may be recommended separately;
- hardening remains an explicit alternative.

The matrix fails acceptance if:

- a candidate receives a looser standard than another;
- a missing prerequisite is hidden inside implementation scope;
- a candidate is marked PASS without a bounded minimum slice;
- accessibility is deferred without a complete equivalent interaction model;
- canonical data authority is undefined.

## 7. Scoring acceptance

The final model must:

- use 14 criteria totaling 100 weight;
- publish every candidate criterion score;
- publish rationale and evidence for every score;
- publish aggregate sigma per candidate;
- preserve higher-is-better direction for every criterion;
- treat maintenance score as 10 = low burden;
- preserve the full pre-challenge and post-challenge scoring trail.

Scoring fails acceptance if:

- an ineligible candidate can win direct activation;
- uncertainty is omitted;
- scores are tuned after seeing simulation output without a model-version change;
- subjective value is presented as measured user behavior;
- large sample count is presented as proof of correctness.

## 8. Simulation acceptance

Required profiles:

1. Balanced Base;
2. Utility/Workflow;
3. Knowledge/Interconnection;
4. Task Execution;
5. Safety/Maintenance;
6. Interoperability/Longevity.

Required execution:

- fixed seed `20260805`;
- at least 1,000,000 samples/profile;
- deterministic reproducibility;
- weight perturbation preserving profile emphasis;
- bounded candidate score perturbation using disclosed sigma;
- frozen eligibility mask;
- no added package dependency unless separately authorized.

Required outputs:

- base weighted scores;
- aggregate top-1 percentages;
- profile top-1 percentages;
- mean rank;
- pairwise probability against runner-up;
- convergence at 100k, 500k, and final sample count;
- results with and without hardening;
- prerequisite-only ranking;
- runtime and environment;
- deterministic `--check`.

Simulation fails acceptance if:

- the seed cannot reproduce accepted output;
- eligibility masking is incorrect;
- convergence is omitted;
- profile weights do not sum to 100;
- dimensions differ silently;
- NaN/inf occurs;
- analysis code contains candidate-specific ranking overrides.

## 9. Recommendation acceptance

The final recommendation must contain:

```text
recommendation type
selected candidate or prerequisite
recommended Task 35 title
stability class
base score
base lead
aggregate top-1
profile winners
pairwise probability vs runner-up
reversal conditions
minimum implementation slice
schema expectation
IPC/API expectation
UI surfaces
migration/rollback/recovery plan
accessibility model
performance budgets
interoperability behavior
security/privacy boundaries
test plan
native E2E plan
kill criteria
explicit non-goals
Product Owner approval block
```

Allowed recommendation types:

- `ACTIVATE_PRODUCT`;
- `ACTIVATE_PREREQUISITE`;
- `ACTIVATE_HARDENING`;
- `NO_EXPANSION`.

Recommendation fails acceptance if:

- Task 35 is activated automatically;
- the candidate is not all-PASS;
- the minimum slice is unbounded;
- hidden prerequisites remain;
- reversal assumptions are omitted;
- Product Owner approval is not required.

## 10. Governance artifacts

Required files at closure:

```text
specs/024-post-unified-tags-expansion-decision/README.md
specs/024-post-unified-tags-expansion-decision/spec.md
specs/024-post-unified-tags-expansion-decision/plan.md
specs/024-post-unified-tags-expansion-decision/tasks.md
specs/024-post-unified-tags-expansion-decision/acceptance.md
specs/024-post-unified-tags-expansion-decision/risk-register.md
specs/024-post-unified-tags-expansion-decision/candidate-evidence.md
specs/024-post-unified-tags-expansion-decision/analysis.py
specs/024-post-unified-tags-expansion-decision/analysis-results.json
docs/adr/<next-id>-post-unified-tags-expansion-decision.md
docs/audits/task-34-post-unified-tags-expansion-decision.md
docs/ROADMAP.md
docs/STATUS.md
docs/PROJECT_STATE.json
docs/AI_PROJECT_HANDOFF.md
START_HERE.md
```

## 11. Required command gates

Governance:

```powershell
python -m unittest scripts.tests.test_check_project_state
python -m json.tool docs/PROJECT_STATE.json > $null
pnpm source:verify
pnpm governance:check
pnpm index:check
pnpm verify
```

Analysis:

```powershell
python specs/024-post-unified-tags-expansion-decision/analysis.py --check
```

No-product-code proof:

```powershell
git diff --check
git diff --name-only <starting-sha>...HEAD
```

Expected changed paths must all be within the allowed diff scope.

Because no production code changes, full frontend/Rust/native E2E/release build may be reused from Task 33 only when:

- the accepted policy allows governance-only reuse;
- no script, dependency, workflow, source, product, test, or build input changed;
- reused evidence is clearly labeled as reused, not rerun.

If any build input changes, the corresponding full gates must be rerun.

## 12. Evidence quality

All recorded command results must be truthful.

Prohibited evidence values:

```text
null
not_run
assumed
probably passed
spec exists
copied without source
```

Allowed non-executed status:

```text
not_applicable
```

Only when accompanied by an accepted-policy reason.

## 13. Commit protocol

Recommended additive sequence:

1. `activate task 34 expansion decision`
2. `record task 34 candidate evidence`
3. `complete task 34 decision model`
4. `record task 34 recommendation and closure`

Rules:

- no amend;
- no rebase;
- no reset/force push;
- no product code;
- exact 40-character SHAs in authority files;
- final branch clean and synchronized.

## 14. Final acceptance verdict

Task 34 is PASS only when:

```text
P0 = none
P1 = none
candidate inventory = complete
hard-filter matrix = complete
eligible mask = valid
scoring model = disclosed
uncertainty model = disclosed
simulation = reproducible
recommendation = bounded
Task 35 = not started
schema = 19
product-code files changed = 0
Project State = valid
next action = Product Owner gate
```

Remaining P2/P3 debt must be listed explicitly and must not invalidate the recommendation unless it is a prerequisite for the selected candidate.