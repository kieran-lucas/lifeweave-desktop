# Task 12 — Objective Analytics Core + Category Targets and Streaks

## Scope and execution identity

- Starting HEAD: `eeebe3fb37f8655412894a7faf23f4e39b0ab54a` on `main`.
- Implementation commit: `5835c5b2800530ed03b2f17407bd20cb4984500a`; the final pushed evidence HEAD is reported in the completion response.
- The roadmap named only Task 12/60. This execution title comes from the unopened objective Analytics contracts in source-of-truth §8.1–§8.8 and the remaining M3 scope.
- Included: scheduled-time period aggregates, category weekly minimum/target goals, completed-week attainment, category minimum/target streaks, completion distribution, Settings goal editing, and rebuild authority.
- Explicitly excluded: a total/productivity score, score bands or streaks, prediction, AI insight, actual-time claims, category CRUD, completion-state customization, notifications, Life System, and final branding.

## Migration and raw authority

Immutable migration 6 adds nullable weekly minimum/target minutes and optimistic `goal_revision` to category authority. Configured values are required together and constrained to `0 ≤ minimum ≤ target ≤ 10080`. `category_goal_history` versions the effective Monday and `category_goal_operations` makes a matching operation replay idempotent while rejecting mismatched reuse. Goal changes take effect at the start of the current local week; earlier completed weeks retain prior goal history.

Analytics is a distinct derived read model: `analytics_meta`, period/category/distribution aggregates, and category streak rows carry source revision and algorithm version. Raw one-off Tasks, series, overrides, category goal history, and evaluation snapshots remain reconstruction authority. Task create/update/delete, recurring create/mutate, evaluate/undo, and category goal update each bump source revision once in their transaction. Backup/restore carries a consistent snapshot; missing or stale derived rows rebuild from raw authority after reopen.

## Objective Analytics algorithm v1

- Week is Monday–Sunday; month and year use local calendar boundaries. Requests are bounded to 366 days.
- Scheduled minutes sum every independent projected Task duration, including simultaneous groups. It is planned scheduled time, never actual time. Task count likewise counts independent subjects.
- Projection includes one-offs, bounded recurring expansion, split series, moved-in overrides, and current occurrence evaluations; moved-out, cancelled, and archived series occurrences are excluded.
- Evaluated count uses current occurrence-aware evaluation. Missed requires the scheduled end to have passed under a Rust-checked machine-local clock and no current evaluation. Observation date/minute participates in aggregate freshness, preventing stale missed state when no write occurred.
- Completion distribution groups immutable evaluation label/visual snapshots. Hidden completion basis points do not cross the Analytics DTO.
- Completed weeks compare category scheduled minutes with the historical weekly minimum/target effective for that week. The current incomplete week is progress-only and cannot advance or break a streak.
- Only weekly category minimum and target streak families exist. Rust rebuilds current/longest lengths and start/break dates over a bounded 520-week history window. Unconfigured goals are excluded.
- Configured active categories remain visible with zero scheduled minutes, preserving honest shortfall and streak presentation.

The critical bounded query uses `tasks_by_date` under `EXPLAIN QUERY PLAN`; one IPC request returns a whole Week/Month/Year projection. There is no per-day/per-task renderer query or full-history rebuild per render.

## Typed boundary and UI

`get_analytics_projection` accepts fixed `week | month | year`, anchor local date, and a checked observation clock. `update_category_goals` accepts nullable minute goals, expected revision, and bounded operation ID. Both commands are manifest-registered, exact-permission granted to Windows `main`, skip renderer DTOs in tracing, and return sanitized errors. Generated TypeScript is the renderer boundary.

Analytics is now an editorial vertical flow with fixed tabs, bounded previous/next/current navigation, Scheduled time as the primary metric, objective counts, category attainment, the two restrained streak families, and a native progress visual with accessible table equivalent. Month/year views state completed-week attainment rather than multiplying weekly goals by a decimal month. Settings adds a narrow active-category goal editor with hour/minute controls, explicit save, stale-write protection, and accessible validation. TanStack Query owns projections/goals, prefetches adjacent periods only, and invalidates Analytics after relevant mutations.

## Exact verification evidence

- `pnpm install --frozen-lockfile`: passed with pnpm 11.17.0.
- `pnpm verify`: source hash, governance, 402-heading index/full coverage, CSP/no-remote, and exact command/capability parity passed.
- Frontend: typecheck passed; 7 files / 65 tests passed; Vite 8.1.5 production build passed (106 modules).
- Rust: check `--all-targets`, fmt check, and clippy `--all-targets -- -D warnings` passed.
- Rust full suite: 243 passed; task-focused 46; backup-focused 129; Analytics-focused 13; zero failures.
- Focused proof covers goal constraints/revision/idempotency, prospective history, exact-once source bumps, local period/leap/year boundaries, one-off/recurring/moved/cancelled aggregation, evaluated/missed/future classification, observation-clock freshness, configured-zero shortfall, completed-week attainment/streaks, stale/idempotent rebuild, injected rebuild rollback, indexed query plan, file reopen/reconstruction, and Analytics/goal backup-restore.
- Bindings were generated from Rust; no hand edits. `git diff --check` passed.
- Normal `pnpm tauri build` passed in 161.8 seconds and produced `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` without E2E features.
- Sentinel-contained native smoke used synthetic run `task12-smoke-4ae2170a865e46c297ef683baf7d23e6`. Native PIDs 21168 and 14820 each lived over 20 seconds; schema 6 and `analytics_meta` were verified; no fatal startup/migration/CSP/ACL/IPC/panic signature appeared; 18 owned processes per session were stopped; the contained profile was removed.
- File-backed Rust proves goals, derived reconstruction, aggregates, and backup/restore. Native WebDriver debt prevents automated DOM click-through in the real WebView; deterministic frontend tests prove interaction while native smoke proves startup, migration, relaunch, liveness, and containment.

## Security, performance, and remaining debt

- DTOs/logs contain no Task content, hidden completion value, SQL, path, RRULE, or invented score.
- No remote service, chart library, generic badge engine, notification authority, direct renderer SQL/path access, or raw `invoke()` was added.
- Derived tables are never authority; failed rebuild rolls back while raw data remains intact.
- Existing debt remains: F-04 Windows directory durability, F-05 backup publication durability, independent GitHub CI, and native WebDriver click-through evidence.
- The 520-week streak reconstruction horizon is documented bounded Core policy; longer historical reconstruction is future scalability debt.

Task 12/60 is complete when this implementation/evidence is pushed. No score, score streak, prediction, full Category Settings, M3 completion, whole Task System completion, or final design completion is claimed. The roadmap still does not name Task 13, so only Task 13/60 is the next allowed action.
