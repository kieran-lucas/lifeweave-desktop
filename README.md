# Lifeweave Desktop

A private-first Windows desktop application combining:

- **Task System:** daily planning and retrospective task evaluation.
- **Life System:** a hierarchical map for long-term direction, principles, goals, and personal knowledge.

The product runs locally, without an account, server, hidden telemetry, or runtime cloud dependency.

> Repository name: `lifeweave-desktop`. “Lifeweave” is a working project identity, not a locked final brand.

## Source of truth

The exact Product Owner specification is committed unchanged at:

[`docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`](docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md)

Fingerprint:

```text
SHA-256  9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a
Bytes    165171
Lines    4637
```

Run `python scripts/verify_source_integrity.py` before any governance or implementation change.

## Repository state

The active Foundation Proof slice now has a compiled and tested Rust/SQLite path, typed frontend bindings, a Windows Tauri production build, and an automated native launch smoke. Task 1 is an implementation candidate ready for Task 2 independent backup/restore audit; this does **not** claim Stage E, Foundation, restore production safety, or the product itself is complete.

Current active slice:

- `specs/000-foundation-proof`

## Technology direction

- Tauri 2.x, Windows WebView2
- React 19.2
- TypeScript 6 compatibility line, retained because the source locks it
- Vite 8.x
- Rust stable
- SQLite through a Rust-owned persistence layer
- React UI + Rust application core
- pnpm workspace
- GitHub Issues, pull requests, Actions, and releases

See [`docs/TECHNOLOGY_BASELINE.md`](docs/TECHNOLOGY_BASELINE.md) for the dated verification and the TypeScript 7 discrepancy.

## Non-negotiable product invariants

- Today is the default operational destination.
- Task is a separate entity and is never represented as a Life card.
- Runtime core flows work without network access.
- No account, server, collaboration, hidden telemetry, reminder, Windows notification, or sound in Core.
- SQLite/Rust is authoritative for persistent domain state.
- Backup and restore are first-class.
- OPEN and DEFERRED items are not implementation permission.
- A feature is not done without test/build evidence and Product Owner UX acceptance.

## Development entry points

- [Start here](START_HERE.md)
- [Windows environment](docs/DEVELOPMENT_ENVIRONMENT_WINDOWS.md)
- [Contributing](CONTRIBUTING.md)
- [AI Constitution](AI_CONSTITUTION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Current status](docs/STATUS.md)
