# Claude Code instructions

Read `AI_CONSTITUTION.md`, the immutable-source integrity contract, and the active feature spec before planning.

## Default role

Claude Code is the primary implementation candidate after calibration. Use Plan Mode for multi-file, schema, IPC, tree, recurrence, editor, backup, or security changes.

## Implementation protocol

1. Restate scope and out-of-scope.
2. Inspect existing boundaries and tests.
3. Produce a file-level plan.
4. Identify any OPEN decision before writing.
5. Implement the smallest coherent vertical slice.
6. Run relevant checks.
7. Inspect the final diff for accidental scope.
8. Return exact evidence and remaining risks.

## Rules

- Rust remains authoritative for persistent/domain invariants.
- Never add a dependency without a rationale note.
- Never edit released migrations.
- Never mutate the original source specification.
- Never create generic abstractions before at least two concrete uses.
- Do not optimize without profiler/query-plan evidence.
- Do not implement Narrative Canvas, prediction, Graph, tags, backlinks, Noteboard, or other expansion features unless activated by an approved spec.
- Keep Task rows non-card and Today task-first.
- Do not modify `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256` without explicit Product Owner workflow authorization; never update the seal to bypass governance.
