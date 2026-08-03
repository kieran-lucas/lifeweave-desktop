# Task 23 Acceptance Remediation Audit

**Date:** 2026-08-03

---

## Context

Task 23 initial commit `0dce8e9` was declared FAIL by acceptance review. This document records the remediation.

---

## P1 Defects Resolved

| Defect | Fix |
|--------|-----|
| Approved 12-criterion model replaced with substituted criteria | `analysis.py` rewritten with exact approved criteria `[immediate_user_value, workflow_frequency, differentiation, data_safety_reversibility, accessibility_feasibility, implementation_boundedness, maintenance_cost, performance_feasibility, local_first_privacy, interoperability_backup, prerequisite_readiness, evidence_testability]` and weights `[16,10,10,12,9,9,8,7,6,5,5,3]` |
| Hard-filter matrix used 12 filters; PASS granted despite unresolved PO decisions | Full 13×14 matrix with PASS/CONDITIONAL/FAIL; every non-PASS cell has evidence note; candidates with unresolved PO decisions reclassified as CONDITIONAL |
| Hardening candidate reduced to zero-change "No Expansion" | Restored as "No Expansion / Core Evidence + Release Readiness Hardening" with concrete hardening scope and honest scoring |
| Acceptance criteria hardcoded "Multi-Scene is the only ACTIVATE_NEXT result" | Acceptance rewritten to verify process and thresholds; does not name the required winner |

## High Defects Resolved

| Defect | Fix |
|--------|-----|
| Missing top-3 probability | Added to simulation output and spec |
| Missing pairwise win probability | Added to simulation output and spec |
| Missing convergence data | Convergence checkpoints at 100k/500k/1M added; max drift 0.13 % confirmed |
| Profile vectors targeted substituted criteria | All 5 profiles rebuilt against approved criteria; each sums to 100 |
| `HOLD_FOR_PRODUCT_OWNER` used as hard-filter result | Two-layer vocabulary enforced: hard-filter (PASS/CONDITIONAL/FAIL) and portfolio (ACTIVATE_NEXT/HOLD_FOR_PRODUCT_OWNER/DEFER/RECOMMEND_REMOVE) |
| Aggregate lead used in place of base lead | `activation_checks` in `analysis.py` and spec explicitly use base-profile lead (0.46) for the 0.35 threshold |

---

## Reaudit Results

```
Approved criteria restored:    ✓ exact 12-criterion 100-point model
Profile sums:                  ✓ all 5 profiles sum to 100
Candidate set:                 ✓ 13 candidates including Hardening Slice
Hard-filter matrix:            ✓ 13 × 14, PASS/CONDITIONAL/FAIL with notes
Eligible candidates:           ✓ Multi-Scene (PASS), Hardening Slice (PASS)
Base score (Multi-Scene):      ✓ 8.02 ≥ 7.0 threshold
Base lead:                     ✓ 0.46 ≥ 0.35 threshold
Aggregate top-1:               ✓ 65.8 % ≥ 55 % threshold
Convergence drift:             ✓ 0.13 % < 5 % tolerance
python analysis.py --check:    ✓ exit 0

pnpm verify:                   ✓ all governance gates pass
pnpm typecheck:                ✓ 0 errors
pnpm test:                     ✓ 399 passed, 0 failed
pnpm build:                    ✓ built successfully
cargo check --locked:          ✓ 0 errors
cargo fmt --all -- --check:    ✓ no diff
cargo clippy --locked:         ✓ 0 warnings
cargo test --locked:           ✓ 388 passed, 0 failed
```

## Acceptance Gate Status

All acceptance criteria in `specs/013-post-narrative-expansion-decision/acceptance.md` verified.

Preliminary record: commit `0dce8e9` (substituted criteria, FAIL acceptance).
Accepted record: this remediation commit (accepted, ADR 0018).

Task 23 remediation complete. Task 24 remains prohibited until Product Owner approval.
