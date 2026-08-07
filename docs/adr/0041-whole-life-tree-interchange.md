# ADR 0041 — Whole-Life Tree Interchange

## Status

Accepted and activated for Task 47 / Slice 037 from explicit Product Owner activation baseline
`1516b9c68e9e906269e4d4a00e85c508a5cd58b1`.

## Context

Task 42 shipped one active connected non-root Life branch through Life Branch Package v1 and
explicitly left whole-tree and multi-branch transfer OPEN. ADR 0028's historical evidence rated
Whole-tree Interchange `PASS` at 7.610, while Generic Outline remained conditional and Noteboard,
Score, and Prediction failed. The shipped tree, document, privacy-safe asset, unified-tag, explicit
link, archive, backup, and branch-package authorities now support a bounded whole-tree case without
inventing merge, replacement, or workspace-transfer policy.

The unresolved space is broader than this task. Arbitrary user-selected multi-branch export,
custom export profiles, archived-node transfer, whole-workspace packages, and backup replacement
remain separate decisions.

## Decision

> **Lifeweave v1 may export the complete active non-root Life hierarchy as one Life Tree Package v1
> and import it as an ordered forest under one existing active documentless Life destination.
> Import is append-only with fresh local identities: it never replaces, merges, deletes, or
> overwrites existing Life content.**

The distinct package identity is:

```text
format: lifeweave_tree_package
format_version: 1
extension: .lifeweave-tree.zip
```

Export begins at immutable `life-root`, but never packages that root as an importable node. The
package contains exactly every active non-root node reachable through active parent-child edges at
one consistent snapshot. Archived nodes and everything below an archived edge are omitted and
counted without revealing content or identity. An empty active forest is not exportable.

`content/tree.json` owns a distinct forest structure with ordered `root_keys`. Every root has no
package parent, every other node has exactly one included parent, all nodes are reachable from
exactly one root, sibling indexes are canonical and contiguous after exclusions, and depth is
derived relative to virtual `life-root` with top-level depth one. Deterministic ordering is
mandatory.

Included document, asset, tag, and link authority is exactly Task 42's: committed Basic Leaf and
Narrative Canvas documents, privacy-sanitized referenced images, active canonical node tags, and
explicit links whose endpoints are both included active committed leaves. Drafts, history, pins,
navigation state, Tasks, Plans, Analytics, Settings, backup metadata, Search rows, cross-boundary
links, and archived or superseded tag assignments are excluded.

Import targets `life-root` or one existing active documentless Life node. Existing children retain
their order and package roots append in verified source order. Every imported node, document,
created asset row, link, and created tag receives a fresh local ID. Duplicate titles are valid and
never trigger a merge.

Schema advances 26 to 27 through one append-only migration rebuilding only `life_operations` to
admit truthful non-undoable `import_tree` operations while preserving every existing column, row,
kind (including `import_branch`), constraint, foreign key, index, revision, and `undone_at` value.
One confirmation transaction owns tags, nodes, documents, assets and joins, tags and joins, links,
Search dirty scopes, exactly one tree-revision increment, and exactly one idempotent operation.
Attempt-created files are removed on rollback; reused files are never removed.

Task 42's 64 MiB archive threat envelope and every count, depth, payload, path, entry, checksum,
MIME, and dimension limit remain unchanged. Branch, Tree, and Portable packages reject one another.
No generic public interchange framework is created.

## Consequences

- schema 27 adds only `import_tree` admission to `life_operations`;
- five narrow Tree commands and permissions are added, with raw binary and opaque staging only;
- Life Edit gains root-only whole-tree export and destination-scoped append-only import;
- Life Branch Package v1, Portable Package v1, and full database backup remain behaviorally
  unchanged and distinct;
- arbitrary selected multi-branch export, custom profiles, archived transfer, workspace packages,
  replacement, conflict resolution, and Task 48 remain OPEN or prohibited as stated by the active
  specification;
- locked performance ceilings remain unchanged.

## Reversal conditions

Reopen only for a reproducible forest-integrity, identity, ordering, migration, atomicity, replay,
archive-security, or data-loss defect; evidence that the locked limits or performance ceilings
cannot support the approved bounded case; or an explicit Product Owner decision. No reversal
retroactively broadens this package into arbitrary multi-branch or workspace interchange.
