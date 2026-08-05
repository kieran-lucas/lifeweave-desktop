# ADR 0029 — Focus Plans Roadmap Allocation

## Status

Accepted for roadmap allocation.

Focus Plans architecture remains prototype-gated and is not yet accepted for production implementation.

## Context

Task 34 analytically recommended Deadline Semantics, while explicitly requiring a Product Owner `APPROVE / REJECT / MODIFY` decision.

The Product Owner introduced a higher-priority product problem: strategies lasting weeks to months, such as an “AI Foundations” concentration, are too temporary and operational to fragment the Life tree but too broad and structured to be ordinary Tasks or unstructured notes.

The existing 60-task roadmap has unstarted positions 35–60. Adding a new program does not require increasing the total.

Open Decision issue: `#1`.

## Decision

Use the Product Owner `MODIFY` disposition.

Keep the roadmap total at **60 tasks** and reserve:

```text
Task 35 — Focus Plans A/B Prototype + Canonical Model Decision
Task 36 — Focus Plans Core + Draft/Active Lifecycle
Task 37 — Focus Plan ↔ Task Integration + Review Workflow
```

Tasks 38–60 remain available for later decisions.

Deadline Semantics remains an eligible deferred candidate. It is not rejected or rescored.

## Conceptual boundary

```text
Life = durable areas and direction
Focus Plan = medium-term strategy, concentration, or campaign
Task = concrete scheduled or actionable work
```

A Focus Plan must not automatically become:

- a temporary subtree of Life nodes;
- a single oversized Task;
- a plain note with hidden workflow semantics;
- an unbounded dashboard;
- a source of fabricated completion percentages.

## Task 35 alternatives

Task 35 must compare at least:

1. a third Life document type;
2. a standalone Focus Plan entity between Life and Task;
3. a Basic Leaf template with metadata.

The Product Owner currently prefers option 2, but the prototype and architecture evidence may reject or modify it.

## Task 35 required decisions

- canonical authority and persistence model;
- navigation placement;
- Plan-to-Life cardinality;
- Plan-to-Task and Plan-to-series cardinality;
- lifecycle and archive/restore;
- start and target dates;
- ordered phases/milestones;
- planning body schema;
- drafts/revisions/recovery;
- Search, tags, backup, export, and portability;
- accessibility;
- performance bounds;
- migration, IPC, test, and native E2E impact.

## Consequences

- `PROJECT_STATE.recommended_next_candidate` becomes `focus_plans_architecture`;
- Task 35 remains unstarted until separately activated;
- Task 36 and Task 37 remain conditional reservations, not implementation authority;
- no product code, migration, route, IPC, capability, dependency, or generated binding changes in this decision;
- the total roadmap remains 60.

## Rollback

A later Product Owner decision may release or reassign Tasks 35–37 without schema or data rollback because this ADR changes governance only.

## Next action

Product Owner gate for activation of a bounded Task 35 prototype/decision specification.
