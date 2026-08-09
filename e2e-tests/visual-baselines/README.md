# Windows visual-regression baselines

These PNGs are approved production baselines for the native Tauri/WebView2 audit. Runtime
`actual` and `diff` images are written under `target/visual-regression/`; they are evidence, not
goldens, and remain untracked.

Comparison is opt-in so the normal geometry audit is unchanged. Baseline creation is a separate,
explicit action and is disabled by default.

The native runner pins the E2E presentation date to the baseline date while preserving the real
native date for concurrency-sensitive fixture commands. The visual service suppresses blinking
carets where the engine permits; the audit additionally blurs and restores a focused text-editable
for the comparison frame because WebView2 otherwise retains a 27-pixel native caret. Actual
comparison frames are saved under `target` for deterministic failure diagnosis;
normal audit screenshots retain the real focused-control caret.

```powershell
# Compare only. Missing or changed baselines fail; nothing is accepted.
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'

# Deliberately create a reviewed missing baseline. Never use this to erase an unexplained diff.
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
$env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES = '1'
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

For the tracked dark set, add `LIFEWEAVE_AUDIT_THEME=dark`. The native spec connects to the
session's WebView2 DevTools target, emulates `prefers-color-scheme: dark`, and hard-asserts the
production `matchMedia` result before capture. The connection is closed during teardown and does
not change the Windows theme.

```powershell
$env:LIFEWEAVE_AUDIT_THEME = 'dark'
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

Forced-colors uses the same scoped DevTools connection and production precondition. Its ten
tracked goldens cover the shell, native controls, Calendar, Analytics, Graph, Reader, a focused
editor dialog, Settings, Search, and Keyboard Help.

```powershell
$env:LIFEWEAVE_AUDIT_FORCED_COLORS = '1'
$env:LIFEWEAVE_VISUAL_REGRESSION = '1'
Remove-Item Env:LIFEWEAVE_ACCEPT_VISUAL_BASELINES -ErrorAction SilentlyContinue
.\scripts\run_windows_e2e.ps1 -Phases 'task50b-maximized-audit.e2e.ts'
```

Reduced motion is asserted independently with `LIFEWEAVE_AUDIT_REDUCED_MOTION=1`. The production
walk exercises all 36 states under `prefers-reduced-motion: reduce`. Its five representative static
captures are byte-for-byte identical to the light goldens, so duplicate PNGs are not tracked; the
labeled native audit artifacts are the durable execution evidence.

Vietnamese typography runs independently in light mode with `LIFEWEAVE_AUDIT_LANGUAGE=vi`. It adds
a real accented Task and documented Life leaf, verifies accent-insensitive Search reaches the Task,
Life node, and document, and compares four tracked UI/editorial goldens.

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
