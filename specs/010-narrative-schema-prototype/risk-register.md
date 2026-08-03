# Spec 010 — Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Prototype not isolated from production bundle | Low | High | `pnpm build` output verified: bundle chunk sizes and names unchanged; no prototype strings in dist. |
| PRNG produces non-uniform distribution | Low | Medium | Simulation completes correctly with seed 20260803; both strategies produce identical op counts (94,670/100,000). |
| Strategy B timing spikes in CI | Low | Low | Benchmark ceilings are generous (p50 < 100ms); hardware variance is hardware-dependent but thresholds chosen conservatively. |
| Strategy A selected but later proven worse | Low | Medium | Decision is locked in ADR 0009 with full rationale. If Narrative Canvas production work begins, a new prototype can re-evaluate. |
| PM schema version drift | Medium | Medium | Strategy B uses `@tiptap/pm@3.29.2` (already in package.json). Version change could alter `computeAttrs` behavior (e.g., make it throw instead of silently drop). This is acceptable drift for a prototype. |
| Selected strategy incompatible with production requirements not yet known | Low | High | Strategy A has maximum flexibility: blocks are plain JSON islands; the envelope can be extended without PM constraint. Production activation would trigger its own task. |

## Known limitations

- Prototype tests run in jsdom, not Tauri WebView2. PM schema parsing behavior may differ subtly in WebView2 (unlikely for pure JS computation).
- Benchmark timings are collected on the developer machine; hardware-dependent. Assertions use generous thresholds (p50 < 100ms for Strategy B).
- The 100k simulation skips ~5,330 operations per strategy (~5.3%) due to state guard conditions (e.g., sceneCount === 0). This is expected and documented.
