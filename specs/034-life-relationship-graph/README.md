# Slice 034 — Life Relationship Graph Explorer Core

## Status

```text
Task 44: CLOSED
Slice 034: CLOSED
activation baseline: 2d5b5d335137fe2a09f60b585d11a14a839b1e25
Task 43 feature checkpoint: b4510ddbffbd0e8c4d5ae84213973b723df4cbad
starting schema: 26
final schema: 26
closed spec package: specs/034-life-relationship-graph
product checkpoint: 7e95644dcced19a1a8349706990d20d1df53a2e1
Task 45: prohibited, unstarted, unallocated, and unrecommended
```

Life can already show structure two ways and relationships one way, never both at once. Browse shows
one node and its direct children. Edit shows the whole active tree but knows nothing about links.
The Links panel shows one leaf's outgoing links and backlinks, one source at a time. A user who has
drawn explicit cross-branch links has no way to see the hierarchy and those links together.

Task 44 adds exactly that view and nothing more:

> Lifeweave v1 Graph is a **read-only, transient explorer of the active Life hierarchy plus existing
> explicit directed Life links**. It stores no graph truth, never replaces Browse/Edit, and never
> creates, deletes, infers, or rewrites relationships.

The relationships already exist and are already authoritative. Only the view is new. There is no
migration, no schema change, and no dependency: the layout is the `d3-hierarchy` tidy tree Life Edit
already computes.

The explorer is bounded at 500 nodes, 2,000 links, and 128 levels, and **rejects rather than
truncates**. A partial graph that silently omits relationships is worse than no graph, because the
user would draw conclusions from a picture that is not the truth.

Graph is transient by construction. It is never a persisted Life mode, never a route, and never a
sidebar destination; a restart returns the user to their persisted mode.

- [Specification](spec.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance](acceptance.md)
- [ADR 0038](../../docs/adr/0038-life-relationship-graph-explorer.md)
