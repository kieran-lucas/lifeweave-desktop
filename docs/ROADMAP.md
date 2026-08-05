# Roadmap

## Slice 026 — Focus Plans Core + Draft/Active Lifecycle (implementation complete; final native check pending)

Task 36 implements ADR 0030 as a standalone local entity with schema 20,
lifecycle, variants/phases, revisions/recovery, shared tags, Search,
full-database backup authority, generated IPC bindings, and a lazy Plans
workspace.

The implementation is stabilized and repository scaffolding is removed. The
only remaining closure gate is the focused two-process Windows scenario:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run_windows_e2e.ps1 `
  -Phases phase8-focus-plans.e2e.ts,phase8-focus-plans-restart.e2e.ts
```

Hard boundary: Task 37 is not part of Slice 026. No Task/series relation, review
workflow, or automatic progress may enter migration 20, DTOs, Search, or UI.

## Slice 025 — Focus Plans Architecture Prototype + Canonical Model Decision (complete)

Task 35 selected the standalone Focus Plan entity. ADR 0030 is canonical.

## Reserved positions within the 60-task roadmap

- **Task 36:** active until the focused phase-8 native check passes.
- **Task 37 — Focus Plan ↔ Task Integration + Review Workflow:** not started and
  prohibited until Task 36 closes and a separate Product Owner gate is granted.
- **Tasks 38–60:** available for later decisions.
- **Deadline Semantics:** eligible deferred candidate.
