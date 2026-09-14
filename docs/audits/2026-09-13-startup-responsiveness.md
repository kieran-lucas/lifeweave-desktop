# Startup and interaction optimization — 2026-09-13

The Product Owner requested faster startup and smoother interaction, then explicitly requested a
packaged replacement for the existing Desktop app. This is a bounded implementation amendment to
Slice 041. No product semantics, dependencies, DTOs, schema, capabilities, migrations, immutable
source, workflows, or workflow seal are changed.

## Changes and review

- `TodayScreen` now loads `TaskComposer` on demand. Its CSS, draft state, category query, validation,
  and create/update/delete/recurrence mutations live with the dialog. Draft input no longer updates
  the parent Today projection. Existing keyboard handling, focus restoration, invalidation,
  optimistic assessment, and Reduced Motion styles remain.
- `DeferredTaskComposer` loads the local module on mount and caches the resolved component. A
  production UI Automation check caught a first-open regression with a new Suspense boundary
  (median 396 ms versus 78 ms originally). The loader commits when the module resolves, reports
  loading, propagates import errors to the existing error boundary, and ignores completion after
  unmount. It does not preload composer code during startup.
- The Tauri generated handler runs on the blocking pool. The native window thread does not wait
  for synchronous services or SQLite. A shared mutex retains exclusion across complete synchronous
  handlers, including multi-query/file-publication operations. Existing async handlers keep their
  existing scheduling and DatabaseRuntime retains maintenance/admission authority. Unknown commands
  reject rather than leaving a promise pending; poisoned dispatch fails closed.
- The native lifecycle test also checks initial composer focus, Escape/focus return, document and
  viewport overflow, and captures the composer for inspection.

The dispatch rationale was checked against the installed Tauri 2.11.5 / tauri-macros 2.6.3 source
and [Tauri's command execution documentation](https://v2.tauri.app/develop/calling-rust/).
Default synchronous commands run on the native main thread; putting SQLite on another thread alone
does not prevent their caller from blocking while waiting for the result.

Existing uncommitted changes to `frontend/vite.config.ts`, `docs/PERFORMANCE_BUDGETS.md`, and
`docs/audits/2026-09-10-desktop-repackage.md` were preserved. They are not attributed to this change.

## Deterministic measurements

The new 200-row / 20-input regression test was run against the original source, then the optimized
source. Original source: **4,000** AssessmentControl renders during input; optimized source: **0**.
The original test fails its zero-render assertion, proving the fixture exercises the regression.
`target/perf-composer-before.log` records the baseline; `target/perf-focused.log` records the final
14 passing focused tests. jsdom timing is not a native frame-rate or input-latency measurement.

`python target/perf-verify-extraction.py` confirms exact source equivalence for draft construction,
invalidation, create/update/delete/recurrence, validation, the dialog JSX, and the moved composer CSS.
This supplements the existing tests rather than relying solely on new author-written tests.

The ordinary production build (no E2E date override) gives the following measurements:

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Startup JavaScript, raw bytes | 281,933 | 269,551 | -12,382 (-4.39%) |
| Startup JavaScript, deterministic gzip bytes | 86,043 | 83,170 | -2,873 (-3.34%) |
| Startup CSS, Vite rounded kB | 41.70 | 32.73 | approximately -21.5% |
| All JavaScript, raw bytes | 4,836,946 | 4,839,978 | +3,032 (+0.06%) |
| All JavaScript, deterministic gzip bytes | 1,397,099 | 1,400,097 | +2,998 (+0.21%) |
| Emitted JavaScript chunks | 144 | 148 | +4 |

The additional aggregate bytes are split-boundary overhead. TaskComposer is 10,572 raw / 3,386 gzip
bytes, deferred until use. The optimized startup CSS is 32,728 exact bytes. Evidence:
`target/perf-budget-before.json`, `target/perf-budget-after.json`, and `target/perf-metrics.json`.

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile` with `CI=true` | PASS; restored moved workspace dependency links using the lockfile; no dependency/lockfile change |
| `pnpm.cmd --dir frontend test src/features/task/today/TodayScreen.performance.test.tsx src/features/task/today/TodayScreen.test.tsx src/app/startupImports.test.ts --maxWorkers=1` | PASS, 14 tests |
| `pnpm.cmd --dir frontend typecheck` | PASS, exit 0; repeated by the final production build |
| `pnpm.cmd --dir frontend test src/features/task/today/TodayScreen.test.tsx --maxWorkers=1 --sequence.shuffle --sequence.seed=914` | PASS, 9 tests; composer checks await on-demand content instead of relying on earlier tests warming the module cache |
| `python target/measure-composer-baseline.py` | Original source fails as expected: 4,000 row renders; final files restored in `finally` |
| `pnpm.cmd --dir frontend test --maxWorkers=2` | 857 passed, 1 timeout, 60 files; the untouched Reader code-rendering test exceeded 20 seconds under memory pressure |
| `pnpm.cmd --dir frontend test src/features/life/document/render.test.tsx --maxWorkers=1` | PASS, all 17 tests including the timed-out case; no timeout or assertion was weakened |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib --locked -- --test-threads=2` | PASS, exit 0; 878 passed, 4 intentionally ignored; includes dispatcher, DB admission, migrations and backup/restore |
| `scripts/run_windows_e2e.ps1 -Phases @('phase1-lifecycle.e2e.ts', 'phase20-daily-ux.e2e.ts')` | PASS, 2 native specs on WebView2 152.0.4191.66: create/edit task, composer focus/Escape, layout bounds, Calendar/Plans/Life/Settings navigation |
| `python -m unittest discover -s scripts/tests` | PASS, 38 tests |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings` | PASS, exit 0 |
| `cmd /c "set CARGO_BUILD_JOBS=2&& pnpm.cmd tauri build > target/perf-release-build.log 2>&1"` | PASS, exit 0; final optimized release, ordinary date behavior, NSIS installer emitted |
| `pnpm.cmd verify` | PASS: source fingerprint, repository/project governance, source indexes, no remote assets, security and hardening |
| `git diff --check` | PASS |

## Native measurement limits and remaining debt

The Browser skill was read and initialized; discovery returned no browser and an empty browser
list. Native WebView2 verification uses the repository's Windows harness instead.

The first five startup trials coincided with compilation/memory pressure and are excluded from
comparison (`target/perf-native-before-contended.json`). The repeated baseline uses the same release
executable location and UI Automation helper, opens/closes the composer without saving, and closes
the app gracefully. These are Windows-session launches, not cold-boot measurements; the ready
metric means the enabled Plan task button was found, not that every Today query or animation ended.

The pre-change bundle gate was already red: 144 emitted chunks against a 43-chunk budget, duplicate
normalized Mermaid/KaTeX identities, and total JavaScript of 4,836,946 bytes against 1,130,173.
The lazy diagram engines remain outside startup. This task does not inflate aggregate or locked
ceilings to hide that pre-existing mismatch. The new deferred composer must be included in any
separately governed reconciliation of the full bundle inventory.

No separate independent agent review or physical DPI/Narrator matrix is claimed. The original-source
comparison, existing suites, native checks, and explicit residual debt are separate evidence classes.

The captured `target/e2e-artifacts/performance/task-composer.png` was visually inspected: the dialog,
form, schedule controls, context controls, scroll containment, and sticky footer retain their prior
composition. Native document/viewport horizontal overflow was zero. This is one actual Windows
configuration, not a full DPI or golden-image matrix.

After replacing the Suspense loader, all 14 focused tests and both Windows specs passed again
(`target/perf-focused.log`, `target/perf-e2e-final.log`, both commands exit 0). The updated screenshot
was also inspected. The existing application route error boundary handles loader failures.

After optimization the bundle gate still reports 52 violations (53 before). Startup `index.js` now
passes its existing operational maximum; the unbudgeted deferred composer and existing diagram
inventory still require governed budget reconciliation. No budget ceiling or gate was weakened.

The workspace had moved from an older directory. Stale Tauri build metadata referenced missing ACL
files there. `cargo clean --manifest-path src-tauri/Cargo.toml -p tauri` repaired the debug cache;
the release cache required the same command with `--release`. An escalated test rerun was needed
after Windows E2E created cache files that sandboxed Cargo could not overwrite. No source workaround,
capability change, or workflow change was used to bypass either environment issue.

## Installed release verification — 2026-09-14

`powershell -NoProfile -ExecutionPolicy Bypass -File target/perf-install.ps1` completed with exit 0
after the final production build. Installer: `src-tauri/target/release/bundle/nsis/Lifeweave_1.0.0_x64-setup.exe`
(6,565,938 bytes). Installation and Desktop replacement were explicitly authorized by the Product Owner.

- Installed executable: `C:\Users\kiera\AppData\Local\Lifeweave\lifeweave-desktop.exe`.
- Desktop shortcut: `C:\Users\kiera\OneDrive\Desktop\Lifeweave.lnk`; target verified, then launched
  using `Start-Process -FilePath 'C:\Users\kiera\OneDrive\Desktop\Lifeweave.lnk'` (exit 0).
- Installed bytes match the release exactly except the expected Tauri NSIS `UNK` → `NSS` bundle
  marker. Installed SHA-256: `044417BC8E4091DB43C136E45F82163BCBA9C4F37A935C1AD25FF37349535591`.
- A consistent SQLite backup and the original executable/shortcut are retained under
  `target/perf-safety-20260913/`. Both installations verified schema 33, integrity/foreign keys,
  and identical fingerprints for all 57 persisted tables. No task was saved during measurements.
- Evidence: `target/perf-install.log`, `target/perf-install-result.json`,
  `target/perf-data-before.json`, and `target/perf-data-after.json`.

Five launches per version on this Windows machine, with the same UI Automation helper and installed
executable path, produced the following. Parentheses show the observed minimum–maximum in milliseconds.

| Installed version | Enabled Plan task, median ms | First composer surface, median ms |
| --- | ---: | ---: |
| Original | 1,505 (899–3,130) | 78 (77–120) |
| Intermediate Suspense version, immediately before final update | 823 (760–2,290) | 390 (369–423) |
| Final on-demand loader | 880 (838–1,342) | 153 (91–163) |

Evidence: `target/perf-native-original-installed.json`, `target/perf-native-installed-before.json`,
and `target/perf-native-installed.json`. All launches responded, opened the composer, and closed
gracefully. Final measurement took place after compilation/E2E ended. These sequential Windows-session
samples are affected by caching and machine load; they do not establish cold-boot performance or a
guaranteed percentage speedup. The final composer still incurs a small point-of-use loading cost
relative to the original eager dialog; removing the Suspense boundary eliminated the much larger
first-open regression. The zero-row-rerender input result is independent of these timings.
