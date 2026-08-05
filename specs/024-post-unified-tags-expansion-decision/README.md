# Slice 024 — Post-Unified-Tags Expansion Decision

## Proposed Task 34 title

**Post-Unified-Tags Expansion Decision + Task 35 Activation Matrix**

## Status

Planning experiment on branch `task-34-planning-experiment`.

This slice is a decision task, not a product-feature implementation. It introduces no migration, IPC command, dependency, capability, route, persistent domain object, production UI, or behavior change.

## Why Task 34 is a decision slice

Task 33 closed Unified Tags and returned the repository to a Product Owner gate with no active recommendation. The remaining opportunities have materially different prerequisites and risk profiles: actual-time tracking, deadline semantics, saved views, explicit links/backlinks, broader outline semantics, Noteboard, Graph, score, prediction, and broader interchange.

Selecting one directly would bypass the same portfolio governance used successfully by Task 17 and Task 23. Task 34 therefore evaluates the current candidate set against the post-Task-33 product baseline and recommends exactly one next action for Task 35:

- activate one bounded product slice;
- activate a prerequisite/prototype slice;
- activate a hardening/evidence slice; or
- intentionally select no expansion.

## Candidate set

1. Actual-Time Tracking Core
2. Deadline Semantics + Deadline-Aware Planning
3. Saved Filters / Saved Views
4. Explicit Links + Backlinks Core
5. Generic Outline Beyond Basic Leaf Headings
6. Noteboard
7. Knowledge Graph
8. Objective Score
9. Prediction / Forecasting
10. Whole-Tree + Multi-Document Interchange
11. No Expansion / Hardening + Evidence

The execution agent must verify that this set is exhaustive against the immutable source, accepted ADRs, current roadmap, implemented repository, and open-decision inventory. Candidates may be split, merged, renamed, or removed only with a written traceability argument and Product Owner approval.

## Outputs

- current-state implementation inventory;
- source/ADR/repository traceability matrix;
- prerequisite graph;
- candidate minimum-slice definitions;
- hard-filter matrix;
- weighted decision model;
- disclosed uncertainty model and sensitivity analysis;
- kill criteria and activation boundaries for every candidate;
- accessibility, performance, recovery, privacy, interoperability, and maintenance analysis;
- one recommended Task 35 candidate or an explicit no-activation result;
- Product Owner approval block;
- no product code.

## Files

- `spec.md` — authority, scope, candidate contract, decision methodology
- `plan.md` — phased execution strategy and evidence workflow
- `tasks.md` — atomic work breakdown with dependencies
- `acceptance.md` — objective completion and repository gates
- `risk-register.md` — analysis and activation risks

## Current authority

- Task 33: accepted
- Slice 023: closed
- implementation checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- repository release HEAD at planning start: `09b1284f7e17a6e64feeb2bfe8ff6998e7a80bfd`
- schema: 19
- active production spec on `main`: none
- next action on `main`: Product Owner gate

This planning branch does not itself authorize Task 34 execution or Task 35 implementation.