# Task 19 Audit — Basic Leaf Heading Outline Core + Reader Navigation

**Date:** 2026-08-03
**Task:** 19 — Basic Leaf Heading Outline Core + Reader Navigation
**Status:** Complete

## Scope

Implemented an ephemeral document heading outline in the Basic Leaf Reader. The outline is derived from committed canonical JSON, displayed only in Reader mode when the document has 2+ top-level headings, and never persisted.

## Starting HEAD

`84cc608a7f9c72ca7da29e6e8077fd970ed9f531` — `close global search acceptance gaps` (Task 18 remediation).

## Files Changed

### Frontend (new)
- `frontend/src/features/life/document/outline.ts` — Pure projection: `buildDocumentOutline`, `extractHeadingText`, `headingIdForSourceIndex`, `DocumentOutlineEntry`, `DocumentOutlineProjection`, `MAX_OUTLINE_ENTRIES`
- `frontend/src/features/life/document/DocumentOutline.css.ts` — Vanilla Extract styles: nav, heading, disclosureToggle, list, listHiddenNarrow, entryButton, truncationNote
- `frontend/src/features/life/document/DocumentOutline.tsx` — React component with disclosure toggle, aria-current, scroll+focus activation, reducedMotion support
- `frontend/src/features/life/document/outline.test.ts` — 24 pure unit tests (headingIdForSourceIndex, extractHeadingText, buildDocumentOutline)
- `frontend/src/features/life/document/DocumentOutline.test.tsx` — 33 component + integration tests (StaticDocument, DocumentOutline component, BasicLeafReader integration, axe accessibility)

### Frontend (modified)
- `frontend/src/features/life/document/StaticDocument.tsx` — Added `renderTopLevel` giving top-level headings `id={headingIdForSourceIndex(index)}` and `tabIndex={-1}`; imported `headingIdForSourceIndex` from `./outline`
- `frontend/src/features/life/document/BasicLeafDocument.css.ts` — Added `outlineContainer`, `outlineGrid`, `outlineColumn` exports; added `scrollMarginTop: "1.5rem"` to existing h1/h2/h3 globalStyle
- `frontend/src/features/life/document/BasicLeafReader.tsx` — Added `useReducedMotion` (motion/react), `buildDocumentOutline`, `DocumentOutline` imports; `reducedMotion` hook at component top; outline projection + conditional grid in static render path

### Rust (none)
No Rust changes. No SQLite migrations. No IPC commands. No new dependencies.

## Test Evidence

### Frontend
- **Pre-existing tests:** 136 passing
- **New tests:** 57 (24 outline.test.ts + 33 DocumentOutline.test.tsx)
- **Total:** 193 passing, 0 failing, 16 test files
- TypeScript typecheck: 0 errors

### Outline unit tests (outline.test.ts — 24 tests)
- `headingIdForSourceIndex`: positional IDs
- `extractHeadingText`: concatenation, hardBreak→space, whitespace collapse, marks stripped (bold/italic/link), empty→"Untitled section"
- `buildDocumentOutline`: no headings, 1 heading, 2 headings, h1/h2/h3 levels, level 4+ normalized, positional IDs, duplicate labels, empty heading, nested heading ignored, 256-cap with 300 headings, no truncation at exactly 256, sourceIndex tracking, 10k-node O(n) performance fixture

### Component/integration tests (DocumentOutline.test.tsx — 33 tests)
- **StaticDocument (8 tests):** heading IDs match positional formula; h1/h2/h3 rendered correctly; tabIndex=-1; duplicate labels get different IDs; paragraphs unchanged; no Tiptap instance
- **DocumentOutline component (12 tests):** nav aria-label; entry labels; data-level attributes; scrollIntoView smooth; scrollIntoView auto (reducedMotion); aria-current on click; disclosure toggle label; toggle aria-expanded; truncation note shown/hidden
- **BasicLeafReader integration (13 tests):** outline hidden with 0/1 headings; shown with 2+; correct labels/levels; clicking navigates by ID; duplicate labels distinct; editing hides outline; post-edit outline updates; corrupt document no outline; truncation notice; markdown import updates outline; draft recovery updates outline; axe accessibility check

## Constraint verification

| Constraint | Status |
|---|---|
| No Rust changes | Pass |
| No SQLite migration | Pass |
| No IPC changes | Pass |
| No new npm dependencies | Pass |
| No new routes | Pass |
| No `dangerouslySetInnerHTML` | Pass |
| No text-derived IDs | Pass |
| No `role="tree"` | Pass |
| Reader-only (hidden in editor) | Pass |
| Only when ≥ 2 headings | Pass |
| 256-entry cap | Pass |
| Positional IDs `leaf-heading-N` | Pass |
| No independent scrollbar on outline | Pass |
| `useReducedMotion` from existing `motion` package | Pass |
| TypeScript strict (0 errors) | Pass |

## Acceptance criteria coverage

All 35 acceptance criteria from `specs/009-basic-leaf-outline/acceptance.md` are verified by tests. See that file for the full checklist.

## Performance Evidence

### 10,000-node extraction fixture (`outline.test.ts`)

Fixture: 10,000 top-level nodes (paragraphs + 300 headings interleaved). Algorithm: O(n) — one pass over top-level content, no DOM access, no recursion into non-heading nodes.

Result: 256 entries (cap), `truncated: true`, `totalHeadingCount: 300`. Timing printed to test output (hardware-dependent; sub-5000ms hard ceiling in release and debug modes). Algorithm is linear and does not recurse.

### Bundle impact

- `DocumentOutline` is inlined in the main index bundle (not lazy — always available with Reader). Main bundle increased by ~2 kB (486.89 kB → 489.06 kB).
- `BasicLeafEditor` remains a separate lazy chunk: 442.80 kB.
- `markdown` remains a separate lazy chunk: 116.54 kB.
- `GlobalSearchDialog` remains a separate lazy chunk: 3.96 kB.
- No new chunks created for outline functionality.

## Production Build Chunks

```
dist/assets/GlobalSearchDialog-DV4nHXyU.js     3.96 kB │ gzip:   1.71 kB  ← lazy ✓
dist/assets/BasicLeafEditor-CbGo-Hut.js      442.80 kB │ gzip: 138.69 kB  ← lazy ✓
dist/assets/markdown-C2y7R8us.js             116.54 kB │ gzip:  33.34 kB  ← lazy ✓
dist/assets/index-CXOyTkjx.js               489.06 kB │ gzip: 151.74 kB
```

DocumentOutline code adds ~2 kB to the main bundle (acceptable — always needed with Reader).

## NSIS Build

`pnpm tauri build` completed successfully (after commit, confirmed retroactively).

- Artifact: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`
- Size: 4.32 MB
- Rust compile (release, incremental): 3m 36s (faster than Task 18's 9m 20s — only frontend changed)
- Frontend build: 1.61s

## Native Liveness / Relaunch Smoke

Schema remains at version 10. No migration added. The existing `search_file_backed_smoke` and `search_perf_realistic_fixture` tests verify schema 10 persistence and relaunch. No additional native smoke tests needed for this purely frontend feature.

The outline is derived from `canonical_json` already loaded by `getReaderDocument` IPC — no new IPC calls introduced.

## Remaining Truthful Limitations

- Container query narrow/wide boundary (520px) cannot be directly tested with jsdom — visual behavior is verified by CSS structure review.
- `scrollIntoView` and `focus` are mocked in tests; real smooth-scroll behavior requires a browser environment.
- Axe check runs in jsdom and does not exercise full screen-reader behavior or WebView2-specific rendering.
- Native WebDriver click-through for the outline UI is not attempted (historical attachment limitation).
- No automatic scroll-spy (IntersectionObserver) — `aria-current` only tracks the last activated item, not the current viewport position. This is intentional per spec.

## ADR

ADR 0008 (`docs/adr/0008-basic-leaf-heading-outline.md`) accepted. Decision: Outline is activated only as a bounded Basic Leaf Reader heading projection.
