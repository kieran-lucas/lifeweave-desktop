# Task 46 Acceptance Mapping

Status: ACTIVE — evidence will be recorded in
`docs/audits/task-46-planned-vs-actual-analytics.md`.

## Authority and boundaries

- [x] ADR 0040 is implemented exactly: current Task scheduled date and category own attribution.
- [x] Only completed Task 43 sessions on existing one-off Tasks contribute.
- [x] Running/discarded sessions and recurring occurrences contribute nothing.
- [x] Schema stays 26; migrations 1–26, dependencies, capabilities, workflows, and seal are unchanged.
- [x] Existing `get_analytics_projection` is the only Analytics IPC.

## Arithmetic and denominator

- [x] Segment milliseconds sum per Task before flooring to whole seconds.
- [x] Overall actual seconds equal the category actual-second sum.
- [x] Tracked schedule is counted once per tracked Task, not once per segment.
- [x] Untracked scheduled Tasks stay in scheduled totals but not the tracked-plan denominator.
- [x] Zero-duration completion counts as one segment and one tracked Task with zero actual seconds.
- [x] Checked invalid/overflowing data returns one sanitized error without partial or fabricated data.

## Attribution and source revision

- [x] Cross-midnight sessions are not split and use current Task `local_date`.
- [x] Date/category edits move reporting attribution without rewriting session rows.
- [x] Task deletion removes contribution through the existing cascade.
- [x] First successful Stop closes and bumps Analytics source revision once in one transaction.
- [x] Start, Discard, repeated Stop, and failed backwards Stop do not bump.
- [x] Analytics algorithm version is 2 and stale v1 state rebuilds.

## Backend query and durability

- [x] One bounded grouped query produces actual-time Task rows per Analytics request.
- [x] `EXPLAIN QUERY PLAN` meaningfully proves intended index-backed access.
- [x] No query-per-Task/category/day/session and no renderer SQL/raw-session aggregation exists.
- [x] File-backed close/reopen returns the same projection.

## Frontend

- [x] Recorded actual time exposes Recorded time, Tracked plan, Variance, Tracked Tasks, and Completed
      segments with semantic structure.
- [x] No tracked Tasks yields the explicit empty state.
- [x] Variance text covers over, under, and matched without color-only meaning.
- [x] A non-zero sub-minute duration renders visibly as seconds.
- [x] Actual category detail appears only for tracked categories.
- [x] Transparency copy states completed-only, current-date/current-category attribution, and active
      exclusion.
- [x] Scheduled overview, category goals, streaks, and completion distribution retain scheduled
      semantics.
- [x] Successful timer completion invalidates Analytics and active time never appears as completed.
- [x] Applicable axe checks report zero violations; no live 1 Hz announcement is added.

## Performance and native evidence

- [x] Activation and final inventories are recorded; every locked ceiling and 10 KiB rule holds.
- [x] A formula-derived Task 46 budget is added only if required, preserving historical evidence.
- [x] Phase 17 creates two 60-minute Tasks, tracks one, and proves a 60-minute tracked plan while the
      scheduled overview includes both.
- [x] Phase 17 uses accessible UI only, asserts non-zero recorded time without exact wall-clock
      duration, and sees no application error.
- [x] A deliberate central projection break fails Phase 17 meaningfully; restoration proof passes
      with zero residue.

## Governance and closure

- [ ] Full required gates and activation-to-product diff review are recorded.
- [ ] Closure state records Task 46/Slice 036 closed, schema 26, product checkpoint, null active spec,
      and `next_action=product_owner_gate`.
- [ ] Task 47 remains prohibited, unstarted, unallocated, and unrecommended.
- [ ] Final `main` is clean with `HEAD == origin/main`.
