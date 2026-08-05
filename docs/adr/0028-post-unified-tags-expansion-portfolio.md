# ADR 0028 — Post-Unified-Tags Expansion Portfolio

## Status

Accepted as the Task 34 analytical recommendation record.

The next-task recommendation was subsequently modified by the Product Owner in ADR 0029. The candidate scores, hard-filter outcomes, and sensitivity results in this ADR remain valid historical analysis.

## Context

Task 33 completed Unified Tags and changed earlier prerequisite assessments. Task 34 evaluated eleven candidates under 16 hard filters and a 14-criterion uncertainty model. This is not a user study.

## Decision

Analytical recommendation: `ACTIVATE_PRODUCT — Deadline Semantics + Deadline-Aware Planning Core`.

The result is UNSTABLE when Hardening participates because safety/interoperability profiles prefer Hardening. It is ROBUST among product candidates. No P0/P1 debt forces Hardening.

Task 35 required separate Product Owner approval. The Product Owner selected `MODIFY`; see ADR 0029.

## Disposition

- PASS: Actual Time, Deadline, Saved Views, Explicit Links/Backlinks, Whole-tree Interchange, Hardening.
- CONDITIONAL: Generic Outline.
- FAIL: Noteboard, Graph, Score, Prediction.

## Consequences

- schedule and deadline remain separate;
- first deadline slice was proposed as one-off Tasks only;
- recurring deadline policy remains open;
- reminders/notifications/sound remain removed;
- no new sidebar destination was implied;
- Hardening remains explicit strategic runner-up;
- Saved Views is product runner-up;
- Graph cannot precede Links;
- Score and Prediction remain blocked;
- Deadline remains eligible but deferred after ADR 0029.

## Quantitative record

- base Deadline score: 8.420;
- base lead: 0.325;
- canonical Deadline top-1: 59.281833%;
- Deadline > Hardening pairwise: 70.183750%;
- product-only Deadline top-1: 85.674717%;
- seed: 20260805;
- 9,000,000 profile samples;
- max convergence drift: 0.1340%.

## Reversal conditions

Modify the recommendation if Product Owner prioritizes physical accessibility/recovery evidence, user evidence favors Saved Views, recurring deadlines are mandatory in v1, deadline value depends on reminders, P0/P1 debt appears before activation, or a new Product Owner priority is introduced.

ADR 0029 records the exercised Product Owner modification.
