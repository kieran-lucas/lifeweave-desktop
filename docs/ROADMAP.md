# Roadmap

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
- **Tasks 38–60:** available for later decisions; none is activated or recommended.
- **Deadline Semantics:** eligible deferred candidate.

## Closure policy

Roadmap progression is blocked only by confirmed product risk, not by a flaky or nondiagnostic harness. Equivalent deterministic evidence may replace a named E2E command. After two reruns without new diagnostic evidence, tooling failure becomes non-blocking debt unless it reproduces a product invariant violation.
