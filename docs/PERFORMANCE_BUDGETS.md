# Performance Budgets

Budgets are targets to measure on the Product Owner's Windows laptop, not claims already achieved.

| Area | Initial target |
|---|---|
| Input feedback | visible next frame where possible |
| Critical main-thread task | investigate >16 ms; avoid >50 ms |
| Warm Today open | perceived immediate; separately time query/render/ready |
| Task mutation | optimistic UI; instrument DB p95 |
| Radial fan | no visible layout jank |
| Life child transition | no sustained dropped frames |
| Search typeahead | small debounce, stale cancellation |
| Reader idle | low CPU/GPU; bounded ambient motion |
| Backup | progress reporting, no renderer blocking |

## Instrumentation

Frontend:
- React Performance Tracks/Profiler;
- User Timing: route/query/command/ready;
- long-task observation;
- render-count fixtures.

Rust:
- `tracing` spans across IPC/service/repository;
- query duration and row count;
- checkpoint/queue metrics;
- Criterion for pure algorithms.

SQLite:
- `EXPLAIN QUERY PLAN`;
- index/aggregate rebuild timing;
- 1k/10k/100k fixtures per relevant module.

## Rendering rules

- transform/opacity preferred;
- avoid large animated blur/filter/shadow;
- pause offscreen/hidden/minimized animation;
- no per-particle timers;
- lazy-load Graph/editor/exporters;
- avoid N+1 IPC/query;
- send projections sufficient for a screen but not entire document bodies;
- virtualize selectively after profiling;
- no premature blanket `memo`.

## JavaScript bundle budget

The bundle gate is versioned. **`docs/audits/task-51-performance-budgets.json` (budget v2) is the
current authority**; earlier budget files are preserved as history and are no longer read.

### Locked ceiling change — Task 51

```text
index.js            535,000  ->  550,000     raised
BasicLeafEditor.js  490,000               unchanged
markdown.js         129,000               unchanged
```

Authorized by the Product Owner on measured evidence. The canonical Visual Baseline v2 Today
composition includes a context inspector, and its shared split wiring left `index.js` 381 bytes over
the old ceiling **after** three legitimate reclaims were applied first:

```text
tree-shakeable named icon exports   -3,438
lazy-loaded inspector component     -6,151
co-located inspector styles           -426
```

The inspector itself is deferred — `TaskInspector.js` 7.34 kB and `TaskInspector.css` 2.86 kB load
only when a task is selected — so the net eager cost of the whole feature is **+2,268 bytes**.

The ceiling was raised because the old number was a governance guardrail rather than a product goal
outranking the user experience. It was **not** raised to silence a red gate: the gate stayed red
while the decision was requested, and the rationale is recorded in the budget file's
`locked_ceilings.note` rather than only in a constant.

Headroom at the change is **14,619 bytes**, and it is not free space. Tree shaking, named imports,
lazy secondary surfaces, and no eager Narrative/Life/editor/art engines on the Today startup path
all remain required. Raising a maximum again requires another measured Product Owner decision.

Run it with:

```text
pnpm build
pnpm hardening:performance
```

Budget v2 tracks `main_js_bytes`, `total_js_bytes`, `total_js_gzip_bytes`, `expected_chunk_count`,
and every emitted chunk of at least 10,000 raw bytes, keyed by an identity that strips only the
terminal content hash so a rebuild never reads as a new chunk. Sizes are raw bytes plus gzip
measured with `mtime=0`, which keeps the number independent of when the build ran.

The gate fails on a missing expected chunk, a new unbudgeted chunk at or above 10,000 bytes, a
duplicate normalized identity, a chunk-count mismatch, a malformed budget, or any tracked metric
over its maximum. Chunks below the threshold are reported as `untracked_small_chunks` and do not
fail.

Maxima are derived from the measured build, never chosen:

```text
total_raw_maximum   = final + max(8192, ceil(final * 0.0075))
total_gzip_maximum  = final + max(4096, ceil(final * 0.0100))
chunk_maximum       = final + max(1024, ceil(final * 0.0200))
```

each additionally clamped by its locked ceiling (`index.js` **550,000** since Task 51;
`BasicLeafEditor.js` 490,000; `markdown.js` 129,000). Raising a maximum is a Product Owner decision
supported by measurement, not a response to a red gate — see the Task 51 change recorded above.
`docs/audits/task-40-performance-baseline.json` records the inventory and the optimization findings
the original budget was frozen against.

## Performance gate

A critical PR includes:
- hardware/environment;
- fixture size;
- before/after trace;
- p50/p95 where meaningful;
- screenshot/video only as supplementary evidence;
- regression interpretation and acceptable tradeoff.
