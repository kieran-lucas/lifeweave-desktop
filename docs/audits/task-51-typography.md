# Task 51 typography evidence

**Status:** current production proof complete · **Date:** 2026-08-09

This record restores the evidence link named by ADR 0045. It does not reopen the settled font
selection. The comparison outcome and rejected candidates remain authoritative in ADR 0045,
Override 2.

## Settled system

| Role | Family | Delivery |
|---|---|---|
| Dense UI, controls, navigation and Task rows | Segoe UI Variable Text/Small/Display by optical role | Windows system font; no redistributed Microsoft asset |
| Editorial titles, Reader content and document editing | Literata Variable | Self-hosted latin plus Vietnamese woff2 subsets; no remote request |

`frontend/src/design-system/visual/typography.css.ts` contains the measured Windows family-resolution
proof and the role mapping. The Vietnamese subset is explicitly imported; `latin-ext` is excluded
because the shipped Vietnamese file covers every required Vietnamese codepoint.

## Current production render proof

The native Tauri/WebView2 fixture adds an accented Task and Life title, uppercase headings, ordinary
body text, bold and italic spans, and a list. It then reaches the surfaces through production UI and
queries Search with unaccented `suc khoe`.

| Golden | What was inspected | Result |
|---|---|---|
| `01-today-vi-1522x779.png` | Segoe UI Variable Task title/body, metadata and long accented labels | no clipped or detached marks; row rhythm and wrapping remain stable |
| `16-life-reader-vi-1522x779.png` | Literata display title, uppercase H2, H3, paragraph, bold/italic and list | crisp stacked diacritics; consistent weight/italic metrics; editorial measure preserved |
| `17-basic-editor-vi-1522x779.png` | the same authored content in the live editor and toolbar context | caret/editing surface remains readable; no fallback jump or overflow |
| `21b-search-results-vi-1522x779.png` | dense Search UI and accent-insensitive Task/Life/document results | unaccented query returns all three accented entities; result hierarchy remains legible |

All four are tracked under `e2e-tests/visual-baselines/windows-webview2/` and were inspected at their
physical 1920×992 resolution. The comparison-only rerun passed at exactly 0% mismatch. The complete
native walk produced 36 records with zero semantic collisions, document overflow, or viewport
overflow.

```powershell
$env:LIFEWEAVE_AUDIT_LABEL = 'task51-visual-baseline-verify-vi2-1536-20260809'
$env:LIFEWEAVE_AUDIT_LANGUAGE = 'vi'
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

Evidence: `target/e2e-artifacts/task-50b/task51-visual-baseline-verify-vi2-1536-20260809/`.
Narrator and physical DPI are separate manual axes and are not claimed by this typography proof.
