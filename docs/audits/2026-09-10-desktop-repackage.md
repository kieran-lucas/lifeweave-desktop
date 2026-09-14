# Desktop repackage and release asset reduction — 2026-09-10

Product Owner request: rebuild the current source, replace the installed application reached from
the Desktop shortcut, and prioritize startup responsiveness. Baseline source: `880d45b`.

## Change and evidence

`frontend/vite.config.ts` now emits hidden source maps only when `LIFEWEAVE_SOURCEMAPS=1`.
The installed Tauri code generator recursively embeds all distribution files, including `.map`
files; hidden maps were therefore shipped even though the runtime never requested them.
`docs/PERFORMANCE_BUDGETS.md` documents the opt-in diagnostic build and normal packaging path.

| Frontend artifact | Before | After |
| --- | ---: | ---: |
| Source map files | 127 | 0 |
| Source map bytes | 17,188,130 | 0 |
| Total distribution bytes | 23,572,166 | 6,384,036 |
| Runtime files, excluding source maps | 246 | 246 |

SHA-256 comparison of all 246 runtime files is identical before and after, including their paths.
The change removes 72.9% of raw distribution bytes without changing executable JavaScript, CSS,
fonts, images, HTML, product behavior, migrations, capabilities, dependencies, or the workflow seal.
The default entry remains 281,933 raw bytes. Its production source map has 50 sources and excludes
Tiptap, Mermaid, KaTeX, d3-hierarchy, the internationalized calendar engine, Life and Calendar routes.
Existing release settings retain one codegen unit, thin LTO, stripped symbols, and abort-on-panic.

## Commands and verification

Environment: Windows 11 Home Single Language 10.0.26200, Intel i3-1115G4, approximately 8 GB RAM.

- `pnpm.cmd test`: 857 passed across 59 frontend files. jsdom reports its existing canvas/navigation
  limitations; no failed tests. Log: `target/repackage-frontend-tests.log`.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 877 passed, 0 failed, 4 intentionally
  ignored. Includes migration, persistence, recovery and backup/restore tests.
  Log: `target/repackage-rust-tests.log`.
- `pnpm.cmd typecheck`: pass. Log: `target/repackage-typecheck.log`.
- `pnpm.cmd verify`: pass after the configuration/documentation change, including source integrity,
  repository governance, project state, specification indexes, remote assets, security and hardening.
  Log: `target/repackage-verify.log`.
- `git diff --check`: pass.
- `python target/repackage_data.py ... --backup ... --report ...`: consistent SQLite backup using
  the SQLite backup API, schema 33, integrity check `ok`, zero foreign-key errors, 57 table
  fingerprints. Private database copies stay in ignored `target/repackage-safety-20260910/`.

The first test/build shell wrappers reported exit 1 because Windows PowerShell treated redirected
native stderr as `NativeCommandError`; the tool logs above record the actual successful test
summaries. Subsequent command wrappers explicitly return `$LASTEXITCODE`.

## Existing performance verification debt — MEDIUM

`python scripts/check_performance_budgets.py` fails on the unchanged baseline runtime and the
same runtime after this change. Log: `target/repackage-performance.json`. The entry is 3,353 bytes
over its operational maximum; total JavaScript is 4,836,946 raw / 1,397,099 gzip bytes versus
historical maxima of 1,130,173 / 356,818. The existing editor/diagram implementation also introduces
unbudgeted lazy chunks and duplicate normalized `dist.js` / `katex.js` chunk identities.

This change does not raise any budget or remove existing diagram functionality to silence the
gate. These results are asset-budget debt, not a successful performance gate or proof of a startup
timing regression. A separately scoped review should attribute the current lazy graph, address
avoidable duplication, and reconcile approved functionality with the historical inventory.
Source-map exclusion proves packaging reduction; it does not by itself prove faster first paint.

## Final installer and installed application

`pnpm.cmd tauri build` completed with exit 0: optimized release profile, one Windows x64 NSIS
bundle. Log: `target/repackage-build-final.log`.

| Native artifact | Same-source baseline | Optimized release |
| --- | ---: | ---: |
| Application executable | 19,982,336 B | 16,662,528 B |
| NSIS installer | 9,914,360 B | 6,560,215 B |

The executable is 16.6% smaller; the installer is 33.8% smaller. These comparisons are against
the same current source with source maps enabled, not the older application previously installed.

Installer: `src-tauri/target/release/bundle/nsis/Lifeweave_1.0.0_x64-setup.exe`.
SHA-256: `058c99d54638eef4155e580f98113c061ec4ba8166c439ead9dedcf1d89a122b`.

`powershell -NoProfile -ExecutionPolicy Bypass -File target/repackage-install.ps1` ran the NSIS
installer with `/S /UPDATE` against the existing install directory; installer exit 0. The first
post-install hash comparison stopped because Tauri changes the three-byte bundle marker from
`__TAURI_BUNDLE_TYPE_VAR_UNK` to `__TAURI_BUNDLE_TYPE_VAR_NSS` in the packaged executable.
Byte comparison confirmed that these were the only three changed bytes, with identical file length.
The verifier now requires exactly one expected marker in each binary and an otherwise byte-identical
payload; it does not accept arbitrary differences.

`powershell -NoProfile -ExecutionPolicy Bypass -File target/repackage-install.ps1 -VerifyOnly`
then completed with exit 0. It verified the installed payload and existing Desktop shortcut,
ran three startup/composer/close cycles, and compared all 57 SQLite table fingerprints before and
after installation. Every fingerprint was unchanged; schema 33, integrity `ok`, no foreign-key
errors. The old installed executable and shortcut are retained alongside the consistent SQLite
safety copies in ignored `target/repackage-safety-20260910/`.

Installed executable SHA-256:
`7e6abc21f562fa14f12fa281478c58d46b73bd55b2054e450e257ef4356beee3`.
Installation evidence: `target/repackage-install-result.json`.
The installed hash was checked again when the task resumed on 2026-09-11 and remained identical.

## Native responsiveness observations

Windows UI Automation measured elapsed time from process launch until the main window appeared and
the enabled `Plan task` control was accessible. It then invoked that control, observed the composer
close control, dismissed the composer without saving, and closed the application gracefully.
All six baseline/final cycles responded successfully, with no core-unavailable or task-load error.

| Observation | Baseline (three trials) | Installed optimized release (three trials) |
| --- | --- | --- |
| Window appears | 631 / 142 / 88 ms | 769 / 85 / 90 ms |
| Today `Plan task` control ready | 2,378 / 904 / 978 ms | 2,776 / 1,044 / 1,272 ms |
| Composer control appears after invocation | 110 / 63 / 81 ms | 141 / 118 / 75 ms |

Logs: `target/repackage-startup-before.json` and `target/repackage-startup-after.json`.
The first final trial's separate `today_ms` label observation is null because the label was absent
on the preceding poll; the canonical Today composer control was found and successfully invoked.

These are three process launches per build in the same Windows session, with warmed filesystem and
WebView caches after the first launch, different executable locations, and UI Automation polling
overhead. They are not cold-boot, first-paint, animation-completion, or statistically significant
speedup measurements. The optimized sample is slower than the baseline sample: this pass establishes
a smaller package and working native interactions, **not an improvement in startup time**.
Observed repeat launches of the installed build reached the Today control in 1.04–1.27 seconds.

No separate agent review, full native E2E suite, DPI matrix, or Narrator sweep was run for this
configuration-only change. Runtime asset byte identity supplies the bounded visual regression
evidence; the existing bundle-budget failures remain disclosed above.
