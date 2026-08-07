# Task 44 — Life Relationship Graph Explorer Core

## Scope and baseline

Task 44 / Slice 034 adds a **read-only, transient explorer of the active Life hierarchy plus
existing explicit directed Life links**, under
[ADR 0038](../adr/0038-life-relationship-graph-explorer.md).

```text
activation baseline:      2d5b5d335137fe2a09f60b585d11a14a839b1e25
activation commit:        28b540c
Task 43 feature checkpoint: b4510ddbffbd0e8c4d5ae84213973b723df4cbad
starting schema:          26
final schema:             26  (no migration, no schema change)
```

The relationships already existed and were already authoritative. Only the view is new: hierarchy
edges come from `life_nodes.parent_id` and link edges from `life_links` rows created through the
Task 41 flow. Nothing is inferred, derived, typed, or weighted, and the explorer cannot create,
delete, retarget, or edit anything.

## Authority trace

`Graph` appeared in three places, read in `AI_CONSTITUTION.md` §1 order:

| Surface | Reading |
|---|---|
| `DECISION_REGISTRY.md` **OPEN — Product/UX**: `Graph` | OPEN means a Product Owner decision is required first. ADR 0038 is that decision. |
| `DECISION_REGISTRY.md` **DEFERRED**: "Graph and generalized knowledge features" | §3 forbids navigation, schema, dependency, or placeholders that *constrain Core*. This slice adds none of those. |
| `CORE_PRODUCT_SPEC.md` "Explicitly excluded from Core critical path" | Not a prohibition. **Backlinks and tags sit on the same line and have both shipped** under their own decisions without that line being edited. |
| `EXPANSION_VISION.md`: "Graph never replaces the Life tree." | Directly consistent with the decision. |
| `CLAUDE.md`: Graph prohibited "unless activated by an approved spec" | Activation condition satisfied by ADR 0038 + Slice 034. |

No stop condition. Both registry entries were narrowed to record the read-only transient explorer as
DECIDED while persisted graph truth, graph as a destination, graph editing,
inferred/derived/typed/weighted edges, non-Life endpoints, clustering, pathfinding, centrality,
ranking, and generalized knowledge features all remain OPEN or DEFERRED, and none is allocated.

## Projection semantics and bounds

One read-only command, `get_life_graph_projection` (no input), in `src-tauri/src/life/graph.rs`.

```text
MAX_GRAPH_NODES = 500     MAX_GRAPH_LINKS = 2_000     MAX_GRAPH_DEPTH = 128
```

- `nodes` is the connected active tree reachable from the Life root through non-archived parent
  edges, in the same deterministic `printf('%010d:%s',sort_key,id)` path order Life Edit already
  uses. `links` is every `life_links` row whose source **and** target are both members of that set,
  ordered by `(source_node_id, target_node_id, link_id)`.
- **Reject, never truncate.** Over-bound trees return a Rust-owned message and no payload:
  *"This Life tree is too large for the graph explorer (500 node maximum)."*,
  *"This Life tree has too many links for the graph explorer (2,000 link maximum)."*,
  *"This Life tree is too deep for the graph explorer (128 level maximum)."*
  Bound order is fixed (nodes, then depth, then links) so a tree breaching more than one always
  reports the same reason.
- The recursion guard is bound one level past `MAX_GRAPH_DEPTH` and the row limit one past
  `MAX_GRAPH_NODES`, so an over-bound tree is *detected* rather than silently cut, without loading
  it.
- A link with an endpoint outside the active tree is absent **by definition of the projection, not
  by truncation**. The underlying row is never deleted, disabled, or altered; Task 41 semantics are
  unchanged and the Links panel remains the authority for archived and unavailable endpoints.
- `MAX_GRAPH_DEPTH` matches the breadcrumb recursion bound already used by `life_link::repository`.

**Query shape:** two bounded projection statements over nodes and links, plus one constant-time
singleton revision read delegated to `life::edit::tree_revision`. No per-node query and no N+1.
Link counts are derived in Rust from the already-bounded link list.

## Layout

`buildLifeEditLayout` was extracted from `LifeEditWorkspace` into
`frontend/src/features/life/lifeTreeLayout.ts` now that Graph is a second concrete use, with
defaulted geometry options and a structural `{ id; parent_id; sort_key }` parameter type. Life Edit
geometry is unchanged and its existing 100/500/2000-node determinism test passes untouched.

Positions come from `d3-hierarchy` over parent/child edges only. Explicit links are drawn as a
**second pass** of curves between those positions and are never fed into `hierarchy()`. No force
simulation, physics, worker, canvas, WebGL, persisted coordinate, or drag. **Zero dependencies
added** — `d3-hierarchy` was already resident in `index.js` through the eager Life Edit import.

## Accessibility

The drawn `<svg>` is `aria-hidden="true"`, `focusable="false"`, and `pointer-events: none`, matching
the Life Edit canvas and Browse connectors. No SVG element is focusable. The non-visual equivalent
is a focusable node selector with descriptive names, a selected-node inspector, and a complete
semantic connection list covering parent, children, outgoing links, and backlinks.

A test walks every node through the selector and asserts the total number of text connection controls
equals twice the number of drawn edges — once from each endpoint — so a drawn edge with no text
counterpart cannot exist. Heading ids are namespaced `life-graph-*` and never collide with
`life-links-heading`. Zero applicable axe violations.

## Transient integration

`graph` is **never** a Life mode. It is held in ordinary component state, so it is structurally
unable to reach the Rust navigation-preference validator, which still accepts only
`browse | edit | pinned | reader`. `life_navigation_preferences.last_life_mode` and its CHECK are
untouched; there is no route, sidebar destination, or startup restoration; a remount or restart
returns the user to the persisted mode.

Cached under `["life","graph"]`. Tree mutations, pin changes, and branch import already invalidate the
`["life"]` prefix. Link create/remove was the only gap and now invalidates the graph key through
`invalidateLifeLinkMutations`. `invalidateLifeLinkLifecycle` was deliberately **not** widened:
document lifecycle changes neither the hierarchy nor any link row, and widening it over-invalidated
Portable and document flows.

Graph-origin navigation hands off to Browse using the history-free Life Edit `onBrowse` shape and
never appends Reader link history; `openLinkedReader` is untouched.

## Self-review defect found and fixed

Reviewing the full diff surfaced one real defect with no failing test: an external entry request
could switch Life to Reader while `graphOpen` was still true, so the graph would reappear when the
user later left Reader. Fixed in the product by clearing `graphOpen` where the entry request takes
over. The regression test was proven load-bearing by removing the fix — it failed — and restoring it.

## Evidence

| Gate | Result |
|---|---|
| `cargo test --locked -- --test-threads=1` | **725 passed**, 0 failed, 4 ignored (712 → 725; +13 `life::graph`) |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | clean, no `#[allow]` added |
| `cargo fmt -- --check` | clean |
| `pnpm test` | **673 passed** across 46 files (658 → 673), axe zero |
| `pnpm typecheck` | clean |
| `pnpm verify` | all six gates pass |
| `pnpm hardening:performance` | `violations: []` |
| `pnpm tauri build` | NSIS installer produced |
| `pnpm e2e:windows` | **24/24 native phases pass** |
| `pnpm hardening:rc` | all eight selectors green |

Rust `life::graph` coverage: deterministic path and link ordering; direction and derived counts;
archived nodes and everything below an archived edge excluded; a link with an excluded endpoint
absent while its row survives untouched; each bound accepted at the limit and rejected one past it
with the exact message and no partial payload; fixed bound-refusal precedence; root-only tree, plus
proof that a truly empty projection is unreachable because the Life root is trigger-protected against
archiving; and a writes-nothing assertion over `total_changes()`, every table's row count, and
`tree_revision`.

`rusqlite`'s `trace` and `hooks` features are both disabled, so runtime statement counting would have
required a dependency change for test-only instrumentation. The no-N+1 invariant is instead asserted
on the module's own production source — exactly two `conn.prepare` calls, zero ad-hoc `query_row`,
and two bound parameters per statement, neither of which is a node identifier. This is a source-shape
assertion and is recorded as such rather than described as runtime tracing.

### Native phase 15

`e2e-tests/specs/phase15-life-graph.e2e.ts` drives the graph through accessible UI: hierarchy nodes,
the explicit outgoing link, its reciprocal backlink, the child connection, and hand-off to Browse.

**No restart companion**, because the slice persists nothing and there is no state for a restart to
preserve. Non-persistence is proven inside the phase by a webview reload returning Life to its
persisted mode with `Graph` at `aria-pressed="false"`. That is a reload, **not a second process
boundary**; the phase does begin in a fresh process as phase 15 of the ordered suite, and the
Rust writes-nothing tests carry the persistence claim.

**Deliberate break:** replacing the projected link list with an empty vector, rebuilding, and
re-running phase 15 failed at
`section[aria-labelledby='life-graph-outgoing-heading'] h4=Outgoing links (1)` — the explicit-link
assertion — proving the phase load-bearing. The break was reverted, zero residue confirmed, the
installer rebuilt, and the full suite re-run green. No production test hook and no weakened
assertion exists.

## Performance

Three independent builds produced byte-identical normalized inventories.

| Aggregate | Task 43 accepted | Task 44 final | Delta | Authorized |
|---|---|---|---|---|
| startup `index.js` raw | 519,500 | 520,452 | **+952** | ≤ 2,048 |
| total raw | 1,204,073 | 1,212,126 | **+8,053** | ≤ 24,576 |
| deterministic gzip | 370,223 | 373,089 | **+2,866** | ≤ 8,192 |
| chunk count | 21 | 22 | +1 | — |

The workspace is `lazy()` because `LifeScreen` is eager; only the import stub and one chrome button
reach the startup chunk. `LifeGraphWorkspace.js` is 7,095 raw / 2,596 gzip, below the 10,000-byte
tracking threshold, so it is reported in `untracked_small_chunks` and needs no tracked entry — but
`expected_chunk_count` is an exact gate, so a new budget generation was required.

`docs/audits/task-44-performance-{baseline,budgets}.json` supersede the Task 43 pair and
`DEFAULT_BUDGET` is repointed. Locked ceilings are unchanged and no budget was inflated.
`NarrativeCanvasStudio.js` moved 20,063 → 20,069 raw because the new vanilla-extract stylesheet
shifts generated class identifiers; it remains far inside its unchanged derived maximum.

**Evidence correction:** `docs/audits/task-43-performance-budgets.json` carried
`measured_at_commit: "PENDING_CHECKPOINT"`. It is now the real Task 43 product checkpoint
`b4510ddbffbd0e8c4d5ae84213973b723df4cbad`. This filled a value that was always meant to be the
checkpoint SHA and changed no measurement.

## Integrity state

- Schema stays **26**. Zero migrations; `git diff` over `src-tauri/src/infrastructure/sqlite/` is
  empty; migrations 1–26 untouched.
- Zero dependency drift: `package.json`, lockfiles, and `Cargo.toml`/`Cargo.lock` unchanged.
  `d3-force`, Cytoscape, Graphology, and vis-network were not added.
- Zero workflow or seal drift.
- One Tauri capability added, `allow-get-life-graph-projection`, registered in identical order across
  the handler, the build manifest, and `capabilities/main.json`; `verify_security.py` passes.
- No `'graph'` value appears in any schema CHECK, route table, or sidebar list.
- Generated TypeScript bindings were produced by the accepted test-driven generator and never
  hand-edited. No component calls raw `invoke`.
- Analytics, Calendar, Search, Saved Views, Focus Plan, Today, backup/restore, Portable Package, and
  Life Branch Package semantics are unchanged.

## Closure

Task 45 is neither allocated, started, nor recommended.

```text
product checkpoint: 7e95644dcced19a1a8349706990d20d1df53a2e1
closure commit:     5380883
```
