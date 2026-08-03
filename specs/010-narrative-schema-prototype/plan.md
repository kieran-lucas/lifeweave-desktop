# Spec 010 — Prototype Implementation Plan

## Files created

### Prototype (frontend only, never shipped)
- `frontend/src/prototypes/narrative-canvas-schema/shared/types.ts` — `PMLeafNode`, `BasicLeafContent`, `NarrativeBlock`, `NarrativeScene`, `NarrativeDocumentA`, `BenchmarkResult`, `MatrixCriterion`, `PrototypeAdapter<TDoc>`
- `frontend/src/prototypes/narrative-canvas-schema/shared/prng.ts` — xorshift32 PRNG seeded at 20260803
- `frontend/src/prototypes/narrative-canvas-schema/shared/fixtures.ts` — `FIXTURE_S`, `FIXTURE_K`, `makeBlock`, `makeScene`
- `frontend/src/prototypes/narrative-canvas-schema/strategy-a/adapter.ts` — Strategy A pure immutable adapter, `NarrativeDocumentAv2`
- `frontend/src/prototypes/narrative-canvas-schema/strategy-b/adapter.ts` — Strategy B adapter using `@tiptap/pm/model`, `narrativeSchema`, `fromNarrativeDocumentA`, `toNarrativeScenes`
- `frontend/src/prototypes/narrative-canvas-schema/prototype.test.ts` — 60 tests: PRNG, fixtures, Strategy A ops, Strategy B ops, simulation × 2, benchmark × 2, decision matrix, bundle isolation

### Docs
- `specs/010-narrative-schema-prototype/` — README, spec, plan, tasks, acceptance, risk-register
- `docs/adr/0009-narrative-canonical-schema.md` — ADR accepting Strategy A
- `docs/audits/task-20-narrative-schema-prototype.md` — evidence record

### Updated
- `docs/STATUS.md` — Task 20 section prepended
- `docs/ROADMAP.md` — Slice 010 section added

## No files modified in production paths

Zero changes to:
- `src-tauri/` (no Rust, no migration, no IPC)
- `frontend/src/app/`, `frontend/src/features/`, `frontend/src/ipc/` (no production code)
- `frontend/package.json` (no new dependencies — `@tiptap/pm` was already present)
