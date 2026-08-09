# LIFEWEAVE — PHASE 5 NORTH-STAR CONVERGENCE

**Project:** `kieran-lucas/lifeweave-desktop`  
**Frozen baseline:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Scope:** frontend presentation and interaction architecture only  
**Primary target:** Light theme on Windows/Tauri/WebView2  
**Status:** NORTH STAR LOCKED  
**Date:** 2026-08-10

---

## 0. Executive decision

The winning North Star is:

# **Lifeweave — Quiet Precision Atlas**

A calm, high-precision productivity workspace with two deliberate visual registers:

1. **Productive register** — dense operational UI: Today, Calendar, Analytics, Focus Plans, Settings, Search, dialogs, controls.
2. **Editorial register** — reflective/knowledge UI: Life Reader, Narrative Reader, authored document content, selected expressive moments in Life System.

The product must not look like a generic modern “vibe app”. Its identity must come primarily from:

- exact spatial rhythm;
- unusually disciplined typography;
- strong information hierarchy;
- minimal but unmistakable blue identity;
- high-quality interaction state transitions;
- domain-specific composition in Life / Graph / Reader / Narrative;
- near-absence of gratuitous decoration.

The surface model is **continuous and calm**, not a stack of cards. Persistent content should normally use solid/tonal planes and hairlines. Blur/glass is reserved for genuine floating depth or carefully justified transient layers.

This direction keeps the strongest parts of the current codebase — geometry authority, blue identity, tokenized appearance, motion vocabulary, semantic page frames, accessibility foundations — while removing the remaining private visual dialects.

---

# 1. Why Phase 5 exists

Phase 4 established that the remaining problem is not lack of a design system. It is **convergence**.

The repository already has:

- a single page-width authority in `frontend/src/app/layout/`;
- a finite 4px-derived spacing ramp;
- a typed visual contract;
- a light-theme palette;
- shared radius/elevation roles;
- shared motion vocabulary;
- shared button primitives;
- shared state primitives;
- an icon vocabulary;
- deterministic geometry and visual regression infrastructure.

However, multiple production features still make private decisions about:

- typography size/weight;
- focus-ring thickness;
- field geometry;
- tab grammar;
- inline action grammar;
- local surface treatment;
- selected-row treatment;
- visibility helpers;
- dense metadata rhythm.

A mechanically consistent migration without a clear North Star could make the app **more uniform but not more exceptional**.

Phase 5 therefore answers one question:

> What should every later design decision optimize toward when several technically valid options exist?

---

# 2. Evidence used

## 2.1 Frozen repository evidence

All repository conclusions in this phase are based on baseline:

`a1078c1f91c251aaa7a453ef1e8a5108551c852d`

No later commit is treated as evidence.

Key authorities inspected:

- `docs/adr/0045-visual-experience-overhaul.md`
- `docs/audits/task-51-craft-coverage-ledger.md`
- `frontend/src/app/layout/tokens.css.ts`
- `frontend/src/app/layout/layout.css.ts`
- `frontend/src/app/App.css.ts`
- `frontend/src/design-system/visual/contract.css.ts`
- `frontend/src/design-system/visual/lightTheme.css.ts`
- `frontend/src/design-system/visual/typography.css.ts`
- `frontend/src/design-system/visual/globalType.css.ts`
- `frontend/src/design-system/visual/atmosphere.css.ts`
- `frontend/src/design-system/visual/motion.css.ts`
- `frontend/src/design-system/primitives/controls.css.ts`
- `frontend/src/design-system/primitives/States.tsx`
- `screenshoots/README.md`
- `screenshoots/capture-audit.json`

Representative feature implementations inspected:

- Today / Task Inspector
- Calendar
- Analytics
- Focus Plans
- Life Browse
- Life Edit
- Life Graph
- Basic Reader / Editor
- Narrative Reader / Studio
- Search
- Settings / Tags / Backup

## 2.2 Screenshot evidence boundary

`screenshoots/README.md` states that the directory contains 53 current light-theme screenshots from one real maximized Windows production walk.

`capture-audit.json` records the canonical environment as approximately:

- WebView: 1536 × 794
- DPR: 1.25
- Windows scaling: 125%
- theme: light
- 53 states
- zero semantic collisions
- zero document overflow
- zero viewport overflow

This is strong proof of geometry integrity.

It is **not** proof of endgame visual quality.

The current connector exposes repository PNG bytes as binary/base64 rather than a directly renderable visual surface in this session. Therefore this report does not pretend to have made pixel-level aesthetic judgments that were not directly observable. Visual conclusions are restricted to:

- repository-authored rendered-review evidence;
- measured geometry/state evidence;
- source-level visual grammar;
- established design principles;
- cross-surface consistency analysis.

This boundary is intentional.

---

# 3. External benchmark principles used

The target is not to copy another product. External systems are used as constraint and quality references.

## 3.1 Craft

Craft remains a **craftsmanship benchmark**, exactly as ADR 0045 later overrides specify.

What is worth borrowing as a quality standard:

- softness without loss of structure;
- content and chrome feeling like one authored system;
- excellent spacing discipline;
- editorial confidence;
- surfaces that feel designed rather than merely themed;
- refined detail at the level of text, controls, borders, and transitions.

What must not be copied:

- branded assets;
- product-specific composition;
- iconography;
- exact material styling;
- proprietary identity;
- card patterns used without semantic justification.

## 3.2 Apple HIG

Useful principles:

- layout should make important content easy to find;
- related objects should be grouped by space, tone, separators, or material;
- alignment should make scanning effortless;
- controls and content need visually intelligible separation;
- material exists to communicate hierarchy/depth, not to decorate everything;
- motion should communicate state and continuity.

The important takeaway for Lifeweave is not “use Liquid Glass”. It is:

> **Depth treatment must correspond to real hierarchy.**

## 3.3 Fluent 2

Useful principle:

> proximity and empty space establish relationships and hierarchy before extra decoration is needed.

This strongly supports keeping Lifeweave's 4px-derived geometric system and making semantic spacing more authoritative, not increasing card/enclosure count.

## 3.4 Carbon

Carbon's distinction between **productive** and **expressive/editorial** type systems is particularly relevant to Lifeweave.

Lifeweave contains both:

- high-frequency operational tooling;
- long-form reflective/editorial content.

Treating both with exactly the same typographic register leaves quality on the table.

This insight is incorporated into the selected North Star.

---

# 4. Candidate directions

Three directions were evaluated.

The scores below are **direction-fit scores**, not claims that a finished product already has these quality scores.

They use the previously defined 100-point rubric:

| Dimension | Weight |
|---|---:|
| Information hierarchy | 12 |
| Macro composition | 10 |
| Grid / alignment | 9 |
| Spacing / rhythm | 10 |
| Typography | 8 |
| Color / surface | 7 |
| Depth / effects | 6 |
| Component consistency | 8 |
| Cross-screen coherence | 12 |
| Interaction / states | 7 |
| Motion / spatial continuity | 4 |
| Accessibility | 4 |
| Distinctive art direction | 3 |
| **Total** | **100** |

---

## Direction A — Craft-forward editorial softness

### Character

- soft materials;
- generous rounded surfaces;
- editorial type used frequently;
- highly polished document-like composition;
- lower visual density.

### Strengths

- strong immediate beauty;
- naturally premium;
- good fit for Reader and Narrative;
- easy to make screenshots attractive.

### Weaknesses

- Today / Calendar / Analytics / Settings risk becoming too soft and spacious;
- could feel derivative of Craft;
- can encourage over-enclosure and cardification;
- can make operational tools feel slower or less precise;
- increases risk that “premium” gets confused with “rounded + soft + serif”.

### Direction-fit score

**84 / 100**

### Decision

Rejected as the global system.

Selected ideas are retained only where semantically appropriate.

---

## Direction B — Luminous spatial / glass-forward atlas

### Character

- translucent surfaces;
- peripheral glow;
- atmospheric depth;
- more visible motion;
- visual emphasis on layers and spatial state.

### Strengths

- distinctive;
- potentially excellent for Life Graph / spatial traversal;
- can make master-detail transitions feel alive;
- strongly differentiates the app from plain productivity software.

### Weaknesses

- highest risk of “vibe app” aesthetics;
- blur can become an aesthetic crutch;
- visual complexity competes with dense task data;
- persistent glass weakens text-plane stability;
- greater GPU/compositor cost;
- effects can age faster than typography/geometry;
- makes Settings, Search, tables, and forms unnecessarily theatrical.

### Direction-fit score

**77 / 100**

### Decision

Rejected as the global system.

Spatial motion and limited floating material remain useful as local techniques.

---

## Direction C — Quiet Precision Atlas

### Character

- continuous near-white workspace;
- one strong blue identity;
- hierarchy primarily through spacing, alignment and typography;
- productive and editorial registers;
- solid/tonal persistent surfaces;
- glass/blur only for genuine floating depth;
- extremely restrained shadow;
- domain-specific composition where it earns its complexity;
- motion is precise and state-driven.

### Strengths

- best match for a tool used for hours;
- preserves density without feeling utilitarian;
- scales from Today to Reader to Graph;
- distinctive without relying on trends;
- fits Windows while remaining unmistakably Lifeweave;
- minimizes visual debt;
- works with the existing geometry architecture;
- supports exceptional text quality;
- keeps interaction fast and confident;
- has the lowest risk of cheap “AI-generated UI” signatures.

### Weaknesses

- harder to execute well because flaws cannot hide behind effects;
- 1–2 px spacing/alignment/type mistakes become more visible;
- requires strict primitive adoption;
- demands excellent empty states and edge states;
- requires more optical judgment than a card-based system.

### Direction-fit score

**95 / 100**

### Decision

# **SELECTED AND LOCKED**

---

# 5. North-Star statement

Lifeweave should feel like a **precision instrument for structuring a life**, not a dashboard template and not a decorative notebook.

The interface is quiet because the user's information is the protagonist.

It is premium because every relationship appears intentional:

- where a heading starts;
- how far a description sits below it;
- how a selected row differs from a resting row;
- how a field aligns with its label;
- how a panel enters and exits;
- how a timeline line meets a node;
- how a document changes from reading to editing;
- how metadata recedes without becoming illegible;
- how an empty state occupies space;
- how controls become visible exactly when needed.

The app should never need a large decorative effect to prove that it was designed.

---

# 6. Non-negotiable art-direction laws

## 6.1 Content beats chrome

If a visual treatment makes the UI itself more noticeable than the user's task, document, plan, graph, or data, it must justify itself.

Default answer: remove it.

## 6.2 Space before boxes

Hierarchy order:

1. spacing;
2. alignment;
3. typography;
4. tonal contrast;
5. hairline;
6. elevation/material.

A new rectangle is not the default grouping mechanism.

## 6.3 Persistent surfaces are stable

Main workspace content should normally be:

- opaque or near-opaque;
- low chroma;
- free of obvious blur;
- free of large shadow;
- visually stable during scrolling.

## 6.4 Glass represents actual depth

Backdrop blur / glass is allowed primarily for:

- popovers;
- floating menus;
- modal surfaces;
- drag overlays;
- transient inspector-like floating states when the geometry actually leaves the base plane.

It is not the default treatment for every card, row group, sidebar section, or content region.

## 6.5 One blue identity

The saturated Lifeweave blue remains the dominant interactive identity.

Blue communicates:

- current destination;
- active tab;
- focus/state where appropriate;
- primary action;
- selected/active semantic state;
- task completion where current product semantics require it.

Blue must not become ambient wallpaper.

## 6.6 Red is semantic, not decorative

Danger/destructive actions may use red.

Red should not leak into neutral information hierarchy.

## 6.7 Effects never compensate for weak hierarchy

No glow, gradient, shadow, blur or animation may be added merely because a surface feels visually flat.

First investigate:

- scale;
- placement;
- whitespace;
- grouping;
- alignment;
- type role;
- density.

## 6.8 No generic gradient hero areas

No decorative top-of-page gradient field on operational screens.

No abstract glowing blobs behind Today / Calendar / Analytics / Settings just to make screenshots feel richer.

## 6.9 No dashboard-card reflex

Analytics may use bounded regions when comparison genuinely benefits from containment.

But a metric is not automatically a card.

A section is not automatically a card.

A group of controls is not automatically a card.

## 6.10 Optical quality outranks literal token purity

Tokens are the default.

A documented optical correction is allowed when the token-perfect version is visibly worse.

The exception must be:

- local;
- intentional;
- measurable or visually evidenced;
- not a new competing system.

---

# 7. Typography North Star

This is one of the most important changes from the current broad global type behavior.

## 7.1 Use two registers deliberately

### Productive register

Use Segoe UI Variable optical-size families for:

- shell;
- sidebar;
- Today;
- Calendar;
- Analytics;
- Focus Plans;
- Settings;
- Search;
- dialogs;
- forms;
- dense metadata;
- table/list UI;
- control labels;
- graph controls;
- editor chrome.

### Editorial register

Use Literata Variable for:

- Basic Reader authored body;
- Narrative Reader authored body;
- long-form authored document headings;
- selected expressive headings inside knowledge surfaces;
- deliberately reflective Life System moments where text is content rather than chrome.

## 7.2 Stop mapping HTML heading level directly to art direction

The current global system applies expressive roles to generic heading elements.

For an endgame product, semantic HTML and visual role must remain related but not identical.

Example:

- `<h1>` in Analytics is semantic page title but visually productive.
- `<h1>` inside an authored Narrative document may be editorial.
- `<h2>` in Settings is a repeated structural heading and must not look like a story headline.

Therefore Phase 6 should define explicit role classes/recipes rather than relying on generic `h1/h2/h3` to select expressive appearance.

## 7.3 Preserve the excellent parts of the current type contract

Current strengths worth retaining:

- Segoe UI Variable Small / Text / Display optical-size separation;
- 14.5px productive body/row band;
- 12.5px metadata band;
- tabular numerals;
- dedicated metric numerals;
- mono role;
- Literata subsetting and Vietnamese support;
- role-based line-height/tracking.

## 7.4 Proposed role taxonomy for Phase 6

Not final values yet; final values belong in Phase 6.

```text
productive.pageTitle
productive.objectTitle
productive.sectionTitle
productive.cardTitle
productive.body
productive.bodyStrong
productive.compact
productive.row
productive.label
productive.metadata
productive.caption
productive.eyebrow
productive.metric
productive.numeric

editorial.display
editorial.documentTitle
editorial.documentH1
editorial.documentH2
editorial.documentH3
editorial.body
editorial.caption

control.button
control.tab
control.navigation
control.field
code.inline
code.block
```

## 7.5 Hard rule

Feature CSS should not invent font sizes where an existing role applies.

Phase 6 should define a ratchet that makes this enforceable.

---

# 8. Spacing North Star

The existing 4px-derived ramp is good and should remain.

Current authority:

```text
4
8
12
16
24
32
48
64
```

Current semantic aliases:

```text
control  8
field    16
group    24
section  32
page     64
```

## 8.1 Keep the scale

Do not replace it with a new fashionable scale.

## 8.2 Improve semantic application

The main problem is not the numbers.

The problem is when feature CSS still uses private values such as:

- 5;
- 6;
- 7;
- 10;
- 14;
- 20;
- miscellaneous rem values;

for relationships that already have semantic meaning.

## 8.3 Relationship-based spacing

Every gap should answer a relationship question.

### 4px

Micro-affinity.

Examples:

- icon-to-short-label correction;
- label-to-count;
- tightly coupled metadata.

### 8px

Control relationship.

Examples:

- button group;
- inline controls;
- chip clusters;
- row sub-elements.

### 12px

Intermediate optical gap.

Allowed in bounded components where 8 is cramped and 16 breaks grouping.

Do not promote it into a universal semantic level unless evidence proves repeated need.

### 16px

Field/content unit.

Examples:

- label group to field group;
- compact panel interior grouping.

### 24px

One conceptual group to another.

### 32px

Major section separation.

### 48–64px

Page-scale breathing room.

## 8.4 Uneven rhythm is intentional

Endgame spacing is not “same gap everywhere”.

Correct example:

```text
Title
  6–8px
Description
  16–24px
Controls / content
  32px
Next major section
```

The important part is the **ratio of relationships**.

---

# 9. Surface / material North Star

## 9.1 Layer model

Use a finite depth model:

```text
L0  app canvas
L1  persistent workspace region
L2  bounded content region
L3  selected / active local region
L4  inspector / raised utility
L5  popover / menu
L6  modal
L7  drag / transient top layer
```

Not every layer requires a different background.

Depth can be communicated through:

- whitespace;
- hairline;
- tone;
- stacking order;
- occlusion;
- shadow only at genuine elevation.

## 9.2 Persistent content

Preferred treatment:

- solid or near-solid near-white;
- 1px low-contrast hairline when containment is needed;
- radius consistent with object scale;
- no large shadow;
- no visible blur.

## 9.3 Floating surfaces

Allowed treatment:

- stronger surface separation;
- subtle shadow;
- optionally restrained blur if it improves depth perception and remains performant;
- clear focus containment.

## 9.4 Current `glass` / `glassStrong`

These should not be deleted reflexively.

Phase 6 should reclassify consumers:

```text
persistent consumer  -> tonalPersistentSurface
floating consumer    -> glass / floatingSurface
```

The design primitive should express semantics, not the implementation effect name.

For example, a component should conceptually ask for `floatingSurface`, not “blur me”.

---

# 10. Radius North Star

Current roles:

```text
small     6px
control  10px
surface  14px
floating 18px
full    999px
```

This progression is fundamentally sound.

Keep it unless direct rendered evidence proves a specific role wrong.

Important rule:

> Radius follows object scale and depth, not feature identity.

No Focus Plans radius.

No Calendar radius.

No Narrative radius.

Only semantic radius roles.

---

# 11. Border / hairline North Star

Hairlines are structural punctuation.

They should be used when spacing alone cannot sufficiently communicate the relationship.

Preferred order:

1. space;
2. tonal change;
3. hairline;
4. elevation.

Avoid:

- border around every field group;
- border inside card inside another border;
- selected fill + strong outline + shadow simultaneously;
- dashed border as decorative personality except where “drop/import/create placeholder” semantics justify it.

---

# 12. Shadow North Star

Persistent workspace content should normally use no elevation shadow.

Use shadow for real floating depth:

- popover;
- modal;
- drag overlay;
- transient detached panel.

Current `floating` and `modal` elevation roles are sufficient in shape.

Do not create a 5–8-level shadow ladder.

---

# 13. Motion North Star

The current motion vocabulary is one of the strongest parts of the system.

Current durations:

```text
press           70ms
state          100ms
check          140ms
popover        140ms
inspectorState 170ms
inspector      200ms
reorder        220ms
route          220ms
traversal      260ms
```

These should largely remain.

## 13.1 Motion laws

Motion must communicate one of:

- acknowledgement;
- continuity;
- reordering;
- spatial origin/destination;
- focus/change of state.

Otherwise it should not move.

## 13.2 Never gate state on animation

State commits first.

Motion settles second.

## 13.3 Avoid universal route theatrics

Ordinary destination switching should feel immediate.

Use spatial continuity where a mental model benefits:

- inspector appearing beside selected object;
- Life node traversal;
- list reordering;
- editor/reader continuity;
- graph-to-object transition where technically justified.

## 13.4 Reduced motion

Retain the existing philosophy:

- remove travel;
- preserve short tonal acknowledgement;
- no blanket `0.01ms` trick.

---

# 14. Interaction-state North Star

Every interactive primitive must define a finite state matrix.

For buttons:

```text
rest
hover
active
focus-visible
disabled
forced-colors
```

For selectable rows:

```text
rest
hover
selected
selected + hover
focus-visible
disabled / unavailable when applicable
```

For fields:

```text
rest
hover when relevant
focus-visible
invalid
disabled
read-only where applicable
```

For async regions:

```text
initial
loading
populated
empty
error
recovery / retry where applicable
```

A surface is not endgame if only its populated mouse state looks finished.

---

# 15. Focus treatment North Star

Current code still contains 2px and 3px feature-local outlines.

Phase 6 should establish one focus grammar.

Default:

- 2px focus ring;
- 2px offset where space allows;
- inset ring only where clipping/container geometry requires it;
- forced-colors maps to platform highlight semantics.

3px should require a specific perceptual reason.

Focus must not look like selection.

Selection must not look like focus.

---

# 16. Control North Star

The existing shared button primitive is strong and should become the authority.

Existing variants:

- primary;
- secondary;
- ghost;
- destructive;
- iconButton;
- compact.

Do not replace this with a component-library rewrite.

Phase 6 should add/clarify missing primitive families rather than re-author everything.

Needed families:

```text
Field
FieldLabel
FieldDescription
FieldError
Textarea
Select
Checkbox / Radio ownership wrapper only where useful
Tabs
ListSelectionRow
IconAction
DisclosureAction
VisuallyHidden
SectionIdentity
Status / Notice
```

Names are provisional; semantics are not.

---

# 17. Screen-family directives

These are North-Star directives, not the final pixel specification.

Exact values belong to Phase 6.

---

## 17.1 App Shell

### Preserve

- 260px expanded / 68px collapsed geometry unless rendered evidence proves otherwise;
- icon-led navigation;
- blue active identity;
- stable viewport gutters;
- native Windows title bar.

### Improve

- route nav typography should consume the productive navigation role;
- active state should rely on tone + icon/accent rather than extra chrome;
- group rhythm should be more deliberate than repeated 2px rows plus dividers;
- collapse control should feel part of shell grammar, not a footer afterthought;
- brand area should remain visually quiet.

### Avoid

- frosted sidebar for its own sake;
- oversized logo treatment;
- gradient brand block;
- excessive selected-state glow.

---

## 17.2 Today

Today is the operational North Star.

If Today is not excellent, the app is not excellent.

### Preserve

- wide frame;
- period structure;
- master/detail relationship;
- precise time alignment;
- blue completion semantics;
- current zero-overflow geometry.

### Improve

- persistent row groups should read as stable content, not decorative glass cards;
- task title must dominate metadata and chips;
- inspector should be clearly secondary but not visually disconnected;
- time column and task column need perfect baseline discipline;
- row actions should remain latent/quiet until relevant;
- selected task should use a low-noise state language distinct from keyboard focus;
- timer state must feel integrated rather than appended.

### Signature quality target

A full day with many tasks should still feel calm.

---

## 17.3 Calendar

Calendar is currently one of the strongest verified surfaces.

Treat it as a geometry anchor, not a redesign target.

### Preserve

- cell geometry;
- six-week stability;
- current progress/load treatment;
- selected/current/outside-day distinctions;
- navigation structure.

### Improve only when cross-system convergence requires it

Examples:

- shared type roles;
- shared focus treatment;
- shared buttons;
- shared metadata colors.

Do not “make Calendar more artistic” merely because other surfaces change.

---

## 17.4 Analytics

### Goal

Information-rich but not dashboard-template-like.

### Rules

- metrics get typographic prominence before card prominence;
- related metrics may share one bounded region rather than one card each;
- comparison structures should use alignment and shared baselines;
- color should encode semantic data/state, not decorate categories unnecessarily;
- large numbers use dedicated metric numeral role;
- tables and distributions should feel native to the same product as Today.

### Avoid

- SaaS dashboard card grid;
- multi-colored metric cards;
- shadows on every statistic;
- chart chrome heavier than the data.

---

## 17.5 Focus Plans

Focus Plans is a major convergence hotspot.

Current code still owns private:

- heading size;
- tabs;
- fieldset treatment;
- input geometry;
- muted/draft sizes;
- variant tabs;
- phase-list rhythm;
- visually-hidden implementation.

### Target

A serious planning workspace, not a form page.

### Composition

- plan portfolio rail = navigation / selection;
- detail = object workspace;
- lifecycle/variant tabs = shared low-chrome tab grammar;
- plan identity = productive object title;
- fields grouped by task meaning, not by bordered boxes;
- phases should read as a sequence, not spreadsheet debris.

### Strong recommendation

Do not solve Focus Plans locally.

Primitive convergence must land first.

---

## 17.6 Life Browse

Life Browse is one of the product's identity surfaces.

It is allowed to be more spatial than Today.

### Target

A navigable conceptual map that still belongs to Lifeweave.

### Rules

- focal node should feel like the current context, not a giant card;
- children read as choices/branches;
- connectors remain quiet and structural;
- large empty space is allowed because it communicates topology;
- object titles may use editorial register selectively;
- controls/navigation remain productive sans;
- pin/read/edit affordances must not compete with node identity.

---

## 17.7 Life Edit

Life Edit is an instrument.

Its canvas is domain-specific and should not be forced into generic form-layout patterns.

### Preserve

- independent local scroll;
- absolute/spatial node geometry;
- drag semantics;
- canvas + bounded inspector split.

### Converge

- inspector controls;
- buttons;
- focus ring;
- labels;
- input styling;
- status text;
- archived list;
- metadata type;
- visually hidden utility.

### Canvas rule

Node geometry may retain domain-specific dimensions.

Do not force every node dimension through global spacing tokens if doing so damages the graph's spatial legibility.

Geometry exception is legitimate here.

Visual grammar exception is not.

---

## 17.8 Life Graph

### Target

Precise spatial visualization, not a colorful mind-map toy.

### Rules

- neutral nodes by default;
- blue for current selection/focus semantic state;
- relationship edges remain subordinate;
- labels must be readable before decorative node color is considered;
- details rail uses shared inspector/list grammar;
- dense graph must not become a pastel confetti field;
- no glow halo around every node.

---

## 17.9 Basic Reader

This is the strongest home for the editorial register.

### Preserve

- 768px reading measure unless evidence proves a specific content class needs otherwise;
- Literata long-form body;
- outline architecture;
- strong authored-heading hierarchy.

### Improve

- utility/actions should recede from the reading plane;
- document title/body relationship should be exceptional;
- links/related-task panels must not turn the reading experience into a dashboard;
- recovery/error states need the same editorial polish.

---

## 17.10 Basic Editor

### Target

Reader continuity with authoring affordances layered onto it.

### Rules

- preserve content measure where practical;
- toolbar stays quiet and sticky only when useful;
- authored body remains editorial;
- chrome remains productive sans;
- selection/caret/focus states must be visually exact;
- editor border should not create “document inside a card inside Reader” unless containment is truly needed.

---

## 17.11 Narrative Reader

Narrative is allowed the highest expressive range in the app.

But its expressiveness must come from authored content and world semantics, not random chrome.

### Rules

- reader body belongs to editorial register;
- metric blocks can have stronger typographic contrast;
- callouts/timelines use structural rules rather than heavy card decoration;
- images are content, never background decoration;
- visual-world variations must not destroy shell consistency;
- Narrative chrome remains recognizably Lifeweave.

---

## 17.12 Narrative Studio

This is the most important unresolved width/composition question.

Current evidence:

- Studio is reached inside the Reader path;
- Reader uses the 768px `reading` frame;
- Studio contains scene tabs, block editors, timeline/image/metric controls and drag actions;
- coverage ledger still marks populated-block, drag, save/error, and forced-color states incomplete.

### Decision

Do **not** widen Studio merely because 768px looks suspicious in source.

Phase 6 must define a deterministic populated stress fixture.

Then:

```text
if 768px maintains clean hierarchy + low wrap pressure + no control compression:
    keep reading frame
else if failure is caused by editor-tool density rather than bad component design:
    switch Studio only to standard frame
else:
    repair primitives/composition and retest before changing page width
```

Page-width authority must remain centralized.

No local `max-width` workaround.

---

## 17.13 Search

Search is an execution surface.

It should feel extremely fast and precise.

### Rules

- no editorial serif;
- no decorative glass beyond real modal/floating context;
- search input is the dominant control;
- result hierarchy via type + spacing + grouping;
- keyboard-active result visually distinct from hover;
- match metadata quiet;
- no-result state intentionally composed;
- close action subordinate.

---

## 17.14 Settings

Settings should be calm, dense, and boring in the best sense.

Premium Settings means:

- impeccable grouping;
- perfect field alignment;
- exact labels/descriptions;
- restrained section hierarchy;
- no accidental card islands;
- destructive actions unmistakable but not loud until needed.

No extra visual personality is required here.

Consistency is the personality.

---

## 17.15 Dialogs / popovers / utility surfaces

These are where depth treatment may be strongest.

### Rules

- one modal grammar;
- one compact/standard/wide width authority;
- clear title/body/action hierarchy;
- no action-row ambiguity;
- focus containment visibly deliberate;
- backdrop should separate context without turning the entire app into a tinted scene;
- destructive confirmation clearly differentiated.

---

# 18. Empty/loading/error state North Star

Current coverage still leaves many state families partial.

This matters because generic empty/error states are one of the easiest ways for an otherwise premium app to reveal implementation seams.

## Empty state

Should contain only what is needed:

- identity;
- short explanation;
- one useful next action where possible.

Avoid giant illustration by default.

## Loading state

Use structure-preserving skeleton or compact progress only where duration warrants it.

Do not animate entire screens continuously.

## Error state

Must preserve context.

User should understand:

- what failed;
- what remains safe;
- what they can do next.

This is especially important in Life, Reader, import/export and backup flows.

---

# 19. Icon North Star

Icons are functional vocabulary, not decoration.

Rules:

- one icon system;
- no Unicode glyph icons;
- consistent optical weight;
- size follows context;
- icon-only controls must preserve hit target;
- icon + text spacing should use a small finite grammar;
- active icon may take blue when the label/state relationship supports it.

Avoid filled icon tiles unless the tile itself carries semantic meaning.

---

# 20. Blue identity strategy

The current blue anchor is strong and should remain.

Use it sparingly enough that blue keeps meaning.

## High-strength blue

- primary action;
- active navigation icon;
- active tab indicator/text where appropriate;
- focus ring;
- key selected/completed state.

## Low-strength blue

- selected tonal background;
- hover tint when a blue relationship is useful;
- semantic link/annotation.

## Do not use blue for

- large decorative page backgrounds;
- every chip;
- every card border;
- ambient top gradients;
- normal neutral metadata.

---

# 21. Density strategy

Lifeweave is not a marketing page.

It is a tool used for sustained work.

Therefore the North Star targets **calm density**, not maximum whitespace.

## Calm density means

- text remains comfortably readable;
- rows can hold substantial information;
- metadata is compact;
- repeated controls do not dominate;
- major sections breathe;
- minor relationships remain tight;
- long lists maintain scan rhythm;
- action affordances do not require large card surfaces.

---

# 22. What makes this direction distinctive

The app should not attempt to win uniqueness through novelty effects.

Distinctiveness should emerge from the combination of:

1. a life-structure spatial domain;
2. a disciplined operational workspace;
3. an editorial knowledge layer;
4. one precise blue identity;
5. exceptionally consistent geometry;
6. unusually strong Windows typography;
7. state-first motion;
8. low-enclosure visual grammar;
9. excellent edge-state craftsmanship.

This combination is difficult to confuse with a generic template even if individual primitives are familiar.

---

# 23. Explicit anti-goals

The final app must **not** become:

## 23.1 Generic AI SaaS

Symptoms:

- gradient blobs;
- floating rounded cards everywhere;
- huge empty hero header;
- pastel chips;
- glow around selected objects;
- pill buttons for every action;
- exaggerated corner radius;
- decorative blur.

## 23.2 Notion clone

Avoid:

- bare black-white page with generic document chrome;
- text-only identity;
- every interaction hidden until hover without sufficient discoverability.

## 23.3 Craft clone

Craft is a quality benchmark, not a target composition.

## 23.4 Linear clone

Do not turn Lifeweave into a dark/technical issue-tracker grammar with tiny condensed density and command-first identity.

## 23.5 Fluent skin

Windows compatibility is valuable.

Lifeweave should not simply look like a stock Microsoft sample app.

## 23.6 Glass demo

No surface exists to demonstrate blur.

## 23.7 Dashboard template

Analytics must not dictate the visual language of the rest of the product.

---

# 24. North-Star acceptance tests

Before a future design proposal is accepted, ask:

## Hierarchy

Can the primary object/action be identified in under one glance?

## Relationship

Could one border/card be removed and the grouping still remain obvious through spacing and alignment?

If yes, remove it.

## Typography

Does this text use a semantic role, or did the feature choose a size?

## Surface

Is this material persistent or actually floating?

If persistent, why does it need blur/shadow?

## Color

Does blue have semantic meaning here?

## Motion

What state or spatial relationship does this movement explain?

## Density

Did we create whitespace because it improves comprehension, or because “premium UI has whitespace”?

## Identity

Would this screen still look intentionally Lifeweave if all gradients and shadows were disabled?

The correct answer should be yes.

---

# 25. Architecture consequences for Phase 6

Phase 6 should specify — not yet implement — the following target contracts.

## 25.1 Typography contract vNext

Separate:

- productive roles;
- editorial roles;
- control roles.

Remove global heading-tag dependence where it forces the wrong visual register.

## 25.2 Surface contract vNext

Semantic surface primitives:

```text
canvas
persistent
persistentStrong
selected
floating
modal
```

Effect implementation remains internal.

## 25.3 Control primitives

Complete missing authority for:

- fields;
- tabs;
- selection rows;
- icon actions;
- visually hidden;
- notices/status.

## 25.4 Convergence ratchet

The existing ratchet already rejects raw:

- color;
- radius;
- shadow;
- motion.

Phase 6 should add controlled detection for:

- unapproved feature-local font sizes;
- duplicated visually-hidden recipes;
- feature-local focus-ring thickness;
- feature-local button recipes;
- feature-local ordinary field recipes;
- feature-local generic tab recipes.

Domain-specific geometry must remain exempt when justified.

## 25.5 Light-only execution scope

Dark theme is not a redesign target.

Changes should avoid needlessly breaking it, but no design time should be spent polishing dark mode in this project scope.

Final acceptance focuses on Light.

---

# 26. Phase-6 specification order

Phase 6 should be authored in this exact order:

```text
1. visual laws
2. typography roles
3. spacing relationships
4. surface/depth semantics
5. control primitives
6. selection/focus grammar
7. state grammar
8. motion grammar
9. shell directives
10. operational surfaces
11. Life spatial surfaces
12. Reader/Editor
13. Narrative
14. Search/Settings/utilities
15. responsive rules
16. accessibility rules
17. exception registry
18. acceptance screenshots/states
```

Do not start implementation before the Phase 6 spec has closed these decisions.

---

# 27. Keystone surfaces for final design validation

The final design system must prove itself on a small representative set before full migration.

Chosen keystones:

## K1 — Today populated + selected inspector

Proves:

- shell;
- dense list;
- time rhythm;
- metadata;
- selection;
- split workspace;
- inspector;
- shared controls.

## K2 — Calendar

Proves:

- dense grid;
- repeated controls;
- state hierarchy;
- stable geometry.

Calendar is primarily a regression anchor because it is already strong.

## K3 — Focus Plans selected detail

Proves:

- master/detail;
- forms;
- tabs;
- object identity;
- deep controls;
- planning density.

## K4 — Life Browse / Life Edit

Proves:

- domain-specific spatial identity;
- node treatment;
- inspector convergence;
- productive/editorial boundary.

## K5 — Basic Reader + Narrative Reader

Proves:

- editorial register;
- reading measure;
- authored content;
- knowledge identity.

## K6 — Search or Settings

Proves:

- utilitarian discipline;
- form/result density;
- absence of unnecessary effects.

If one design system works brilliantly across all six, it is likely robust enough for the full application.

---

# 28. Decision on user approval

No additional user art-direction choice is required at this phase.

Reason:

- Direction A is aesthetically strong but too derivative and too soft as a global operational language.
- Direction B conflicts directly with the anti-vibe constraint and introduces unnecessary performance/visual risk.
- Direction C dominates on cross-screen scalability, product semantics, implementation fit, long-session usability, and distinctive-but-timeless identity.

Therefore the assistant should not ask the user to pick among inferior or artificially equalized alternatives.

---

# 29. Locked North-Star summary

## Identity

**Cool near-white + Lifeweave blue + exact typography + calm spatial structure.**

## Productive register

Segoe UI Variable, dense, precise, low-chrome.

## Editorial register

Literata, reflective, authored, limited to content/knowledge contexts.

## Grouping

Space first.

## Persistent surfaces

Tonal/solid.

## Floating surfaces

Material/elevation allowed.

## Effects

Rare and semantic.

## Motion

State-first, short, spatial only when it improves mental continuity.

## Cards

Exception, not default structure.

## Blue

Identity and state, not wallpaper.

## Distinction

Comes from coherence and Lifeweave-specific spatial/content composition, not visual gimmicks.

---

# 30. Phase status

```text
Phase 0  Quality Contract                         COMPLETE
Phase 1  Frozen Baseline                          COMPLETE
Phase 2  Architecture Trace                       COMPLETE
Phase 3  Visual Evidence Audit                    COMPLETE
Phase 4  Convergence Blueprint                    COMPLETE
Phase 5  North-Star Convergence                   COMPLETE / LOCKED
Phase 6  Endgame Design Specification             NEXT
Phase 7  Migration DAG + Finite Coverage Ledger   PENDING
Phase 8  Master Spec + Bounded Stage Prompts       PENDING
Phase 9  Stage Execution + Verification            PENDING
Phase 10 One Final Adversarial Pass + Freeze       PENDING
```

---

# 31. Next action

Proceed to **Phase 6 — Endgame Design Specification**.

Phase 6 must turn this North Star into an implementation-independent target specification with explicit:

- token roles;
- component grammar;
- typography role mapping;
- spacing rules;
- surface/depth rules;
- focus/selection rules;
- motion/state rules;
- per-screen directives;
- exception registry;
- acceptance criteria;
- keystone validation matrix.

No backend change is authorized.

No dark-theme redesign is required.

No implementation should begin until Phase 6 is sufficiently specific that an implementation agent does not need to make major art-direction decisions on its own.

---

## END OF PHASE 5

**North Star:** `QUIET PRECISION ATLAS`  
**Status:** `LOCKED`  
**Next:** `PHASE 6 — ENDGAME DESIGN SPECIFICATION`
