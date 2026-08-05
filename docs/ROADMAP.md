# Roadmap

## Task envelope

The roadmap remains fixed at **60 total tasks**. The Product Owner allocated Tasks 35–37 to Focus Plans without increasing the total count.

## Reserved next tasks

### Task 35/60 — Focus Plans A/B Prototype + Canonical Model Decision

Governance/prototype slice only. It must compare:

1. Focus Plan as a third Life document type;
2. Focus Plan as a standalone entity between Life and Task;
3. Focus Plan as a Basic Leaf template with metadata.

It must decide canonical ownership, navigation placement, lifecycle, phase/milestone semantics, Life relationships, Task relationships, draft/revision behavior, Search, backup/export boundaries, accessibility, and minimum schema impact.

No production Focus Plans implementation is authorized until the Task 35 decision is accepted.

### Task 36/60 — Focus Plans Core + Draft/Active Lifecycle

Reserved implementation slice, conditional on Task 35 acceptance.

Provisional minimum:

- create/edit/archive/restore;
- `Draft`, `Active`, `Paused`, `Completed`, `Archived`;
- start date and target date;
- desired outcome, `Why now`, success criteria, ordered phases, risks, and planning body;
- optional Life-area relationship;
- tags, Search, backup/restart persistence;
- dedicated Plans workspace only if Task 35 approves it.

### Task 37/60 — Focus Plan ↔ Task Integration + Review Workflow

Reserved integration slice, conditional on Task 36 acceptance.

Provisional minimum:

- bounded Task and recurring-series relationship policy;
- linked-Task projection in a Plan;
- Plan navigation from existing Task surfaces;
- current-phase work;
- weekly review;
- no fabricated progress percentage;
- no automatic Task generation, scheduling, or rescheduling.

### Tasks 38–60

Remain unallocated or governed by later accepted decisions. The total roadmap remains 60.

## Slice 024 — Post-Unified-Tags Expansion Decision (complete)

Task 34 closed a governance-only decision slice with no product code or schema change. Eleven candidates were evaluated under 16 hard filters, fourteen weighted criteria, and a deterministic nine-profile sensitivity model.

Original analytical recommendation: **Deadline Semantics + Deadline-Aware Planning Core**.

Product Owner disposition: **MODIFY**. ADR 0029 reserves Tasks 35–37 for Focus Plans. Deadline Semantics remains eligible and deferred rather than rejected.

Task 35 remains prohibited until Product Owner activation and a separate active specification.

## Latest implemented slices

- **Slice 023 — Unified Tags Core + Cross-Pillar Retrieval:** flat global tags for Tasks and Life nodes, archive/restore/merge/aliases, Search integration, and complete native lifecycle verification.
- **Slice 022 — Upcoming and Overdue Task Planning:** bounded Today/Upcoming/Overdue planning with recurrence authority and exact navigation.
- **Slice 021 — Lossless Portable Package:** one-document lossless package with canonical JSON, Markdown fallback, checksummed privacy-sanitized assets, and atomic import.
- **Slice 020 — Current-State Closure:** deterministic operational ledger and continuity evidence.
- **Slice 019 — Task/Life Relationships:** zero-or-one navigation relationship for one-off Tasks and recurring series.
- **Slices 017–018:** Narrative Template System and four static Narrative Visual Worlds.
- **Slices 013–016:** post-Narrative decision, multi-scene composition, release hardening, and native E2E refresh.
- **Slices 008–012:** Global Search, Basic Leaf heading Outline, Narrative schema prototype/core, and Narrative Markdown interoperability.
- **Slices 000–007:** Foundation, Task core, objective analytics, Life Browse/Edit, Basic Leaf, hardening, and first expansion decision.

## Historical roadmap

The exact roadmap snapshot present during Task 34 execution is preserved byte-for-byte at [`docs/roadmap-history/ROADMAP-through-task34-analysis.md`](roadmap-history/ROADMAP-through-task34-analysis.md). Accepted ADRs, audits, specifications, and Git history provide detailed per-slice authority.
