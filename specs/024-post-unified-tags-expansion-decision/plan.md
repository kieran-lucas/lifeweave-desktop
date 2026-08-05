# Task 34 Execution Plan

## Objective

Execute a reproducible post-Task-33 portfolio decision that selects the safest and highest-value bounded Task 35 action without modifying product behavior.

The execution is evidence-first. Candidate scoring begins only after current-state reconstruction, source traceability, prerequisite analysis, and hard-filter classification are complete.

## Operating principles

1. **Repository authority before memory.** Reconstruct from current files and code, not previous summaries alone.
2. **Source state is binding.** `LOCKED`, `OPEN`, `DEFERRED`, `PROTOTYPE-GATED`, and `REMOVED` remain distinct.
3. **Implemented substrate is not approval.** SQLite tables, search, tags, relationships, or UI primitives do not automatically activate dependent features.
4. **No result-driven model edits.** Candidate set, filters, criteria, weights, profiles, and uncertainty rules freeze before scoring.
5. **No large-sample theatre.** Simulation tests recommendation stability under assumptions; it does not manufacture user evidence.
6. **Conditional means conditional.** A blocked product candidate cannot win the immediate-product ranking.
7. **No feature work.** Task 34 changes governance, analysis, specifications, and evidence only.
8. **One recommendation, explicit uncertainty.** Final output must not hide close or unstable trade-offs.

## Phase 0 — Git and authority gate

### Actions

- fetch `origin`;
- confirm branch `main` for execution;
- capture exact 40-character `HEAD` and `origin/main`;
- require clean tracked tree;
- record current `docs/PROJECT_STATE.json`;
- verify immutable source hash;
- verify schema maximum from migrations;
- run Project State tests and baseline governance gates.

### Commands

```powershell
$Git = 'C:\Program Files\Git\cmd\git.exe'
& $Git fetch origin
& $Git branch --show-current
& $Git rev-parse HEAD
& $Git rev-parse origin/main
& $Git status --short
python -m unittest scripts.tests.test_check_project_state
pnpm source:verify
pnpm governance:check
pnpm index:check
pnpm verify
```

### Stop conditions

- branch is not `main`;
- dirty tree;
- local and remote SHA differ;
- source hash drift;
- schema differs from Project State;
- governance fails for reasons unrelated to Task 34 planning.

### Output

A baseline block in `candidate-evidence.md` with exact commands, versions, SHAs, schema, test counts, bundle sizes, and release state.

## Phase 1 — Current-state reconstruction

### 1.1 Read authority documents

Mandatory reads:

```text
START_HERE.md
docs/PROJECT_STATE.json
docs/STATUS.md
docs/ROADMAP.md
docs/AI_PROJECT_HANDOFF.md
docs/CONSTITUTION.md
CLAUDE.md
docs/source-of-truth/SOURCE_MANIFEST.json
docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md
```

Mandatory decision/audit reads:

```text
docs/audits/task-17-expansion-decision.md
specs/007-expansion-decision/**
docs/audits/task-23-post-narrative-expansion.md
docs/audits/task-23-acceptance-remediation.md
specs/013-post-narrative-expansion-decision/**
docs/audits/task-25-core-evidence-release-readiness.md
docs/audits/task-29-task-life-relationships.md
docs/audits/task-31-lossless-portable-package.md
docs/audits/task-32-remediation-002.md
docs/audits/task-33-remediation-003.md
docs/audits/task-33-release-candidate.json
```

The execution agent must locate actual filenames where names differ.

### 1.2 Inspect implemented product boundaries

Task pillar inspection:

- task schema and migrations;
- recurrence source and occurrence projection;
- scheduled-time semantics;
- evaluation authority;
- Today/Upcoming/Overdue projections;
- category goals and analytics;
- Life relationship fields;
- tag fields and limits;
- search projection;
- archive/restore behavior.

Life pillar inspection:

- node schema and hierarchy invariants;
- Basic Leaf and Narrative document authority;
- heading Outline;
- scene/template/world behavior;
- Pinned and Reader projections;
- local assets;
- portable package boundaries;
- tag and Task relationship behavior;
- search retrieval and navigation.

Cross-cutting inspection:

- backup/restore;
- security verifier;
- performance budgets;
- native E2E runner;
- release/RC evidence;
- capability and dependency inventory;
- accessibility test patterns.

### 1.3 Build capability inventory

Create a table with columns:

```text
capability
status: implemented | partial | absent | prohibited
canonical authority
schema/migration
IPC surface
frontend surface
tests/E2E
accepted audit/ADR
known debt
candidate prerequisites enabled
```

No candidate analysis starts until this table is complete enough to resolve prerequisites.

## Phase 2 — Source and decision traceability

### 2.1 Extract open feature requirements

Search the immutable source and accepted ADRs for:

```text
actual time
elapsed time
timer
deadline
due date
reminder
notification
sound
filter
saved view
query
link
backlink
outline
noteboard
board
graph
score
prediction
forecast
export
import
interchange
whole tree
workspace package
```

Preserve source terminology. Do not silently reinterpret Vietnamese or English wording.

### 2.2 Construct traceability matrix

For every relevant source heading or requirement:

- quote or paraphrase within copyright-safe internal documentation limits;
- record exact source heading;
- record source state;
- map to one candidate or excluded item;
- identify implemented prerequisites;
- identify unresolved Product Owner decision;
- identify contradiction or duplication risk.

### 2.3 Reconcile prior decisions

For each Task 17 and Task 23 candidate:

- record old outcome;
- record decisive blocker at that time;
- record changes since that decision;
- determine whether blocker is closed, partially closed, or unchanged;
- prohibit carrying old scores forward without rescoring.

Expected examples:

- Backlinks previously failed for missing link model and corpus; Tags and Task/Life relationships now exist, but explicit links may still be absent.
- Graph previously failed for missing tags/links and accessibility; Tags now exist, links may not.
- Score previously failed for open formula and absent actual-time semantics; these may remain open.
- Prediction previously failed for insufficient history/calibration; repository age and data availability must be verified, not assumed.
- Noteboard previously failed for workflow duplication; Narrative Canvas, Pinned, Search, and Tags may make duplication stronger rather than weaker.

## Phase 3 — Candidate normalization

### 3.1 Validate candidate exhaustiveness

Start with C1–C11 from `spec.md`.

For each source item not represented, choose one:

- add candidate;
- merge into existing candidate;
- mark as prerequisite decision;
- mark as excluded platform expansion;
- mark as reminder/notification follow-on to a more foundational candidate;
- mark as already implemented;
- mark as removed/prohibited.

Any candidate-set change requires:

- written rationale;
- before/after mapping;
- Product Owner approval before scoring;
- model version increment.

### 3.2 Write minimum vertical slice cards

Each candidate card must include:

```text
canonical name
user problem
primary workflow
frequency hypothesis
minimum product slice
minimum prerequisite slice
explicit exclusions
canonical authority
persistence estimate
migration estimate
IPC estimate
frontend surfaces
accessibility model
performance complexity
backup/export behavior
security/privacy boundary
testability
kill criteria
open Product Owner decisions
```

### 3.3 Build prerequisite DAG

Nodes include candidates and already-implemented substrates.

Required edges to test:

- Graph → Explicit Links/Backlinks;
- Prediction → measurable target + sufficient history + calibration;
- Score → approved formula and possibly actual-time semantics;
- deadline-aware planning → deadline authority;
- saved filters → typed predicate inventory and stable projections;
- whole-tree interchange → stable identity/remap semantics across document/tag/link/relationship domains.

Detect cycles and hidden prerequisites.

## Phase 4 — Evidence collection by candidate

Create one evidence packet per candidate with the following sections.

### 4.1 User-value evidence

- source requirement;
- workflow frequency hypothesis;
- current workaround;
- duplication with existing features;
- whether value is direct or prerequisite-only;
- uncertainty and missing empirical evidence.

### 4.2 Domain and data model

- proposed canonical entities/value objects;
- ownership and cardinality;
- invariants;
- archive/restore;
- concurrency/revision semantics;
- migration and rollback;
- backup/interchange;
- data-loss modes.

No implementation design is accepted if authority is split across UI and Rust or stored derivations can drift from canonical rows.

### 4.3 UX and accessibility

- entry point;
- primary happy path;
- empty/loading/error/stale/conflict states;
- keyboard path;
- screen-reader structure;
- focus restoration;
- reduced motion;
- forced colors/high contrast;
- alternate DPI/responsive behavior;
- non-visual equivalent for spatial interfaces.

### 4.4 Performance and scale

For each candidate define realistic fixtures and complexity targets.

Examples:

- timers: restart recovery and one-active invariant under long history;
- deadlines: recurring projection over bounded date windows;
- saved views: AST evaluation over realistic Task/Life/Search result sets;
- backlinks: incoming/outgoing batch retrieval without N+1;
- Graph: nodes/edges, layout cost, interaction latency, memory;
- interchange: package size, asset count, atomic import duration;
- prediction: training and inference bounds on local hardware.

### 4.5 Security, privacy, and trust

Explicitly test:

- remote/network needs;
- telemetry;
- arbitrary expression execution;
- path traversal and archive bombs;
- hidden activity capture;
- deceptive certainty;
- manipulative scoring;
- sensitive content leakage;
- unsafe HTML/Markdown/JSON parsing.

### 4.6 Test and release evidence

For every minimum slice propose:

- Rust unit/property tests;
- repository/service tests;
- migration tests;
- frontend unit/integration tests;
- accessibility tests;
- native E2E phases;
- restart persistence;
- backup/restore or package round-trip;
- release build/RC evidence;
- performance thresholds.

## Phase 5 — Hard-filter matrix

### Process

1. Freeze candidate cards.
2. Evaluate F1–F16 independently.
3. Write evidence note for every `CONDITIONAL`, `FAIL`, and `NOT_APPLICABLE` cell.
4. Apply direct-activation eligibility mask.
5. Review for inconsistent standards across candidates.
6. Run an adversarial pass attempting to disprove each `PASS` candidate.

### Quality checks

- no candidate passes with an undefined canonical authority;
- no spatial feature passes without a non-spatial equivalent;
- no score/prediction passes with subjective correctness;
- no interchange feature passes without collision and atomicity semantics;
- no feature passes solely because components or tables already exist;
- Hardening remains eligible and bounded.

## Phase 6 — Weighted scoring

### 6.1 Freeze model

Before scoring, commit:

- candidate set version;
- criteria and weights;
- scoring anchors;
- uncertainty bounds;
- simulation profiles;
- eligibility mask rules;
- decision thresholds.

### 6.2 Score independently

Recommended workflow:

- first scorer creates evidence-backed scores;
- second review pass challenges each score without seeing simulation winner where practical;
- disagreements ≥1.5 points on any criterion require written reconciliation;
- round only after weighted calculation.

### 6.3 Separate rankings

Produce:

1. immediately eligible product candidates;
2. prerequisite candidates;
3. hardening/no-expansion;
4. full informational ranking with ineligible candidates visibly masked.

Never present an ineligible candidate as the winner.

## Phase 7 — Deterministic sensitivity analysis

### Script architecture

`analysis.py` should contain:

- immutable candidate IDs;
- immutable criterion IDs;
- base weights;
- profile weights;
- base scores;
- sigma values;
- eligibility classes;
- master seed;
- vectorized sampling;
- convergence checkpoints;
- summary calculation;
- `--check` accepted-result assertion;
- optional `--samples` override for development only.

### Numerical safeguards

- weights remain positive and sum to 1;
- perturbed scores clipped to `[0,10]`;
- ties handled deterministically or reported;
- ineligible candidates excluded from eligible ranks;
- random generator and library version recorded;
- expected-result tolerance disclosed;
- output stable under repeated `--check`.

### Interpretation

The report must say:

- results are conditional on model assumptions;
- top-1 probability is not user demand probability;
- small lead and profile disagreement indicate Product Owner trade-off;
- hard-filter failures cannot be overridden by simulation.

## Phase 8 — Recommendation construction

### 8.1 Recommendation types

- `ACTIVATE_PRODUCT`: one candidate passes all filters and has sufficiently stable advantage;
- `ACTIVATE_PREREQUISITE`: a conditional candidate is promising, but a bounded prerequisite must come first;
- `ACTIVATE_HARDENING`: no product candidate sufficiently dominates or release debt is more urgent;
- `NO_EXPANSION`: no bounded next action is justified.

### 8.2 Recommendation narrative

Include:

- one-sentence decision;
- decisive evidence;
- runner-up and why it lost;
- sensitivity stability;
- unresolved uncertainty;
- conditions that would reverse the recommendation;
- explicit statement that Product Owner approval is required.

### 8.3 Task 35 activation packet

Write the full packet defined in `spec.md`. The packet must be implementation-ready enough for a separate Task 35 specification, but it must not silently become that specification.

## Phase 9 — Governance integration

After analysis and before final closure:

- create accepted ADR with model and recommendation;
- update roadmap with Slice 024 decision outcome;
- place Task 34 section first in STATUS;
- update audit and handoff;
- update Project State:
  - latest closed task = 34;
  - latest closed slice = 24;
  - latest feature task remains 33 unless Task 34 itself is considered a feature, which it should not be;
  - latest feature checkpoint remains Task 33 implementation checkpoint;
  - active spec = null;
  - next action = product_owner_gate;
  - recommended_next_candidate = safe snake_case candidate ID or null;
- update START_HERE markers;
- regenerate/check indexes and coverage.

Do not set Task 35 active until Product Owner approval.

## Phase 10 — Verification and closure

### Required checks

```powershell
python -m unittest scripts.tests.test_check_project_state
python specs/024-post-unified-tags-expansion-decision/analysis.py --check
pnpm source:verify
pnpm governance:check
pnpm index:check
pnpm verify
pnpm typecheck
pnpm --dir frontend exec vitest run --maxWorkers=4
cargo check --manifest-path src-tauri/Cargo.toml --locked --all-targets
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Because Task 34 modifies no product code, build/E2E/release reruns may be skipped only if repository policy allows and the audit explicitly records the reason. Governance and ordinary test suites remain mandatory to prove no accidental impact.

### Diff restrictions

Final Task 34 diff must remain within:

```text
specs/024-post-unified-tags-expansion-decision/**
docs/**
START_HERE.md
```

No source-of-truth mutation.

### Closure output

```text
Task 34: PASS or FAIL
Slice 024: CLOSED or OPEN
P0/P1/P2/P3
recommended action
recommended Task 35 title
recommendation stability
exact analysis seed and sample count
exact final commit SHA
schema
product-code change count = 0
next action = PRODUCT OWNER GATE
```

## Suggested commit sequence

1. `activate task 34 expansion decision` — planning docs and active-spec governance.
2. `record task 34 baseline evidence` — current-state and traceability inventory.
3. `freeze task 34 decision model` — candidate cards, filters, weights, uncertainty, analysis script skeleton.
4. `complete task 34 portfolio analysis` — evidence, matrix, scores, simulation results, recommendation packet.
5. `record task 34 decision evidence` — ADR, audit, roadmap/status/handoff/Project State closure.

No commit may mix Task 35 product implementation.