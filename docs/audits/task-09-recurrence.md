# Task 9 — Recurring task series and occurrence projection

Task 9 closure implementation includes bounded daily/weekly/monthly projection, interval/count/until handling, moved/cancelled overrides, typed occurrence scope mutation infrastructure, and Today projection alongside one-off tasks. Migration 4 remains immutable.

Evidence: Rust task-focused recurrence tests and frontend 25 tests pass; typecheck/build/verify/clippy pass. Generated recurring DTOs and ACL permissions are committed. Calendar month projection remains Task 10 scope.
