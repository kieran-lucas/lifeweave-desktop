# Task 9 — Recurring Task Series and Occurrence Editing

## Scope and implementation HEAD

- Corrective closure started from `179874851372d781aa86acca4cb282e014b447d4`.
- Verified implementation commit: `9a12ed933bda7b064f0baa64abad9bc26b0c21d4`.
- Migration 4 was preserved unchanged. One-off tasks remain in `tasks`; recurring authority remains in `task_series` plus `task_occurrence_overrides`.

## Recurrence engine and bounds

- Rust owns parsing and expansion through exact-pinned `rrule 0.14.0` with `chrono 0.4.45`.
- Persisted rules are RFC 5545-compatible `RRULE` values paired with local-date `DTSTART`; legacy numeric weekdays from the partial implementation are normalized before parsing.
- Creation supports daily, weekly, and monthly frequency; interval; weekly weekdays; and never/count/until termination. Preview is capped at five dates and scans at most 366 days.
- Conflict validation uses a deterministic 366-day horizon. A single engine expansion is capped at 1,024 occurrences; malformed rules fail closed.

## Identity, projection, and mutations

- Stable occurrence identity is `series_id + original_local_date`; moved occurrences retain that identity.
- `list_today_items` is the backend-owned unified projection. Generated `TodayItemKind` prevents renderer inference from punctuation in IDs.
- Moved-out occurrences disappear from the original date, moved-in overrides appear on the replacement date, and cancelled overrides are excluded.
- Only-this edits/cancels upsert one override transactionally.
- This-and-future edits atomically truncate the old rule, create the new series, and transfer future overrides. Explicit transferred overrides remain projectable if the new cadence changes. Delete truncates without archiving earlier history.
- Entire-series edit updates the active master and preserves explicit overrides; delete archives rather than hard-deleting it.
- One-off and recurring writes validate each other. Exact intervals group, touching intervals remain valid, and partial/enclosing overlaps fail without partial writes.

## Today UI closure

- Creation sends user-selected interval, weekdays, count, and until values rather than constants.
- Recurring rows preserve typed series/original identity and expose an accessible recurrence indicator.
- Save and Delete both require one of the three generated scopes. Recurring Delete never calls the one-off delete command.
- Draft and scope remain open after validation/conflict errors. One-off behavior remains unchanged.

## Command evidence

- `pnpm verify`, `pnpm typecheck`, `pnpm build`: passed.
- Frontend: 3 files, 30 tests passed.
- `cargo check --locked --all-targets`, fmt, and clippy with `-D warnings`: passed.
- Rust: 214 tests passed; task-focused 19 passed; backup-focused 127 passed.
- Generated TypeScript bindings and Tauri permission were regenerated from Rust; security command/capability parity passed.
- `pnpm tauri build`: passed. NSIS: `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`.
- Isolated native launch used a sentinel-contained `target/e2e-data/task09-smoke-<redacted>` profile. Vite and native process launched, remained alive 20 seconds, showed no pre-shutdown startup/migration/CSP/ACL/IPC/panic match, and the synthetic profile was safely removed.
- File-backed smoke `task09_file_smoke_reopens_weekly_override_cancel_and_split_without_duplicates` created a non-default weekly series, moved and cancelled individual occurrences, split this-and-future, reopened SQLite, and proved persistence without a boundary duplicate.

## Remaining debt and boundary

- Existing non-blocking debt remains: F-04/F-05 durability hardening, independent GitHub CI, and native WebDriver attachment.
- Calendar month UI, missed-state maintenance, completion assessment, Analytics, and the whole Task System are not declared complete.
- Task 10 owns only Week Strip and Calendar Month Projection.
