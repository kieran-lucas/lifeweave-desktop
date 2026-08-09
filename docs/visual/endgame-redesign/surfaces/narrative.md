# Surface Authority — Narrative

**Scope:** Narrative template chooser, reader blocks, recovery, Markdown, Studio and Visual Worlds.

**Canonical closure IDs:** N-01, N-02, N-03, N-04, N-05, N-06, N-07, N-08, N-09, MD-01, MD-02, NS-01, NS-02, NS-03, NS-04, NS-05, NS-06, NS-07, NS-08, NS-09, NS-10

**Visual references:** `references/06-reader-direction.png`

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

# Narrative Canvas

## 22. N-01 — Narrative creation chooser

Actual templates:

1. Knowledge Dossier
   - Overview
   - Evidence
   - Timeline
2. Project Blueprint
   - Vision
   - Plan
   - Milestones
   - Review
3. Learning Journey
   - Goals
   - Concepts
   - Practice
   - Reflection

Actual:

- Create Narrative Canvas trigger;
- inline chooser fieldset;
- radio templates;
- Create Canvas;
- Cancel;
- pending/error.

Target:

- template chooser is an inline creation surface, not a modal;
- template name primary;
- description secondary;
- scene names tertiary;
- selected template tonal blue.

### N-02 — Narrative Reader

Actual blocks:

- rich text;
- metric;
- image;
- callout;
- timeline;
- unknown block;
- unsupported text island;
- missing image.

Reader utilities:

- recovery;
- Edit canvas;
- Markdown export;
- Portable Package;
- status.

Target:

- Reader remains editorial;
- each block gets its semantic native treatment:
  - rich text: no container by default;
  - metric: one restrained factual block;
  - image: full reading-width figure + caption;
  - callout: rule/tint, not card;
  - timeline: vertical rule + ordered items;
- block variety should not dissolve product identity.

### N-03 — Visual Worlds

Actual worlds:

- Paper
- Sakura
- Aurora
- Nocturne

Light-only redesign scope still preserves these Narrative-specific visual worlds where product behavior requires them.

Rules:

- they alter the authored Narrative world, not the entire app shell;
- shell controls remain Lifeweave;
- world color must not leak into global navigation;
- world pattern/effects remain restrained;
- Reader and Studio must share one world semantics.

### N-04 — Narrative recovery / error

Actual:

- interrupted/conflict draft;
- Recover draft;
- Discard draft;
- unsupported canvas;
- create/load errors.

Target mirrors Basic Leaf recovery grammar.

---

# Narrative Studio

## 23. NS-01 — Studio shell

Actual header:

- `Narrative Canvas — Studio`
- Publish / Saving
- Undo
- Redo
- Back
- Discard & close
- status

Then:

- Canvas title
- Visual world selector
- scene tabs
- Add scene
- scene title
- Left
- Right
- Delete scene
- blocks
- Add block bar.

Target:

- Studio must feel like an editor, not a Reader with extra buttons;
- header action hierarchy:
  1 Publish
  2 Undo/Redo
  3 Back
  4 Discard & close separated;
- status remains adjacent;
- Canvas title and world choice form document-level settings;
- scenes become the next structural level;
- blocks are the active editing level.

### NS-02 — Visual World selector

Actual radio choices with name, description and three color chips.

Target:

- compact choice matrix/list;
- selected world strong but quiet;
- color chips are previews, not decoration;
- no theme modal.

### NS-03 — Scene tabs and scene controls

Actual:

- up to 20 scenes;
- roving tab keyboard;
- Add scene;
- editable Scene title;
- Left;
- Right;
- Delete scene.

Target:

- horizontally scrollable tab strip;
- active tab clear;
- Add scene visually distinct from existing tabs;
- rename input belongs directly below/within scene structure;
- Left/Right/Delete compact.

### NS-04 — Block container

Every block actual header:

- Drag
- kind label
- Up
- Down
- Delete

Target:

- block surface is one of the few legitimate repeated editor enclosures;
- header low-chrome;
- drag handle visually clear;
- kind label eyebrow;
- block-specific content below;
- selected/active rich-text block does not change outer dimensions abruptly.

### NS-05 — Rich text block

Actual:

- static preview when inactive;
- Tiptap editor when active.

Target:

- static preview reads like text, not disabled input;
- active editor gets clear editing boundary;
- transition between states subtle.

### NS-06 — Callout block

Actual:

- Variant:
  - Note
  - Warning
  - Tip
- rich-text content.

Target:

- variant selector compact;
- semantic tint/rule;
- never use huge warning card.

### NS-07 — Metric block

Actual:

- Label
- Value
- Unit
- Description

Target:

- grid layout for label/value/unit;
- value field receives strongest visual dimension only in Reader preview, not editor form.

### NS-08 — Image block

Actual:

- Import image / Replace image;
- importing/error;
- optional preview;
- asset imported text;
- Alt text;
- Caption.

Target:

- preview bounded;
- alt/caption fields below;
- asset ID not visually elevated.

### NS-09 — Timeline block

Actual:

- Timeline heading;
- sortable items;
- each item:
  - Drag
  - Item N
  - Delete
  - Label
  - Description;
- Add item.

Target:

- nested list inside block;
- each item separated by hairline/spacing rather than card nesting.

### NS-10 — Add block bar

Actual:

- Rich text
- Metric
- Image
- Callout
- Timeline

Target:

- compact horizontal/flow action group;
- no giant block gallery.

### NS-11 — Studio decisions

Actual:

- Delete scene? when non-empty
- block deletion decisions as needed
- Leave editor?
- only-block protection/decision paths in tests/coverage
- destructive/Cancel grammar.

Target:

- all use shared DecisionDialog;
- no bespoke modal per decision.

### NS-12 — Studio width decision

The Studio currently inherits the 768 px Life Reader frame.

Phase 6 does **not** authorize blind CSS widening.

Implementation sequence:

1. create populated stress fixture with:
   - multiple scenes;
   - all five block types;
   - long labels;
   - image;
   - timeline with several items;
2. render at current reading width;
3. measure input compression/wrapping;
4. only if evidence shows the editor is structurally constrained, move Studio to a broader `standard`-class editing frame while Reader remains `reading`.

This is a structural composition change, not a local `max-width` override.

---

# Markdown import/export

## 24. MD-01 — Import Markdown as Canvas preview

Actual:

- title;
- excerpt;
- Proposed title;
- Sections;
- optional Asset refs;
- warnings;
- error;
- Cancel;
- Import / Importing.

Target:

- modal preview;
- excerpt is clearly quoted/previewed;
- metadata definition list;
- warnings visible;
- confirm primary.

### MD-02 — Narrative Markdown export

Actual:

- fixed lossiness warning;
- Export Markdown;
- error.

Target:

- utility group;
- lossiness note must remain visible because it is product truth;
- no “advanced export options.”

---
