# Task 21 Acceptance Remediation Audit

**Date:** 2026-08-03  
**Candidate commit:** `f1438da` (narrative canvas vertical slice — acceptance FAIL)  
**Remediation commit:** see STATUS.md

---

## P1 Defects Closed

| # | Defect | Fix |
|---|--------|-----|
| 1 | No unique partial index for one-canvas-per-leaf | Migration 12: `CREATE UNIQUE INDEX narrative_documents_active_life_node_uq` |
| 2 | Document identity chain not enforced | `schema::validate` verifies `documentId == expected_id`; repository passes `Some(&id)` |
| 3 | Unknown block kinds silently rejected | Validator preserves unknown blocks (≤64 KiB); excluded from plain_text and assets |
| 4 | Seed document hardcodes "Untitled" | `create()` queries `life_nodes.title` and passes it to `seed_document` |
| 5 | TypeScript codec is a shallow cast | `parseNarrative` validates all required fields; unknown kinds round-trip via type assertion |
| 6 | Reader heading levels wrong | `<article aria-labelledby>` + `<h1>` for canvas title, `<section><h2>` for scene title |

## Additional Fixes

- `create()` checks for existing active canvas before inserting (idempotent for duplicate calls not covered by operation_id)
- INSERT uses explicit column list (compatible with migration 12 template columns)
- `row()` reads `template_id` and `template_version` from DB columns (indices 7, 8)
- Migration 12 adds guard triggers for root node, inactive node, schema_version, template_id, template_version, JSON/text size, revision monotonicity
- Restore guard triggers for both canvas and Basic Leaf (mutual exclusion on unarchive)
- `NarrativeCanvasStudio.test.tsx` added with 15 direct Studio tests
- `NarrativeCanvasReader.test.tsx` updated: `seedDoc` includes `template_id`/`template_version`, heading assertions use `level: 1` and `level: 2`
- All `== 11` schema version assertions updated to `== 12` across 6 files

## Verification Results

```
cargo check --locked --all-targets     ✓ 0 errors
cargo fmt --all -- --check             ✓ no diff
cargo clippy --locked --all-targets    ✓ 0 warnings
cargo test --locked                    ✓ 348 passed, 0 failed
pnpm typecheck                         ✓ 0 errors
pnpm test                              ✓ 336 passed, 0 failed
pnpm build                             ✓ built in 2.38s
pnpm verify                            ✓ all governance gates pass
```

## Acceptance Criteria Status

All 6 P1 blocking defects are closed. The remediation passes the full local gate sequence.
