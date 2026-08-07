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

---

# Post-closure remediation

Independent Product Owner review of the closed slice returned **CHANGES REQUIRED** with three
confirmed findings. This section records the remediation. It does not revise the sections above:
the original implementation genuinely did not satisfy these three contracts, and the evidence
recorded at closure was evidence of the shipped behaviour, not of the contract.

```text
reviewed state:      efc2790db5ead1e404ea876fabb433d8a0538f36
remediation commit:  3c3bffb666de52d5b72eb50621623f8a1a590c45
schema:              26 (unchanged)
```

## Finding 1 — Graph carried no document authority

**Confirmed.** `LifeGraphNodeView` and `LifeGraphLinkView` exposed no document kind or availability,
and `life::graph` read only `life_nodes` and `life_links`. The Graph could not distinguish a branch
from a Basic Leaf, a Narrative Canvas, or an empty leaf, and every projected edge looked equally
available.

**Root cause.** I wrote the slice spec around "hierarchy plus links" and never reconciled it against
the Task 41 availability model. Excluding archived endpoints was correct, but I treated *document*
unavailability as out of scope when it is the second half of the same rule.

**Fix.** `LifeGraphNodeView` gains `document_kind` and `LifeGraphLinkView` gains `availability`,
both reusing the existing `life_link::dto` enums rather than minting parallel ones, so the Graph and
the Links panel cannot drift. Classification reuses the Task 41 endpoint rule verbatim: a supported
document is exactly one committed Basic Leaf **or** exactly one committed Narrative Canvas.

Document counts join through two additional CTEs inside the **existing** node statement — one
`UNION ALL` over the two document tables, grouped by node, then left-joined. The projection still
issues exactly two prepared statements plus the singleton revision read, so the source-shape proof of
the query count still binds and is asserted against a 150-node half-documented tree.

Availability is derived in Rust from the already-bounded node and link lists:

```text
both endpoints documented leaves      → active
either endpoint undocumented          → unavailable, edge stays visible
endpoint archived / outside the tree  → edge absent, life_links row untouched
```

No schema change, no migration, no link mutation, and no document row is written or read for
mutation.

## Finding 2 — `Open in Life` always went to Browse

**Confirmed.** Every selected node was sent to Browse, and I had locked that behaviour into a test.

**Root cause.** Without document authority in the projection the frontend could not tell a documented
leaf from an empty one, so I chose the single safe destination and documented the choice instead of
recognising it as a contract violation. The test then froze the wrong behaviour.

**Fix.** Routing is now derived from the projection:

```text
active documented leaf         → Reader
active branch                  → Browse
active empty/unavailable leaf  → Browse
```

The button label states the destination, so the routing is visible before activation. Hand-off goes
through a new `openGraphNode` in `LifeScreen` that resolves the **exact stable node ID** through the
existing Life browse projection and refuses on `resolved_from_fallback`, an ID mismatch, or a
non-leaf, surfacing *"That Life leaf is unavailable."* rather than opening the wrong node. It appends
**no** history — neither Browse history nor the Task 41 linked-Reader history that `openLinkedReader`
owns — because Graph is top-level navigation.

The tests that locked the incorrect behaviour were replaced, not adjusted.

## Finding 3 — The visual layer was the accessibility surface

**Confirmed.** Every positioned graph node was a focusable `<button>`, so a 500-node graph was 500
tab stops, and the only semantic view of relationships was the selected node's connection groups —
reachable only by iterating every node.

**Root cause.** I read the "aria-hidden SVG plus node selector" requirement as satisfied by hiding
the `<svg>` and making the positioned marks buttons. That hides the drawing but makes the visual
layout the primary keyboard surface, which is the opposite of the intent.

**Fix.** The semantic layer is now the authority:

- a standard `<select>` node selector carrying **every** projected node in deterministic tree order,
  each labelled with its depth and its kind in words;
- the selected-node inspector, now stating node kind and document availability;
- a new **complete explicit-link table** listing every visible edge exactly once as
  `Source → Target → Availability`, with no node iteration required.

Positioned marks became non-focusable `aria-hidden` `<div>`s that retain pointer selection, so the
drawn canvas contributes **zero** tab stops. Visual and semantic selection stay synchronised in both
directions. Unavailable edges are drawn with a distinct dotted stroke class *and* labelled in text,
never by colour alone. Axe remains at zero violations.

The connection list is still bounded by the selected node's own degree, exactly like the Links panel;
that is a property of the node, not of graph size, and the tests assert the canvas separately.

## Finding 4 (contract item 4) — Initial selection

Graph now opens with the current Life node selected when it appears in the projection, falling back
to the root. It is component state only: not persisted, and `graph` still never reaches
`life_navigation_preferences`.

## Fail-before-fix and deliberate-break evidence

- **Finding 2 regression test proven load-bearing:** forcing `opensInReader` to `false` — the exact
  defect under review — made phase 15 fail at
  `Can't call click on element with selector "button=Open E2E Graph Source in Life Reader"`. Reverted;
  `grep -c "DELIBERATE BREAK"` returns 0 and the installer was rebuilt before the green run.
- **Two harness defects were found and fixed rather than worked around:** WebdriverIO's element-array
  `map` resolves to a promise and cannot be given to `Promise.all`; and the `openGraph` helper clicked
  the Graph toggle unconditionally, closing an already-open graph. Both were harness bugs, not product
  bugs, and are recorded as such.
- **Two database protections were discovered while writing tests** and are now asserted instead of
  being faked: a node cannot hold both document kinds, and a documented leaf cannot gain an active
  child. Both "unsupported leaf" transitions are therefore unreachable, so the tests assert the
  refusals and the classifier keeps a documented defensive arm.

## Native coverage limitation, stated plainly

There is **no production path** to remove or archive a committed document — every `archived_at` write
on `reader_documents` and `narrative_documents` in the repository is test-only — and Task 41 correctly
refuses to create a link to an undocumented leaf. An **unavailable edge is therefore not constructible
natively**, so phase 15 does not assert one. It asserts what the fixture can genuinely exercise: the
document-free leaf classified as `Empty leaf` in the selector, offered Browse and never Reader. The
unavailable-edge classification is proven by three `life::graph` Rust tests. This is a real coverage
boundary, not a passing claim.

## Remediation evidence

| Gate | Result |
|---|---|
| `cargo test --locked -- --test-threads=1` | **732 passed**, 0 failed, 4 ignored (725 → 732) |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | clean, no suppressions |
| `cargo fmt -- --check` | clean |
| `pnpm test` | **680 passed** across 46 files (673 → 680), axe zero |
| `pnpm typecheck` | clean |
| `pnpm verify` | all six gates pass |
| `pnpm hardening:performance` | `violations: []` |
| `pnpm tauri build` | NSIS installer produced |
| `pnpm e2e:windows -- phase15-life-graph.e2e.ts` | 4/4 |
| `pnpm e2e:windows` | **24/24 native phases pass** |
| `pnpm hardening:rc` | `core-rc-efc2790`, all eight selectors green, installer sha256 `82d0ac0da196a15374fb8a884a87cef33c7d0dcd8b49278006fc3d5ab794d3a3` |
| `git diff --check` | clean |

New Rust coverage: branch / Basic Leaf / Narrative Canvas / empty-leaf classification; documented
endpoints yield an active edge; an endpoint losing its document keeps the edge and marks it
unavailable while the `life_links` row survives; a branch endpoint is unavailable rather than absent;
an archived endpoint removes the edge while both the link and document rows survive; document
classification stays batched on a 150-node tree; and the schema is still 26.

New frontend coverage: the selector carries every node in tree order with its kind; the drawn canvas
has zero tab stops at 5 and at 205 nodes; visual and semantic selection stay synchronised; the link
table lists every edge exactly once with availability; unavailable edges differ by class and by text;
Graph opens on the current node and falls back to the root; `Open in Life` routes documented leaf →
Reader and branch / empty leaf → Browse; a stale Reader target fails safely without opening another
node; Reader hand-off adds no linked-Reader history.

## Performance

Measured across three builds; deterministic.

| Aggregate | Task 43 accepted | At closure | After remediation | Delta vs Task 43 | Authorized |
|---|---|---|---|---|---|
| startup `index.js` raw | 519,500 | 520,452 | 520,935 | **+1,435** | ≤ 2,048 |
| total raw | 1,204,073 | 1,212,126 | 1,214,646 | **+10,573** | ≤ 24,576 |
| deterministic gzip | 370,223 | 373,089 | 373,737 | **+3,514** | ≤ 8,192 |
| chunk count | 21 | 22 | 22 | +1 | — |

Still inside the originally authorized envelope. **No budget was widened**: every `maximum`, locked
ceiling, and derivation in `task-44-performance-budgets.json` is byte-identical to closure; only the
`observed` values and the baseline's final totals were refreshed to the remediated truth, and the
closure totals are retained alongside them.

## State after remediation

Task 44 remains the latest closed task, Slice 034 remains closed, schema remains 26, `active_spec`
remains `null`, `next_action` remains `product_owner_gate`, and Task 45 remains unstarted,
unallocated, and unrecommended. No migration, dependency, lockfile, workflow, or seal changed.

---

## Micro-remediation — stale Graph → Browse hand-off

A further Product Owner review found one confirmed **P2** navigation defect remaining after the
remediation above.

```text
reviewed state:           b209f7a63ce1218ff1d4df20566808cbe8a23e1f
micro-remediation commit: MICROFIX_SHA
```

**Defect.** `openGraphNode` validated the exact stable target ID before opening the Reader but the
Browse branch committed navigation immediately. Because the graph projection is a snapshot, a branch
archived after it was taken would be resolved through Life's ordinary fallback, silently opening a
**different node** — violating the locked rule that a stale Graph target must fail safely.

**Root cause.** When I added exact-ID resolution during the previous remediation I applied it only to
the destination the finding named. The Browse branch returned early, above the validation, so it
never gained the same guarantee. The sibling path was not re-checked.

**Fix.** Both destinations now resolve through one shared path before anything is committed. The
early return is gone: the projection is fetched, `resolved_from_fallback` and the exact ID are
required for either destination, and the Reader additionally requires a leaf. Only then is any state
set. On failure nothing moves — Graph stays open, Life state and history are untouched, no fallback
node is opened, and the existing Graph error is shown. No history is added on either path.

The refusal now covers branches as well as leaves, so its wording became *"That Life node is
unavailable."*

**Fail-before-fix.** The new regression test — Graph → Branch whose projection comes back
`resolved_from_fallback` — fails with the early return restored and passes with the fix. Reverting
left zero residue.

While fixing this I found the pre-existing Branch → Browse test had been passing for the wrong
reason: it asserted `← Back` was disabled, which only held because the un-awaited navigation had not
landed yet. `← Back` is legitimately *enabled* on a branch, since a branch always has a parent. That
test now asserts the load-bearing invariant instead — Back ascends to the parent rather than
unwinding a graph entry, which is what an empty history produces.

**Evidence.** `pnpm typecheck` clean; `pnpm test` **681 passed** across 46 files (680 → 681);
`pnpm build` and `pnpm hardening:performance` `violations: []`; `pnpm e2e:windows -- phase15-life-graph.e2e.ts`
4/4; `git diff --check` clean. Only `LifeScreen.tsx` and `LifeScreen.test.tsx` changed in production
terms, so Rust and broad native gates were unaffected and not re-run.

**Performance.** Startup raw 520,935 → 520,983 (**+1,483** against the Task 43 accepted inventory,
authorized ≤ 2,048); total raw +10,621 (≤ 24,576); deterministic gzip +3,522 (≤ 8,192). Only
`observed` values were refreshed; every `maximum`, locked ceiling, and `expected_chunk_count` is
byte-identical to the previous commit, verified by diff. **No budget was widened.**

Task 44 remains the latest closed task, Slice 034 remains closed, schema remains 26, `active_spec`
remains `null`, `next_action` remains `product_owner_gate`, and Task 45 remains unstarted,
unallocated, and unrecommended.
