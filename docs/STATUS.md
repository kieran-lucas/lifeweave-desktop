# Project Status

## Task 36/60 — Focus Plans Core + Draft/Active Lifecycle (source verified; final native check pending)

- Activation baseline: `fd3f0e8808f28aae7c4bbca992cedcbd94db6c5d`.
- Active spec: `specs/026-focus-plans-core`.
- Canonical model: standalone Focus Plan entity.
- Schema 20 is active through an append-only migration; migrations 1–19 remain unchanged.
- Backend core, IPC, tags, Search, backup/restore, generated bindings, Plans UI,
  recovery-draft loading, and phase-8 restart scenarios are implemented.
- Task 36 remediation is now ordinary source code rather than runtime patching.
  One-time staging run `31074176655` passed frontend typecheck/tests, Rust tests,
  generated-binding stability, diff checks, and final repository governance.
- Runtime patch scripts and the temporary materialization workflow were removed
  from the verified tree before it was merged into `main`.
- GitHub Actions on `main` now contains one sealed manual, read-only Windows
  installer build. It has no push trigger, source mutation, commit, push, or
  self-rewriting behavior.
- Today remains startup/default; Life semantics remain unchanged.
- Task 37 is prohibited: no Task/series relation, review workflow, or progress computation.
- Only the two phase-8 native Windows scenarios remain to be executed before closure.

## Task 35/60 — Focus Plans Architecture Prototype + Canonical Model Decision (complete)

- Slice 025 selected **B — standalone Focus Plan entity**.
- Latest closed product checkpoint before Task 36 remains Task 33 /
  `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`.

## Historical status

Task 1–33 history remains preserved at
[`docs/status-history/STATUS-through-task33.md`](status-history/STATUS-through-task33.md).
Task 34–35 evidence remains in accepted ADR and audit records.
