# Lifeweave — Phase 7 Migration DAG & Finite Coverage Ledger

**Frozen baseline:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Phase 6 authority files:** `LIFEWEAVE_PHASE_6_ENDGAME_DESIGN_SPECIFICATION.md` and `LIFEWEAVE_PHASE_6_UI_SURFACE_CONTROL_LEDGER.md`  
**Phase 7 objective:** convert the approved endgame design into a finite implementation graph whose completion can be proven without open-ended polishing.

> **Core execution law:** the approved mockups and Phase 6 spec are art-direction authority; current production source is capability authority; this Phase 7 ledger is execution/closure authority.

## 1. Phase 7 locked decisions

- Redesign remains **frontend-only**. Rust/domain/schema/database/generated IPC are frozen unless a proven unavoidable blocker is escalated.
- Redesign scope is **Light**. Dark is not a design target. Existing non-light modes may receive only cheap regression protection where useful.
- Goal mode will be **ON**, but one Goal owns exactly one finite implementation stage or one finite verification checkpoint.
- There are **109 canonical surface/micro-control rows**. No implementation task may invent an unledgered product surface.
- Each implementation row moves through a finite state machine. No row may be reopened for subjective polish after closure.
- Expensive native E2E and full visual matrices are grouped into checkpoints instead of repeated after every small stage.
- Existing production geometry, data semantics, keyboard contracts, local-first behavior, recovery semantics and performance ceilings are invariants, not redesign suggestions.
- The test harness itself may be improved only to make verification more selective/deterministic; it must not weaken existing full-run coverage.

## 2. Canonical ID authority — resolve Phase 6 naming drift before Codex sees it

The Phase 6 prose was written as a design document and some section IDs evolved while the finite ledger was being normalized. Phase 8 **must never mix the prose-heading IDs with closure IDs**. From this point onward, the 109-row Phase 6 UI Surface & Interaction Control Ledger is the sole execution ID authority.

| Area | Phase 6 prose situation | Phase 7 canonical rule |
|---|---|---|
| Analytics | Phase 6 prose uses A-01 Week, A-02 Scheduled, A-03 Actual, A-04 Category, A-05 Streaks, A-06 Completion, A-07 Focus Plan, A-08 Month/Year. | Execution ledger uses A-01 Week, A-02 Month, A-03 Year, A-04 Scheduled, A-05 Actual, A-06 Category, A-07 Streaks, A-08 Completion, A-09 Focus Plan. |
| Plans | Phase 6 prose splits P-02 plan row and P-03 selected header and continues through P-08 Reviews. | Execution ledger collapses the selected-plan list/header composition into P-02 and uses P-03..P-07 for details/approaches/phases/linked work/reviews. |
| Life | Phase 6 prose uses L-01..L-10, splitting Browse empty/paging and archived nodes. | Execution ledger uses L-01..L-08; L-03 owns Browse empty/fallback/paging and L-07 owns inspector + archived/restore controls. |
| Narrative Reader | Phase 6 prose uses N-01 chooser, N-02 reader, N-03 Visual Worlds, N-04 recovery/error. | Execution ledger expands actual reader content to N-01..N-09; N-03..N-07 are real reader block kinds; N-08 unsupported; N-09 recovery/conflict. |
| Narrative Studio | Phase 6 prose uses NS-01..NS-12, including generic block-container and width-decision headings. | Execution ledger uses NS-01..NS-10; generic container and width decision are design rules, not independently closable surfaces; NS-10 is decisions. |
| Settings | Phase 6 prose uses S-01..S-09 with inline rename separated. | Execution ledger uses S-01..S-08; S-03 owns tag tables + inline rename; S-08 owns Foundation Records. |
| Other | Phase 6 prose contains E-04, L-09/L-10, P-08, NS-11/NS-12, S-09 as explanatory sections. | Those are NOT execution IDs. Conversely SH-01/SH-02, C-02, A-09 and MC-01..MC-03 are canonical execution rows even if prose headings differ. |

### 2.1 Lookup rule

1. Codex receives a canonical row ID from this Phase 7 ledger.
2. It resolves the row by **row title + source path**, not by searching only for the same numeric heading in the Phase 6 prose.
3. If a prose heading ID disagrees with the canonical row, the canonical row wins for scope/closure; the prose text still supplies visual treatment.
4. A new row may be added only if a repo trace proves a materially distinct production interaction surface was omitted. Discovery is evidence, not taste.
5. An explanatory design section such as Studio width or archived-node treatment does not become a new Goal item unless it maps to an actual independently testable surface.

## 3. Migration DAG

```text
F0 Foundation + verification harness
  └─ S1 Global/Shell
      ├─ S2 Today Core ─ S3 Task Compose ─ S4 Planning/Saved Views ─ Q1
      ├─ S5 Calendar/Analytics ─ S6 Focus Plans ─ Q2
      ├─ S7 Life Browse/Edit/Graph ─ S8 Reader/Editor/Links ─ S9 Interchange ─ Q3
      │                                      └─ S10 Narrative Reader/Markdown ─ S11 Narrative Studio ─ Q4
      └─ S12 Settings ─ Q5

Q1..Q5 complete → Phase 9 implementation complete
                     ↓
Phase 10: ONE final whole-app adversarial pass → fixed finding set F → resolve F → final gates → FREEZE
```

The practical execution order is linear `F0 → S1 → S2 ... → S12` to minimize context switching, but the dependency graph above is the authority for what can share primitives and what must already be stable.

## 4. Stage partition

| Stage | Scope | Canonical rows | Count | Reasoning profile | Hard dependency | Next boundary |
|---|---|---:|---:|---|---|---|
| F0 | Foundation convergence + verification harness | engineering prerequisites | 0 | HIGH → MEDIUM | baseline only | S1 |
| S1 | Global shell + global overlays | `G-01` … `SH-02` / explicit set below | 8 | HIGH → MEDIUM | F0 | S2 |
| S2 | Today core + inspector + timer/assessment | `T-01` … `MC-01` / explicit set below | 11 | HIGH → MEDIUM | F0,S1 | S3 |
| S3 | Task compose/edit + shared task inputs | `T-11` … `MC-03` / explicit set below | 9 | MEDIUM | F0,S1,S2 | S4 |
| S4 | Planning + deadlines + saved views | `T-18` … `T-22` / explicit set below | 5 | MEDIUM | F0,S1,S2,S3 | Q1 |
| S5 | Calendar + Analytics | `C-01` … `A-09` / explicit set below | 11 | HIGH → MEDIUM | F0,S1 | S6 |
| S6 | Focus Plans | `P-01` … `P-07` / explicit set below | 7 | HIGH → MEDIUM | F0,S1 | Q2 |
| S7 | Life Browse/Edit/Graph | `L-01` … `LG-04` / explicit set below | 12 | HIGH → MEDIUM | F0,S1 | S8 |
| S8 | Reader + Basic Editor + Links | `R-01` … `RT-01` / explicit set below | 11 | HIGH → MEDIUM | F0,S1,S7 | S9 |
| S9 | Portable/Branch/Tree interchange | `PK-01` … `TR-02` / explicit set below | 6 | MEDIUM | F0,S1,S7,S8 | Q3 |
| S10 | Narrative Reader + Markdown | `N-01` … `MD-02` / explicit set below | 11 | HIGH → MEDIUM | F0,S1,S8 | S11 |
| S11 | Narrative Studio | `NS-01` … `NS-10` / explicit set below | 10 | HIGH → MEDIUM | F0,S1,S10 | Q4 |
| S12 | Settings | `S-01` … `S-08` / explicit set below | 8 | MEDIUM | F0,S1 | Q5 |

**Finite surface total:** 109 rows.

## 5. F0 — Foundation convergence + verification-harness prerequisites

F0 is deliberately not a product-surface redesign stage. It creates the shared grammar and verification leverage that prevents twelve later stages from reinventing the same controls.

| ID | Work item | Acceptance | Guardrail |
|---|---|---|---|
| F0-01 | Canonical execution IDs | Persist the 109 canonical IDs and Phase 6 crosswalk in the redesign ledger. Reject unknown IDs in stage packets. | No product UI change. |
| F0-02 | Typography role authority | Finish semantic productive/editorial roles and add a ratchet against new feature-local type-size drift. Existing justified optical exceptions are explicit. | No mass typography rewrite without a role mapping. |
| F0-03 | Field/control grammar | Shared input/select/textarea/number/file-trigger geometry, states, density and help/error language. | Preserve native semantics and task TimeWheel's two-select model. |
| F0-04 | Button/action grammar | Converge primary/secondary/ghost/icon/destructive/compact use; eliminate feature-local clones when equivalent. | Do not flatten meaningful destructive hierarchy. |
| F0-05 | Tabs + selection grammar | One low-chrome tab/segmented/list-selected language, including keyboard/focus states. | Do not change state machines or routing. |
| F0-06 | Focus + visually-hidden utility | One focus treatment and one hidden-text utility family; delete local duplicates opportunistically. | Do not weaken visible focus. |
| F0-07 | Floating-surface grammar | Dialog/popover/menu elevation, backdrop, radius, border, attachment and Z roles. | Persistent content must not become glass/floating. |
| F0-08 | Inspector/table recipes | Shared structural recipes only where repeated; keep domain-specific content local. | No generic 'card component' that forces unrelated surfaces together. |
| F0-09 | Brand mark | Add the approved simple blue infinity mark through the centralized icon pipeline. | No lightning, glow, avatar/profile or invented shell furniture. |
| F0-10 | Convergence ratchet | Extend static checks to reject new raw font-size/control/effect drift where a semantic authority exists. | Ratchet prevents regression; it must not demand a flag-day rewrite. |
| F0-11 | Stage-selectable visual audit | Refactor the existing Task50b monolithic walk into named audit groups/profiles while preserving an unchanged `full` profile and current deterministic fixture behavior. | No threshold loosening, no hidden scrollbars, no deleted full coverage. |
| F0-12 | Low-noise evidence wrapper | Provide a small script/profile map that runs a selected audit group, writes verbose logs/artifacts under `target/`, and prints only summary/failure tail to Codex. | No new dependency; verbose tool output must not flood model context. |

### 5.1 F0 verification

- Run focused design-system/layout tests while iterating.
- At F0 close: `git diff --check`, `pnpm verify`, `pnpm typecheck`, full frontend unit suite, one production build, `pnpm hardening:performance`.
- Prove the new visual-audit `full` profile walks the same baseline surface set as the pre-refactor audit. Any count/name difference must be explained before F0 closes.
- Run a small representative light visual profile spanning shell, dense task UI, Calendar, one dialog, one editor and Settings. This is harness-equivalence evidence, **not** approval of old aesthetics.
- F0 Goal stops after its checklist + evidence; it does not begin S1.

## 6. Finite row state machine

```text
TODO
  ↓
ACTIVE
  ↓
LOCAL_VERIFIED  ──(domain checkpoint Q1..Q5)──> VERIFIED
  │
  ├─> VERIFICATION_DEBT   (harness/environment debt only; deterministic substitute required)
  └─> BLOCKED_PRODUCT     (confirmed product defect/invariant violation; stage cannot falsely close)

VERIFIED ──(reproducible later regression only)──> REOPENED_REGRESSION
```

**LOCAL_VERIFIED** means the implementation stage has completed its design row, focused tests, local accessibility checks and stage-local render evidence.
**VERIFIED** means the relevant grouped native/visual checkpoint has also passed.
**VERIFICATION_DEBT** is never a place to hide a known visual/product defect. It is allowed only for nondiagnostic harness/environment failure with equivalent deterministic evidence.
A `VERIFIED` row cannot be reopened because an agent thinks it 'could be nicer'. Reopen requires a reproducible regression, violated invariant, data-safety risk, or explicit Product Owner decision.
After two failed reruns without new diagnostic evidence, retrying stops. Diagnose once, record the harness debt if nondiagnostic, and use the smallest deterministic substitute.

## 7. Definition-of-Done classes

| Class | Closure contract |
|---|---|
| STATE | Correct hierarchy/copy/status semantics; no layout break; live/alert use is appropriate; recovery action works where present; not color-only. |
| COMPOSITION | Phase 6 composition/hierarchy implemented with real controls only; alignment/spacing/type/surface rules match; keyboard reachable; canonical render clean. |
| INTERACTION | All control states (default/hover/focus/pressed/disabled/pending as applicable), pointer + keyboard path, no accidental propagation, no invented interaction. |
| MODAL | Bounded geometry; backdrop/elevation grammar; title/description semantics; initial focus; Tab trap; Escape/backdrop policy; deterministic focus return; pending/destructive rules. |
| POPUP | Correct anchor/Z layer; no clipping; trigger expanded/controls semantics; keyboard navigation; Escape/outside close; deterministic focus return. |
| CANVAS | Canvas owns local overflow; page does not; selection is clear; semantic alternate exists; DnD keyboard parity where editable; no decorative control invention. |
| TABLE | Native table/list semantics; local overflow where necessary; rows stay information-dense rather than cardified; actions/names/focus remain usable at min width. |
| EDITOR | Editing measure/tool hierarchy; toolbar semantics; dirty/draft/save/error/recovery states; editor focus isolates global shortcuts; block/tool interactions and decisions are deterministic. |

Every canonical row inherits its class contract plus its Phase 6 row-specific design instructions.

## 8. Per-row migration and verification ledger

Abbreviations in **Primitive deps** refer to F0 authorities: `TYPE`, `SPACING`, `BUTTON`, `FIELD`, `DIALOG`, `POPUP`, `FOCUS`, `STATE`, `SURFACE`, `TABLE`, `CANVAS`, `EDITOR`, `MOTION`, `TABS/SELECTION`, `BRAND/NAV`.

### S1 — Global shell + global overlays

**Goal scope:** exactly 8 canonical rows. **Dependencies:** F0. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q1.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| G-01 | Core connecting | STATE | TYPE,SPACING,STATE | Focused component/App fault/core-status fixture | MAX | No dedicated golden; verify through parent surface + focused semantics | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| G-02 | Core unavailable | STATE | TYPE,SPACING,STATE | Focused component/App fault/core-status fixture | MAX | No dedicated golden; verify through parent surface + focused semantics | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| G-03 | Route error boundary | STATE | TYPE,SPACING,STATE | Focused component/App fault/core-status fixture | MAX | No dedicated golden; verify through parent surface + focused semantics | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| G-04 | Global Search | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,BRAND/NAV | Task50 seeded fixture; query with grouped results + no-results | MAX + MIN | 21b-search-results,21c-search-no-results | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| G-05 | Keyboard shortcuts | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Registry-derived 8-shortcut fixture | MAX + MIN | 22-keyboard-help | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| G-06 | Decision dialog | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Representative inputless + input + destructive DecisionDialog fixtures | MAX + MIN | No dedicated golden; verify through parent surface + focused semantics | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| SH-01 | Sidebar expanded | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,BRAND/NAV | Task50 seeded app shell; expanded and Life auto-collapsed states | MAX | 01-today | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| SH-02 | Sidebar collapsed/Life auto-collapse | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,BRAND/NAV | Task50 seeded app shell; expanded and Life auto-collapsed states | MAX | 12-life-browse (collapsed shell) | App.test.tsx; RouteErrorBoundary.test.tsx; DecisionDialog.test.tsx; GlobalSearchDialog.test.tsx; keyboardShortcuts.test.ts; layout.test.tsx | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S2 — Today core + inspector + timer/assessment

**Goal scope:** exactly 11 canonical rows. **Dependencies:** F0,S1. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q1.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| T-01 | Today populated/unselected | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 01-today | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-02 | Today selected | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 01b-today-selected [capture; promote] | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-03 | Task Note | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 01c-today-note [capture; promote] | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-04 | Task Details | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 01c-today-details [capture; promote] | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-05 | Task Time | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 01c-today-time [capture; promote] | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-06 | Task Links | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 01c-today-links [capture; promote] | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-07 | Active timer strip | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 01d-today-running-timer | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-08 | Actual-time row | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | No dedicated golden; verify through parent surface + focused semantics | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-09 | Assessment fan | POPUP | TYPE,SPACING,BUTTON,FIELD,POPUP,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 01e-today-assessment | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | trigger/expanded/controls; keyboard nav/Escape/outside close; focus return; no clipping | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-10 | Assessment undo | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | No dedicated golden; verify through parent surface + focused semantics | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| MC-01 | WeekStrip | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 01-today | TodayScreen tests; TaskInspector tests; AssessmentControl.test.tsx; actual-time Today controls tests; WeekStrip tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S3 — Task compose/edit + shared task inputs

**Goal scope:** exactly 9 canonical rows. **Dependencies:** F0,S1,S2. **Reasoning:** MEDIUM. **Checkpoint:** Q1.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| T-11 | Create one-off Task | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 02-task-create | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-12 | Create recurring Task | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 03-task-recurring [capture; promote] | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-13 | Edit occurrence/series scope | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 04-task-edit [capture] | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-14 | Validation/delete/pending | STATE | TYPE,SPACING,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | No dedicated golden; verify through parent surface + focused semantics | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-15 | Life Area combobox | POPUP | TYPE,SPACING,BUTTON,FIELD,POPUP,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 02c-task-life-area | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | trigger/expanded/controls; keyboard nav/Escape/outside close; focus return; no clipping | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-16 | Focus Plan combobox | POPUP | TYPE,SPACING,BUTTON,FIELD,POPUP,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 02d-task-focus-plan | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | trigger/expanded/controls; keyboard nav/Escape/outside close; focus return; no clipping | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| T-17 | TagPicker | POPUP | TYPE,SPACING,BUTTON,FIELD,POPUP,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 02b-task-tags | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | trigger/expanded/controls; keyboard nav/Escape/outside close; focus return; no clipping | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| MC-02 | TimeWheel Start | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 02-task-create | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| MC-03 | TimeWheel End | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 02-task-create | TodayScreen task-dialog tests; TaskCombobox tests; LifeAreaCombobox/FocusPlanCombobox tests; TagPicker.test.tsx | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S4 — Planning + deadlines + saved views

**Goal scope:** exactly 5 canonical rows. **Dependencies:** F0,S1,S2,S3. **Reasoning:** MEDIUM. **Checkpoint:** Q1.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| T-18 | Upcoming | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 05-upcoming [capture] | TaskPlanningPanel tests; DeadlineQueuePanel tests; TaskSavedViewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch TaskSavedViewsPanel.js; build+budget at Q1 if TS/TSX/import topology changes |
| T-19 | Overdue | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 06-overdue [capture] | TaskPlanningPanel tests; DeadlineQueuePanel tests; TaskSavedViewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch TaskSavedViewsPanel.js; build+budget at Q1 if TS/TSX/import topology changes |
| T-20 | Deadlines | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 07-deadlines [capture] | TaskPlanningPanel tests; DeadlineQueuePanel tests; TaskSavedViewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch TaskSavedViewsPanel.js; build+budget at Q1 if TS/TSX/import topology changes |
| T-21 | Saved Views manager/results | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX | 08-saved-views [capture] | TaskPlanningPanel tests; DeadlineQueuePanel tests; TaskSavedViewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch TaskSavedViewsPanel.js; build+budget at Q1 if TS/TSX/import topology changes |
| T-22 | Create/Edit Saved View | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 deterministic task/planning fixture; use one-off + recurring + linked Life/Plan/tags as applicable | MAX + MIN | 08b-saved-view-editor | TaskPlanningPanel tests; DeadlineQueuePanel tests; TaskSavedViewsPanel tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Watch TaskSavedViewsPanel.js; build+budget at Q1 if TS/TSX/import topology changes |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S5 — Calendar + Analytics

**Goal scope:** exactly 11 canonical rows. **Dependencies:** F0,S1. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q2.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| C-01 | Month grid | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 deterministic month projection with selected/today/missed/load states; 5/6-week month | MAX + MIN | 09-calendar | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| C-02 | 5/6-week selected/today/missed/load | STATE | TYPE,SPACING,STATE | Task50 deterministic month projection with selected/today/missed/load states; 5/6-week month | MAX + MIN | 09-calendar + min-width stress | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-01 | Week analytics | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX + MIN | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-02 | Month analytics | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX + MIN | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-03 | Year analytics | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX + MIN | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-04 | Scheduled overview | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-05 | Recorded actual time | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-06 | Category scheduled time | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-07 | Objective streaks | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-08 | Completion distribution | TABLE | TYPE,SPACING,BUTTON,FIELD,TABLE,STATE,SURFACE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | native table semantics; action names; local horizontal overflow; keyboard reachability | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| A-09 | Focus Plan activity | TABLE | TYPE,SPACING,BUTTON,FIELD,TABLE,STATE,SURFACE,TABS/SELECTION | Task50 deterministic analytics fixture; period Week/Month/Year + zero/nonzero facts | MAX + MIN | 10-analytics | CalendarScreen tests; AnalyticsScreen tests; FocusPlanAnalyticsSection tests; formatting/projection renderer tests | native table semantics; action names; local horizontal overflow; keyboard reachability | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S6 — Focus Plans

**Goal scope:** exactly 7 canonical rows. **Dependencies:** F0,S1. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q2.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | Portfolio/no selection | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX + MIN | 11-plans | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |
| P-02 | Selected plan detail | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX + MIN | 11b-plans-selected [capture; promote] | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |
| P-03 | Plan details editor | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX | 11b-plans-selected [capture] | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |
| P-04 | Approach variants | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX | 11b-plans-selected [capture] | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |
| P-05 | Phases | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX | 11b-plans-selected [capture] | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |
| P-06 | Linked work | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX | 11b-plans-selected [capture] | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |
| P-07 | Reviews | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded active plan; no-selection + selected detail with variants/phases/linked work/reviews | MAX | 11b-plans-selected [capture] | FocusPlansScreen tests; LinkedWorkPanel tests; ReviewsPanel tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch FocusPlansScreen.js; build+JS budget at Q2 or earlier if TS/TSX/import topology changes |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S7 — Life Browse/Edit/Graph

**Goal scope:** exactly 12 canonical rows. **Dependencies:** F0,S1. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q3.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| L-01 | Life System header/modes | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX | 12-life-browse | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-02 | Browse populated | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX | 12-life-browse | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-03 | Browse empty/fallback/paging | STATE | TYPE,SPACING,STATE,SURFACE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX | 12-life-browse [empty/paging fixture as needed] | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-04 | Pinned populated | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX | 14-life-pinned | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-05 | Pinned empty/unavailable | STATE | TYPE,SPACING,STATE,SURFACE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX | 14-life-pinned [empty fixture] | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-06 | Edit tree | CANVAS | TYPE,SPACING,BUTTON,FIELD,CANVAS,FOCUS,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX + MIN | 13-life-edit | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | local-scroll authority; semantic alternate; keyboard selection/DnD where editable; no document overflow | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-07 | Edit node inspector | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX + MIN | 13-life-edit | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| L-08 | Edit drag overlay/targets | POPUP | TYPE,SPACING,BUTTON,FIELD,POPUP,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 seeded Life tree; branch with documented/narrative/empty leaves; pinned + archived + edit states | MAX | 13-life-edit [drag capture only if deterministic] | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | trigger/expanded/controls; keyboard nav/Escape/outside close; focus return; no clipping | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| LG-01 | Read-only graph | CANVAS | TYPE,SPACING,BUTTON,FIELD,CANVAS,FOCUS,MOTION,SURFACE | Task50 seeded Life tree + explicit links; error fixture only for LG-04 | MAX + MIN | 15-life-graph | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | local-scroll authority; semantic alternate; keyboard selection/DnD where editable; no document overflow | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| LG-02 | Graph semantic inspector | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Life tree + explicit links; error fixture only for LG-04 | MAX + MIN | 15-life-graph | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| LG-03 | All explicit links | TABLE | TYPE,SPACING,BUTTON,FIELD,TABLE,STATE,SURFACE | Task50 seeded Life tree + explicit links; error fixture only for LG-04 | MAX + MIN | 15-life-graph | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | native table semantics; action names; local horizontal overflow; keyboard reachability | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| LG-04 | Graph unavailable | STATE | TYPE,SPACING,STATE,SURFACE | Task50 seeded Life tree + explicit links; error fixture only for LG-04 | MAX | 15-life-graph [error fixture] | LifeScreen tests; LifeEditWorkspace tests; LifeGraphWorkspace tests; lifeTreeLayout tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S8 — Reader + Basic Editor + Links

**Goal scope:** exactly 11 canonical rows. **Dependencies:** F0,S1,S7. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q3.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Reader shell | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 16-life-reader | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| R-02 | Empty leaf / choose document type | STATE | TYPE,SPACING,STATE,SURFACE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 16c-life-empty | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | No row-specific budget; inherit checkpoint performance gate |
| R-03 | Basic Leaf populated | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX + MIN | 16-life-reader | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| R-04 | Recoverable/conflict draft | STATE | TYPE,SPACING,STATE,SURFACE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 16-life-reader [draft fixture] | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | No row-specific budget; inherit checkpoint performance gate |
| R-05 | Unsupported/type-conflict/load error | STATE | TYPE,SPACING,STATE,SURFACE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 16-life-reader [error fixture] | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | No row-specific budget; inherit checkpoint performance gate |
| E-01 | Editor | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX + MIN | 17-basic-editor | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch BasicLeafEditor.js; build+budget at Q3 if editor import topology changes |
| E-02 | Add link | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX + MIN | 17b-basic-editor-link-dialog | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Watch BasicLeafEditor.js; build+budget at Q3 if editor import topology changes |
| E-03 | Dirty exit | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 17-basic-editor [dirty-exit capture if deterministic] | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Watch BasicLeafEditor.js; build+budget at Q3 if editor import topology changes |
| LL-01 | Outgoing/backlinks | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 16-life-reader | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| LL-02 | Add Life link | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX + MIN | 16b-life-link-dialog | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | No row-specific budget; inherit checkpoint performance gate |
| RT-01 | Active/completed | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 documented Life leaf fixture; empty/draft/error variants only where row requires | MAX | 12-life-browse / 16-life-reader | BasicLeafReader tests; BasicLeafEditor tests; LifeLinksPanel tests; RelatedTasksPanel tests; shared document/outline renderer tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S9 — Portable/Branch/Tree interchange

**Goal scope:** exactly 6 canonical rows. **Dependencies:** F0,S1,S7,S8. **Reasoning:** MEDIUM. **Checkpoint:** Q3.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| PK-01 | Package import/export controls | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Product-generated export→preview import fixture; cancel before mutation for visual capture | MAX | 16-life-reader | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| PK-02 | Package import preview | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Product-generated export→preview import fixture; cancel before mutation for visual capture | MAX + MIN | 16e-portable-import | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | No row-specific budget; inherit checkpoint performance gate |
| BR-01 | Branch controls | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Product-generated export→preview import fixture; cancel before mutation for visual capture | MAX | 13-life-edit | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| BR-02 | Branch import preview | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Product-generated export→preview import fixture; cancel before mutation for visual capture | MAX + MIN | 13c-life-branch-import | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | No row-specific budget; inherit checkpoint performance gate |
| TR-01 | Tree controls | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Product-generated export→preview import fixture; cancel before mutation for visual capture | MAX | 13-life-edit | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| TR-02 | Tree import preview | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Product-generated export→preview import fixture; cancel before mutation for visual capture | MAX + MIN | 13b-life-tree-import | PortablePackageControls/ImportDialog tests; LifeBranchControls/ImportDialog tests; LifeTreeControls tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | No row-specific budget; inherit checkpoint performance gate |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S10 — Narrative Reader + Markdown

**Goal scope:** exactly 11 canonical rows. **Dependencies:** F0,S1,S8. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q4.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| N-01 | Template chooser | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 16c-life-empty | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-02 | Canvas Reader | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-03 | Rich text reader block | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-04 | Metric reader block | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-05 | Image reader block | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-06 | Callout reader block | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-07 | Timeline reader block | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | No row-specific budget; inherit checkpoint performance gate |
| N-08 | Unknown/missing/unsupported | STATE | TYPE,SPACING,STATE,SURFACE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader [unsupported fixture] | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | No row-specific budget; inherit checkpoint performance gate |
| N-09 | Recoverable/conflict draft | STATE | TYPE,SPACING,STATE,SURFACE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader [draft fixture] | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | live/alert semantics appropriate; readable recovery action; no color-only meaning | No row-specific budget; inherit checkpoint performance gate |
| MD-01 | Markdown import preview | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 16d-markdown-import | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Watch markdown.js; build+budget if Markdown import topology changes |
| MD-02 | Markdown export | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX | 18-narrative-reader | NarrativeCanvasReader tests; NarrativeTemplateChooser tests; NarrativeMarkdownImport/Export tests; NarrativeVisualWorld tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Watch markdown.js; build+budget if Markdown import topology changes |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S11 — Narrative Studio

**Goal scope:** exactly 10 canonical rows. **Dependencies:** F0,S1,S10. **Reasoning:** HIGH → MEDIUM. **Checkpoint:** Q4.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| NS-01 | Studio shell | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-02 | Visual World selector | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19c-paper,19d-sakura,19e-aurora,19f-nocturne | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-03 | Scenes | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-04 | Rich text editor | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-05 | Callout editor | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-06 | Metric editor | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-07 | Image editor | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-08 | Timeline editor | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-09 | Add block bar | EDITOR | TYPE,SPACING,BUTTON,FIELD,EDITOR,FOCUS,STATE,MOTION,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19-narrative-studio | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | toolbar names/states; editable focus isolation; global shortcuts suppressed; dirty/save/error focus | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |
| NS-10 | Editor decisions | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,SURFACE,TABS/SELECTION | Task50 seeded Narrative Canvas; all five block kinds + four real Visual Worlds + draft/unsupported variants | MAX + MIN | 19b-narrative-only-block-dialog,19g-narrative-dirty-exit | NarrativeCanvasStudio tests; schema/history/block-editor tests; DecisionDialog integration | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Watch NarrativeCanvasStudio.js + narrative perf; build+budget + hardening:narrative-performance at Q4 |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

### S12 — Settings

**Goal scope:** exactly 8 canonical rows. **Dependencies:** F0,S1. **Reasoning:** MEDIUM. **Checkpoint:** Q5.

| ID | Surface | Class | Primitive deps | Canonical fixture/state | VP | Visual evidence | Focused test family | A11y / interaction | Perf/bundle |
|---|---|---|---|---|---|---|---|---|---|
| S-01 | Settings document | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX + MIN | 18-settings | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-02 | Category Goals | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX | 18-settings | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-03 | Tags active/archived/merged | TABLE | TYPE,SPACING,BUTTON,FIELD,TABLE,STATE,SURFACE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX + MIN | 18-settings | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | native table semantics; action names; local horizontal overflow; keyboard reachability | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-04 | Tag merge | INTERACTION | TYPE,SPACING,BUTTON,FIELD,FOCUS,SURFACE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX | 18-settings [merge state] | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-05 | Backup inventory | TABLE | TYPE,SPACING,BUTTON,FIELD,TABLE,STATE,SURFACE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX + MIN | 18-settings | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | native table semantics; action names; local horizontal overflow; keyboard reachability | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-06 | Restore backup confirmation | MODAL | TYPE,SPACING,BUTTON,FIELD,DIALOG,FOCUS,STATE,SURFACE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX + MIN | 18-settings [restore-modal candidate] | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | dialog semantics; initial focus; Tab trap; Escape/backdrop rule; deterministic focus return; axe/focused test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-07 | Keyboard | COMPOSITION | TYPE,SPACING,SURFACE,BUTTON,STATE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX | 18-settings,22-keyboard-help | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | heading/order; keyboard reachability; visible focus; state not color-only; targeted axe/semantic test | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |
| S-08 | Foundation Records | TABLE | TYPE,SPACING,BUTTON,FIELD,TABLE,STATE,SURFACE | Task50 Settings fixture with categories/tags/backups/foundation records; targeted modal fixture where required | MAX | 18-settings | CategoryGoals tests; TagSettings.test.tsx; BackupSettings.test.tsx; FoundationScreen tests; App Settings tests | native table semantics; action names; local horizontal overflow; keyboard reachability | Startup index.js risk if eager TS/TSX/imports change; CSS-only edits do not trigger per-row JS budget run |

**Stage-local stop:** all assigned rows are `LOCAL_VERIFIED`; focused failures are resolved; out-of-scope discoveries are logged, not implemented; checkpoint work belonging to later rows is not pulled forward.

## 9. Grouped native/visual checkpoints

The native Windows runner builds the Tauri debug binary once per invocation and can then run several selected phases. Therefore expensive native evidence is batched by domain instead of invoked after every row or every CSS edit.

| Checkpoint | Rows promoted | Native behavior phases | Visual audit profile | Extra gate |
|---|---|---|---|---|
| Q1 | S1–S4: shell, Today, task compose, planning/saved views | `phase6-planning`, `phase9-deadline-saved-views`, `phase14-actual-time`, `phase16-keyboard-shortcuts` | `shell-task` | Full frontend unit sentinel + build/perf if JS/import topology changed since F0 |
| Q2 | S5–S6: Calendar, Analytics, Focus Plans | `phase8-focus-plans`, `phase17-planned-vs-actual-analytics`, `phase20-focus-plan-analytics` | `calendar-analytics-plans` | Full frontend unit sentinel; production build + JS budget |
| Q3 | S7–S9: Life, Graph, Reader/Editor/Links, interchange | `phase4-portable-roundtrip`, `phase11-life-links`, `phase13-life-branch-interchange`, `phase15-life-graph`, `phase18-life-tree-interchange` | `life-reader-interchange` | Full frontend unit sentinel; production build + JS budget |
| Q4 | S10–S11: Narrative Reader/Markdown/Studio | No broad persistence phase is required solely for visuals; use focused Narrative tests + native visual profile. Re-run portable roundtrip only if package UI/contract wiring changed. | `narrative` | `pnpm hardening:narrative-performance`; production build + JS budget |
| Q5 | S12 plus implementation-wide pre-final sanity | `phase7-unified-tags`, `phase19-managed-backup-versions`; include `phase2-backup-restore` only if restore interaction wiring changed | `settings` | `pnpm verify`; `pnpm typecheck`; full frontend unit suite; production build + JS budget |

A checkpoint failure may reopen only rows causally implicated by the failure. It does not reset every prior row in the checkpoint.

## 10. Smart visual-baseline transition during an intentional redesign

Existing light PNGs are regression baselines for the pre-redesign UI. Intentional redesign therefore makes many old pixel comparisons fail by design.
Never solve this by disabling visual regression globally, loosening thresholds, hiding scrollbars, or blindly auto-accepting all images.
Use a **staged lock**:
1. Before replacing a row's baseline, capture the new actual and preserve the old diff as evidence of an intentional redesign.
2. Inspect the new frame at original resolution against Phase 6 composition, capability source, geometry audit and the approved visual language.
3. Enumerate the exact targeted tags. Baselines outside the stage are immutable.
4. Replace only those reviewed stage tags using the repository's explicit missing-baseline workflow; record old/new paths and git diff.
5. Immediately rerun comparison with acceptance disabled and require zero mismatch for the newly locked tags.
6. From that point onward, later stages treat those new tags as immutable regression locks unless a proven shared-primitive dependency requires a documented update.

### 10.1 New light goldens worth promoting

Do **not** make all ~53 audit captures permanent goldens. Promote only high-signal states whose regression would otherwise hide inside a parent screenshot:

- Today selected split (`01b-today-selected`).
- Task inspector Note / Details / Time / Links facets (`01c-*`) if the stage-selectable harness proves them deterministic.
- Recurring task expanded dialog (`03-task-recurring`).
- Selected Focus Plan detail (`11b-plans-selected`).
- Restore-backup confirmation only if a deterministic fixture can open it without destructive completion.

All other capture-only states remain geometry/diagnostic evidence unless a later risk justifies promotion.

## 11. Viewport policy

- **MAX** is the normal implementation viewport.
- **MIN** is required only for width-sensitive rows listed as `MAX + MIN` in the ledger.
- Do not run the full min-width matrix after every stage. Run only the stage profile at min width when its rows are width-sensitive.
- Final verification runs the complete required Light matrix at canonical maximized and governed minimum viewport.
- Dark is not a redesign target. Reduced Motion and forced-colors are accessibility regressions, not aesthetic iteration surfaces.

## 12. Performance migration policy

The existing JS budget is tight, particularly aggregate gzip headroom. Phase 7 therefore adopts **reclaim-before-spend**.
Per-row performance runs are wasteful. Trigger a build+budget immediately only when production `.ts/.tsx` import topology, lazy boundaries, icon extraction, dependencies or large runtime code changes; CSS-only tuning normally waits for its checkpoint.
Always run production build + `hardening:performance` at F0, Q2, Q3, Q4 and Q5; Q1 runs it if bundle-sensitive code changed since F0.
Watch named chunks where relevant: FocusPlansScreen, TaskSavedViewsPanel, BasicLeafEditor, NarrativeCanvasStudio, markdown, and startup `index.js`.
No new heavy visual/runtime dependency is authorized merely to reproduce a visual effect that CSS/vanilla-extract/Motion already supports.

## 13. Stage mutation boundaries

For each implementation Goal, files fall into four sets:

**PRIMARY:** source/style/tests that directly implement assigned rows.
**SHARED-REQUIRED:** F0 primitive files strictly required by a proven stage defect; any shared change expands representative regression checks but does not expand product scope.
**EVIDENCE:** targeted tests, audit profile, stage ledger, screenshots/baseline PNGs and stage evidence files.
**FORBIDDEN:** Rust/domain/schema/migrations/generated IPC, unrelated feature families, `.github/workflows/`, workflow seal, or speculative new capabilities.

If a shared primitive defect is discovered after F0, the stage may fix the smallest primitive issue necessary and must record which already-VERIFIED rows could be affected. Only those representative rows are rechecked.

## 14. Row closure template

Every row record persisted by the implementation agent must contain:

```markdown
- ID: T-04
- Status: LOCAL_VERIFIED | VERIFIED | VERIFICATION_DEBT | BLOCKED_PRODUCT
- Source files changed: [...]
- Phase 6 design section resolved by title/source: [...]
- Capability preserved: [...]
- Focused tests: command + result
- Visual evidence: profile/tag/artifact path + result
- A11y/keyboard evidence: [...]
- Viewport evidence: MAX [and MIN if required]
- Performance evidence: not-triggered(reason) | command + result
- Known debt: none | exact nondiagnostic debt
- Last verified commit: <sha>
```

## 15. Stage hard STOP conditions

A stage Goal terminates when its exact row set is `LOCAL_VERIFIED`, its local gate passes, its ledger/checkpoint is persisted and the diff is scoped.
It must **not** start the next stage, revisit earlier verified rows for taste, broaden screenshot coverage, change backend contracts, or perform a second whole-stage aesthetic review.
If a product blocker requires authority outside stage scope, mark `BLOCKED_PRODUCT`, record exact evidence and STOP that path rather than inventing a solution.
Out-of-scope improvements are appended to `KNOWN_DEBT`; they do not prevent the current stage from closing unless they are a proven regression caused by the current stage.

## 16. Phase 7 completion predicate

Phase 7 planning is complete when:
- F0 engineering prerequisites are finite and ordered.
- all 109 rows belong to exactly one implementation stage;
- every row has primitive dependencies, fixture/state, viewport policy, visual evidence, focused tests, a11y contract, bundle policy and DoD class;
- grouped native/visual checkpoints are defined;
- old→new visual baseline transition is bounded and auditable;
- stage/row STOP rules prevent recursive perfection loops;
- Phase 8 can write one Master Execution Specification plus bounded stage Goal packets without asking Codex to infer missing screen behavior.

## 17. Source evidence used

- Frozen repo baseline `a1078c1f...` and Phase 6 source trace.
- Root `package.json`: verify/typecheck/test/build/performance/E2E entry points.
- `AI_CONSTITUTION.md`: risk-based closure, two nondiagnostic rerun limit, reopen rules, workflow seal.
- `AGENTS.md`: Codex builder must be explicitly assigned for calibrated tasks; command-level evidence required.
- `scripts/run_windows_e2e.ps1`: one native build per invocation, selectable E2E phases.
- `task50b-maximized-audit.e2e.ts`: deterministic whole-surface fixture, geometry audit, visual tags and tracked Light snapshots.
- `e2e-tests/visual-baselines/README.md`: explicit baseline acceptance, zero-diff rerun and no threshold/scrollbar cheating.
- Phase 6 design and canonical UI surface ledger.

---

**Phase 7 result:** the redesign search space is now finite: F0 + 12 implementation stages + 5 grouped checkpoints. The final whole-app adversarial review remains a separate one-time Phase 10 operation.