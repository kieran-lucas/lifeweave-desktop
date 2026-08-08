# Task 49 Execution Plan

Status: ACTIVE.

## Stage 0 — Activation and baseline

Verify clean exact remote parity at `86261298ccd99204da503f508b4dfb9ac50cee04`, read the
constitution, source integrity contract, Focus Plan and Analytics authority, ADR 0040, the Task 46
and Task 48 audits, and current recurrence/evaluation/review/actual-time code. Record ADR 0043 and
Slice 039, activate governance without product code, run source/governance/index gates, commit and
push, then measure the pre-product performance baseline.

## Stage 1 — Task-domain fact seam

Extend the existing Objective Analytics work projection so each generated work item carries its
current authoritative Focus Plan relation and whether it is one-off or a recurring occurrence, and
expose a small `pub(crate)` seam for period bounds and per-Task actual-time arithmetic. Existing
Objective Analytics output, aggregates, and algorithm version stay byte-identical.

## Stage 2 — Bounded Focus Plan projection

Add `src-tauri/src/focus_plan/analytics.rs` with Rust-owned DTOs, the qualifying rule, exact
aggregate sums, deterministic ordering, and the 500-row rejection. Reads are one work projection,
one batched Plan metadata read, one grouped review read, and one grouped completed one-off
actual-time read, folded in bounded Rust with checked arithmetic.

## Stage 3 — IPC and bindings

Add exactly one read-only command with a narrow generated permission, register it in the handler,
build manifest, and capability in identical order, and regenerate TypeScript bindings through the
normal test authority.

## Stage 4 — Lazy Analytics section and freshness

Add the lazy `Focus Plan activity` section to Analytics with semantic summary and Plan table,
textual lifecycle and archive state, transparency copy, `Open Plan` through the existing plans
destination and pending entry request, and the `["analytics","focus-plans", …]` query key. Audit
every mutation path that changes the projection and add only the missing invalidations.

## Stage 5 — Native and load-bearing evidence

Add and register Phase 20 covering Plan creation, one linked evaluated one-off Task, one dated
review, the Analytics Focus Plan activity section, factual evidence, absence of automatic progress
copy, and `Open Plan`. Temporarily force the central attribution seam to drop the Plan relation,
record the meaningful focused failure, restore, and prove zero residue.

## Stage 6 — Performance, full gates, and product checkpoint

Measure final output, derive the versioned Task 49 budget mechanically under unchanged locked
ceilings, run focused and full Rust, frontend, native, build, RC, governance, and diff gates,
review the activation-to-product diff, then commit and push `implement focus plan activity
analytics`.

## Stage 7 — Closure

Write `docs/audits/task-49-focus-plan-activity-analytics.md`, close governance at schema 27 with
Task 50 prohibited, commit and push closure, record the closure SHA in an audit-only commit, and
verify a clean worktree at remote parity.
