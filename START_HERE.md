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
- Latest closed product checkpoint: **Task 33 — Unified Tags Core + Cross-Pillar Retrieval**
- Database schema: **20**
- Next action: **Complete focused native verification for the active spec**
- Task 36 implementation: **remediation integrated directly into source; task remains unclosed pending focused native persistence evidence**
- Task 37: **not started and prohibited**

## Task 36 boundary

Task 36 owns Plan persistence, lifecycle, variants/phases, revisions/recovery,
shared tags, Search, full-database backup authority, generated bindings, and the
lazy Plans workspace. It does not add Task/series links, review workflow,
automatic progress, reminders, cloud, collaboration, score, or prediction.

## Focused verification

```powershell
# Windows native persistence only; does not rerun historical phases.
powershell -ExecutionPolicy Bypass -File scripts/run_windows_e2e.ps1 `
  -Phases phase8-focus-plans.e2e.ts,phase8-focus-plans-restart.e2e.ts
```

Frontend typecheck/tests, Rust tests, binding stability, diff checks, and final
repository governance passed in one-time staging run `31074176655`. Task 36 is
not closed until the focused two-process native persistence check passes. Run
broad suites only when a concrete cross-domain defect requires them. Task 37
work requires a separate Product Owner activation.

## Sealed workflow

GitHub Actions contains one manual, read-only Windows installer build. Normal
feature, fix, refactor, test, documentation, and maintenance tasks must not
modify `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256`. Workflow changes
require explicit Product Owner authorization and must pass
`python scripts/check_repository.py`.
