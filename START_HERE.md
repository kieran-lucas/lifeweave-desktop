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

- Latest closed task: **30/60**
- Latest product feature: **Task 29 — Task/Life Relationships**
- Latest feature checkpoint: `7240b7f371ada526ea5a31c0481612574d875fe0`
- Database schema: **16**
- Active implementation specification: **none**
- Next action: **Product Owner gate**
- Recommended candidate, not activated: **Lossless Portable Package**

## Core invariants

- Windows-first and local-first; core use requires no account, server, network, or default cloud service.
- Today is the default destination; Task is an independent row/timeline entity, never a card.
- Life Browse shows the selected node and direct children; full-tree editing stays in Life Edit.
- SQLite through Rust is persistent and domain authority; React owns rendering and ephemeral interaction state.
- Backup and restore use staging, checksums, integrity checks, database closure, and safe replacement.

## First verification commands

```powershell
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
