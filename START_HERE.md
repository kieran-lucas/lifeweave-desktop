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
- Active task: **36 — Focus Plans Core + Draft/Active Lifecycle**
- Active implementation specification: **specs/026-focus-plans-core**
- Latest product feature: **Task 33 — Unified Tags Core + Cross-Pillar Retrieval**
- Latest feature checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- Database schema: **20**
- Next action: **Implement active spec**
- Canonical Focus Plans model: **standalone entity**
- Task 37: **not started and prohibited**

## Task 36 boundary

Task 36 implements Plan-owned persistence, lifecycle, variants/phases,
revisions/recovery, shared tags, Search, full-database backup authority, and a
lazy Plans workspace. It does not add Task/series links, review workflow,
automatic progress, reminders, cloud, collaboration, score, or prediction.

## Core invariants

- Windows-first and local-first; core use requires no account, server, network, or default cloud service.
- Today remains startup/default; Task is a row/timeline entity, never a card.
- Life remains durable structure; Focus Plans never create synthetic Life nodes.
- SQLite through Rust is persistence/domain authority; React owns rendering and ephemeral interaction state.
- Backup, restore, and interchange remain distinct authorities.

## Verification entry points

```powershell
pnpm source:verify
pnpm governance:check
pnpm index:check
pnpm verify
pnpm typecheck
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Task 37 work requires a separate Product Owner activation.
