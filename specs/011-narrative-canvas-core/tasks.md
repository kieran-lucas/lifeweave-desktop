# Spec 011 — Task Evidence

## Task 21 — Narrative Canvas Core

Status: Complete.

### Test evidence

- Rust library tests: 340 passed, 0 failing
  - `narrative::schema::tests` — 5 tests (empty scene, all 5 block kinds, zero/two scene rejection, unknown block kind, invalid callout variant)
  - `narrative::markdown::tests` — 5 tests (title/scene title, metric, image, timeline, no MDX)
  - `narrative::repository::tests` — 7 tests (create/save/draft/recovery/idempotency, mutual exclusion both directions, branch rejection, child prevention, revision retention)
- Frontend tests: 322 passed, 0 failing (up from 314 in Task 20)
  - `NarrativeCanvasReader.test.tsx` — 8 tests
  - `BasicLeafReader.test.tsx` — 7 tests (updated for narrative integration)

### Build evidence

- `pnpm verify` — all governance/security gates pass
- `pnpm build` — `NarrativeCanvasStudio-*.js` is a separate lazy chunk
- `pnpm tauri build` — NSIS artifact produced
- `git diff --exit-code frontend/src/ipc/generated/` — no binding drift

### Migration

Migration 11 creates: `narrative_documents`, `narrative_document_revisions`, `narrative_document_drafts`, `narrative_save_operations`, `narrative_document_assets`. Mutual exclusion triggers (Canvas↔BasicLeaf, Canvas↔child). Search dirty triggers.
