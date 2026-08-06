# Slice 032 — Bounded Life Branch Interchange

## Status

```text
Task 42: ACTIVE
Slice 032: ACTIVE
activation baseline: 08a76c2827c1d49556c1f255631cbe2b1a4a2437
Task 41 feature checkpoint: e1fe3675315c04590aabe9c9ca87ede344dafa40
starting schema: 24
target schema: 25
active spec package: specs/032-bounded-life-branch-interchange
Task 43: prohibited, unstarted, unallocated, and unrecommended
```

Task 42 adds a distinct **Life Branch Package v1** (`.lifeweave-branch.zip`) that exports and
imports exactly one active connected non-root Life branch: its hierarchy and sibling order, its
committed Basic Leaf and Narrative Canvas documents, its privacy-sanitized image assets, its active
canonical tags, and the explicit links whose endpoints both live inside the branch.

Every imported node, document, asset, link, and newly created tag receives a fresh local ID. Nothing
is ever merged or overwritten. Import is atomic — one transaction, one tree-revision increment, one
non-undoable operation — and failure leaves zero rows and zero new files.

Portable Package v1 remains one-document-only and unchanged, and full-workspace recovery remains
database backup.

Two live-schema conflicts were surfaced during activation and resolved by explicit Product Owner
decision, recorded in [ADR 0036](../../docs/adr/0036-bounded-life-branch-interchange.md): schema
advances to **25** so the Life operation ledger can store `import_branch`, and an imported tag whose
normalized name is held by an unmerged archived tag has that single assignment omitted and warned.

- [Specification](spec.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance](acceptance.md)
- [ADR 0036](../../docs/adr/0036-bounded-life-branch-interchange.md)
