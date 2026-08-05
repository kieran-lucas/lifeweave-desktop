# Roadmap

## Slice 026 — Focus Plans Core + Draft/Active Lifecycle (active)

Task 36 implements the standalone authority selected by ADR 0030 in seven gated
phases: schema/domain, IPC, tags/Search/backup, lazy frontend, native
persistence, release/performance, and ten-round closure.

Current phase: migration 20 and Rust domain/data-safety authority.

Hard boundary: Task 37 is not part of Slice 026. No Task/series relation, review
workflow, or automatic progress may enter migration 20, DTOs, Search, or UI.

## Slice 025 — Focus Plans Architecture Prototype + Canonical Model Decision (complete)

Task 35 selected a standalone Focus Plan entity after executable A/B/C
prototypes, structural measurement, hard filters, sensitivity analysis, and ten
review rounds. ADR 0030 is canonical.

## Reserved positions within the 60-task roadmap

- **Task 36:** active under Slice 026.
- **Task 37 — Focus Plan ↔ Task Integration + Review Workflow:** not started;
  prohibited until accepted Task 36 authority and a separate Product Owner gate.
- **Tasks 38–60:** available for later decisions.
- **Deadline Semantics:** eligible deferred candidate.

## Latest implemented slices

- **Slice 023 — Unified Tags Core + Cross-Pillar Retrieval**
- **Slice 022 — Upcoming and Overdue Task Planning**
- **Slice 021 — Lossless Portable Package**
- **Slice 020 — Current-State Closure**
- **Slice 019 — Task/Life Relationships**

Detailed history remains available through accepted ADRs, audits,
specifications, archived roadmap snapshots, and Git history.
