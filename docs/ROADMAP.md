# Roadmap

## Slice 030 — Release-Candidate Hardening + Evidence Baseline v2 (complete)

Task 40 activates the Hardening candidate ADR 0028 scored at 8.055 — the highest-ranked remaining
eligible candidate now that Deadline (8.420) and Saved Views (8.095) have shipped as Tasks 38 and
39. Unlike the remaining product candidates it is backed by reproduced debt rather than a product
hypothesis, and it is explicitly a release-quality investment rather than a feature.

Four bounded workstreams: a truthful versioned performance budget v2 that replaces the obsolete
aggregate JavaScript gate while preserving Task 16 history byte-identically; a green
all-target/all-feature Rust Clippy gate achieved by correction rather than suppression; native
Windows E2E evidence for Deadline and Saved Views including restart and full backup/restore; and
expanded machine-verifiable accessibility coverage plus an executable Windows Narrator/DPI protocol
that never reports an unobserved manual result as PASS.

Hard boundary held: product behavior unchanged, schema stays 23, no migration, no route/destination/
sidebar/card/dashboard/startup change, no dependency or lockfile churn, no workflow or seal change,
no lint suppression, test weakening, source-map removal, or arbitrary budget inflation. Task 40 is
not a feature checkpoint — the latest feature task remains 39 — and Task 41 is neither allocated
nor recommended.

Closure evidence is in `docs/audits/task-40-release-candidate-hardening.md`. Residual debt is
disclosed rather than implied: physical Narrator/DPI execution was not performed, native phases 6
and 6-restart are structurally un-runnable before 05:00 local time and were not executed, and two
findings — a rejected startup-size trade-off worth 65,218 startup bytes, and a P2 Saved View
selection defect surfaced by the new native evidence — are recorded for a Product Owner decision
rather than actioned inside this slice.

## Slice 029 — Task Saved Views + Bounded Typed Filter Core (complete)

Task 39 implements the Saved Views product runner-up recorded by ADR 0028 using the explicit
Product Owner model in ADR 0033. A Saved View filters exactly one existing bounded Today,
Upcoming, Overdue, or Deadlines projection through Rust-owned typed predicate v1, then applies
one stable sort and group mode. It is managed in a fifth internal Today tab; Today remains the
startup/default tab.

Schema 23 adds only standalone `task_saved_views`. Closure is supported by deterministic
migration, lifecycle, predicate, source-preservation, reference, navigation, query-shape,
accessibility, backup/reopen, generated-artifact, build, regression, and full-diff evidence.
No query language, generic
saved-query framework, unbounded/custom horizon, Search entity, sidebar route, dashboard/card,
sharing/sync, recurring deadline, analytics expansion, or Task 40 work is authorised.

## Slice 028 — One-Off Task Deadline Semantics + Deadline Queue (complete)

Task 38 activates the deferred Deadline Semantics candidate from ADR 0028 as the one-off-only
first slice that decision already framed.

```text
schedule = when the user plans to perform the work
deadline = the latest local date the work should be completed by

one-off Task → deadline: zero or one
recurring series/occurrence/override/evaluation → no deadline authority
```

Schema moves from 21 to 22 through an append-only migration. The slice adds an optional
deadline to the existing Task editor, deadline context on Today/Upcoming/Overdue/Search, and a
bounded Deadlines tab covering anchor -30 through anchor +14 inside the Today workspace.

Hard boundary preserved: existing Overdue kept its schedule-based meaning, recurring deadline
policy stays open, and no reminders, notifications, scheduling, deadline analytics, prediction,
Saved Views, or new destination entered migration 22, the DTOs, or the UI. Task 39 was not
activated.

Closure is based on deterministic migration, mutation, deadline-state, queue, Search, and
backup/restore evidence, generated-binding stability, production build success, and a full diff
audit against the activation baseline.

## Slice 027 — Focus Plan ↔ Task Integration + Manual Review History (complete)

Task 37 connects the existing product layers and completes the reserved Focus Plans program.

```text
one-off Task     → Focus Plan: zero or one
recurring series → Focus Plan: zero or one
occurrence/override/evaluation → inherited projection only
```

Schema moves from 20 to 21 through an append-only migration. The slice adds optional Plan
association in the existing Task editor, Plan context and navigation on Today/Upcoming/Overdue
rows, bounded Linked work and Reviews regions on Focus Plan detail, and create-and-read manual
review history.

Hard boundary preserved: no automatic progress, lifecycle automation, review scheduling,
analytics expansion, deadline semantics, or new destination entered migration 21, the DTOs,
or the UI. Task 38 was not activated.

Closure is based on deterministic migration, recurrence-authority, projection, review, and
backup/restore evidence, generated-binding stability, production build success, and a full
diff audit against the activation baseline.

Task 36 implemented ADR 0030 as a standalone local entity with schema 20, lifecycle, variants/phases, revisions/recovery, shared tags, Search, full-database backup authority, generated IPC bindings, and a lazy Plans workspace.

Closure is based on deterministic migration/domain/frontend/backup/Search evidence, generated-binding stability, production build success, inspected persisted SQLite state, and Product Owner acceptance. Native Windows restart automation remains optional smoke coverage and is not a roadmap gate unless it exposes a reproducible product defect.

Hard boundary preserved: Task 37 did not enter Slice 026. No Task/series relation, review workflow, or automatic progress entered migration 20, DTOs, Search, or UI.

## Slice 025 — Focus Plans Architecture Prototype + Canonical Model Decision (complete)

Task 35 selected the standalone Focus Plan entity. ADR 0030 is canonical.

## Reserved positions within the 60-task roadmap

- **Task 36:** complete and hard-closed.
- **Task 37:** complete and closed. The reserved Focus Plans program is finished.
- **Task 38:** complete and closed.
- **Task 39:** complete and closed at product checkpoint `374abcbae263be18fa785a56d656678f9bfd9c29`.
- **Tasks 40–60:** available for later decisions; none is activated or recommended. Task 40 is
  explicitly prohibited and unrecommended after Slice 029 closure.
- **Recurring deadline policy:** open; deliberately excluded from Slice 028.

## Closure policy

Roadmap progression is blocked only by confirmed product risk, not by a flaky or nondiagnostic harness. Equivalent deterministic evidence may replace a named E2E command. After two reruns without new diagnostic evidence, tooling failure becomes non-blocking debt unless it reproduces a product invariant violation.
