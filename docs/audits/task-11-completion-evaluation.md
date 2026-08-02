# Task 11 — Completion Evaluation Core + Equal-Emphasis Radial Fan

## Scope and execution identity

- Starting HEAD: `8427f15a846fedd2ff1f5806142977ce1333d8e5`.
- Implementation commit: `b9020541837f6ee3c8da502a701c5cf59ab21353`.
- Evidence commit: this report's commit; the exact pushed final HEAD is recorded in the completion report.
- The live roadmap named only Task 11/60. The execution title comes from the first unopened M3 source-of-truth slice, §7.1–§7.8: retrospective Completion evaluation, history/inverse behavior, closed ring, and radial fan without prediction.
- Excluded: prediction, Analytics dashboards, scores, streaks, completion-state Settings UI, reminders, Life System, and final branding.

## Migration and state authority

Immutable migration 5 adds `completion_states`, `task_evaluations`, and `evaluation_operations`. Four stable seeds use IDs and internal keys independent of display labels: `none` 0 bp, `below` 4000 bp, `met` 7500 bp, and `excellent` 10000 bp. Basis points are constrained to 0–10000 and remain backend-only in ordinary Today projections.

Evaluations are immutable snapshots of label, hidden value, and visual token. A one-off subject is keyed by Task ID; a recurring subject is keyed by stable series ID plus original local date, including after a moved override. Partial unique indexes identify the deterministic current evaluation while history remains retained. Operation IDs are grammar-bounded, unique, idempotent for the same subject/state, and cannot be reused for another subject/state or after undo.

Rust validates subject existence, active state, cancellation/archive state, and that the scheduled end has passed using an authoritative machine-local clock. The renderer supplies an observed local date/minute only as a checked clock-boundary input. Evaluate and undo each use one DB-worker transaction. Undo accepts only the latest operation, restores its immediate predecessor or the unevaluated state, and is idempotent after success.

## Projections and Calendar semantics

The unified Today projection includes only the current safe evaluation fields: state ID, label, visual token, evaluation timestamp, and operation token. It never exposes basis points. Evaluation loading uses bounded set queries for the displayed date, not one IPC call per row.

MonthProjection algorithm v1 now computes `has_missed` as a past projected date containing at least one item without a current evaluation. Evaluated one-off Tasks and recurring occurrences stop contributing to the missed marker; undo makes them unevaluated again. Recurring lookup preserves series/original-date identity across moved overrides.

## Ring and equal-emphasis fan

Eligible rows expose a 44px assessment button with an empty/evaluated CSS ring and an accessible current-state name. Current/future rows are disabled with an explicit explanation; completion-state loading is also an accessible disabled state. No score or percentage is rendered.

The fan is portalled to the declared overlay layer and uses four equal 56px polar targets in stable backend sort order. It prefers an upward arc, mirrors below when needed, clamps to viewport padding, and uses a bounded 2×2 fallback only for a genuinely narrow viewport. Arrow keys rove, Home/End jump, Enter/Space select, Escape and outside pointer close, and focus returns to the trigger. One parent-owned fan ID prevents multiple overlays. Scroll/resize reposition listeners exist only while open. Repository reduced-motion CSS removes nonessential transitions. No canvas, probability, prediction, or model metadata was introduced.

Selection optimistically updates the affected TanStack Query day cache, reconciles the authoritative response, rolls back on error, announces failures, and exposes one backend-backed Undo action. Day-cache identity remains correct if navigation changes before undo; affected month projections are invalidated after evaluate/undo.

## Exact verification evidence

- `pnpm install --frozen-lockfile`: passed with pnpm 11.17.0.
- `pnpm verify`: immutable source hash/length, repository governance, 402-heading index/full coverage, and security command/capability parity passed.
- Frontend: typecheck passed; 6 files / 54 tests passed; Vite 8.1.5 production build passed (102 modules, final verification build 541 ms).
- Rust: check `--all-targets`, fmt check, and clippy `--all-targets -- -D warnings` passed.
- Rust full suite: 229 passed, 0 failed.
- Task-focused suite: 33 passed, 0 failed.
- Backup-focused suite: 128 passed, 0 failed.
- Focused completion backup/restore round trip: 1 passed; it restored the original evaluation history and operation ledger after a later reassessment.
- Generated TypeScript exports were rerun; exact command ACL permissions for list/evaluate/undo passed the security verifier. `git diff --check` passed.
- Normal production `pnpm tauri build` passed in 160.6 seconds and produced `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` without the E2E feature.
- Sentinel-isolated native smoke: synthetic run `task11-smoke-1f42be2c42704a518f4914a809924155`; native PID 20236 remained alive over 20 seconds, migration 5 created the isolated database, captured logs contained no startup/migration/CSP/ACL/IPC/panic signature, all 19 owned processes were stopped, and the contained profile was removed after sentinel/containment validation.
- File-backed Rust tests prove evaluation persistence after reopen and backup/restore. Deterministic frontend tests provide click/keyboard/radial behavior because the existing native WebDriver attachment debt prevents automated DOM driving inside the real WebView. Native smoke therefore proves startup, migration, process containment, and application liveness rather than native click-through.

## Security and self-review

- No Task content, hidden score mapping, SQL, paths, or DTO payloads are traced by the new commands.
- No remote resource, prediction service, notification capability, canvas, or direct frontend `invoke()` was added.
- Completion joins are bounded by the existing day/month projections; the UI does not issue per-row evaluation reads.
- Recurring evaluation always targets one stable occurrence identity, never an entire series.
- The standard CSP and Windows-only exact capability remain intact; generated allow permissions match the registered handler inventory.

## Remaining non-blocking debt and boundary

- F-04 Windows directory durability strengthening.
- F-05 backup publication durability barriers.
- Independent GitHub CI.
- Native WebDriver attachment and automated native click-through evidence.
- Prediction, configurable completion-state Settings, and Analytics remain future source-of-truth slices, not Task 11 claims.

Task 11/60 is complete. M3, Analytics, the whole Task System, and final product design are not declared complete. The live roadmap still does not name Task 12, so only Task 12/60 is identified as the next allowed action.
