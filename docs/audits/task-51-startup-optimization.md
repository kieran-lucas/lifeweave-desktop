# Task 51 startup optimization evidence

Date: 2026-08-11  
Scope: frontend cold-start module graph and first Today render only. No Rust, schema, migration, IPC
signature, dependency, capability, remote asset, workflow, or workflow-seal change.

## Trace finding

The production source map proved that `index.js` eagerly contained Calendar, Analytics, Foundation,
the complete Life route, Life Tree's dnd-kit/d3 layout engine, Narrative/Reader presentation, and
Task composer relation/tag pickers even though Today is the mandatory default destination. App also
waited for `health_check` before mounting Today, despite the Rust contract explicitly stating that
the probe does not claim product readiness.

## Correction

- Today remains the only eager product screen.
- Calendar, Analytics, category goals, Foundation, Life, Focus Plans, Search, Backup, Tags, and
  shortcut help load behind route/action-local `React.lazy` boundaries.
- Life-area, Focus-Plan, and tag controls load only after the Task composer opens its details.
- The small date-only Today/week path uses deterministic UTC-noon arithmetic; the heavier
  `@internationalized/date` calendar engine remains available in lazy Calendar/Analytics chunks.
- Today mounts immediately. The non-authoritative health probe runs after the first animation frame
  and still replaces the route with the existing explicit core-unavailable state if it fails.

## Measured production build

Same working tree, Node 24 / pnpm 11 / Vite 8 production build, before and after this pass:

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| startup `index.js` raw | 433,337 B | 274,368 B | -158,969 B (-36.7%) |
| startup `index.js` deterministic gzip | 130,681 B | 84,033 B | -46,648 B (-35.7%) |
| startup `index.css` (Vite report) | 99.10 kB | 33.68 kB | -65.42 kB (-66.0%) |
| total JavaScript raw | 1,088,234 B | 1,096,063 B | +7,829 B (+0.7%) |
| total JavaScript deterministic gzip | 333,221 B | 341,990 B | +8,769 B (+2.6%) |

The small total-byte increase is deliberate code-splitting overhead. It buys a 36.7% smaller
critical JavaScript entry and a 66.0% smaller critical CSS entry; secondary bytes are read only when
their route or control is requested. HTML modulepreload remains limited to the runtime and JSX
runtime. No speculative idle prefetch was added, so startup CPU and disk work do not merely move a
few milliseconds later.

## Regression boundary

The current performance budget keeps the historical absolute 550,000-byte `index.js` ceiling but
lowers the enforced operational maximum to 279,856 bytes. Aggregate maxima are also lowered from
the historical values. Three intentional lazy chunks over the 10,000-byte tracking threshold are
registered with formula-derived ceilings; no ceiling was raised.

## Evidence boundary

Native WebView cold-start p50/p95 timing is **NOT RUN**: the configured in-app Browser runtime
reported no available browser during this workspace's native verification pass. This audit therefore
claims exact production artifact and module-graph improvements only; it does not translate byte
reduction into an invented millisecond result.
