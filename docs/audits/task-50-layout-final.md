# Task 50 — Global Layout System + UI Surface Completeness (closure)

## 1. Commits

```text
baseline / activation baseline : 2c4cb188937393103e12b1042779af5ea266acda
activation                     : 5451fe784fa50cb3fff65cad2f12f8a448349c9b
product checkpoint             : b4d7d32046f3e3edbff6d734116d3c2bd645d676
closure                        : 944c929c21eb2302837948b3ac79488a0c4b2137
audit-record commit            : 7c7c7c4c9a685d1296ceb764af46761c936ac244
schema                         : 27 → 27, no migration
```

Product diff: **41 files, +2135 / −596**, entirely frontend, one governance script, the E2E runner
allow-list and `package.json`'s verify chain. Zero `src-tauri` files.

Task 50 is a **layout and evidence slice, not a feature slice**. Following the Task 40 precedent
recorded in `docs/STATUS.md`, `latest_feature_task` stays **49** at
`7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`.

## 2. Research sources used

Recorded in full in [ADR 0044](../adr/0044-global-layout-system-and-ui-surface-completeness.md) §
"Research basis". Seven peer-reviewed sources — Tuch et al. (2012); Bauerly & Liu (2006); Ngo, Teo
& Byrne (2003); Lavie & Tractinsky (2004); Palmer (1992); Lindgaard et al. (2006); Tractinsky, Katz
& Ikar (2000) — plus Microsoft Fluent 2 Layout and W3C WCAG 2.2 SC 1.4.10 Reflow.

They are used to **constrain and review** the decision. No claim is made that any pixel value here
is an experimentally proven universal optimum, and no single "beauty score" was produced.

## 3. Layout taxonomy

Every top-level surface declares exactly one type. Nothing is unclassified.

| Type | Frame | Surfaces |
|---|---|---|
| `STANDARD_PAGE` | 1152 px | Today, Analytics, Plans, Settings |
| `WIDE_WORKSPACE` | 1440 px | Calendar, Life Browse, Life Edit, Life Graph, Life Pinned |
| `READING_PAGE` | 768 px | Basic Leaf Reader, Narrative Reader / Studio |
| `MODAL_SURFACE` | 520 / 720 / 960 px | Task dialog, Search, Shortcut help, Restore confirm, Saved View editor, Life links, Branch / Tree / Portable / Narrative-Markdown import previews |
| `LOCAL_SCROLL_WORKSPACE` | — | Life graph canvas, Life Edit tree canvas, Settings tag tables, Backup table, Analytics plan table, Graph link table |

## 4. Final tokens

One file, `frontend/src/app/layout/tokens.css.ts`, declares all of them. A future agent answers
"what controls a Lifeweave page's main width?" by opening it.

```text
--lw-space-1..8       4 8 12 16 24 32 48 64
--lw-space-control    8     --lw-space-field   16    --lw-space-group    24
--lw-space-section    32    --lw-space-page    64
--lw-gutter           clamp(24px, 3vw, 48px)
--lw-frame-standard   1152px   --lw-frame-wide  1440px   --lw-frame-reading 768px
--lw-dialog-compact   520px    --lw-dialog-standard 720px   --lw-dialog-wide 960px
--lw-dialog-inset     48px
```

Reasons, as ADR 0044 records them: 1152 keeps prose near a comfortable measure while giving the
Analytics fact grid three unhurried columns; 1440 is the widest frame still leaving visible gutter
at 1920 with the sidebar expanded; 768 replaces the ad-hoc 760 the Reader used; 720 is the narrowest
dialog width at which the three thirds-width schedule fields hold their labels; 520 preserves the
width the existing confirmations already used.

### Dialog geometry

```text
inline-size     min(<variant>, calc(100vw - 48px))
max-block-size  calc(100dvh - 48px)
overflow-y      auto
min-inline-size 0
structure       backdrop → surface → header → status → body → footer
```

The footer scrolls with the surface rather than sticking. §39 requires a sticky footer to be proven
not to cover fields; scrolling the whole surface has no such failure mode and the footer stays
reachable because the surface is itself the scroll container.

### Form geometry

Six-track grid so a row is halves (3+3) or thirds (2+2+2) without a second grid. Below 560 px of
*container* width every semantic field takes the full row. Each field is label → control →
help/error as one vertical unit; controls are `width: 100%; min-width: 0`. Compact sub-control pairs
— the hour/minute wheel — keep one bounded local row, which §11.2 permits.

## 5. What replaced what

| Was | Where | Now |
|---|---|---|
| `min(900px,100%)` centred | `App.css.ts` `destination` | deleted; Settings uses `PageFrame standard` |
| `maxWidth: 960`, uncentred | `TodayScreen.css.ts` `root` | deleted; `PageFrame standard` |
| `maxWidth: 960`, uncentred | `AnalyticsScreen.css.ts` `root` | deleted; `PageFrame standard` |
| `min(1120px,100%)` centred | `CalendarScreen.css.ts` `root` | deleted; `PageFrame wide` |
| `min(1040px,100%)` centred | `LifeScreen.css.ts` `screen` | deleted; `PageFrame wide` |
| `min(760px,100%)` centred | `LifeScreen.css.ts` `reader` | deleted; `PageFrame reading` |
| `maxWidth: 1440` + own 28px pad | `FocusPlansScreen.css.ts` `screen` | deleted; `PageFrame standard` |
| `maxWidth: 680` + own 32/16 pad | `FoundationScreen.css.ts` `screen` | renamed `panel`, reading measure only |
| `maxWidth: 600` | `TagSettings.css.ts` `root` | deleted; content of the Settings page |
| four independent dialog geometries | App / Backup / Search / Narrative import | one modal grammar |
| Task dialog with **no** surface | `TodayScreen.tsx` | real contained `DialogSurface` |
| `clamp(24px, 5vw, 64px)` gutter | `App.css.ts` `viewport` | `var(--lw-gutter)` |

## 5a. Two defects the geometry gate found that inspection had missed

Phase 21 failed on its first two runs. Both failures were real, and neither was visible in the
source or in jsdom.

**Centring was nominally correct and visibly wrong.** `scrollbar-gutter: stable` reserves the gutter
on the inline-end edge only. The frame was correctly centred inside the resulting content box, but
the *visible* composition still sat 15.20 px heavier on one side at every viewport. Changed to
`scrollbar-gutter: stable both-edges`, which reserves symmetrically and makes the equilibrium real
rather than nominal. All three centring assertions then passed.

**The Settings document still scrolled vertically after the `100vw` fix.** The second run reported
`pages were measured at different inner widths: Today=1280, Analytics=1280, Plans=1280,
Settings=1265` — exactly one scrollbar of difference, at all three viewports.

Cause: the main viewport was not a *containing block*. An absolutely positioned descendant with no
positioned ancestor — every `srOnly` clipping span, and Settings contains several deep in its
content — resolves against the initial containing block, so it escapes the viewport's
`overflow: auto`, lands at its static offset hundreds of pixels down the document, and gives the
**document** a vertical scrollbar. That is also the unattributed 791 / 720 / 433 px of vertical
overflow recorded in the baseline audit §2.1, which is now explained and gone.

Fixed by giving the viewport `position: relative`. This was the second half of the Settings defect:
the document scrollbar shrank `clientWidth`, and the old `100vw` root turned that into horizontal
overflow. Removing `100vw` alone would have left a document that still scrolled vertically for no
reason.

## 6. P0 repairs

### 6.1 Task create/edit dialog

Before: a bare `<form>` directly inside a fixed backdrop with `place-items: center`. No width, no
padding, no background, no scroll container, no grid; every field an unstyled
`<label>Text<input/></label>` in raw document flow.

After: `DialogBackdrop → DialogSurface(as="form", width="standard") → DialogHeader → form grid →
DialogFooter`. Field arrangement follows §11.1 — Title and Description full row; Date, Start and End
as thirds inside a **Schedule** common region; Category/Priority and Life area/Focus Plan as halves;
Deadline, Tags, Recurring and Occurrence scope full row; footer `Delete · Cancel · Save`.

**No field was removed, renamed, semantically reordered, or had its validation changed.** The five
submit-time validations (start before end, interval 1–366, at least one weekday, count 1–1000,
until not before the task date) are byte-identical.

### 6.2 Settings global horizontal scrollbar

Cause, named by measurement rather than inference: `appRoot` was sized `width: 100vw` /
`height: 100vh`. Viewport units include the classic scrollbar gutter, so the two axes fed each
other and settled at 15 px of overflow on both. The baseline capture's overflow scan reported
`div._1isl6zm0 right=1280 vs 1265` and `appRoot computed width=1280px`.

Fixed at source: `html, body, #root` take `height: 100%`, and the shell takes
`inline-size: 100%; block-size: 100%`. No `overflow-x: hidden` was added anywhere — the governance
check `scripts/check_layout_authority.py` now fails the build if one appears.

The main viewport additionally takes `scrollbar-gutter: stable`, which removes the constant 15.2 px
centring imbalance the baseline measured on every capped surface.

### 6.3 Today period headings

Before: `{period.name}<span>{time}</span>` rendered as `Morning04:00–12:00`. After: two spaced
element children on a flex heading. A frontend test asserts the heading has exactly two element
children and no bare text node between them; the rendered spacing itself is proven in phase 21.

### 6.4 Today timeline row grid

Before: three declared tracks (`minmax(0,1fr) 44px 44px`) for up to four rendered children, so an
undeclared implicit auto column appeared whenever a Task carried actual time. After: two declared
tracks — content and one action region — with the action region a flex container that can hold the
priority mark, the new Edit control, the timer control and the assessment control without ever
growing a track.

## 7. Surface completeness

Full census: [`task-50-ui-surface-census.md`](task-50-ui-surface-census.md).

```text
DECIDED user-facing capabilities audited:      101
SURFACED:                                       41
CONTEXTUALLY_SURFACED:                          45
MISSING_USER_SURFACE found:                      3
MISSING_USER_SURFACE fixed:                      3
BLOCKED_SURFACE:                                 0
INTERNAL_CHOREOGRAPHY:                           6 rows covering 11 handlers
RECOVERY/SAFETY_INTERNAL:                        4
DUPLICATE_BACKEND_PATH_SAME_USER_CAPABILITY:     2
DEFERRED_OR_PROHIBITED (verified absent):        8 groups
backend handlers registered:                   117
handlers with a frontend consumer:             115
```

### Fixed

Task edit, Task delete, and recurring-occurrence edit were reachable only by double-click or `Enter`
on a `role="listitem"` row that advertised neither. One visible **Edit** control on the row action
track, calling the existing `begin(item, element)` handler, resolves all three. No new IPC, no new
semantics, no change to what the dialog does. Double-click and `Enter` are retained.

Evidence: `TodayScreen.test.tsx` → "offers a visible Edit control on the task row" (also asserts
Delete becomes reachable) and "keeps double-click and Enter working on the row"; phase 21 →
"contains an edit dialog opened from the visible row control".

### Blocked

None. No decided, implemented capability required new Rust behaviour, a new IPC command, a schema
change, a new route, or a new persistent preference in order to be surfaced.

### Internal choreography intentionally not surfaced

`health_check`; the two catalogue reads; `get_task_saved_view_editor_options`;
`save_life_navigation_preference`; the three staged-export byte reads; the three staging-ticket
discards. Each is already driven by a higher-level control.

`set_life_node_icon` and `set_life_node_theme_variant` remain without a consumer. Both edit fields
the Life Edit inspector already edits through `update_life_node_summary`; adding buttons would
create two controls for one capability, which §21 forbids.

## 8. Evidence

Each class recorded separately. `axe` passing is not a layout pass, and a layout pass is not a
screen-reader pass.

| Gate | Result |
|---|---|
| `pnpm verify` (incl. new layout-authority check) | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 766 tests, 51 files (baseline 750 / 50) |
| `pnpm build` | PASS |
| `pnpm hardening:performance` | PASS — `violations: []` against the **unchanged** Task 49 budget |
| `cargo fmt -- --check` | PASS |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | PASS — no warnings |
| `cargo test --locked -- --test-threads=1` | PASS — 790 passed, 0 failed, 4 ignored |
| `pnpm tauri build` | PASS — release installer, 5,429,291 bytes, sha256 `771d93dbdf89b80a401f33358ff70cf54f6aa195059f02cd6637d0db1e18154b` |
| `pnpm e2e:windows -- phase21-global-layout.e2e.ts` | PASS — 22 passing, 0 failing |
| `pnpm e2e:windows` (full matrix) | phases 1–16 PASS; stops at phase 17 on the pre-existing debt below |
| native, bounded segments | phase 17 standalone PASS; phases 18 / 18-restart / 19 / 20 / 21 PASS as one segment |
| `pnpm hardening:rc` | PASS — 2 schema reopen sessions, 25 s liveness each, same installer hash |
| `git diff --check` | PASS |

Rust gates were run in full even though the diff contains **no `src-tauri` file at all**. They
confirm the unchanged tree rather than discovering anything, and are recorded as such.

### Performance

Measured against Task 49's budget file, which is **unchanged**; no new budget generation was
created, because the slice fits inside the existing headroom.

```text
                Task 49      Task 50      maximum      headroom
index.js        524,831      528,709      535,000      6,291
total raw     1,236,207    1,240,508    1,245,479      4,971
gzip            379,517      380,537      383,613      3,076
chunks               24           24           24      —
```

Locked ceilings unchanged: `index.js ≤ 535,000`, `BasicLeafEditor.js ≤ 490,000`,
`markdown.js ≤ 129,000`.

### Frontend / jsdom

`frontend/src/app/layout/layout.test.tsx` — 9 DOM contracts on the primitives: page type declared
and hook emitted, three distinct frame classes, header identity/actions axis, section stack, the
backdrop → surface → header/body/footer structure with `role="dialog"` + `aria-modal="true"`
preserved, three distinct dialog widths, ref forwarding, three distinct field spans.

`frontend/src/features/task/today/TodayScreen.test.tsx` — 7 added contracts: exactly one page frame
of type `standard`; period heading separated into two element children; visible Edit control opens
the editor and reaches Delete; double-click and `Enter` still work; the dialog is a real contained
`form` surface with heading, Save and Cancel; every field still present; recurrence controls stay
inside the bounded surface.

Nothing in jsdom claims anything about geometry. jsdom reports every rectangle as zero.

### Source-structural governance

`scripts/check_layout_authority.py`, wired into `pnpm verify`. It fails on: a token declared outside
the authority; a spacing ramp that is not `4 8 12 16 24 32 48 64`; a non-geometry `--lw-` token
(art-direction freeze); a page root in domain CSS; viewport-unit sizing; `overflow-x: hidden`;
a negative margin over 1 px used as an offset; `translateX` used for alignment; a modal owner that
does not consume the shared surface; a page component without a declared type; a shell that has
lost the viewport hook or the reserved scrollbar gutter; and any change to the frozen palette,
font family or focus ring.

### Native phase 21

`e2e-tests/specs/phase21-global-layout.e2e.ts`, at 1280×720, 1440×900 and 1920×1080, in both
sidebar states, against a seeded populated fixture including the §38 long-string stress cases:

```text
horizontal stability   root, MainViewport and PageFrame on Today, Calendar, Analytics, Plans,
                       Settings — expanded and collapsed, and with Settings scrolled to the bottom,
                       which is the exact state that produced the baseline defect
centring               a capped frame is centred inside the main viewport content box within 2px
frame agreement        the four standard pages share one frame width at the same measured inner
                       width, and all four report data-page-type="standard"
dialog containment     Create task, Create recurring task, and Edit — inside the viewport, no
                       horizontal overflow, surface owns its scroll, submit reachable
no overlap             no two visible sibling controls in the dialog intersect, in all three states
local scroll           Life Edit tree canvas and Life graph canvas own overflow-x; the main
                       viewport stays horizontally stable while they do; the inspector stays visible
sidebar transition     collapsing and re-expanding leaves no stale frame geometry
```

Requested window size is never used as evidence. The baseline capture showed a requested 1440×900
producing a measured inner width of 1440 for some destinations and 1536 for others, so phase 21
reads the live `clientWidth` at every assertion and asserts compared pages share the same inner
width.

### Screenshots and the baseline → final measurement

```text
baseline : target/e2e-artifacts/task-50/baseline/  (PNG per screen × viewport × sidebar + geometry.json)
final    : target/e2e-artifacts/task-50/final/     (same matrix, same spec, unchanged)
```

Not committed, per repository artifact policy. Captured by
`e2e-tests/specs/task50-layout-capture.e2e.ts`, which reports rather than asserts so the same spec
runs unchanged against both the broken baseline and the finished layout. 54 comparable rows.

| Measure | Baseline | Final |
|---|---|---|
| rows with document horizontal overflow | 18 of 54, all at exactly +15 px | **0** |
| rows with main-viewport horizontal overflow | 0 | **0** |
| maximum capped-frame left/right imbalance | 15.2 px on 43 of 54 rows | **0.00 px** |
| rows whose content root is `[data-page-frame]` | 0 (no such element existed) | **54 of 54** |
| distinct standard-page frame widths at 1920 expanded | 3 (1556.8 / 1572 / 900) | **1 (1152)** |
| distinct wide-workspace widths at 1920 expanded | 2 (1708.8 / 1724) | **1 (1440)** |

The frames now converge exactly on the declared taxonomy: at 1920×1080 expanded, Today, Analytics
and Plans all measure 1152 and Calendar, Life Browse, Life Edit, Life Graph and Life Pinned all
measure 1440. At narrower viewports the frames are uncapped and simply fill the available width,
which is why 1280 expanded reads 952.8 for every standard page — the same number for all of them.

### §29 research-rubric review of the final matrix

Reviewed on balance/equilibrium, alignment/regularity, grouping/unity, proportion, rhythm/spacing,
density, prototypicality, and reflow/containment.

| Screen | Verdict | Evidence |
|---|---|---|
| Today (empty and populated) | PASS | One frame, separated period headings, declared row tracks, action controls on one axis |
| Create task / Create recurring task | PASS | Contained surface, three-column schedule region, zero control collisions at all viewports |
| Calendar | PASS | Wide frame at 1440, day cells regular, controls on the header axis |
| Analytics (empty and populated) | PASS | Period controls in one region, fact grid steps 3→2→1 by `auto-fit`, sections share one rhythm |
| Plans (list and detail) | PASS | Standard frame, shared split workspace, detail sections on the group rhythm |
| Life Browse / Pinned | PASS | Wide frame, `auto-fill` child grid so child count no longer drives page width |
| Life Edit | INTENTIONAL EXCEPTION | Tree-canvas node cards overlap by design; positioned canvas geometry under §25, and the canvas owns its scroll |
| Life Graph | PASS | Wide frame, canvas flexible, inspector a bounded rail, local scroll proven |
| Life Reader | PASS | Shared 768 reading frame; replaced the ad-hoc 760 |
| Settings (top, tags, backup, keyboard, foundation) | PASS | Standard frame, section rhythm, tables own their scroll, zero document overflow |
| Global Search | INTENTIONAL EXCEPTION | Top-anchored rather than centred — the prototypical desktop palette placement; width and bounds from the shared grammar |
| Shortcut help / Restore confirm / import previews | PASS | One modal grammar at compact or standard width |

The two exceptions are the only rows where the collision sweep still reports overlap: the Life Edit
tree canvas (10 / 9 / 8 pairs, decreasing as the tidy tree spreads at wider viewports) and the
single semantic pin badge over its card in Browse and Pinned. Both are absolutely positioned by
design, both were present in the baseline, and neither is a form control — the Task 50 collision
*assertion* is scoped to dialog controls, where overlap is never legitimate.

The application still looks plain. That is the intended outcome of a layout-only slice.

### Physical Windows DPI

```text
125% : NOT RUN
150% : NOT RUN
```

Not executed in this slice. Browser or window resizing is not physical DPI evidence and is not
claimed as such. This joins the existing Task 40 physical Narrator/DPI evidence debt.

## 9. Deliberate break

One load-bearing break, executed against the passing gate and reverted. §48 offers two forms; this
is the alternative form — a known overflowing fixed dialog width — chosen because it isolates the
proof to native phase 21. Undoing the `100vw` fix instead would also have failed
`scripts/check_layout_authority.py`, which would have proven the governance script rather than the
geometry test.

**Break.** `frontend/src/app/layout/layout.css.ts`, `dialogSurface.standard`:

```diff
- inlineSize: `min(${dialogWidth.standard}, calc(100vw - ${dialogInset}))`
+ inlineSize: "2400px"
```

**Result — meaningful FAIL of exactly the expected invariant**, in the dialog-containment assertion,
at every viewport where 2400 px cannot fit:

```text
Error: [data-dialog-surface] leaves the viewport: right 2424 > 1280
Error: [data-dialog-surface] leaves the viewport: right 2424 > 1440
Error: [data-dialog-surface] leaves the viewport: right 2424 > 1920
```

The failure is `assertWithinViewport`, not a crash, not a selector miss, and not a different
assertion — the test failed because the dialog genuinely left the viewport.

**Restore.** The declaration was returned byte-identically and phase 21 was re-run:
**22 passing, 0 failing.**

**Residue.** None. `git diff` against the product checkpoint contains no trace of the break.

## 10. Full-diff self-review

Reviewed `git diff 5451fe784fa50cb3fff65cad2f12f8a448349c9b..b4d7d32046f3e3edbff6d734116d3c2bd645d676`.

Mechanical counts over that diff, so the answers below are measured rather than asserted:

```text
src-tauri files touched                 0
migration files touched                 0
lockfiles / Cargo manifests touched     0
.github/ or seal files touched          0
`overflow-x: hidden` added              0
`100vw` / `100vh` sizing added          0
negative margins > 1px added            0
new dependency entries                  0
palette / font-family / radius / shadow lines changed in global.css   0
performance budget file touched         0
generated IPC bindings touched          0
`translateX` added                      2 — both inside the governance script that forbids it
```

1. **Ordinary page geometry governed by the taxonomy?** Yes — five page components render
   `PageFrame` with an explicit type; the governance check fails otherwise.
2. **Standard pages aligned/centred consistently?** Yes — phase 21 asserts one frame width across
   the four and 2 px centring.
3. **Task dialog structurally contained?** Yes — real surface, bounded on both axes, own scroll.
4. **Zero Task form overlaps at required viewports?** Yes — asserted in three dialog states at
   three viewports.
5. **Settings overflow removed at source?** Yes — viewport-unit sizing removed; no concealment, and
   concealment is now a governance failure.
6. **MainViewport horizontally stable?** Yes, including with Settings scrolled to the bottom.
7. **Graph/Edit scrolls local?** Yes — `assertLocalScrollOwnership` proves the region owns
   `overflow-x` and the page does not move.
8. **Any arbitrary page-local max-width added?** No — the governance check enumerates page roots.
9. **Any magic offset or negative-margin hack?** No — checked mechanically.
10. **Any art-direction leak?** No — palette, font family, focus ring asserted unchanged; the only
    `--lw-` tokens permitted are `space`, `gutter`, `frame`, `dialog`.
11. **Any locked product semantic changed?** No — Task rows stay non-card, Today stays task-first
    and default, sidebar order unchanged, Life auto-collapse unchanged.
12. **Any OPEN/DEFERRED feature implemented?** No.
13. **Every census `MISSING_USER_SURFACE` surfaced or blocked?** All three surfaced by one control;
    zero blocked.
14. **Internal choreography still internal?** Yes — no control added for any of the 11 handlers.
15. **Schema still 27?** Yes — no migration, no `src-tauri` change of any kind.
16. **Rust IPC / capabilities unchanged?** Yes — the diff contains no `src-tauri` file.
17. **New dependency?** No — `pnpm-lock.yaml` and both manifests' dependency blocks are untouched.
18. **Task 49 hard ceilings unchanged?** Yes — the budget file is not modified and passes.
19. **Task 51 untouched?** Yes.

## 11. Hard exclusions verified absent

No schema 28, migration, Rust product change, IPC command, Tauri capability, dependency, workflow or
seal change. No palette, brand, logo, font family, icon language, radius, shadow, illustration,
Visual World, motion or sound change. No manual actual-time entry, completed-session editing,
recurring actual time, automatic Plan progress, Plan score or health, prediction, review
edit/delete/archive/search, generic outline expansion, Noteboard, advanced Graph, custom export
profiles, arbitrary multi-branch selection, shortcut remapping, command palette, configurable or
scheduled or cloud backup, new Narrative templates, or new Visual Worlds.

## 12. Residual verification debt

### Carried forward unchanged: the Phase 14 / Phase 17 fixture collision

The full matrix reaches phase 17 and stops there, with a failure **byte-identical** to the one
Task 49 disclosed:

```text
phase17-planned-vs-actual-analytics.e2e.ts:59
  await expect(factValue(actual, "Tracked Tasks")).toHaveText("1")
  Expected: "1"   Received: "2"
```

Same file, same line, same assertion, same values. Phase 14 (Task 43) tracks a one-off Task and
completes a real session; phase 17 (Task 46) then asserts the *global* `Tracked Tasks` fact equals
1. Both fall in the same Analytics week, so 2 is the truthful answer.

This is not a Task 50 regression and not a product defect. Task 50 creates no Task and no
actual-time session, and touches neither the `Recorded actual time` section nor the code producing
that number. §50 of the Task 50 contract is explicit that this debt **must remain disclosed** and
must not be weakened to make the aggregate runner green without separate Product Owner
authorization. It was therefore left untouched.

Green evidence exists for every phase, in the same bounded-segment shape Task 49 used:

```text
phases 1–16                              pass in the full matrix run
phase 17                                 passes standalone (fresh profile)
phases 18, 18-restart, 19, 20, 21        pass as one segment
phase 21                                 passes standalone and as the tail of that segment
```

### Physical Windows DPI

125% and 150% scaling: **NOT RUN**. Window resizing through WebDriver is not physical DPI evidence
and is not claimed as such. This joins the existing Task 40 physical Narrator/DPI evidence debt.

### One observed frontend flake — since diagnosed and fixed

During one full-suite run, two Focus Plan tests in `TodayScreen.test.tsx` failed while that file
took 41 s against its usual 19 s. They passed in isolation and in three subsequent full-suite runs,
and no assertion in either test touches layout, so it was recorded here as load-related flakiness
rather than silently dropped.

**Resolved in the maximized-window remediation** (see `docs/STATUS.md`). The cause was not Testing
Library losing a race: it was vitest's default **5 s per-test budget** being exceeded under
full-suite thread contention, which killed the test with a bare timeout and no element detail.
`testTimeout`/`hookTimeout` are raised and the Testing Library async window is set below them, so a
genuine miss reports "unable to find" again. Two consecutive clean full-suite runs followed. No
assertion was weakened.

### Not machine-assertable

Reduced-motion and forced-colors contracts remain unassertable in jsdom, as recorded from Task 40.
Task 50 changed neither.
