# Task 46 — Planned versus Actual Analytics Core

## Scope and checkpoints

Task 46 / Slice 036 closes only the existing planned schedule → completed explicit one-off session
→ retrospective Analytics loop under ADR 0040.

```text
execution baseline: b5002c3b05232aa0b8ae74b924764f927cc00f1d
activation commit:  b71d6f3711e77511a8edd0f116d5dc27f4c4c1d6
product checkpoint: e7454241576f3c7284a3433db8844c0c5f208e52
closure commit:     51d341c1937ecfb3b85056ecf7356771b2a79c1d
schema:              26 → 26 (no migration)
```

The immutable source left actual-time aggregation policy OPEN. The Product Owner decision in ADR
0040 authorizes current Task scheduled date/current category attribution for this bounded Analytics
projection. It does not allocate any other actual-time extension.

## Shipped policy

- Completed Task 43 session rows are the sole actual-time authority.
- A row contributes only while its owning one-off Task exists and that Task's current `local_date`
  is inside the requested period.
- Current `tasks.local_date` owns the reporting date and current `tasks.category_id` owns category
  attribution. Session wall-clock dates and timezone do not select or split attribution.
- Running and discarded-active sessions contribute zero. A zero-duration completed segment counts
  as one completed segment and makes its Task tracked.
- Task deletion removes session history through the existing `ON DELETE CASCADE`; no snapshot is
  preserved.
- Each tracked Task contributes `(end_minute - start_minute) * 60` exactly once to tracked planned
  seconds, independent of segment count. Untracked Tasks remain in the established scheduled total.
- Session milliseconds sum per Task before one whole-second floor. Rust checked arithmetic folds
  per-Task rows into overall and category summaries and rejects invalid/overflowing authority.
- Overall actual seconds are checked against the sum of category actual seconds.
- The first successful Stop closes the row and bumps the existing Analytics source revision once in
  the same transaction. Start, Discard, replayed Stop, and backwards-clock refusal do not bump.
- `analytics::ALGORITHM_VERSION` is 2, so stale v1 scheduled aggregate state rebuilds naturally.

No schedule, evaluation, goal, streak, completion-distribution, score, recurrence, or immutable
session semantics changed.

## Backend and bindings

Rust owns generated `AnalyticsActualTimeSummaryView` with `i64` fields for actual seconds, tracked
scheduled seconds, tracked Task count, completed segment count, and variance. Non-null `actual_time`
is present on both `AnalyticsProjection` and every `AnalyticsCategoryView`; categories with no
tracked work receive the all-zero summary. Generated TypeScript bindings were produced through the
existing Rust binding test and were not hand-edited.

The existing `get_analytics_projection` IPC is reused. There is no second Analytics command, raw SQL
or raw-session aggregation in React, capability change, or renderer-side arithmetic authority.

One SQL statement per Analytics projection bounds Tasks with `tasks.local_date BETWEEN ?1 AND ?2`,
joins only completed session rows, and groups by Task. Rust folds those grouped Task rows into the
overall and category summaries. `EXPLAIN QUERY PLAN` proof checks for both `tasks_by_date` and
`task_actual_time_by_task`; it does not pin SQLite's full plan wording. There is no query per Task,
category, day, or session.

## Frontend

Analytics retains its period navigation, Scheduled overview, category scheduled goals, objective
streaks, and completion distribution. One semantic **Recorded actual time** section exposes:

- Recorded time;
- Tracked plan;
- textual Variance;
- Tracked Tasks;
- Completed segments.

The shared actual-time formatter keeps non-zero sub-minute values visible as seconds. Variance says
Over, Under, or Matched tracked plan in text. The empty state explicitly says there are no completed
actual-time sessions for one-off Tasks scheduled in the period. Transparency copy states that only
completed sessions count, current Task date/category own reporting, and running timers are excluded
until stopped. Tracked categories receive one compact recorded/plan/variance line; untracked
categories do not. Today timer mutations invalidate `['analytics']`, including successful Stop.

Applicable automated axe checks report zero violations. No focus trap, autofocus, motion, color-only
meaning, or 1 Hz live announcement was added. Physical Narrator and DPI observation were **NOT
RUN**; automated DOM checks are not represented as physical assistive-technology evidence.

## Regression evidence

### Rust

Focused Analytics: 17 passed. Focused actual-time lifecycle: 23 passed. Binding generation: 1
passed. Full serialized Rust gate: **737 passed, 0 failed, 4 ignored**.

The new cases prove multiple segments, per-Task pre-floor millisecond sums, multi-Task/category exact
totals, overall/category equality, one denominator contribution per tracked Task, untracked schedule
retention, active/discard exclusion, exact Stop revision transitions, cross-midnight attribution,
date/category movement without session rewrites, deletion cascade, zero-duration completion,
recurring exclusion, v1→v2 rebuild, both intended indexes, invalid/overflowing raw-authority
preservation, and file-backed close/reopen equality.

### Frontend

Focused Analytics/Today: **72 passed / 72**. The full frontend suite initially found a real stale App
fixture: its pre-Task-46 Analytics mock omitted the now-required non-null `actual_time`, while one
unrelated Life links case also timed out in its loading state. The fixture was updated to the
generated contract; App plus Life links then passed 29/29, and the full rerun passed **725/725 in 47
files**. Typecheck passed.

Coverage proves the explicit empty state, five facts, over/under/matched text, sub-minute seconds,
tracked-category-only detail, preserved scheduled goal/progress wording, running exclusion copy,
Analytics invalidation after timer completion, and zero applicable axe violations.

### Native Phase 17

`e2e-tests/specs/phase17-planned-vs-actual-analytics.e2e.ts` is registered exactly once after Phase
16 with no restart companion. It uses accessible UI only to create two current-date one-hour
one-off Tasks, track and stop only the first, and verify:

```text
Recorded actual time present
Tracked Tasks       1
Completed segments  1
Tracked plan        1h 0m
Recorded time       > 0 (observed 1s; exact elapsed time not asserted)
Scheduled overview  >= 2h 0m and >= 2 Tasks
application alerts  none
```

Phase 17 passed on the intact implementation before the deliberate break, after restoration, and
again on the final product worktree: **1 passing** on each run.

### Deliberate break

The central Rust fold was temporarily changed from `actual_seconds: total_ms / 1_000` to
`actual_seconds: 0`. Phase 17 failed at its meaningful recorded-duration assertion:

```text
phase17 line 63: expected recorded seconds > 0; received 0
```

Tracked Task count, completed segment count, and one-hour tracked plan had already passed. The
one-line break was restored. Focused Analytics returned 17/17, focused frontend returned 72/72,
and Phase 17 returned 1 passing with recorded `1s`. `git diff --check` and the product diff confirm
zero break residue.

## Command evidence

| Command | Result |
|---|---|
| `pnpm source:verify` | source SHA-256 `9c422927…9540a`; 165,171 bytes; 4,637 lines |
| `pnpm governance:check` | repository governance and Project State checks passed |
| `pnpm index:check` | 402 headings and full coverage matrix current |
| `pnpm verify` | source, governance, indexes, remote-assets, security, and hardening passed |
| `pnpm typecheck` | passed |
| `pnpm test` | 47 files; 725 passed; 0 failed |
| `pnpm build` | passed; 22 chunks |
| `pnpm hardening:performance` | Task 46 budget v2; no violations |
| `cargo fmt -- --check` | passed |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | passed |
| `cargo test --locked -- --test-threads=1` | 737 passed; 0 failed; 4 ignored |
| `pnpm tauri build` | release binary and NSIS installer produced; release compile 7m40s |
| `pnpm e2e:windows -- phase17-planned-vs-actual-analytics.e2e.ts` | 1 passing on final worktree |
| `pnpm e2e:windows` | run twice; nondiagnostic historical Saved Views timing failures; see debt |
| Phase 9→10 continuation substitute | four dependent specs passed in one shared data directory |
| `pnpm hardening:rc` | passed; two 25s native sessions; installer SHA-256 `fb65dd83…fd13a1` |
| `git diff --check` | passed |

## Performance

The activation inventory was recorded before product edits and was byte-identical across three
builds. The final inventory was also byte-identical across three independent production builds.

| Metric | Activation | Final | Task 46 maximum | Locked ceiling |
|---|---:|---:|---:|---:|
| `index.js` raw | 523,857 | 525,734 | 535,000 | 535,000 |
| total JS raw | 1,217,568 | 1,219,445 | 1,228,591 | — |
| deterministic gzip | 374,695 | 375,011 | 379,107 | — |
| chunk count | 22 | 22 | 22 | 22 |

The Task 46 maxima use ADR 0034's formulas exactly. The 10 KiB unknown-chunk threshold,
hash-independent identities, `BasicLeafEditor.js` 490,000 ceiling, `markdown.js` 129,000 ceiling,
and `index.js` 535,000 ceiling are unchanged. No new chunk appeared. Task 16/40/41/42/43/44
evidence remains historical; Task 45 used Task 44's budget unchanged. The checker default advances
only to the now-recorded Task 46 evidence, and its 18 self-tests pass.

## Verification debt

The monolithic `pnpm e2e:windows` harness did not produce an all-green single run after the allowed
attempt and rerun. The first run failed at historical Phase 9 Saved Views amid stale-element timing;
the unchanged Phase 9 spec then passed alone (1/1). The full rerun progressed farther and failed at
the dependent historical Phase 10 Saved Views setup around `E2E Secondary View`. Running Phase 10
alone demonstrated its documented dependency on Phase 9 state, so the deterministic substitute ran
Phase 9, Phase 9 restart, Phase 10 backup/restore, and Phase 10 restart together in one shared native
data directory; all four passed. Product/test semantics were not changed, and no third monolithic
rerun was attempted without new evidence under `AI_CONSTITUTION.md` §7.

This is disclosed native-harness debt, not claimed as a full-suite pass. Task 46's own Phase 17
passed three times and failed load-bearingly under the deliberate central break. Full Rust,
frontend, release build, performance, and RC gates are green.

## Full-diff and exclusion review

The activation→product checkpoint diff contains 20 bounded files, 1,535 insertions and 128
deletions. Review confirmed:

- completed one-off sessions are the only actual-time source and active sessions cannot leak;
- recurring work and recurrence identity are absent from actual-time Analytics;
- each tracked Task enters the denominator once and untracked Tasks remain scheduled-only;
- current Task date/category own attribution;
- Stop revision bump is exact-once and transactional;
- scheduled totals, goals, streaks, completion, evaluation, and scoring do not drift;
- schema 26, migrations 1–26, dependencies, capability files, workflows, and workflow seal are
  unchanged;
- no new IPC, route, destination, chart library, persistent aggregate, snapshot, generic reporting
  framework, surveillance, export, manual entry, or completed-segment editing was added;
- the actual-time read is one bounded grouped index-backed path;
- the final bundle is below every locked ceiling;
- Phase 17 is load-bearing;
- Task 47 is untouched, prohibited, unstarted, unallocated, and unrecommended.

## Closure state

Task 46 / Slice 036 is closed at schema 26. `active_spec` is null,
`next_action=product_owner_gate`, and `recommended_next_candidate` is null. Explicit one-off
stopwatch sessions and planned-versus-actual Analytics under ADR 0040 are DECIDED. Recurring actual
time, manual entry, editing completed segments, and every other actual-time extension remain OPEN
and unallocated.
