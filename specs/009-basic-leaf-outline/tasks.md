# Tasks 009 — Basic Leaf Heading Outline

## Task 19 — Basic Leaf Heading Outline Core + Reader Navigation

**Status:** Complete

### Deliverables

- `frontend/src/features/life/document/outline.ts` — Pure projection: `buildDocumentOutline`, `extractHeadingText`, `headingIdForSourceIndex`, `DocumentOutlineEntry`, `DocumentOutlineProjection`, `MAX_OUTLINE_ENTRIES`
- `frontend/src/features/life/document/DocumentOutline.css.ts` — Vanilla Extract styles
- `frontend/src/features/life/document/DocumentOutline.tsx` — Reader outline component with disclosure, aria-current, smooth/auto scroll+focus
- `frontend/src/features/life/document/StaticDocument.tsx` — Modified: top-level headings get `id` and `tabIndex={-1}`
- `frontend/src/features/life/document/BasicLeafDocument.css.ts` — Modified: `outlineContainer/Grid/Column` styles, `scrollMarginTop` on headings
- `frontend/src/features/life/document/BasicLeafReader.tsx` — Modified: outline projection + conditional grid layout
- `frontend/src/features/life/document/outline.test.ts` — 24 pure unit tests
- `frontend/src/features/life/document/DocumentOutline.test.tsx` — 33 component + integration tests
- ADR 0008, audit doc, specs/009-basic-leaf-outline/

### All tests pass

- 193 frontend tests (was 136; 57 new)
- 24 outline.test.ts unit tests
- 33 DocumentOutline.test.tsx component + integration tests (includes axe accessibility check)
- All 136 pre-existing tests continue to pass
