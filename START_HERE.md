# Start here — Lifeweave Desktop

## Authority

1. [Immutable source](docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md)
2. [Source integrity](docs/source-of-truth/SOURCE_INTEGRITY.md)
3. [AI Constitution](AI_CONSTITUTION.md)
4. [Project State](docs/PROJECT_STATE.json)
5. [Decision Registry](docs/DECISION_REGISTRY.md)
6. [Status](docs/STATUS.md) and [Roadmap](docs/ROADMAP.md)
7. [Architecture](docs/ARCHITECTURE.md)
8. Active specification, only when `PROJECT_STATE.active_spec` is non-null

## Current state

- Latest closed task: **34/60**
- Latest closed slice: **024 — Post-Unified-Tags Expansion Decision**
- Latest product feature: **Task 33 — Unified Tags Core + Cross-Pillar Retrieval**
- Latest feature checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- Database schema: **19**
- Active implementation specification: **none**
- Product Owner disposition on the Task 34 recommendation: **MODIFY**
- Recommended next candidate: **Focus Plans Architecture Prototype**
- Roadmap envelope: **60 tasks total**
- Reserved positions: **Task 35–37**
- Next action: **Product Owner gate for Task 35 activation**
- Task 35 status: **not started; no active specification**

## Product Owner roadmap allocation

- **Task 35:** Focus Plans A/B Prototype + Canonical Model Decision
- **Task 36:** Focus Plans Core + Draft/Active Lifecycle
- **Task 37:** Focus Plan ↔ Task Integration + Review Workflow
- **Tasks 38–60:** remain available for later roadmap decisions.
- Deadline Semantics remains an eligible deferred candidate; it is no longer the recommended Task 35.

## Focus Plans intent

Focus Plans are a proposed medium-term coordination layer between Life and Task:

```text
Life = durable areas and direction
Focus Plan = a strategy or concentration lasting weeks to months
Task = concrete scheduled or actionable work
```

Task 35 must compare:

1. a third Life document type;
2. a standalone Focus Plan entity;
3. a Basic Leaf template with metadata.

The current Product Owner preference is a standalone entity, but Task 35 must earn that decision through prototype and architecture evidence.

## Core invariants

- Windows-first and local-first; core use requires no account, server, network, or default cloud service.
- Today is the default destination; Task is an independent row/timeline entity, never a card.
- Life Browse shows the selected node and direct children; full-tree editing stays in Life Edit.
- SQLite through Rust is persistent/domain authority; React owns rendering and ephemeral interaction state.
- Backup, restore, and interchange remain distinct authorities.
- Focus Plans must not fragment the Life tree or silently become oversized Tasks.

## First verification commands

```powershell
python -m unittest scripts.tests.test_check_project_state
python specs/024-post-unified-tags-expansion-decision/analysis.py --check
pnpm source:verify
pnpm governance:check
pnpm verify
```

## Freshness rule

Repository code, accepted ADRs, `PROJECT_STATE.json`, `STATUS.md`, and Git history override historical bundle task counts and implementation snapshots.
