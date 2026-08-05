# Lifeweave AI Project Handoff

## Authority

- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- latest closed task/slice: 35 / 025
- active task/slice: 36 / 026
- schema: 20
- active specification: `specs/026-focus-plans-core`
- next action: implement active spec
- Task 37: not started and prohibited

## Task 36 implementation state

The standalone Focus Plan core is implemented across migration 20, Rust domain
and IPC, tags, Search/FTS, backup/restore, generated TypeScript bindings, lazy
Plans UI, recovery-draft loading, and a two-process native persistence scenario.

Root-cause corrections completed during implementation:

- widened `search_dirty_scopes` while preserving historical triggers;
- widened `search_documents.entity_kind` while preserving/rebuilding FTS5;
- aligned backup/reopen paths to schema 20;
- removed the invalid selected-variant archive UI path;
- retained the historical Search selector while exposing Plan scope through an
  accessible description;
- made the existing Windows E2E runner selectable by phase.

Repository cleanup is complete: one legitimate manual workflow remains; no
Task 36 patch script, compiler artifact, temporary placeholder, duplicate
planning/test document, or dependency drift remains.

## Remaining closure gate

Execute only the focused phase-8 Windows path:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run_windows_e2e.ps1 `
  -Phases phase8-focus-plans.e2e.ts,phase8-focus-plans-restart.e2e.ts
```

Do not run broad suites unless this path exposes a concrete cross-domain defect.
Do not activate Task 37 before Task 36 closes and Product Owner grants a new
gate.
