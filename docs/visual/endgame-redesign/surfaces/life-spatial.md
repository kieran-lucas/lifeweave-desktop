# Surface Authority — Life Spatial

**Scope:** Life Browse/Pinned/Edit and Life Graph.

**Canonical closure IDs:** L-01, L-02, L-03, L-04, L-05, L-06, L-07, L-08, LG-01, LG-02, LG-03, LG-04

**Visual references:** `references/05-life-direction.png`

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

# Life System

## 16. L-01 — Life top-level mode header

Actual modes:

- Browse
- Edit
- Pinned
- Graph

Target:

- Life System page title;
- modes are one low-chrome tab family;
- Graph is a transient mode/workspace, not a separate route;
- no generic “Atlas / Timeline / List” controls unless added by product.

### L-02 — Browse / populated branch

Actual:

- Back;
- breadcrumb;
- optional fallback notice;
- focal node;
- child cards;
- pin controls;
- optional pagination;
- Related tasks.

Focal actual content:

- icon;
- direct child count;
- title;
- short description;
- tags;
- Pin/Unpin focal node.

Child:

- icon;
- title;
- description;
- Leaf — opens Reader OR direct-child count;
- tags;
- Pin/Pinned.

Target:

- treat Browse as a **hierarchical spatial document**, not a radial fantasy graph;
- focal node anchors the top/left-to-center composition;
- children form a bounded readable hierarchy;
- connector lines are quiet;
- child cards may use near-white Life tints but remain mostly neutral;
- focal uses blue family for distinction;
- pin control compact and subordinate.

Forbidden:

- invented health/work/finance metrics;
- arbitrary six-node radial atlas if current hierarchy does not produce it;
- zoom controls;
- timeline mode.

### L-03 — Browse / empty branch

Actual:

- `This branch is ready`
- `No child nodes have been added yet.`

Target:

- keep focal context visible;
- empty child region is small and instructive;
- no full-page empty takeover.

### L-04 — Browse / pagination

Actual:

- Previous children
- Page x of y
- Next children

Target:

- centered/edge-aligned pager beneath child region;
- no numbered pagination unless behavior changes.

### L-05 — Pinned / populated

Actual:

- list of pinned nodes;
- card opens Browse/Reader;
- Unpin.

Target:

- readable vertical list, not centered card island;
- same node DNA as Browse but denser.

### L-06 — Pinned / empty / unavailable

Actual:

- No pinned nodes;
- archived node may be unavailable;
- Unpin still available.

Target:

- unavailable state muted + explicit label;
- no opacity so low that title becomes unreadable.

### L-07 — Life Edit canvas

Actual:

- full tree canvas with positioned node cards;
- hierarchy edges;
- selected node;
- drag/drop;
- local-scroll viewport.

Target:

- the canvas is the hero;
- use a precise neutral drafting-board plane;
- no fake infinite-grid effects required;
- node cards compact;
- selected node blue companion signal;
- hierarchy lines thin;
- viewport owns scroll;
- do not add zoom/pan toolbar.

### L-08 — Life Edit inspector

Actual controls:

- Edit {title};
- protected root/depth/leaf-branch info;
- Title + Save title;
- Short description;
- Local icon select:
  - life-root
  - life-branch
  - life-leaf
  - life-focus
  - life-note;
- Theme variant:
  - neutral
  - blue
  - green
  - amber
  - violet;
- Save details;
- Tags for non-root;
- New child + Create child;
- Move up;
- Move down;
- conditional Move to parent level;
- Move into branch select;
- Move into selected branch;
- Open in Browse;
- Archive subtree;
- branch/tree interchange;
- Undo latest tree change;
- Archived nodes list + Restore.

Target:

- fixed bounded inspector rail;
- form controls grouped:
  1 identity;
  2 classification/tags;
  3 create child;
  4 move/restructure;
  5 interchange;
  6 undo/archive recovery.
- Archive subtree visually separated as destructive.
- Undo remains action, not a toast.

### L-09 — Life Edit drag state

Actual:

- drag overlay `Moving {title}`;
- drop-before and move-into targets;
- status announcements;
- invalid descendants/self.

Target:

- drag overlay is true floating material;
- target indication blue and precise;
- no giant glow;
- invalid targets should not look interactable.

### L-10 — Archived nodes

Actual:

- empty state;
- list;
- Restore.

Target:

- compact recovery region near bottom inspector;
- not an accordion unless behavior changes.

---

# Life Graph

## 17. LG-01 — Graph normal

Actual:

- `Life graph`;
- node/explicit-link count;
- read-only statement;
- Close graph;
- local-scroll canvas;
- hierarchy edges;
- explicit links;
- node marks;
- inspector;
- all explicit links table.

Target:

- preserve Graph as a technical explorer;
- canvas and inspector form a two-region workspace;
- graph drawing remains quiet;
- selected node tonal/blue;
- hierarchy edge solid;
- explicit link dashed/arrow;
- unavailable explicit link dotted;
- labels remain legible at normal density.

### LG-02 — Graph semantic inspector

Actual:

- explanation;
- Life node select;
- title;
- node kind;
- level;
- child/outgoing/backlink counts;
- Open in Reader/Browse;
- Parent;
- Children;
- Outgoing links;
- Backlinks.

Target:

- selector at top;
- selected title + compact metadata;
- open action clear;
- connection groups are structured lists with count headings;
- no cards per relationship.

### LG-03 — All explicit links

Actual table.

Target:

- horizontally local-scrollable if needed;
- one table surface;
- strong column alignment;
- no graph-only information hidden from text table.

### LG-04 — Graph error

Actual:

- Life graph unavailable;
- backend/refusal text;
- Close graph.

Target:

- preserve Life page;
- local notice;
- no full-page crash state.

Forbidden:

- zoom;
- pan toolbar;
- minimap;
- node creation/editing;
- link editing.

---
