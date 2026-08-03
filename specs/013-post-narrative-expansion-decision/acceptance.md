# Slice 013 Acceptance

Task 23 passes only when:

- all thirteen candidates have exactly one recommendation state;
- no more than one candidate is `ACTIVATE_NEXT`;
- Multi-Scene Canvas Composition is the only `ACTIVATE_NEXT` result;
- Template System and Visual Worlds are `HOLD_FOR_PRODUCT_OWNER`;
- the hard-filter table is complete and covers all thirteen candidates;
- weights, priors, uncertainty (σ per candidate) and seed are disclosed;
- the simulation is described as sensitivity analysis, not proof;
- `analysis.py --check` exits 0 with aggregate score ≥ 7.0 and lead ≥ 0.35;
- the prerequisite graph is present in Mermaid and plain text;
- `results.json` is present and matches `analysis.py --check` expectations;
- Task 24 minimum scope, exclusions and kill criteria are recorded;
- no production dependency, migration, IPC, capability, route or UI file changes;
- source integrity and documentation gates (`pnpm verify`) pass;
- the final commit is pushed once and the worktree is clean.
