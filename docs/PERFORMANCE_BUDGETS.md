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

## Performance gate

A critical PR includes:
- hardware/environment;
- fixture size;
- before/after trace;
- p50/p95 where meaningful;
- screenshot/video only as supplementary evidence;
- regression interpretation and acceptable tradeoff.
