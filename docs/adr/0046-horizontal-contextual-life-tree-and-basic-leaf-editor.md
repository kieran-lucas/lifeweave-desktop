# ADR 0046 — Horizontal contextual Life Tree and stable Basic Leaf editor

## Status

Accepted on 2026-08-11 by explicit Product Owner direction as a narrow usability amendment to the
active Task 51 / Slice 041. This records, rather than hides, the conflict with Slice 041's original
presentation-only boundary and with the earlier visible “Life Edit” interaction. The immutable
source, schema 27, Rust domain rules, typed IPC, migrations, Graph behavior, and Browse projection
are unchanged.

The Product Owner's later composition refinement in the same pass is also recorded here: it changes
only already-authorized Task 51 presentation for the Tree shell and Focus Plan detail surface.
On 2026-08-13, the Product Owner refined that presentation again: Focus Plan detail omits the
Definition of done and Linked work regions, retains their stored authority unchanged, preserves
authored single line breaks in read mode, and uses a 70% focused frame. The Life navigator keeps
its 15% column while increasing its navigation and child-label type for legibility.
Later on 2026-08-13, the Product Owner explicitly disabled direct Tree node drag-and-drop, required
dismissable non-black selection, required full untruncated node titles, and locked an English-only
53-node Life Focus hierarchy with a meaningful semantic icon on every node. Schema 29 performs the
identity-preserving hierarchy correction; it does not replace existing leaf documents.
The Product Owner then requested a denser whole-tree composition and controlled mouse-wheel /
trackpad scrolling without exposing scrollbars. This is presentation and input behavior only; it
does not change stored coordinates or structural mutation authority.

## Context

The full-tree workspace grew top-to-bottom and permanently reserved a dense inspector column. The
primary act of selecting a node therefore exposed every advanced operation before the user had
expressed an editing intent. The Basic Leaf editor also configured two extensions named `link`,
requested a React render for every ProseMirror transaction, rebuilt option objects after status
updates, hid wide table overflow, and offered only table insertion—not row, column, or deletion
operations. Together these defects made ordinary typing/deletion feel unstable and table editing
unnecessarily difficult.

## Decision

1. Browse retains selected-plus-direct-children semantics. Its separate structural workspace is
   visibly named **Tree**, not Edit.
2. Tree generations grow from root at the left toward descendants at the right. The read-only Graph
   keeps its existing orientation.
3. Selecting a tree node reveals exactly two controls beside it: **Add child** and **Edit node**.
   Add child opens a focused one-field dialog. Edit node opens the existing advanced controls on
   demand; no mutation capability is deleted or duplicated. The action surface is centered on its
   node rather than offset from the icon, and closes when the node is activated again, an action is
   chosen, the pointer is pressed outside, or Escape is pressed. Escape restores focus to the node.
   Dense leaf rows place this surface above the selected leaf so the following sibling cannot
   conceal it; branch actions retain their below-node placement.
4. Direct node drag-and-drop is disabled. Reorder and reparent remain available only as explicit,
   keyboard-reachable Move controls under Edit node. The Tree viewport has no user-operated local
   scrollbars: holding and dragging empty canvas pans it in both axes, while a gesture beginning on
   a node does not pan or move the node. Mouse-wheel and two-axis trackpad input scroll through a
   damped delta capped below one node row per event; Shift plus a vertical wheel scrolls
   horizontally. Scrollbars remain visually hidden. Arrow keys pan, Shift increases the step, and
   Home returns to the origin. The
   Tree title is a compact header at the top of its pane; the bordered viewport consumes the
   remaining available height and the outer Life canvas cannot scroll in Tree mode. Advanced node
   controls, when requested, scroll only inside their own bounded column.
5. Basic Leaf disables StarterKit's built-in Link before installing the security-configured Link,
   keeps initial editor options stable, and sets `shouldRerenderOnTransaction: false`. A selected
   formatting-state projection rerenders controls only when relevant active state changes.
6. Recovery and commit timers live in refs and are scheduled from the latest editor update. Drafts
   and commits still share one serialized queue and preserve revision checks.
7. A selected table exposes add/delete row, add/delete column, and delete-table controls. Tables
   have usable cell sizing, selected-cell feedback, and local horizontal overflow.
8. A Focus Plan detail treats its title and lifecycle as compact identity, not a page-dominating
   hero. The authored outcome is the primary writing and reading surface in a 70% focused frame;
   authored single line breaks remain visible in read mode. Facts and lifecycle controls remain
   available without competing with that content plane. Definition of done and Linked work are no
   longer rendered on this surface; their stored data and backend authority are not deleted.
9. The existing 15% Life navigator geometry remains unchanged. Its Life/Tree controls,
   breadcrumbs, selected-node label, child rows, metadata, and empty copy use a modestly larger
   type scale so the hierarchy remains readable without widening the navigator.
10. Tree nodes use wider cards and wrap complete titles without ellipsis. Selection uses restrained
    accent treatment and is cleared by repeat activation, outside pointer press, Escape, or editor
    close. The first activation after opening Tree is never consumed by a hidden preselection.
11. Schema 29 keeps the canonical IDs while converging titles, parentage, order, themes, pins, and
    semantic icons to the Product Owner's exact 1 + 4 + 12 + 36 Life Focus structure. Titles are
    English-only. Finance is under Security; Contingency & Recovery remains the final child of
    Safety & Continuity. Existing Basic Leaf content is preserved by stable identity.
12. Tree layout uses the measured maximum card width of each generation plus one compact generation
    gap, instead of a fixed oversized depth stride. Sibling/cousin spacing stays collision-tested
    against the complete canonical 53-node hierarchy.
13. Life's dedicated session history captures the actual current Reader when another sibling leaf
    is opened. Back therefore restores Leaf 1 after `Leaf 1 -> Leaf 2`, and only the following Back
    returns to the containing branch.

## Consequences

- Schema 29 is the only migration introduced by the later Life Focus correction. It changes no
  table shape and preserves documents and relationships by stable node identity. No new command,
  capability, dependency, or remote asset is introduced.
- The stored navigation preference may continue using the existing internal `edit` value for
  compatibility; that implementation key is not presented as a user-facing mode.
- Native browser input remains responsible for Backspace/Delete dispatch. Deterministic tests cover
  real ProseMirror deletion/table transactions; native WebView click/typing evidence must be
  reported separately and never inferred from jsdom.
