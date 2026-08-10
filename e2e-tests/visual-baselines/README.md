# Windows visual-regression baselines

These PNGs are approved production baselines for the native Tauri/WebView2 audit. Runtime
`actual` and `diff` images are written under `target/visual-regression/`; they are evidence, not
goldens, and remain untracked.

Lifeweave is **Light-only**. There is no Dark product theme, no Dark baseline set and no supported
`LIFEWEAVE_AUDIT_THEME=dark` workflow. `LIFEWEAVE_AUDIT_THEME` must be `light` or unset.

Comparison is opt-in so the normal geometry audit is unchanged. Baseline creation is a separate,
explicit action and is disabled by default.

The native runner pins the E2E presentation date to the baseline date while preserving the real
native date for concurrency-sensitive fixture commands. The visual service suppresses blinking
carets where the engine permits; the audit additionally makes a focused text-editable caret
transparent only for the comparison frame because WebView2 otherwise retains a native caret. This
preserves expanded combobox state and focus while eliminating pixel drift. Actual comparison frames
are saved under `target` for deterministic failure diagnosis; normal audit screenshots retain the
real focused-control caret.

At the governed minimum, Windows' 125% DPI rounding alternates a nominal `960×640` request between
959 and 960 CSS pixels. Pixel-comparison runs therefore target the metadata's established achieved
`959×639` WebView explicitly; geometry-only audits continue to request and report `960×640`.

```powershell
# Compare Light only. Missing or changed baselines fail; nothing is accepted.
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'

# Deliberately create a reviewed missing Light baseline. Never use this to erase an unexplained diff.
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
$env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES = '1'
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

Forced-colors remains a separate accessibility/system audit, not a product theme. Its tracked
goldens cover the shell, native controls, Calendar, Settings-owned Analytics, Graph, Reader, a
focused editor dialog, Settings, Settings-owned Search and Keyboard Help.

```powershell
$env:LIFEWEAVE_AUDIT_FORCED_COLORS = '1'
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

Reduced Motion is asserted independently with `LIFEWEAVE_AUDIT_REDUCED_MOTION=1`. Its representative
static captures compare against the same Light visual language; duplicate product-theme PNGs are not
tracked.

Vietnamese typography runs independently in Light mode with `LIFEWEAVE_AUDIT_LANGUAGE=vi`. It adds
a real accented Task and documented Life leaf, verifies accent-insensitive Settings-owned Search
reaches the Task, Life node and document, and compares the tracked UI/editorial goldens.

```powershell
$env:LIFEWEAVE_AUDIT_LANGUAGE = 'vi'
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

Before accepting a new or replaced PNG:

1. run the comparison without acceptance and inspect `target/visual-regression/diff/`;
2. explain the product or fixture change;
3. inspect the replacement at its original resolution;
4. generate only the intentionally missing baseline;
5. rerun comparison with acceptance disabled and require zero pixel difference.

Do not loosen comparison thresholds, auto-refresh existing goldens, or hide scrollbars to make a
failure pass. The checked-in metadata beside each platform set records the required environment.
