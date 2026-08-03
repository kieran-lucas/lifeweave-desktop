# Task 23 Audit — Post-Narrative Expansion Decision

**Date:** 2026-08-03

**Note:** Initial commit `0dce8e9` was FAIL. See `docs/audits/task-23-acceptance-remediation.md` for the full remediation record. This document reflects the accepted reaudit state.

---

## Baseline

- Starting HEAD: `0047fba` (close narrative markdown acceptance gaps)
- Preliminary HEAD: `0dce8e9` (decide post-narrative expansion — preliminary, FAIL acceptance)
- Branch: main, clean, equal to origin/main
- Schema version: 14 (migrations 1–14 present)
- Narrative Canvas: single-scene knowledge-dossier; `parseNarrative` enforces `scenes.length === 1` and `templateId === "knowledge_dossier"`

---

## Candidate Evaluation

### Hard-filter results (13 × 14 matrix)

**PASS (14/14, eligible for activation):**
- Narrative Multi-Scene Composition
- No Expansion / Core Evidence + Release Readiness Hardening

**CONDITIONAL (ineligible for immediate activation):**
- Narrative Template System (PO template direction required)
- Visual Worlds (PO aesthetic direction required)
- Lossless Canvas Package (user value vs existing export not resolved)
- Tags (semantics, duplication unresolved)
- Task/Life Relationships (cardinality/ownership policy required)
- Generic Outline (role beyond Task 19 not resolved)

**FAIL:**
- Backlinks (no link-creation model; prerequisite absent)
- Noteboard (pillar integrity; duplication; no core workflow)
- Graph (accessibility; prerequisites; duplication)
- Score (formula OPEN; correctness unmeasurable)
- Prediction (insufficient history; correctness unmeasurable)

### Approved model scores (eligible candidates)

| Candidate | Base score | σ |
|---|---|---|
| Narrative Multi-Scene Composition | 8.02 / 10 | 0.65 |
| No Expansion / Hardening Slice | 7.56 / 10 | 0.55 |

Criteria: `[immediate_user_value, workflow_frequency, differentiation, data_safety_reversibility, accessibility_feasibility, implementation_boundedness, maintenance_cost, performance_feasibility, local_first_privacy, interoperability_backup, prerequisite_readiness, evidence_testability]`
Weights: `[16,10,10,12,9,9,8,7,6,5,5,3]`

### Simulation

- Script: `specs/013-post-narrative-expansion-decision/analysis.py`
- Seed: 20260803
- Samples: 1,000,000 per profile × 5 profiles = 5,000,000 total
- Method: Dirichlet weight perturbation × Gaussian score noise; eligible-candidate mask applied
- This is sensitivity analysis over disclosed expert assumptions, not empirical user evidence.

Eligible candidate results:

| Candidate | Mean score | Top-1 % | Top-3 % | Mean rank | Pairwise vs base winner |
|---|---|---|---|---|---|
| Multi-Scene | 7.943 | 65.8 % | 100 % | 1.34 | — |
| Hardening Slice | 7.489 | 34.2 % | 100 % | 1.66 | 34.2 % |

Convergence: max within-profile drift 0.13 % across 100k/500k/1M checkpoints.

`python analysis.py --check` exit 0: `OK  activate_next=multi_scene  base_score=8.0200  base_lead=0.4600  agg_top1=0.6580`

---

## Gate Results

```
pnpm verify                            ✓ all governance gates pass
pnpm typecheck                         ✓ 0 errors
pnpm test                              ✓ 399 passed, 0 failed
pnpm build                             ✓ built successfully
cargo check --locked --all-targets     ✓ 0 errors
cargo fmt --all -- --check             ✓ no diff
cargo clippy --locked --all-targets    ✓ 0 warnings
cargo test --locked                    ✓ 388 passed, 0 failed
python analysis.py --check             ✓ multi_scene, base_score=8.02, base_lead=0.46
```

---

## Acceptance Criteria

All criteria in `specs/013-post-narrative-expansion-decision/acceptance.md` verified.

Task 23 complete. Task 24 (Narrative Multi-Scene Composition) remains prohibited until Product Owner approval. ADR 0018 accepted.
