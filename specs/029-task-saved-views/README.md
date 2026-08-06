# Slice 029 — Task Saved Views + Bounded Typed Filter Core

## Status

```text
Task 39: COMPLETE
Slice 029: COMPLETE
activation baseline: eed299d950bb43c54540a0466901f651aa60ce4a
Task 38 feature checkpoint: cace17bd4225cb8e3d89795c0e833e68ed588ba2
Task 38 cache remediation: eed299d950bb43c54540a0466901f651aa60ce4a
starting schema: 22
target schema: 23
feature checkpoint: 374abcbae263be18fa785a56d656678f9bfd9c29
active spec: none
Task 40: prohibited, unstarted, unallocated, and unrecommended
```

## Outcome

Saved Views are standalone local Task projection configurations. Each view selects exactly one
existing bounded source (`today`, `upcoming`, `overdue`, or `deadlines`), then applies a
versioned typed AND predicate, one stable sort mode, and one group mode. Rust owns validation,
canonical JSON, execution, lifecycle, ordering, reference resolution, and warnings.

The fifth `Views` tab lives inside the Today workspace. Today remains the startup and default
tab. Saved Views are not routes, Search entities, SQL, dashboards, cards, or shareable objects.

## Authority

- `spec.md` — normative Task 39 contract;
- `plan.md` — dependency-aware execution order;
- `tasks.md` — resumable completion ledger;
- `acceptance.md` — deterministic acceptance mapping;
- ADR 0033 — bounded Saved View and typed AST decision.

Closure is based on deterministic migration, domain/lifecycle, source-preservation, reference,
query-shape, frontend/accessibility, backup/reopen, generated-artifact, broad regression, and
full baseline diff evidence. No P0/P1 defect remains.
