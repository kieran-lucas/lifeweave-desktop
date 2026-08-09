# Cross-Surface Detailed Rules

This file supplements `01_DESIGN_SYSTEM_AUTHORITY.md` with the locked Phase 6 detailed cross-surface and anti-inference rules. Read it only when a stage packet requests it.

# Part III — Cross-Surface Rules

## 26. What counts as a card

Use a card/surface enclosure only when at least one is true:

- the object is independently selectable;
- the object has its own local actions;
- the object is spatially movable;
- the object must visually separate from adjacent siblings of the same type;
- the object is a floating layer.

Do not create a card merely because a section has a heading.

Examples:

- Life Edit node: card-like object — yes.
- Narrative Studio block: repeated enclosure — yes.
- Saved View manager item: row, not card.
- Analytics Scheduled overview: shared fact band, not four cards.
- Settings section: not card.
- Calendar day cell: grid cell, not card.
- Today period: grouped surface; task row inside is not its own card.

---

## 27. Tables

Use actual tables where source semantics are tabular:

- Focus Plan Analytics
- Tag tables
- Backup versions
- Graph all-links
- Analytics evaluation table

Table target:

- sticky header only if scrolling region and behavior justify it;
- numeric alignment;
- concise row height;
- no excessive vertical borders;
- local horizontal scroll, never page overflow;
- action column compact.

---

## 28. Inspectors

There is no universal “right inspector on every screen.”

Use inspector only where source interaction topology provides contextual selection.

Real inspectors:

- Today selected Task inspector;
- Life Edit node inspector;
- Life Graph semantic inspector.

Do not invent inspectors for:

- Calendar;
- Analytics;
- Reader;
- Settings;
- Saved Views if its existing split already carries manager/results;
- Focus Plans beyond its existing master/detail.

---

## 29. Overlays and Z stack

Canonical order:

1. fixed app background/atmosphere
2. sidebar + viewport content
3. selected/raised local surfaces
4. attached listbox/disclosure/popover
5. drag overlay / assessment fan
6. modal backdrop
7. modal surface
8. focus indication inside modal

No arbitrary z-index escalation.

---

## 30. Responsive / minimum viewport behavior

Desktop target is Windows.

At narrow/minimum canonical viewport:

- sidebar may collapse;
- shared split workspace stacks;
- Today inspector becomes full-width below timeline;
- Plans list/detail stacks;
- Life Edit canvas remains locally scrollable; inspector stacks only if shared split breakpoint requires it;
- Graph canvas keeps local scrolling;
- tables get local horizontal scrolling;
- dialogs preserve viewport inset and internal scroll;
- no document-level horizontal overflow.

Do not “responsive redesign” into mobile navigation patterns.

---

## 31. Light-theme scope

For this project:

- design decisions, goldens and polish target Light only;
- do not spend redesign time creating new dark variants;
- existing dark behavior outside modified shared primitives should not be intentionally broken, but it is not a visual target of this Phase 6 redesign;
- do not add theme toggles.

Narrative Visual Worlds remain product content behavior; their dark variants are not a redesign target in this project.

---

## 32. Endgame acceptance principles

A screen is not complete because:

- it compiles;
- tests pass;
- it matches the old golden;
- no overflow exists;
- it uses the right tokens.

A Phase 6 surface is visually complete only when:

1. every real control is present;
2. no unsupported control is invented;
3. hierarchy is deliberate;
4. alignment is coherent;
5. spacing follows system roles;
6. type uses system roles;
7. state language is consistent;
8. local scrolling belongs to the correct container;
9. keyboard/focus states remain designed;
10. empty/loading/error/recovery states are designed;
11. it visually belongs to Quiet Precision Atlas;
12. it does not look like a generic SaaS template;
13. the surface is not made “premium” by adding unnecessary cards, glass, gradients or shadows.

---

# Part IV — Agent Anti-Inference Contract

## 33. The implementation agent may infer

Only low-risk mechanical details, such as:

- which existing shared class composes a specified primitive;
- exact CSS syntax;
- file import organization;
- mechanically replacing a raw feature role with the named shared role;
- test fixture plumbing necessary to reach a specified state.

## 34. The implementation agent may not infer

The agent may not independently decide:

- a new screen layout;
- a new sidebar destination;
- a new inspector;
- a new chart;
- a new metric;
- a new card;
- a new field;
- a new button;
- a new popup;
- a new interaction;
- a new hierarchy;
- a new product capability;
- a new theme;
- a new visual effect;
- a new navigation model.

If the Phase 6 specification does not describe a material surface, stop that row and add it to the design ledger rather than improvising.

---

# Micro-Control Shared Appendix

## 43. Shared modal geometry

Use existing dialog widths as semantic starting points:

- compact 520 px;
- standard 720 px;
- wide 960 px;
- viewport inset 48 px;
- surface owns internal scroll.

Mapping:

- DecisionDialog → compact;
- Keyboard shortcuts → compact;
- Life link search → standard/compact based on result density;
- Task Create/Edit → standard;
- Saved View editor → standard/wide;
- package/branch/tree preview → standard/wide;
- Markdown import → standard.

Never use document/page scrolling to fit a modal.

## 44. Local-scroll authority

The following surfaces intentionally own local scroll and must not leak overflow to the app document:

- Life Edit canvas;
- Life Graph canvas;
- plan list rail when long;
- combobox/listbox results;
- tag lists;
- long tables;
- dialog body;
- Narrative scene tab list horizontally;
- tables requiring horizontal overflow.

Scrollbar styling must remain quiet; scrollbar presence must not shift optical centering.

## 45. “No invented capability” screenshot reconciliation checklist

When implementation compares against the approved concept images, the agent must ask:

1. Is this visual idea purely presentation?
2. Is the underlying data/control in current source?
3. If no, remove it from the implementation reference.
4. Can the same visual quality be achieved with actual information?
5. If yes, redesign using actual information.
6. If not, do not add fake UI just to resemble the concept.

Examples:

- Calendar right inspector: **remove**, then use width to make month board more commanding.
- Analytics invented chart: **remove**, then strengthen hierarchy of existing facts/progress/table.
- Plans fake collaborators: **remove**, then elevate actual plan details/approaches/phases/reviews.
- Reader fake right metadata rail: **remove**, then use existing outline/Links/Related Tasks.
- shell fake profile/footer: **remove**, then improve brand/nav spacing and viewport composition.
