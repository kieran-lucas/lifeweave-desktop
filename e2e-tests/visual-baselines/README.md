# Windows visual-regression baselines

These PNGs are approved production baselines for the native Tauri/WebView2 audit. Runtime
`actual` and `diff` images are written under `target/visual-regression/`; they are evidence, not
goldens, and remain untracked.

Comparison is opt-in so the normal geometry audit is unchanged. Baseline creation is a separate,
explicit action and is disabled by default.

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

Before accepting a new or replaced PNG:

1. run the comparison without acceptance and inspect `target/visual-regression/diff/`;
2. explain the product or fixture change;
3. inspect the replacement at its original resolution;
4. generate only the intentionally missing baseline;
5. rerun comparison with acceptance disabled and require zero pixel difference.

Do not loosen comparison thresholds, auto-refresh existing goldens, or hide scrollbars to make a
failure pass. The checked-in metadata beside each platform set records the required environment.
