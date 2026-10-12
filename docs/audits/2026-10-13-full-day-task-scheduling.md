# Full-day Task scheduling verification — 2026-10-13

Authority: Product Owner request and [ADR 0056](../adr/0056-full-day-task-scheduling.md).

## Change and review

The shared Start/End picker adds hours 00–03. Rust's shared range validator accepts
`0 <= start < end <= 1440`, and the one-off validation message matches. This covers creation,
editing, recurring series, and occurrence edits without changing SQL, schema, generated bindings,
IPC, dependencies, recurrence rules, or conflicts. Full diff review confirmed these boundaries.

SQLite's released Tasks CHECK already accepts this range. Existing schedules are never rewritten.
Calendar load bands remain unchanged; the request concerns time selection and persistence.
Source integrity and sealed workflow checks pass. Pre-existing cursor asset/CSS changes in the
working tree were left untouched and are outside this change.

## Command evidence

| Command | Result |
| --- | --- |
| `npm.cmd install --global pnpm@11.17.0` | PASS; installs global pnpm for ADMIN using the existing npm user prefix/PATH |
| `pnpm --version` in repository and `C:/Users/ADMIN` | PASS; `11.17.0` |
| `powershell -NoProfile -Command "pnpm --version"` | PASS; `11.17.0` |
| `cmd /d /c "pnpm --version"` | PASS; `11.17.0` |
| `pnpm verify` | PASS; source fingerprint, repository/project governance, source index/coverage, no remote assets, security, hardening |
| `pnpm build` | PASS; TypeScript and Vite production build |
| `pnpm --dir frontend test src/features/task/today/TaskSchedulePickers.test.tsx src/features/task/today/TodayScreen.test.tsx --maxWorkers=1` | PASS; 30 tests in 2 files |
| `cargo test --manifest-path src-tauri/Cargo.toml task:: --lib` | PASS; 129 tests, 1 existing ignored release-performance test |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| `python target/full-day-time-check/browser_check.py` | PASS; Edge 155.0.4283.45 |
| `git diff --check` | PASS |
| `pnpm tauri build --no-bundle` | PASS; optimized Windows application, release compilation 10m 58s |

Relevant Rust regressions: `task_boundaries_and_dates`,
`full_day_one_off_times_round_trip_and_keep_conflict_rules`, and
`full_day_recurring_times_and_early_overrides_round_trip`. Frontend coverage includes selecting
00–03 with keyboard Home/arrows, exact minutes, date-preserving early Task editing, one-off and
daily Task submission at 00:00–00:01, end-only 24:00, focus restoration, and axe checks.

## Browser observation

An isolated temporary harness mounted the actual production picker component through Vite.
The check selected Start 03:00 → 00:00, End 00:01, and End 24:00 with a minute maximum of 0;
it also measured no document horizontal overflow. Screenshots were visually inspected at
`target/full-day-time-check/midnight-start.png` and `end-of-day.png`. The temporary frontend
harness and helper servers were removed/stopped after verification. The check used the cached
EdgeDriver with build-version checking disabled because the installed Edge had advanced to 155.

## Verification limits

- An initial parallel component run passed 29 tests and timed out on the existing animated End
  key test. The picker file then passed 17/17 alone; the final sequential two-file run passed 30/30.
- jsdom emits its existing canvas `getContext` warning during axe checks; the axe assertions pass.
- The production build reports its existing large-chunk advisory.
- Physical Windows DPI and Narrator speech: NOT RUN. Browser observation and automated
  accessibility checks are separate from those evidence classes. Installed-app startup and
  accessible control availability were observed after deployment, as recorded below.
- Independent human review: NOT RUN. The implementing agent reviewed the full scoped diff and
  used existing Task regression tests plus browser observation as additional evidence.
- The Product Owner requested replacing the existing Desktop shortcut with this build;
  deployment evidence is recorded below. Commit/push to main was subsequently explicitly
  authorized; only the 11 scheduling, test, and documentation files belong to that commit.

## Desktop deployment

The Product Owner explicitly requested deploying the finished build over the existing Desktop
shortcut. `target/full-day-time-check/deploy.ps1` replaced the installed executable and rewrote
the existing `Lifeweave.lnk` at the same Desktop location. Source, staged, and installed executable
SHA-256 matched:

`2c1fadb7865f81a60f18f1048e4d30471e81b2363babfb49d8a149577041cda0`.

The old application's native Close request and accessible Close control did not terminate its
process. Before stopping that exact process, UI Automation confirmed no Edit controls were open,
and Python's SQLite backup API created and integrity-checked a consistent recovery snapshot.
The prior executable and shortcut were preserved under the ignored
`target/full-day-time-check/deployment/` directory. The replacement was staged in the installation
directory and applied with `File.Replace`; a first attempt with PowerShell's null backup argument
failed before replacement, then succeeded with explicit backup paths.

The Desktop shortcut launched the new installed executable. Its process was responsive, its
accessible controls included Today and Plan task, and its binary hash matched the release.
`python target/full-day-time-check/deployment_data_check.py after` passed after launch:
SQLite quick check `ok`, no foreign-key violations, and unchanged counts/hashes for all 44
non-derived tables relative to the pre-deployment snapshot. Search/analytics projections were
excluded from the authoritative-data comparison because ordinary startup may refresh them.
No personal content was written by verification and no application data or assets were replaced.
