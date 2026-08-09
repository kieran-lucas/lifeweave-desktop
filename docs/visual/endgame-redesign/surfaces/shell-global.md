# Surface Authority — Shell Global

**Scope:** Global shell, core states, Search, keyboard help, DecisionDialog.

**Canonical closure IDs:** G-01, G-02, G-03, G-04, G-05, G-06, SH-01, SH-02

**Visual references:** `references/01-today-approved-direction.png`

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

## 11. Global shell surfaces

### G-01 — App core: connecting

**Exists:** yes.  
**Source:** `frontend/src/app/App.tsx`.

Content:

- `Connecting to application core…`

Target:

- keep the shell present;
- put status in the main viewport, aligned to normal page gutter;
- use quiet metadata/body role;
- no full-screen spinner;
- no fake progress percentage.

### G-02 — App core unavailable

Content:

- `Application core unavailable.`

Target:

- preserve shell;
- compact error treatment;
- no destructive visual takeover;
- no invented retry unless behavior is added explicitly.

### G-03 — Route render failure

**Source:** `RouteErrorBoundary.tsx`.

Content:

- `This view could not be displayed`
- saved-data safety explanation
- `Retry view`

Target:

- standard page-frame recovery surface;
- title uses object/page recovery hierarchy;
- Retry is primary in this small region;
- no stack trace or developer chrome.

### G-04 — Global Search modal

**Source:** `GlobalSearchDialog.tsx`.

Actual structure:

- modal backdrop;
- search icon;
- search input `Type to search…`;
- visible `Esc` close control;
- result status;
- grouped result list:
  - Tasks
  - Life
  - Plans
  - Documents;
- title match highlight;
- context text;
- snippet;
- truncation note: “N more … results not shown.”

States:

- idle <2 chars;
- debounce/loading;
- error;
- no results;
- grouped results;
- active keyboard option.

Target composition:

- compact floating command/search surface;
- width should feel intentional, not full-screen;
- input is the dominant object;
- group labels are eyebrows;
- result rows are low-chrome, edge-to-edge within the surface;
- active row gets tonal blue, not thick outline;
- snippet visually subordinate;
- status line uses metadata role;
- only the search modal carries modal elevation.

Forbidden:

- filters;
- sort;
- history;
- AI suggestions;
- fake recent searches;
- tabs.

### G-05 — Keyboard shortcuts modal

Actual:

- title;
- explanation;
- exactly eight command rows from registry;
- key chord badges;
- Close.

Target:

- compact dialog;
- two-column definition-list rhythm;
- command labels left, `<kbd>` right;
- no cards per shortcut;
- close footer quiet/secondary.

### G-06 — Shared DecisionDialog

Actual variants:

- title;
- description;
- optional single text/url input;
- optional Cancel;
- confirm;
- destructive confirm variant.

Used by editors and destructive decisions.

Target:

- one compact modal grammar;
- title + description tightly grouped;
- optional field in body;
- footer right aligned;
- destructive only when action is destructive;
- input variant must not widen the entire dialog unnecessarily.

---
