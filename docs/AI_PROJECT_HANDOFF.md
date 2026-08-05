# Lifeweave AI Project Handoff

## Authority

- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- latest closed task/slice: 35 / 025
- latest product task/checkpoint: 33 / `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- schema: 19
- active specification: none
- next action: Product Owner gate
- recommended candidate: `standalone_focus_plan_core`
- Task 36: not started
- Task 37: not started

## Task 35 decision

ADR 0030 selects a standalone Focus Plan entity. The architecture locks stable
Plan identity, explicit lifecycle, optional zero-or-one Life context,
first-class variants/phases, revisions/recovery, shared tags, a distinct Search
kind, and database backup authority. No automatic progress percentage is
allowed.

## Evidence checkpoints

```text
prototype exact-byte checkpoint: 5f0aaeb918c1736f8d4cb04dd72a098f45f96792
analysis semantic checkpoint: a7427eee3b5f6f8cd7bbae756325c15c3c489606
```

Ten review rounds passed; P0/P1 are none. Product code and schema did not change.

## Task 36 boundary

A future separately activated Task 36 may implement Plan core, lifecycle,
variants/phases, revisions/recovery, tags, Search, backup, and a lazy Plans
workspace. It must not add Task/series links, review workflow, automatic
progress, reminders, cloud, or collaboration.

## Prohibition

Do not create a Task 36 spec, migration 20, production code, route, IPC,
dependency, capability, generated binding, or E2E phase before explicit Product
Owner approval. Task 37 remains separately prohibited.
