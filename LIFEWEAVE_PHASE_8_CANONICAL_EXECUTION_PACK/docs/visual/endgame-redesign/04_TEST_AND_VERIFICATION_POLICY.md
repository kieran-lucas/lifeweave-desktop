# 04 — Smart Test and Verification Policy

Objective: maximize defect-detection value per command, build, screenshot and reasoning turn.

## 1. Verification funnel

Run in this order and stop downward when an earlier layer fails:

1. scope preflight — HEAD/status/assigned IDs/allowed files;
2. static + convergence ratchet + `git diff --check`;
3. focused unit/component tests for changed feature and direct primitive consumers;
4. type/governance checks at stage close;
5. targeted native visual profile for assigned surfaces;
6. production build/performance only when bundle trigger or checkpoint requires it;
7. exactly one scoped review;
8. fix frozen finding set and rerun affected checks;
9. stage ledger + commit/local closure;
10. grouped native checkpoint.

## 2. Test selection by change risk

- local CSS/composition → affected component tests + stage visual profile;
- shared primitive → primitive tests + representative consumers across distinct families;
- layout authority → representative standard/wide/reading + collapsed/min where relevant;
- typography/token authority → representative productive + editorial surfaces;
- dialog/floating primitive → compact/standard/wide representative modal/popover;
- navigation/state logic → interaction tests;
- import/lazy/dependency/runtime topology → build + JS budget immediately;
- backend/schema/domain requirement → do not implement; hard-block/escalate.

## 3. No redundant full suites

Do not run:
- the full unit suite after every micro-edit;
- the full native phase set after every screen;
- the complete screenshot matrix after every stage;
- Dark aesthetic review during Light redesign;
- identical failing commands repeatedly without code or diagnostic change.

## 4. Visual profiles

F0 may refactor the existing Task50b audit into stage-selectable profiles while preserving an unchanged `full` profile and deterministic fixtures.

Required conceptual profiles:
- `shell-task`
- `calendar-analytics-plans`
- `life-reader-interchange`
- `narrative`
- `settings`
- `full`

A selective profile must actually avoid walking unrelated states; filtering comparison tags while still traversing all 53 states is insufficient optimization.

## 5. Grouped native checkpoints

### Q1
S01–S04.
Native behavior: planning, deadline/saved views, actual time, keyboard shortcuts.
Visual: `shell-task`.
Extra: full frontend unit sentinel; build/perf only if bundle-sensitive code changed since F0.

### Q2
S05–S06.
Native behavior: Focus Plans, planned-vs-actual analytics, Focus Plan analytics.
Visual: `calendar-analytics-plans`.
Extra: full frontend unit sentinel; production build + JS budget.

### Q3
S07–S09.
Native behavior: portable roundtrip, life links, branch interchange, graph, tree interchange.
Visual: `life-reader-interchange`.
Extra: full frontend unit sentinel; production build + JS budget.

### Q4
S10–S11.
Focused Narrative behavior + native visual profile. Portable roundtrip only if package wiring changed.
Visual: `narrative`.
Extra: `pnpm hardening:narrative-performance`; production build + JS budget.

### Q5
S12 + pre-final sanity.
Native behavior: unified tags, managed backup versions; backup/restore only if restore wiring changed.
Visual: `settings`.
Extra: `pnpm verify`, `pnpm typecheck`, full frontend unit suite, production build + JS budget.

## 6. Visual baseline transition

Intentional redesign will fail old light goldens by design.

For each reviewed tag:
1. preserve old diff evidence;
2. inspect new actual at original resolution;
3. verify against canonical design, capability source and geometry;
4. name exact tags being changed;
5. update only those baselines;
6. rerun with acceptance disabled;
7. require zero mismatch;
8. lock those new baselines.

Never:
- lower thresholds;
- hide scrollbars;
- auto-accept the full matrix;
- call an unexplained diff “expected”.

Promote new permanent goldens only for high-signal deterministic states, such as Today selected/inspector facets, recurring expanded task, selected Plan detail, and deterministic restore confirmation if possible.

## 7. Viewports

Normal implementation: canonical maximized Windows viewport.
Minimum viewport: only rows whose packet says `MAX + MIN`.
Final: complete required Light matrix at maximized and governed minimum.

Dark is not a redesign surface.
Reduced Motion and forced-colors are accessibility regression modes, not art-direction iteration modes.

## 8. Performance economics

Use reclaim-before-spend.

Immediate production build + `hardening:performance` when:
- import topology changes;
- lazy boundaries change;
- dependencies change;
- icon extraction/chunking changes;
- substantial eager TS/TSX is added.

CSS-only tuning usually waits for nearest checkpoint.

Always build+budget at F0, Q2, Q3, Q4, Q5. Q1 only if bundle-sensitive code changed.

Watch:
- `index.js`;
- `TaskSavedViewsPanel.js`;
- `FocusPlansScreen.js`;
- `BasicLeafEditor.js`;
- `NarrativeCanvasStudio.js`;
- `markdown.js`;
- aggregate raw/gzip;
- expected chunk count.

Do not raise budget ceilings without explicit Product Owner authorization.

## 9. Log hygiene

Write verbose logs to:
`target/codex-stage/<stage>/logs/`.

Successful commands: summarize only.
Failure: show first actionable diagnostic and a bounded tail/search result.
Do not pour full logs into model context.

## 10. Rerun cap

Retry only after new information:
- code/test/fixture change;
- changed environment/precondition;
- diagnostic narrowing;
- one controlled flaky-harness retry.

After two failed reruns without new diagnostic evidence, stop blind retrying. Record harness debt and use the smallest deterministic substitute where valid.

## 11. One-review rule

Per implementation stage:
`implement → /review once → freeze F_stage → fix in-scope findings → affected reruns → NO second review → close`.

A second review is allowed only if the first reviewed the wrong target or was otherwise invalid/nondiagnostic.

## 12. Final verification

After all Q checkpoints:
- full verify;
- typecheck;
- full frontend tests;
- production build;
- JS performance budget;
- default full native E2E once;
- complete required Light visual matrix;
- representative Reduced Motion and minimal forced-colors regression if deterministic;
- ONE whole-app adversarial/coherence review;
- freeze `F_final`;
- fix it;
- affected reruns + mandatory final gates;
- no second whole-app review;
- freeze.
