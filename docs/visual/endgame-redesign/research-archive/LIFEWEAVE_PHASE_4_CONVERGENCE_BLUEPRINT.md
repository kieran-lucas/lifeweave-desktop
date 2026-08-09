# Lifeweave Desktop — Phase 4 Convergence Blueprint & Endgame Lock

**Repository:** `kieran-lucas/lifeweave-desktop`  
**Audited branch:** `main`  
**Frozen commit:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Blueprint date:** 2026-08-10 (Asia/Bangkok)  
**Phase:** 4 — Convergence Blueprint + Endgame Lock  
**Predecessor:** `LIFEWEAVE_PHASE_3_VISUAL_EVIDENCE_AUDIT.md`

---

# 0. Executive decision

Phase 4 should **not** be another visual redesign. The repository already has the hard parts that should remain stable:

- one geometry authority under `frontend/src/app/layout/`;
- a typed appearance authority under `frontend/src/design-system/visual/`;
- a mature blue Lifeweave identity;
- a semantic typography vocabulary;
- shared button variants and global native-control treatment;
- strong Windows/WebView2 geometry and visual-regression evidence;
- a Craft-class benchmark that explicitly allows reversible quality improvements without another Product Owner visual-lock ceremony.

The remaining structural weakness is narrower:

> **Ordinary UI presentation still has too many owners.**

A feature should own the geometry and semantics that make it unique. It should not need to invent another 12px metadata role, another secondary button, another focus ring, another form-field material, or another underlined tab merely because it lives in another directory.

The correct Phase 4 sequence is therefore:

```text
freeze current visual authority
        ↓
measure convergence residue
        ↓
close missing shared primitives
        ↓
migrate feature families through those primitives
        ↓
close unreviewed edge states
        ↓
re-run geometry + accessibility + visual regression + performance
        ↓
regenerate production evidence
        ↓
ENDGAME LOCK = evidence-backed closure, not another aesthetic approval phrase
```

The central operational rule is:

> **Primitive-first, family-second, screen-last.**

Do not restyle Focus Plans, then Life Graph, then Search independently. That merely replaces one set of local dialects with another. Establish the shared grammar first, then let each family retain only its genuinely domain-specific composition.

---

# 1. Phase 3 erratum — current visual source of truth

Phase 3 correctly identified the convergence problem, but one art-direction sentence in that report reflects an older historical layer of Task 51 and must not be used as the Phase 4 implementation authority.

## 1.1 What is current

At frozen commit `a1078c1f…`, `frontend/src/design-system/visual/lightTheme.css.ts` explicitly states that the old warm-neutral v1 palette was replaced. The production light theme currently resolves to a **cool near-white plane with a saturated blue identity**, including:

```text
canvas                 #FCFCFD
surface/sidebar        near-white / cool-neutral hierarchy
accent                 #1157CE
completion             blue, not green
Today ambient field    not rendered
```

The current source also retains the finite radius/elevation/hairline contracts and near-neutral hierarchy.

## 1.2 How v1, v2, and Craft relate

The history is layered rather than contradictory when read chronologically:

1. **v1** established the first approved visual lock.
2. **v2** superseded v1 in palette/type/ornament while retaining proven structure.
3. **Craft-class override** later reopened every production surface and shared primitive for craftsmanship review and removed v2 as a ceiling on quality.
4. The Craft override **did not remove Lifeweave's blue identity, product semantics, proven geometry, accessibility obligations, or measured runtime quality** as authorities.

The present implementation also uses the current typography authority rather than blindly following the historical v2 sentence that titles should be sans. `globalType.css.ts` routes h1/h2/h3 through the current semantic type roles, while the typography contract uses Segoe UI Variable for dense UI and the authorized Literata family for editorial roles.

## 1.3 Phase 4 authority stack

For implementation decisions, use this precedence:

```text
1. explicit current Product Owner decisions / Craft overrides
2. real product semantics and accessibility
3. Task 50 geometry invariants and finite PageFrame taxonomy
4. current typed visual + typography + motion authorities
5. current rendered production evidence
6. historical v2/v1 details only where they remain compatible
```

Do **not** revive an older palette or type rule merely because it appears earlier in ADR 0045's history.

## 1.4 Audit preservation rule

Do not silently rewrite the Phase 3 artifact. Keep it as an audit record and carry this erratum forward in Phase 4. Historical evidence should remain traceable.

---

# 2. What is already solved — and must not be reopened casually

Phase 4 is an endgame convergence pass, not license to churn foundations.

## 2.1 Geometry authority

`PageFrame` already owns the finite page taxonomy:

```text
standard
wide
reading
```

Feature screens consume it rather than define page widths locally. This is one of the strongest parts of the architecture.

**Rule:** no fourth page width, no feature-local page `max-width`, no viewport-unit workaround, no negative-margin alignment hack.

If a real surface proves the current taxonomy insufficient, the evidence must first show that `standard`, `wide`, and `reading` cannot represent the requirement. Until then, the taxonomy is closed.

## 2.2 Visual token authority

The existing enforcement ratchet already drives these production residues to zero:

```text
raw color literals     0
raw radius literals    0
raw shadow literals    0
raw motion literals    0
```

That means Phase 4 is not primarily a token-cleanup project anymore.

## 2.3 Global typography floor

`globalType.css.ts` already routes:

```text
body               → text.body
h1                 → text.pageTitle
h2                 → text.objectTitle
h3                 → text.sectionTitle
h4–h6              → text.cardTitle
button/select      → text.button
input/textarea     → text.body
label              → text.label
```

This is excellent as a **floor**. Its intentional low specificity is also the source of the remaining convergence gap: local feature declarations still win.

## 2.4 Shared control system

`design-system/primitives/controls.css.ts` already provides:

```text
button.primary
button.secondary
button.ghost
button.destructive
iconButton
compact
```

The shared base also owns a coherent state matrix: rest, hover, active, focus-visible, disabled, reduced motion and forced colors.

The problem is not absence of a button system. The problem is incomplete adoption.

## 2.5 Shared states

Loading/empty/skeleton treatment already exists under the design-system primitives. Do not create a second generic state framework.

## 2.6 Proven visual/runtime infrastructure

The repository already contains:

- hardened multi-viewport geometry assertions;
- real production Windows/WebView2 capture walks;
- Task 51 visual/motion capture specifications;
- 105 tracked exact-zero goldens across established visual axes;
- forced-colors and Vietnamese typography proof;
- reduced-motion evidence;
- performance budgets.

Phase 4 should extend and close this evidence, not replace it.

---

# 3. The missing architectural layer

The design system currently has a sophisticated `visual/` directory but a relatively small `primitives/` layer. At this snapshot the primitive directory contains essentially:

```text
States.tsx
states.css.ts
controls.css.ts
```

That leaves a large middle zone where ordinary interface grammar is still authored inside features.

## 3.1 Symptoms

Code search surfaces raw `fontSize` declarations across many production files, including Task, Calendar, Analytics, Focus Plans, Life, Graph, Search, Tags, Backup, Foundation, Reader/Editor, Narrative and more.

Likewise, local button recipes still exist in multiple feature families even though shared primary/secondary/ghost/destructive variants are already available.

Examples:

- `TagPicker.css.ts` defines local trigger/create/done/retry buttons and its own 11/12/13px text hierarchy.
- `TaskInspector.css.ts` defines local close-button, tab, link and typography recipes.
- `TodayScreen.css.ts` still contains local row-edit, timer and metadata/control styles.
- `LifeEditWorkspace.css.ts` and `LifeGraph.css.ts` own ordinary inspector fields/buttons/focus treatment in addition to legitimate spatial-canvas geometry.
- `BackupSettings.css.ts` defines primary/secondary buttons even though shared button variants exist.
- `GlobalSearchDialog.css.ts` defines its own close-button and multiple local text tiers.

These are not necessarily ugly in isolation. The defect is **ownership multiplicity**.

## 3.2 Why this matters even when screenshots look coherent

Visual regression answers:

> “Did pixels change unexpectedly?”

It does not answer:

> “Can two future features independently make the same ordinary UI decision?”

A screen may be visually excellent today and still contain architecture that guarantees drift tomorrow.

## 3.3 The target ownership model

After convergence:

```text
app/layout/
    owns page geometry, spacing authority, split geometry, dialog geometry, scroll ownership

design-system/visual/
    owns color, type roles, radii, elevation, hairlines, motion, icons, atmosphere

design-system/primitives/
    owns ordinary reusable UI grammar and its interaction state matrix

features/*
    own domain semantics, domain layout, special visualization geometry, data-specific composition
```

A feature may still legitimately own:

- Life Graph node coordinates and edge styling;
- Narrative scene/block composition;
- Calendar cell structure;
- Today timeline/domain grouping;
- drag-and-drop spatial overlays;
- graph/canvas viewport sizing;
- highly specific semantic status presentation where no generic primitive is appropriate.

A feature should not ordinarily own:

- another standard primary/secondary button skin;
- another generic field border/background;
- another standard focus ring;
- another metadata/body/control font size;
- another generic tab underline pattern;
- another generic visually-hidden recipe;
- another generic error/help text recipe.

---

# 4. Canonical migration exemplar

`frontend/src/features/life/document/BasicLeafDocument.css.ts` is the strongest existing model for the Phase 4 migration style.

It already:

- composes `sharedButton.secondary` and `sharedButton.primary`;
- uses `text.editorBody`, `text.metadata`, and `text.sectionTitle` explicitly;
- keeps the document/editor-specific geometry locally;
- retains specialized editor surfaces only where the domain warrants them.

That is exactly the desired end state:

> **Consume authority for ordinary presentation; own only domain-specific composition.**

Do not invent a new abstract component library unless the existing role/variant system genuinely cannot express a repeated need.

---

# 5. Phase 4 primitive-closure plan

The primitive pass must happen before large feature migrations.

## 5.1 P0 — typography convergence authority

### Goal

Make “a surface picks a role; it never picks a size” true in ordinary production UI rather than only aspirational.

### Migration rule

Replace ordinary raw typography choices with existing semantic roles from `typography.css.ts`:

```text
pageTitle
objectTitle
sectionTitle
cardTitle
editorBody / editorH1 / editorH2 / editorH3
row
body
bodyStrong
compactBody
button
navigation
tab
label
metadata
caption
eyebrow
numeric
numericMetric
code
```

### Do not do this

Do not translate every historical literal into a new token:

```text
11px  → text11
12px  → text12
13px  → text13
14px  → text14
```

That would encode the old fragmentation into a new namespace.

### Candidate new roles — only after census proves reuse

Potential gaps to test, not automatic additions:

1. **`numericFact`** — if multiple surfaces repeatedly need a medium-sized tabular number between body and `numericMetric`.
2. **`statusCaps`** — if timer/status/assessment badges repeatedly need the same compact uppercase treatment.
3. **`objectTitleCompact`** — only if multiple bounded inspectors objectively cannot use the current object-title role without compromising density.

A new role needs at least two real consumers or one very clear semantic class with repeated future use.

### Explicit exclusions

These should not count as typographic residue:

- icon SVG dimensions;
- graph node dimensions;
- image/canvas sizing;
- purely geometric dimensions unrelated to text.

---

## 5.2 P0 — shared control convergence

### Existing authority

Use the current shared variants first:

```text
primary
secondary
ghost
destructive
iconButton
compact
```

### Feature ownership after migration

Feature CSS may layer:

- placement;
- width/max-width;
- grid/flex participation;
- a domain-specific selected/pressed state where semantics require it;
- an icon-specific square target if the generic `iconButton` is unsuitable for a proven reason.

Feature CSS should not re-author:

```text
border
background
border-radius
font size/weight
hover material
active material
standard focus ring
standard disabled opacity
standard press motion
```

for an ordinary button when a shared variant already fits.

### Fields

Inputs, selects and textareas already receive shared global material. A feature should normally own only:

- inline/block sizing;
- textarea resize behavior;
- domain layout;
- specialized validation semantics;
- exceptional spatial behavior.

Repeated local field borders/backgrounds/padding should be removed unless a rendered comparison demonstrates a necessary variant.

---

## 5.3 P0 — low-chrome tab grammar

There are multiple underlined/low-chrome tab patterns in the product.

Extract a shared tab treatment only where the semantics and visual treatment genuinely align, likely across:

- Focus Plan portfolio tabs;
- Today workspace tabs;
- Task inspector tabs;
- similar low-chrome section-switching controls.

The shared primitive should own:

```text
text.tab role
minimum target geometry
rest/hover/selected/focus/forced-color states
underline geometry
motion
```

### Important exception

Narrative scene tabs have a distinct document-editor metaphor and may remain domain-specific if rendered comparison confirms that their raised-tab shape carries useful hierarchy. Even there, text/focus/motion should still consume shared authority.

### Implementation form

Prefer `styleVariants` for a simple finite set. ADR 0045 already restricts `@vanilla-extract/recipes` to primitives with genuinely meaningful variant axes; do not wrap a one-axis style in a recipe merely for abstraction.

---

## 5.4 P0 — focus treatment authority

The shared button system uses a 2px focus ring with a 2px offset. Ordinary controls should converge on that grammar.

Retain a heavier 3px ring only where spatial interaction justifies it, for example:

- draggable Life nodes;
- graph nodes;
- canvas targets where focus must remain visible against arbitrary spatial content.

Do not allow every feature to choose between 2px/3px and arbitrary offsets independently.

---

## 5.5 P1 — field/help/error/status micro-primitives

Do not create an enterprise design-system catalog prematurely. First census repeated patterns.

Good candidates if duplicated across at least two production families:

```text
fieldLabel
fieldHelp
fieldError
inlineStatus
visuallyHidden
```

`visuallyHidden` is especially low-risk: multiple feature files currently carry their own version of the same accessibility recipe.

Loading/empty/skeleton patterns should continue through existing `States` primitives rather than a new system.

---

# 6. New convergence ratchet

The existing residue ratchet is excellent but it protects the wrong frontier for the remaining debt. It already drives color/radius/shadow/motion to zero. Phase 4 needs a second ratchet for **ordinary UI convergence**.

## 6.1 Recommended implementation

Create a dedicated checker such as:

```text
scripts/check_visual_convergence.py
```

and invoke it from `pnpm verify`.

Keeping this separate from `check_layout_authority.py` has two advantages:

1. layout authority remains conceptually about geometry plus global visual invariants;
2. convergence rules can evolve without turning the layout checker into a generic linter.

## 6.2 First-run behavior

Do **not** guess the baseline count and do **not** set a fictional zero budget before migration.

The script should:

1. statically count the defined residue classes at the frozen starting snapshot;
2. write/record exact budgets in source;
3. fail if a count rises;
4. fail if a count falls but the recorded budget was not lowered;
5. drive each category monotonically toward zero or toward a tiny documented exemption set.

This copies the already-proven residue-ratchet philosophy.

## 6.3 Suggested residue categories

### A. raw ordinary typography

Count `fontSize` declarations in production feature CSS when they are not:

- composed from `text.*`;
- inside a narrowly documented domain visualization exemption;
- icon/canvas geometry masquerading as text size.

Avoid a naive regex that penalizes visual-world art or intentionally specialized editor content without context.

### B. private ordinary button material

Detect recurring feature-local combinations such as:

```text
border + background + cursor + padding
```

on exports named `button`, `primaryButton`, `secondaryButton`, `doneButton`, etc., unless they compose `sharedButton.*` or are explicitly exempted domain controls.

Static analysis does not need to be perfect on day one. It must be conservative, explainable and monotonically useful.

### C. standard focus-ring duplication

Track feature-local ordinary `:focus-visible` outlines that merely reproduce the shared control ring.

Canvas/spatial exemptions should be explicit.

### D. duplicated accessibility helpers

Track repeated `srOnly` / `visuallyHidden` recipes after a shared helper is established.

## 6.4 End-state target

The ideal closure condition is not literally “zero local CSS.” It is:

```text
zero unauthorized ordinary typography ownership
zero unauthorized ordinary control material ownership
zero unauthorized ordinary focus ownership
zero duplicated generic accessibility helper ownership
```

Domain-specialized geometry remains local by design.

---

# 7. Migration waves

The migration should be incremental and gated. Every wave must leave the repository green.

## Wave 0 — establish the convergence contract

**Scope**

- freeze authority statement;
- build convergence census;
- add the ratchet;
- add only the primitives the census proves necessary;
- add a small rendered control/primitive matrix if the existing gallery is insufficient.

**Do not migrate a large feature family yet.**

**Exit criteria**

- ratchet baseline recorded from real source;
- `pnpm verify` green;
- no pixel changes unless the primitive gallery/evidence intentionally changes;
- primitive APIs are finite and named semantically.

---

## Wave 1 — low-blast-radius ordinary UI pilot

**Recommended surfaces**

```text
TagPicker
TagSettings
BackupSettings
Global Search
Foundation tools
```

### Why first

These surfaces contain substantial ordinary control/type grammar but relatively little bespoke spatial visualization. They are ideal for proving that the primitives are expressive enough.

### Specific objectives

**TagPicker**

- route legend/search/status/count/error text through semantic roles;
- replace trigger/create/done/retry local button materials with shared variants where semantics match;
- preserve disclosure/listbox behavior and compact density;
- do not widen or redesign the picker simply to make primitives fit.

**TagSettings**

- standardize input/select/table metadata roles;
- migrate actions to shared buttons;
- retain merge-warning semantics and table layout.

**BackupSettings**

- remove private primary/secondary button skins;
- keep backup table and dialog geometry/domain behavior;
- retain destructive confirmation semantics.

**Global Search**

- converge text tiers to type roles;
- map close button to ghost/icon treatment where appropriate;
- preserve the top-anchored search-palette exception and result-list interaction model.

**Foundation**

- normalize ordinary controls and states without changing feature semantics.

### Wave 1 proof

- canonical light/dark;
- 960/minimum width;
- forced colors for relevant native controls;
- keyboard traversal/focus return for Search and TagPicker;
- zero geometry regressions.

---

## Wave 2 — standard master/detail and analytics workspaces

**Recommended surfaces**

```text
Focus Plans overview/detail
Analytics
Saved View editor / planning surfaces
```

### Focus Plans

This is the strongest convergence hotspot because it combines:

- local heading/lede sizing;
- local tabs;
- local fields/fieldset treatment;
- plan-list selection grammar;
- variants/phases/recovery forms;
- many ordinary buttons.

Migrate its ordinary grammar while retaining:

- the shared split workspace;
- plan-list/detail semantics;
- lifecycle and draft/recovery semantics;
- local-scroll ownership.

### Analytics

Analytics is already compositionally strong. Avoid flattening its distinctive evidence-oriented layout into generic cards.

Converge:

- period tabs/buttons;
- metadata/fact typography;
- shared numeric roles where existing roles fit;
- ordinary table/control grammar.

Retain:

- analytical fact grouping;
- progress presentation;
- local table scrolling;
- its domain-specific numeric hierarchy.

### Saved Views / planning

Use the same field, tab, button and status grammar established by Wave 1 rather than another dialog-specific dialect.

---

## Wave 3 — spatial Life surfaces

**Recommended surfaces**

```text
Life Browse
Life Pinned
Life Edit
Life Graph
Life Links / interchange controls where shared
```

### Critical ownership boundary

Do not mistake “convergence” for “genericize the canvas.”

These remain domain-specific:

- Life node dimensions;
- tree/graph coordinates;
- drag/drop targets;
- graph edges and relationship visualization;
- canvas viewport geometry;
- spatial selection signals where ordinary controls are insufficient.

These should converge:

- inspector type roles;
- inspector fields/selects;
- ordinary inspector action buttons;
- connection-list button grammar where it is just an ordinary list action;
- status/help text;
- standard focus treatment outside the spatial canvas.

### Life Edit / Graph special rule

A 3px ring may remain on draggable/spatial nodes if it is deliberately justified. Ordinary inspector buttons and inputs should not inherit that exception.

---

## Wave 4 — high-frequency Task surfaces

**Recommended surfaces**

```text
Today
Task Inspector
Task create/edit dialog
planning tabs/queues
assessment control
actual-time/timer controls
```

This wave comes after the primitives are proven because Today is the highest-frequency surface and already has strong composition/evidence. Avoid using it as the first experiment.

### Today

Migrate ordinary presentation residue such as:

- eyebrow/metadata roles;
- row edit action;
- row chips where a shared compact/annotation grammar is proven;
- timer labels/status/counters/actions;
- generic hidden-text helper.

Retain:

- timeline grouping;
- period row-group material;
- Task domain spacing;
- selected-row semantics;
- actual-time domain behavior.

### Task Inspector

Strong candidate for shared tab and type roles.

Also clean stale comments/rationale encountered during migration. One current comment still describes the historical v2 “sans object title” direction while the present global type/Craft authority has moved beyond that historical lock. Comments must explain **current** intent, not fossilize superseded decisions.

### WeekStrip

WeekStrip is already `VERIFIED`. It is not exempt from shared primitive convergence, but do **not** visually redesign it just to produce churn. Change it only if consuming a new shared primitive simplifies ownership without degrading the proven rendering.

---

## Wave 5 — Reader, Editor and Narrative

**Recommended surfaces**

```text
Basic Leaf Reader/Editor
Document Outline
Life Links/interchange dialogs
Narrative Reader
Narrative Studio
Narrative import/export
Visual Worlds
```

### Basic Reader/Editor

This family is already close to the desired architecture. Treat it primarily as a cleanup/reference wave, not a redesign.

### Narrative

Preserve narrative-world semantics and richer editorial composition. Converge only ordinary controls/type/focus/field grammar.

Do not flatten metric/callout/timeline/image blocks into generic panels if their semantic forms are useful.

---

## Wave 6 — shell and remaining edge surfaces

Close:

- shell/nav residual control/type ownership;
- Settings sections not already covered;
- keyboard help;
- restore confirmation;
- error boundaries/core-unavailable UI;
- any remaining modal/popover/dialog family inconsistencies.

This is also the final residue sweep before endgame lock.

---

# 8. Narrative Studio width — evidence-gated decision

Phase 3 identified Narrative Studio width as a risk. Phase 4 source tracing makes the architectural consequence precise.

## 8.1 Current structure

`LifeScreen` wraps Reader mode in:

```tsx
<PageFrame type="reading">
```

`BasicLeafReader` can hand off to `NarrativeCanvasReader`, and `NarrativeCanvasReader` toggles `NarrativeCanvasStudio` internally when editing.

Therefore Narrative Studio currently inherits the same reading frame rather than selecting a page type for itself.

## 8.2 Why this matters

A casual CSS `max-width` override inside Narrative Studio would violate the page-width authority.

Changing Studio from reading width to another page class is not merely “make editor wider.” It likely requires lifting editor/frame state so the top-level surface can select the appropriate existing PageFrame taxonomy.

## 8.3 Do not widen preemptively

The current 768px reading measure is excellent for prose. It may also be adequate for Studio if the editor controls reflow cleanly.

Before changing architecture, build a deterministic stress fixture containing at least:

- enough scene tabs to overflow their natural row;
- a long title;
- rich text;
- metric block;
- callout block;
- timeline with multiple long items;
- image block;
- multiple block actions;
- long Vietnamese labels/content;
- dirty-exit state;
- a drag/reorder interaction.

Capture and inspect at:

```text
1536 × 794 canonical
~960 × 640 achieved minimum
light
dark
forced colors
Vietnamese
```

## 8.4 Decision rubric

Stay on `reading` if:

- no page-level overflow occurs;
- scene-tab local scrolling is intentional and usable;
- fields/actions wrap without obscuring hierarchy;
- drag handles remain comfortably targetable;
- editor line length is good;
- the workflow does not feel materially cramped.

Escalate to `standard` only if real evidence shows recurrent workflow compression, for example:

- critical controls repeatedly stack into long vertical toolbars;
- paired fields lose useful side-by-side context;
- block action groups dominate content height;
- drag/reorder affordances become awkward;
- local scene navigation becomes materially harder.

If widening is justified, use an **existing page type**. Do not introduce a fourth width.

---

# 9. Edge-state closure plan

The current Craft ledger is intentionally not a closure claim. Endgame cannot be declared merely because the happy paths are polished.

## 9.1 P0 — closure-critical evidence

### Global route/core failures

Current state: browser-rendered injected failure paths remain unreviewed.

Required:

- deterministic route error;
- deterministic IPC/core unavailable state;
- loading/error announcements rendered in real WebView2;
- light/dark/forced-colors where applicable.

### Today

Close:

- empty;
- loading;
- error;
- completed-task presentation;
- selected/unselected variants if changed by convergence;
- timer and assessment at narrow/forced colors.

### Task create/edit

Close:

- validation errors;
- deletion path/confirmation according to current product authority;
- recurrence occurrence-scope variants;
- keyboard focus containment;
- nested combobox loading/error/no-match/selected states.

### Focus Plans

Close the currently weak evidence cluster:

- all five portfolio conditions relevant to visuals;
- empty selected/unselected;
- recovery draft available/conflict/load/discard;
- approach variant add/rename/archive/restore;
- phase add/rename/reorder/archive/restore;
- linked work loading/error/empty/populated;
- reviews validation/pending/error/empty/history;
- narrow/dark/forced-color detail surface.

### Global Search

Close:

- loading;
- error;
- keyboard traversal through grouped results;
- focus restoration after close;
- no-result and long-result conditions after convergence.

---

## 9.2 P1 — important family completion

### Life Browse/Pinned

- leaf/no-child;
- pagination;
- long/dense descriptions;
- empty/unavailable;
- dark/forced-colors interaction states.

### Life Edit

- drag source/target/overlay;
- undo;
- deep/dense tree;
- mutation pending/error;
- keyboard parity;
- dark/forced colors.

### Life Graph

- explicit-link state;
- dense graph;
- error state;
- relationship table under real density;
- selection/focus after primitive migration.

### Basic Reader/Editor

- longer multi-page document;
- error paths;
- selection/caret manipulation;
- dirty-exit visual;
- save/error;
- forced colors for editor surfaces.

### Life Links

- search results;
- loading/error/no-match;
- unavailable/archive;
- remove pending/error;
- narrow/forced colors.

### Narrative

- populated multi-block Reader;
- populated Studio block types;
- drag/reorder;
- save/error;
- asset loading/failure;
- draft conflict;
- explicit Reader visual-world variants;
- forced-colors behavior;
- the width stress test described above.

### Tags / Settings / Backup

- TagPicker no-result/create/error/selected/many-chips;
- Settings validation and tag merge paths;
- restore pending/error/failure;
- narrow/forced-colors confirmation flows.

---

## 9.3 P2 — manual/platform closure

These remain manual or environment-sensitive:

- Narrator spot checks;
- physical DPI 125% / 150%;
- deliberate scrollbar inspection across representative long surfaces;
- full keyboard walk where repository evidence is still partial.

If the environment cannot produce these truthfully, record **NOT RUN / externally limited**. Do not manufacture a pass.

---

# 10. Task deletion is an authority boundary, not a visual TODO

The current ledger records Task deletion confirmation as blocked because the smallest shared-dialog implementation exceeded the locked JS budget in prior evidence, while the current runtime deletes directly from edit.

Phase 4 must not smuggle a semantic/product decision in under “visual convergence.”

If that condition is still current when implementation reaches it:

1. re-measure the current bundle rather than trusting historical byte counts;
2. determine whether a confirmation is a product requirement under current specs;
3. if shipping it requires increasing a locked performance ceiling, stop and surface that explicit ceiling decision;
4. do not weaken the performance gate merely to close a visual ledger row.

This is a legitimate external blocker if the authority cannot be resolved within presentation scope.

---

# 11. Visual-regression policy during convergence

Existing goldens are **stability evidence**, not an immutable aesthetic authority.

The Craft override explicitly allows better reversible presentation decisions. Therefore a pixel diff can be either a defect or an intended improvement.

## 11.1 Required workflow for any intentional visual change

```text
1. run the relevant current golden set before editing
2. make one bounded primitive/family change
3. run geometry + behavior + visual comparison
4. inspect the diff, not just the pass/fail count
5. classify every changed region as intended or unintended
6. correct unintended diffs
7. update/accept only the intended baseline changes
8. re-run from the accepted baseline and require exact zero
```

## 11.2 Never bulk-accept goldens

A migration that changes 40 screenshots does not justify accepting 40 screenshots blindly.

If a shared primitive legitimately changes many surfaces, inspect the family-level representative set first and then the complete diff set before acceptance.

## 11.3 Timestamped runtime evidence

Continue keeping unstable timestamp-dependent captures such as restore-confirmation runtime evidence out of deterministic goldens unless the underlying data is made deterministic.

---

# 12. Gate stack for every migration wave

Use the repository's existing scripts as hard gates.

## 12.1 Before a wave

```powershell
pnpm verify
pnpm typecheck
pnpm build
pnpm hardening:performance
```

Run focused tests for the target family before making changes so the wave has a behavioral baseline.

## 12.2 During a wave

After each logically complete primitive/family checkpoint:

```powershell
pnpm verify
pnpm typecheck
pnpm test -- <focused target if supported by current Vitest invocation>
pnpm build
pnpm hardening:performance
```

Use the repository's exact focused test syntax; do not invent CLI flags that the configured runner does not support.

For geometry-affecting presentation changes, run the existing Windows geometry spec:

```powershell
pnpm e2e:windows -- phase21-global-layout.e2e.ts
```

Run the target family E2E as applicable.

## 12.3 Final closure stack

At endgame, at minimum:

```powershell
pnpm verify
pnpm typecheck
pnpm test
pnpm build
pnpm hardening:performance
pnpm e2e:windows -- phase21-global-layout.e2e.ts
pnpm e2e:windows -- task50b-maximized-audit.e2e.ts
```

Then run the repository's **current production visual-regression matrix** that owns the tracked `windows-webview2` goldens, including all established light/dark/minimum/forced-colors/Vietnamese axes.

`task51-visual-lock-capture.e2e.ts` and `task51-motion-lock-capture.e2e.ts` remain useful historical/contract evidence, but final production closure must use the actual current production visual-regression harness rather than assuming an old prototype-lock capture is sufficient.

## 12.4 Performance

Every primitive extraction can move JS between eager and lazy chunks. Re-measure; do not infer that “refactoring CSS” is byte-neutral.

Preserve lazy boundaries such as Task Inspector and Graph where they exist for startup-budget reasons.

---

# 13. Endgame definition of done

Lifeweave may be called visually converged only when all of the following are true.

## 13.1 Authority

- one geometry authority remains intact;
- one visual token authority remains intact;
- semantic typography roles are the ordinary UI source of truth;
- ordinary buttons consume shared variants;
- ordinary field material is not reimplemented by features;
- standard focus treatment has one owner;
- generic visually-hidden/help/error/status helpers have one owner where abstraction is warranted;
- new primitives are finite and justified by real consumers.

## 13.2 Residue

- existing color/radius/shadow/motion residue stays at zero;
- new convergence ratchet cannot regress;
- typography/control/focus/helper residue reaches zero or a tiny explicit domain-exemption list;
- exemptions name the exact file and rationale, not a broad directory.

## 13.3 Coverage ledger

Every reachable surface row must end in one of:

```text
VERIFIED
CLASSIFIED with a real non-production/N/A reason
BLOCKED with an explicit external authority decision and evidence
```

A broad family cannot be called closed while its independently reviewable nested states remain silently `PARTIAL` or `NOT REVIEWED`.

## 13.4 Geometry

- zero document horizontal overflow;
- zero main viewport overflow;
- zero semantic spacing collisions;
- finite PageFrame taxonomy preserved;
- local 2D canvases/tables own their own scroll;
- minimum-window behavior remains usable.

## 13.5 Accessibility

- forced colors passes established production matrix;
- reduced motion remains designed, not zeroed;
- keyboard traversal/focus return closed on interactive edge surfaces;
- Vietnamese typography remains clean;
- Narrator and physical DPI evidence is either completed or truthfully recorded as unavailable.

## 13.6 Visual regression

- every accepted new golden was individually or family-wise inspected;
- final accepted baseline compares at exact zero under established policy;
- runtime-only nondeterministic evidence stays separated from goldens.

## 13.7 Runtime/performance

- `pnpm verify` passes;
- typecheck passes;
- full tests pass;
- build passes;
- performance budget passes with no unilateral ceiling increase;
- lazy feature boundaries are preserved unless measured evidence justifies changing them.

## 13.8 Product-scope integrity

No Phase 4 convergence change should silently introduce:

- schema changes;
- migrations;
- new Rust domain rules;
- IPC contract changes;
- new product semantics;
- new Tauri capability;
- a custom titlebar;
- remote assets;
- a second editorial font;
- a fourth page width.

Any such requirement exits presentation scope and needs its own authority decision.

---

# 14. Stop conditions

An implementation agent should stop and report rather than improvise when any of these occurs:

## Stop A — product semantics

A visual change requires inventing a field, state, relationship, workflow or confirmation that the product model does not currently define.

## Stop B — schema / IPC / Rust

A presentation cleanup unexpectedly requires schema, migration, IPC contract or domain-service changes.

## Stop C — geometry taxonomy

A surface appears to require a fourth global page width or a feature-local top-level max-width.

First prove that none of the existing finite page types can represent it.

## Stop D — performance ceiling

The smallest correct implementation exceeds a locked bundle/performance maximum.

Do not raise the ceiling automatically.

## Stop E — new platform capability

Matching a visual treatment requires a new Tauri permission/capability, custom titlebar or window behavior.

## Stop F — new dependency/font

A new library, behavioral primitive framework or additional font family appears necessary.

ADR 0045 authorizes only one editorial family and native-first behavior. A dependency needs concrete evidence, not convenience.

## Stop G — golden uncertainty

A large visual diff cannot be confidently classified as intended.

Do not accept it wholesale. Narrow the change or inspect more evidence.

Everything else that is a reversible presentation decision can proceed under the Craft override after being rendered, compared and tested.

---

# 15. Priority map

## P0 — architectural closure

1. convergence census + ratchet;
2. typography-role adoption rules;
3. shared ordinary control adoption;
4. low-chrome tabs if census confirms common semantics;
5. focus authority;
6. accessibility helper consolidation;
7. Wave 1 pilot.

## P1 — highest payoff feature families

1. Focus Plans;
2. Life Edit;
3. Life Graph;
4. Today/Task Inspector/Task dialogs;
5. Tags/Settings/Backup/Search;
6. Analytics/Saved Views.

## P2 — edge-state completion

1. global errors;
2. validation/conflict/recovery flows;
3. dense/narrow states;
4. narrative populated editor stress;
5. manual Narrator/DPI/scrollbar proof.

## P3 — only after the above

Pure micro-polish that produces no authority or evidence gain.

Do not spend endgame time tuning a 2px decorative offset while a whole error/recovery family remains unreviewed.

---

# 16. Recommended checkpoints

Use small auditable checkpoints rather than one enormous visual commit.

Suggested conceptual checkpoints:

```text
C0  convergence census + ratchet only
C1  primitive closure + control gallery evidence
C2  Wave 1 ordinary UI pilot
C3  Focus Plans + Analytics/Saved Views
C4  Life spatial surfaces
C5  Task high-frequency surfaces
C6  Reader/Narrative
C7  edge-state closure
C8  full regression + production evidence + ledger closure
```

Commit naming should describe the change, not imply a new numbered product task unless repository governance explicitly allocates that task number.

Do not invent “Task 52” simply because Task 51 existed. Check current governance before allocating a new task/slice identifier.

---

# 17. Production evidence regeneration

At C8, regenerate the canonical production evidence rather than pointing only to pre-convergence screenshots.

Recommended output:

```text
screenshoots/
    current canonical light walk
    capture-audit.json

tracked visual baselines
    canonical light
    minimum light
    canonical dark
    forced colors
    Vietnamese typography

runtime evidence
    reduced motion
    unstable timestamp-dependent flows
    manual Narrator / DPI where available
```

The exact number of screenshots is not a target. Coverage is the target. If closing missing states increases the set beyond the current 53-state production walk / 105 tracked goldens, that is expected.

---

# 18. Source-comment cleanup is part of convergence

Task 51 has a long, deliberately traceable visual history. That has left comments in some production CSS explaining decisions that were later superseded.

During migration:

- preserve historically useful rationale in ADR/audits;
- update production comments to describe **current** authority;
- remove comments that instruct a future agent to preserve a superseded v1/v2 choice;
- do not delete historical ADR sections merely because they are no longer current.

Production code should explain why the code is correct **now**. ADRs should explain how it got there.

---

# 19. What not to optimize away

Convergence must not destroy useful product character.

Keep domain-specific distinctiveness where semantics benefit:

- Narrative visual worlds;
- editorial Reader hierarchy;
- graph/tree spatial language;
- Task timeline grammar;
- Calendar density model;
- Analytics evidence hierarchy;
- destructive red where comprehension genuinely benefits;
- blue completion identity;
- intentional local scrolling in canvases/tables/tab rails.

The goal is not “everything looks like one generic component.”

The goal is:

> **Different workflows, one craft language.**

---

# 20. Ready-to-paste execution brief for Claude Code / Codex

The following instruction can be handed directly to the implementation agent after verifying the local branch/worktree state.

```text
You are executing the Lifeweave visual-convergence endgame on the repository
kieran-lucas/lifeweave-desktop.

SOURCE SNAPSHOT / AUTHORITY
- First verify the actual local HEAD and working tree. The blueprint was authored against
  main=a1078c1f91c251aaa7a453ef1e8a5108551c852d. If HEAD differs, reconcile the delta explicitly
  before applying this plan; do not assume the old snapshot still describes the tree.
- Read ADR 0044, ADR 0045, the current Task 51 Craft coverage ledger, current visual/theme/type
  authorities, and the Phase 4 convergence blueprint before editing.
- Do not allocate a new numbered Task/Slice unless repository governance explicitly authorizes it.

CURRENT VISUAL SOURCE OF TRUTH
- Do not restore the historical warm-neutral v1 palette.
- Current production identity is the current typed theme: near-neutral/cool near-white plane,
  Lifeweave saturated blue identity, current typography authority, current finite radius/elevation/
  hairline/motion contracts.
- Craft is the craftsmanship benchmark and allows stronger reversible presentation decisions, but
  product semantics, proven geometry, blue identity, accessibility and measured runtime quality
  remain authoritative.
- No new Product Owner visual-lock phrase is required for reversible presentation improvements.
  Evidence is the gate: render, compare, test, proceed.

PRIMARY OBJECTIVE
Close ordinary UI ownership convergence without redesigning the application.
A feature should own domain semantics and domain-specific geometry, not another generic typography
scale, button skin, field material, focus ring or low-chrome tab grammar.

NON-NEGOTIABLE SCOPE
- Presentation only unless a separately authorized blocker is raised.
- No schema/migration/Rust domain/IPC changes.
- No fourth PageFrame width.
- No feature-local top-level page max-width workaround.
- No new Tauri capability/custom titlebar.
- No remote assets.
- No second editorial font.
- No new dependency without evidence that native/existing primitives cannot solve the concrete need.
- Never raise a locked performance ceiling automatically.
- Never bulk-accept visual goldens.

WORK ORDER

PHASE A — BASELINE AND CONVERGENCE CENSUS
1. Verify clean worktree and record HEAD.
2. Run:
   pnpm verify
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm hardening:performance
3. Measure current convergence residue across production app/features:
   - raw ordinary fontSize ownership not composed from semantic text roles;
   - private ordinary button material not composed from sharedButton variants;
   - duplicated standard focus-visible recipes;
   - duplicated srOnly/visuallyHidden helpers.
4. Distinguish domain-specialized visual geometry from ordinary UI; do not count icon/canvas/node
   dimensions as typography residue.
5. Add a conservative monotonic convergence ratchet, preferably a dedicated
   scripts/check_visual_convergence.py invoked by pnpm verify. Record the measured starting budgets;
   do not fabricate zero.

PHASE B — PRIMITIVE CLOSURE
1. Reuse the existing text.* typography roles and shared button variants first.
2. Add a new typography role only when at least two real consumers prove an existing role is
   semantically wrong. Do not create one token per historical pixel size.
3. Extract a shared low-chrome tab grammar only if Focus Plans / Today workspaces / Task Inspector
   genuinely share semantics and rendered treatment.
4. Converge ordinary focus treatment; preserve heavier spatial focus only for canvas/graph/dnd targets
   where evidence justifies it.
5. Consolidate generic visuallyHidden and repeated field/help/error/status helpers only when repeated
   real consumers justify them.
6. Keep @vanilla-extract/recipes only for genuine variant axes; otherwise use style/styleVariants.
7. Use BasicLeafDocument.css.ts as the reference migration style: shared presentation roles + local
   domain geometry.

PHASE C — PILOT
Migrate TagPicker, TagSettings, BackupSettings, Global Search and Foundation ordinary UI grammar.
Preserve behavior and domain composition. Render light/dark/minimum/forced-colors and exercise keyboard
focus paths where applicable. Lower convergence budgets immediately when residue falls.

PHASE D — STANDARD WORKSPACES
Migrate Focus Plans first, then Analytics and Saved View/planning surfaces.
Do not genericize Analytics into a card dashboard. Preserve shared split geometry and local scroll.
Close Focus Plan recovery/variants/phases/linked-work/reviews error and narrow states while the surface
is open.

PHASE E — LIFE SPATIAL SURFACES
Migrate ordinary inspector controls/type/focus in Life Browse/Pinned/Edit/Graph/Links/interchange.
Do NOT genericize graph/tree node geometry, edges, drag targets or canvas scroll behavior.

PHASE F — TASK HIGH-FREQUENCY SURFACES
Migrate Today, Task Inspector, Task dialogs/planning, assessment and timer ordinary UI grammar.
WeekStrip is already verified: consume shared authority where useful but do not redesign it for churn.
Clean stale production comments that preserve superseded v1/v2 rationale.

PHASE G — READER / NARRATIVE
Treat Basic Leaf Document as already close to the target architecture; perform cleanup rather than
redesign. Migrate ordinary Narrative controls/type/focus while preserving semantic metric/callout/
timeline/image and visual-world distinctions.

NARRATIVE STUDIO WIDTH DECISION
Do not widen it by local CSS. It currently inherits LifeScreen's PageFrame type="reading" because
NarrativeCanvasReader toggles Studio internally. Build a deterministic populated stress fixture with
many scene tabs, rich text, metric, callout, timeline, image, long Vietnamese labels, dirty state and
drag/reorder. Capture canonical, minimum, dark and forced-colors. Keep reading width if usable.
Only if evidence proves material workflow compression, restructure the top-level frame to an EXISTING
page type such as standard. Never invent a fourth width.

PHASE H — EDGE-STATE CLOSURE
Use docs/audits/task-51-craft-coverage-ledger.md as an active checklist. Do not close the task while
reachable rows remain silently PARTIAL/NOT REVIEWED. Prioritize global errors, Today empty/loading/
error/completed, Task validation/scope, Focus Plan recovery/error families, Search loading/error/
keyboard, Life drag/deep/error, Reader/Editor save/error/FC, Narrative populated/drag/save/error/FC,
Tags/Settings/Backup error/confirm paths.
Manual Narrator and physical DPI must be run where possible or recorded honestly as NOT RUN.

GATES
After every coherent checkpoint:
- pnpm verify
- pnpm typecheck
- focused unit/DOM tests
- pnpm build
- pnpm hardening:performance
- relevant Windows E2E / visual comparison

For geometry-affecting work, run:
  pnpm e2e:windows -- phase21-global-layout.e2e.ts

At final closure run at least:
  pnpm verify
  pnpm typecheck
  pnpm test
  pnpm build
  pnpm hardening:performance
  pnpm e2e:windows -- phase21-global-layout.e2e.ts
  pnpm e2e:windows -- task50b-maximized-audit.e2e.ts
and the repository's current full production visual-regression matrix owning the tracked
windows-webview2 goldens.

VISUAL BASELINE POLICY
Before an intentional visual change, prove current baseline. After the change inspect every relevant
diff, fix accidental changes, then explicitly accept only intended baseline changes. Re-run and
require exact zero from the accepted baseline. Never mass-accept screenshots.

STOP AND REPORT INSTEAD OF IMPROVISING IF
- semantics/schema/IPC/Rust must change;
- a fourth page width appears necessary;
- a Tauri capability/custom titlebar is needed;
- a performance ceiling must be raised;
- a new dependency/font appears necessary;
- Task deletion confirmation still conflicts with product authority or locked bundle budget;
- visual diffs are too broad to classify confidently.

FINAL DELIVERABLE
1. Update the Craft coverage ledger with actual rendered evidence and statuses.
2. Record convergence-residue before/after counts and all explicit exemptions.
3. Regenerate current canonical production screenshots/capture audit.
4. Record final light/dark/minimum/forced-colors/Vietnamese visual regression evidence.
5. Record reduced-motion and manual Narrator/DPI status truthfully.
6. Record exact gate results and bundle deltas.
7. Do not claim endgame closure unless every reachable surface is VERIFIED, CLASSIFIED with a real
   reason, or explicitly BLOCKED by an external authority decision.
```

---

# 21. Final Phase 4 verdict

The repo does **not** need another top-down style overhaul.

It needs the last architectural convergence step that mature design systems eventually require:

> move from **“shared visual tokens + many feature recipes”** to **“shared visual tokens + shared ordinary primitives + feature-owned domain composition.”**

That is the highest-leverage path because it improves three things simultaneously:

1. **current visual consistency** — duplicated micro-decisions collapse;
2. **future stability** — new features have fewer ways to drift;
3. **reviewability** — visual diffs become meaningful because ordinary control/type behavior has one owner.

The endgame should be considered locked when the source ownership model, the coverage ledger, the geometry gates, the accessibility axes, the performance gates and the accepted visual baselines all agree.

No additional decorative redesign is required to call that a strong finish.
