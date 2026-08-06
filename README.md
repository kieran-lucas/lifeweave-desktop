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

Task 39 / Slice 029 — Task Saved Views + Bounded Typed Filter Core is active from baseline `eed299d950bb43c54540a0466901f651aa60ce4a`. Task 38 remains closed, database schema 22 is the activation baseline, and migration 23 is implemented under the active slice. Task 40 is prohibited and unrecommended.

GitHub Actions contains one sealed, manual, read-only Windows installer build. Feature tasks must not modify workflow infrastructure without explicit Product Owner authorization.

## Technology direction

- Tauri 2.x, Windows WebView2
- React 19.2
- TypeScript 6 compatibility line, retained because the source locks it
- Vite 8.x
- Rust stable
- SQLite through a Rust-owned persistence layer
- React UI + Rust application core
- pnpm workspace

See [`docs/TECHNOLOGY_BASELINE.md`](docs/TECHNOLOGY_BASELINE.md) for the dated verification and the TypeScript 7 discrepancy.

## Non-negotiable product invariants

- Today is the default operational destination.
- Task is a separate entity and is never represented as a Life card.
- Runtime core flows work without network access.
- No account, server, collaboration, hidden telemetry, reminder, Windows notification, or sound in Core.
- SQLite/Rust is authoritative for persistent domain state.
- Backup and restore are first-class.
- OPEN and DEFERRED items are not implementation permission.
- Completion evidence is risk-based: deterministic evidence may replace a flaky or nondiagnostic harness, while reproducible product defects remain blocking.

## Development entry points

- [Start here](START_HERE.md)
- [Windows environment](docs/DEVELOPMENT_ENVIRONMENT_WINDOWS.md)
- [Contributing](CONTRIBUTING.md)
- [AI Constitution](AI_CONSTITUTION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Current status](docs/STATUS.md)
