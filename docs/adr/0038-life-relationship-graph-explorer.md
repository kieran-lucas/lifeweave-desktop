# ADR 0038 — Life Relationship Graph Explorer

## Status

Accepted and activated for Task 44 / Slice 034 from explicit Product Owner activation baseline
`2d5b5d335137fe2a09f60b585d11a14a839b1e25`.

## Context

Life can already show structure two ways and relationships one way, and never both at once.

- **Browse** shows the selected node and its direct children. This is a product invariant
  (`AI_CONSTITUTION.md` §2) and is not changing.
- **Edit** shows the whole active tree as a deterministic `d3-hierarchy` tidy layout, but knows
  nothing about links.
- **Links** (Task 41 / ADR 0035) shows one leaf's outgoing links and backlinks as a list, one source
  node at a time.

A user who has built a real Life tree and drawn explicit cross-branch links between its leaves has no
way to see the hierarchy and those links together. The relationships exist and are already
authoritative; only the view is missing.

`docs/DECISION_REGISTRY.md` lists **`Graph`** under `OPEN — Product/UX`, and separately lists
"Graph and generalized knowledge features" under `DEFERRED`. `docs/CORE_PRODUCT_SPEC.md` lists Graph
among the features "explicitly excluded from Core critical path" — on the same line as **backlinks**
and **tags**, both of which have since shipped under their own Product Owner decisions without that
line changing. `docs/EXPANSION_VISION.md` retains Graph with the constraint that "Graph never
replaces the Life tree."

`AI_CONSTITUTION.md` §1 ranks an explicit later Product Owner decision recorded in an approved ADR
above the Core Product Spec, and `CLAUDE.md` prohibits Graph "unless activated by an approved spec".
This ADR is that decision and that activation, and it resolves only the narrow case stated below.

## Decision

> Lifeweave v1 Graph is a **read-only, transient explorer of the active Life hierarchy plus existing
> explicit directed Life links**. It stores no graph truth, never replaces Browse/Edit, and never
> creates, deletes, infers, or rewrites relationships.

Concretely:

**Read-only.** One command, `get_life_graph_projection`, reads and returns. It writes nothing — no
row, no revision bump, no operation-ledger entry, no navigation preference. Every relationship it
draws already exists: parent/child edges come from `life_nodes.parent_id`, and link edges come from
`life_links` rows created through the Task 41 flow. The Graph offers no way to create or remove
either.

**Transient.** Graph is not a persisted Life mode. `life_navigation_preferences.last_life_mode`
remains constrained to `('browse','edit','pinned','reader')`, unchanged, and Graph is never written
to it. There is no route, no sidebar destination, and no startup restoration. Closing Life, remounting
the screen, or restarting the app returns the user to their persisted mode, never to the Graph.

**Bounded, and it rejects rather than truncates.**

```text
MAX_GRAPH_NODES = 500
MAX_GRAPH_LINKS = 2_000
MAX_GRAPH_DEPTH = 128
```

Beyond any bound the projection returns a clear Rust-owned refusal and no payload. A partial graph
that silently omits nodes or relationships would be worse than no graph, because the user would draw
conclusions from a picture that is not the truth. `MAX_GRAPH_DEPTH` matches the breadcrumb recursion
bound already used by `life_link`.

**Active hierarchy only.** The projection is the connected active tree reachable from the Life root
through non-archived parent edges. A link whose other endpoint lies outside that set — archived, or
below an archived edge — is not an edge of the active hierarchy and does not appear. This is the
definition of the projection, not truncation: the underlying `life_links` row is never read as
deleted, disabled, or changed, and the Links panel remains the authority for archived and unavailable
endpoints, exactly as ADR 0035 specified.

**Deterministic layout, no simulation.** Node positions come from the same `d3-hierarchy` tidy-tree
algorithm Life Edit already uses, computed from parent/child edges only. Explicit links are drawn as
a second pass of curves between those positions; they are never fed into the hierarchy. The same
projection always yields identical geometry. No force simulation, physics engine, worker, canvas or
WebGL renderer, and no persisted or user-draggable coordinates.

**Accessible without sight.** The drawn surface is `aria-hidden`, exactly as the Life Edit canvas and
the Browse connectors already are. Every relationship the Graph draws has a text counterpart: a node
selector, a selected-node inspector, and a complete semantic connection list covering the parent
edge, child edges, outgoing links, and incoming links. A drawn edge with no text counterpart is a
defect, not a styling gap.

### Why no new dependency

The layout Graph needs is the tidy tree Life Edit already computes with `d3-hierarchy`, which is
already a direct dependency resident in the startup bundle. `d3-force`, Cytoscape, Graphology,
vis-network, and canvas/WebGL graph libraries are explicitly rejected. They exist to solve problems
this decision does not have — arbitrary unrooted graphs, animated relaxation, and tens of thousands
of nodes — and adopting one to avoid implementation work would import a general knowledge-graph
capability that `DECISION_REGISTRY.md` still defers.

### What this decision does not resolve

Persisted graph truth, graph as a navigation destination, graph editing, inferred or derived or typed
or weighted edges, non-Life endpoints, clustering, pathfinding, and generalized knowledge features
all remain **OPEN or DEFERRED**, and none is allocated. Graph does not become a replacement for
Browse or Edit, in this slice or by implication.

## Consequences

- Schema stays **26**. Zero migrations, zero schema changes, zero edits to migrations 1–26.
- Zero dependencies added, removed, or upgraded.
- One read-only command, one Rust module (`life::graph`), and three DTOs are added. No existing DTO
  gains graph semantics.
- The `d3-hierarchy` tidy-tree layout is extracted from `LifeEditWorkspace` into a shared module now
  that a second concrete use exists. Life Edit behaviour is unchanged.
- Life gains one compact chrome action and one lazily loaded workspace. No new route, sidebar
  destination, persisted mode, or Tauri capability beyond the single command permission.
- Task 41 link semantics, Task 42 branch interchange, backup/restore, Portable Package, Search,
  Analytics, Calendar, Today, and Saved Views are all unchanged.
- Task 45 is neither allocated, started, nor recommended.

## Reversal conditions

Reopen only for a reproducible defect in the projection's correctness or bounds; for evidence that a
read-only transient explorer is the wrong shape for users; for a Product Owner decision to make Graph
a persisted destination, to allow editing from it, or to derive edges; or if the accessible
equivalent proves insufficient in physical screen-reader observation. Such a decision does not
retroactively broaden Task 44.
