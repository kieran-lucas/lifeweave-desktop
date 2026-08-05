# Lifeweave AI Project Handoff

## Authority

- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- latest product checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- schema: 19
- latest closed task/slice: 34 / 024
- active specification: none
- Product Owner disposition on Task 34 recommendation: `MODIFY`
- recommended next candidate: `focus_plans_architecture`
- roadmap envelope: 60 total tasks
- reserved tasks: 35–37
- next action: Product Owner gate for Task 35 activation
- Task 35: not started and prohibited without a separate active specification

## Immutable source

- path: `docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`
- SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- bytes/lines/headings: 165,171 / 4,637 / 402

## Product Owner roadmap modification

Task 34 analytically recommended Deadline Semantics. The Product Owner used the explicit `MODIFY` option and reserved the next three positions for Focus Plans while keeping the total roadmap at 60:

```text
Task 35 — Focus Plans A/B Prototype + Canonical Model Decision
Task 36 — Focus Plans Core + Draft/Active Lifecycle
Task 37 — Focus Plan ↔ Task Integration + Review Workflow
```

Deadline Semantics remains an eligible deferred candidate. It was not invalidated by the Product Owner decision.

Open Decision authority: GitHub issue `#1`.
Accepted roadmap-allocation authority: ADR 0029.
Original Task 34 analytical authority: ADR 0028 and Slice 024 results.

## Focus Plans problem statement

Medium-term strategies lasting weeks to months are too operational and temporary to fragment the Life tree, but too broad and structured to behave as ordinary Tasks.

Target conceptual layer:

```text
Life = durable areas and direction
Focus Plan = medium-term strategy, concentration, or campaign
Task = concrete scheduled or actionable work
```

Example:

```text
Life area: AI / Computer Science
Focus Plan: AI Foundations — August to December 2026
Phases: mathematics → classical ML → neural networks → capstone
Tasks: study sessions, exercises, and projects
```

## Task 35 required comparison

A. Third Life document type  
B. Standalone Focus Plan entity between Life and Task  
C. Basic Leaf template with metadata

Current Product Owner preference: **B**, but this is a hypothesis, not architecture authority.

Task 35 must decide:

- canonical entity and ownership;
- whether Plans require a destination;
- Plan-to-Life cardinality;
- Plan-to-Task/series cardinality;
- lifecycle and archive/restore semantics;
- start/target date semantics;
- ordered phases/milestones;
- body schema reuse versus Plan-specific schema;
- drafts/revisions/recovery;
- Search, tags, backup, export, and portability;
- accessibility and non-spatial alternatives;
- performance and bounded scale;
- migration/IPC/test/E2E impact.

## Explicit prohibitions

Before Task 35 activation:

- no production Focus Plan entity;
- no migration;
- no Plans route/sidebar destination;
- no Plan UI;
- no Task relationship change;
- no Task 36 or Task 37 implementation.

Across the Focus Plans program:

- do not turn Life nodes into temporary plan fragments;
- do not model a Plan as one oversized Task;
- do not auto-create large Task sets;
- do not infer progress from raw Task completion counts;
- do not silently reschedule Tasks;
- do not add reminders/notifications/sound/snooze.

## Remaining debt

- P0/P1: none known.
- P2: physical screen-reader and alternate-DPI verification.
- Evidence limitation: no Lifeweave-specific user study; Task 35 must treat the Product Owner direction as product authority, not empirical proof.

## Exact next action

Stop at Product Owner gate. Activate a bounded Task 35 prototype/decision specification only after explicit Product Owner instruction. Do not implement Task 36 or Task 37.
