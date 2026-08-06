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

- Latest closed task: **37/60**
- Latest closed slice: **027 — Focus Plan ↔ Task Integration + Manual Review History**
- Active task: **38 — One-Off Task Deadline Semantics + Deadline Queue**
- Active implementation specification: **Slice 028 — `specs/028-one-off-deadline-semantics`**
- Latest feature checkpoint: **Task 37 — Focus Plan ↔ Task Integration** (`09c393737fd6f096780408a803aea9b6e1355bb8`)
- Database schema: **22**
- Next action: **Implement active spec**
- Task 39: **not started; requires separate activation**

## Task 36 closure

Task 36 is closed and must not be reopened merely because a native E2E smoke test or Windows driver harness is red. Closure is supported by implemented schema/domain/UI behavior, focused frontend coverage, Rust migration/core/backup/tag/Search tests, generated-binding stability, production frontend build, inspected persisted SQLite artifacts, and explicit Product Owner acceptance.

A future reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision may reopen the task. Tooling-only failures remain non-blocking verification debt.

## Sealed workflow

GitHub Actions contains one manual, read-only Windows installer build. Normal feature, fix, refactor, test, documentation, and maintenance tasks must not modify `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256`. Workflow changes require explicit Product Owner authorization and must pass `python scripts/check_repository.py`.
