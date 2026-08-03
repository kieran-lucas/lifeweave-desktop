# Slice 009 — Implementation Plan

## Files created

- `frontend/src/features/life/document/outline.ts` — Pure projection logic: `buildDocumentOutline`, `extractHeadingText`, `headingIdForSourceIndex`, types
- `frontend/src/features/life/document/DocumentOutline.css.ts` — Vanilla Extract styles for outline nav, disclosure toggle, entry buttons, truncation note
- `frontend/src/features/life/document/DocumentOutline.tsx` — React component: nav/ol/li/button, disclosure, aria-current, scroll+focus activation
- `frontend/src/features/life/document/outline.test.ts` — 24 pure unit tests for projection logic
- `frontend/src/features/life/document/DocumentOutline.test.tsx` — 33 component + integration tests (StaticDocument, DocumentOutline, BasicLeafReader)

## Files modified

- `frontend/src/features/life/document/StaticDocument.tsx` — Added `renderTopLevel` helper giving top-level headings `id` and `tabIndex={-1}`; imported `headingIdForSourceIndex`
- `frontend/src/features/life/document/BasicLeafDocument.css.ts` — Added `outlineContainer`, `outlineGrid`, `outlineColumn` styles; added `scrollMarginTop` to h1/h2/h3 globalStyle
- `frontend/src/features/life/document/BasicLeafReader.tsx` — Added `useReducedMotion`, `buildDocumentOutline`, `DocumentOutline` imports; wrapped StaticDocument in outline grid when 2+ headings present

## No changes

- No Rust files
- No SQLite migrations
- No IPC commands
- No new npm dependencies
- No new routes
