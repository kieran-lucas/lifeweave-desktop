# Start here — Lifeweave Desktop

## Authority

1. [Immutable source](docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md)
2. [Source integrity](docs/source-of-truth/SOURCE_INTEGRITY.md)
3. [AI Constitution](AI_CONSTITUTION.md)
4. [Project State](docs/PROJECT_STATE.json)
5. [Decision Registry](docs/DECISION_REGISTRY.md)
6. [Status](docs/STATUS.md) and [Roadmap](docs/ROADMAP.md)
7. [Architecture](docs/ARCHITECTURE.md)

## Current state

- Latest closed task: **35/60**
- Latest closed slice: **025 — Focus Plans Architecture Prototype**
- Latest product feature: **Task 33 — Unified Tags Core + Cross-Pillar Retrieval**
- Latest feature checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- Database schema: **19**
- Active implementation specification: **none**
- Next action: **Product Owner gate**
- Canonical Focus Plans model: **standalone entity**
- Task 36: **not started; separate activation required**
- Task 37: **not started**

## Task 35 result

Option B was selected after a common 30-operation prototype, 100,000 applied
operations per option, 3 × 18 hard filters, nine benchmark rows, six canonical
and three stress profiles at 200,000 samples/profile, and ten review rounds.

## Core invariants

- Windows-first and local-first; core use requires no account, server, network, or default cloud service.
- Today remains the startup/default destination; Task is a row/timeline entity, never a card.
- Life remains durable structure; Focus Plans do not create synthetic Life nodes.
- SQLite through Rust is persistent/domain authority; React owns rendering and ephemeral interaction state.
- Backup, restore, and interchange remain distinct authorities.

## Verification entry points

```powershell
python specs/025-focus-plans-architecture/prototype.py --check
python -m unittest specs/025-focus-plans-architecture/prototype_test.py
python specs/025-focus-plans-architecture/analysis.py --check
python -m unittest specs/025-focus-plans-architecture/analysis_test.py
```

No Task 36 work begins without explicit Product Owner approval.
