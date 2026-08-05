# Task 34 Work Breakdown

## Legend

- **Owner:** analysis agent unless stated otherwise.
- **PO:** Product Owner decision required.
- **Gate:** task may not proceed until condition passes.
- **Output:** required repository artifact or recorded evidence.
- **No product code:** applies to every work item.

## Workstream A — Activation and repository safety

### T34-A01 — Resolve execution baseline

**Depends on:** none

Actions:

- fetch `origin`;
- confirm `main`;
- record exact `HEAD` and `origin/main`;
- require clean tree;
- record toolchain versions;
- record schema maximum and Project State;
- verify source manifest/hash.

Output:

- baseline section in `candidate-evidence.md`;
- no repository mutation if gate fails.

Acceptance:

- exact 40-character SHAs;
- no untracked ambiguity;
- source SHA equals manifest;
- schema equals Project State.

### T34-A02 — Activate Slice 024 governance

**Depends on:** T34-A01, PO authorization

Actions:

- ensure `specs/024-post-unified-tags-expansion-decision/` exists;
- set Project State `active_spec` to that directory;
- set `next_action=implement_active_spec`;
- keep latest closed task/slice at 33/023 during execution;
- keep latest feature checkpoint at Task 33 implementation SHA;
- add Task 34 STATUS section before Task 33;
- add Slice 024 roadmap section marked active decision analysis;
- update START_HERE exact next-action marker;
- update handoff with execution authority and prohibition on Task 35 implementation.

Output:

- governance-only activation commit.

Acceptance:

- Project State tests pass;
- no recommended Task 35 candidate yet;
- Task 35 remains prohibited.

### T34-A03 — Record no-product-code scope guard

**Depends on:** T34-A02

Actions:

- capture allowed path list;
- add a diff check procedure to the execution notes;
- record prohibited directories;
- define hard stop on any product-code need.

Acceptance:

- execution agent can mechanically verify allowed paths before every commit.

## Workstream B — Current-state reconstruction

### T34-B01 — Build authoritative document inventory

**Depends on:** T34-A02

Read and catalog:

- source manifest and immutable source;
- constitution and CLAUDE rules;
- Project State, START_HERE, STATUS, ROADMAP, handoff;
- ADR registry and all expansion-related ADRs;
- Task 17, 23, 25, 29, 31, 32, and 33 audits/specifications;
- current release candidate evidence.

Output columns:

```text
path
purpose
authority level
relevant candidates
current/superseded
required follow-up
```

Acceptance:

- no current authority inferred from a superseded document;
- every candidate has at least one authority source.

### T34-B02 — Reconstruct Task domain

**Depends on:** T34-B01

Inspect:

- migrations and task tables;
- task/series/occurrence DTOs;
- recurrence service and repository;
- evaluation and analytics;
- Today/Upcoming/Overdue;
- Task/Life relation;
- tag assignments;
- search indexing;
- backup/restore and export behavior;
- frontend task surfaces and tests.

Output:

- Task capability inventory;
- unresolved semantic list for actual time, deadlines, reminders, score, prediction, and saved views.

Acceptance:

- scheduled time is clearly separated from any hypothesized actual time or deadline;
- recurrence ownership is documented;
- no absent field is treated as an implemented feature.

### T34-B03 — Reconstruct Life/document domain

**Depends on:** T34-B01

Inspect:

- Life node authority;
- Basic Leaf and Narrative canonical data;
- Reader/Edit/Studio/Pinned/Outline;
- templates/worlds/scenes;
- local assets;
- portable package;
- Task relationship and tags;
- search navigation;
- archive/restore and revisions.

Output:

- Life/document capability inventory;
- unresolved semantics for links/backlinks, Generic Outline, Noteboard, Graph, and broader interchange.

Acceptance:

- Generic Outline is distinguished from existing Basic Leaf heading Outline;
- Noteboard is distinguished from Narrative Canvas;
- whole-tree interchange is distinguished from backup and single-document portable package.

### T34-B04 — Reconstruct cross-cutting constraints

**Depends on:** T34-B02, T34-B03

Inspect:

- dependency and capability inventory;
- security and no-remote-assets gates;
- accessibility patterns;
- performance budgets and current bundle sizes;
- native E2E architecture;
- release and RC process;
- project state/governance contracts.

Output:

- cross-cutting constraint matrix;
- candidate-specific budget template.

### T34-B05 — Validate capability inventory

**Depends on:** T34-B02, T34-B03, T34-B04

Actions:

- cross-check repository findings against accepted audits;
- resolve contradictions in favor of current code/schema plus accepted authority;
- mark evidence confidence;
- list any inaccessible or ambiguous evidence.

Gate:

- scoring prohibited until inventory review is complete.

## Workstream C — Source traceability and candidate normalization

### T34-C01 — Extract immutable-source candidate requirements

**Depends on:** T34-B01

Search and map all relevant source headings and states.

Output:

- source traceability table;
- exact candidate mapping;
- excluded source-item log.

### T34-C02 — Reassess Task 17 blockers

**Depends on:** T34-B05, T34-C01

For Search, Outline, Visual Worlds, Narrative Canvas, Tags, Backlinks, Score, Prediction, Noteboard, Graph:

- record original result;
- record original blocker;
- record implementation changes through Task 33;
- classify blocker as closed/partial/open;
- identify lessons for current model.

Output:

- Task 17 delta table.

### T34-C03 — Reassess Task 23 blockers

**Depends on:** T34-B05, T34-C01

For multi-scene, templates, worlds, package, tags, Task/Life relationships, Generic Outline, Backlinks, Noteboard, Graph, Score, Prediction, hardening:

- record original result and blocker;
- record subsequent task that closed or changed each prerequisite;
- prohibit score reuse;
- identify current unresolved policy decisions.

Output:

- Task 23 delta table.

### T34-C04 — Validate candidate set C1–C11

**Depends on:** T34-C01, T34-C02, T34-C03

Actions:

- prove each candidate maps to source/open decision;
- detect missing candidates;
- detect duplicate candidates;
- detect candidates that should be prerequisite-only;
- account for reminders/notifications/sound;
- account for relationship expansion if source requires it;
- account for platform/cloud features and explain exclusion.

Gate:

- candidate-set change requires PO approval before T34-D01.

### T34-C05 — Freeze candidate IDs and model version

**Depends on:** T34-C04, PO approval if changed

Output:

```text
model_version
candidate IDs and canonical names
candidate mapping hash
filters version
criteria/weights version
profiles version
```

Acceptance:

- immutable for the scoring run;
- subsequent changes require version increment and full rerun.

## Workstream D — Candidate minimum-slice design

### T34-D01 — Actual-Time Tracking evidence card

**Depends on:** T34-C05

Required decisions to analyze:

- one active timer invariant;
- Task vs occurrence ownership;
- pause/resume session representation;
- crash/restart reconciliation;
- timezone and clock-change behavior;
- manual correction and audit history;
- archive/delete behavior;
- analytics boundary;
- privacy and no-surveillance boundary.

Kill conditions:

- requires hidden monitoring;
- cannot define restart-safe authority;
- duplicates scheduled time without recurring value.

### T34-D02 — Deadline semantics evidence card

**Depends on:** T34-C05

Required decisions:

- date-only vs date-time;
- local timezone authority;
- one-off vs series vs occurrence ownership;
- override and this-and-future behavior;
- interaction with scheduled date/time;
- Overdue semantics;
- completion/cancellation/archival;
- search/filter/export behavior;
- migration and null default.

Kill conditions:

- deadline cannot be separated from schedule;
- recurrence semantics remain ambiguous;
- implementation requires reminders to be useful.

### T34-D03 — Saved Views evidence card

**Depends on:** T34-C05

Required decisions:

- supported entity scopes;
- predicate inventory;
- AST versioning;
- unsupported predicate handling;
- sorting/grouping authority;
- view ownership and ordering;
- UI entry point;
- performance and index strategy;
- backup/export.

Kill conditions:

- arbitrary SQL/expression execution;
- duplicates permanent navigation without meaningful workflow;
- no bounded predicate set.

### T34-D04 — Links/Backlinks evidence card

**Depends on:** T34-C05

Required decisions:

- allowed endpoint kinds;
- directed vs undirected;
- typed vs untyped links;
- creation authority;
- duplicate/self-link rules;
- archive/delete/restore;
- document revision behavior;
- incoming/outgoing projection;
- portable package and backup;
- accessibility.

Kill conditions:

- relies on title parsing;
- implicit links are canonical;
- no explicit creation workflow;
- no stable archive semantics.

### T34-D05 — Generic Outline evidence card

**Depends on:** T34-C05

Required decisions:

- exact authority beyond headings;
- entity scope;
- relationship to Life tree and scene tabs;
- edit vs navigation behavior;
- persistence;
- accessibility;
- demonstrated workflow.

Kill condition:

- candidate cannot state a role beyond existing heading navigation.

### T34-D06 — Noteboard evidence card

**Depends on:** T34-C05

Required decisions:

- canonical board/card model;
- source entity embedding/reference;
- spatial coordinates and ordering;
- non-spatial equivalent;
- distinction from Canvas;
- Task-row protection;
- scale and export.

Kill conditions:

- Task cards replace task rows;
- duplicates Canvas/Life organization;
- no recurring workflow.

### T34-D07 — Graph evidence card

**Depends on:** T34-D04

Required decisions:

- graph source relations;
- projection only vs persisted layout;
- filters and scope;
- deterministic accessible alternative;
- layout complexity;
- large-corpus behavior;
- no duplication of Life tree.

Automatic result:

- `FAIL` or `CONDITIONAL` if explicit links remain unapproved.

### T34-D08 — Score evidence card

**Depends on:** T34-C05

Required decisions:

- formula authority;
- units and normalization;
- category weighting;
- treatment of rest, low volume, missed, cancelled, deferred, recurring, and unevaluated work;
- gaming resistance;
- explainability;
- accessibility and emotional safety;
- deletion/recalculation.

Automatic result:

- `FAIL` if formula remains OPEN.

### T34-D09 — Prediction evidence card

**Depends on:** T34-C05

Required decisions:

- target variable;
- ground-truth source;
- history threshold;
- train/evaluation split;
- calibration metric;
- abstention;
- uncertainty UI;
- model rebuild/delete;
- local resource budget;
- non-predictive fallback.

Automatic result:

- `FAIL` if measurable correctness or sufficient history is absent.

### T34-D10 — Whole-tree interchange evidence card

**Depends on:** T34-C05

Required decisions:

- export selection unit;
- manifest and version;
- node/document/tag/relation/link boundary;
- assets and checksums;
- ID remap/collision;
- atomic preview/import;
- archive handling;
- backup distinction;
- partial failure cleanup;
- package-bomb/path traversal limits.

### T34-D11 — Hardening evidence card

**Depends on:** T34-B04

Required decisions:

- bounded debt inventory;
- severity and user impact;
- objective closure criteria;
- maximum one-task scope;
- no feature smuggling;
- evidence that current product needs hardening more than expansion.

## Workstream E — Hard filters and adversarial review

### T34-E01 — Populate F1–F16 matrix

**Depends on:** T34-D01–T34-D11

Output:

- 11 × 16 matrix;
- evidence note for every non-PASS cell;
- direct-activation eligibility class.

### T34-E02 — Cross-candidate consistency review

**Depends on:** T34-E01

Checks:

- same accessibility standard;
- same migration/recovery standard;
- same evidence burden;
- same duplication threshold;
- same privacy/security standard;
- no candidate favored through looser interpretation.

### T34-E03 — Red-team every eligible candidate

**Depends on:** T34-E02

For each all-PASS candidate:

- construct strongest failure case;
- test hidden prerequisites;
- test data-loss scenario;
- test keyboard/screen-reader failure;
- test scale boundary;
- test duplication claim;
- test unbounded follow-on risk.

Output:

- adversarial review and any filter corrections.

### T34-E04 — Freeze eligibility mask

**Depends on:** T34-E03

Gate:

- scoring script must use exact frozen mask.

## Workstream F — Scoring and uncertainty

### T34-F01 — Freeze criteria and weights

**Depends on:** T34-E04

Use the 14 criteria and 100-point weights from `spec.md`, unless PO-approved version change occurs before scoring.

Output:

- machine-readable weight table;
- rationale for differences from Task 17/23 models.

### T34-F02 — Assign evidence-backed scores

**Depends on:** T34-F01

For every candidate/criterion:

- score 0–10;
- rationale;
- evidence reference;
- confidence;
- uncertainty driver.

### T34-F03 — Challenge and reconcile scores

**Depends on:** T34-F02

- independent challenge pass;
- list disagreements;
- reconcile differences ≥1.5;
- preserve original and final values in audit trail.

### T34-F04 — Assign aggregate sigma

**Depends on:** T34-F03

Rules:

- minimum 0.35;
- maximum 1.40;
- higher uncertainty for absent workflow evidence, unresolved domain semantics, subjective value, or unavailable scale evidence;
- lower uncertainty only with direct repository proof.

### T34-F05 — Freeze scoring dataset

**Depends on:** T34-F04

Output:

- versioned constants in `analysis.py`;
- human-readable score table;
- hash or deterministic serialization for accepted dataset.

## Workstream G — Sensitivity analysis

### T34-G01 — Implement deterministic analysis script

**Depends on:** T34-F05

Use Python standard library plus already-approved local packages only. Prefer NumPy only if already present in project execution environment and policy allows; otherwise implement bounded deterministic sampling without adding dependencies.

Required CLI:

```text
python analysis.py
python analysis.py --samples <development count>
python analysis.py --check
```

### T34-G02 — Validate numerical invariants

**Depends on:** T34-G01

Tests/checks:

- weights positive and normalized;
- candidate dimensions align;
- scores clipped;
- eligibility mask applied;
- fixed seed reproducible;
- profile totals valid;
- ties deterministic;
- no NaN/inf;
- convergence checkpoints emitted.

### T34-G03 — Run development analysis

**Depends on:** T34-G02

- small sample smoke;
- inspect ranking and output structure;
- correct implementation bugs only;
- do not alter model to favor a result.

### T34-G04 — Run final sensitivity analysis

**Depends on:** T34-G03

- ≥1,000,000 samples/profile;
- six profiles;
- record runtime, environment, seed;
- record aggregate/profile/pairwise/convergence outputs;
- run with and without hardening candidate;
- separate prerequisite ranking.

### T34-G05 — Lock `--check`

**Depends on:** T34-G04

- encode accepted summary with disclosed tolerance;
- repeated `--check` passes;
- changing model constants invalidates expected output.

## Workstream H — Recommendation and activation packet

### T34-H01 — Classify recommendation stability

**Depends on:** T34-G04

Apply `ROBUST`, `MODERATE`, `UNSTABLE`, or `NO_ELIGIBLE_PRODUCT` rules.

### T34-H02 — Select recommendation type

**Depends on:** T34-H01

Choose one:

- `ACTIVATE_PRODUCT`;
- `ACTIVATE_PREREQUISITE`;
- `ACTIVATE_HARDENING`;
- `NO_EXPANSION`.

### T34-H03 — Write runner-up and reversal analysis

**Depends on:** T34-H02

Include:

- runner-up;
- decisive gap;
- profile disagreements;
- assumptions that reverse result;
- missing user evidence;
- why sample count does not prove value.

### T34-H04 — Produce Task 35 activation packet

**Depends on:** T34-H02

Complete every field in `spec.md` Section 10.

Gate:

- packet is recommendation only;
- no Task 35 active spec created.

### T34-H05 — Product Owner approval block

**Depends on:** T34-H04

Exact output:

```text
Recommended next action: <...>
Recommended Task 35 title: <...>
Recommendation stability: <...>
Product Owner decision required: APPROVE / REJECT / MODIFY
```

## Workstream I — Governance and closure

### T34-I01 — Draft accepted ADR

**Depends on:** T34-H05

ADR includes:

- context;
- candidate set;
- filters;
- model and uncertainty;
- results;
- recommendation;
- rejected alternatives;
- consequences;
- Task 35 prohibition pending PO approval.

### T34-I02 — Write audit

**Depends on:** T34-I01

Audit includes:

- exact baseline and final SHA placeholders;
- changed files;
- no-product-code proof;
- command results;
- analysis outputs;
- recommendation;
- debt and risks;
- any deviations.

### T34-I03 — Update Roadmap and Status

**Depends on:** T34-I02

- Slice 024 first/newest roadmap section;
- Task 34 first STATUS section;
- accepted recommendation recorded without Task 35 activation.

### T34-I04 — Close Project State

**Depends on:** T34-I03

Expected state:

```text
latest_closed_task = 34
latest_closed_slice = 24
latest_feature_task = 33
latest_feature_checkpoint = Task 33 exact implementation SHA
schema = 19
active_spec = null
next_action = product_owner_gate
forbidden_feature_jump = true
recommended_next_candidate = selected snake_case ID or null
```

### T34-I05 — Update handoff and START_HERE

**Depends on:** T34-I04

- exact next action Product Owner gate;
- Task 35 prohibited;
- recommended candidate and evidence summary;
- current risks/debt;
- no implementation authorization.

### T34-I06 — Run closure gates

**Depends on:** T34-I05

Run all commands in `acceptance.md`.

### T34-I07 — Verify diff scope

**Depends on:** T34-I06

Require zero changes outside:

```text
START_HERE.md
docs/**
specs/024-post-unified-tags-expansion-decision/**
```

### T34-I08 — Commit and synchronize

**Depends on:** T34-I07

- additive commits only;
- no amend/rebase/force push;
- push normally;
- fetch;
- require `HEAD == origin/main`;
- require clean tree.

### T34-I09 — Final report

**Depends on:** T34-I08

Return:

```text
starting SHA
final SHA
Task 34 verdict
Slice 024 verdict
candidate eligibility summary
recommended action
recommended Task 35 title
base weighted score and lead
profile winners
aggregate top-1
stability class
seed and samples
schema
product-code files changed = 0
remaining debt
next action = Product Owner gate
```

## Product Owner gates

PO approval is mandatory at:

1. Task 34 activation on `main`;
2. any candidate-set/model change after freeze;
3. interpretation of an unresolved source policy that changes eligibility;
4. Task 34 final recommendation acceptance;
5. Task 35 activation.

Task 34 analysis may continue through recommendation without Task 35 approval, but product implementation may not begin.