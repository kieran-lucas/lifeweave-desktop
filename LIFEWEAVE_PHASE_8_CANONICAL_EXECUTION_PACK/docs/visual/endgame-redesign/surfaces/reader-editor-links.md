# Surface Authority — Reader Editor Links

**Scope:** Life Reader, Basic Leaf Reader/Editor, Life links and related tasks.

**Canonical closure IDs:** R-01, R-02, R-03, R-04, R-05, E-01, E-02, E-03, LL-01, LL-02, RT-01

**Visual references:** `references/06-reader-direction.png`

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

# Reader / Basic Leaf

## 18. R-01 — Life Reader shell

Actual:

- reading PageFrame;
- Back to Life Browse;
- node icon;
- node title;
- description;
- tags;
- document region;
- Links;
- Related tasks.

Target:

- quiet reading measure;
- Life node identity above document;
- Back is low-chrome;
- related systems come after authored document, not beside it as invented inspector unless layout evidence later authorizes an outline column already supported.

### R-02 — Empty leaf

Actual:

- Reader;
- no document yet;
- Portable package import controls;
- Create Basic Leaf document;
- Create Narrative Canvas/template chooser;
- Import Markdown as Canvas.

Target:

- clear “choose document type” creation composition;
- three creation/import paths visually distinct but not competing;
- explanatory text first;
- no fake recent documents.

### R-03 — Basic Leaf / populated reader

Actual:

- optional recovery region;
- Edit document;
- Import Markdown;
- Export Markdown;
- Portable Package controls;
- optional outline when >=2 headings;
- static authored document.

Target:

- authored content dominates;
- action toolbar is quiet and above document;
- outline becomes a 210 px sticky auxiliary column only when source enables it;
- no permanent right metadata inspector invented from mockup.

### R-04 — Basic Leaf recovery

Actual:

- Recoverable draft;
- interrupted or conflict explanation;
- Recover draft;
- Discard draft.

Target:

- noticeable but calm recovery band;
- Recover primary;
- Discard secondary/destructive semantics;
- current committed document remains visually safe.

### R-05 — Reader conflict / unsupported

Actual cases:

- Basic + Narrative both exist;
- unsupported document content;
- load error.

Target:

- factual recovery notices;
- no fake repair wizard.

---

# Basic Leaf Editor

## 19. E-01 — Editor normal

Actual toolbar:

- Bold
- Italic
- H1
- H2
- H3
- Bullet list
- Numbered list
- Quote
- Code block
- Link
- Table
- Image

Actual body:

- Tiptap editor;
- save status;
- alert message;
- Save;
- Back to Reader.

Target:

- toolbar sticky and low-chrome;
- format controls grouped but source actions unchanged;
- editor body inherits Reader typography;
- status near actions, not floating toast;
- content field gets enough visual boundary to distinguish editing from reading.

### E-02 — Add link DecisionDialog

Actual:

- destination input;
- allowed protocol explanation;
- Add link / Cancel.

Target shared compact dialog.

### E-03 — Dirty exit

Actual:

- Leave Edit?;
- recoverable-draft explanation;
- destructive Leave Edit;
- Cancel.

Target:

- destructive wording/visual only on confirm;
- preserve return focus.

### E-04 — save/draft/image failures

Actual:

- status strings;
- recoverable draft behavior.

Target:

- inline alert near status/actions;
- never cover editor content with transient toast only.

---

# Life Links / Related Tasks

## 20. LL-01 — Links panel

Actual:

- Add link;
- source ineligibility;
- status;
- Outgoing links;
- Backlinks;
- archived/unavailable states;
- Remove link on outgoing only.

Target:

- two chronological/relationship sections;
- each row: title primary, breadcrumb/document kind secondary;
- Remove link compact destructive;
- unavailable factual state remains visible.

### LL-02 — Add link modal

Actual:

- title `Add link from {source}`;
- search eligible committed leaves;
- Find a Life leaf;
- Search;
- validation;
- searching/results/error;
- radio select target;
- no match empty;
- Cancel;
- Confirm link / Adding link.

Target:

- standard compact search + selection dialog;
- result rows have title/breadcrumb/document kind/description;
- selected radio row tonal;
- Confirm disabled until selection.

### RT-01 — Related Tasks

Actual:

- Active count/list;
- Completed count/list;
- tags;
- click navigates Today;
- loading/error/empty.

Target:

- two small sections after Reader/Browse content;
- no card wall;
- completed group quieter than active.

---
