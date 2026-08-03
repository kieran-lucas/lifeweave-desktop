# Task 25 Audit — Core Evidence + Release Readiness

**Starting HEAD:** `7950273e90be160754170a9ded999a6dc7e6b9c1`  
**Final HEAD:** the single commit containing this audit  
**Schema:** 14 (unchanged)

## Changes and evidence

- Replaced the ordinary wall-clock Canvas test with deterministic 5/50/128 block validation/extraction and save/revision coverage. `cargo test --locked`: **394 passed, 1 ignored**. The ignored test is explicitly run by `pnpm hardening:narrative-performance` in serial release mode: p95 46.5 µs / 511.6 µs / 1.1564 ms respectively, all below the preserved 50 ms target; representative save p50/p95 130.3/416.3 µs.
- Preview uses the existing `assets` authority read-only. Focused Rust tests cover all available, one missing, multiple missing, and the asset-disappears-before-Confirm rollback. Confirm remains transaction-authoritative.
- Backup manifest and restore validation now include `narrative_document_assets`; a file-backed Canvas-only asset manifest regression plus existing Canvas backup/relaunch evidence guard the Canvas/Search/Markdown/backup/reopen path.
- Scene tabs support roving focus, wrapping arrows, Home/End, valid `tabpanel` linkage, and safe live Tiptap materialization. Focused tests and axe pass.
- `pnpm source:verify`, `governance:check`, `index:check`, `verify`, `typecheck`, `test` (429 passed), `build`, and bundle budgets all pass. Current chunks: main 498,786 B; Basic Leaf editor 52,351 B; Markdown 116,541 B; Narrative Studio 19,360 B; Tiptap vendor 390,830 B; total 1,093,663 B.
- `cargo check`, format, clippy and full tests pass. `pnpm tauri build` produced unsigned `Lifeweave_0.0.0_x64-setup.exe`, 4,617,945 B, SHA-256 `4e88fea24ef20c545a8026e9b21863edf84c61a9205bc7e5163cfd8d358b7ba3`. Production configuration excludes `e2e-test`; no remote assets and budgets pass.
- `pnpm hardening:rc` passed: two isolated 25-second native sessions, document recovery, backup/restore and 53 Narrative focused tests; profile `target/e2e-data/core-rc-fc5775bb5fb34acea2b474883c3ca99f` was contained and cleaned.

## Native WebDriver

Prerequisites were all present: tauri-driver, matching Edge WebDriver/WebView2 `150.0.4078.105`, and e2e-test binary. Exactly one normal attempt ran. It reached `tauri.localhost` but Phase 1 failed waiting for obsolete `h1=Foundation Records`; artifacts are retained in `target/e2e-artifacts/c0a3e7d0f70348feb7a8ab5acfc454c2`. This is a repository-script expectation defect, not an environment limitation or verified Task 25 product defect.

## Scope and remaining debt

Production behavior changes are limited to unavailable-asset preview diagnostics, keyboard-complete existing scene tabs, and the P1 Canvas asset-backup join correction. No migration, dependency, IPC, source-of-truth edit, remote workflow/polling, or feature expansion occurred.

Manual screen-reader and physical alternate-DPI hardware validation remain external evidence debt. The legacy native E2E selector needs separate maintenance.

## Changed files

`docs/STATUS.md`, `docs/ROADMAP.md`, `docs/adr/0020-core-evidence-release-readiness.md`, `docs/audits/task-25-core-evidence-release-readiness.md`, `docs/audits/task-25-release-candidate.json`, `specs/015-core-evidence-release-readiness/{README,spec,plan,tasks,acceptance,risk-register}.md`, `package.json`, `scripts/run_narrative_performance_evidence.ps1`, `scripts/run_core_rc_dogfood.ps1`, `src-tauri/src/narrative/repository.rs`, `src-tauri/src/infrastructure/backup/{engine,restore}.rs`, and `frontend/src/features/life/narrative/{NarrativeCanvasStudio,NarrativeCanvasStudio.test,NarrativeCanvas.css}.ts*`.
