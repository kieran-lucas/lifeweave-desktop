# Roadmap

## Slice 026 — Focus Plans Core + Draft/Active Lifecycle (complete)

Task 36 implemented ADR 0030 as a standalone local entity with schema 20, lifecycle, variants/phases, revisions/recovery, shared tags, Search, full-database backup authority, generated IPC bindings, and a lazy Plans workspace.

Closure is based on deterministic migration/domain/frontend/backup/Search evidence, generated-binding stability, production build success, inspected persisted SQLite state, and Product Owner acceptance. Native Windows restart automation remains optional smoke coverage and is not a roadmap gate unless it exposes a reproducible product defect.

Hard boundary preserved: Task 37 did not enter Slice 026. No Task/series relation, review workflow, or automatic progress entered migration 20, DTOs, Search, or UI.

## Slice 025 — Focus Plans Architecture Prototype + Canonical Model Decision (complete)

Task 35 selected the standalone Focus Plan entity. ADR 0030 is canonical.

## Reserved positions within the 60-task roadmap

- **Task 36:** complete and hard-closed.
- **Task 37 — Focus Plan ↔ Task Integration + Review Workflow:** not started; requires a separate Product Owner gate.
- **Tasks 38–60:** available for later decisions.
- **Deadline Semantics:** eligible deferred candidate.

## Closure policy

Roadmap progression is blocked only by confirmed product risk, not by a flaky or nondiagnostic harness. Equivalent deterministic evidence may replace a named E2E command. After two reruns without new diagnostic evidence, tooling failure becomes non-blocking debt unless it reproduces a product invariant violation.
