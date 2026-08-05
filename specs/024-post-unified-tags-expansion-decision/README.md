# Slice 024 — Post-Unified-Tags Expansion Decision

## Task 34

**Post-Unified-Tags Expansion Decision + Task 35 Activation Matrix**

## Status

Authorized by the Product Owner for direct execution on `main` from release HEAD `09b1284f7e17a6e64feeb2bfe8ff6998e7a80bfd`.

This slice is a decision task, not a product-feature implementation. It introduces no migration, IPC command, dependency, capability, route, persistent domain object, production UI, or behavior change.

## Purpose

Task 33 closed Unified Tags and returned the repository to a Product Owner gate with no active recommendation. Task 34 reconstructs the current product, reassesses all remaining open/deferred candidates, applies hard filters and a disclosed uncertainty model, and recommends exactly one bounded Task 35 action or an explicit no-expansion result.

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

## Required outputs

- current-state implementation inventory;
- source/ADR/repository traceability matrix;
- prerequisite graph;
- candidate minimum-slice definitions;
- 11 × 16 hard-filter matrix;
- 14-criterion weighted model;
- deterministic six-profile sensitivity analysis;
- reversal and kill criteria;
- one Task 35 activation packet;
- Product Owner approval block;
- no product code.

## Files

- `spec.md` — authority, scope, candidate contract, decision methodology
- `plan.md` — phased execution strategy and evidence workflow
- `tasks.md` — atomic work breakdown with dependencies
- `acceptance.md` — objective completion and repository gates
- `risk-register.md` — analysis and activation risks
- `candidate-evidence.md` — current-state, traceability, filters and scoring evidence
- `analysis.py` — deterministic sensitivity analysis
- `analysis-results.json` — accepted machine-readable output

## Starting authority

- Task 33: accepted
- Slice 023: closed
- latest feature checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- Task 34 execution baseline: `09b1284f7e17a6e64feeb2bfe8ff6998e7a80bfd`
- schema: 19
- Task 35 implementation: prohibited pending Product Owner approval
