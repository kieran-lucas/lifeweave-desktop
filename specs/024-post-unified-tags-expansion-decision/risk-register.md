# Task 34 Risk Register

## Rating model

- Probability: Low / Medium / High.
- Impact: P0 / P1 / P2 / P3.
- Status: Open / Mitigated / Accepted / Closed.
- Owner: Analysis agent unless Product Owner is named.

## R-01 — Silent Task 35 activation

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

A recommendation may be mistaken for implementation authorization, especially if Project State is updated incorrectly.

Mitigation:

- keep `active_spec=null` at Task 34 closure;
- keep `next_action=product_owner_gate`;
- keep `forbidden_feature_jump=true`;
- never create a Task 35 specification directory in this task;
- state Task 35 prohibition in README, spec, audit, handoff, STATUS, and ADR.

Kill gate:

Any product-code change or Task 35 activation stops the task.

## R-02 — Candidate omission

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

The candidate set may omit reminders/notifications, relationship expansion, platform features, or another source OPEN item.

Mitigation:

- full source heading extraction;
- Task 17/23 delta review;
- exclusion log with rationale;
- PO gate before candidate freeze;
- version and hash the frozen candidate set.

## R-03 — Candidate duplication

- Probability: Medium
- Impact: P1
- Status: Open

Risk examples:

- Generic Outline duplicates heading Outline or Life tree;
- Noteboard duplicates Narrative Canvas;
- Graph duplicates Life hierarchy;
- deadline duplicates schedule;
- saved views duplicate static destinations.

Mitigation:

Every evidence card must include a “distinct authority and workflow” section. Failure to show distinction results in CONDITIONAL or FAIL.

## R-04 — Historical-score anchoring

- Probability: High
- Impact: P1
- Status: Open

Risk:

Task 17 or Task 23 scores may bias current evaluation even though prerequisites changed.

Mitigation:

- reuse only criteria/lessons, not candidate scores;
- assign current scores from current evidence;
- preserve an independent challenge pass;
- record score deltas only after final scores freeze.

## R-05 — Large simulation count used as false authority

- Probability: High
- Impact: P1
- Status: Open

Risk:

Millions of samples may create a misleading impression of empirical truth.

Mitigation:

- label analysis as sensitivity over subjective assumptions;
- disclose weights, scores, sigma, seed, profiles, and eligibility;
- include reversal analysis;
- do not describe output as user research or proof;
- cap claims to model stability.

## R-06 — Ineligible candidate wins scoring

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

A high subjective score may override a missing prerequisite.

Mitigation:

- frozen hard-filter mask;
- direct activation scoring includes only all-PASS candidates;
- prerequisite ranking separate;
- tests/assertions in analysis script.

## R-07 — Scoring after seeing output

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Scores or weights are tuned to create a preferred winner.

Mitigation:

- model version freeze before final simulation;
- deterministic serialization/hash;
- any change increments version and requires a complete rerun;
- preserve pre/post challenge score trail.

## R-08 — Unsupported empirical claims

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

The analysis may claim workflow frequency, user value, or emotional benefit without user research.

Mitigation:

- classify claims as repository evidence, source requirement, inference, or external evidence;
- use uncertainty penalties;
- explicitly state absence of product-specific user studies.

## R-09 — Wrong authority from superseded documents

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Old failed/preliminary audits may be treated as accepted authority.

Mitigation:

- document inventory includes current/superseded status;
- accepted ADR and latest remediation take precedence;
- contradictions resolved explicitly.

## R-10 — Actual-time surveillance creep

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Actual-time tracking expands into process monitoring, telemetry, idle detection, or background surveillance.

Mitigation:

- user-explicit timer only;
- no activity capture, screenshots, process inspection, telemetry, or cloud;
- local manual correction and deletion;
- candidate fails if hidden monitoring is required.

## R-11 — Deadline/schedule semantic collapse

- Probability: High
- Impact: P1
- Status: Open

Risk:

Deadline is modeled as another scheduled time, causing overdue and recurrence errors.

Mitigation:

- separate domain definitions;
- explicit recurrence ownership matrix;
- date-only/timezone decisions;
- migration defaults null;
- candidate cannot PASS with unresolved semantics.

## R-12 — Saved-view query injection or unbounded AST

- Probability: Medium
- Impact: P0
- Status: Open

Risk:

Saved filters become arbitrary SQL or a complex expression language.

Mitigation:

- versioned bounded predicate AST;
- whitelist fields/operators;
- no raw SQL or executable expressions;
- maximum nesting/term count;
- unsupported future predicate behavior defined.

## R-13 — Link authority ambiguity

- Probability: High
- Impact: P1
- Status: Open

Risk:

Backlinks are implemented before an explicit stable-ID link creation model exists.

Mitigation:

- explicit relation rows only;
- endpoint kinds/cardinality/direction fixed;
- no canonical title parsing;
- link candidate remains ineligible without authoring workflow and archive semantics.

## R-14 — Graph prerequisite smuggling

- Probability: High
- Impact: P1
- Status: Open

Risk:

Graph implementation silently introduces links, layout persistence, or new relation authority.

Mitigation:

- Graph treated as projection only unless separately approved;
- explicit links prerequisite;
- no automatic link inference;
- Graph cannot PASS while relationship authority is absent.

## R-15 — Noteboard violates Task-row principle

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

A board introduces Task cards or competes with Today’s task-first workflow.

Mitigation:

- prohibit replacement of Task rows;
- distinguish knowledge spatialization from task management;
- require non-spatial accessible equivalent;
- fail candidate if core value depends on Task cards.

## R-16 — Score harms trust or incentivizes gaming

- Probability: High
- Impact: P1
- Status: Open

Risk:

An opaque productivity score penalizes rest, encourages task fragmentation, or misrepresents quality.

Mitigation:

- formula must be PO-approved and explainable;
- no score while formula OPEN;
- test boundary cases and gaming attacks;
- opt-out and neutral wording required in any future design.

## R-17 — Prediction without ground truth

- Probability: High
- Impact: P1
- Status: Open

Risk:

Prediction is marketed without sufficient history, calibration, or measurable target.

Mitigation:

- minimum history threshold;
- held-out evaluation;
- calibration and abstention;
- local deletion/rebuild;
- automatic FAIL when ground truth is unavailable.

## R-18 — Interchange package becomes unsafe import

- Probability: Medium
- Impact: P0
- Status: Open

Risk:

Whole-tree import enables path traversal, package bombs, partial corruption, ID collision, or semantic loss.

Mitigation:

- manifest and checksums;
- strict size/count limits;
- sanitized paths;
- preview and empty-target/merge policy;
- transactional import and cleanup;
- unsupported-version rejection;
- fuzz/adversarial fixtures in future activation packet.

## R-19 — Accessibility deferred as implementation detail

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Visual candidates receive PASS while keyboard/screen-reader equivalents are undefined.

Mitigation:

- accessibility is a hard filter;
- every minimum slice includes complete semantic interaction model;
- Graph/Noteboard require non-visual alternatives;
- physical verification may remain P2 only after automated semantics are complete.

## R-20 — Performance estimates without scale model

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Candidates pass based on intuition rather than realistic local corpus behavior.

Mitigation:

- candidate-specific fixture scale;
- latency/memory/bundle budgets in activation packet;
- fail or condition candidates with missing scale evidence;
- avoid adding dependencies during decision task.

## R-21 — Hardening becomes unlimited cleanup

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

The no-expansion option absorbs unbounded technical debt and blocks product progress indefinitely.

Mitigation:

- bounded debt inventory;
- severity/user-impact ranking;
- one-task closure definition;
- explicit exclusions;
- hardening competes under the same model.

## R-22 — Governance checker breakage

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Project State, STATUS ordering, Roadmap slice marker, or START_HERE markers become inconsistent.

Mitigation:

- activation and closure states defined in spec;
- run Project State unit tests after each authority update;
- exact full SHA checkpoints;
- closure commit only after all governance gates pass.

## R-23 — Product code accidentally changed

- Probability: Low
- Impact: P1
- Status: Open

Risk:

Formatting, generated artifacts, analysis tooling, or unrelated edits touch production paths.

Mitigation:

- allowed path whitelist;
- no package installs;
- diff name check before each commit;
- hard stop on any production change;
- separate authorized task for required tooling changes.

## R-24 — Git history or branch drift

- Probability: Low
- Impact: P1
- Status: Open

Risk:

Analysis runs from stale HEAD, parallel commits land, or destructive Git operation loses work.

Mitigation:

- fetch and equality gate at start;
- additive commits;
- no amend/rebase/reset/stash/force push;
- fetch and synchronize before closure;
- stop if origin moves unexpectedly.

## R-25 — Analysis script adds dependency

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Simulation adds NumPy or another package to the product/project dependency surface.

Mitigation:

- standard library first;
- existing environment-only tooling allowed only without lockfile/package change;
- no package manifest or lockfile modification;
- document runtime feasibility.

## R-26 — Unstable winner hidden by aggregate result

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Aggregate top-1 masks strong profile disagreement.

Mitigation:

- publish every profile;
- apply stability classification;
- pairwise and reversal analysis;
- UNSTABLE result returns to PO rather than automatic activation.

## R-27 — Prerequisite and product recommendation conflated

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

A candidate with high value but missing prerequisite is incorrectly activated wholesale.

Mitigation:

- separate recommendation types;
- prerequisite-only ranking;
- activation packet for prerequisite, not downstream feature;
- re-evaluation required after prerequisite completion.

## R-28 — Release evidence overstated

- Probability: Low
- Impact: P1
- Status: Open

Risk:

Task 33 tests/build/E2E are described as newly run during Task 34 when merely reused.

Mitigation:

- label reused evidence explicitly;
- rerun governance and analysis gates;
- rerun product gates only if a build input changes;
- no null/not_run claims disguised as pass.

## R-29 — Planning package becomes implementation spec prematurely

- Probability: Medium
- Impact: P1
- Status: Open

Risk:

Detailed candidate slices are mistaken for approved Task 35 implementation requirements before the winner is accepted.

Mitigation:

- candidate evidence cards are comparative proposals;
- only final activation packet is recommended;
- Task 35 remains unselected until PO approval;
- no Task 35 directory created.

## R-30 — Experimental branch merged without review

- Probability: Low
- Impact: P1
- Status: Open

Risk:

The planning experiment branch is merged directly into `main` despite being an exploratory draft.

Mitigation:

- branch labeled experiment;
- main remains unchanged;
- require explicit PO review and a clean activation commit before any merge/cherry-pick;
- do not move `main` ref from this experiment.