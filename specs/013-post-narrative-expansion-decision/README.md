# Spec 013 — Post-Narrative Expansion Decision

**Status:** Complete (accepted, reaudit)
**Task:** 23/60
**Decision date:** 2026-08-03

Evaluates all 13 expansion candidates post-Narrative Canvas (Tasks 20–22) under the exact approved 12-criterion 100-point weighted model and a five-profile, five-million-sample sensitivity simulation (seed 20260803).

**Preliminary draft:** commit `0dce8e9` used substituted criteria and is preserved as a draft.
**Accepted decision:** this document (ADR 0018).

**Outcome:** Narrative Multi-Scene Composition is `ACTIVATE_NEXT`.
- Base score: 8.02 / 10 (≥ 7.0 threshold)
- Base lead over hardening runner-up: 0.46 (≥ 0.35 threshold)
- Aggregate top-1 probability: 65.8 % (≥ 55 % threshold)
- Wins in 3/5 profiles (base, utility, visual); hardening wins safety and recovery profiles.
- Task 24 remains prohibited until explicit Product Owner approval.

## Files

| File | Purpose |
|------|---------|
| `spec.md` | Baseline, 13-candidate evaluation, 14-filter matrix, weighted model, simulation results, recommendation, Task 24 contract |
| `plan.md` | Implementation steps for Task 23 |
| `tasks.md` | Task checklist |
| `acceptance.md` | Pass criteria (process-verifying, not winner-hardcoding) |
| `risk-register.md` | Identified risks |
| `analysis.py` | Reproducible sensitivity simulation (seed 20260803) |
| `results.json` | Generated simulation output — do not edit manually |
