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
- Active implementation specification: **Slice 025 — Focus Plans Architecture Prototype**
- Next action: **Implement active spec**
- Task 35 status: **active prototype/decision analysis**
- Tasks 36–37 status: **prohibited pending Task 35 closure and Product Owner gate**

## Task 35 objective

Compare three models for medium-term Focus Plans:

```text
A — third Life document type
B — standalone Focus Plan entity
C — Basic Leaf template with metadata
```

No production behavior, migration, route, dependency, IPC, capability, or
generated binding is authorized.

## Core invariants

- Windows-first and local-first; core use requires no account, server, network, or default cloud service.
- Today is the default destination; Task is an independent row/timeline entity, never a card.
- Life Browse shows the selected node and direct children; full-tree editing stays in Life Edit.
- SQLite through Rust is persistent/domain authority; React owns rendering and ephemeral interaction state.
- Backup, restore, and interchange remain distinct authorities.

## First verification commands

```powershell
python -m unittest scripts.tests.test_check_project_state
python -m unittest discover specs/025-focus-plans-architecture -p "*_test.py"
python specs/025-focus-plans-architecture/prototype.py --check
python specs/025-focus-plans-architecture/analysis.py --check
pnpm source:verify
pnpm governance:check
pnpm verify
```

## Freshness rule

Repository code, accepted ADRs, `PROJECT_STATE.json`, `STATUS.md`, and Git
history override historical bundle task counts and implementation snapshots.
