# Slice 025 — Focus Plans Architecture Prototype + Canonical Model Decision

## Purpose

Task 35 evaluates how Lifeweave should represent medium-term strategies lasting
weeks to months without fragmenting the Life tree or collapsing them into
oversized Tasks.

The slice compares three required alternatives:

- **A — Life document:** a third document type attached to a Life leaf;
- **B — Standalone entity:** an independent Focus Plan authority between Life
  and Task;
- **C — Basic Leaf template:** a Basic Leaf document with plan metadata and a
  prescribed template.

The Product Owner currently prefers B. That preference is a hypothesis, not an
acceptance result.

## Scope

Task 35 is prototype and decision work only.

Allowed:

- governance and architecture documents;
- isolated prototype code under this specification directory;
- deterministic fixtures, simulation, benchmark, and decision analysis;
- an ADR selecting, rejecting, or modifying an option;
- a bounded activation packet for Task 36.

Prohibited:

- production frontend or Rust behavior;
- SQLite migration 20;
- new IPC commands, routes, sidebar destinations, dependencies, capabilities,
  generated bindings, or native E2E phases;
- implementation of Task 36 or Task 37;
- automatic progress percentages;
- reminders, notifications, sound, snooze, cloud, collaboration, or AI
  planning.

## Execution baseline

```text
repository: kieran-lucas/lifeweave-desktop
branch: main
starting HEAD: 321da59282098a2f83b6530421c53b09704dddd7
latest product checkpoint: 4d1b65c816312a9e6ae8aa39f4a565555af9feb9
schema: 19
issue: #1
```

## Required outputs

```text
README.md
spec.md
plan.md
tasks.md
acceptance.md
research.md
architecture-options.md
wireframes.md
prototype.py
prototype_test.py
prototype-results.json
analysis.py
analysis-results.json
decision.md
self-review.md
```

Task 35 closes only after ten independent review rounds pass and repository
authority returns to a Product Owner gate.
