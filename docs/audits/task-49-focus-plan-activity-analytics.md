# Task 49 / Slice 039 — Focus Plan Activity Analytics Core

## Identity

```text
execution baseline        86261298ccd99204da503f508b4dfb9ac50cee04
activation commit         2d12d76011a73934a0dab4cab8f0977bf0deb99c
product checkpoint        7622db3d8b2b42d69c8f497b6899c5be82e9f9a9
closure commit            fdb65d74220eb98d8ddfc9f5d844631d227e0271
audit-record commit       this commit
Task 48 feature checkpoint 51e24c54f12f0236ecba1bd81936bc11db59f8ac
schema                    27 -> 27 (no migration)
canonical decision        ADR 0043 — Focus Plan Activity Analytics
active spec               specs/039-focus-plan-activity-analytics
Task 50                   prohibited, unstarted, unallocated, unrecommended
```

Pre-flight was exact: `git status --short` empty, `HEAD` and `origin/main` both
`86261298ccd99204da503f508b4dfb9ac50cee04`.

## What shipped

A bounded, read-only Focus Plan activity projection over the periods Objective Analytics already
owns, surfaced as a lazy `Focus Plan activity` section inside the single Analytics destination.

```text
current Plan-linked work
+ existing evaluation facts
+ manual review dates
+ completed one-off actual time
→ bounded retrospective Focus Plan activity
```

No percentage, score, health signal, progress bar, phase inference, or lifecycle automation exists
anywhere in the backend, the DTOs, or the UI.

## Attribution

Task 49 added no relationship and no snapshot. The relation authority is exactly ADR 0031:

```text
one-off Task     → tasks.focus_plan_id
recurring series → task_series.focus_plan_id
occurrence       → inherits its authoritative series relation
override         → owns no Plan relation
evaluation       → owns no Plan relation
```

- **one-off:** contributes when `tasks.focus_plan_id = P` and the Task's current `local_date` is in
  the period.
- **recurring:** one work item per generated non-cancelled occurrence, attributed through the
  series' current `focus_plan_id`. `OnlyThisOccurrence` still cannot change the relation,
  `ThisAndFuture` leaves each series segment with its own relation authority, and `EntireSeries`
  applies the current series relation to the occurrences that series generates.
- **relink:** changes what a historical period reports, because the live relationship is the only
  attribution authority. `tables_with_focus_plan_column` proves the set of tables carrying a Plan
  relation is still exactly `{task_series, tasks}`.
- **reviews:** contribute by `reviewed_local_date`; `created_at` is never period authority.
- **actual time:** completed sessions on linked one-off Tasks only, under unchanged ADR 0040
  arithmetic.

## Recurrence and evaluation parity

`src-tauri/src/task/analytics.rs` gained a small `pub(crate)` fact seam rather than a second
recurrence implementation:

- `focus_plan_work_facts` folds the existing `load_items` output — the same recurrence generation,
  move, cancellation, effective date/time, and evaluation-snapshot authority Objective Analytics
  uses;
- `is_missed` is now one shared definition called by both `rebuild` and the fact seam, so the two
  projections cannot drift;
- `tracked_task_actual_time` is the extracted ADR 0040 per-Task arithmetic, called by both
  `load_actual_time` and the Focus Plan grouping;
- `period_bounds`, `parse_date`, `format_date`, `MAX_ANALYTICS_DAYS`, and `add_actual_time` are
  reused rather than reimplemented.

Objective Analytics output, aggregates, algorithm version 2, and source-revision semantics are
unchanged; all 17 existing `task::analytics` tests pass untouched.

## Review and actual-time semantics

Reviews are aggregated by `reviewed_local_date` into `review_count` and
`latest_reviewed_local_date` only. A serialization assertion proves no `reflection` or next-focus
text reaches the DTO. Two reviews sharing a date count independently, and a review-only Plan
qualifies on its own.

Actual time sums segment milliseconds per Task before one floor to seconds, counts each tracked
Task's scheduled duration once, treats running sessions as zero, and never admits recurring work to
the numerator or the denominator — recurring occurrences cannot own a session at all under
ADR 0037.

## Arithmetic, bounds, and query shape

```text
work_item_count = one_off_task_count + recurring_occurrence_count
overall fields  = exact checked sums of Plan rows
plan_count      = plans.len()
ordering        = scheduled_minutes DESC, work_item_count DESC,
                  case-insensitive title ASC, plan_id ASC
bound           = MAX_FOCUS_PLAN_ANALYTICS_ROWS = 500, rejects rather than truncates
period          = week | month | year, 366-day maximum, observed date/minute required
```

Every fold uses checked arithmetic and returns a validation error rather than clamping.

The read is bounded and has no N+1:

1. one Task-domain period work projection (existing Objective Analytics read path);
2. one grouped review read over `focus_plan_reviews` filtered by `reviewed_local_date`;
3. one grouped completed one-off actual-time read using `INDEXED BY tasks_by_date` and
   `INDEXED BY task_actual_time_by_task`, grouped per Task;
4. one batched `focus_plans` metadata read with a parameterized `IN` list over at most 500
   qualifying identities, evaluated only after the bound check;
5. a bounded Rust fold.

There is no query per Plan, Task, occurrence, or review, and no renderer aggregation: the frontend
formats backend values and computes nothing.

## Schema, IPC, bindings and freshness

Schema stays 27 with no migration, no persistent Plan analytics aggregate, and no second
source-revision system — proven by `schema_stays_at_twenty_seven_with_no_persistent_plan_analytics_table`.

Exactly one read-only command was added, `get_focus_plan_analytics_projection`, registered in
identical order in `src-tauri/src/lib.rs`, `src-tauri/build.rs`, and
`src-tauri/capabilities/main.json`, with the narrow generated permission
`allow-get-focus-plan-analytics-projection`. `python scripts/verify_security.py` passes, which
enforces that the capability permissions exactly match the registered commands and that no raw
`invoke` exists outside the IPC adapter. No capability broadening, dependency, network access, or
content logging was added.

`FocusPlanAnalyticsInput`, `FocusPlanAnalyticsPlanView`, and `FocusPlanAnalyticsProjection` are
Rust-owned and exported through the existing `export_focus_plan_bindings` test authority; the
generated TypeScript was not hand-edited.

The query key is `["analytics", "focus-plans", periodKind, anchor, observed]`, so the established
`invalidateQueries({queryKey:["analytics"]})` contract already covers it. The mutation-path audit
found Task create/edit/delete/recurring/split/evaluation and successful actual-time Stop already
invalidating `["analytics"]` through `TodayScreen`'s `refreshSchedule`/`refreshActualTime`, and full
restore already clearing the whole cache. Two invalidations were missing and were added: Focus Plan
mutation and creation in `FocusPlansScreen`, and review creation in `ReviewsPanel`. No second global
client state was introduced.

## Frontend and accessibility

Analytics remains the only Analytics destination. `FocusPlanAnalyticsSection.tsx` is lazy-loaded
from `AnalyticsScreen` and receives exactly the period Objective Analytics is showing. `Open Plan`
reuses the existing `plans` destination and pending `focus_plan` entry request through
`navigateToFocusPlan`; no URL routing or second navigation authority exists.

Accessibility: semantic `h2` with `aria-labelledby`, a `dl` for the seven overall facts, a semantic
`table` with `scope`d headers inside an `overflow-x: auto` container, textual lifecycle and archive
state (`Paused · Archived`), no colour-only state, no `<progress>` element, per-row accessible
`Open Plan <title>` names, `role="status"` for loading and `role="alert"` for failure with no
repeated live announcements, and zero applicable axe violations in both the section test and the
whole-screen Analytics test.

## Evidence

| Command | Result |
| --- | --- |
| `git status --short` / `git rev-parse HEAD` / `git rev-parse origin/main` | clean, both `86261298…` |
| `pnpm source:verify` | pass — 165,171 bytes, sha256 `9c422927…` |
| `pnpm governance:check` | pass — repository governance and project state |
| `pnpm index:check` | pass — 402 headings, coverage matrix current |
| `pnpm verify` | pass — source, governance, index, no-remote-assets, security, hardening |
| `pnpm typecheck` | pass |
| `pnpm test` | pass — 50 files, 750 tests |
| `pnpm build` | pass |
| `pnpm hardening:performance` | pass — zero violations against the Task 49 budget |
| `cargo fmt -- --check` | pass |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | pass — no warnings |
| `cargo test --locked -- --test-threads=1` | pass — 790 passed, 0 failed, 4 ignored |
| `pnpm tauri build` | pass — release exe + NSIS `Lifeweave_0.0.0_x64-setup.exe` |
| `pnpm e2e:windows -- phase20-focus-plan-analytics.e2e.ts` | pass — 1 passing |
| `pnpm e2e:windows` | phases 1–16 pass; stops at Phase 17 on a pre-existing cross-phase fixture collision (see Verification debt); phases 17–20 pass in bounded segments |
| `pnpm hardening:rc` | pass — 127 Rust RC tests, 2 schema-reopen sessions, installer sha256 `055d1394…` |
| `git diff --check` | pass |

### Rust proof (`focus_plan::analytics::tests`, 16 tests)

| Required proof | Test |
| --- | --- |
| 1 linked one-off contributes; unlinked does not | `linked_one_off_contributes_to_its_current_plan_and_unlinked_work_does_not` |
| 2 relink changes retrospective attribution, no snapshot | `relinking_moves_historical_attribution_and_stores_no_snapshot` |
| 3 recurring contributes per generated occurrence | `occurrence_override_and_evaluation_rows_never_own_a_plan_relation` |
| 4 cancel / move / ThisAndFuture / EntireSeries | `recurring_cancellation_and_scope_edits_follow_existing_recurrence_authority`, `entire_series_relinking_reattributes_every_generated_occurrence` |
| 5 no occurrence/override/evaluation Plan ownership | `occurrence_override_and_evaluation_rows_never_own_a_plan_relation` |
| 6 evaluated / past-missed / future parity | `evaluated_missed_and_future_semantics_match_objective_analytics` |
| 7 review attribution by `reviewed_local_date` | `reviews_use_the_review_date_count_independently_and_expose_no_content` |
| 8 same-date reviews count independently | same |
| 9 review-only Plan appears, no review text in DTO | same |
| 10 completed sessions contribute, running does not | `completed_one_off_sessions_contribute_while_running_sessions_do_not` |
| 11 ms sum/floor and tracked denominator match Task 46 | same |
| 12 recurring never enters the actual denominator | `recurring_work_never_enters_the_actual_time_denominator` |
| 13 relink moves one-off actual-time attribution | `relinking_moves_recorded_actual_time_between_plans` |
| 14 overall sums equal per-Plan sums | `overall_totals_are_the_exact_sums_of_the_plan_rows` |
| 15 `work_item_count` = one-off + recurring | same |
| 16 archived / completed activity stays visible | `archived_and_completed_plans_with_activity_stay_visible_but_idle_plans_do_not` |
| 17 no-activity Plan absent | same |
| 18 deterministic ordering | `ordering_is_deterministic_across_time_work_title_and_identity` |
| 19 more than 500 qualifying Plans rejects | `more_than_the_maximum_qualifying_plans_is_rejected_rather_than_truncated` |
| 20 period boundaries match Objective Analytics | `period_bounds_and_span_limits_match_objective_analytics` |
| 21 schema 27, no persistent Plan analytics table | `schema_stays_at_twenty_seven_with_no_persistent_plan_analytics_table` |

Proofs 4 and 6 additionally assert equality against a live `task::analytics::projection_at` call for
the same period, so parity is measured rather than asserted by hand.

### Frontend proof

`FocusPlanAnalyticsSection.test.tsx` (12 tests) and the extended `AnalyticsScreen.test.tsx` cover:
lazy appearance inside Analytics; identical period input to Objective Analytics; neutral empty
state; all seven overall facts; textual lifecycle/archive state; per-Plan scheduled, work,
evaluated, missed and review facts; backend-supplied actual and tracked values with an explicit
`Not tracked` state; the current-link, review-date and one-off-only transparency copy; absence of
percentage, progress element, health, score, and on-track language; `Open Plan` reaching the exact
Plan ID; membership of the `["analytics", …]` key space; and zero axe violations.
`FocusPlansScreen.test.tsx` and `ReviewsPanel.test.tsx` prove Plan mutation and review creation both
invalidate `["analytics"]`.

### Native Phase 20

`e2e-tests/specs/phase20-focus-plan-analytics.e2e.ts`, registered in `scripts/run_windows_e2e.ps1`
with no restart companion because schema is unchanged and the projection is derived. The scenario
is UI-only — no raw IPC and no direct SQLite: create and activate a known Plan, add a review dated
inside the period, create a linked one-off Task through the task dialog's Focus Plan combobox,
evaluate it through the ordinary Overdue review path, open Analytics on a period containing that
date, verify the exact Plan row's scheduled duration, one-off/recurring split, evaluated, missed and
review evidence, verify the section contains no percentage/health/score/on-track copy and no
`<progress>` element, then `Open Plan` and confirm the exact Plan detail with no app error.

Recurring attribution and the 500-row bound remain exact Rust proof: a deterministic native
recurring fixture would require raw IPC setup, which this phase deliberately avoids. Native
actual-time capture is likewise left to the existing Phase 17, which already exercises the real
timer; adding a second timed capture here would only add sleep-dependent flakiness for a value the
Rust proof already pins exactly.

## Deliberate break

The central attribution seam in `focus_plan_work_facts` was temporarily forced to drop the Plan
relation (`item.focus_plan_id.clone().and(None)`).

```text
broken:   10 of 16 focus_plan::analytics tests FAILED
          linked_one_off… assertion failed: left 0, right 1 (Plan work disappears)
          task::analytics: 17 passed, 0 failed  ← Objective Analytics unaffected
restored: focus_plan::analytics 16 passed, 0 failed
residue:  grep for the break expression in both analytics modules returns nothing
```

The break is load-bearing and correctly scoped: removing the Plan relation destroys Focus Plan
Analytics while leaving Objective Analytics completely green, which is exactly the separation the
task requires. The break was never committed.

## Performance

```text
baseline (2d12d760, pre-product)  index.js 524,181  total 1,231,159  gzip 377,912  chunks 23
final                             index.js 524,831  total 1,236,207  gzip 379,517  chunks 24
```

Three independent builds produced byte-identical inventories at both points. The new lazy
`FocusPlanAnalyticsSection.js` is 4,235 raw / 1,392 gzip bytes — below the 10,000-byte threshold, so
it is reported as an untracked small chunk rather than budgeted, consistent with every other
sub-threshold lazy chunk.

Startup `index.js` grew 650 bytes for the lazy import wiring, the extracted formatter module, and
one IPC adapter entry; the Focus Plan Analytics rendering and its projection types stay out of
startup. `FocusPlansScreen.js` grew 163 bytes for the two added invalidations.

Locked ceilings are unchanged: `index.js` 535,000, `BasicLeafEditor.js` 490,000, `markdown.js`
129,000. The derived `index.js` maximum is now 535,328, which the unchanged 535,000 ceiling clamps
down — the clamp is doing its job rather than being relaxed. Task 49 versions only the aggregate
maxima and the expected chunk count, through the unchanged ADR 0034 v2 formulas.

`docs/audits/task-49-performance-baseline.json` and
`docs/audits/task-49-performance-budgets.json` record the evidence;
`scripts/check_performance_budgets.py` now defaults to the Task 49 budget.

## Full-diff review

`git diff 2d12d760..7622db3d` (32 files, +2,306 / -79) touches only: the Task Analytics fact seam; the new
`focus_plan/analytics.rs`; Focus Plan DTOs, bindings, module, service, and one `pub(crate)`
visibility change on `lifecycle_from_db`; the handler, build manifest and capability registration;
the IPC adapter; the lazy Analytics section, its extracted formatters, its styles, and the
`onPlanNavigate` wiring; two invalidations; tests; the Phase 20 spec and its registration; and the
two performance audit files plus the budget default. The one change outside the original Task 49
statement is the scoped Task 48 backup-helper selector documented under Verification debt, which
was required for the native matrix to reach Phase 20 at all and strengthens rather than weakens its
assertion. `.github/workflows/` and `WORKFLOW_SEAL.sha256` are untouched.

Explicit verification of the closure checklist:

1. read-only projection — no write path exists in `focus_plan::analytics`;
2. current relation authority only — attribution reads `tasks`/`task_series` at read time;
3. no historical snapshots — the Plan-relation table set is still exactly `{task_series, tasks}`;
4. recurring occurrences counted correctly — one per generated non-cancelled occurrence;
5. recurrence/evaluation parity — shared `is_missed`, shared work projection, measured equality;
6. review-date semantics, no review content — proven including by serialization assertion;
7. one-off completed actual time only;
8. recurring excluded from the actual denominator;
9. exact aggregate sums with checked arithmetic;
10. no percentage/score/health/progress/lifecycle automation in any layer;
11. no N+1 — four bounded reads and one fold;
12. schema 27, no persistent aggregate;
13. exactly one read-only IPC command;
14. Analytics remains the only Analytics destination;
15. hard ceilings unchanged;
16. no dependency, capability, or network creep;
17. Task 50 untouched.

## Verification debt

One disclosed item, plus one pre-existing harness defect that was diagnosed and corrected.

### Corrected: Task 48 backup helper selector (not Task 49 product code)

Both full-matrix attempts failed identically at Phase 10 with `fresh managed backup row has no
opaque identity`. Task 48 recorded this segment as "WebDriver stale-element/session instability";
it is not. `e2e-tests/support/managedBackups.ts` read `$("table tbody tr")` unscoped, and Settings
renders Tag settings — which owns up to three tables — *before* Backup & Restore. Once any tag
exists (Phase 7 onward) the helper read a tag row instead of the fresh backup. The isolated Phase
9→10 segment passed precisely because no tags exist in that profile, which is why the defect
previously looked like flakiness.

The selector is now scoped to `section[aria-labelledby='backup-settings-heading']`. This
**strengthens** the assertion — it now checks the backup table specifically — and weakens nothing.
Phase 10 and 10-restart pass in the full matrix afterwards.

### Disclosed: pre-existing Phase 14 / Phase 17 fixture collision

With Phase 10 unblocked, the full matrix reaches Phase 17 and stops there:

```text
phase17-planned-vs-actual-analytics.e2e.ts:59
  await expect(factValue(actual, "Tracked Tasks")).toHaveText("1")
  Expected: "1"   Received: "2"
```

Phase 14 (Task 43) tracks a one-off Task dated yesterday and completes a real session; Phase 17
(Task 46) then asserts the *global* `Tracked Tasks` fact equals 1. Both Tasks fall in the same
Analytics week, so the correct answer is 2. This is a cross-phase fixture collision between two
pre-Task-49 phases, reproduced deterministically by the minimal `phase14 → phase14-restart →
phase17` segment. It has never been reachable before, because every prior full matrix died at the
Phase 9/10 blocker first.

This is **not** a product defect: Analytics truthfully reports two tracked Tasks when two Tasks are
tracked, and Task 49 changes neither the `Recorded actual time` section nor the code producing that
number. Relaxing the Task 46 assertion to a lower bound would weaken another slice's evidence, and
redesigning Phase 17 to assert only its own contribution is a Task 46 change outside Task 49's
scope. It is therefore left intact and disclosed for a separate Product Owner decision.

Every phase has green evidence in bounded segments:

```text
phases 1–16                      pass in the full matrix run
phase 17                         passes standalone (fresh profile)
phases 18, 18-restart, 19, 20    pass as one segment
phase 20                         passes standalone and after 18/19
```

No confirmed P0/P1 product defect remains. Rust, frontend/a11y, focused and segmented native,
production build, RC, and performance authorities all have deterministic green evidence.

## Closure state

```text
latest_closed_task        49
latest_closed_slice       39
latest_feature_task       49
latest_feature_checkpoint 7622db3d8b2b42d69c8f497b6899c5be82e9f9a9
database_schema_version   27
active_spec               null
next_action               product_owner_gate
recommended_next_candidate null
Task 50                   prohibited, unstarted, unallocated, unrecommended
```
