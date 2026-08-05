# Task 34 Candidate Evidence and Decision Record

## Evidence status

This is a repository and market-analogy assessment, not an empirical user study. Large simulation counts measure sensitivity to disclosed assumptions; they do not create user demand.

Execution baseline: `09b1284f7e17a6e64feeb2bfe8ff6998e7a80bfd`. Latest accepted product checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`. Schema remains 19.

## Current capability inventory

Task implements exact scheduled time, recurrence/overrides, Today/Upcoming/Overdue, evaluation/analytics, Task/Life relationships, Tags and Search. It does not implement actual elapsed time, an independent deadline, saved views, links, score, or prediction.

Life implements Browse/Edit/Pinned, Basic Leaf + heading Outline, Narrative Canvas/scenes/templates/worlds, stable assets, Search, Tags, Task relationships and single-document Portable Package. It does not implement generic links, Generic Outline authority, Noteboard, Graph, or subtree/workspace interchange.

Current known debt is P2 physical screen-reader and alternate-DPI validation; no known P0/P1 debt exists.

## Authority traceability

- actual-time semantics: OPEN;
- deadline semantics beyond schedule: OPEN;
- saved filter AST/view UI: OPEN;
- backlinks: OPEN;
- Generic Outline role: OPEN;
- Noteboard role: OPEN;
- Graph: OPEN and DEFERRED;
- Score: OPEN/prototype-gated;
- Prediction: OPEN/DEFERRED;
- whole-tree or multi-document interchange: OPEN;
- reminders/notifications/sound: REMOVED and excluded.

## External workflow analogies

Official current documentation demonstrates coherent patterns: Todoist separates planned dates from fixed deadlines; Notion database views own independent filter/sort/group state; Sunsama and TickTick provide explicit task timers/manual actual time; Obsidian separates explicit links/backlinks/outgoing links; Anytype treats whole-space export/import as portability. These analogies do not prove Lifeweave demand.

## Hard-filter dispositions

### PASS

- Actual-Time Tracking: explicit user-started sessions, one active timer, persisted segments, no surveillance.
- Deadline: date-only authority separate from schedule; one-off Tasks only in v1; no reminders.
- Saved Views: versioned typed predicate AST; Task scope first; no SQL/execution.
- Explicit Links + Backlinks: user-created directed stable-ID Life document/node links; no implicit title parsing or Graph.
- Whole-tree Interchange: preview-first checksummed subtree/document-set package; not backup.
- Hardening: bounded physical accessibility/DPI/performance/recovery evidence; no unbounded cleanup.

### CONDITIONAL

- Generic Outline: no Product Owner-selected authority beyond heading Outline, Life tree, and scene tabs.

### FAIL

- Noteboard: card-board third authority, duplication, no demonstrated workflow.
- Graph: missing explicit link corpus and complete non-visual equivalent.
- Score: formula/correctness/anti-gaming/trust authority absent.
- Prediction: target/ground-truth/calibration/abstention authority absent.

## Complete 11 × 16 matrix

Legend: P PASS, C CONDITIONAL, F FAIL.

| Candidate | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 | F10 | F11 | F12 | F13 | F14 | F15 | F16 | Outcome |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Actual-Time Tracking Core | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | PASS |
| Deadline Semantics + Deadline-Aware Planning | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | PASS |
| Saved Filters / Saved Views | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | PASS |
| Explicit Links + Backlinks Core | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | PASS |
| Generic Outline Beyond Basic Leaf Headings | P | P | C | C | C | P | P | P | P | P | P | C | C | P | C | P | CONDITIONAL |
| Noteboard | P | F | F | F | C | C | P | P | C | C | C | F | C | C | C | P | FAIL |
| Knowledge Graph | P | P | C | C | C | C | P | P | F | C | C | F | C | C | C | P | FAIL |
| Objective Score | P | P | C | C | F | C | P | P | P | P | P | F | C | C | F | F | FAIL |
| Prediction / Forecasting | P | P | C | P | F | C | P | C | P | C | P | F | C | C | F | F | FAIL |
| Whole-Tree + Multi-Document Interchange | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | PASS |
| No Expansion / Hardening + Evidence | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | PASS |

## Frozen base scores

| Candidate | Outcome | Score |
|---|---|---:|
| Deadline | PASS | 8.420 |
| Saved Views | PASS | 8.095 |
| Hardening | PASS | 8.055 |
| Whole-tree Interchange | PASS | 7.610 |
| Links/Backlinks | PASS | 7.550 |
| Actual Time | PASS | 7.405 |
| Generic Outline | CONDITIONAL | 6.360 |
| Noteboard | FAIL | 5.195 |
| Score | FAIL | 5.020 |
| Graph | FAIL | 4.875 |
| Prediction | FAIL | 4.260 |

## Sensitivity results

Model `task34-v1.0`, seed 20260805, one million samples for each of six canonical and three stress profiles. Max convergence drift is 0.1340%.

Canonical Deadline top-1 is 59.281833%; Hardening is 29.340000%; Saved Views is 10.062967%. Deadline beats Hardening pairwise in 70.183750%. Portfolio stability is UNSTABLE. Excluding Hardening, Deadline top-1 is 85.674717%, minimum canonical profile top-1 is 64.5078%, and product-only stability is ROBUST.

Interpretation: the next product feature is stable, but expansion versus hardening is a Product Owner trade-off. Because no P0/P1 debt forces Hardening, the recommendation remains product expansion.

## Recommendation

```text
Recommended next action: ACTIVATE_PRODUCT
Recommended candidate: deadline_semantics
Recommended Task 35 title: Deadline Semantics + Deadline-Aware Planning Core
Recommendation stability: UNSTABLE portfolio / ROBUST product-only
Product Owner decision required: APPROVE / REJECT / MODIFY
```

## Task 35 activation packet

Minimum vertical slice:

- append-only migration;
- nullable date-only deadline on one-off Tasks;
- recurring deadlines explicitly excluded;
- task create/edit field with schedule-vs-deadline explanation;
- rescheduling never mutates deadline;
- deadline state/context in Today, Upcoming, Overdue, Search and Calendar detail;
- bounded Deadline queue inside Today workspace, not a sidebar destination;
- archive/restore, backup, search rebuild and restart persistence;
- keyboard/screen-reader/forced-colors contract;
- native E2E create → reschedule → deadline unchanged → overdue projection → complete/archive/restore → restart.

Excluded: recurring deadlines, time-of-day, reminders/notifications/sound/snooze, natural-language parsing, dependency chains, score, prediction, Saved Views, new sidebar destination, and automatic schedule movement.

Canonical authority remains Rust/SQLite. No new dependency or capability. Bundle target: main ≤ +8 KiB and total JS ≤ +24 KiB. Kill if schedule/deadline cannot remain separate, recurring scope is implied, or reminders are required for usefulness.
