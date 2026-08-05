# Slice 024 Specification — Post-Unified-Tags Expansion Decision

## 1. Decision authority

The Product Owner holds final authority over Task 34 candidate selection and Task 35 activation.

The analysis agent may:

- reconstruct current product state;
- define bounded candidate slices;
- evaluate evidence;
- reject ineligible candidates;
- calculate scores and sensitivity results;
- recommend exactly one next action.

The analysis agent may not:

- activate Task 35;
- modify production code;
- introduce migrations, dependencies, capabilities, routes, IPC commands, persisted models, or UI behavior;
- reinterpret `OPEN`, `DEFERRED`, `PROTOTYPE-GATED`, or `REMOVED` as approval;
- claim empirical user evidence that does not exist;
- use simulation sample count as proof of product value;
- silently change the approved model after seeing results.

Final Task 34 output must end with a Product Owner gate:

```text
Recommended next action:
<ACTIVATE_PRODUCT | ACTIVATE_PREREQUISITE | ACTIVATE_HARDENING | NO_EXPANSION>

Recommended Task 35 title:
<bounded title or NONE>

Product Owner decision required:
APPROVE / REJECT / MODIFY
```

## 2. Starting authority

Required execution starting point:

- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- expected planning baseline: release lineage containing `09b1284f7e17a6e64feeb2bfe8ff6998e7a80bfd`
- latest closed task: 33
- latest closed slice: 023
- latest feature checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- database schema: 19
- active specification before Task 34 activation: none
- immutable source SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`

At execution start, the agent must resolve and record the exact 40-character HEAD, `origin/main`, branch, and clean-tree state. Any drift requires a fresh baseline inventory before analysis.

## 3. Current implemented baseline to verify

The following is a planning hypothesis, not execution evidence. Task 34 must independently verify it from source, ADRs, schema, IPC, frontend routes/components, tests, audits, and release evidence.

### 3.1 Task pillar

Expected implemented capabilities:

- Today-default task workflow;
- one-off Task CRUD;
- exact-minute scheduled start/end time;
- recurrence and occurrence overrides;
- Week Strip and Calendar projection;
- completion assessment and undo;
- objective Week/Month/Year analytics;
- category minimum/target goals;
- objective streaks;
- Upcoming and Overdue projections;
- zero-or-one Life relationship on one-off Tasks and recurring series;
- Unified Tags assignment and retrieval.

Expected open areas:

- actual elapsed-time tracking;
- deadline semantics distinct from scheduled date/time;
- reminders/notifications/sound;
- total score and score streak;
- calibrated prediction.

### 3.2 Life pillar

Expected implemented capabilities:

- protected neutral root;
- Browse, Edit, Reader, and Pinned workflows;
- create, rename, reorder, reparent, archive/restore, undo;
- Basic Leaf versioned documents;
- Basic Leaf heading Outline;
- Narrative Canvas with multi-scene composition, templates, and visual worlds;
- Markdown interchange;
- lossless single-document portable package;
- Task/Life navigation relationships;
- Unified Tags;
- search navigation.

Expected open areas:

- explicit links and backlinks;
- generic Outline semantics beyond Basic Leaf headings;
- Noteboard;
- Graph;
- whole-tree/multi-document interchange.

### 3.3 Cross-pillar substrate

Expected implemented capabilities:

- local SQLite authority through Rust repositories/services;
- typed Tauri IPC;
- FTS5 global retrieval over Tasks, Life nodes, and documents;
- Vietnamese normalization;
- tag aliases and tag-aware retrieval;
- local assets, backup/restore, release hardening, native E2E.

Task 34 must distinguish substrate readiness from feature approval.

## 4. Candidate contract

The execution agent must evaluate exactly one canonical row for each candidate below. A candidate may be decomposed into a prerequisite and product slice, but both must remain traceable to the original row.

### C1 — Actual-Time Tracking Core

Minimum question:

> Can Lifeweave add a local, explicit, interruption-safe record of actual work duration without converting the application into surveillance, background monitoring, or an always-running timer product?

Minimum slice to evaluate:

- explicit user start/pause/resume/stop;
- one active timer maximum;
- association with a one-off Task or concrete recurring occurrence;
- durable crash/restart semantics;
- manual correction with auditability;
- no automatic activity capture;
- no reminder/notification dependency;
- analytics integration boundary defined but not necessarily implemented.

Required exclusions:

- OS activity monitoring;
- idle detection unless separately approved;
- screenshots, app/window tracking, telemetry;
- team timesheets or billing;
- prediction.

### C2 — Deadline Semantics + Deadline-Aware Planning

Minimum question:

> Can deadline authority be added distinctly from scheduled execution time without ambiguous recurrence, overdue, archive, timezone, or evaluation behavior?

Minimum slice to evaluate:

- optional deadline date/time separate from scheduled start/end;
- one-off and recurring-series ownership rules;
- occurrence override behavior;
- deadline-aware Today/Upcoming/Overdue projection;
- explicit late/at-risk states based only on deterministic time;
- no notifications required;
- migration, export, backup, and search semantics.

Required exclusions:

- predictive risk scoring;
- automatic rescheduling;
- calendar sync;
- reminders.

### C3 — Saved Filters / Saved Views

Minimum question:

> Can users persist deterministic Task/Life/Search views through a versioned typed filter AST without exposing an unstable query language or duplicating core navigation?

Minimum slice to evaluate:

- versioned filter AST;
- explicit supported predicates;
- deterministic ordering;
- saved view CRUD/archive;
- bounded Task-first initial UI;
- safe invalid/unknown predicate behavior;
- backup/export semantics;
- no arbitrary SQL or executable expressions.

Required exclusions:

- public query language;
- cloud sharing;
- dashboards;
- Graph;
- score/prediction predicates.

### C4 — Explicit Links + Backlinks Core

Minimum question:

> Are tags, search, documents, and Task/Life relations now sufficient prerequisites for a user-authored explicit link model with stable backlink retrieval?

Minimum slice to evaluate:

- canonical link authority and allowed endpoint kinds;
- explicit link creation/removal workflow;
- stable-ID links, not title parsing;
- archive/restore and deletion semantics;
- incoming/outgoing projections;
- reader and editor accessibility;
- search and portable-package boundaries;
- no implicit auto-linking.

Required exclusions:

- Graph visualization;
- semantic similarity;
- automatic inferred links;
- URL crawling;
- network previews.

### C5 — Generic Outline Beyond Basic Leaf Headings

Minimum question:

> Is there a concrete workflow for an Outline beyond the accepted Basic Leaf heading navigator that does not duplicate Life tree navigation or Narrative scene navigation?

The candidate must identify one bounded semantic authority before eligibility. Possible authorities may include a cross-document structural outline or a reusable planning outline, but Task 34 must not assume either is approved.

Required exclusions:

- merely restyling the existing heading Outline;
- duplicating Life hierarchy;
- Noteboard or Graph behavior;
- arbitrary third navigation pillar.

### C6 — Noteboard

Minimum question:

> Is there now a recurring knowledge workflow requiring spatial/card arrangement that cannot be served by Life hierarchy, Narrative Canvas, Search, Tags, Pinned, or saved views?

Minimum eligibility burden:

- concrete high-frequency workflow;
- canonical data ownership;
- keyboard-complete non-spatial alternative;
- no Task-card regression;
- scale and persistence model;
- export/backup behavior;
- clear distinction from Narrative Canvas.

### C7 — Knowledge Graph

Minimum question:

> Do explicit relationship corpora and accessible alternative navigation exist or can they be bounded sufficiently to justify Graph activation?

Minimum eligibility burden:

- approved link/tag relationship authority;
- deterministic graph projection;
- keyboard and screen-reader equivalent;
- scale budget;
- no duplication of Life tree;
- no physics-layout authority;
- no remote graph service.

Graph fails eligibility if explicit links remain unapproved.

### C8 — Objective Score

Minimum question:

> Can a score be mathematically defined, non-manipulative, explainable, reversible, and objectively validated beyond existing analytics and streaks?

Minimum eligibility burden:

- Product Owner-approved formula;
- unit and normalization semantics;
- treatment of missed, cancelled, deferred, recurring, and unevaluated work;
- no punishment for rest or low task volume;
- transparent decomposition;
- no hidden weights;
- no prediction dependency;
- no claim of wellbeing or productivity truth.

Score fails eligibility if formula authority remains open.

### C9 — Prediction / Forecasting

Minimum question:

> Is there sufficient local ground truth, calibration methodology, uncertainty communication, and safe fallback behavior to justify any forecast?

Minimum eligibility burden:

- explicit target variable;
- minimum history requirement;
- time-aware train/evaluation split;
- calibration and abstention;
- uncertainty display;
- local-only model lifecycle;
- deletion/rebuild semantics;
- no normative judgment;
- deterministic non-predictive fallback.

Prediction fails eligibility without sufficient history and measurable correctness.

### C10 — Whole-Tree + Multi-Document Interchange

Minimum question:

> Can Lifeweave export/import a bounded, lossless subtree or workspace package without becoming a second backup format or weakening identity, collision, and asset guarantees?

Minimum slice to evaluate:

- package manifest/version/checksums;
- selected subtree or explicit document set;
- Basic Leaf and Narrative canonical payloads;
- tag/link/relationship boundary behavior;
- stable assets and privacy sanitization;
- collision/remap policy;
- atomic preview/import;
- explicit distinction from full database backup.

Required exclusions:

- cloud sync;
- complete database cloning disguised as interchange;
- silent overwrite;
- unsupported third-party formats.

### C11 — No Expansion / Hardening + Evidence

Minimum question:

> Does current product risk, evidence debt, maintenance burden, accessibility debt, or performance pressure justify selecting no feature and spending Task 35 on bounded hardening?

Possible bounded outputs:

- physical accessibility evidence plan;
- alternate-DPI closure;
- peak working-set measurement;
- security/property tests;
- recovery drills;
- release reproducibility;
- performance or architecture debt with objective thresholds.

This candidate must not become an unbounded cleanup bucket.

## 5. Candidate exhaustiveness and traceability

Before scoring, create a traceability table with one row for every open or deferred source feature and every implemented prerequisite that changes eligibility.

Required columns:

```text
source heading / requirement ID
source state: LOCKED | OPEN | DEFERRED | PROTOTYPE-GATED | REMOVED
current repository evidence
accepted ADR evidence
candidate mapping
missing decision
eligibility impact
```

The execution agent must explicitly account for:

- reminders/notifications/sound;
- actual-time semantics;
- deadlines;
- saved filters/views;
- Backlinks;
- Generic Outline;
- Noteboard;
- Graph;
- Score;
- Prediction;
- interchange expansion.

A source item may be excluded from the candidate set only with a written reason such as prerequisite dependency, Product Owner decision required before analysis, duplication, or out-of-scope platform expansion.

## 6. Hard filters

Every candidate is evaluated against all 16 filters. One `FAIL` makes the candidate ineligible for direct product activation. `CONDITIONAL` requires a prerequisite or Product Owner decision and cannot be scored as immediately activatable.

| ID | Filter | Required question |
|---|---|---|
| F1 | Source authority | Is the slice compatible with immutable source states and accepted ADRs? |
| F2 | Pillar integrity | Does it preserve Task-first and Life-system boundaries without creating an accidental third pillar? |
| F3 | Concrete workflow | Is there a recurring user workflow not already served by current capabilities? |
| F4 | Non-duplication | Is the candidate materially distinct from Search, Tags, Life hierarchy, Pinned, Canvas, Outline, analytics, and interchange already present? |
| F5 | Canonical authority | Is there one clear source of truth and mutation owner? |
| F6 | Migration/reversibility | Can schema evolution, rollback, archive/restore, and failure recovery be defined safely? |
| F7 | Local-first/privacy | Can it operate fully offline without telemetry, account, server, or remote assets? |
| F8 | Security | Does it avoid arbitrary execution, unsafe parsing, hidden capture, and authority bypass? |
| F9 | Accessibility | Is a complete keyboard, screen-reader, reduced-motion, forced-colors, and non-visual workflow plausible? |
| F10 | Performance/scale | Can realistic fixture budgets and complexity bounds be stated before implementation? |
| F11 | Interoperability | Are backup, export, import, asset, and version behavior definable? |
| F12 | Prerequisites | Are all mandatory substrates implemented and accepted? |
| F13 | Boundedness | Does one meaningful Task 35 vertical slice exist? |
| F14 | Maintenance | Is long-term complexity proportionate to demonstrated value? |
| F15 | Objective evidence | Can correctness and acceptance be tested locally without subjective claims? |
| F16 | Trust/ethics | Does the feature avoid manipulative scoring, opaque inference, surveillance, or misleading certainty? |

Allowed cell values:

- `PASS` — evidence supports immediate eligibility;
- `CONDITIONAL` — potentially valuable but blocked by a named prerequisite or Product Owner decision;
- `FAIL` — violates a decisive requirement;
- `NOT_APPLICABLE` — only where the filter truly does not apply, with justification.

## 7. Weighted decision model

Only candidates with `PASS` on all 16 filters enter the immediate-activation ranking. Conditional candidates may be ranked separately as prerequisite candidates but must never compete as if already eligible.

### 7.1 Criteria and locked weights

| ID | Criterion | Weight |
|---|---|---:|
| C1 | Immediate user value | 14 |
| C2 | Workflow frequency | 10 |
| C3 | Product differentiation | 8 |
| C4 | Prerequisite readiness | 9 |
| C5 | Data safety and reversibility | 10 |
| C6 | Accessibility feasibility | 8 |
| C7 | Implementation boundedness | 8 |
| C8 | Evidence/testability | 7 |
| C9 | Maintenance burden, where 10 means low burden | 7 |
| C10 | Performance feasibility | 5 |
| C11 | Local-first/privacy fit | 4 |
| C12 | Interoperability/recovery clarity | 4 |
| C13 | Cross-pillar leverage | 4 |
| C14 | Trust and non-manipulation | 2 |
| | **Total** | **100** |

Weights are frozen before candidate scoring. Any Product Owner modification requires a recorded model version and full rerun.

### 7.2 Scoring anchors

Every criterion uses integer or half-point scores from 0 to 10.

- `0` — directly contradicted, impossible, or unacceptable;
- `2` — severe unresolved gaps;
- `4` — weak value/readiness with major uncertainty;
- `5` — neutral or mixed evidence;
- `6` — credible but bounded benefit;
- `8` — strong evidence/readiness;
- `10` — exceptional fit with direct repository evidence and minimal uncertainty.

Every score requires:

- a concise rationale;
- at least one source/repository/ADR evidence reference;
- an uncertainty value `sigma`;
- no fabricated precision.

### 7.3 Uncertainty

Each candidate receives:

- criterion-level confidence: high/medium/low;
- aggregate epistemic `sigma` in `[0.35, 1.40]`;
- named uncertainty drivers;
- conditions that would materially change the score.

Simulation is sensitivity analysis over disclosed assumptions, not empirical validation.

## 8. Sensitivity analysis

Create a deterministic analysis script under the slice directory.

Required properties:

- fixed master seed recorded in source and report;
- at least 1,000,000 samples per profile;
- at least six profiles;
- convergence checkpoints at 100k, 500k, and final sample count;
- Dirichlet or equivalent positive normalized weight perturbation;
- bounded score perturbation using disclosed candidate uncertainty;
- eligibility mask applied before ranking;
- deterministic `--check` mode with locked expected summary after acceptance;
- no network access;
- generated tabular JSON/CSV optional, canonical conclusions in Markdown.

Required profiles:

1. Base — locked weights;
2. Utility-first — user value and frequency emphasis;
3. Safety/recovery-first — data safety and reversibility emphasis;
4. Accessibility/maintenance-first;
5. Product-identity-first;
6. Minimal-complexity/local-first.

Required outputs:

- weighted base score;
- top-1 and top-3 probability;
- mean rank;
- pairwise win probabilities;
- profile-specific winner;
- convergence drift;
- result with and without No Expansion candidate;
- result with conditional prerequisite candidates in a separate ranking;
- sensitivity to plausible weight/model perturbations;
- recommendation stability classification.

Stability classes:

- `ROBUST` — same eligible winner in at least 80% aggregate samples and no profile below 55%;
- `MODERATE` — same eligible winner in at least 60% aggregate samples;
- `UNSTABLE` — below 60%, requiring Product Owner trade-off rather than automatic recommendation;
- `NO_ELIGIBLE_PRODUCT` — recommend prerequisite, hardening, or no expansion.

## 9. Decision rules

Apply rules in order:

1. Source or accepted ADR contradiction eliminates activation.
2. Any hard-filter `FAIL` eliminates direct product activation.
3. A conditional candidate may only produce `ACTIVATE_PREREQUISITE`, never `ACTIVATE_PRODUCT`.
4. A candidate without a bounded Task 35 minimum is ineligible.
5. A score lead below `0.30/10` is not decisive.
6. A recommendation marked `UNSTABLE` must present the top trade-off set to the Product Owner.
7. Score or prediction cannot activate without approved measurable correctness authority.
8. Graph cannot activate before explicit link authority and an accessible alternative.
9. Noteboard cannot activate without a demonstrated workflow distinct from Narrative Canvas and Life organization.
10. Hardening wins whenever no product candidate passes all hard filters or release/accessibility debt is P0/P1.
11. No Expansion remains a valid outcome.

## 10. Task 35 activation packet

For the recommended candidate, produce a bounded activation packet containing:

- exact title;
- user problem;
- minimum vertical slice;
- explicit exclusions;
- canonical authority and ownership;
- proposed schema effect: none or migration count estimate;
- IPC surface estimate;
- frontend destinations/components affected;
- accessibility contract;
- performance budgets;
- backup/export/recovery behavior;
- security/privacy boundaries;
- test pyramid;
- native E2E contract;
- release gates;
- kill criteria;
- estimated implementation risk;
- prerequisite and follow-on map.

This packet is a recommendation only. Task 35 remains prohibited until Product Owner approval and an active specification is separately established.

## 11. Documentation outputs

Task 34 execution must create or update:

```text
specs/024-post-unified-tags-expansion-decision/README.md
specs/024-post-unified-tags-expansion-decision/spec.md
specs/024-post-unified-tags-expansion-decision/plan.md
specs/024-post-unified-tags-expansion-decision/tasks.md
specs/024-post-unified-tags-expansion-decision/acceptance.md
specs/024-post-unified-tags-expansion-decision/risk-register.md
specs/024-post-unified-tags-expansion-decision/analysis.py
specs/024-post-unified-tags-expansion-decision/candidate-evidence.md
specs/024-post-unified-tags-expansion-decision/results.md
docs/audits/task-34-post-unified-tags-expansion-decision.md
docs/adr/<next>-post-unified-tags-expansion-decision.md
docs/ROADMAP.md
docs/STATUS.md
docs/PROJECT_STATE.json
docs/AI_PROJECT_HANDOFF.md
START_HERE.md
```

The final accepted decision may update `recommended_next_candidate`, but must leave `active_spec` null and `next_action=product_owner_gate` until the Product Owner approves Task 35.

## 12. Prohibited changes

Task 34 must not modify:

```text
frontend/**
src-tauri/**
e2e-tests/**
package.json
frontend/package.json
pnpm-lock.yaml
Cargo.toml
Cargo.lock
capabilities/**
.github/workflows/**
docs/source-of-truth/**
```

An analysis helper may use existing declared development dependencies or Python standard library only. No dependency change is authorized.

## 13. Completion state

Task 34 completes only when:

- the candidate set is exhaustive and traceable;
- the hard-filter matrix is fully justified;
- scores and uncertainty are disclosed;
- deterministic analysis passes;
- exactly one next-action recommendation or an explicit no-activation result exists;
- Task 35 activation packet is bounded;
- all governance checks pass;
- Product Owner gate is recorded;
- no product code changed.

Task 34 completion is not Task 35 approval.