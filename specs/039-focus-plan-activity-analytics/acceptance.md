# Task 49 Acceptance

Task 49 closes only when all of the following are evidenced:

- schema remains 27 with no migration, persistent Plan analytics aggregate, or second
  source-revision system;
- the projection is read-only and writes no Plan, Task, occurrence, override, or evaluation state;
- attribution uses only the current `tasks.focus_plan_id` and `task_series.focus_plan_id`, and
  relinking demonstrably moves retrospective attribution without any stored snapshot;
- recurring series contribute one work item per generated non-cancelled occurrence, and
  cancel/move/`OnlyThisOccurrence`/`ThisAndFuture`/`EntireSeries` follow existing recurrence
  authority;
- evaluated, past-missed, and future semantics match Objective Analytics exactly and existing
  Objective Analytics output is unchanged;
- review attribution uses `reviewed_local_date`, same-date reviews count independently, a
  review-only Plan appears, and no review text reaches the DTO;
- completed linked one-off sessions contribute while running sessions do not, millisecond sum and
  per-Task floor match Task 46, and recurring work never enters the actual-time denominator;
- overall fields equal the exact sums of Plan rows, `work_item_count` equals one-off plus recurring
  occurrences, and `plan_count` equals the row count;
- archived, completed, and paused Plans with activity remain visible while no-activity Plans are
  absent;
- ordering is deterministic and more than 500 qualifying Plans is rejected rather than truncated;
- the read is bounded with no query per Plan, Task, occurrence, or review, and period boundaries
  match Objective Analytics;
- exactly one read-only IPC command exists with a narrow generated permission and Rust-owned
  generated bindings, and no raw invoke or content logging is added;
- Analytics remains the only Analytics destination, the section is lazy, `Open Plan` opens the exact
  Plan through the existing navigation authority, and the query key belongs to `["analytics", …]`;
- Focus Plan mutation and review creation invalidate `["analytics"]`;
- no percentage, progress, health, score, or automatic completion copy or field exists anywhere;
- accessibility evidence covers semantic heading, definition list, semantic Plan table, textual
  lifecycle and archive state, accessible `Open Plan` names, loading and error announcements, and
  zero applicable axe violations;
- focused Rust and frontend tests, Phase 20, full gates, native, RC, build, performance, and
  deliberate-break evidence are recorded under `AI_CONSTITUTION.md` §7;
- locked performance ceilings, dependencies, capabilities, workflow and seal, and Task 50 are
  unchanged;
- final worktree is clean and `HEAD == origin/main` with `product_owner_gate` closure state.
