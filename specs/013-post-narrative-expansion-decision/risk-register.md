# Slice 013 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | Simulation σ values are underestimated, narrowing the apparent lead | Medium | Medium | Lead of 0.372 is 6 % above the 0.35 required threshold; sensitivity profiles were chosen to include adversarial weight distributions. |
| R2 | Safety/maintenance profile already favors No Expansion; a future-dominant safety preference could reverse the decision | Low | High | Product Owner retains final approval authority; this risk is disclosed in the per-profile table and the ADR. |
| R3 | Multi-scene Canvas schema requires a non-additive migration change (breaking existing single-scene rows) | Low | High | Kill criterion explicitly stated; Task 24 scoping must verify additive migration before commit. |
| R4 | Template System or Visual Worlds receives implicit Product Owner direction that conflicts with this recommendation | Low | Medium | Both are HOLD_FOR_PRODUCT_OWNER; no implementation proceeds without explicit approval. |
| R5 | Task/Life Relationships deferral causes loss of roadmap momentum if Multi-Scene is approved but stalls | Low | Low | Task/Life remains DEFER (not FAIL); it can be promoted at the next expansion decision without re-evaluation from scratch. |
| R6 | analysis.py numpy dependency unavailable in CI environment | Low | Low | `pnpm verify` does not invoke analysis.py; `--check` is a local gate only. |
