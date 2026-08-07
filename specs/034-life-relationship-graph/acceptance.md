# Task 44 Acceptance Mapping

Status: CLOSED — executable evidence is recorded in
`docs/audits/task-44-life-relationship-graph.md`.

## Projection model

- [x] The projection returns the connected active tree plus existing explicit directed Life links.
- [x] Hierarchy edges come only from `parent_id`; link edges come only from `life_links` rows.
- [x] No edge is inferred, derived, typed, weighted, or computed from titles, tags, or documents.
- [x] Archived nodes and everything below an archived edge are excluded.
- [x] A link with an endpoint outside the active tree is absent while its row stays untouched.
- [x] Outgoing and incoming counts match the projected link list exactly.
- [x] Node and link ordering are deterministic across repeated calls.
- [x] An empty tree and a single-node tree both project cleanly.

## Read-only

- [x] The command writes no row, no `tree_revision` bump, no `life_operations` entry, no navigation
      preference, and no analytics source revision.
- [x] The Graph offers no way to create, delete, retarget, or edit any node or link.
- [x] Task 41 link semantics and Task 42 branch interchange are unchanged.

## Bounds

- [x] 500 nodes project; 501 nodes are rejected with the exact message and no partial payload.
- [x] 2,000 links project; 2,001 links are rejected with the exact message and no partial payload.
- [x] Depth 128 projects; depth 129 is rejected with the exact message and no partial payload.
- [x] No truncation, sampling, top-N selection, or degree-based pruning exists anywhere.

## Query shape

- [x] The projection issues exactly two bounded statements with no N+1 and no per-node query.

## Layout

- [x] Positions come from the existing `d3-hierarchy` tidy tree over parent/child edges only.
- [x] Explicit links are a second drawing pass and are never fed into the hierarchy.
- [x] The same projection yields identical geometry across repeated builds.
- [x] No force simulation, physics, worker, canvas, WebGL, persisted coordinate, or drag exists.
- [x] Life Edit geometry and behaviour are unchanged by the layout extraction.

## Accessibility

- [x] The drawn surface is `aria-hidden`, non-interactive, and contains no focusable element.
- [x] A focusable node selector exposes every node with a descriptive accessible name.
- [x] The selected-node inspector gives title, depth, parent, child count, and link counts as text.
- [x] The connection list covers parent, children, outgoing links, and incoming links completely.
- [x] Every relationship drawn visually has a text counterpart; nothing is colour- or position-only.
- [x] Bound refusals and the empty state render the Rust-owned message as plain text.
- [x] Keyboard parity, deterministic focus, and zero applicable axe violations.
- [x] No heading id collides with `life-links-heading`.

## Transient integration

- [x] `graph` is never written to `last_life_mode` and appears in no schema CHECK.
- [x] No route, sidebar destination, or startup restoration is added.
- [x] Graph state does not survive a remount or restart; the persisted mode is restored instead.
- [x] The projection is cached under `["life","graph"]` and link mutations invalidate it.
- [x] Graph-origin navigation never appends Reader link history.

## Governance

- [x] Schema stays 26; there is no migration and migrations 1–26 are unchanged.
- [x] Zero dependencies are added, removed, or upgraded.
- [x] No workflow or seal drift; no capability expansion beyond the single command permission.
- [x] Analytics, Calendar, Search, Saved Views, Focus Plan, Today, backup, and packages are unchanged.
- [x] Performance stays inside the authorized envelope with no inflated budget.
- [x] The native phase passes through accessible UI and is proven load-bearing by a reverted
      deliberate break, with no production test hook and no weakened assertion.
- [x] All gates pass, Task 45 remains unstarted, `HEAD == origin/main`, and the worktree is clean.
