# Task 34 Analysis Results

- model: `task34-v1.0`
- seed: `20260805`
- samples/profile: 1,000,000
- profiles: 6 canonical + 3 stress
- total profile samples: 9,000,000
- base winner: Deadline (8.420)
- base runner-up: Saved Views (8.095)
- base lead: 0.325
- canonical aggregate winner: Deadline
- canonical top-1: 0.5928183333333333
- canonical runner-up: Hardening
- pairwise Deadline > Hardening: 0.7018375
- portfolio stability: `UNSTABLE`
- product-only Deadline top-1: 0.8567471666666667
- product-only stability: `ROBUST`
- max convergence drift: 0.00134

Recommendation: `ACTIVATE_PRODUCT — Deadline Semantics + Deadline-Aware Planning Core`.

This remains behind Product Owner approval.

```powershell
python specs/024-post-unified-tags-expansion-decision/analysis.py --check
```
