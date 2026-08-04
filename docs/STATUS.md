# Project Status

## Task 31/60 — Lossless Portable Package

- Package format v1 exports one committed Basic Leaf or Narrative Canvas document.
- Canonical JSON, Markdown fallback, privacy-sanitized assets, manifest and SHA-256 checksums are included.
- Import validates and stages in Rust, remaps identities/assets, and commits only to an empty active Life leaf.
- Raw Tauri IPC avoids JSON/Base64 binary inflation; no filesystem/dialog plugin or broad capability was added.
- ZIP dependency: exact `zip 5.1.1`, default features disabled, Stored entries only.
- Database schema remains 16; no migration.
- Midnight local-date rollover debt is closed.
- Remediation 001 verifies checksum-deduplicated asset files before reuse, performs bounded stale portable cleanup during startup, validates package titles by Unicode character count, and separates committed import success from cache-refresh warnings.
- Remediation evidence: 31 frontend files / 468 tests and 444 ordinary Rust tests passed; all ordinary gates, five-phase native E2E, a 4,783,749-byte NSIS (`d7a9f6a1a41463cf26e5862528e308b08c813734d5c023cd92dcdb0ba79b55a7`), and RC run `core-rc-ec1f261bad434cce8a6d0d8aaad598d1` passed.
- Task 32 has not started; next action is Product Owner gate.

## Task 30/60 — Current-State Closure

- No new product feature or database migration.
- Repository operational state is recorded in `docs/PROJECT_STATE.json` and checked by governance.
- Recurring Related Tasks navigate to the nearest actionable displayed occurrence on or after a caller-supplied local anchor date.
- Static Visual World chips no longer require an inline style; the strict security verifier remains unchanged.
- Schema-16 evidence passed: 450 frontend tests; 412 ordinary Rust tests with 1 designated release-performance test ignored and separately passed; governance/typecheck/build/check/fmt/Clippy; three-phase native E2E; performance budgets; 4,655,924-byte NSIS SHA-256 `fdbf0565bdabbbe020c3494e1b4133c0d39f1ce623fd66236cbf9dceaeffc7b2`; and two-session RC dogfood.
- Task 31 has not started. Lossless Portable Package is a recommendation only and remains behind Product Owner approval.

## Task 29/60 — Task/Life Relationships

- Schema 16 links the separate `tasks` and `task_series` authorities to zero or one Life area.
- Occurrences inherit the series link; archived links remain preservable; navigation is bidirectional.
- Task 30 has not started.

## Task 28/60 - Narrative Visual Worlds (implementation)

- Starting checkpoint: b32839ac14e7f0463cd6580caa919642128ef2b1.
- Four document-level canonical worlds are scoped to Narrative Canvas only: Paper, Sakura, Aurora, and Nocturne.

## Task 27/60 - Narrative Template System (implementation)

- Starting checkpoint: 4e2c4ee347212b9a26949f7c9df2d2ae77dab59a (accepted Task 26).
- Schema 15 is an append-only trigger-only expansion from one persisted template ID to three immutable built-in IDs. Templates seed initial Canvas scenes only.
- The empty Life-leaf surface now offers an explicit native-radio template chooser; no custom templates, conversion, or Visual Worlds behavior was added.
- Current release evidence: schema-15 NSIS Lifeweave_0.0.0_x64-setup.exe is 4,623,409 bytes, SHA-256 8656589c64bacf529e4de278866a3e58e5b108862e08bd04983451b2f9324b2d; contained RC run core-rc-5477cd24eacb4716be05c536a8789293 passed two isolated reopen sessions, focused recovery/backup/Narrative coverage, fatal diagnostics, and cleanup.

Updated: 2026-08-04 Asia/Saigon

## Task 26/60 — Native E2E Contract Refresh (complete)

- Starting checkpoint: `4cf6ca3f7e0492b12d7497705518f5391c76a6b1` (accepted Task 25); final checkpoint is the single Task 26 commit.
- Replaced all obsolete Foundation Records native E2E selectors with the current one-off Task workflow: create `E2E Alpha`, rename to `E2E Beta`, UI backup, mutate to `E2E Gamma`, UI restore by opaque backup ID, then fresh native relaunch persistence.
- `pnpm e2e:windows` passed all three phases using WebView2 Runtime and Microsoft-signed matching Edge WebDriver `150.0.4078.105`; the successful isolated profile was cleaned and failures retain artifacts.
- The runner builds the debug `e2e-test` binary through Tauri so native tests receive packaged frontend assets. Schema remains 14; no product behavior, migration, dependency, IPC, workflow, or feature expansion changed.
- Current ordinary evidence: 429 frontend tests and 398 Rust tests passed (one isolated performance test ignored); governance, typecheck, build, cargo check, format, and Clippy passed.

## Task 25/60 — Core Evidence + Release Readiness Hardening (accepted after restore compatibility remediation)

- Starting checkpoint: `7950273e90be160754170a9ded999a6dc7e6b9c1` (accepted Task 24).
- Ordinary Canvas evidence is deterministic: 5/50/128 block validation and extraction plus save/revision. The unchanged 50 ms p95 target is isolated in serial release-mode evidence.
- Markdown preview is read-only and now warns before Confirm when referenced local assets are unavailable; Confirm still revalidates transactionally.
- Backup asset packaging covers Narrative Canvas joins as well as Basic Leaf joins.
- Scene tabs now use roving `tabIndex`, ArrowLeft/ArrowRight wrap, Home/End, focus transfer, and preserve live island content. Multi-scene axe fixture passes.
- Schema remains 14; no migration, dependency, IPC, workflow trigger, or feature expansion.
- Current release evidence: 429 frontend tests; 398 ordinary Rust tests (+ 1 ignored isolated performance test); NSIS `Lifeweave_0.0.0_x64-setup.exe` 4,617,945 bytes SHA-256 `4e88fea24ef20c545a8026e9b21863edf84c61a9205bc7e5163cfd8d358b7ba3`; two-session RC dogfood passed.
- Native WebDriver prerequisites were present. One attempt failed in legacy Phase 1 due to the stale `Foundation Records` selector; artifacts retained under `target/e2e-artifacts/c0a3e7d0f70348feb7a8ab5acfc454c2`.
- Initial Task 25 checkpoint `6ee20b09` had a P1 schema 9/10 restore regression: validation referenced the migration-11 Narrative asset join. The accepted follow-up checkpoint uses schema-aware asset authority and real schema-9/10 fixtures.

## Task 24/60 — Narrative Multi-Scene Composition (complete)

- `parseNarrative` relaxed from `scenes.length !== 1` to `scenes.length === 0 || scenes.length > 20`.
- Rust `schema.rs` validator relaxed from `scenes.len() > 1` to `scenes.len() > 20`.
- `NarrativeCanvasReader` `StaticCanvasView` iterates `doc.scenes`; each scene is a `<section aria-labelledby>` landmark; untitled scenes get a visually-hidden h2 ("Scene N").
- `NarrativeCanvasStudio` adds `activeSceneId` state, `activeSceneIdx` derivation; all 8 `scenes[0]` sites updated to use active scene index; `deactivateIsland` and `materializeCurrentDocument` capture `activeSceneId` before `setHistory` functional update.
- Scene tab bar (role="tablist"): one tab per scene, Add (+) button (disabled at 20), scene rename input, move left/right buttons, delete button (disabled when only 1 scene).
- Four new callbacks: `handleAddScene`, `handleDeleteScene`, `handleRenameScene`, `handleMoveScene`.
- `serializeNarrative`, `toNarrativeCanonicalValue`, and Markdown export already iterated all scenes — no change needed.
- No migration (schema stays at version 14). No new IPC commands. No new dependencies.
- New CSS styles: `sceneTabBar`, `sceneTab`, `sceneTabActive`, `sceneTabAdd`, `sceneControls`, `sceneRenameInput`, `srOnly`.
- 391 Rust tests pass (4 new: `rejects_zero_scenes`, `accepts_two_scenes`, `accepts_twenty_scenes`, `rejects_twenty_one_scenes`).
- 416 frontend tests pass (new: 5 schema, 2 Reader, 11 Studio multi-scene).
- ADR 0019 accepted. Audit: `docs/audits/task-24-narrative-multi-scene.md`.

## Task 23/60 — Post-Narrative Expansion Decision (complete, reaudit)

- Initial commit `0dce8e9` was FAIL (substituted criteria, incomplete hard-filter matrix, hardcoded acceptance winner, missing simulation outputs). Remediation in `docs/audits/task-23-acceptance-remediation.md`.
- Rerun under exact approved 12-criterion 100-point model (weights: user value 16, workflow freq 10, differentiation 10, data safety 12, accessibility 9, implementation boundedness 9, maintenance cost 8, performance 7, local-first/privacy 6, interoperability/backup 5, prerequisite readiness 5, evidence/testability 3).
- Full 13×14 hard-filter matrix (PASS/CONDITIONAL/FAIL). Eligible (PASS 14/14): Multi-Scene Composition, No Expansion / Hardening Slice. CONDITIONAL (6): Template System, Visual Worlds, Lossless Package, Tags, Task/Life Relationships, Generic Outline. FAIL (5): Backlinks, Noteboard, Graph, Score, Prediction.
- Eligible base scores: Multi-Scene 8.02, Hardening Slice 7.56 (lead 0.46).
- Five-million-sample simulation (seed 20260803, 5 profiles): Multi-Scene agg. top-1 65.8 % (≥ 55 % threshold), top-3 100 %, mean rank 1.34. Hardening: top-1 34.2 %, mean rank 1.66. Convergence drift 0.13 %.
- Multi-Scene wins base, utility, visual profiles. Hardening wins safety/maintenance and recovery/readiness profiles.
- All activation thresholds met: base score 8.02 ≥ 7.0, base lead 0.46 ≥ 0.35, agg. top-1 65.8 % ≥ 55 %.
- `ACTIVATE_NEXT` = Narrative Multi-Scene Composition (affirmed from approved model).
- Task 24 remains prohibited until Product Owner approval. No product behavior, migration, IPC, or dependency added.
- ADR 0017 (preliminary, superseded) and ADR 0018 (accepted). Audit: `docs/audits/task-23-post-narrative-expansion.md`.

## Task 22/60 — Narrative Canvas Markdown Interoperability (complete, remediated)

- Fixed `asset:` → `assets/` in `narrative::markdown::export` image rendering.
- Added `sanitize_file_name` / `sanitize_file_stem`: 120 scalar value limit; primary-stem Windows reserved name rejection (`CON.txt` → `narrative-canvas.md`); fallback `narrative-canvas`; control character stripping.
- Added `import_as_canvas` to `narrative::markdown`; delegates all Markdown parsing to `document::markdown::import` (Basic Leaf authority); title from filename stem only (not H1).
- Added `import_from_markdown` and `export_to_markdown` to `narrative/repository.rs`; export derives filename from Canvas JSON `title` field; import inserts `narrative_document_assets` rows in transaction.
- `render_block` delegates `rich_text` and `callout` to `crate::document::markdown::export` (links, tables, marks fully preserved); unknown blocks emit `> [!WARNING]` placeholder.
- Added `repository::preview_markdown` (DB-aware, validates via `document::markdown::import`; unsafe Markdown fails at preview).
- `document::markdown` extended: multi-line NOTE/WARNING/TIP admonitions; single-line WARNING/TIP; callout export uses actual variant; TIP maps to `"info"`.
- 3 new IPC commands: `preview_narrative_markdown` (DB-aware), `import_narrative_markdown` (idempotent via operation_id), `export_narrative_markdown`.
- 4 new DTOs; `NarrativeMarkdownExportButton` with pre-export lossiness warning; `NarrativeMarkdownImportDialog` with stable operationId, focus trap, focus restoration, pending guards.
- Fatal UTF-8 decoding and file input reset in `BasicLeafReader`.
- No new migration (schema stays at version 14). No new dependencies.
- 388 Rust tests pass (15 new). 399 frontend tests pass (21 new in import/export tests).
- ADR 0015, ADR 0016 accepted. Remediation audit in `docs/audits/task-22-acceptance-remediation.md`.

## Task 21/60 — Narrative Canvas Core Schema + Single-Scene Read/Studio Vertical Slice (Accepted)

**Checkpoint sequence:** f1438da (fail) → 7314b26 (fail) → dc807ad (fail) → `<current HEAD>` (accepted)

- Migration 11: `narrative_documents`, `narrative_document_revisions`, `narrative_document_drafts`, `narrative_save_operations`, `narrative_document_assets`.
- Migration 12: `template_id`/`template_version` columns, `narrative_documents_active_life_node_uq` unique partial index, `narrative_document_revisions_document_revision_uq`, INSERT/UPDATE guard triggers (root, schema_version, template, JSON/text size, revision monotonicity), restore guard triggers.
- Migration 13: BEFORE UPDATE move guard (active rows) and restore guards (node active + uniqueness) for both document types.
- Migration 14: `life_node_id` immutable for ALL rows (active and archived); comprehensive restore guards (root, no-children, no-competing-same-type, no-competing-other-type); consolidates Migration 13 restore guards.
- Mutual exclusion enforced by SQL BEFORE INSERT triggers (canvas↔basic leaf, canvas↔child life nodes) + unique partial index.
- Document identity chain: JSON `documentId` verified to equal DB row `id` and IPC `document_id` on every save.
- Unknown block kinds preserved losslessly: `UnknownNarrativeBlock.canonical` holds entire raw object; `serializeNarrative` re-emits verbatim.
- `parseNarrative` strict: throws on wrong templateVersion, scene count, layoutPreset, atmosphere, motionPreset, non-string field values.
- `serializeNarrative` is the single exit point for canonical JSON; known blocks emit V1 fields only.
- `BasicLeafReader` detects dual-content conflict (both Basic Leaf + Canvas active) and shows blocking alert.
- `NarrativeCanvasReader` routes rich_text and callout islands through `parseDocument` + `StaticDocument`; corrupt island shows placeholder.
- `create()` inherits Life node title for seed document; idempotent for existing active canvas.
- Search integration: narrative documents indexed as `entity_kind='reader_document'`. Canvas title, scene, all 5 block kinds indexed. Draft/archived/unknown excluded.
- 6 IPC commands: `get_narrative_document`, `create_narrative_document`, `save_narrative_document`, `save_narrative_draft`, `discard_narrative_draft`, `recover_narrative_draft`.
- `NarrativeCanvasReader` (semantic `article`/`h1`/`section`/`h2`; StaticDocument for rich_text/callout; `isUnknownBlock` guard for unknown-kind placeholder) + `NarrativeCanvasStudio` (lazy chunk, one active Tiptap island, dnd-kit sortable, `serializeNarrative` in save/draft paths).
- All 5 block kinds: rich_text, metric, image, callout, timeline. Unknown blocks: preserved on save, placeholder in Reader.
- Studio architecture tested: one-active-island, active-island-in-Save, Tiptap-not-structural, retry op ID, unknown round-trip, image import, timeline CRUD, performance.
- 64-item acceptance gate verified. ADR 0011, 0012, 0013, 0014 accepted.
- 369 Rust tests pass; 378 frontend tests pass (26 new). Bundle: main 494 kB (no Tiptap), Studio lazy 14.96 kB, Tiptap vendor 390 kB (Studio-only). NSIS: 4.38 MB.

## Task 20/60 — Narrative Canvas Canonical Schema A/B Prototype + Decision (complete reaudit)

- PASS at `(this commit; see git log -1)`; evidence: `docs/audits/task-20-complete-reaudit.md`.
- Prototype-only: no production code, migration, IPC, dependency, or route change.
- Complete re-implementation resolving 12 acceptance gaps in original Task 20 commit (`8058db63`).
- Correct vocabulary: `rich_text`/`metric`/`image`/`callout`/`timeline` blocks; all 4 layouts/3 atmospheres/3 motions.
- All 18 adapter operations implemented for both strategies; HistoryState<TDoc> undo/redo for both.
- Strategy A (domain envelope + rich-text islands) selected over Strategy B (full ProseMirror document).
- Strategy A score: 82.8 / 100. Strategy B: 67.9 / 100. Gap: 14.9 points (threshold: 10 points).
- No hard vetoes: fair B codec resolves ADR 0009 migration veto; fair B static reader resolves rendering veto.
- Decision rests on total weighted score, not hard vetoes.
- 100,000 applied operations (seed 20260803) per strategy: 0 errors each; identical final-state hash (8cc892e).
- 314 frontend tests pass (19 test files): 90 prototype + 3 simulation + 28 benchmark + 193 pre-existing.
- Production bundle unchanged (489.06 kB main; no prototype code in dist).
- ADR 0009 superseded by ADR 0010; specs/010-narrative-schema-prototype/ updated.

## Task 19/60 — Basic Leaf Heading Outline Core + Reader Navigation

- PASS at `(this commit; see git log -1)`; evidence: `docs/audits/task-19-basic-leaf-outline.md`.
- Ephemeral heading projection derived from committed canonical JSON; never persisted.
- `outline.ts`: `buildDocumentOutline`, `extractHeadingText`, `headingIdForSourceIndex`; 256-entry cap; O(n) algorithm.
- `DocumentOutline.tsx`: `<nav>/<ol>/<li>/<button>`; disclosure toggle for narrow; sticky wide layout via CSS container queries; `scrollIntoView` + `focus` activation; `aria-current`; `useReducedMotion` from existing `motion` package.
- `StaticDocument.tsx`: top-level headings given positional `id` and `tabIndex=-1`; `scrollMarginTop: 1.5rem`.
- `BasicLeafReader.tsx`: outline shown when ≥ 2 headings; hidden in editor mode.
- 193 frontend tests pass (was 136; 57 new: 24 outline unit + 33 component/integration including axe accessibility check).
- ADR 0008 accepted; specs/009-basic-leaf-outline/ created.

## Task 18/60 — Global Search Core + Vietnamese-Normalized Unified Retrieval

- PASS at `(this commit; see git log -1)`; evidence: `docs/audits/task-18-global-search.md`.
- Migration 10 adds FTS5 external-content index with dirty-scope rebuild queue and 22 source-table triggers.
- Vietnamese normalization: NFKD decomposition + combining mark removal + đ/Đ→d hard-map.
- `search_global` IPC command; lazy `GlobalSearchDialog` React component; Ctrl+K shortcut.
- Results grouped by Tasks/Life/Documents (max 8 per group); BM25 ranking; highlight/snippet fragments.
- Navigation from search integrates with TodayScreen (task focus) and LifeScreen (browse/reader entry).
- 324 Rust tests pass (includes file-backed smoke + realistic 10k/1k/5k/5k performance fixture); 136 frontend tests pass (18 new GlobalSearchDialog, all 12 TodayScreen); all governance gates pass.
- ADR 0007 accepted; specs/008-global-search/ created.

## Task 17/60 — Expansion Decision + Candidate Activation Matrix

- PASS at `(this commit; see git log -1)`; evidence: `docs/audits/task-17-expansion-decision.md`.
- All ten candidates were evaluated independently against hard filters, a disclosed weighted model, prerequisite constraints and a four-profile/four-million-sample sensitivity analysis.
- Global Search is the sole `ACTIVATE_NEXT` recommendation.
- Recommended Task 18 title: `Global Search Core + Vietnamese-Normalized Unified Retrieval`.
- No product dependency, migration, IPC, capability, route, UI or behavior was added.
- Product Owner approval is the only allowed next action. Task 18/60 remains prohibited until approval.

## Task 16/60 — Core Hardening + Release-Candidate Dogfooding

- PASS at implementation commit `44ba9c558d25324d2ea4303fad2120b1022b93d3`; evidence: `docs/audits/task-16-core-hardening.md`.
- F-04/F-05 are closed by checked Windows publication barriers and reopen/checksum verification before backup success.
- Five independent least-privilege, timeout/cancellation, commit-pinned CI workflows passed at the Task 16 checkpoint.
- Frontend 118 and Rust 292 tests pass; normal unsigned NSIS build and contained two-session `core-rc-44ba9c5` dogfood pass.
- Native WebDriver click-through and manual alternate-DPI/screen-reader hardware checks remain explicit evidence limitations. No M8 feature was activated.
- Task 17/60 is the only allowed next action; the live roadmap does not name it.

## CI policy (post–Task 16 Product Owner correction)

The Product Owner subsequently reduced the standing CI policy. The five workflows that existed and passed at the Task 16 checkpoint have been removed. One optional `workflow_dispatch`-only manual clean Windows build (`manual-clean-build.yml`) remains.

Remote CI is not a task-completion gate. Local evidence is authoritative for normal development. No polling is permitted.

Run the manual clean build only when: preparing an installer for external distribution; changing Node, pnpm, Rust, Tauri, Windows packaging, action/toolchain pins, or lockfile structure; diagnosing a suspected environment-only failure; or the Product Owner explicitly requests it.

## Phase
**Foundation Proof**

## Execution roadmap

The 60-task roadmap is the execution and coordination layer. It does not replace the immutable source of truth in `docs/source-of-truth/`.

- Task 1/60: implementation candidate recorded at implementation HEAD `cb6df7912f396084e244f836208f71085c27dc9d`.
- Task 2/60: blocking remediation candidate is implemented; independent re-audit is now the only allowed next action.
- F-01 remediation: `199d07d` (`linearize database maintenance admission`).
- F-02/F-03 remediation: `56d6940` (`bind restore validation to installed candidate`).
- Candidate-cleanup P1 remediation: `b121818` (`preserve restore marker on candidate cleanup failure`); redundant candidate sync removed and candidate-first/marker-second cleanup regression-tested.
- Final independent audit at `0106628c5f7849502d262d1357a8be485cdd9d01` closed all known P0/P1 findings. Task 2/60 is complete with non-blocking audit debt; Task 3/60 is the only allowed next action.
- Stage E, Foundation Proof, and production-safe backup/restore are not declared complete.

## Task 2 audit evidence

- Audit scope HEAD: `cb6df7912f396084e244f836208f71085c27dc9d`.
- Remediation candidate implementation HEAD: `b121818` (candidate-cleanup remediation; evidence documentation follows in the readiness commit).
- Report: `docs/audits/task-02-backup-restore.md`.
- Independent re-audit report: `docs/audits/task-02-reaudit.md`.
- F-02-R1 remediation: `666f7ae` (`verify installed restore candidate identity`); exact installed-live validation was confirmed by the final independent audit.
- Final audit report: `docs/audits/task-02-final.md`; verdict `PASS WITH DEBT`.
- Remediation gates so far: fmt/clippy/check passed; 191 Rust tests passed; focused backup tests 123 passed; frontend typecheck, 2 files / 19 tests, and Vite production build passed; Tauri NSIS bundle rebuilt successfully.
- Blocking findings are closed by the final independent audit; remaining items are P2/P3 debt only.
- P2 debt: best-effort directory flush, backup publication durability barriers, and raw-path IPC deferred to Task 3.

## Task 1 build evidence

- `cargo check --locked --all-targets`, fmt, and clippy with `-D warnings`: passed on Windows.
- Rust: 185 passed, 0 failed, 0 ignored.
- Frontend: 2 test files / 19 tests passed; typecheck and Vite production build passed.
- Generated TypeScript bindings: no drift.
- Source integrity, 402-heading index, full coverage, repository governance, no-remote scan, and diff check: passed.
- Tauri release build: passed; unsigned development NSIS artifact created at `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`.
- Automated desktop smoke: Vite ready, Rust dev compile passed, native process remained alive 32.7s without captured startup fatal/panic/IPC initialization error.
- Visual Product Owner confirmation remains pending; full native E2E belongs to Task 5.

## Task 4/60 — Security, CSP and capabilities

- Implemented in commit `b2fc303a76531019fa93365386d3a89ecd296596`; evidence is finalized on the current pushed HEAD. Task 5/60 native Windows Foundation E2E is the only next action.
- Evidence: `docs/audits/task-04-security.md`; explicit Windows-only `main-capability`, generated command ACL, strict production CSP, path-free IPC logging, and deterministic `scripts/verify_security.py` integrated into `pnpm verify`.
- Task 4 does not declare Stage E, Foundation, product UI completion, or production security certification. F-04/F-05 and lack of independent GitHub CI remain non-blocking debt.

## Active slice
`specs/000-foundation-proof`

## Task 5/60 — Native Windows Foundation E2E

- Harness implementation is present under `e2e-tests/` with isolated `target/e2e-data` profiles and an E2E-only Cargo feature.
- Rust/frontend/production build gates pass, but the real WebDriver scenario is pending because `msedgedriver.exe` is unavailable and its download endpoint was unreachable in this environment.
- Task 5 remains active; Task 6 Product Owner acceptance is prohibited until native E2E passes. Stage E and Foundation are not accepted.

## Task 3/60 — Backup IPC boundary

- Implementation candidate: opaque `BackupId` values are strict `lifeweave_backup_<digits>` identities resolved only beneath the backend-owned `backups` root.
- `BackupSummary` and `BackupProgress` are path-free renderer DTOs; catalog listing excludes staging, safety, malformed and unrelated directories.
- `restore_database` accepts only `backup_id`; Foundation UI selects catalog metadata and renders typed operation phases without filesystem paths.
- F-06 raw-path IPC is closed. Task 4/60 security, CSP and capabilities is the only next action after final gates.
- Task 3 implementation commit: `c5b77dd` (`replace backup paths with opaque ids`); final gate evidence follows.
- F-04/F-05 and lack of independent GitHub CI remain non-blocking debt. Stage E, Foundation and production-safe restore are not declared complete.

## Product implementation boundaries

- App Shell has not started.
- Product Task System feature implementation has not started.
- Task 3 backup ID/progress work has not started and remains prohibited pending independent Task 2 re-audit.
- Public distribution/signing remains out of scope.

## Task 6/60 — Foundation Product Owner acceptance

- Task 5/60 disposition: `PASS WITH DEBT`; the tested Tauri/WDIO attachment layer remained incompatible, but native launch smoke, Rust/frontend gates and production build passed with no verified product P0/P1.
- Product Owner response: `PASS` on isolated profile `po-accept-ef7e91fddb2642ac8c979fb7e82d1d21`.
- Accepted flow: startup, create/edit/archive/restore, backup, mutation to Gamma, restore to Beta, and same-profile relaunch persistence with Gamma absent.
- Task 7/60 first App Shell milestone is the only allowed next action. Stage E and the whole product are not declared complete or production-certified.

## Task 7/60 — First App Shell milestone

- Implemented and verified at the next commit: Today-default CSS Grid shell, fixed 220px/68px navigation rail, typed destinations, Settings-hosted Foundation tools, persisted Task sidebar mode and Life System auto-collapse/restore.
- Frontend: 22 tests passed; Rust: 195 tests; focused backup: 127 tests; verify/typecheck/build/check/fmt/clippy/NSIS/native smoke passed.
- Task 8/60 is the only allowed next action. Task System, final App Shell branding and product feature behavior remain unimplemented.
## Task 8 — Task Core + Today vertical slice

The first production-shaped Task slice is implemented: migration 3, category seed, typed task CRUD/conflict validation, and a Today timeline with exact-minute date-aware create/edit/delete, TanStack Query state, accessible dialog behavior and exact-interval grouping. Rust tests: 198; frontend tests: 25. Task 9 is the next roadmap action; recurrence, assessment and other product domains remain unopened.
## Task 9 — Recurrence

Task 9/60 is complete at implementation commit `9a12ed933bda7b064f0baa64abad9bc26b0c21d4`. Exact-pinned Rust RFC 5545 expansion, a typed unified Today projection, user-controlled recurrence creation, moved/cancelled overrides, all three atomic edit/delete scopes, 366-day conflict validation, and accessible recurring UI flows are verified. Rust 214/214, task-focused 19/19, backup-focused 127/127, and frontend 30/30 passed; governance/security, generated bindings, release NSIS build, isolated native launch, and file-backed recurrence reopen smoke passed. Evidence: `docs/audits/task-09-recurrence.md`.

Task 10/60 Week Strip + Calendar Month Projection is the only allowed next action. Existing F-04/F-05, CI, and WebDriver attachment debt remains non-blocking. Calendar month UI, completion assessment, Analytics, and the whole Task System are not declared complete.

## Task 10/60 — Week Strip + Calendar Month Projection

- Implemented at `af2ba267a3ab5af4b4b1e0a9a88005a9b65adbeb`: one app-level selected local date, a locale-aware seven-day Week Strip, and an accessible five/six-row Calendar month grid.
- `MonthProjection` algorithm v1 performs one bounded DB-worker operation, combining one-offs, recurrence, moved overrides and cancellations without per-cell IPC. It exposes aggregate counts/duration/category icons/period-union load/missed markers and no task content.
- Evidence: frontend 41/41; Rust 219/219; task 24/24; backup 127/127; verify/typecheck/build/check/fmt/clippy/security/generated DTO/NSIS gates passed. Sentinel-isolated native launch remained alive 21 seconds and cleaned its synthetic profile.
- Report: `docs/audits/task-10-calendar.md`.
- Task 10/60 is complete. Task 11/60 is the only allowed next action; the live roadmap does not yet name it. Completion evaluation, Analytics, missed-state persistence, M3, and the entire Task System are not declared complete.

## Task 11/60 — Completion Evaluation Core + Equal-Emphasis Radial Fan

- Implemented at `b9020541837f6ee3c8da502a701c5cf59ab21353`: immutable migration 5, stable seeded completion states, occurrence-aware evaluation history, idempotent atomic evaluate/undo, Today projection integration, and evaluation-aware Calendar missed semantics.
- Today rows now expose an accessible 44px assessment ring and a portalled equal-emphasis polar fan with roving keyboard focus, viewport-aware orientation/compact fallback, optimistic reconciliation, failure rollback, and backend-backed Undo.
- Evidence: frontend 54/54; Rust 229/229; Task 33/33; backup 128/128; verify/typecheck/build/check/fmt/clippy/security/generated DTO/ACL/NSIS and sentinel-isolated native launch passed.
- Report: `docs/audits/task-11-completion-evaluation.md`.
- Task 11/60 is complete. Task 12/60 is the only allowed next action. Prediction, completion-state Settings, Analytics, M3, and the whole Task System are not declared complete.

## Task 12/60 — Objective Analytics Core + Category Targets and Streaks

- Implementation commit: `5835c5b2800530ed03b2f17407bd20cb4984500a`.
- Migration 6 adds versioned weekly category minimum/target goals and rebuildable source-revisioned Analytics period/category/distribution/streak rows.
- Algorithm v1 reports planned scheduled time, task/evaluated/missed counts, category attainment, completion snapshot distribution, and only category minimum/target streaks. There is no total score, score streak, prediction, AI insight, or actual-time claim.
- Goal changes apply prospectively from Monday. Each Task/recurrence/evaluation/goal mutation bumps Analytics source revision once; stale clock/source aggregates rebuild on the DB worker.
- Analytics now has accessible Week/Month/Year navigation and objective editorial sections; Settings has narrow scheduled-time goal editing.
- Evidence: frontend 65/65; Rust 243/243; task 46/46; backup 129/129; Analytics 13/13; governance/security/bindings/ACL, query-plan, file reopen/backup-restore, normal NSIS, and two-session isolated native smoke passed.
- Report: `docs/audits/task-12-objective-analytics.md`.
- Task 12/60 is complete. Task 13/60 is the only allowed next action; the roadmap does not name it. M3 and the whole Task System are not declared complete.

## Task 13/60 — Life Browse Core + Pinned Navigation

- Implementation commit: `6861a40ceffb5ec92b68ac7f8865ee65dea1cf20`.
- Migration 7 adds a protected neutral root, adjacency-list Life node authority, preserved subtree archive/restore semantics, reference-based pins, and restart navigation preferences.
- Life System now renders one focal node plus at most eight direct children, a recursive breadcrumb, dedicated Back history, lazy Pinned mode, fallback to the nearest active ancestor/root, and a separate leaf Reader shell.
- Evidence: frontend 78/78; Rust 255/255; Task 46/46; Life repository 11/11; backup 130/130; governance/security/generated bindings/ACL, indexed bounded queries, file reopen/backup-restore, normal NSIS, and sentinel-isolated native smoke passed.
- Report: `docs/audits/task-13-life-browse.md`.
- Task 13/60 is complete. Task 14/60 is the only allowed next action; the live roadmap does not name it. Life Edit, full-tree UI, Narrative Canvas, Basic Leaf content, the final visual-world engine, and the entire Life System are not declared complete.

## Task 14/60 — Life Edit Core + Full-Tree Reparent/Reorder

- Implementation commit: `b02a5db3b3c571b4a1a79410fbb00b43444a9f6e`.
- Migration 8 adds bounded idempotent Life operation/inverse authority and persisted Edit mode; atomic Rust commands cover metadata, archive/restore, reorder, recursive-CTE-safe reparent and latest-operation undo.
- One indexed full-tree Edit projection keeps active and archived rows separate. Browse remains strictly focal-node plus direct children.
- The Edit workspace uses exact-pinned d3 geometry and dnd-kit pointer/keyboard sensors, DragOverlay, parent/sibling zones, preview connectors and authoritative rollback/reconciliation.
- Evidence: frontend 94/94; Rust 272/272; Task 46/46; backup 131/131; required `life` filter 85/85; governance/security/generated DTO/ACL, scale fixtures, backup/reopen, NSIS and two-session isolated native smoke passed. See `docs/audits/task-14-life-edit.md`.
- Task 14/60 is complete. Task 15/60 is the only allowed next action. Narrative Canvas, Basic Leaf content, final visual worlds, Task/Life linking and the whole Life System remain outside this slice.

## Task 15/60 — Basic Leaf Document Core + Read/Edit/Recovery

- Implementation commit: `624e573b6ac746b35e6f46f510e8019832d44390`.
- Migration 9 adds versioned Basic Leaf JSON, bounded committed revisions, distinct recovery drafts, local stable-ID image authority and document/asset reference tracking. ADR 0005 records the Core canonical-model decision; Narrative Canvas remains inactive.
- Static Reader, lazy focused Tiptap editor, accessible autosave/recovery states, safe Markdown adapters and atomic metadata-stripped portable export are integrated with Life leaf navigation.
- Backup format 2 packages referenced asset originals and restores only after checksum, containment and candidate-DB cross-validation.
- Evidence: frontend 111/111; Rust 288/288; Task 46/46; Life 85/85; Document 14/14; backup 135/135; governance/security/generated DTO/ACL, NSIS and sentinel-isolated native relaunch passed. See `docs/audits/task-15-basic-leaf.md`.
- Task 15/60 is complete. Task 16/60 is the only allowed next action. Narrative Canvas, search/knowledge features and the whole product remain incomplete.
