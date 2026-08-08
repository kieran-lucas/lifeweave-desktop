# ADR 0044 — Global layout system and UI surface completeness

## Status

Accepted and activated for Task 50 / Slice 040 from explicit Product Owner activation baseline
`2c4cb188937393103e12b1042779af5ea266acda`.

Task 50 is a **layout and evidence slice**, not a feature slice. Following the Task 40 precedent
recorded in `docs/STATUS.md`, it does not advance `latest_feature_task`, which stays at 49 with
checkpoint `7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`.

## Context

Forty-nine closed tasks each added a screen and, with it, a private answer to the question "how wide
is a page?". Measured at the activation baseline:

```text
Settings        min(900px, 100%) centred        App.css.ts        `destination`
Today           max-width 960, not centred      TodayScreen.css.ts
Analytics       max-width 960, not centred      AnalyticsScreen.css.ts
Calendar        min(1120px, 100%) centred       CalendarScreen.css.ts
Life (modes)    min(1040px, 100%) centred       LifeScreen.css.ts
Life Reader     min(760px, 100%) centred        LifeScreen.css.ts
Plans           max-width 1440 + own 28px pad   FocusPlansScreen.css.ts
Foundation      max-width 680 + own 32/16 pad   FoundationScreen.css.ts
Tag settings    max-width 600                   TagSettings.css.ts
```

Seven max-widths, three centring rules, and three page-local paddings layered on top of the one
shared viewport gutter. Every screen is locally defensible and the set is globally incoherent.

Two defects are structural rather than cosmetic:

1. **The Task create/edit dialog has no dialog surface.** `TodayScreen.tsx` renders a bare `<form>`
   directly inside a fixed full-screen backdrop with `place-items: center`. There is no width, no
   padding, no background, no scroll container and no grid; every field is an unstyled
   `<label>Text<input/></label>` in raw document flow.
2. **The Today timeline row grid is short one track.** `row` declares
   `minmax(0,1fr) 44px 44px` while the row renders four children whenever a Task carries actual
   time, so an unplanned implicit auto-width column appears.

A third defect was reproduced by measurement rather than inspection. Settings produces a
**15 px document-level horizontal scrollbar** at every tested viewport once the document gains a
vertical scrollbar, because the application root is sized `width: 100vw`. `100vw` is defined to
include the classic scrollbar gutter, so a vertical scrollbar converts directly into horizontal
overflow. Measured evidence is in `docs/audits/task-50-layout-baseline.md`.

## Research basis

There is no peer-reviewed result establishing one universal pixel-perfect desktop layout, and this
ADR does not claim one. The literature is used to constrain and review the decision:

- **Tuch et al. (2012)**, DOI `10.1016/j.ijhcs.2012.06.003` — perceived visual complexity and
  prototypicality drive very early aesthetic judgement. Read here as: prefer familiar desktop
  geometry and stop letting each feature invent its own spatial grammar. Not read as "leave the
  screen empty"; the target is low *structural* noise, not low information.
- **Bauerly & Liu (2006)**, DOI `10.1016/j.ijhcs.2006.01.002` — balance and symmetry are
  perceptible and a growing number of constructions can reduce appeal. Read here as: stable outer
  margins, few meaningful groups, no panel proliferation.
- **Ngo, Teo & Byrne (2003)**, DOI `10.1016/S0020-0255(02)00404-8` — used as a **review rubric**
  (balance, unity, proportion, regularity, rhythm, density, order), never as an optimisation score.
- **Palmer (1992)**, DOI `10.1016/0010-0285(92)90014-S` — common region groups elements. Used to
  justify real containment for dialogs, form sections and confirmations, and to forbid drawing a
  border around everything.
- **Lavie & Tractinsky (2004)**, DOI `10.1016/j.ijhcs.2003.09.002` — classical (orderly) aesthetics
  is a distinct dimension from expressive aesthetics. Task 50 optimises the classical layer only.
- **Lindgaard et al. (2006)**, DOI `10.1080/01449290500330448` — first impressions form in tens of
  milliseconds, so macro geometry must read before fine detail.
- **Tractinsky, Katz & Ikar (2000)**, DOI `10.1016/S0953-5438(00)00031-X` — rationale for treating
  visual coherence as worth engineering time. Not read as aesthetics automatically producing
  usability.
- **Microsoft Fluent 2 — Layout** (`https://fluent2.microsoft.design/layout`) — Windows-compatible
  spacing conventions and a 4 px base ramp. Its art direction is not adopted.
- **W3C WCAG 2.2, Understanding SC 1.4.10 Reflow**
  (`https://www.w3.org/WAI/WCAG22/Understanding/reflow.html`) — ordinary forms, settings, lists,
  dialogs, text and navigation must not create accidental two-dimensional scrolling.

## Decision

> **Lifeweave has exactly one geometry authority. Every top-level surface belongs to a finite page
> taxonomy, consumes one shared page frame, one responsive gutter and one 4 px-derived spacing
> ramp, and may not declare a page-local maximum width. Ordinary screens never scroll horizontally;
> a workspace that genuinely needs two-dimensional space owns that scroll locally. Modals and forms
> are real contained regions, not document flow inside a backdrop. Layout invariants are proven by
> real-browser measurement, and every decided user-facing capability has a visible path in its valid
> context.**

### 1. Page taxonomy

Every top-level surface declares exactly one type. No unclassified geometry may exist.

```text
STANDARD_PAGE           1152 px   Today · Analytics · Plans · Settings
WIDE_WORKSPACE          1440 px   Calendar · Life Browse · Life Edit · Life Graph · Life Pinned
READING_PAGE             768 px   Basic Leaf Reader · Narrative Reader
MODAL_SURFACE       520/720/960   Task dialog · Search · Shortcut help · Restore confirm · imports
LOCAL_SCROLL_WORKSPACE       n/a   Life graph canvas · Life Edit tree canvas · wide tables
```

These values are project decisions informed by the research above and by baseline measurement. They
are **not** presented as experimentally proven universal optima. What closure requires is one
authoritative value per variant, one documented reason, and no page-local replacement.

Reasoning for each: 1152 keeps a standard page near 12–14 words per line for prose while giving the
Analytics fact grid three comfortable columns; 1440 is the widest frame that still leaves a visible
gutter at 1920 with an expanded sidebar; 768 is a conventional single-column reading measure and
matches the existing Reader intent (760) without inventing a new number for every reading surface;
720 for the standard dialog is the narrowest width that fits three thirds-width schedule fields
without the labels wrapping.

### 2. Spacing

One 4 px-derived ramp — `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` — exposed as `--lw-space-1` … `-8`
with semantic aliases `--lw-space-control`, `-field`, `-group`, `-section`, `-page`. Hierarchy is
communicated by whitespace magnitude before separator lines. Non-ramp values require a documented
geometric reason.

### 3. Gutter and centring

One gutter authority, `clamp(24px, 3vw, 48px)`, applied by the main viewport. A capped frame is
centred within the viewport's content box, and the viewport reserves its scrollbar gutter so
centring does not shift by half a scrollbar when content grows.

### 4. Horizontal-overflow invariant

For ordinary screens, at every supported viewport and in both sidebar states:

```text
document.documentElement.scrollWidth <= clientWidth + 1
MainViewport.scrollWidth             <= clientWidth + 1
PageFrame.scrollWidth                <= clientWidth + 1
```

Concealment is prohibited: no global `overflow-x: hidden`, no negative-margin clipping, no
`translateX` compensation, no `scale()` to make content fit. The Life graph canvas, the Life Edit
tree canvas, and wide data tables may scroll horizontally **inside their own viewport** and must
not move the application viewport.

### 5. Real containment for modals and forms

A modal is backdrop → surface → heading → status → body → footer. The standard dialog surface is
`inline-size: min(720px, calc(100vw - 48px))`, `max-block-size: calc(100dvh - 48px)`,
`overflow-y: auto`, `min-inline-size: 0`. Form fields are label → control → help/error as one
vertical unit on a deterministic responsive grid; controls are `width: 100%; min-width: 0`. No two
visible sibling controls may share screen space.

### 6. Evidence

Layout is proven by real WebView measurement in native phase 21, not by jsdom. `axe` passing is not
a layout pass and a layout pass is not a screen-reader pass; each evidence class is recorded
separately.

### 7. Surface completeness

Every DECIDED, implemented, user-facing capability must have a visible path in its valid context.
Keyboard shortcuts supplement visible affordances and do not replace them; an invisible gesture is
not a surface. Surfacing must reuse existing IPC — anything requiring new Rust behaviour, a new
command, a schema change, a new route or a new persistent preference is recorded as
`BLOCKED_SURFACE` and left unimplemented. A backend command is not a feature: internal choreography
stays internal, and a second command for an already-visible capability never earns a second button.

## Consequences

- `frontend/src/app/layout/` becomes the single answer to "what controls a Lifeweave page's width?".
  A future agent opens one file, not thirty.
- Domain CSS keeps its domain-specific grids and loses its page-width, gutter, dialog-width, and
  page-level section-gap declarations.
- One census finding is fixed: Task edit, Task delete, and recurring-occurrence edit were reachable
  only by double-click or `Enter` on a row that advertised neither. A visible row Edit control is
  added, calling the handler those gestures already call. The gestures are retained.
- `set_life_node_icon` and `set_life_node_theme_variant` remain without a consumer. They are
  duplicate paths to fields the Life Edit inspector already edits through
  `update_life_node_summary`; adding buttons would create two controls for one capability.
- Schema stays 27. No migration, no Rust product change, no new IPC command, no new capability, no
  new dependency, no workflow or seal change.
- Task 49's performance ceilings stay binding and unchanged.

## Explicitly not decided here

Art direction remains unallocated and is deferred to a later Product Owner gate: palette, brand and
logo, font family, icon language, border-radius and shadow language, illustrations, Visual World
art, motion personality, and sound. Task 50 changes none of them. The application is expected to
still look plain after this slice; that is the intended outcome, because decorating a broken layout
was the failure mode this ADR exists to prevent.

Also not decided: manual actual-time entry, editing completed sessions, recurring actual time,
automatic Plan progress or scoring, prediction, review edit/delete/archive/search, Noteboard,
generic outline expansion, advanced Graph, custom export profiles, arbitrary multi-branch selection,
shortcut remapping, a command palette, configurable or scheduled backup, new Narrative templates,
and new Visual Worlds. None is surfaced by this slice.
