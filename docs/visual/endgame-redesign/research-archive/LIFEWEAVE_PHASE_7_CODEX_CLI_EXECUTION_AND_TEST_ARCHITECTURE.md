# Lifeweave — Phase 7 Codex CLI Execution & Smart Test Architecture

**Target executor:** Codex CLI / Codex local project workflow  
**Frozen repo baseline for planning:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Companion:** `LIFEWEAVE_PHASE_7_MIGRATION_DAG_AND_COVERAGE_LEDGER.md`  
**Purpose:** preserve Goal-driven completeness while minimizing wasted reasoning, repeated tests, native builds, screenshots and context pollution.

> The optimization target is not 'use fewer tests'. It is **maximize defect-detection value per reasoning turn, command, native build and screenshot** while keeping every stage finite.

## 1. Current Codex facts that shape this workflow

Verified against current official OpenAI Codex documentation on 2026-08-10:

| Feature | Official behavior | Lifeweave implication |
|---|---|---|
| Goal | `/goal` sets a persistent goal; official slash-command guidance says to use `/plan` first to shape it. | Use a prepared finite stage packet in Plan mode, then set a short stage Goal. |
| Goal feature | `features.goals` is stable and on by default; it enables persisted goals and automatic continuation. | Automatic continuation is useful only when the completion predicate is finite and explicit. |
| Status | `/status` reports chat ID, context usage and rate limits. | Use it at stage start and before expensive review/verification. |
| Compact | `/compact` compacts current context. | Treat it as emergency compression, not as permission to keep an oversized stage alive indefinitely. |
| Reasoning | `/reasoning` changes reasoning effort; config supports minimal/low/medium/high/xhigh on supported models. | Spend HIGH on design/composition decisions, MEDIUM on implementation, LOW/MEDIUM on deterministic verification. |
| Review | `/review` reviews uncommitted changes or compares against a base branch. | Use exactly one bounded review pass per implementation stage. |
| AGENTS discovery | Codex builds the instruction chain once per run/session; combined project instructions stop at `project_doc_max_bytes`, 32 KiB by default. | Keep AGENTS concise. Do not paste the multi-thousand-line Master Spec into AGENTS; stage packets explicitly read normal docs. |
| Rules | Codex command rules choose the most restrictive matching decision (`forbidden > prompt > allow`). | Optional project rules can block known scope hazards without relying on prose reminders. |

### 1.1 Official-source note

The official facts above are product facts. Context thresholds, stage sizes, rerun caps beyond the repository constitution, test batching and reasoning allocation below are **our engineering policy**, chosen for this repository.

## 2. Why Goal stays ON

The user requirement is valid: turning Goal off can make a long implementation easier to abandon halfway. Goal therefore stays enabled.
The failure mode to prevent is not Goal itself; it is an **unbounded completion predicate**.
Codex automatic continuation means wording such as 'keep improving until perfect' is dangerous because each new review can create more work and therefore move the finish line.
Lifeweave instead makes Goal completeness set-theoretic: a Goal owns a fixed row set, a fixed local gate, one fixed review pass, a fixed evidence record and a STOP.

### 2.1 Canonical stage Goal predicate

```text
COMPLETE(stage) :=
  every assigned canonical row is LOCAL_VERIFIED
  AND no assigned row is BLOCKED_PRODUCT
  AND the prescribed stage-local gate passes
  AND exactly one bounded diff review has been resolved
  AND the stage ledger/checkpoint is persisted
  AND the staged diff contains only authorized files
  AND the stage commit is created according to repo policy

WHEN COMPLETE(stage) == true: STOP.
Do not start the next stage.
```

The Goal must never contain `until satisfied`, `until Craft-class`, `until no inconsistencies remain`, `review the whole app again`, or any equivalent recursive aesthetic clause.

## 3. Prompt architecture for Phase 8

Phase 8 should generate **three layers**, not one giant prompt:

### Layer A — concise repository instruction layer

Keep existing `AGENTS.md`/`AI_CONSTITUTION.md` concise and high-salience.
Do not dump Phase 6/7 into `AGENTS.md`; Codex project instructions have a default combined 32 KiB ceiling and are loaded once per session.
Only durable cross-stage rules belong here: authority order, frontend-only boundary, no invented capability, Goal finiteness, test evidence, workflow seal.

### Layer B — Master Execution Specification

A normal repo Markdown document, explicitly read by stage packets.
Contains the approved design system, capability-vs-art authority, migration DAG, global invariants, baseline policy, test architecture, forbidden shortcuts and final DoD.
It is the constitution for the redesign, **not** the active `/goal` text.
Phase 8 should add an index with section anchors so a stage reads only relevant Master sections.

### Layer C — one Stage Packet per Goal

Contains exact canonical row IDs, exact source files, extracted Phase 6 directives, allowed shared dependencies, stage visual profile/tags, focused tests, local gate, mutation boundary, one-review policy and STOP condition.
Target size should be intentionally compact enough to read in one pass; it must not ask Codex to re-trace the whole repository.
Each stage packet resolves the Phase 6 ID crosswalk in advance so the agent never has to infer which heading corresponds to a row.

## 4. Recommended Codex CLI launch sequence per implementation stage

```text
1. Start a FRESH Codex session at repo root.
2. /status
3. /reasoning high   (design-heavy stage) OR /reasoning medium (mechanical stage)
4. /plan
5. Paste the Phase 8 stage bootstrap prompt:
     - read AGENTS.md + AI_CONSTITUTION.md
     - read exact Master sections
     - read this stage packet
     - inspect only assigned source/test files and proven shared dependencies
     - return a finite implementation plan mapped to row IDs
6. Exit/toggle Plan mode after the plan is coherent.
7. Set /goal to the short finite Goal supplied by Phase 8.
8. Execute.
9. When macro composition is locked, /reasoning medium for implementation/mechanical work.
10. Before review/gate: /status.
11. /review exactly once for this stage diff.
12. Fix the fixed finding set; rerun only affected checks.
13. Persist ledger/evidence, commit, report exact evidence, STOP.
```

The stage packet is authoritative enough that the Plan step is planning execution, not reopening product design.

## 5. Context/token economics

### 5.1 Fresh-context rule

Use a fresh Codex session for every implementation stage and every grouped checkpoint.
Repository files and commits carry state; chat history does not need to carry twelve stages of implementation discussion.
At the start of a new session, Codex reloads the instruction chain, so there is no benefit in dragging stale long-context history forward.

### 5.2 Context thresholds — Lifeweave policy, not an OpenAI product limit

| Context use reported by `/status` | Policy |
|---|---|
| `< 50%` | Normal work. |
| `50–65%` | Stop broad exploration. Read only stage files/evidence. Finish the finite plan. |
| `> 65%` before acceptance | Persist `DONE/CURRENT/NEXT/DEBT`, start a fresh **same-stage** session, recreate the same finite Goal. |
| `> 70%` and only one small edit/gate remains | `/compact` may be used once as an emergency shortcut; otherwise fresh session is preferred. |

Do not use repeated compaction as a strategy for carrying a huge Goal. The unit of work should be fixed instead.

### 5.3 Read-budget rule

Do not reread the complete 3,211-line Phase 6 design spec in every stage.
Phase 8 extracts the assigned rows plus only globally relevant design laws into each stage packet.
Do not recursively inspect every source directory. The Phase 6 ledger already names source owners; broaden only when an import/dependency trace proves it necessary.
Do not paste complete test logs into the conversation. Persist them under `target/codex-stage/<stage>/logs/` and return summaries/tails.

## 6. Reasoning allocation

| Work type | Recommended effort | Rationale |
|---|---|---|
| North-star composition/hierarchy inside assigned screen | HIGH | Visual structure errors are expensive and propagate. |
| Typography/spacing/system trade-off | HIGH | Requires cross-surface judgment. |
| Difficult responsive/canvas/interaction composition | HIGH | Multiple constraints interact. |
| Mechanical token/primitive migration | MEDIUM | Target already decided; high reasoning adds little. |
| Focused CSS/vanilla-extract implementation | MEDIUM | Requires care, not open exploration. |
| Routine unit-test fixes with clear failure | MEDIUM or LOW | Follow evidence; avoid re-deriving design. |
| Command execution/log collection | LOW | Deterministic. |
| Grouped verification checkpoint | LOW → MEDIUM on failure | Escalate reasoning only for diagnostic ambiguity. |
| One final Phase 10 adversarial pass | HIGH; XHIGH only if proven necessary | Quality-first single bounded review, not continuous max-effort execution. |

Do not run XHIGH by default for every implementation turn. It increases cost precisely where most work is already specified.

## 7. Verification funnel — cheapest/highest-signal checks first

```text
0. SCOPE PREFLIGHT
   git status / baseline SHA / assigned row IDs / allowed files
        ↓
1. STATIC / RATC HET
   diff-check, convergence scans, forbidden raw styling / invented capability checks
        ↓
2. FOCUSED UNIT / COMPONENT
   only changed feature + directly shared primitive consumers
        ↓
3. TYPE / GOVERNANCE
   typecheck + relevant verify checks at stage close
        ↓
4. TARGETED NATIVE VISUAL PROFILE
   assigned surface group only; MAX; MIN only where row requires
        ↓
5. BUNDLE/PERF CONDITIONAL
   build + hardening:performance if bundle-risk trigger or checkpoint
        ↓
6. ONE /review
   fixed finding set; no second review loop
        ↓
7. COMMIT + LOCAL_VERIFIED
        ↓
8. GROUPED DOMAIN CHECKPOINT
   selected native E2E phases + locked visual baselines
        ↓
9. VERIFIED
```

A lower layer does not run when a cheaper layer already proves the stage is broken.

## 8. Change-risk → test-selection algorithm

| Observed diff | Mandatory evidence | Explicitly avoid |
|---|---|---|
| Only feature `.css.ts` / existing class wiring | Focused component tests if selectors/states affected; typecheck at close; targeted visual profile. | Full frontend suite after every CSS edit; JS performance gate per micro-edit. |
| Shared primitive style/API | Primitive tests + 3–5 representative consumers across dense/editorial/modal/settings families + stage profile. | Rendering all 109 rows. |
| Feature TSX structure, no behavior contract change | Focused tests + typecheck + stage visual profile. | Unrelated native persistence phases. |
| Event handler/state machine/keyboard behavior | Focused tests + matching native behavior phase at checkpoint. | Treating screenshot alone as proof. |
| Modal/popup/focus changes | Focus-trap/keyboard tests + representative native state + a11y. | Full app E2E. |
| Canvas/local-overflow/DnD changes | Geometry/local-scroll audit + keyboard DnD/selection tests + stage native profile. | Global layout rewrite. |
| Lazy import/chunk/dependency/icon extraction | Production build + JS budget immediately. | Deferring a likely bundle regression to the final day. |
| Only baseline PNG/evidence metadata | Zero-diff rerun for targeted tags; git diff of exact baseline set. | Unit/full suite rerun with no source change. |
| E2E harness/profile refactor | Full-profile equivalence once + fixture/state-count comparison. | Changing product CSS to satisfy a harness defect. |
| Backend/schema/generated IPC touched | STOP and escalate as a scope violation unless explicit authority exists. | Running more frontend tests to legitimize an unauthorized backend change. |

## 9. Native visual audit optimization

The current `task50b-maximized-audit.e2e.ts` already has deterministic fixture seeding, geometry/collision capture and `LIFEWEAVE_VISUAL_TAGS`, but its single test still walks the entire surface matrix even when comparison is filtered. F0 should preserve the existing `full` walk and add a **surface execution filter/profile**.

### 9.1 Proposed audit groups

| Profile | Owner | Includes |
|---|---|---|
| `shell-global` | S1 | shell expanded/collapsed; Search result/no-result; Keyboard Help; representative DecisionDialog |
| `today-core` | S2 | Today unselected/selected; inspector facets; timer; assessment; WeekStrip |
| `task-compose` | S3 | create/edit; recurring; tags; Life Area; Focus Plan; TimeWheel |
| `planning` | S4 | Upcoming; Overdue; Deadlines; Saved Views; editor |
| `calendar-analytics` | S5 | Calendar + Week/Month/Year Analytics representative states |
| `plans` | S6 | portfolio/no selection + selected plan |
| `life` | S7 | Browse; Pinned; Edit; Graph |
| `reader` | S8 | Reader; empty; links; Basic Editor; link/dirty decisions |
| `interchange` | S9 | portable/branch/tree controls and preview dialogs |
| `narrative-reader` | S10 | template/reader/blocks/recovery/Markdown preview |
| `narrative-studio` | S11 | Studio; scenes; all block kinds; Visual Worlds; decisions |
| `settings` | S12 | Settings sections; tag merge; backup inventory/restore modal; Foundation tools |
| `full` | FINAL | existing complete walk; must remain behaviorally equivalent to pre-refactor audit |

Profiles must call the same underlying interaction helpers/fixture. They are an execution subset, not a second test implementation.

### 9.2 Stage visual tag plan

| Stage | Targeted visual set |
|---|---|
| S1 | `01-today`, `21b-search-results`, `21c-search-no-results`, `22-keyboard-help` + shell state capture |
| S2 | `01-today`, selected/inspector candidate tags, `01d-today-running-timer`, `01e-today-assessment` |
| S3 | `02-task-create`, `02b-task-tags`, `02c-task-life-area`, `02d-task-focus-plan`, recurring/edit captures |
| S4 | Upcoming/Overdue/Deadlines/Saved Views captures + `08b-saved-view-editor` |
| S5 | `09-calendar`, `10-analytics` |
| S6 | `11-plans` + selected-plan candidate |
| S7 | `12-life-browse`, `13-life-edit`, `14-life-pinned`, `15-life-graph` |
| S8 | `16-life-reader`, `16b-life-link-dialog`, `16c-life-empty`, `17-basic-editor`, `17b-basic-editor-link-dialog` |
| S9 | `13b-life-tree-import`, `13c-life-branch-import`, `16e-portable-import` |
| S10 | `18-narrative-reader`, `16d-markdown-import` + block/recovery captures |
| S11 | `19-narrative-studio`, `19b-*`, `19c`–`19f` real Visual Worlds, `19g-narrative-dirty-exit` |
| S12 | `18-settings` + deterministic restore-modal candidate |

Stage runs should print only `screens/collisions/mismatch` summaries and the artifact directory. Detailed WDIO/Tauri logs remain on disk unless failure diagnosis requires a tail.

## 10. Visual-baseline transition protocol

Intentional redesign is not a regression, but every baseline replacement must still be auditable.

### Protocol

1. Run the stage profile with comparison disabled and save the actual frames/geometry.
2. Review the actual against Phase 6 design, real capability source, min/max geometry and visible focus. Do not compare beauty to the old design as a pass criterion.
3. Run comparison against the old baseline once when useful to produce a diff artifact that explains what intentionally changed.
4. List exact tags to transition. Baselines outside the stage are forbidden.
5. For an existing baseline, preserve the old file/diff evidence, then remove only the explicitly reviewed targeted baseline so the repository's `autoSaveBaseline` mechanism creates a missing baseline rather than silently overwriting an unexplained one.
6. Run with acceptance enabled for only the targeted reviewed tags.
7. Immediately rerun with acceptance disabled and require exact zero mismatch.
8. Audit `git diff --name-only` to prove only intended baseline PNG/metadata plus stage source changed.
9. Commit the baseline transition with the stage/checkpoint evidence.

Never set acceptance globally for the full matrix during migration.

## 11. Focused unit-test policy

Use Vitest file/family selection during iteration; do not run `pnpm test` after every change.
Run the full frontend unit suite at F0 and grouped sentinels Q1–Q5, not after every row.
Shared primitive changes expand the focused set to representative consumer tests; they do not automatically trigger every feature test.
A failing focused test is diagnosed before any native visual run.

### 11.1 Focused families by stage

| Stage | Primary focused test families |
|---|---|
| S1 | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx |
| S2 | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests |
| S3 | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx |
| S4 | TaskPlanningPanel tests; DeadlineQueuePanel tests; TaskSavedViewsPanel tests |
| S5 | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests |
| S6 | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests |
| S7 | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests |
| S8 | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests |
| S9 | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests |
| S10 | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests |
| S11 | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration |
| S12 | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests |

Exact filenames may be resolved from the repo at execution time; Phase 8 should not invent a test file that does not exist.

## 12. Grouped native behavior checkpoints

The root Windows runner builds once per invocation and then runs selected E2E specs sequentially. Use that property deliberately.

| Gate | Run after | Native behavior scope | Why batched |
|---|---|---|---|
| Q1 | S1–S4: shell, Today, task compose, planning/saved views | `phase6-planning`, `phase9-deadline-saved-views`, `phase14-actual-time`, `phase16-keyboard-shortcuts` | One Tauri build covers related phases; avoids repeated whole-native startup for each UI stage. |
| Q2 | S5–S6: Calendar, Analytics, Focus Plans | `phase8-focus-plans`, `phase17-planned-vs-actual-analytics`, `phase20-focus-plan-analytics` | One Tauri build covers related phases; avoids repeated whole-native startup for each UI stage. |
| Q3 | S7–S9: Life, Graph, Reader/Editor/Links, interchange | `phase4-portable-roundtrip`, `phase11-life-links`, `phase13-life-branch-interchange`, `phase15-life-graph`, `phase18-life-tree-interchange` | One Tauri build covers related phases; avoids repeated whole-native startup for each UI stage. |
| Q4 | S10–S11: Narrative Reader/Markdown/Studio | No broad persistence phase is required solely for visuals; use focused Narrative tests + native visual profile. Re-run portable roundtrip only if package UI/contract wiring changed. | One Tauri build covers related phases; avoids repeated whole-native startup for each UI stage. |
| Q5 | S12 plus implementation-wide pre-final sanity | `phase7-unified-tags`, `phase19-managed-backup-versions`; include `phase2-backup-restore` only if restore interaction wiring changed | One Tauri build covers related phases; avoids repeated whole-native startup for each UI stage. |

The final Phase 10 run is the only default **all native phases** release-style run.

## 13. Build and performance economics

Current performance budget has little aggregate headroom, so performance cannot be ignored; it can, however, be triggered intelligently.
Build+`hardening:performance` immediately when imports/lazy boundaries/dependencies/icon extraction or substantial eager TS/TSX change.
For CSS-only/local style stages, defer JS budget to the nearest grouped checkpoint.
Always run production build + JS budget at F0, Q2, Q3, Q4, Q5; run at Q1 when bundle-sensitive code changed.
`hardening:narrative-performance` is mandatory at Q4 because S10/S11 modify the most specialized rendering/editing family.
Do not add a dependency merely to save implementation time. A dependency has a bundle/security/removal cost and needs existing repo authority.

### 13.1 Named chunk watchlist

| Family | Chunk/budget risk |
|---|---|
| Startup/shared | `index.js`; aggregate raw/gzip; expected chunk count |
| Saved Views | `TaskSavedViewsPanel.js` |
| Focus Plans | `FocusPlansScreen.js` |
| Basic Editor | `BasicLeafEditor.js` + extracted vendor core |
| Narrative Studio | `NarrativeCanvasStudio.js` |
| Markdown interoperability | `markdown.js` |

## 14. Log/context hygiene

### 14.1 Rule

**Logs are artifacts, not conversation context.**

Recommended PowerShell pattern:

```powershell
$stage = 'S5'
$logDir = "target\codex-stage\$stage\logs"
New-Item -ItemType Directory -Force $logDir | Out-Null

pnpm typecheck *> "$logDir\typecheck.log"
if ($LASTEXITCODE -ne 0) {
  Get-Content "$logDir\typecheck.log" -Tail 120
  exit $LASTEXITCODE
}
Write-Host 'PASS typecheck'
```

Successful commands should return one-line summaries/counts, not thousands of test lines.
On failure, surface the first useful diagnostic plus at most ~100–150 tail lines; use targeted search in the log for the next step.
Do not repeatedly paste the same compile/test error after no code or diagnostic change.

## 15. Rerun policy — anti-loop

A rerun is allowed only after **new information**:

a code/test/fixture change;
a changed environment/precondition;
a diagnostic command that materially narrows the failure;
or a known flaky harness condition with one controlled retry.

Forbidden:

`test failed → run same test again → same failure → run again`;
`visual mismatch → accept baseline without explaining diff`;
`E2E timing failed → change production UI timing speculatively`;
`review found no blocker → review whole stage again looking for more`.

The repository constitution already establishes the critical hard cap: after **two failed reruns without new diagnostic evidence, stop retrying** and use a smaller deterministic substitute when the failure is harness-only.

## 16. One-review policy

For every implementation stage:

```text
implementation complete
   ↓
/review ONCE, scoped to this stage diff
   ↓
freeze finding set F_stage
   ↓
fix BLOCKER/HIGH/MEDIUM
+ LOW only when it directly violates an explicit Phase 6 invariant
   ↓
rerun checks affected by those fixes
   ↓
NO SECOND /review
   ↓
commit + STOP
```

A second review is permitted only if the first review itself was invalid/nondiagnostic (for example it reviewed the wrong base/diff), not because the agent wants another polish loop.

## 17. Scope-expansion algorithm

When Codex discovers an issue outside the assigned rows:

```text
Does it cause a reproducible regression in an assigned row?
  ├─ no → KNOWN_DEBT; continue current stage
  └─ yes
      ↓
Is the smallest fix inside an F0 shared primitive already allowed?
  ├─ yes → fix primitive; add representative regression checks; record affected verified rows
  └─ no
      ↓
Does it require another feature/backend/schema/product capability?
  ├─ yes → BLOCKED_PRODUCT / escalation; do not invent
  └─ no → smallest reversible in-stage correction
```

This prevents a one-line CSS issue from turning into a repository-wide refactor.

## 18. Checkpoint memory persisted in repo

Every implementation-stage commit updates a compact execution ledger:

```markdown
STAGE: S7
BASE_SHA: ...
LAST_VERIFIED_COMMIT: ...
ROWS:
  L-01 LOCAL_VERIFIED
  ...
DONE:
  - ...
CURRENT:
  - none
NEXT:
  - Q3 after S9
KNOWN_DEBT:
  - ...
DESIGN_INVARIANTS:
  - ...
APPROVED_EXCEPTIONS:
  - ...
COMMAND_EVIDENCE:
  - ...
```

A new session reads this ledger, not the entire previous chat.

## 19. Commit policy

Before commit: `git diff --check`; `git status --short`; `git diff --name-only`; inspect full in-scope diff; relevant governance/integrity gates.
Stage only authorized files. Never use `git add .` as a convenience when unrelated changes exist.
Commit message should identify stage, e.g. `redesign(S5): converge calendar and analytics`.
Per repository constitution, direct-to-main is authorized after required checks; no force-push/history rewrite.
Never touch `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256` for this redesign.

## 20. Stage failure outcomes

| Outcome | Meaning | Action | Goal state |
|---|---|---|---|
| Product defect | Assigned functionality or explicit visual invariant broken. | Fix inside stage; focused rerun. | Continue. |
| Shared primitive regression | Small F0 primitive caused assigned/previous verified regression. | Smallest shared fix + representative checks. | Continue, record affected rows. |
| Harness failure | Driver/timing/infrastructure nondiagnostic after allowed diagnostic attempts. | Use deterministic substitute; record VERIFICATION_DEBT. | May close if no product defect. |
| Performance regression | Budget confirmed red. | Reclaim/remove cost; do not raise ceiling without Product Owner authority. | BLOCKED until resolved/authorized. |
| Scope conflict | Fix would require backend/schema/new capability/unrelated feature. | Record exact conflict and stop that path. | BLOCKED_PRODUCT. |
| Context exhaustion | `/status` exceeds policy threshold before close. | Persist state; fresh same-stage session; recreate same Goal. | Goal semantics unchanged. |

## 21. Final verification architecture (Phase 10 preview)

Phase 7 does not execute this, but Phase 8 must preserve the terminal contract:

1. All S1–S12 rows are `VERIFIED`; Q1–Q5 green or explicitly documented nondiagnostic verification debt.
2. Run full `pnpm verify`, `pnpm typecheck`, full unit suite, production build, performance budget.
3. Run the default full native E2E phase set once.
4. Run the complete required **Light** visual matrix at canonical maximized and governed minimum viewport; require locked zero-diff.
5. Run representative Reduced Motion and a minimal forced-colors accessibility regression set if the harness remains deterministic; these do not reopen art direction.
6. Perform **ONE** whole-app adversarial/coherence review and materialize a fixed finding set `F_final`.
7. Fix `F_final`; rerun only affected checks plus mandatory final gates.
8. Do **not** run a second whole-app adversarial review.
9. Freeze.

## 22. Phase 8 deliverables implied by this architecture

`MASTER_EXECUTION_SPEC.md` — concise enough to navigate, complete enough to be constitutional.
`REDESIGN_EXECUTION_LEDGER.md` — canonical row/status/checkpoint state.
`stages/F0.md`, `stages/S1.md` ... `stages/S12.md` — exact stage packets.
`checkpoints/Q1.md` ... `Q5.md` — verification-only packets.
A short `/goal` string for each packet.
A Codex launch sequence for each stage with recommended reasoning tier and exact required reads.
Optional command-rule guidance that forbids workflow-seal mutation and other known scope hazards without weakening normal stage execution.

## 23. Codex Goal template — structure only, NOT the Phase 8 superprompt

```text
Complete Stage <Sx> only.

Authority:
- repository AGENTS.md + AI_CONSTITUTION.md
- Master Execution Specification sections <...>
- stage packet <...>
- canonical rows: <fixed IDs>

Completion:
- implement every assigned row to its Phase 6/7 DoD
- preserve all capability/domain invariants
- run prescribed local verification funnel
- perform exactly one bounded review of this stage diff
- resolve the frozen in-scope finding set and rerun affected checks
- persist the execution ledger and exact command evidence
- create the stage commit according to repository policy
- STOP

Do not begin another stage, reopen verified rows for polish, broaden product scope,
or run recursive whole-app improvement passes.
```

Phase 8 will replace placeholders with exact row-specific directives; this skeleton exists only to lock the safe Goal shape.

## 24. Current-source references

- Official OpenAI Codex Slash Commands (verified 2026-08-10).
- Official OpenAI Codex AGENTS.md guidance (instruction-chain lifecycle; 32 KiB default project-doc limit).
- Official OpenAI Codex Config Reference (`features.goals`, reasoning, sandbox/approval settings).
- Official OpenAI Codex Rules reference (most restrictive matching rule wins).
- Lifeweave `AI_CONSTITUTION.md`, `AGENTS.md`, root/frontend package scripts.
- Lifeweave Windows E2E runner, Task50b layout/visual audit, visual baseline README, performance budget v2.

---

**Result:** Goal-driven persistence and process efficiency are no longer in tension. Goal enforces completion over a finite set; the DAG, context policy and verification funnel prevent that persistence from turning into an infinite search loop.