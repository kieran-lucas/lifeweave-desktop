# Task 51 — visual state matrix

The inventory the visual locks are proven over, and the visual regression inventory. Built by
extending the Task 50 UI surface census and the `task50b-maximized-audit` walk, then adding the
states that walk does not reach.

Legend for **Covered**:

```text
T50   the existing task50b maximized walk already reaches this state
NEW   Task 51 must add coverage; the existing walk does not reach it
```

Legend for **Priority**:

```text
LOCK   must exist in the full-screen prototype before VISUAL LOCK is requested
P1     must be reconstructed and captured before closure
P2     must be visually coherent and captured, lower composition risk
```

---

## 1. Global axes

Every surface below is additionally evaluated on these axes. They multiply the matrix rather than
extend it, so they are listed once.

| Axis | Values | Covered | Priority | Note |
|---|---|---|---|---|
| Theme | light · dark | NEW | LOCK (light + one dark state), P1 (all) | dark is composed, never inverted |
| Motion | normal · `prefers-reduced-motion: reduce` | NEW | LOCK (composition impact only), P1 (all) | reduced motion is a designed state |
| Contrast | normal · `forced-colors: active` | NEW | P1 | currently handled by a 20-line block in `global.css` |
| Sidebar | expanded · collapsed | T50 | P1 | collapsed currently converts 152 px of nav into 152 px of empty gutter |
| Inspector | absent · open · overlay | NEW | LOCK | does not exist today |
| Viewport | 1536 × 794 (canonical) · 1440 × 900 · 1280 × 720 · 960 × 640 | T50 (three) | LOCK | 960 × 640 is the `tauri.conf.json` minimum |
| DPI | 100% · 125% · 150% | NOT RUN | P2 | inherited debt; recorded honestly, not assumed |
| Language | English · Vietnamese | NEW | P1 | glyph coverage in both type families |

---

## 2. Today — the master surface

Today is the reference implementation of the design language, so every state here is LOCK or P1.

| # | State | Covered | Priority | Composition risk |
|---|---|---|---|---|
| 1.1 | Populated, no selection | T50 | LOCK | the default first impression |
| 1.2 | Selected task + inspector | NEW | LOCK | the reference's canonical three-panel state; no inspector exists today |
| 1.3 | Dense realistic data | T50 (partly) | LOCK | art must retreat; rows must stay scannable |
| 1.4 | Empty / quiet day | NEW | LOCK | the state where ambient art is most visible |
| 1.5 | Running timer | NEW | LOCK | a persistent strip outside the tabpanel — a standing horizontal band, the shape §5 warns about |
| 1.6 | Dark, selected task | NEW | LOCK | |
| 1.7 | Reduced motion composition | NEW | LOCK | only if it changes composition rather than only timing |
| 1.8 | Completed / evaluated rows | NEW | P1 | completed must stay readable, not greyed into illegibility |
| 1.9 | Row with every metadata facet at once | NEW | P1 | category + Life area + Focus Plan + deadline + recurrence + tags + timer |
| 1.10 | Long Vietnamese title, wrapping | NEW | P1 | §17 stress case |
| 1.11 | Assessment fan open | T50 (indirect) | P1 | a radial fan with its own keyboard model; ADR 0044 left it untouched |
| 1.12 | Undo-assessment notice | NEW | P2 | a transient live-region line above the timeline |
| 1.13 | Loading / error | NEW | P2 | must not become invisible in the new palette |

### Today workspace tabs

The five workspace views share one tab strip that currently renders **above** the page `h1`.

| # | State | Covered | Priority |
|---|---|---|---|
| 1.14 | Upcoming | T50 | P1 |
| 1.15 | Overdue | T50 | P1 |
| 1.16 | Deadlines | T50 | P1 |
| 1.17 | Saved Views — list | T50 | P1 |
| 1.18 | Saved View editor dialog | NEW | P1 |

### Task dialog

| # | State | Covered | Priority |
|---|---|---|---|
| 1.19 | Create — empty | T50 | P1 |
| 1.20 | Create — recurrence enabled | T50 | P1 |
| 1.21 | Edit — one-off | T50 | P1 |
| 1.22 | Edit — recurring occurrence with scope controls | NEW | P1 |
| 1.23 | Validation error state | NEW | P1 |
| 1.24 | Delete confirmation | NEW | P1 |

Task 50 rebuilt this dialog from a bare `<form>` into a real contained surface with a six-track
field grid, and proved no two visible sibling controls intersect in states 1.19, 1.20 and 1.22. That
proof must survive Task 51.

### Week strip

| # | State | Covered | Priority |
|---|---|---|---|
| 1.25 | Seven days, today marked, one selected | T50 | LOCK |

Currently seven large bordered boxes plus two bordered arrow buttons — a high-risk cardification
site sitting directly under the Today title.

---

## 3. Calendar

| # | State | Covered | Priority |
|---|---|---|---|
| 2.1 | Ordinary month | T50 | P1 |
| 2.2 | Selected day | NEW | P1 |
| 2.3 | Dense day — many tasks in one cell | NEW | P1 |
| 2.4 | Empty day / empty month | NEW | P2 |

`WIDE_WORKSPACE`, frame 1193 at the canonical viewport.

---

## 4. Analytics

| # | State | Covered | Priority |
|---|---|---|---|
| 3.1 | Ordinary data, week period | T50 | P1 |
| 3.2 | Period switching — month, year | NEW | P1 |
| 3.3 | Empty / no data | NEW | P1 |
| 3.4 | Planned vs actual section | NEW | P1 |
| 3.5 | Focus Plan activity section (lazy) | NEW | P1 |
| 3.6 | Category goals | T50 (indirect) | P2 |
| 3.7 | Plan table — local horizontal scroll | NEW | P2 |

The fact grid must keep stepping 3 → 2 → 1 columns without page scroll, which ADR 0044 fixed.

---

## 5. Focus Plans

| # | State | Covered | Priority |
|---|---|---|---|
| 4.1 | List / overview | T50 | P1 |
| 4.2 | Selected / open plan | NEW | P1 |
| 4.3 | Create and edit controls | NEW | P1 |
| 4.4 | Review / activity sections | NEW | P1 |
| 4.5 | Empty | NEW | P2 |

`FocusPlansScreen.css.ts` carries 11 border and 9 radius declarations — the highest cardification
density outside Narrative.

---

## 6. Life

| # | State | Covered | Priority | Composition risk |
|---|---|---|---|---|
| 5.1 | Browse — focal node + direct children | T50 | P1 | **card inside card with two shadows**, plus a filled segmented mode switch floated above it |
| 5.2 | Browse — leaf with no children | NEW | P2 | |
| 5.3 | Edit — tree canvas | T50 | P1 | `LOCAL_SCROLL_WORKSPACE`; Motion `layout` already in use |
| 5.4 | Edit — inspector open | NEW | P1 | the one existing inspector precedent in the product |
| 5.5 | Edit — drag in progress | NEW | P1 | dnd-kit; drag overlay is a legitimate elevation case |
| 5.6 | Pinned | T50 | P2 | |
| 5.7 | Graph — transient overlay | T50 | P1 | d3-hierarchy tidy tree + SVG edges; pastel node treatment |
| 5.8 | Graph — link table | NEW | P2 | `LOCAL_SCROLL_WORKSPACE` |
| 5.9 | Reader — Basic Leaf | T50 (attempted) | P1 | `READING_PAGE` 768; typography-first |
| 5.10 | Reader — document outline | NEW | P2 | container-query behaviour must survive |
| 5.11 | Basic editor — Tiptap | NEW | P1 | lazy; must not gain an active instance it does not need |
| 5.12 | Life links panel | NEW | P2 | modal |
| 5.13 | Branch / tree / portable import previews | NEW | P2 | three modal surfaces sharing one grammar |

Note on 5.9: the existing walk records `life-reader` with `utilization: null` — the leaf card was not
reachable in that pass. Task 51 must not inherit that gap.

---

## 7. Narrative

**Not reached at all by the existing walk.** Task 51 adds coverage.

| # | State | Covered | Priority |
|---|---|---|---|
| 6.1 | Narrative Reader | NEW | P1 |
| 6.2 | Narrative Studio | NEW | P1 |
| 6.3 | Template chooser | NEW | P2 |
| 6.4 | Markdown import dialog | NEW | P2 |
| 6.5 | Timeline block | NEW | P2 |
| 6.6 | Image block | NEW | P2 |
| 6.7 | Rich-text block | NEW | P2 |
| 6.8 | Visual World — Paper, light and dark | NEW | P1 |
| 6.9 | Visual World — Sakura, light and dark | NEW | P1 |
| 6.10 | Visual World — Aurora, light and dark | NEW | P1 |
| 6.11 | Visual World — Nocturne, light and dark | NEW | P1 |

### Visual Worlds are a special case and are not a defect

`visualWorlds.ts` declares **four worlds × two themes × fourteen colour roles = 112 values**, wholly
independent of the application palette. Unlike the 29 stray hex colours in `features/*`, this is an
approved product decision from Slice 018 with its own role vocabulary — `canvas`, `surface`,
`surfaceRaised`, `text`, `muted`, `heading`, `accent`, `accentSoft`, `border`, `rule`, `patternA`,
`patternB`, `patternOpacity`, `shadow`.

Task 51 therefore **harmonises rather than replaces** them: the world palettes keep their identity
and their role names, but adopt the Task 51 radius, elevation, hairline, type and motion
vocabularies so a Visual World reads as Lifeweave in a different key rather than as a different
application. Their per-world `shadow` — a single shared `0 2px 10px rgb(0 0 0 / 0.12)` — is the
first thing to reconcile with the three-level elevation scale.

---

## 8. Global surfaces

| # | State | Covered | Priority |
|---|---|---|---|
| 7.1 | Search dialog — empty | T50 | P1 |
| 7.2 | Search dialog — results across types | NEW | P1 |
| 7.3 | Search dialog — no results | NEW | P2 |
| 7.4 | Settings — top | T50 | P1 |
| 7.5 | Settings — category goals | T50 | P1 |
| 7.6 | Settings — tag settings, tables | T50 | P1 |
| 7.7 | Settings — backup and restore | T50 | P1 |
| 7.8 | Settings — keyboard section | NEW | P2 |
| 7.9 | Settings — foundation tools | T50 | P2 |
| 7.10 | Backup — restore confirmation (destructive) | NEW | P1 |
| 7.11 | Backup — version incompatibility warning | NEW | P2 |
| 7.12 | Keyboard shortcuts dialog | T50 | P1 |
| 7.13 | Tag picker / combobox open | NEW | P1 |
| 7.14 | Tag chip list, many tags | NEW | P2 |
| 7.15 | Route error boundary | NEW | P2 |
| 7.16 | IPC loading / core unavailable | NEW | P2 |

Settings is the §24.8 test: Task 51 is not complete if Today is beautiful and Settings still looks
like a different product.

---

## 9. Counts

```text
surfaces / states enumerated              78
already covered by the task50b walk       24
Task 51 must add                          54
LOCK states (before VISUAL LOCK)          10   (1.1–1.7, 1.25, plus light and dark axes)
P1 states                                 41
P2 states                                 27
global axes multiplying the matrix         8
Visual World palette values to harmonise 112
```

## 10. How this matrix is used

1. **Before VISUAL LOCK** — every LOCK state is built in the isolated prototype and captured at the
   four required viewports. Nothing else is claimed.
2. **During production** — each migration slice captures its P1 states and re-runs the geometry
   audit and the semantic-collision detector before the next slice begins, so one foundation change
   cannot silently break twenty screens.
3. **At closure** — every P1 and P2 state has an approved WebdriverIO visual golden carrying its
   Windows version, WebView2 version, DPR, inner viewport, theme, motion preference and fixture
   version. A golden is never silently overwritten on failure, tolerance is never widened to make
   the suite green, and masking covers only genuinely nondeterministic content such as clock text.
