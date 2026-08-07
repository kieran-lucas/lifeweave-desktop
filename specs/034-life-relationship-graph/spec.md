# Task 44 Specification — Life Relationship Graph Explorer Core

Status: ACTIVE from activation baseline `2d5b5d335137fe2a09f60b585d11a14a839b1e25`.

This file records the Product Owner's activated Task 44 contract. Everything not required here is
out of scope. Canonical decision: `docs/adr/0038-life-relationship-graph-explorer.md`.

## 1. Canonical model

> Lifeweave v1 Graph is a **read-only, transient explorer of the active Life hierarchy plus existing
> explicit directed Life links**. It stores no graph truth, never replaces Browse/Edit, and never
> creates, deletes, infers, or rewrites relationships.

The Graph shows two edge kinds and invents neither:

- **hierarchy edges** — `life_nodes.parent_id` within the active connected tree;
- **link edges** — existing `life_links` rows, directed source → target, created only through the
  Task 41 flow.

No edge is inferred, derived, typed, weighted, or computed from titles, tags, documents, time, or
co-occurrence.

## 2. Schema

**Schema stays 26. There is no migration and no schema change of any kind.** Migrations 1–26 are
untouched. No table, column, index, view, trigger, or CHECK is added or modified. No graph
coordinate, layout, zoom, pan, selection, or collapsed state is ever persisted.

## 3. Projection authority

Rust owns the projection. One read-only command:

```text
get_life_graph_projection   (no input)
```

```text
LifeGraphProjection { root_id, tree_revision, nodes, links }
LifeGraphNodeView   { id, parent_id, title, icon_key, depth, sort_key, is_leaf,
                      outgoing_link_count, incoming_link_count }
LifeGraphLinkView   { link_id, source_node_id, target_node_id }
```

The command performs **no write of any kind**: no row, no `tree_revision` bump, no `life_operations`
entry, no navigation preference, no analytics source revision.

**Scope of the projection.** `nodes` is the connected active tree reachable from the Life root
through non-archived parent edges, in the same deterministic `printf('%010d:%s',sort_key,id)` path
order Life Edit already uses. `links` is every `life_links` row whose source **and** target are both
members of that node set, ordered by `(source_node_id, target_node_id, link_id)`.

A link with an endpoint outside the active tree — archived, or below an archived edge — has no node
to attach to and is therefore absent from `links`. This is the definition of the projection, not
truncation. The underlying row is never deleted, disabled, or altered, Task 41 semantics are
unchanged, and the Links panel remains the authority for archived and unavailable endpoints.

`outgoing_link_count` and `incoming_link_count` are derived from the already-bounded `links` list.

**Query shape.** Exactly two bounded statements, no N+1 and no per-node query.

## 4. Bounds — reject, never truncate

```text
MAX_GRAPH_NODES = 500
MAX_GRAPH_LINKS = 2_000
MAX_GRAPH_DEPTH = 128
```

Exceeding any bound returns a Rust-owned refusal and **no partial payload**:

- more than 500 active nodes — *"This Life tree is too large for the graph explorer (500 node maximum)."*
- more than 2,000 eligible links — *"This Life tree has too many links for the graph explorer (2,000 link maximum)."*
- any node deeper than 128 — *"This Life tree is too deep for the graph explorer (128 level maximum)."*

A partial graph that silently omits nodes or relationships is worse than no graph. Truncation,
sampling, top-N selection, and degree-based pruning are prohibited. `MAX_GRAPH_DEPTH` matches the
breadcrumb recursion bound already used by `life_link`.

## 5. Layout

Node positions come from the existing `d3-hierarchy` tidy-tree algorithm, computed from parent/child
edges only. Explicit links are drawn as a **second pass** of curves between those positions and are
never fed into `hierarchy()`. The same projection always produces identical geometry.

Prohibited: force simulation, physics, relaxation, animation-driven positioning, workers, canvas or
WebGL rendering, persisted coordinates, and user-draggable nodes. **No new dependency** — specifically
not `d3-force`, Cytoscape, Graphology, or vis-network. Adding a graph library to avoid implementation
work is not an accepted response.

The tidy-tree layout is extracted from `LifeEditWorkspace` into a shared module now that Graph is a
second concrete use. Life Edit geometry and behaviour are unchanged.

## 6. Accessibility

The drawn `<svg>` is `aria-hidden="true"` and non-interactive, exactly as the Life Edit canvas and the
Browse connectors already are. No SVG element is focusable.

The non-visual equivalent is required, not optional, and consists of:

- a **node selector** of real focusable controls, one per node, with descriptive accessible names;
- a **selected-node inspector** giving title, depth, parent, child count, and link counts as text;
- a **complete semantic connection list** covering the parent edge, child edges, outgoing links, and
  incoming links, each a labelled control that selects that node.

Every relationship drawn visually has a text counterpart. Nothing is conveyed by colour or position
alone. Keyboard parity, deterministic focus after selection, and **zero applicable axe violations**
are required. Section heading ids must not collide with `life-links-heading`.

Bound refusals and the empty state render as plain explanatory text carrying the Rust-owned message,
never as a partial graph.

## 7. Life integration

Integration is confined to the existing Life destination and is **transient**.

`graph` never becomes a Life mode. `life_navigation_preferences.last_life_mode` stays constrained to
`('browse','edit','pinned','reader')` and is never written with `graph`. There is **no new route, no
sidebar destination, and no startup restoration**. The Graph is held in ordinary component state, so
any remount or restart drops it and returns the user to their persisted mode.

Life gains one compact chrome action beside the existing Browse / Edit / Pinned buttons. The
workspace is lazily loaded. Closing it returns to the untouched underlying mode.

The projection is cached under `["life", "graph"]`. Life tree mutations, pin changes, and branch
import already invalidate the `["life"]` prefix; link create and remove additionally invalidate the
graph key.

Selecting a node in the Graph may navigate Life to that node. Graph-origin navigation **never appends
Reader link history** — `openLinkedReader` and its history stack are untouched.

## 8. Hard exclusions

No migration or schema change; no persisted graph truth of any kind including coordinates, layout,
zoom, pan, last selection, or collapsed state; no create, delete, retarget, or edit of links or nodes
from the Graph; no inferred, derived, typed, weighted, or suggested edges; no clustering, community
detection, pathfinding, centrality, or ranking; no non-Life endpoints; no Task, document, tag, or
Narrative Canvas nodes; no Noteboard, prediction, or scoring; no graph in Search, Analytics, Calendar,
Today, Saved Views, Focus Plan, backup, or Portable/Branch packages; no `graph` in any schema CHECK,
persisted mode, route, or sidebar; no force simulation, physics, worker, canvas, or WebGL; no new
dependency, capability beyond the single command permission, workflow or seal change; no production
test hook and no weakened assertion; and no Task 45 work.
