# Task 9 — Recurring task series and occurrence projection

Task 9 remediation continues from the partial implementation. Migration 4 remains immutable; bounded daily/weekly/monthly projection now evaluates interval, count, until and override/cancellation state, and typed occurrence mutation scope infrastructure is present. Today queries recurring projections alongside one-off tasks.

Evidence: Rust task-focused tests now include recurrence expansion and leap-boundary cases; frontend 25 tests pass; typecheck/build/verify/clippy pass. Generated recurring DTOs and ACL permissions are committed. Full only-this/this-and-future UI split semantics and Calendar month projection remain open Task 9 work and Task 10 is not unlocked.
