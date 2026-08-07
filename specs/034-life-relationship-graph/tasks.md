# Task 44 Work Breakdown

Unchecked entries are unfinished work and this file is the resumable execution ledger.

## A. Activation

- [x] T44-A01 confirm clean main, baseline `2d5b5d3`, remote parity, and workflow-seal identity;
- [x] T44-A02 read authority and localize the Life tree projection, link repository, Life chrome,
      and the Edit tidy-tree layout;
- [x] T44-A03 trace every `Graph` mention across the Decision Registry, Core Product Spec, Expansion
      Vision, and `CLAUDE.md`, and confirm no stop condition;
- [x] T44-A04 create Slice 034 and ADR 0038;
- [x] T44-A05 measure the clean production bundle inventory before any product change
      (21 chunks, 1,204,073 raw, 370,223 deterministic gzip, 519,500 startup `index.js`);
- [x] T44-A06 activate Project State with schema unchanged at 26 and synchronize governance surfaces;
- [x] T44-A07 pass activation governance and commit activation with no product code.

`database_schema_version` stays 26 throughout: this slice adds no migration.

## B. Rust read-only projection

- [x] T44-B01 add `life/graph.rs` with `MAX_GRAPH_NODES`, `MAX_GRAPH_LINKS`, and `MAX_GRAPH_DEPTH`;
- [x] T44-B02 project the connected active tree with the proven path ordering, in one statement;
- [x] T44-B03 project links whose both endpoints are active-tree members, in one statement;
- [x] T44-B04 derive outgoing and incoming counts in Rust from the bounded link list, no third query;
- [x] T44-B05 reject over-node, over-link, and over-depth trees with the exact messages and no
      partial payload;
- [x] T44-B06 prove archived nodes and everything below an archived edge are excluded;
- [x] T44-B07 prove a link with an excluded endpoint is absent while its row stays untouched;
- [x] T44-B08 prove deterministic node and link ordering;
- [x] T44-B09 prove the projection writes nothing: no row, revision, operation, or preference change;
- [x] T44-B10 prove empty-tree and single-node projections.

## C. DTO, IPC, and bindings

- [x] T44-C01 add `LifeGraphProjection`, `LifeGraphNodeView`, and `LifeGraphLinkView` to `life/dto.rs`;
- [x] T44-C02 register the DTOs in the accepted test-driven binding generator and regenerate;
- [x] T44-C03 add the no-input `get_life_graph_projection` command beside `get_life_edit_projection`;
- [x] T44-C04 register `allow-get-life-graph-projection` in identical order across the handler, the
      build manifest, and the Tauri capability;
- [x] T44-C05 add the typed wrapper to the centralized IPC adapter.

## D. Shared deterministic layout

- [x] T44-D01 extract the tidy-tree layout into a shared module with defaulted geometry options;
- [x] T44-D02 accept a structural node parameter type so both Life Edit and Graph views satisfy it;
- [x] T44-D03 update both existing importers and keep Life Edit geometry byte-identical;
- [x] T44-D04 re-run the existing 100/500/2000-node determinism test unchanged.

## E. Graph workspace

- [x] T44-E01 add the lazily loaded workspace with an `aria-hidden`, non-interactive drawn surface;
- [x] T44-E02 draw hierarchy edges from the tidy layout and link edges as a distinct second pass;
- [x] T44-E03 add the focusable node selector with descriptive accessible names;
- [x] T44-E04 add the selected-node inspector;
- [x] T44-E05 add the complete semantic connection list: parent, children, outgoing, incoming;
- [x] T44-E06 render bound refusals and the empty state as text carrying the Rust-owned message;
- [x] T44-E07 prove keyboard parity, deterministic focus, and zero applicable axe violations;
- [x] T44-E08 prove identical geometry for the same projection across repeated builds.

## F. Transient Life integration

- [x] T44-F01 hold Graph in ordinary component state, never as a Life mode;
- [x] T44-F02 prove `graph` is never written to the navigation preference;
- [x] T44-F03 add one compact chrome action and mount the workspace behind `Suspense`;
- [x] T44-F04 cache under `["life","graph"]` and extend link invalidation to cover it;
- [x] T44-F05 prove Graph-origin navigation never appends Reader link history;
- [x] T44-F06 prove Graph state does not survive a remount.

## G. Native evidence

- [x] T44-G01 add `phase15-life-graph.e2e.ts` and its support fixtures, registered in `$allPhases`;
- [x] T44-G02 exercise the graph through accessible UI, including hierarchy and explicit-link edges;
- [x] T44-G03 prove non-persistence inside the phase and state the reload limitation plainly;
- [x] T44-G04 prove the phase load-bearing with a deliberate break on explicit-link projection,
      revert it, and verify zero residue;
- [x] T44-G05 add a `life::graph` selector to the RC dogfood script.

## H. Performance, review, and closure

- [x] T44-H01 measure the final bundle across three builds against the authorized delta;
- [x] T44-H02 record truthful Task 44 versioned budget and baseline evidence and repoint the default;
- [x] T44-H03 correct the Task 43 budget `measured_at_commit` placeholder to the real checkpoint;
- [x] T44-H04 run focused and broad gates including native phases, Tauri build, and RC dogfood;
- [x] T44-H05 review the full baseline diff once and fix confirmed in-scope defects only;
- [x] T44-H06 write the closure audit and close every governance surface without allocating Task 45;
- [x] T44-H07 commit, push after gates, and confirm clean remote parity.
