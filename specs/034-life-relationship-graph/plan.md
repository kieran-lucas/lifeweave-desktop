# Task 44 Execution Plan

Status: COMPLETE. All stages passed; see
`docs/audits/task-44-life-relationship-graph.md`.

## Stage 0 — Activation and baseline

Confirm clean `main` and remote parity at `2d5b5d335137fe2a09f60b585d11a14a839b1e25`, record the
Task 43 feature checkpoint, read the authority surfaces, and trace every `Graph` mention across the
Decision Registry, Core Product Spec, Expansion Vision, and `CLAUDE.md`. Localize the Life tree
projection, the link repository, the Life screen chrome, and the Edit tidy-tree layout. Create
Slice 034 and ADR 0038, activate Project State with schema unchanged at 26, synchronize governance
surfaces, and pass activation governance with no product code in the commit.

## Stage 1 — Rust read-only projection

Add `life/graph.rs` owning the bounds, the two bounded statements, and the refusal messages. Reuse
the active-tree recursive CTE and path ordering already proven in `life::edit::projection`, with the
depth guard tightened so an over-deep tree is detected rather than silently cut. Derive link counts
in Rust from the bounded link list. Prove read-only behaviour, exact bound rejection with no partial
payload, archived exclusion, and deterministic ordering before any UI depends on them.

## Stage 2 — DTO, IPC, and bindings

Add three DTOs to `life/dto.rs`, register them in the accepted test-driven binding generator, and add
one no-input command beside `get_life_edit_projection`. Register `allow-get-life-graph-projection` in
the same position across the handler, the build manifest, and the Tauri capability. Add the typed
frontend wrapper to the centralized IPC adapter; no component calls raw `invoke`.

## Stage 3 — Shared deterministic layout

Extract the `d3-hierarchy` tidy-tree layout from `LifeEditWorkspace` into a shared module with
defaulted geometry options and a structural node parameter type, now that Graph is a second concrete
use. Keep Life Edit geometry byte-identical and re-run its existing 100/500/2000-node determinism
test unchanged.

## Stage 4 — Lazy Graph workspace

Add the lazily loaded workspace: an `aria-hidden` drawn surface, a focusable node selector, a
selected-node inspector, and a complete semantic connection list. Hierarchy edges and link edges are
visually and semantically distinct. Bound refusals render the Rust-owned message as text. Keyboard
parity, deterministic focus, and zero applicable axe violations.

## Stage 5 — Transient Life integration

Hold Graph in ordinary component state so `graph` is structurally unable to reach the navigation
preference validator. Add one compact chrome action, mount the workspace behind `Suspense`, and cache
under `["life","graph"]`. Extend the existing link invalidation helpers to cover the graph key.
Graph-origin navigation reuses the history-free Edit callback shape and never appends Reader history.

## Stage 6 — Evidence, performance, review, and closure

Prove the full Rust matrix, focused frontend behaviour and axe, and one native Windows phase driven
through accessible UI with a deliberate break on explicit-link projection shown load-bearing and
reverted. Measure the bundle across three builds against the authorized delta and record truthful
Task 44 versioned budget evidence. Run focused and broad gates, review the full baseline diff once,
fix confirmed in-scope defects only, create the product checkpoint, close every governance surface
without allocating Task 45, commit, push, and confirm clean parity.

## Stop conditions

Stop before broadening scope if the active-tree projection cannot be produced within the stated
bounds using bounded queries; if a deterministic layout of the authorized size is not achievable with
the existing `d3-hierarchy` dependency; if the accessible equivalent cannot represent every drawn
relationship without adding persisted state; if transient integration would require a persisted mode,
schema CHECK, route, or sidebar entry; if higher repository authority contradicts a read-only
transient explorer; if performance remains irreducibly over budget; or if a newer valid Task 44 or 45
allocation conflicts.

Module, helper, DTO, file, and binding names, and local Life or layout refactoring, are not stop
conditions. Do not add a graph library, a force simulation, or persisted graph state to avoid a stop.
