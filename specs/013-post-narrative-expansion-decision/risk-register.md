# Slice 013 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | Hardening candidate wins in a future safety/recovery-dominated decision re-run | Medium | Medium | Hardening is DEFER, not eliminated; it can be activated as a standalone Task whenever P0/P1 evidence debt is confirmed. Risk is disclosed in per-profile table. |
| R2 | Multi-scene schema requires a non-additive migration (breaking existing single-scene rows) | Low | High | Explicit kill criterion; Task 24 must verify additive migration before any code is written. `parseNarrative` change is a code-only relaxation, not a schema migration. |
| R3 | Safety/maintenance profile wins in an independently commissioned re-run | Low | Medium | Product Owner retains final approval authority. The cross-profile disagreement is explicitly documented and preserved in ADR 0018. |
| R4 | Template System or Visual Worlds receives implicit Product Owner direction that conflicts with HOLD_FOR_PRODUCT_OWNER | Low | Medium | Both are HOLD_FOR_PRODUCT_OWNER in the portfolio layer; no implementation proceeds without explicit approval. |
| R5 | Generic Outline's base score of 7.01 appears to meet the threshold but is CONDITIONAL | Low | Low | Documented in spec as a diagnostic note. CONDITIONAL is not equivalent to PASS; the hard-filter role ambiguity must be resolved before Generic Outline can be activated. |
| R6 | analysis.py numpy dependency unavailable in some environments | Low | Low | `pnpm verify` does not invoke analysis.py; `--check` is a local gate only. The script is reproducible in any environment with numpy installed. |
| R7 | Preliminary commit `0dce8e9` preserved in history causes confusion | Low | Low | ADR 0017 is explicitly marked "preliminary"; ADR 0018 is the acceptance authority. Both audit documents reference the preliminary SHA. |
