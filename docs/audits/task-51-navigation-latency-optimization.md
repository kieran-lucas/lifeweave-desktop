# Task 51 navigation latency optimization

Date: 2026-08-14

## Scope

This pass targets perceived route and Settings latency without changing product behavior or the locked startup ceilings.

## Changes

- Destination modules for Calendar, Plans, and Life begin loading on pointer enter, pointer down, or keyboard focus. A resolved prefetched component is rendered directly, avoiding an extra lazy-reveal frame.
- Settings sections below the initial viewport defer their data-loading content until they approach the viewport. Opening Settings no longer starts backup discovery, category-goal, tag, and foundation work simultaneously.
- Backup discovery runs on Tauri's blocking pool instead of the database command worker, so filesystem and SQLite validation cannot queue normal Today commands.
- The Life browse route no longer loads the edit workspace or Basic Leaf reader. Each mode has its own lazy boundary.
- Focus Plans uses the shared query cache with a 30-second freshness window for warm revisits.
- Route motion is reduced from 260 ms to 230 ms, remaining within the 190–250 ms visual specification.

## Native WebView2 trace

The trace used a debug build with the E2E feature and an isolated data directory. Heading readiness was measured from navigation intent to the destination heading becoming visible.

| Transition | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Calendar, cold intent | 313 ms | 22.2 ms | 92.9% |
| Plans, cold intent | 312 ms | 11.0 ms | 96.5% |
| Life, cold intent | 337 ms | 54.1 ms | 83.9% |
| Settings to immediate Today | backup discovery competed with Today IPC | 15.3 ms heading readiness; backup discovery not started | contention removed |

Warm route heading readiness remained in the 2–19 ms range. Typical route animation completion moved from 260–304 ms to 230–265 ms.

## Bundle evidence

- Startup `index.js`: 277,776 raw bytes, still below the prior 278,580-byte ceiling.
- `LifeScreen.js`: 62,435 baseline bytes to 14,231 bytes (77.2% reduction on the browse path).
- New mode-only chunks: `LifeEditWorkspace.js` 22,239 bytes and `BasicLeafReader.js` 27,580 bytes.
- Narrative topology pair: 77,404 baseline bytes to 74,136 bytes combined. The apparent individual studio increase is code ownership movement, not pair growth.
- Total JavaScript: 1,121,759 raw / 352,722 gzip bytes. The recalibrated limits use the pre-existing Task 51 formulas; locked ceilings are unchanged.

## Verification commands

```text
pnpm.cmd --dir frontend typecheck
cargo check
pnpm.cmd hardening:performance
pnpm.cmd tauri build --debug --features e2e-test
```
