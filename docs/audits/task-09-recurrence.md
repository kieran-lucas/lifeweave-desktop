# Task 9 — Recurring task series and occurrence projection

Implemented migration 4 with backend-owned `task_series` and `task_occurrence_overrides` tables, typed recurring-task creation and bounded Today occurrence projection. Recurrence rules are constrained to daily, weekly and monthly forms; no unbounded materialization is performed. The Today dialog exposes an optional recurring section while preserving the one-off default.

Evidence: Rust 198 tests pass, task-focused tests pass, frontend 25 tests pass, typecheck/build/verify/clippy pass. Generated recurring DTOs and ACL permissions are committed. Calendar month projection, occurrence scope editing/splitting, reminders and completion evaluation remain Task 10+ scope.
