# Start here — Lifeweave Desktop setup pack

This repository is a **source-preserving, GitHub-ready project setup** for the Windows local-first application described by the Product Owner.

## Read in this order

1. [`docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`](docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md) — immutable original specification.
2. [`docs/source-of-truth/SOURCE_INTEGRITY.md`](docs/source-of-truth/SOURCE_INTEGRITY.md) — exact-copy and checksum contract.
3. [`AI_CONSTITUTION.md`](AI_CONSTITUTION.md) — non-negotiable invariants for humans and coding agents.
4. [`docs/DECISION_REGISTRY.md`](docs/DECISION_REGISTRY.md) — what is locked, prototype-gated, open, deferred, or removed.
5. [`docs/CORE_PRODUCT_SPEC.md`](docs/CORE_PRODUCT_SPEC.md) — executable Core scope.
6. [`docs/EXPANSION_VISION.md`](docs/EXPANSION_VISION.md) — retained long-term vision that is not on the Core critical path.
7. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries and dependency direction.
8. [`specs/000-foundation-proof/`](specs/000-foundation-proof/) — first active vertical slice.
9. [`docs/DEVELOPMENT_ENVIRONMENT_WINDOWS.md`](docs/DEVELOPMENT_ENVIRONMENT_WINDOWS.md) — local setup.
10. [`docs/GITHUB_REPOSITORY_SETUP.md`](docs/GITHUB_REPOSITORY_SETUP.md) — GitHub configuration.

## Current state

- Phase: **0 — source preservation and project governance**
- Production feature implementation: **not started**
- Active specification: `000-foundation-proof`
- Original source SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- Core rule: an AI agent may not infer or implement an OPEN/DEFERRED feature merely because technical substrate exists.

## First commands

```powershell
python scripts/verify_source_integrity.py
python scripts/check_repository.py
./scripts/doctor.ps1
```

The generated index and coverage matrix account for all **402 headings** in the original source.
