# Lifeweave Desktop — Phase 3 Visual Evidence & Convergence Audit

**Repository:** `kieran-lucas/lifeweave-desktop`  
**Audited branch:** `main`  
**Frozen commit:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Commit message:** `Merge pull request #6 from kieran-lucas/task-51-visual-experience`  
**Audit date:** 2026-08-10 (Asia/Bangkok)  
**Phase:** 3 — Visual Evidence Audit  
**Previous artifact:** `LIFEWEAVE_PHASE_1_2_REPO_ARCHITECTURE_TRACE.md`

---

## 0. Executive verdict

Lifeweave has moved well beyond the stage of a functionally correct application wearing a thin theme. The current repository has a serious visual architecture: one page-width authority, a typed visual contract, a deliberate typography system, a semantic control layer, motion rules, icon governance, visual-regression infrastructure, real Windows/WebView2 capture evidence, forced-colors coverage, Vietnamese typography evidence, and a clear continuous-surface art direction.

The central Phase 3 finding is therefore **not** “the app needs a redesign from scratch.” It is more specific:

> **The foundation is substantially more mature than the last-mile feature convergence.**

The app has strong global laws, but several feature families can still define their own local typography, control geometry, focus treatment, field recipe, enclosure grammar, and micro-spacing. That leaves enough degrees of freedom for screens to feel like separately refined modules rather than one finished product even when every color/radius/shadow token is technically compliant.

The second major finding is equally important:

> **The visual evidence harness is strong, but evidence breadth is not the same as completion.**

The repository contains 53 current production light-theme screenshots from one real maximized Windows/Tauri/WebView2 walk, while the broader visual-regression set contains 105 exact-zero goldens across light, dark, minimum-size, forced-colors, and Vietnamese axes. Geometry is extremely clean at the established states. However, the repository's own Craft coverage ledger deliberately marks most surface families `PARTIAL`, not `VERIFIED`; missing proof clusters around empty/loading/error/validation states, dense data, narrow interactions, keyboard traversal, forced colors on nested UI, recovery/conflict paths, and manual Narrator/physical-DPI verification.

### Phase 3 scorecard — evidence-backed, not aesthetic guesswork

| Axis | Assessment | Confidence | Why |
|---|---:|---|---|
| Global geometry integrity | **9.5 / 10** | High | 53-state canonical walk: zero collision, zero document overflow, zero viewport overflow; hardened multi-viewport release assertions also exist. |
| Page-width / scroll authority | **9.3 / 10** | High | Finite `standard / wide / reading` taxonomy, shared `PageFrame`, local scroll ownership, enforcement script. |
| Visual token authority | **9.0 / 10** | High | Production residue ratchet is zero for raw color, radius, elevation and motion literals. |
| Typography architecture | **9.0 / 10 foundation** | High | Explicit optical-size families and semantic roles are excellent. |
| Typography convergence in features | **6.2 / 10** | High | Multiple feature CSS files still choose raw `fontSize` values despite the authority stating “a surface picks a role; it never picks a size.” |
| Shared control convergence | **6.6 / 10** | High | Excellent shared button system exists, but Life Edit/Graph, Search, Backup, Tags and other areas still own local control recipes. |
| Cross-screen compositional convergence | **7.2 / 10** | Medium-high | Repo's own rendered ledger documents major convergence fixes, but many families remain partial and some page-class asymmetries remain objectively measurable. |
| Edge-state evidence completeness | **6.4 / 10** | High | Most unreviewed work is concentrated in error/loading/validation/conflict/dense/nested states. |
| Accessibility-oriented visual proof | **8.4 / 10** | High | Forced colors, contrast work, reduced motion, keyboard contracts, Vietnamese evidence are strong; Narrator and physical DPI remain unreviewed. |
| Screenshot / regression provenance | **9.3 / 10** | High | Real Tauri/WebView2 production captures at measured DPR and viewport, plus exact-zero golden policy. |
| Pure aesthetic polish | **Not scored in this audit** | — | This session could not truthfully render repository PNG binaries for direct pixel-level human inspection; see §1.3. |

**Overall engineering-readiness for an endgame visual convergence pass:** **high**.  
**Overall evidence-backed claim that every surface is already endgame:** **not supportable**.

---

# 1. Evidence model and audit method

## 1.1 Frozen source snapshot

The audit was pinned to:

```text
main = a1078c1f91c251aaa7a453ef1e8a5108551c852d
```

The branch was re-checked during Phase 3 and still pointed to that exact commit. This matters because visual evidence, CSS source, audit ledgers, and regression baselines must all refer to one immutable state.

## 1.2 Evidence hierarchy used

I separated evidence into three grades.

### Grade A — directly measured / directly read

This includes:

- `screenshoots/README.md`
- `screenshoots/capture-audit.json`
- current production source at the frozen commit
- `scripts/check_layout_authority.py`
- current visual-system source
- current feature CSS / TSX
- current `main` commit identity

Claims such as viewport dimensions, frame widths, overflow totals, token enforcement, or a feature declaring a raw `fontSize` come from this grade.

### Grade B — repository-authored rendered-review evidence

This includes:

- `docs/audits/task-51-craft-coverage-ledger.md`
- `docs/audits/task-51-visual-lock.md`
- `docs/audits/task-51-visual-baseline.md`
- tracked visual regression descriptions and state coverage recorded by those files

These documents report rendered inspections previously performed in the real application. They are useful evidence, but this audit treats their claims as **repo-authored review evidence**, not as fresh pixel inspection by this session.

### Grade C — source-level visual inference

This is used when a CSS composition or component structure strongly predicts a convergence risk, for example:

- a feature defining its own `fontSize: 11`, `13`, `1.05rem` despite semantic typography roles existing;
- a feature recreating a button recipe instead of consuming `controls.css.ts`;
- a 768px reading frame being reused by a tool-dense Studio whose populated block states are still partially reviewed.

Grade C findings are labeled as risks/inferences rather than asserted visual defects.

## 1.3 Important limitation: no fabricated pixel review

The `screenshoots/` PNG files are available through the GitHub connector as binary/base64 content, but this environment does not expose those repository binaries as directly renderable image attachments. The browser path also cannot retrieve the raw repository PNGs in a form that can be inspected here.

Therefore this report **does not pretend that I directly eyeballed all 53 PNGs pixel-by-pixel**.

What Phase 3 *does* audit rigorously is:

1. the exact production screenshot inventory and measured runtime geometry;
2. the repository's own rendered-review ledger and golden coverage;
3. current CSS/component implementation behind the screenshot families;
4. agreement or tension between the declared design laws and feature-level implementation;
5. objective evidence gaps that prevent an “endgame complete” claim.

This distinction is important. “Zero pixel diff from a golden” proves stability against the accepted golden; it does not prove that the accepted golden is aesthetically optimal.

---

# 2. Current screenshot evidence inventory

`screenshoots/README.md` records **53 current light-theme screenshots** captured in one real, maximized Windows Tauri/WebView2 production walk.

> Note: the directory is intentionally named `screenshoots/` in the repository.

## 2.1 Capture environment

From `screenshoots/capture-audit.json`:

```text
label               screenshoots-production-maximized-20260810
theme               light
media mode          light
language            en
screen               1536 × 864 CSS px
available work area  1536 × 816
inner WebView        1536 × 794
devicePixelRatio     1.25
outer window         1522 × 779
```

Every one of the 53 recorded states reports:

```text
semantic collisions     0
document overflow       0
viewport overflow       0
```

No destructive import or restore was confirmed during the screenshot walk.

## 2.2 The 53 captured states

The machine-readable audit records the following exact state sequence.

### Today / inspector — 6

1. `today--unselected`
2. `today--running-timer`
3. `today--selected`
4. `today--selected-details`
5. `today--selected-time`
6. `today--selected-links`

### Task create/edit and nested controls — 6

7. `task-create`
8. `task-create--life-area`
9. `task-create--focus-plan`
10. `task-create--tags`
11. `task-recurring`
12. `task-edit`

### Planning queues / saved views — 5

13. `upcoming`
14. `overdue`
15. `deadlines`
16. `saved-views`
17. `saved-view-editor`

### Calendar / Analytics / Plans — 4

18. `calendar`
19. `analytics`
20. `plans`
21. `plans--selected`

### Life system core — 6

22. `life-browse`
23. `life-edit`
24. `life-edit--tree-import`
25. `life-edit--branch-import`
26. `life-pinned`
27. `life-graph`

### Reader / editor / import — 7

28. `life-reader`
29. `life-reader--add-link`
30. `basic-editor`
31. `basic-editor--link-dialog`
32. `life-reader--empty`
33. `life-reader--markdown-import`
34. `life-reader--portable-import`

### Narrative / visual worlds — 8

35. `narrative-reader`
36. `narrative-studio`
37. `narrative-studio--only-block-dialog`
38. `narrative-studio--paper`
39. `narrative-studio--sakura`
40. `narrative-studio--aurora`
41. `narrative-studio--nocturne`
42. `narrative-studio--dirty-exit`

### Settings / Search / backup / help — 9

43. `settings-top`
44. `settings-tags`
45. `settings-foundation`
46. `search`
47. `search--results`
48. `search--no-results`
49. `backup-settings`
50. `restore-confirmation`
51. `keyboard-help`

### Collapsed-sidebar composition — 2

52. `today-collapsed`
53. `analytics-collapsed`

The restore confirmation state is explicitly noted as timestamped runtime evidence and intentionally not a stable visual golden.

---

# 3. Objective geometry audit

## 3.1 Three page-width modes are functioning as real composition modes

The current capture data shows three clear regimes.

| Mode | Representative states | Frame | Inner content width | Utilization |
|---|---|---:|---:|---:|
| Wide task workspace | Today / task dialogs / Calendar | 1163 | 1184 | 98.2% |
| Standard | Analytics / Plans / Settings / Search | 1152 | 1184 | 97.3% |
| Life wide | Life Browse/Edit/Pinned/Graph | 1355 | 1376 | 98.5% |
| Reading | Reader / Basic Editor / Narrative | 768 | 1376 | 55.8% |

This is strong. It means page width is acting as semantic composition rather than accidental per-screen CSS.

The source confirms this design:

```ts
export type PageType = "standard" | "wide" | "reading";
```

and `PageFrame` is the only component intended to decide page width.

## 3.2 Reading measure is unusually disciplined

All captured reader/editor/narrative states report:

```text
frame width       768
inner width       1376
left free         ~303.92
right free        ~303.92
ratio             0.558
```

This is a positive signal. Long-form surfaces are not allowed to expand merely because the desktop window is wide.

**Preserve this for reading surfaces.** Do not “fix unused space” by stretching a document to the window.

## 3.3 Collapsed-sidebar asymmetry is the clearest objective cross-screen composition inconsistency

The current capture records:

### Today collapsed

```text
frame       1355
inner       1376
ratio       0.985
free sides  ~10.39 px
```

### Analytics collapsed

```text
frame       1152
inner       1376
ratio       0.837
free sides  ~111.92 px
```

This is not an overflow bug. It is an intentional consequence of page taxonomy: Today is wide and Analytics is standard.

But perceptually, collapsing the sidebar has very different payoffs:

- Today immediately absorbs the newly available width.
- Analytics remains capped and converts that reclaimed space into larger symmetric gutters.

That can be correct if standard pages are deliberately prose/evidence compositions. It becomes a visual inconsistency if the user expects sidebar collapse to mean “give my active work more room.”

### Recommendation

Do **not** solve this with feature-local max-widths. Phase 4 should decide one product-level rule:

- either standard pages intentionally retain their cap after sidebar collapse, and this is documented as a reading/comprehension choice;
- or specific data-dense standard surfaces such as Analytics graduate to a responsive “standard-to-wide” composition through the shared layout authority.

Do not introduce a fourth arbitrary page width.

---

# 4. Visual-system architecture: what is genuinely strong

## 4.1 The repository now has a real visual contract

The current system separates geometry and visual authority rather than placing everything into feature CSS.

Key visual-system files include:

```text
frontend/src/design-system/visual/contract.css.ts
frontend/src/design-system/visual/theme.css.ts
frontend/src/design-system/visual/lightTheme.css.ts
frontend/src/design-system/visual/darkTheme.css.ts
frontend/src/design-system/visual/typography.css.ts
frontend/src/design-system/visual/motion.css.ts
frontend/src/design-system/visual/icons.tsx
frontend/src/design-system/primitives/controls.css.ts
```

The historical Task 51 lock records a deliberate migration from:

```text
31 radius values  -> 4-role radius vocabulary
14 shadows        -> 3 elevation roles
raw feature color -> semantic visual roles
```

Current governance is stronger still: the production ratchet in `scripts/check_layout_authority.py` sets the allowed residue to:

```python
MAX_RESIDUE = {
    "color": 0,
    "radius": 0,
    "shadow": 0,
    "motion": 0,
}
```

This is excellent governance because the build cannot quietly drift back into raw visual literals.

## 4.2 The typography architecture is better than the feature adoption

`typography.css.ts` is one of the strongest pieces of the repo.

It defines explicit optical-size families:

- `uiSmall`
- `uiText`
- `uiDisplay`
- `editorial`
- `mono`

and semantic roles including:

- `display`
- `pageTitle`
- `objectTitle`
- `sectionTitle`
- `editorBody`
- `editorH1/H2/H3`
- `cardTitle`
- `row`
- `body`
- `bodyStrong`
- `compactBody`
- `button`
- `navigation`
- `tab`
- `label`
- `metadata`
- `caption`
- `eyebrow`
- `numeric`
- `numericMetric`
- `code`

Most importantly, the file states the correct design-system law:

> **A surface picks a role; it never picks a size.**

That is exactly the right abstraction.

The current feature layer does not yet fully obey it. This is the largest convergence gap found in Phase 3.

## 4.3 Shared controls are strong enough to be the canonical answer

`design-system/primitives/controls.css.ts` provides a real control grammar:

- shared geometry;
- semantic typography;
- primary / secondary / ghost / destructive variants;
- compact variant;
- icon-only recipe;
- hover / active / focus-visible / disabled states;
- reduced-motion behavior;
- forced-colors behavior.

This is not a weak primitive that forces features to reinvent behavior. It is already good enough that most local button recipes should disappear unless a domain interaction is genuinely exceptional.

## 4.4 Native controls have a baseline material

`app/layout/layout.css.ts` gives unstyled `button`, `select`, input, textarea, checkbox, radio and fieldset elements a coherent floor.

That is a sensible fallback and solved an important historic failure mode: raw Windows controls appearing inside an otherwise designed interface.

However, the source comments correctly describe this as a **floor, not a system**. Features that need semantic emphasis should consume the explicit shared control variants.

---

# 5. The main systemic defect: authority stops one layer too early

The current governance is excellent at preventing:

- arbitrary page widths;
- raw color literals;
- raw radius literals;
- raw elevation literals;
- raw motion timings;
- Unicode glyphs masquerading as icons.

But it does **not** currently prevent a feature from inventing:

- arbitrary `fontSize`;
- arbitrary control padding / min-height;
- arbitrary focus outline thickness;
- arbitrary local field recipe;
- arbitrary tab recipe;
- arbitrary visually-hidden implementation;
- arbitrary metadata scale;
- arbitrary micro-spacing cadence.

This is why the current product can be globally governed and still retain local visual dialects.

## 5.1 Concrete examples

### Focus Plans

`FocusPlansScreen.css.ts` consumes shared layout and shared buttons, but still defines:

```text
heading             2rem
muted               0.9rem
draftNote           0.85rem
input min-height    40px
primary min-height  40px
local tab geometry
local fieldset geometry
local phase-row geometry
local srOnly
```

This is halfway-converged: the feature understands the system, but still owns enough presentational decisions to become its own micro-design-system.

### Life Edit

`LifeEditWorkspace.css.ts` contains legitimate domain geometry for a spatial tree canvas, but its inspector also defines locally:

```text
compactMeta         11px
inspectorTitle      1.05rem
field               13px
archivedRow         13px
instructions        12px
button              local border/padding/focus recipe
input               local border/padding/focus recipe
```

The canvas deserves private spatial geometry. The inspector does not need a private UI language.

### Life Graph

`LifeGraph.css.ts` similarly contains legitimate graph geometry plus a second local dense-UI grammar:

```text
heading             1.05rem
summary             13px
nodeTitle           13px
nodeMeta            11px
inspectorTitle      1.02rem
inspectorMeta       13px
connectionHeading   13px
connectionButton    13px + local focus treatment
connectionKind      11px
empty               12px
field               13px
select              local recipe
button              local recipe
table               13px
```

Graph-specific encoding is justified. Recreating buttons, fields and typography is not.

### Narrative

`NarrativeCanvas.css.ts` adopts shared buttons but still defines a large local type vocabulary:

```text
title               1.5rem
sceneTitle          1.1rem
metricLabel         0.85rem
metricValue         2rem
metricUnit          1rem
metricDescription   0.9rem
calloutVariant      0.8rem
timelineItemDesc    0.9rem
imageCaption        0.85rem
studioHeading       1.4rem
studioBlockKind     0.8rem
fieldLabel          0.85rem
fieldInput          1rem
staticPreview       0.9rem
sceneRenameInput    0.95rem
```

Some Narrative-world typography may deserve domain-specific treatment. But the distinction between “world typography” and “studio chrome” is currently too porous. Studio chrome should converge strongly with the rest of the app.

### Global Search

`GlobalSearchDialog.css.ts` correctly uses shared dialog geometry, but still owns:

```text
input               1rem
closeButton         0.85rem + private button behavior
statusLine          0.9rem
groupHeading        0.75rem
optionTitle         0.95rem
optionContext       0.8rem
optionSnippet       0.8rem
moreNote            0.78rem
```

Search result hierarchy is domain-specific, but these sizes should ideally map to semantic roles rather than form an independent scale.

### Tag Settings

`TagSettings.css.ts` owns:

```text
input               14px
table heading       12px
table body          14px
select              14px
warning             13px
confirm text        13px
merged alias        11px
local srOnly
```

### Backup Settings

`BackupSettings.css.ts` owns:

```text
heading             1.25rem
subheading          1rem
primary button      private recipe
secondary button    private recipe
table               0.875rem
local visuallyHidden
```

The strongest signal here is not any one number. It is that **the same categories of decisions recur independently across feature files**.

## 5.2 Why this matters more than another palette pass

If Phase 4 only adjusts screenshots until they “look right,” new screens can regress immediately because the architecture still permits local answers.

A durable convergence pass must reduce the **number of decisions a feature is allowed to make**.

That means moving from:

> “Every feature uses the same colors and radii.”

into:

> “Every ordinary feature uses the same typography roles, field recipes, control recipes, focus treatment, tab grammar, hidden-accessibility utility and section rhythm unless it declares a narrowly justified domain exception.”

---

# 6. Family-by-family audit

## 6.1 Today / Today Inspector

### Evidence status

Repository ledger: **PARTIAL** overall.  
WeekStrip: **VERIFIED**.

Current evidence includes:

- selected / unselected;
- inspector tabs;
- running timer;
- assessment golden coverage in the broader visual set;
- narrow geometry;
- dark and forced-color coverage at route level;
- dense/long/Vietnamese fixture evidence.

Still incomplete according to the repo:

- empty Today;
- loading Today;
- error Today;
- completed-task variants;
- full dark/forced-colors inspector review;
- tab wrapping and long linked-name behavior at 960;
- complete keyboard walk.

### Phase 3 judgement

Today is the **reference production family** for the current art direction and should remain the benchmark used to converge other ordinary UI.

Do not use an older generic SaaS pattern as the benchmark for Plans/Settings/Graph. Use the laws embodied by Today:

- continuous surface;
- low-chrome separation;
- typography carrying hierarchy;
- selection as restrained fill + accessible edge;
- inspector as subordinate rail rather than a second application.

### Priority

**P1 evidence completion**, not major redesign.

---

## 6.2 Task create/edit and nested pickers

### Evidence status

Repository ledger: **PARTIAL**.

Strong current coverage:

- create;
- edit;
- recurrence;
- Life-area combobox;
- Focus Plan combobox;
- TagPicker open state;
- dark/forced-colors coverage for several nested controls;
- DOM Escape/blur/selection behavior.

Gaps:

- validation visuals;
- deletion confirmation semantics;
- occurrence-scope states;
- loading/error/no-match nested picker states;
- focus-containment evidence;
- rollback/undo edge visuals.

### Important semantic issue

The ledger records a particularly important unresolved state:

> Task deletion is currently direct from the edit dialog; a shared-dialog confirmation implementation was removed after the production bundle exceeded the locked total-JS maximum by 688 bytes at its smallest implementation.

This is not merely aesthetic. It is a product interaction / safety surface blocked by a budget decision.

### Priority

**P0 product decision** on deletion confirmation versus bundle ceiling.  
**P1** finish validation/error/nested-state visual proof.

---

## 6.3 Calendar

### Evidence status

Repository ledger: **VERIFIED**.

Evidence spans:

- ordinary and six-week month behavior;
- current / selected / outside day;
- dense and empty days;
- missed state;
- load bars;
- month controls;
- light/dark/narrow/keyboard/forced colors;
- 13 focused Calendar tests;
- geometry audit.

### Phase 3 judgement

Calendar is one of the two cleanest completed references in the current ledger, alongside WeekStrip.

Treat it as a “do not casually touch” surface. Any Phase 4 visual-system consolidation should prove zero regression here before landing.

### Priority

**Preserve.** Only modify when consolidation can demonstrate equivalent or better evidence.

---

## 6.4 Analytics

### Evidence status

Repository ledger: **PARTIAL**.

The current source shows substantial deliberate anti-dashboard work:

- period controls stop at content width instead of stretching across the page;
- headline metric and supporting facts are grouped into one analytical statement;
- facts use shared glass rather than one card per KPI;
- category data is grouped rather than cardified;
- tables own horizontal scroll;
- progress uses shared material;
- numeric metric role consumes the central type system.

The source comments show that stretched toolbar and dead-card defects were caught and removed during rendered review.

### Remaining evidence gaps

- month/year captures;
- empty Analytics;
- plan-table local scrolling;
- full keyboard review.

### Objective cross-screen concern

Analytics is the clearest demonstration of standard-page collapse asymmetry:

```text
sidebar collapsed -> frame stays 1152 inside 1376 available
```

This leaves about 112px of free space on each side.

That is not automatically wrong. But it should be a **deliberate product composition decision**, because Analytics is data-rich enough that reclaimed width can have real value.

### Convergence concern

Analytics is better than several other families at consuming semantic typography (`text.numericMetric`, `text.metadata`), but still contains local values such as:

```text
eyebrow       0.9375rem
fact dt       0.8125rem
fact dd       26px
```

These should be reviewed against the declared typography authority.

### Priority

**P1** decide standard-page collapsed behavior and complete state evidence.  
**P2** eliminate residual private typography where a semantic role already exists.

---

## 6.5 Focus Plans

### Evidence status

Overview: **PARTIAL**.  
Detail/edit: **PARTIAL**.  
Recovery / approaches / phases: **NOT REVIEWED** in expanded state ledger.  
Linked work / reviews: **NOT REVIEWED** in expanded state ledger.

### What has already improved

The repository explicitly records removal of:

- card nesting;
- stretched create group;
- boxed tabs;
- dead detail frame;
- shared-button edge collision.

That is the right direction.

### Why this remains a Phase 4 hotspot

`FocusPlansScreen.css.ts` still controls a large amount of ordinary UI styling locally even though shared primitives exist.

This is especially important because Plans is not a special visual world or spatial canvas. It is a conventional master/detail productivity surface. Therefore it should have **less**, not more, private visual grammar than Narrative or Graph.

### Risk profile

1. Portfolio tabs define their own tab grammar.
2. Plan list selection defines a bespoke list-item treatment.
3. Detail fieldsets / fields / inputs own geometry.
4. Typography uses several raw sizes.
5. `srOnly` is duplicated locally.
6. Approaches/phases/recovery states remain under-rendered, so the most complex forms may expose inconsistencies not present in the overview screenshot.

### Priority

**P0 convergence family.**

Before adding new polish, migrate Plans ordinary controls and typography onto canonical primitives, then render all complex detail states.

---

## 6.6 Life Browse

### Evidence status

**PARTIAL**.

The repository reports that the focal node and children were already changed from card-on-card composition into one bounded, left-anchored hierarchy with shared icon vocabulary.

Remaining evidence gaps:

- leaf/no-child;
- pagination;
- long/dense hierarchy;
- forced colors;
- deeper interaction coverage.

### Phase 3 judgement

The direction is correct. Life Browse is allowed to be more spatial than Settings or Plans, but it should retain the same ordinary action grammar.

### Priority

**P1 evidence and dense-hierarchy stress testing.**

---

## 6.7 Life Edit

### Evidence status

**PARTIAL**.

Unfinished evidence includes:

- drag/undo states;
- keyboard parity;
- dense/deep tree;
- dark/forced-colors inspector review;
- mutation pending/error states.

### Structural judgement

The canvas deserves domain ownership over:

- node positioning;
- link paths;
- drag overlays;
- canvas scroll;
- node dimensions where graph readability demands it.

The inspector does **not** need to own a parallel design system.

Current source recreates:

- field typography;
- input recipe;
- button recipe;
- destructive button recipe;
- focus outlines;
- metadata scale;
- instructions scale.

### Priority

**P0 primitive convergence**, then **P1 dense/deep/drag render review**.

---

## 6.8 Life Pinned

### Evidence status

**PARTIAL**.

The repository reports that populated Pinned was changed from a centered card island into a left-anchored readable list.

Gaps:

- empty;
- unavailable;
- unpin interaction;
- dark/forced colors.

### Priority

**P2 visual/evidence completion.** Lower risk than Edit/Graph because the interaction model is simpler.

---

## 6.9 Life Graph

### Evidence status

**PARTIAL**, with relatively strong theme/narrow/forced-colors coverage.

Remaining:

- explicit-link-heavy state;
- dense graph;
- error state;
- keyboard completeness.

### Good design decisions in source

The graph does not encode edge kind by color alone:

- hierarchy edges use one treatment;
- explicit links are dashed and arrow-tipped;
- unavailable links use dotted/thinner treatment.

Selection is also multi-signal:

- tonal background;
- border/focus color;
- leading inset edge.

These are good accessibility and information-design decisions.

### Convergence problem

As with Life Edit, the graph inspector and relationship UI independently define:

- typography scale;
- buttons;
- select;
- focus treatment;
- table scale.

### Additional enclosure question

`allLinks` and `notice` both create bordered raised surfaces. That may be semantically justified, but they should be reviewed against the continuous-surface law so Graph does not slowly drift back toward “canvas + inspector + extra card + extra notice card.”

### Priority

**P0 ordinary-UI convergence**, **P1 dense graph / link-state review**.

---

## 6.10 Basic Leaf Reader

### Evidence status

**PARTIAL but comparatively mature**.

Strong evidence:

- deterministic route to documented leaf;
- empty leaf path;
- reading measure;
- Vietnamese title/body/headings;
- bold/italic/list rendering;
- light/dark/forced colors;
- outline and related content behavior.

Gaps:

- error state;
- genuinely long multi-page document;
- some keyboard/manual review.

### Phase 3 judgement

This family should remain the reference for editorial typography and reading measure.

### Priority

**Preserve; P1 long-document and error stress test.**

---

## 6.11 Basic Leaf Editor

### Evidence status

**PARTIAL**.

Strong evidence:

- real Editor entry/exit;
- link dialog;
- focus return;
- Vietnamese authored content;
- heading/body/bold/italic/list coverage;
- keyboard axis stronger than many other surfaces.

Gaps:

- selection/caret manipulation;
- dirty-exit visual;
- save/error;
- forced colors.

### Priority

**P1 editor-state closure.**

---

## 6.12 Narrative Reader

### Evidence status

**PARTIAL**.

The current repository says a deterministic entry and first composition pass exist, and export tools now form one editorial utility band.

Gaps:

- populated multi-block document;
- long document;
- error;
- forced colors;
- explicit Reader variants for every Visual World.

### Priority

**P1 content-density and world-parity review.**

---

## 6.13 Narrative Studio

### Evidence status

**PARTIAL**.

Strong evidence:

- all four Visual Worlds in light and dark;
- only-block decision;
- dirty-exit decision;
- shared controls present in several areas;
- narrow route evidence.

Gaps:

- fully populated block types;
- drag state;
- save/error;
- forced colors;
- Reader parity.

### Key composition risk: 768px editor frame

The capture audit shows Narrative Studio uses the same 768px reading frame as Reader.

For the Reader this is a clear strength.

For Studio it is a **risk to test, not a defect to assume**. The Studio includes:

- scene tab navigation;
- block actions;
- metric editors;
- callout editor;
- timeline item editor;
- image controls;
- rich-text editor;
- drag handles;
- add-block controls;
- world/template controls.

The ledger simultaneously states that populated block types and drag/save/error states are not fully reviewed.

Therefore Phase 4 should explicitly test whether:

- 768px still feels calm and intentional with maximal realistic authoring density; or
- the editor requires a separate **tooling composition** while keeping the Reader at 768px.

If a wider Studio is needed, solve it through the shared finite page taxonomy or a justified editor workspace primitive — not a one-off `max-width` in Narrative CSS.

### Local-grammar concern

Narrative block content can legitimately have world-specific typography, but Studio chrome currently owns many raw type sizes and local tab/field recipes. Separate these two layers:

1. **Narrative content/world layer** — allowed expressive exceptions.
2. **Lifeweave Studio chrome** — should converge with canonical controls/type/focus.

### Priority

**P0 stress-test and convergence family.**

---

## 6.14 Visual Worlds

### Evidence status

**PARTIAL**.

All eight Studio variants (Paper/Sakura/Aurora/Nocturne × light/dark) are reported inspected and coherent with the shell.

Missing:

- explicit Reader variants;
- narrow variants;
- forced-colors behavior.

### Phase 3 judgement

Visual Worlds are an intentional exception to global color uniformity and are already explicitly exempted in visual-residue governance. Preserve that exception.

Do not “converge” them by flattening their identity. Converge the **chrome around the worlds**, not the worlds themselves.

### Priority

**P1 parity coverage**, not homogenization.

---

## 6.15 Global Search

### Evidence status

**PARTIAL**.

Strong evidence:

- initial state;
- grouped 16-result state;
- keyboard-active result;
- no result;
- accent-insensitive Vietnamese searches;
- dark/forced-colors coverage;
- shared search icon;
- native search-cancel glyph removed.

Gaps:

- loading;
- error;
- full keyboard traversal;
- focus restoration proof.

### Structural judgement

The top-anchored search palette is a valid documented modal exception and should be preserved.

### Convergence issue

Search currently defines its own micro type scale and close-button recipe. Search result hierarchy may need specialized composition, but the mapping should resolve through semantic roles.

### Priority

**P1 keyboard/error closure**, **P2 type/control consolidation**.

---

## 6.16 Settings / Tags / Backup / Foundation

### Evidence status

Settings: **PARTIAL**.  
Tag management: **PARTIAL**.  
Backup/restore: **PARTIAL**.  
Foundation states: **PARTIAL**.

The repository reports a meaningful compositional improvement: Settings now reads as one editorial form, using bounded goal controls and hairline section transitions instead of full-width strips and card islands.

### Convergence concern

This is another ordinary-UI family where local primitives remain unnecessarily common.

Tag Settings recreates:

- input geometry;
- select geometry;
- table typography;
- warning typography;
- merge panels;
- visually-hidden utility.

Backup Settings recreates:

- primary button;
- secondary button;
- heading scale;
- table scale;
- visually-hidden utility.

This is particularly hard to justify because canonical button variants already exist.

### Priority

**P0 control/utility consolidation**, then **P1 merge/restore/error/validation state review**.

---

# 7. State-coverage audit: where “PARTIAL” clusters

The most important pattern in the Craft ledger is that missing evidence is **not random**.

It clusters around exactly the states that expose weak design systems.

## 7.1 Empty states

Still incomplete in multiple families:

- Today;
- Analytics;
- Plans portfolio variants;
- Pinned;
- several relationship/search/list panels.

Empty states test whether a screen still has meaningful hierarchy when its primary content disappears.

## 7.2 Loading and error states

Repeated gaps exist in:

- global route/core failures;
- Today;
- Analytics;
- nested comboboxes;
- Focus Plan linked work/reviews;
- Life mutations;
- Search;
- Foundation;
- backup/restore.

These are exactly the states most likely to fall back to raw text or awkward full-width banners if not deliberately composed.

## 7.3 Validation / destructive / conflict states

Important missing or partial states include:

- Task form validation;
- task deletion confirmation;
- occurrence scope;
- Focus Plan recovery conflicts;
- review validation;
- tag merge confirmation/error;
- restore failure/pending;
- editor save/error;
- draft conflict.

These should be treated as a coherent **decision/error surface family**, not solved independently by each feature.

## 7.4 Dense states

Still under-reviewed:

- dense Plans details;
- dense/deep Life tree;
- dense graph;
- long Reader document;
- populated Narrative block matrix;
- long link names;
- large result/relationship sets.

A calm empty screenshot can hide weak density behavior. Endgame review must stress realistic worst cases.

## 7.5 Keyboard / manual accessibility

The automation is good, but the ledger consistently carries partial keyboard review.

Still explicitly missing:

- complete app-shell keyboard walk;
- several tab/combobox/list traversals;
- focus containment/restoration captures;
- Narrator manual evidence;
- physical DPI 125% / 150% manual evidence.

---

# 8. Visual regression: excellent guardrail, dangerous if misinterpreted

The current ledger records:

```text
tracked visual set   105 exact-zero goldens
```

Coverage spans:

- light/maximized;
- light/minimum;
- dark/maximized;
- forced colors;
- Vietnamese typography;
- major route families;
- timer/assessment;
- TagPicker;
- Task comboboxes;
- Saved View editor;
- Life Link dialog;
- Life interchange previews;
- empty Reader;
- Studio worlds;
- editor decisions;
- Search;
- Keyboard Help.

This is unusually strong for a desktop application of this size.

## 8.1 What exact-zero proves

It proves:

- the captured state did not unintentionally change relative to the approved baseline;
- rendering is deterministic enough for strict comparisons in the established environment;
- a refactor can be prevented from silently moving pixels.

## 8.2 What exact-zero does not prove

It does **not** prove:

- the baseline is aesthetically optimal;
- hierarchy is ideal;
- all realistic states are represented;
- an unreviewed state is good because a nearby state is golden;
- the same composition is optimal for every feature family;
- a stable local visual dialect is globally converged.

### Phase 4 rule

Use goldens as **regression locks after design decisions**, not as evidence that design decisions can no longer be challenged.

---

# 9. Accessibility and perception

## 9.1 Selection treatment is deliberately multi-signal

The Task 51 visual lock measured the selected-row fill against the canvas at only about 1.10:1. Rather than darkening the entire design, the implementation added a 2px `selectionEdge` at about 3.15:1.

This is a strong solution because it preserves the subtle tonal aesthetic while adding a perceivable non-text state indicator.

### Preserve

Do not remove the selection edge merely to make the UI “cleaner.”

## 9.2 Forced-colors coverage is substantial

The current infrastructure reports a verified production forced-colors axis with 12 inspected exact-zero goldens spanning:

- structure;
- native controls;
- both Task comboboxes;
- graph;
- editor/dialog;
- Settings;
- Search;
- Keyboard Help.

Several nested families still need their own specific forced-colors review, but the platform-level support is real.

## 9.3 Reduced motion is treated as a designed state

The governance explicitly rejects the common anti-pattern of setting every animation/transition to `0.01ms`.

The current ledger records a 36-state reduced-motion interaction/geometry walk and representative static captures matching light goldens.

### Preserve

Reduced motion should keep feedback while eliminating unnecessary travel, not turn transitions into abrupt jumps.

## 9.4 Vietnamese typography is first-class evidence

The current typography system includes Vietnamese Literata subset loading and dedicated goldens covering:

- dense task/search UI;
- Reader/Editor titles;
- uppercase hierarchy;
- H2/H3;
- body;
- bold;
- italic;
- lists.

This is a major strength, especially because Vietnamese diacritics reveal line-height and optical-spacing defects that English-only review can miss.

## 9.5 Remaining manual evidence debt

Still explicitly unreviewed:

- Narrator;
- physical Windows DPI at 125% / 150%.

These should remain honest blockers to a “fully verified accessibility/presentation” claim.

---

# 10. Cross-screen convergence matrix

Legend:

- **Strong** — primarily governed by shared authority.
- **Mixed** — strong shared base plus meaningful local dialect.
- **Domain exception** — local geometry is justified, ordinary chrome still should converge.

| Family | Page authority | Type authority | Control authority | Enclosure grammar | State proof | Overall |
|---|---|---|---|---|---|---|
| Today | Strong | Strong/Mixed | Strong | Strong | Mixed | Strong reference |
| Calendar | Strong | Strong | Strong | Strong | Strong | Verified reference |
| Analytics | Strong | Mixed | Mixed/Strong | Strong | Mixed | Strong direction |
| Focus Plans | Strong | **Mixed** | **Mixed** | Improved | Weak/Mixed | **Convergence hotspot** |
| Life Browse | Strong | Mixed | Mixed | Improved | Mixed | Domain-specific |
| Life Edit | Strong | **Mixed** | **Mixed** | Domain exception | Mixed | **Convergence hotspot** |
| Life Graph | Strong | **Mixed** | **Mixed** | Domain exception | Mixed | **Convergence hotspot** |
| Basic Reader | Strong | Strong | Strong/Mixed | Strong | Strong/Mixed | Editorial reference |
| Basic Editor | Strong | Strong | Strong/Mixed | Strong | Mixed | Strong direction |
| Narrative Reader | Strong | Domain exception | Mixed | Domain exception | Mixed | Needs density/world parity |
| Narrative Studio | Strong | **Mixed/domain** | **Mixed** | Domain exception | Mixed | **Convergence + width hotspot** |
| Search | Strong | **Mixed** | **Mixed** | Strong | Mixed | Small convergence debt |
| Settings | Strong | Mixed | Mixed | Improved | Mixed | Needs edge-state closure |
| Tags | Inherited | **Mixed** | **Mixed** | Mixed | Mixed | **Primitive hotspot** |
| Backup | Inherited | **Mixed** | **Mixed** | Strong modal geometry | Mixed | **Primitive hotspot** |

---

# 11. Root-cause map

## Root cause A — visual residue gate is narrower than visual convergence

### Current enforcement

`check_layout_authority.py` correctly enforces zero raw:

- color;
- radius;
- shadow;
- motion.

### Gap

It does not enforce semantic typography-role adoption or canonical ordinary-control recipes.

### Consequence

A feature can be “clean” under the ratchet while still declaring seven private font sizes and a private button system.

### Correct fix

Add a **convergence gate**, not more color tokens.

Potential checks:

1. ban raw `fontSize` in ordinary feature CSS except an explicit allowlist for domain visualization/world content;
2. require visually-hidden content to use one shared utility;
3. flag feature-local button recipes that duplicate shared controls;
4. flag feature-local focus outlines on ordinary controls unless justified;
5. define canonical field/select/textarea recipes for high-frequency form surfaces;
6. define canonical low-chrome tab grammar;
7. document domain exceptions explicitly.

Do not blindly auto-ban every number. Graph node geometry and Narrative content are legitimate exceptions.

---

## Root cause B — layout taxonomy is finite, but responsive semantic intent is not fully articulated

The finite `standard / wide / reading` taxonomy is good.

The current collapsed-sidebar evidence shows a remaining semantic question:

> Is page width determined purely by page identity, or can a data/tool surface adapt when the user explicitly reclaims workspace?

This should be decided centrally before tweaking Analytics or Studio.

---

## Root cause C — domain-specific surfaces mix domain geometry and generic chrome in the same file

Examples:

- Life Edit canvas + inspector controls;
- Life Graph canvas + relationship table/buttons/select;
- Narrative content worlds + Studio chrome.

When both live together, justified domain exceptions make it easy for ordinary chrome to bypass shared primitives.

### Correct fix

Separate conceptual layers:

```text
Domain visualization/content styles
    vs.
Lifeweave standard UI chrome styles
```

Then enforce stricter rules on the chrome layer.

---

## Root cause D — state review is family-based but endgame failures are state-type-based

The coverage ledger is excellent, but the remaining gaps repeat across features:

- loading;
- empty;
- error;
- validation;
- conflict;
- destructive decision;
- dense;
- keyboard-active;
- narrow;
- forced colors.

### Correct fix

Phase 4/5 should run horizontal review passes by **state type**, not only vertical review by feature.

Example:

> “Render every error state in the product and compare their hierarchy/chrome/actions together.”

That will converge the app faster than polishing Focus Plans in isolation and then repeating the same decisions in Backup.

---

# 12. Priority register

## P0 — must resolve before claiming endgame visual convergence

### P0.1 Canonical typography adoption

**Problem:** semantic roles exist, but ordinary features still choose raw sizes.  
**Targets:** Plans, Life Edit inspector, Life Graph inspector/table, Search, Tags, Backup, Narrative Studio chrome, residual Analytics roles.  
**Outcome:** ordinary UI selects `text.*` role, not arbitrary size.

### P0.2 Canonical ordinary-control adoption

**Problem:** shared controls exist, but local button/input/select/focus recipes persist.  
**Targets:** Life Edit, Life Graph, Tag Settings, Backup Settings, Search close/control actions, Narrative Studio chrome.  
**Outcome:** semantic shared control recipes become default; domain exceptions are explicit.

### P0.3 Consolidate hidden-accessibility utility

Observed duplicates include local `srOnly` / `visuallyHidden` recipes in multiple features.

**Outcome:** one shared visually-hidden primitive/recipe.

### P0.4 Narrative Studio maximal-density composition test

Test the 768px Studio under realistic maximum content density before locking it as equivalent to Reader.

### P0.5 Task deletion decision

The desired confirmation surface is currently blocked by a bundle-budget decision. Resolve product safety semantics versus the locked JS ceiling explicitly.

---

## P1 — required for a strong closure claim

### P1.1 Horizontal edge-state review

Render and compare product-wide:

- loading;
- error;
- empty;
- validation;
- conflict;
- destructive confirmation;
- unavailable/archived;
- pending/saving.

### P1.2 Dense-state stress suite

Include at minimum:

- very long Today links/titles;
- all Plans detail sections populated;
- deep/wide Life tree;
- dense Graph with explicit links;
- multi-page Reader document;
- Narrative Studio with every block type;
- large Search result set;
- Settings tags/backup tables with long values.

### P1.3 Finish keyboard/focus evidence

Especially:

- shell traversal;
- tablists;
- comboboxes;
- modal containment;
- focus return;
- graph/list navigation where applicable.

### P1.4 Complete Reader/Studio world parity

The Studio worlds have much stronger explicit evidence than Reader variants. Close the asymmetry.

### P1.5 Decide collapsed-sidebar standard-page intent

Treat Analytics as the test case; solve centrally.

---

## P2 — refinement after convergence

### P2.1 Micro-spacing normalization

Once type/control roles are migrated, normalize residual one-off gaps/padding where no semantic distinction exists.

### P2.2 Table grammar

Analytics, Graph, Tags, Backup and Focus Plan detail should share a clearer table/list density grammar where semantics overlap.

### P2.3 Status/error presentation grammar

Unify inline errors, notices, recovery prompts and empty explanations so severity is carried consistently by hierarchy and actions, not only color/border.

### P2.4 Scrollbar inspection

The ledger still asks for deliberate shell scrollbar review. Do this across light/dark and local-scroll regions.

---

# 13. What should NOT be changed casually

A careful redesign can damage systems that are already unusually good. Preserve the following unless new measured evidence proves a better answer.

## 13.1 One page-width authority

No feature-local page max widths.

## 13.2 The finite page taxonomy

Do not create `standard2`, `wide2`, `readerWide`, etc. to solve isolated screenshots.

## 13.3 768px Reader measure

Reading surfaces benefit from the constrained measure. Only Studio is an open question because it is a tool, not pure reading.

## 13.4 Continuous-surface law

Do not regress into:

```text
page -> card -> boxed tabs -> inner card -> bordered controls
```

The previous reconstruction already removed several versions of this.

## 13.5 Multi-signal selection

Preserve subtle fill + accessible edge.

## 13.6 Real WebView2 evidence

Do not replace native Windows capture with browser-only screenshots as the release truth.

## 13.7 Exact-zero regression policy

Keep strict visual comparison. Change goldens only after an explicit design change is reviewed.

## 13.8 Visual Worlds as intentional exceptions

Do not flatten Paper/Sakura/Aurora/Nocturne into one generic palette merely for token purity.

## 13.9 Reduced-motion design

Do not collapse reduced motion into “all duration = near zero.”

## 13.10 Vietnamese typography fixtures

Keep them in the release evidence path.

---

# 14. Recommended Phase 4 — Convergence Blueprint + Endgame Lock

Phase 4 should **not** begin by editing dozens of screenshots independently.

The most efficient next phase is a system-first convergence blueprint followed by targeted implementation.

## Step 1 — Define the ordinary-UI contract

Create/finish canonical recipes for:

- page title / section title / object title;
- body / compact body / metadata / caption;
- primary / secondary / ghost / destructive / icon / compact buttons;
- text input / textarea / select;
- field label / help / validation;
- low-chrome tabs;
- selected list row;
- table/list density;
- inline status / warning / error;
- visually hidden utility.

## Step 2 — Classify every existing private recipe

For every feature-local type/control rule:

```text
A. migrate to shared role
B. promote to shared primitive because >=2 real consumers need it
C. retain as documented domain exception
D. delete as residue
```

No “leave it because it already looks okay.”

## Step 3 — Converge hotspot families first

Suggested order:

1. Focus Plans
2. Life Edit inspector
3. Life Graph inspector/relationship UI
4. Narrative Studio chrome
5. Settings Tags + Backup
6. Global Search
7. residual Analytics type/control roles

Why this order: these families currently expose the largest ordinary-UI private dialects or the largest state-evidence gaps.

## Step 4 — Run horizontal state passes

After ordinary chrome converges, review across the whole app:

1. empty;
2. loading;
3. error;
4. validation/conflict;
5. destructive decision;
6. dense content;
7. keyboard-active/focus;
8. forced colors;
9. narrow/minimum window;
10. dark.

## Step 5 — Re-lock goldens only after review

For each intentional change:

- render in real WebView2;
- inspect;
- run geometry assertions;
- run dark/FC/reduced-motion/Vietnamese as applicable;
- accept new golden deliberately;
- keep exact-zero thereafter.

## Step 6 — Manual closure

Before calling the visual overhaul genuinely complete:

- Narrator walkthrough;
- physical 125% DPI;
- physical 150% DPI;
- deliberate scrollbar inspection;
- full keyboard traversal of critical flows.

---

# 15. Proposed convergence acceptance criteria

Phase 4 should have objective exit criteria. Suggested contract:

## Source contract

- [ ] No ordinary feature CSS declares raw `fontSize` unless listed in a reviewed domain-exception allowlist.
- [ ] No duplicate `srOnly` / `visuallyHidden` implementation in feature CSS.
- [ ] No ordinary feature-local primary/secondary/destructive button recipe when shared variants are semantically equivalent.
- [ ] No ordinary feature-local text input/select/textarea recipe when shared field primitives are semantically equivalent.
- [ ] Domain-specific geometry is isolated/documented.
- [ ] Existing zero raw color/radius/elevation/motion residue stays zero.

## Render contract

- [ ] 0 semantic collisions at all release viewports.
- [ ] 0 document overflow at all release viewports.
- [ ] 0 viewport overflow at all release viewports.
- [ ] Every major family has at least one dense state.
- [ ] Every major family has explicit empty/loading/error classification, including `N/A` with rationale where impossible.
- [ ] Every dialog family has focus containment/return evidence.
- [ ] Dark / forced colors / reduced motion remain green.
- [ ] Vietnamese typography remains exact-zero.

## Manual contract

- [ ] Narrator reviewed.
- [ ] 125% physical DPI reviewed.
- [ ] 150% physical DPI reviewed.
- [ ] Scrollbars deliberately inspected.
- [ ] Critical keyboard journeys completed.

---

# 16. Suggested architecture changes — minimal, not framework-building

The repo correctly avoids creating shared primitives without real consumers. Phase 4 should preserve that discipline.

The likely useful additions are small.

## 16.1 Shared visually-hidden utility

One recipe used everywhere.

## 16.2 Shared field recipes

Potential semantic variants:

```text
field.input
field.textarea
field.select
field.label
field.help
field.error
```

Do not build a form framework. Only centralize the repeated visual contract.

## 16.3 Shared low-chrome tabs

Today / Plans / Narrative scene chrome / other tablists can consume a canonical base with domain layout around it.

Narrative may keep world/content exceptions while its Studio tabs consume shared interaction states.

## 16.4 Shared list-selection recipe

A common pattern can carry:

- tonal selection;
- optional leading accent edge;
- hover;
- focus-visible;
- forced colors.

Plans, Search-like results, Life relationship lists and other master lists can compose it without becoming identical layouts.

## 16.5 Typography adoption helpers

The current `text.*` objects are already good. The missing piece is adoption and enforcement, not a second typography API.

---

# 17. Risk of over-correction

The largest danger in Phase 4 is confusing convergence with sameness.

Lifeweave contains multiple legitimate product modes:

- task execution;
- analytical evidence;
- spatial Life-system manipulation;
- long-form reading;
- long-form editing;
- narrative/world authoring;
- settings/administration;
- command search.

They should not become one repeated card/list template.

The correct target is:

> **Same grammar, different composition.**

Shared:

- type roles;
- control behavior;
- focus;
- selection logic;
- elevation/radius semantics;
- spacing vocabulary;
- dialog grammar;
- error/empty/loading hierarchy.

Allowed to differ:

- spatial layout;
- information density;
- canvas topology;
- Reader measure;
- Narrative world content styling;
- task-specific timeline/assessment mechanics;
- graph encoding.

---

# 18. Evidence-backed “endgame” gap estimate

This is not a line-count estimate; it is a surface-risk estimate.

## Foundation work

**~85–90% complete.**

The hard architectural work is largely present.

## Canonical normal-state composition

**~80–85% complete.**

Major route families have real production renders and several prior cardification/stretch defects have been explicitly corrected.

## Cross-feature primitive convergence

**~60–70% complete.**

This is the largest remaining design-system task.

## Edge-state rendered review

**~55–65% complete.**

The ledger's repeated `PARTIAL` and `NOT REVIEWED` rows are real outstanding work.

## Accessibility/manual closure

**~75–85% automated/systemic; incomplete manual closure.**

Narrator and physical DPI are still honest gaps.

### Overall interpretation

The app is **not early** in its visual overhaul. It is in the more difficult late stage where broad design changes are less useful than removing exceptions, stress-testing realistic edge states, and proving consistency.

---

# 19. Source files most relevant to the next phase

## Global authorities

```text
frontend/src/app/layout/PageFrame.tsx
frontend/src/app/layout/layout.css.ts
frontend/src/app/layout/tokens.css.ts
frontend/src/design-system/visual/contract.css.ts
frontend/src/design-system/visual/typography.css.ts
frontend/src/design-system/visual/motion.css.ts
frontend/src/design-system/primitives/controls.css.ts
scripts/check_layout_authority.py
```

## Convergence hotspots

```text
frontend/src/features/focus-plan/FocusPlansScreen.css.ts
frontend/src/features/life/LifeEditWorkspace.css.ts
frontend/src/features/life/graph/LifeGraph.css.ts
frontend/src/features/life/narrative/NarrativeCanvas.css.ts
frontend/src/features/search/GlobalSearchDialog.css.ts
frontend/src/features/tag/TagSettings.css.ts
frontend/src/features/backup/BackupSettings.css.ts
frontend/src/features/analytics/AnalyticsScreen.css.ts
```

## Evidence authorities

```text
screenshoots/README.md
screenshoots/capture-audit.json
docs/audits/task-51-visual-baseline.md
docs/audits/task-51-visual-lock.md
docs/audits/task-51-craft-coverage-ledger.md
e2e-tests/visual-baselines/windows-webview2/
```

---

# 20. Final Phase 3 conclusions

## Conclusion 1 — Geometry is no longer the problem

The established screenshot walk is geometrically clean across 53 states. The layout authority is real and enforced. Do not spend Phase 4 redesigning page widths ad hoc.

## Conclusion 2 — The product has a coherent art direction

The continuous-surface, low-chrome, warm-neutral/blue identity, semantic type system, restrained selection and deliberate Reader mode are not placeholders. They are a viable endgame direction.

## Conclusion 3 — The largest remaining source-level visual problem is local dialect

Raw visual tokens are gone, but ordinary feature CSS still chooses too many type/control/focus decisions. This is the next architectural frontier.

## Conclusion 4 — Focus Plans, Life Edit, Life Graph, Narrative Studio, Tags/Backup are the highest-value convergence targets

They either carry the largest private UI grammar or the largest unresolved state complexity.

## Conclusion 5 — Narrative Studio needs a specific width/density proof

Reader at 768px is strong. Studio at 768px is not automatically wrong, but it must be validated with every realistic block type and authoring control populated.

## Conclusion 6 — The evidence harness is a major asset

105 exact-zero goldens, real WebView geometry, forced-colors, reduced motion, Vietnamese and minimum-size coverage mean the project can perform aggressive convergence refactors safely — **if goldens are treated as locks after review, not as proof that old design is unquestionable**.

## Conclusion 7 — “Complete” is currently not an honest label

The repository's own ledger is explicit: `PARTIAL` and `NOT REVIEWED` are active work. The remaining gaps are concentrated in exactly the difficult states that separate a good normal-state UI from a genuinely finished product.

---

# 21. Phase 4 recommendation in one sentence

> **Do not redesign Lifeweave again; converge it.** Freeze the successful art direction, centralize ordinary typography/control/focus/field/tab grammar, stress the incomplete dense/error/validation/keyboard states, resolve the Studio-width and task-deletion decisions, then re-lock the visual baselines.

---

# Appendix A — Key measured numbers

```text
Current main                              a1078c1f91c251aaa7a453ef1e8a5108551c852d
Current production light screenshot walk 53 states
Canonical WebView                         1536 × 794
Device pixel ratio                        1.25
Canonical collisions                      0
Canonical document overflow               0
Canonical viewport overflow               0
Tracked visual goldens                    105
Raw production color residue              0
Raw production radius residue             0
Raw production elevation residue          0
Raw production motion residue             0
Reading frame                             768 px
Today collapsed utilization               1355 / 1376 = 98.5%
Analytics collapsed utilization           1152 / 1376 = 83.7%
```

---

# Appendix B — Evidence caveat checklist

To keep future reviews honest:

- [x] Source snapshot frozen.
- [x] Screenshot state inventory read from current repo.
- [x] Capture geometry read from machine-readable audit.
- [x] Feature CSS traced against current commit.
- [x] Visual governance traced against current commit.
- [x] Repo-authored rendered-review ledger distinguished from fresh inspection.
- [x] No claim that exact-zero golden implies aesthetic perfection.
- [x] No claim that this session directly viewed all repository PNG pixels.
- [x] No historical Task 50/early Task 51 defect presented as necessarily current without current evidence.
- [x] Domain-specific geometry distinguished from unjustified ordinary-UI divergence.

---

**End of Phase 3 report.**
