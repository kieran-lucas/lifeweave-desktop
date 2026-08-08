# Task 50 — layout baseline

Baseline: `2c4cb188937393103e12b1042779af5ea266acda`, worktree clean, `HEAD == origin/main`.
Produced **before** any Task 50 product edit.

Baseline gates at this SHA: `pnpm verify` passed (source `9c422927…`, 165,171 bytes, 4,637 lines);
`pnpm typecheck` passed; `pnpm test` passed with **750 tests across 50 files**.

## 1. CSS layout-authority audit

Every file that currently owns page-level geometry. "Owns" means it declares a maximum width, a
centring rule, an outer padding, or a top-level overflow behaviour.

| File | Max width | Centring | Outer padding | Tracks / overflow |
|---|---|---|---|---|
| `app/App.css.ts` `appRoot` | — | — | — | `grid 220px \| 68px + minmax(0,1fr)`, `width:100vw`, `height:100vh`, `overflow:hidden` |
| `app/App.css.ts` `viewport` | — | — | `clamp(24px, 5vw, 64px)` | `overflow:auto`, `minWidth:0`, `minHeight:0` |
| `app/App.css.ts` `destination` | `min(900px,100%)` | `margin:0 auto` | `paddingBottom:64` | — |
| `app/App.css.ts` `dialogBackdrop` | — | `placeItems:center` | `24` | `position:fixed`, `inset:0` |
| `app/App.css.ts` `dialogCard` | `min(520px,100%)` | — | `24` | `maxHeight:80vh`, `overflow:auto` |
| `task/today/TodayScreen.css.ts` `root` | `maxWidth:960` | **none** | — | `flex column`, `gap:24` |
| `task/today/TodayScreen.css.ts` `group` | — | — | — | `minmax(92px,116px) minmax(0,1fr)` |
| `task/today/TodayScreen.css.ts` `row` | — | — | — | **`minmax(0,1fr) 44px 44px` for up to 4 children** |
| `task/today/TodayScreen.css.ts` `dialog` | — | `placeItems:center` | **none** | `position:fixed`, `inset:0`; **no surface class at all** |
| `task/planning/TaskPlanning.css.ts` `row` | — | — | — | `minmax(110px,140px) minmax(0,1fr) auto`, `@media 640` |
| `calendar/CalendarScreen.css.ts` `root` | `min(1120px,100%)` | `margin:0 auto` | `paddingBottom:64` | `containerType:inline-size` |
| `calendar/WeekStrip.css.ts` `day` | — | — | — | `minWidth:0` |
| `analytics/AnalyticsScreen.css.ts` `root` | `maxWidth:960` | **none** | — | `flex column`, `gap:32` |
| `analytics/AnalyticsScreen.css.ts` `facts` | — | — | — | fixed `repeat(3,minmax(0,1fr))`, no step-down |
| `analytics/AnalyticsScreen.css.ts` `planTableWrap` | — | — | — | `overflowX:auto` (already local) |
| `focus-plan/FocusPlansScreen.css.ts` `screen` | `maxWidth:1440` | `margin:0 auto` | **own `28px`** | — |
| `focus-plan/FocusPlansScreen.css.ts` `workspace` | — | — | — | `minmax(240px,320px) minmax(0,1fr)`, `@media 860` |
| `life/LifeScreen.css.ts` `screen` | `min(1040px,100%)` | `margin:0 auto` | `paddingBottom:72` | `containerType:inline-size` |
| `life/LifeScreen.css.ts` `reader` | `min(760px,100%)` | `margin:0 auto` | `paddingBottom:72` | — |
| `life/LifeScreen.css.ts` `children` | — | — | — | `repeat(4,minmax(170px,1fr))`, container steps 760/520 |
| `life/LifeEditWorkspace.css.ts` `canvasViewport` | — | — | — | `overflow:auto`, `minWidth:0` (already local) |
| `life/graph/LifeGraph.css.ts` `workspace` | — | — | — | `minmax(0,1fr) 300px`, container step 780 |
| `life/graph/LifeGraph.css.ts` `canvasViewport` | — | — | — | `overflow:auto`, `minWidth:0` (already local) |
| `life/document/BasicLeafDocument.css.ts` | — | — | — | `table{width:100%}`, container steps at 520 |
| `life/narrative/NarrativeCanvas.css.ts` | — | — | — | scene geometry |
| `tag/TagSettings.css.ts` `root` | `maxWidth:600` | none | — | `table{width:100%}` with no scroll owner |
| `backup/BackupSettings.css.ts` `panel` | — | — | `24` | `tableScroll{overflowX:auto}` (already local) |
| `backup/BackupSettings.css.ts` `dialog` | `min(520px,100%)` | via backdrop | `24` | **no `max-block-size`, no internal scroll** |
| `foundation/FoundationScreen.css.ts` `screen` | `maxWidth:680` | `margin:0 auto` | **own `32px 16px`** | — |
| `search/GlobalSearchDialog.css.ts` | own dialog geometry | — | — | — |
| `life/narrative/NarrativeMarkdownImportDialog.css.ts` | own dialog geometry | — | — | — |

### Duplicates and conflicts

1. **Seven page maximum widths**: 900, 960 (×2), 1040, 1120, 1440, 680, 600. No shared token.
2. **Three centring rules**: `margin:0 auto` (Settings, Calendar, Life, Plans, Foundation), no
   centring at all (Today, Analytics — they simply cap and hang left), and `place-items:center`
   (backdrops).
3. **Three page-local paddings** stacked on the shared `clamp(24px,5vw,64px)` viewport gutter:
   Plans `28px`, Foundation `32px 16px`, plus four different `padding-bottom` values (64, 64, 72,
   72).
4. **Four independent dialog geometries**: `App.css.ts dialogCard`, `BackupSettings dialog`,
   `GlobalSearchDialog`, `NarrativeMarkdownImportDialog` — and the Task dialog, which has none.
5. **Three tables with no scroll owner** (`TagSettings`) versus three that already own one
   (`BackupSettings`, `AnalyticsScreen`, `LifeGraph`).

## 2. Measured baseline geometry

Captured through the real Tauri WebView with `e2e-tests/specs/task50-layout-capture.e2e.ts`, which
reports rather than asserts so the same spec can run against the baseline and the finished layout.
Requested sizes are outer window sizes; the measured inner viewport is recorded because the
requested size is not evidence.

Artifacts: `target/e2e-artifacts/task-50/baseline/` — one PNG per screen × viewport × sidebar state,
plus `geometry.json`. Not committed, per repository artifact policy.

The capture seeds a populated fixture through raw IPC before measuring — six Tasks across all three
periods, a recurring series, a completed actual-time session, an active Focus Plan with two
variants, three phases and a review, a Life branch with six children and a committed document,
four tags including one archived, category goals, and a Saved View. §37 is explicit that a layout
which only works while empty is not complete, so empty and populated states are both recorded, and
the §38 long-string stress cases are part of the fixture.

Seed result: `ok=true stage=done tasks=6`.

### 2.1 The Settings horizontal scrollbar — reproduced and located

The defect reproduces at **every** tested viewport, in both sidebar states, and the capture's
overflow-source scan named the element rather than leaving it to inference:

| Viewport | Screen | inner width | root h-overflow | Named source |
|---|---|---|---|---|
| 1280×720 | Settings (top) | 1280 | 0 | — |
| 1280×720 | Settings (scrolled) | **1265** | **+15** | `div._1isl6zm0` right=1280 vs 1265 |
| 1440×900 | Settings (scrolled) | **1521** | **+15** | `div._1isl6zm0` right=1536 vs 1521 |
| 1920×1080 | Settings (scrolled) | **1905** | **+15** | `div._1isl6zm0` right=1920 vs 1905 |
| 1280×720 | Settings, collapsed sidebar | **1265** | **+15** | `div._1isl6zm0` right=1280 vs 1265 |

`div._1isl6zm0` is `appRoot`, and the scan additionally recorded its resolved box:
`appRoot computed width=1280px` against a document `clientWidth` of 1265. The overhang is exactly
the classic scrollbar width, and the inner width drops by exactly that amount at the moment it
appears.

**Cause:** `appRoot` is sized `width: 100vw` and `height: 100vh` (`app/App.css.ts:3`). Viewport
units are defined to include the classic scrollbar gutter, so the two axes feed each other: a
vertical scrollbar shrinks `clientWidth` below `100vw`, the resulting horizontal scrollbar shrinks
`clientHeight` below `100vh`, and the pair settles at 15 px of overflow on both axes. The scan
confirms both halves — it reported `html`, `body` and `div#root` at `bottom=720` against a
`clientHeight` of 705 alongside the width overhang.

This is exactly why §10's prohibition matters here. `overflow-x: hidden` would have concealed a real
15 px overhang while leaving the application root genuinely oversized. The fix is to stop sizing the
root in viewport units.

One residual figure is recorded without a full attribution: `documentElement.scrollHeight -
clientHeight` on Settings measured 791 px at 1280×720, 720 px at 1440×900 and 433 px at 1920×1080 —
far more than the 15 px the viewport-unit loop explains, even though every element the scan could
see outside `main` overhung by only 15 px. It is re-measured after the fix in
`docs/audits/task-50-layout-final.md` rather than explained by assumption here.

### 2.2 Frame width disagreement

At the same measured inner width, the width actually occupied by each destination's content root:

```text
inner 1280 (1280×720, expanded)      inner 1920 (1920×1080, expanded)
Settings             900.0           Settings             900.0
Today                916.8           Today               1556.8
Analytics            916.8           Analytics           1556.8
Plans                916.8           Plans               1572.0
Calendar             916.8           Calendar            1572.0
Life Browse         1068.8           Life Browse         1724.0
Life Edit           1068.8           Life Edit           1708.8
Life Graph          1068.8           Life Graph          1724.0
Life Pinned         1084.0           Life Pinned         1724.0
```

Settings is capped at 900 at every viewport and is the outlier by up to 672 px. At 1920 the four
nominally "standard" pages occupy three different widths.

### 2.3 Centring drift

Almost every surface shows a constant **15.2 px** left/right imbalance — free space `0` on the left
and `15.2` on the right. The magnitude is again the scrollbar: the main viewport declares
`overflow: auto` without reserving its scrollbar gutter, so its content box narrows asymmetrically
the moment content grows, and anything centred inside it shifts left by half a scrollbar. Nothing in
the CSS is asymmetric; the asymmetry is entirely the unreserved gutter.

The rows that read `0` imbalance are the ones where the measured element happened to be full-width,
not the ones that are correctly centred.

### 2.4 Measured inner width is not the requested width

At a requested outer size of 1440×900 the measured inner viewport was 1440 for the first
destinations and **1536** from Life Browse onward, while 1280 and 1920 stayed stable. Requested
window size is therefore not usable as evidence, and cross-page comparisons must be made against
the *measured* inner width. Native phase 21 reads the live `clientWidth` at every assertion and
asserts that compared pages share the same inner width, rather than trusting the requested size.

### 2.5 Control collisions

The collision sweep found overlapping visible control rectangles on:

```text
Life Edit      10 pairs at every viewport
Life Browse     1 pair at every viewport
Life Pinned     1 pair at every viewport
```

Life Edit's ten pairs are the absolutely positioned tree node cards inside the tree canvas, and the
single pairs in Browse and Pinned are the semantic pin badge over its card. Both are legitimate
positioned geometry under §25 and are treated as intentional exceptions rather than defects; the
Task 50 collision *assertion* is scoped to dialog form controls, where overlap is never legitimate.

### 2.6 What the baseline does **not** show

No page produced a **main viewport** horizontal overflow at any tested viewport
(`viewportOverflow = 0` everywhere). The overflow is at the document root only, which is consistent
with the viewport-unit mechanism above rather than with any oversized content.

The Task dialog reported zero control collisions. That is expected and is not a clean bill of
health: the fields do not overlap because they are stacked in raw document flow. What the baseline
capture cannot show is containment, and the dialog has none — no surface, no width, no
`max-block-size`, no internal scroll. Containment is asserted in native phase 21, not here.

## 3. Horizontal-overflow sources, by measurement

| Source | Where | Evidence | Fix |
|---|---|---|---|
| `width: 100vw` / `height: 100vh` on the application root | `app/App.css.ts:3` | Scan named `div._1isl6zm0` at `right=1280 vs 1265`, `appRoot computed width=1280px` | Size the root in percentage terms; do not conceal |
| Unreserved main-viewport scrollbar gutter | `app/App.css.ts:14` | Constant 15.2 px centring imbalance on every capped surface | Reserve the gutter so the content box is stable |
| `TagSettings` table with no scroll owner | `tag/TagSettings.css.ts` | Only table in Settings without a scroll region; the sibling backup table already has one | Reflow, or give the table its own scroll region |

`main._1isl6zm9` — the viewport — was also reported wider than the root, which is a consequence of
being a grid child of the oversized root rather than an independent source. No other element
measured wider than the document root at any tested viewport.

## 4. Page-type assignment before the slice

Every top-level surface, with the type it will declare and the authority it currently uses:

| Surface | Current authority | Declared type |
|---|---|---|
| Today | `maxWidth:960`, uncentred | `STANDARD_PAGE` |
| Analytics | `maxWidth:960`, uncentred | `STANDARD_PAGE` |
| Plans | `maxWidth:1440` + own padding | `STANDARD_PAGE` |
| Settings | `min(900px,100%)` | `STANDARD_PAGE` |
| Calendar | `min(1120px,100%)` | `WIDE_WORKSPACE` |
| Life Browse / Edit / Pinned / Graph | `min(1040px,100%)` | `WIDE_WORKSPACE` |
| Basic Leaf Reader / Narrative Reader | `min(760px,100%)` | `READING_PAGE` |
| Task dialog | **none** | `MODAL_SURFACE` |
| Search / Shortcut help / Restore confirm / import previews | four independent geometries | `MODAL_SURFACE` |
| Life graph canvas / Life Edit tree canvas / wide tables | already local `overflow:auto` | `LOCAL_SCROLL_WORKSPACE` |

Nothing is left unclassified.
