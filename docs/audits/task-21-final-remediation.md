# Task 21 Final Acceptance Remediation Audit

**Date:** 2026-08-03
**Base commit:** current HEAD after `close narrative canvas acceptance gaps`

---

## P1 Defects Closed

| # | Defect | Fix |
|---|--------|-----|
| 1 | Unknown blocks not lossless — `parseNarrative` returned `{ kind, id }`, discarding all fields | `UnknownNarrativeBlock.canonical` holds entire raw object; `serializeNarrative` re-emits it verbatim |
| 2 | Dual-content conflict hidden — `BasicLeafReader` silently routed to Canvas without detecting both documents existing | Conflict branch added: blocking `role="alert"`, no destructive action, before either reader branch |
| 3 | Frontend codec normalizes — accepted wrong `templateVersion`, scene count, preset values via silent coercion | `parseNarrative` throws on any deviation; no `String()` coercion; no silent defaults |

## Additional Changes

- Migration 13: six BEFORE UPDATE guard triggers for narrative and basic leaf documents (move guard, restore-node-active guard, restore-uniqueness guard)
- All schema version assertions updated: `== 12` → `== 13` across 7 locations in 6 files
- `serializeNarrative(doc)` replaces `JSON.stringify(doc)` in Studio save and draft paths
- `isUnknownBlock()` type guard used throughout Reader and Studio instead of unsafe casts
- `schema.test.ts` added: 13 tests covering strict parse validation, unknown block preservation, lossless round-trip, known-block field stripping
- `NarrativeCanvasStudio.test.tsx` and `NarrativeCanvasReader.test.tsx` fixtures updated with `templateVersion: 1` and full scene fields

## Verification Results

```
cargo check --locked --all-targets     ✓ 0 errors
cargo fmt --all -- --check             ✓ no diff
cargo clippy --locked --all-targets    ✓ 0 warnings
cargo test --locked                    ✓ 348 passed, 0 failed
pnpm typecheck                         ✓ 0 errors
pnpm test                              ✓ 350 passed, 0 failed  (13 new in schema.test.ts)
pnpm build                             ✓ built in 1.34s
pnpm verify                            ✓ all governance gates pass
```

## Acceptance Criteria Status

All 3 P1 blocking defects are closed. The final remediation passes the full local gate sequence.
