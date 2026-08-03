# ADR 0018 — Post-Narrative Expansion Portfolio Decision (Accepted, Reaudit)

**Status:** Accepted
**Supersedes:** ADR 0017 as the Task 23 acceptance authority.
**Date:** 2026-08-03

---

## Context

ADR 0017 (commit `0dce8e9`) contained P1 defects discovered during acceptance review:

1. The approved 12-criterion model was replaced with substituted criteria (`mission_alignment`, `identity_fit`, `engineering_simplicity`, `narrative_compat`, `dep_risk_inv`, etc.), removing mandatory criteria including workflow frequency, accessibility feasibility, performance feasibility, local-first/privacy, interoperability/backup clarity, and evidence/testability.

2. The hard-filter matrix used only 12 filters (not 14), and several candidates were marked PASS 12/12 while their rationale described unresolved Product Owner decisions or undefined semantics — conditions that require CONDITIONAL under the approved rules.

3. The hardening candidate was reduced from "No Expansion / Core Evidence + Release Readiness Hardening" to "No Expansion (explicit deferral)" and scored mainly as doing nothing, biasing the result toward feature expansion.

4. The acceptance criteria hardcoded "Multi-Scene Canvas Composition is the only ACTIVATE_NEXT result", violating the process-verifying requirement.

5. Required simulation outputs were absent: top-3 probability, pairwise probability, convergence data.

6. Profile weight vectors did not target the approved criteria (e.g., `recovery_readiness_first` increased criteria not present in the approved model).

7. `HOLD_FOR_PRODUCT_OWNER` was used as a hard-filter result rather than as a portfolio-layer label.

This ADR records the remediated decision produced by rerunning the model correctly.

---

## Remediated decision

**Activate Next:** Narrative Multi-Scene Composition

**Eligible candidates (PASS 14/14 hard filters):**
- Narrative Multi-Scene Composition
- No Expansion / Core Evidence + Release Readiness Hardening

**Activation thresholds (base profile — not aggregate):**

| Check | Value | Threshold | Result |
|---|---|---|---|
| Base score (Multi-Scene) | 8.02 / 10 | ≥ 7.0 | PASS |
| Base lead over eligible runner-up | 0.46 | ≥ 0.35 | PASS |
| Aggregate top-1 probability | 65.8 % | ≥ 55 % | PASS |

**Simulation:** seed 20260803; 1,000,000 samples per profile × 5 profiles = 5,000,000 total.

**Eligible simulation aggregate:**
- Multi-Scene: mean 7.943, top-1 65.8 %, top-3 100 %, mean rank 1.34
- Hardening Slice: mean 7.489, top-1 34.2 %, top-3 100 %, mean rank 1.66

**Per-profile picture:** Multi-Scene wins in base (8.02 vs 7.56), utility (7.87 vs 7.09), and visual-identity (8.22 vs 6.60) profiles. Hardening wins in safety/maintenance (8.10 vs 7.76) and recovery/readiness (8.21 vs 7.97) profiles. The cross-profile disagreement reflects a legitimate tension between growth-oriented and evidence-oriented priorities.

**Convergence:** Maximum within-profile drift across 100k/500k/1M checkpoints = 0.13 %. Results are stable.

---

## Multi-Scene rationale

Multi-Scene Composition extends the live Strategy-A single-scene Canvas (ADR 0010) as an additive code change. The `scenes.length === 1` constraint in `parseNarrative` is relaxed to 1–20; no migration is required. It scores highest on immediate user value (8), differentiation (9), and prerequisites (10 — all prerequisites satisfied). Its main cost is lower data-safety and maintenance scores than the Hardening candidate, but it leads on every user-facing and product-identity criterion.

---

## Hardening candidate

The "No Expansion / Core Evidence + Release Readiness Hardening" candidate is a real, bounded slice covering: native click-through evidence, pointer DnD evidence, Markdown import/export/backup regression harness, performance budgets, screen-reader/forced-colors/DPI hardware evidence, and NSIS distribution readiness. It scores second (7.56 base) and is `DEFER`, not dismissed. If a P0/P1 evidence defect is found during Task 24, the hardening candidate should be evaluated for immediate promotion.

---

## Conditional candidates

Template System and Visual Worlds require Product Owner direction before activation (HOLD_FOR_PRODUCT_OWNER in portfolio layer). All other conditional candidates (Lossless Package, Tags, Task/Life Relationships, Generic Outline) are DEFER. Generic Outline base score 7.01 is noted as above threshold, but the CONDITIONAL hard-filter outcome (role not resolved beyond Task 19) makes it ineligible for immediate activation.

---

## Consequences

- Task 23 adds no product behavior, migration, IPC command, or dependency.
- Task 24 (Narrative Multi-Scene Composition) may begin only after Product Owner approval.
- The `parseNarrative` single-scene constraint will be relaxed in code (not migration) in Task 24.
- No migration is required; schema stays at version 14.
- Template System and Visual Worlds remain HOLD_FOR_PRODUCT_OWNER.
- Hardening Slice remains DEFER but should be re-evaluated if P0/P1 evidence debt is found.
- All other deferred candidates remain eligible for future expansion decisions without re-evaluation from scratch.
- Preliminary ADR 0017 is preserved as a historical record only.
