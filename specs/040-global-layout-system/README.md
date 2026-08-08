# Slice 040 — Global Layout System + UI Surface Completeness

## Status

```text
Task 50: ACTIVE
Slice 040: ACTIVE
activation baseline: 2c4cb188937393103e12b1042779af5ea266acda
Task 49 feature checkpoint: 7622db3d8b2b42d69c8f497b6899c5be82e9f9a9
starting schema: 27
target schema: 27 (no migration)
active spec package: specs/040-global-layout-system
Task 51: prohibited, unstarted, unallocated, and unrecommended
```

Task 50 is a layout and evidence slice, not a feature slice. Under the Task 40 precedent it does
**not** advance `latest_feature_task`, which stays at 49.

## Shape

```text
one geometry authority
+ finite page taxonomy
+ 4 px-derived spacing rhythm
+ real modal/form containment
+ no ordinary horizontal overflow
+ real-browser geometry proof
+ visible path for every decided capability
= a plain application that is straight, balanced and predictable
```

## Not in this slice

Art direction. No palette, brand, logo, font family, icon language, radius or shadow language,
illustration, Visual World art, motion personality or sound changes. The application is expected to
look essentially as plain after this slice as before it; only its geometry changes.

No new feature semantics, no schema 28, no migration, no Rust product change, no new IPC command, no
new capability, no new dependency, and no workflow or seal change.

## Canonical decision

[ADR 0044](../../docs/adr/0044-global-layout-system-and-ui-surface-completeness.md).

## Evidence

```text
docs/audits/task-50-ui-surface-census.md    capability census, produced before any product edit
docs/audits/task-50-layout-baseline.md      CSS authority audit + measured baseline geometry
docs/audits/task-50-layout-final.md         closure evidence
target/e2e-artifacts/task-50/{baseline,final}/   screenshots + geometry.json (not committed)
```
