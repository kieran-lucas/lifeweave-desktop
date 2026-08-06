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

- Latest closed task: **41/60**
- Latest closed slice: **031 — Explicit Life Links + Backlinks Core**
- Active task: **none**
- Active implementation specification: **none**
- Latest feature checkpoint: **Task 41 — Explicit Life Links + Backlinks Core** (`e1fe3675315c04590aabe9c9ca87ede344dafa40`)
- Database schema: **24**
- Next action: **Product Owner gate**
- Task 42: **prohibited, unstarted, unallocated, and unrecommended**

Task 41 is closed at product checkpoint `e1fe3675315c04590aabe9c9ca87ede344dafa40` from baseline
`6bcffe751458ee37a4cde663e21336a1f484a613`. It adds directed stable-ID links between committed Basic Leaf and Narrative Canvas Life leaves,
derived backlinks, exact Reader navigation, archive/restore preservation, and full backup authority.
Schema 24 is active through the append-only migration. Graph, whole-tree
interchange, inline/title-parsed links, package changes, dependencies, and Task 42 remain prohibited.
Closure evidence is in `docs/audits/task-41-explicit-life-links.md`.

Task 40 was a hardening and evidence slice. It changed no product behavior, added no migration, and
was **not** a feature checkpoint: the latest feature task remained 39 until Task 41 closed.

## Task 36 closure

Task 36 is closed and must not be reopened merely because a native E2E smoke test or Windows driver harness is red. Closure is supported by implemented schema/domain/UI behavior, focused frontend coverage, Rust migration/core/backup/tag/Search tests, generated-binding stability, production frontend build, inspected persisted SQLite artifacts, and explicit Product Owner acceptance.

A future reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision may reopen the task. Tooling-only failures remain non-blocking verification debt.

## Sealed workflow

GitHub Actions contains one manual, read-only Windows installer build. Normal feature, fix, refactor, test, documentation, and maintenance tasks must not modify `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256`. Workflow changes require explicit Product Owner authorization and must pass `python scripts/check_repository.py`.
