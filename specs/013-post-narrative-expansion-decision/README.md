# Spec 013 — Post-Narrative Expansion Decision

**Status:** Complete  
**Task:** 23/60  
**Decision date:** 2026-08-03

Evaluates all expansion candidates now that Narrative Canvas (Tasks 20–22), Global Search (Task 18), Basic Leaf Outline (Task 19), and Narrative Markdown Interoperability (Task 22) are implemented. Selects the next activation candidate using a 12-criterion weighted model and a five-profile, five-million-sample sensitivity simulation.

**Outcome:** Multi-Scene Canvas Composition is `ACTIVATE_NEXT` (aggregate score 7.748, lead 0.372 over runner-up Task/Life Relationships at 7.376, win probability 70.2 %).

## Files

| File | Purpose |
|------|---------|
| `spec.md` | Candidate evaluation, weighted model, simulation results, recommendation |
| `plan.md` | Implementation steps for Task 23 |
| `tasks.md` | Task checklist |
| `acceptance.md` | Pass criteria |
| `risk-register.md` | Identified risks |
| `analysis.py` | Reproducible sensitivity simulation (seed 20260803) |
| `results.json` | Generated simulation output — do not edit manually |
