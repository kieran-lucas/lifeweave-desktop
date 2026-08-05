# Task 36 Performance and Bundle Budgets

All measurements use a deterministic fixture containing 1,000 Plans split
across active, draft, paused, completed, and archived states, with five variants
and twenty phases at the upper-bound fixture where applicable.

## Query and IPC budgets

- portfolio projection: one bounded SQL request, no per-row follow-up query;
- portfolio p95: ≤ 75 ms on the repository benchmark environment;
- Plan detail: one bounded SQL request plus bounded aggregate payload, p95 ≤ 50 ms;
- Search full rebuild for 1,000 Plans: ≤ 1,000 ms;
- Search query p95: ≤ 75 ms;
- tag/Life labels are projected in bulk; N+1 SQL count is zero;
- one frontend IPC request per portfolio refresh and one per Plan detail open.

Wall-clock figures are environment evidence, not universal device guarantees.
Query-count and boundedness requirements are invariant.

## Payload budgets

- portfolio returns summary DTOs only; no variant body or revision payload;
- default page limit: 100; maximum accepted limit: 200;
- detail returns at most 5 variants, 20 phases/variant, 20 tags, 50 revisions;
- each variant canonical JSON ≤ 1 MiB;
- outcome ≤ 8 KiB; success criteria JSON ≤ 64 KiB;
- recovery draft ≤ 2 MiB;
- IPC payload is never logged.

## Frontend bundle budgets

Task 33 accepted baseline:

```text
main JS: 526,418 bytes
total JS: 1,134,505 bytes
```

Task 36 limits:

- main JS delta ≤ +12 KiB;
- Plans implementation must remain lazy;
- Plans lazy JS chunk(s) total ≤ 180 KiB raw;
- total JS delta ≤ +220 KiB;
- Today startup must not import Plan editor/detail implementation eagerly;
- no new runtime dependency without an explicit evidence-backed amendment.

## Rendering budgets

- portfolio initial render uses at most 100 rows;
- no unbounded all-revision or all-archive render;
- reorder operations update only the affected variant/phase collection;
- Reduced Motion removes non-essential transition duration;
- narrow-width layout uses sequential panes, not an expensive canvas.

## Release gate

Budget evidence must record exact fixture, command, machine context, median/p95,
query counts, bundle bytes and deltas. A missed budget blocks closure unless a
Product Owner amendment explicitly changes the threshold before acceptance.
