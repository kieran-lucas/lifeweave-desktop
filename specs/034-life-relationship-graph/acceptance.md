# Task 44 Acceptance Mapping

Status: ACTIVE — executable evidence will be recorded in
`docs/audits/task-44-life-relationship-graph.md`.

## Projection model

- [ ] The projection returns the connected active tree plus existing explicit directed Life links.
- [ ] Hierarchy edges come only from `parent_id`; link edges come only from `life_links` rows.
- [ ] No edge is inferred, derived, typed, weighted, or computed from titles, tags, or documents.
- [ ] Archived nodes and everything below an archived edge are excluded.
- [ ] A link with an endpoint outside the active tree is absent while its row stays untouched.
- [ ] Outgoing and incoming counts match the projected link list exactly.
- [ ] Node and link ordering are deterministic across repeated calls.
- [ ] An empty tree and a single-node tree both project cleanly.

## Read-only

- [ ] The command writes no row, no `tree_revision` bump, no `life_operations` entry, no navigation
      preference, and no analytics source revision.
- [ ] The Graph offers no way to create, delete, retarget, or edit any node or link.
- [ ] Task 41 link semantics and Task 42 branch interchange are unchanged.

## Bounds

- [ ] 500 nodes project; 501 nodes are rejected with the exact message and no partial payload.
- [ ] 2,000 links project; 2,001 links are rejected with the exact message and no partial payload.
- [ ] Depth 128 projects; depth 129 is rejected with the exact message and no partial payload.
- [ ] No truncation, sampling, top-N selection, or degree-based pruning exists anywhere.

## Query shape

- [ ] The projection issues exactly two bounded statements with no N+1 and no per-node query.

## Layout

- [ ] Positions come from the existing `d3-hierarchy` tidy tree over parent/child edges only.
- [ ] Explicit links are a second drawing pass and are never fed into the hierarchy.
- [ ] The same projection yields identical geometry across repeated builds.
- [ ] No force simulation, physics, worker, canvas, WebGL, persisted coordinate, or drag exists.
- [ ] Life Edit geometry and behaviour are unchanged by the layout extraction.

## Accessibility

- [ ] The drawn surface is `aria-hidden`, non-interactive, and contains no focusable element.
- [ ] A focusable node selector exposes every node with a descriptive accessible name.
- [ ] The selected-node inspector gives title, depth, parent, child count, and link counts as text.
- [ ] The connection list covers parent, children, outgoing links, and incoming links completely.
- [ ] Every relationship drawn visually has a text counterpart; nothing is colour- or position-only.
- [ ] Bound refusals and the empty state render the Rust-owned message as plain text.
- [ ] Keyboard parity, deterministic focus, and zero applicable axe violations.
- [ ] No heading id collides with `life-links-heading`.

## Transient integration

- [ ] `graph` is never written to `last_life_mode` and appears in no schema CHECK.
- [ ] No route, sidebar destination, or startup restoration is added.
- [ ] Graph state does not survive a remount or restart; the persisted mode is restored instead.
- [ ] The projection is cached under `["life","graph"]` and link mutations invalidate it.
- [ ] Graph-origin navigation never appends Reader link history.

## Governance

- [ ] Schema stays 26; there is no migration and migrations 1–26 are unchanged.
- [ ] Zero dependencies are added, removed, or upgraded.
- [ ] No workflow or seal drift; no capability expansion beyond the single command permission.
- [ ] Analytics, Calendar, Search, Saved Views, Focus Plan, Today, backup, and packages are unchanged.
- [ ] Performance stays inside the authorized envelope with no inflated budget.
- [ ] The native phase passes through accessible UI and is proven load-bearing by a reverted
      deliberate break, with no production test hook and no weakened assertion.
- [ ] All gates pass, Task 45 remains unstarted, `HEAD == origin/main`, and the worktree is clean.
