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

- Latest closed task: **33/60**
- Latest product feature: **Task 33 — Unified Tags Core + Cross-Pillar Retrieval**
- Latest feature checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`
- Database schema: **19**
- Active implementation specification: **Slice 024 — Post-Unified-Tags Expansion Decision**
- Next action: **Implement active spec**
- Task 34 status: **active decision analysis**
- Task 35 status: **prohibited pending Product Owner approval**

## Core invariants

- Windows-first and local-first; core use requires no account, server, network, or default cloud service.
- Today is the default destination; Task is an independent row/timeline entity, never a card.
- Life Browse shows the selected node and direct children; full-tree editing stays in Life Edit.
- SQLite through Rust is persistent and domain authority; React owns rendering and ephemeral interaction state.
- Backup and restore use staging, checksums, integrity checks, database closure, and safe replacement.

## First verification commands

```powershell
python -m unittest scripts.tests.test_check_project_state
python specs/024-post-unified-tags-expansion-decision/analysis.py --check
pnpm source:verify
pnpm governance:check
pnpm verify
pnpm typecheck
pnpm test
cargo check --manifest-path src-tauri/Cargo.toml --locked --all-targets
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

## Freshness rule

Repository code, accepted ADRs, `PROJECT_STATE.json`, `STATUS.md`, and Git history override historical bundle task counts and implementation snapshots.
