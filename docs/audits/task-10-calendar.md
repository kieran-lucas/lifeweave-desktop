# Task 10 — Week Strip + Calendar Month Projection

## Scope and implementation

- Starting HEAD: `68b757c264af593b0399ee214c0e72bb36512a40`.
- Implementation commit: `af2ba267a3ab5af4b4b1e0a9a88005a9b65adbeb`.
- Scope: selected local-date navigation, the Today Week Strip, and the bounded Calendar month projection. No evaluation, Analytics, reminders, Life System, or general scheduler behavior was added.
- Date arithmetic is owned by exact-pinned `@internationalized/date 3.12.2`; date-only values remain ISO local dates and are never converted through UTC midnight.

## Selected-date and navigation design

`App` owns one session-only `selectedDate`. Today initializes it from the machine-local calendar date, the Week Strip updates it without remounting the shell, and Calendar activation sets it before returning to Today. Today queries and Create Task defaults both use the selected date. Task collections remain TanStack Query server state rather than navigation-store data.

The Week Strip contains exactly seven date buttons with locale weekday labels. Previous/next controls shift exactly one week. Today uses `aria-current="date"`; selection uses `aria-pressed`, so the states remain distinct.

## MonthProjection v1

The typed `get_month_projection` IPC command executes once on the SQLite worker for a requested month. It returns every date in that month with flags, task count, scheduled minutes, at most three ranked category icon keys, an extra-category count, three period load ratios, and an operational missed marker. No task title, description, SQL, or path crosses this projection boundary.

The backend issues four bounded set queries (categories, one-offs, active series, and relevant overrides), then uses the existing RFC 5545 recurrence engine across at most one calendar month. It includes one-offs, recurring occurrences, and moved-in overrides; moved-out, cancelled, and archived occurrences are excluded.

Aggregation algorithm version 1 is deterministic:

- planned durations are summed for `scheduled_minutes`;
- category rank is duration descending, highest priority descending, then stable category ID ascending;
- period load is the union of interval intersections divided by Morning 480, Afternoon 360, and Evening 360 minutes, clamped to `[0,1]`, so simultaneous exact groups do not overfill;
- a past date with at least one projected item is marked operationally unevaluated until evaluation storage exists.

## Calendar interaction and accessibility

Calendar is a separate destination with a locale month label, previous/next month controls, and a Today action. Its CSS Grid contains seven semantic column headers and five or six weeks. Leading/trailing dates have reduced emphasis. Cells show only aggregate schedule metadata, local category icons, `+N`, native progress-bar load summaries, and a text-equivalent missed marker.

The grid uses roving `tabIndex`. Arrow keys move by day/week, Home/End move within a week, PageUp/PageDown change month with day clamping, and Enter/Space activates the focused date. Today and selected cells expose separate `aria-current` and `aria-selected` semantics. Calendar activation never opens Create.

TanStack Query keys contain month, selected date, and today. Adjacent months are bounded-prefetched; schedule mutations invalidate both day and month projection families.

## Commands and exact evidence

- `pnpm install --frozen-lockfile`: passed.
- `pnpm verify`: source integrity, repository governance, 402-heading index/full coverage, and security command/capability parity passed.
- Frontend: typecheck and production build passed; 5 files / 41 tests passed.
- Rust: `cargo check --locked --all-targets`, fmt check, and clippy `-D warnings` passed.
- Rust full suite: 219 passed, 0 failed.
- Task-focused suite: 24 passed, 0 failed.
- Backup-focused suite: 127 passed, 0 failed.
- Generated TypeScript binding check and `git diff --check`: passed.
- Normal production `pnpm tauri build`: passed in 2m45s release compilation; NSIS artifact `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`.
- Sentinel-isolated native launch: PID 13900 remained alive 21 seconds, created only the synthetic SQLite profile, emitted no captured startup/migration/CSP/ACL/panic signature, then its owned process tree was stopped and the contained profile removed.

The unresolved native WebDriver attachment prevents automated DOM driving inside the native WebView; this smoke therefore does not claim native click-through automation. The same Week Strip, Calendar activation, query-change, Create-default, aggregate rendering, and keyboard contracts are covered deterministically in frontend tests, while real SQLite projection is covered in Rust tests.

## Remaining non-blocking debt

- F-04 Windows directory durability strengthening.
- F-05 backup publication durability barriers.
- Independent GitHub CI.
- Native WebDriver attachment and automated native click-through proof.
- Persisted evaluation/missed-state authority belongs to a later task; Task 10 only exposes the documented operational v1 marker.

## Verdict

Task 10/60 is complete. Completion evaluation, Analytics, missed-state persistence, the whole Task System, and final visual design are not declared complete. Task 11/60 is the only allowed next action; its title is intentionally not inferred because the live roadmap does not name it.
