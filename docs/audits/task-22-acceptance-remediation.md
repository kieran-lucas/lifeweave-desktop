# Task 22 Acceptance Remediation Audit

**Date:** 2026-08-03

---

## Context

Task 22 initial commit `1e7b080` was declared FAIL by acceptance review. This document records the remediation.

---

## P1 Defects Resolved

| Defect | Fix |
|--------|-----|
| `render_rich_text`/`inline_text` duplicated Basic Leaf exporter, losing links/tables/marks | Deleted; `render_block` now calls `crate::document::markdown::export` for `rich_text` and `callout` |
| `import_from_markdown` missing `ensure_assets` + `narrative_document_assets` inserts | Added inside transaction; missing asset causes full rollback |
| `NarrativeMarkdownImportDialog` called `operationId("md-import")` fresh on every confirm | Changed to `useRef(operationId("md-import"))` stable per session |
| `preview_narrative_markdown` stateless; unsafe Markdown passed preview | Delegates to `repository::preview_markdown` which calls `document::markdown::import` |

## High Defects Resolved

| Defect | Fix |
|--------|-----|
| Title from H1 heading (wrong policy) | Title from sanitized filename stem only |
| Filename from node title | Filename from Canvas JSON `title` field |
| Reserved-name check only on full stem | Primary stem (before first `.`) checked; `CON.txt` → `narrative-canvas.md` |
| Fallback `"export"` | Fallback `"narrative-canvas"` |
| No control character stripping | Added `filter(|c| !c.is_control())` |
| Callout exported as `> **[variant]**` | Exported as `> [!VARIANT]\n> content` |
| Unknown blocks silently omitted | Exported as `> [!WARNING]\n> Unsupported Canvas block: {kind}` |
| Image no caption | Caption emitted as `*caption*` paragraph |
| No multi-line admonition import | `parse_admonition_header` added; multi-line NOTE/WARNING/TIP parsed |
| TIP variant not in document schema | TIP mapped to `"info"` variant |
| Lossiness warning shown after export | Warning always visible before export button |
| Warning text incorrect | Set to specified text |
| `file.text()` encoding unsafe | Fatal UTF-8 decoding via `TextDecoder("utf-8", { fatal: true })` |
| File input not reset | `event.currentTarget.value = ""` on change |
| Accept attribute narrow | Accept `.md,text/markdown,text/plain` |
| No focus trap | Tab/Shift+Tab trap added to dialog |
| No `aria-describedby` on dialog | Bound to warnings section |
| No focus restoration | `priorFocusRef` captured on mount, restored on unmount |
| Escape/overlay dismisses during pending | Guarded by `status !== "pending"` |

---

## Verification Results

```
cargo check --locked --all-targets     ✓ 0 errors
cargo fmt --all -- --check             ✓ no diff
cargo clippy --locked --all-targets    ✓ 0 warnings
cargo test --locked                    ✓ 388 passed, 0 failed
pnpm typecheck                         ✓ 0 errors
pnpm test                              ✓ 399 passed, 0 failed  (9 new in NarrativeMarkdownExportButton.test.tsx)
pnpm build                             ✓ built in 1.24s
pnpm verify                            ✓ all governance gates pass
```

## Acceptance Gate Status

All 47 acceptance criteria in `specs/012-narrative-markdown-interoperability/acceptance.md` verified.
Task 22 remediation complete.
