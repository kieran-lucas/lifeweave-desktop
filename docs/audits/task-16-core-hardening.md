# Task 16 — Core Hardening + Release-Candidate Dogfooding

Status: **PASS**. Starting HEAD `68d3683030cf0ac13dc908abfb74c5426baa8434`; implementation HEAD `44ba9c558d25324d2ea4303fad2120b1022b93d3`; final evidence commit follows.

## Closure

- F-04 closed: a shared checked durability module flushes files, rejects linked/special staging content, atomically publishes sibling paths and verifies the Windows directory `FlushFileBuffers` result. Marker/swap/cleanup, asset installation, portable export and safety backup use it.
- F-05 closed: backup DB/assets/manifest are flushed, staging is fully verified, the tree is synced, publication is checked, and the final package is reopened with SQLite integrity and every checksum before success returns. An injected barrier failure publishes no catalog entry.
- Restore stages remain replayable and idempotent; sharing/cleanup failures preserve diagnostic authority and remain distinct from corruption.
- Route error boundaries isolate ordinary renderer faults. Axe 4.12.1 checks all five destinations and uncovered/fixed a critical Today list-ownership defect. Forced-colors and reduced-motion contracts are explicit.
- Production bundle budgets, strict CSP/ACL/raw-IPC/E2E separation and forbidden dependency checks are deterministic gates.
- Five independent workflows are least-privilege, cancel superseded runs, time out, freeze dependencies, pin action commits and build/retain an unsigned Windows artifact.

## Exact gates

- Frontend: 13 files, 118 tests; typecheck, Vite build and route axe checks passed.
- Rust: 292 tests; Task 46, Life 85, Document 14, Analytics filter 13, backup 136. Check/fmt/clippy `-D warnings` passed.
- `pnpm verify`, source integrity, governance, 402-heading index, security, generated binding diff, dependency audit and diff checks passed.
- Normal `pnpm tauri build` produced the NSIS artifact documented in the RC report with no `e2e-test` feature.
- See the sibling hardening matrix, threat model, performance, DPI, recovery, CI and RC reports for bounded evidence and limitations.

No score/prediction, Narrative Canvas, search/graph, Task/Life linking, cloud, notifications, updater, signing or public release was introduced. Native WebDriver click-through and manual alternate-DPI/screen-reader hardware passes remain documented evidence limitations, not falsely claimed results. Task 17/60 is the next allowed action; the live roadmap does not name it.
