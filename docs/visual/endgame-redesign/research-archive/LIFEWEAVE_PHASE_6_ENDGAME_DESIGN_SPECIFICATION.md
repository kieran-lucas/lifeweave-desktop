# Lifeweave — Phase 6 Endgame Design Specification

**Status:** LOCKED  
**Baseline:** `main @ a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Phase:** 6 — Endgame Design Specification  
**Design direction:** **Quiet Precision Atlas**  
**Capability boundary:** frontend-only; preserve backend/domain/data contracts  
**Theme scope:** light only  
**Brand mark:** simple blue infinity symbol; no lightning, glow, container tile, or decorative halo  
**Primary capability authority:** current production React source at the locked baseline  
**Primary art-direction authority:** the user-approved Lifeweave concept direction, reconciled against actual production capabilities  
**Rule:** visual references may improve presentation; they may not invent functionality.

---

## 0. Why this specification exists

This document deliberately does **not** say only “make Today premium, make Calendar beautiful, keep the same vibe elsewhere.”

That pattern leaves dozens of interaction surfaces undesigned and forces the implementation agent to become a designer. This project will not do that.

Every materially different production surface must be specified as an explicit design object. A surface may be:

- a top-level destination;
- a tab or mode inside a destination;
- a contextual inspector facet;
- a modal dialog;
- a disclosure / combobox / popover;
- an editor state;
- a loading, empty, error, recovery, conflict, destructive-confirmation, or unavailable state;
- a canvas with a different interaction model;
- a table or data region whose hierarchy is materially different from an ordinary list.

If a production UI surface is absent from the Surface Manifest, the agent must **not invent a visual solution for it silently**. The missing surface becomes a design-spec defect and must be added to the ledger before implementation.

---

## 1. Authority hierarchy

When instructions appear to conflict, resolve them in this order:

1. **Backend/domain/data behavior** — immutable for this redesign.
2. **Current production React behavior and reachable controls** — capability authority.
3. **This Phase 6 screen/state specification** — composition and presentation authority.
4. **Shared design-system contracts** — typography, spacing, color, radius, elevation, motion.
5. **Approved concept images** — art-direction reference only.
6. Existing feature-local CSS — migration input, not target authority.

### 1.1 A critical reconciliation rule

The approved concept images contain several visual ideas that were intentionally useful for choosing an art direction but are **not current product capabilities**.

Therefore the following are explicitly forbidden unless a later product/backend decision adds them:

- No Calendar day-details inspector.
- No Calendar event-chip agenda inferred from data that the Calendar projection does not expose.
- No generic Analytics trend line, donut chart, recommendation engine, achievement panel, or invented metric.
- No Focus Plans collaborator/owner system, fake quick actions, or arbitrary progress semantics.
- No standalone Reader or Narrative sidebar destinations.
- No persistent user-profile card in the sidebar.
- No global bottom status bar with Focus Score / streak / meetings.
- No Graph zoom/pan controls unless the production graph gains that behavior.
- No Reader “Summarize”, “Highlight”, or similar AI actions.
- No arbitrary “New Plan” action on Calendar.
- No fake data fields simply because they make a mockup look richer.

The concept images remain useful for:

- scale;
- density;
- alignment;
- hierarchy;
- selected-state language;
- restrained blue identity;
- typography contrast;
- quiet borders;
- premium spacing;
- calendar prominence;
- the general feeling of a polished flagship desktop product.

---

# Part I — Global Endgame Contract

## 2. Brand and shell

### 2.1 Brand mark

Replace the current Life icon inside a filled disc with a **simple blue infinity mark**.

Target:

- mark width: visually ~24–28 px in expanded sidebar;
- one continuous, balanced infinity silhouette;
- primary blue only;
- no lightning;
- no glow;
- no surrounding tile;
- no gradient required;
- no decorative particles;
- no pseudo-3D treatment;
- optical weight should match the 20 px navigation icon system;
- collapsed sidebar must preserve an optically centered mark.

The wordmark “Lifeweave” remains text, not baked into an image.

### 2.2 Actual navigation topology

The production sidebar contains exactly these top-level destinations/actions:

1. Today
2. Calendar
3. Analytics
4. Plans
5. Life System
6. Settings
7. Search — opens modal, not a route
8. Collapse / Expand

Grouping remains meaningful:

- Today / Calendar / Analytics / Plans
- separator
- Life System
- separator
- Settings
- separator
- Search
- Collapse at bottom

Do **not** add Reader or Narrative as standalone sidebar routes. They belong to Life navigation.

### 2.3 Expanded and collapsed shell

Expanded target:

- approximately the current 260 px geometry;
- sidebar is a quiet plane, not a floating card;
- navigation rows stay low-chrome;
- active destination uses a pale blue selected fill + blue icon + stronger text;
- active destination must not become a saturated full-width blue button;
- separators are hairlines with enough vertical air to read as groups.

Collapsed target:

- current 68 px authority may remain;
- icons centered;
- no squeezed/hidden text remnants;
- tooltips are optional only if already supported by product behavior; do not invent a tooltip framework solely for this redesign;
- Life auto-collapse behavior remains.

### 2.4 No fake shell furniture

Do not add:

- user avatar/profile;
- subscription label;
- global Focus Score footer;
- meeting status footer;
- macOS-like fake title chrome;
- global floating action button;
- notification center.

The Windows/Tauri shell should feel native and disciplined, not like a web-dashboard mockup pasted inside a fake window.

---

## 3. Palette and surfaces

Use the existing typed light contract as the starting authority.

Core roles already fit the approved direction:

- canvas: `#FCFCFD` equivalent / current OKLCH token;
- sidebar plane: approximately `#FAFAFC`;
- raised surface: white;
- selected content fill: approximately `#F4F7FD`;
- selected nav fill: approximately `#F0F2FA`;
- primary text: approximately `#1F2328`;
- tertiary readable text: approximately `#5C636E`;
- hairline: approximately `#EDEEF1`;
- strong border: approximately `#E3E5EA`;
- accent: `#1157CE` equivalent / current OKLCH token.

### 3.1 Surface law

Persistent content hierarchy should be communicated in this order:

1. whitespace;
2. alignment;
3. typography;
4. tonal plane;
5. hairline;
6. only then elevation.

A persistent section should **not** receive shadow/blur merely because it needs separation.

### 3.2 Material law

Use solid/tonal surfaces for:

- task groups;
- analytics regions;
- plan detail sections;
- settings sections;
- Life nodes;
- Reader document;
- Narrative blocks;
- graph inspector;
- tables.

Use floating depth only for real Z-axis UI:

- modal dialogs;
- combobox/listbox overlays;
- search modal;
- assessment fan;
- drag overlay;
- truly floating popovers.

### 3.3 Glass

Glass is not the default Lifeweave material.

If retained at all:

- it must be subtle;
- it must never reduce text contrast;
- it belongs only to a real floating layer;
- no persistent “glass card soup”;
- no large translucent blur panels across Today / Analytics / Settings.

---

## 4. Typography

### 4.1 Family model

Use the existing optical-size-aware Segoe UI Variable setup for dense product UI:

- Small — captions, labels, metadata;
- Text — body, rows, controls, tabs;
- Display — large UI numerals.

Use Literata selectively for editorial hierarchy:

- top-level destination title;
- important object title where a single expressive title is justified;
- Reader authored content;
- Narrative authored content.

### 4.2 Role discipline

The target system must make the existing design law true:

> A surface picks a typography role; it does not pick an arbitrary font size.

No feature-local `fontSize` values for ordinary roles once Phase 6 implementation is complete.

Canonical roles:

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

### 4.3 Productive vs editorial

Dense repeated UI stays sans.

Examples:

- task title → sans row role;
- plan list item → sans;
- table → sans;
- form labels → sans;
- tabs → sans;
- Inspector metadata → sans.

Expressive singular hierarchy may use Literata:

- Today / Calendar / Analytics / Plans / Life System / Settings page title;
- selected Focus Plan title;
- Life Reader title;
- authored Reader headings;
- Narrative title.

Never set repeated card headings in serif merely to look premium.

---

## 5. Geometry and spacing

Keep the existing 4-derived spatial authority:

- 4
- 8
- 12
- 16
- 24
- 32
- 48
- 64 px

Semantic use:

- control: 8
- field: 16
- group: 24
- section: 32
- page: 64

Page frames remain:

- standard: 1152 px
- wide: 1440 px
- reading: 768 px

unless a Phase 6 surface directive explicitly authorizes a structural change after evidence.

### 5.1 Alignment law

Every screen must expose a small number of strong axes.

Examples:

- Today: time rail / task content / action rail / inspector edge.
- Calendar: seven equal day columns + weekday header axis.
- Analytics: fact-grid axes + section/table column axes.
- Plans: list-rail boundary + detail content axis.
- Life Edit: canvas + fixed inspector rail.
- Reader: reading measure + optional outline column.
- Settings: one section title axis + one form/table content axis.

Optical corrections of 1–3 px are allowed only after the mathematical grid is consistent.

---

## 6. Radius

Use the existing five-role scale:

- small 6 px
- control 10 px
- surface 14 px
- floating 18 px
- full 999 px

Avoid:

- arbitrary 7/9/11/15/20/24 px proliferation;
- pill shape for ordinary buttons;
- rounding every row independently;
- enclosing every information block simply to use a radius.

---

## 7. Controls

### 7.1 Button grammar

Use the shared variants as the authority:

- primary
- secondary
- ghost
- destructive
- icon-only
- compact

Rules:

- at most one visually dominant primary action in one local decision region;
- row actions use ghost/compact;
- destructive red is reserved for true destructive actions;
- ordinary secondary actions must not compete with page titles;
- buttons should look like controls, not cards.

### 7.2 Field grammar

All normal fields converge on one geometry:

- coherent 32–40 px target depending on role;
- same label role;
- same border;
- same focus ring;
- same disabled treatment;
- same error/help placement;
- textarea is the multiline extension of the field, not a new visual component.

### 7.3 Tabs

Use one low-chrome tab grammar for:

- Today workspaces;
- Plans portfolios;
- Life modes;
- inspector facets;
- Narrative scene tabs only where their document-editor context requires a stronger tab object.

The normal selected tab should be text/accent + underline/edge, not a row of boxed pills.

### 7.4 Focus

Visible keyboard focus is mandatory.

- 2 px focus ring is normal.
- 3 px local feature variants should be removed unless evidence proves a genuine need.
- selected state and focus state must remain visually distinguishable.

---

## 8. States

Every major surface must specify and render:

- loading;
- populated;
- empty;
- error;
- selected/unselected if selectable;
- disabled if controls can be disabled;
- pending if mutation is asynchronous;
- success/status if product already communicates success;
- conflict/recovery where source exposes it.

### 8.1 Empty states

Empty states are not marketing illustrations.

Use:

- small icon if an existing icon fits;
- concise title;
- one factual explanation;
- action only if the product actually provides one.

### 8.2 Error states

Errors must:

- preserve the current context when possible;
- state that data was not changed when relevant;
- expose Retry only when the source actually supports Retry;
- use danger sparingly;
- never become a giant red card.

### 8.3 Loading

Prefer skeleton/list rhythm where destination structure is known.

Avoid spinner islands that collapse layout and cause post-load reflow.

---

## 9. Motion

Keep the named motion vocabulary:

- press 70 ms
- state 100 ms
- check 140 ms
- popover 140 ms
- inspector-state 170 ms
- inspector 200 ms
- reorder 220 ms
- route 220 ms
- Life traversal 260 ms

Rules:

- state first, motion second;
- no `transition: all`;
- no bounce on panels;
- row/task movement uses settlement, not spectacle;
- selected-state tone changes should be subtle;
- reduced motion removes travel but preserves short tonal confirmation.

---

## 10. Accessibility floor

The redesign may be visually ambitious, but it may not regress:

- keyboard reachability;
- visible focus;
- modal focus trap/return;
- meaningful roles/names;
- 44-ish comfortable interaction targets where context permits;
- readable text contrast;
- non-color state communication;
- screen-reader announcements already encoded in behavior.

WCAG 2.2 AA should be treated as the normal floor for readable/interactive UI, not as a separate “accessibility skin.”

---

# Part II — Screen-by-Screen Specification

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

# Today and Task Workspace

## 12. T-01 — Today / populated / unselected

**Source authority:** `TodayScreen.tsx`.

Actual top structure:

- task workspace tabs:
  - Today
  - Upcoming
  - Overdue
  - Deadlines
  - Views
- optional global Active Timer Strip above current workspace;
- page eyebrow: Today/Selected day + date;
- h1 Today;
- `Plan task`;
- WeekStrip;
- Morning / Afternoon / Evening timeline groups.

Each period row exposes real data:

- scheduled time;
- title;
- optional description;
- category;
- Life area;
- Focus Plan;
- deadline;
- recurring status;
- tags;
- priority dot;
- Edit;
- actual-time Start/Stop for eligible one-off task;
- assessment control.

Target composition:

- preserve the approved concept’s excellent time-rail clarity, but remove invented data/actions.
- Today title is singular editorial hierarchy.
- WeekStrip sits directly below header as navigation, not a card.
- Morning/Afternoon/Evening headings are strong small-caps/eyebrow labels + range.
- Each period is one bounded grouped region, not one card per task.
- task rows remain dense and calm.
- selected/unselected state must not shift geometry.
- metadata wraps in a controlled secondary line.
- task title always wins visual weight over tags, Plan and Life links.
- long Focus Plan names wrap quietly; do not create saturated chips.

Do not invent:

- bottom “Add task” FAB;
- task type quick-add menu;
- user profile;
- footer score;
- snooze/reschedule actions.

### T-02 — Today / selected task split

When a row is selected, use the existing split-workspace behavior.

Target:

- timeline remains primary;
- inspector is a contextual detail rail, not a detached card;
- divider/alignment must make relationship obvious;
- at narrow container width, inspector stacks below without reading like a random card;
- opening inspector must not resize task rows in a visually jarring way.

### T-03 — Task Inspector / Note

Actual:

- context label;
- task title;
- facet tabs;
- close;
- Note content or `No note yet.`

Target:

- note facet is almost editorial text;
- no fake edit affordance in inspector because source does not provide one.

### T-04 — Task Inspector / Details

Actual facts:

- scheduled;
- category;
- priority;
- optional deadline + state;
- recurring occurrence.

Target:

- definition-list / two-column metadata, not form boxes;
- label/value alignment is strong;
- deadline warning gains emphasis only when state warrants it.

### T-05 — Task Inspector / Time

Exists only for eligible one-off tasks.

Actual:

- Recorded total;
- Timer Running/Stopped.

Target:

- numeric role for recorded duration;
- no mini chart;
- state conveyed in text and subtle tone.

### T-06 — Task Inspector / Links

Actual:

- Life area, or archived Life area text;
- Focus Plan, or archived plan text;
- empty message.

Target:

- active links are low-chrome action rows;
- archived references are factual muted rows, not disabled-looking buttons.

### T-07 — Active Timer Strip

Actual:

- Timing;
- task title;
- scheduled date;
- live elapsed counter;
- optional cumulative total;
- Stop timer;
- Discard segment.

Target:

- visible across Today workspace tabs;
- slim horizontal status/control band;
- timer number gets numeric emphasis;
- do not make it a giant banner;
- Stop is primary local action;
- Discard is destructive but visually secondary until hovered/focused.

### T-08 — Actual-time row control

Actual:

- cumulative recorded time when >0;
- Start or Stop;
- disabled when evaluated or another timer runs.

Target:

- compact inline control;
- must not dominate task title;
- disabled reason remains available via accessible name; no extra tooltip required.

### T-09 — Completion Assessment trigger/fan

Actual:

- circular trigger;
- disabled until eligible;
- portal fan/listbox of completion states;
- keyboard roving;
- orientation above/below based on space;
- compact behavior in very narrow viewport.

Target:

- trigger reads as a designed assessment indicator, not generic radio;
- open fan is one of the few true floating surfaces;
- fan uses floating radius/elevation;
- options form a visually coherent radial/fan-like choice surface while retaining listbox semantics;
- active option and saved evaluation differ;
- color never carries state alone.

### T-10 — Assessment saved + Undo

Actual:

- textual status;
- `Undo assessment`.

Target:

- small reversible-status strip near Today context;
- no toast dependency;
- Undo remains visible enough to discover but not primary.

### T-11 — Task create dialog / one-off

Actual fields:

- Title
- Description
- Date
- Start
- End
- Category
- Priority
- Life area combobox
- Focus Plan combobox
- Deadline
- Clear deadline
- Tags

Footer:

- Cancel
- Save

Target:

- standard dialog width;
- title/description fields occupy full row;
- schedule fields form one clear schedule group;
- category/priority are paired when width allows;
- Life/Plan/Deadline/Tags become subsequent field groups;
- one vertical form rhythm;
- sticky/visible footer if scroll is necessary;
- no card-per-field.

### T-12 — Task create dialog / recurring expanded

Additional actual controls:

- Repeat task
- Frequency: Daily / Weekly / Monthly
- Interval 1–366
- weekly weekday checkboxes
- Ends:
  - Never
  - After count
  - Until date
- occurrence count 1–1000
- recurrence preview list

Target:

- recurrence is a nested semantic section, not a second dialog;
- weekday selector should be compact and evenly spaced;
- ending condition is a clear radio group;
- recurrence preview appears as quiet derived output.

### T-13 — Task edit / recurring occurrence scope

Actual scope choices:

- Only this occurrence
- This and future occurrences
- Entire series

Target:

- place scope near top of recurrence editing context;
- scope choice visually precedes controls whose editability it governs;
- controls disabled at occurrence scope retain explanatory help.

### T-14 — Task edit / delete / validation

Actual:

- edit dialog has Delete;
- many validation errors;
- saving/deleting pending states.

Target:

- Delete isolated from Save;
- validation summary stays near relevant fields and/or dialog status;
- errors do not change dialog width;
- pending states preserve geometry.

### T-15 — Life Area combobox

Actual behavior:

- editable filter input;
- listbox;
- option title + breadcrumb;
- empty/error;
- archived-current explanation;
- clear action.

Target:

- floating listbox attached to field;
- selected/active option tonal;
- breadcrumb secondary;
- no extra “browse tree” button.

### T-16 — Focus Plan combobox

Same grammar as Life Area.

Actual option secondary text = lifecycle.

Target:

- plan title primary;
- lifecycle metadata secondary;
- archived current link shown as factual help;
- no fake progress bars in dropdown.

### T-17 — TagPicker disclosure

Actual:

- trigger `Add tags` / `Edit tags, N selected`;
- search;
- count up to 12;
- loading/error/retry;
- no tags empty state;
- checkbox list;
- optional create-and-select;
- Done;
- read-only variant;
- saving/error.

Target:

- a bounded disclosure region attached to field, not a full modal;
- search at top;
- count quiet unless at limit;
- checkbox rows low-chrome;
- create-and-select is a tertiary action;
- Done anchors the close affordance;
- same component in Task and Life contexts.

### T-18 — Upcoming workspace

Actual:

- header Upcoming;
- `Next 14 days`;
- count + scheduled duration;
- grouped by day;
- task rows;
- `Open day`;
- loading / error + Retry / empty.

Target:

- same task-row DNA as Today but without assessment/timeline ornament;
- day group heading is stronger than row metadata;
- no dashboard cards.

### T-19 — Overdue workspace

Actual:

- `Needs review from last 30 days`;
- grouped overdue rows;
- `Review`;
- status “Needs review.”

Target:

- danger/warning only at overdue marker;
- do not tint whole page red;
- Review action compact and consistent.

### T-20 — Deadlines workspace

Actual groups:

- Overdue deadlines
- Due today
- Upcoming deadlines

Rows include:

- deadline date;
- scheduled date/time;
- title/description;
- category;
- priority;
- Life area;
- Focus Plan;
- scheduled-after-deadline;
- tags;
- Open task.

Target:

- deadline date is first-class numeric/date information;
- group labels create hierarchy;
- table-like row alignment is preferable to card stack;
- overdue uses danger sparingly.

### T-21 — Saved Views manager/results

Actual composition is a two-region workspace.

Manager:

- Create view;
- active view list;
- Select;
- Move up/down;
- Edit;
- Archive;
- Archived views details;
- Restore.

Results:

- no selection;
- loading;
- error + Retry;
- unsupported notice;
- visible/source count;
- reference warnings;
- empty results;
- grouped task results;
- Open.

Target:

- manager is a compact left rail;
- selected Saved View gets tonal selection;
- reorder/edit/archive become compact row actions;
- results use structured task list;
- unsupported/warning regions are notices, not giant cards.

### T-22 — Saved View editor modal

Actual:

- Create/Edit title;
- Name;
- Base scope;
- Sort;
- Group;
- Filters — all match;
- nine filter kinds;
- Remove filter;
- Add filter;
- Save view;
- Cancel;
- unsupported-filter notice;
- save error.

Nine filter kinds:

1. Task kind
2. Priority
3. Category
4. Any tag
5. Life area
6. Focus Plan
7. Has deadline
8. Deadline state
9. Scheduled after deadline

Target:

- wide enough to avoid claustrophobic multi-selects;
- top metadata fields in a compact 2–3 column grid when width allows;
- filters are stacked rule rows/fieldsets with clear labels;
- remove is compact/destructive;
- Add filter is one quiet builder row at bottom;
- no visual-programming node UI;
- no chips for every option unless semantics remain identical.

---

# Calendar

## 13. C-01 — Calendar / month grid

**This is the most important correction from the approved mockup.**

Actual Calendar does **not** expose a day-detail inspector.

Actual header actions:

- Previous month
- current month label
- Next month
- Today

Actual day cell content:

- date;
- task count;
- scheduled duration;
- category icons + additional-category count;
- three load bars:
  - Morning
  - Afternoon
  - Evening;
- missed marker when applicable.

Activation:

- click / Enter / Space opens Today for that date.

### Target composition

The month board is the hero object.

- Use the full wide frame confidently.
- Keep large `Calendar` title at page top.
- Header controls should read as one compact month-navigation cluster.
- Weekday header forms a strong but quiet axis.
- Seven equal columns.
- Five/six week rows remain geometrically stable.
- Preserve the verified ~96 px cell behavior as the default density target.
- Use hairlines rather than card gaps between cells.
- The calendar should read as one coherent board, not 35 independent cards.

### Day cell visual hierarchy

Order:

1. date;
2. compact task-count + scheduled duration summary;
3. category icon strip;
4. Morning/Afternoon/Evening load triplet;
5. missed state if present.

The load bars are a signature visual opportunity:

- keep all three;
- use the shared progress material;
- approximately current 5 px thickness is appropriate;
- align them consistently across every day cell;
- blue intensity/fill communicates load amount, but accessible names remain semantic.

### Today vs selected date

- Today marker: compact blue date-ring/disc or blue date text.
- Selected date: pale selected surface + blue companion edge/ring.
- Today+selected must combine without becoming a double-outline mess.
- keyboard focus remains distinct.

### Missed day

Use existing `has_past_scheduled_unevaluated` only.

Presentation may improve from literal `!` to a compact warning mark/badge, but no new data may be invented.

### Explicitly forbidden on Calendar

- event-chip agenda not present in projection;
- right Day Details inspector;
- Add Task button on Calendar;
- New Plan;
- Focus score;
- day notes;
- linked items;
- month/week/day mode switch unless source gains it;
- drag/drop events.

The approved Calendar mockup governs **beauty, whitespace, hierarchy, selected-state confidence and prominence**, not unsupported data structure.

---

# Analytics

## 14. A-01 — Analytics / Week

Actual header:

- eyebrow `Objective Analytics · scheduled and recorded time`;
- Analytics title;
- period tabs Week / Month / Year;
- Previous period;
- period range;
- Next period;
- Current period.

Actual content:

1. Scheduled overview
2. Recorded actual time
3. Category scheduled time
4. Objective streaks
5. Completion distribution
6. Focus Plan activity

### Target composition

Do not produce generic “four KPI cards + line chart + donut chart.”

Use an editorial data report:

- page title and period controls top;
- Scheduled overview is the opening fact band;
- Recorded actual time sits as the second factual band with clear plan-vs-actual relationship;
- Category scheduled time is the primary detailed section;
- streak and completion distribution form a balanced secondary row when width permits;
- Focus Plan activity is a substantial bottom section/table.

### A-02 — Scheduled overview

Actual facts:

- Scheduled time
- Scheduled tasks
- Evaluated
- Missed

Target:

- one primary large metric + three secondary facts;
- no equal visual weight;
- numeric roles, tabular figures;
- one subtle shared plane/hairline, not four detached cards.

### A-03 — Recorded actual time

Actual:

- Recorded time
- Tracked plan
- Variance
- Tracked Tasks
- Completed segments
- explicit zero-session explanation.

Target:

- Recorded time and Tracked plan form the comparison pair;
- variance adjacent, semantically clear;
- task/segment counts secondary;
- zero state is factual, not empty-chart artwork.

### A-04 — Category scheduled time

Actual per category:

- scheduled duration;
- recorded/tracked/variance when present;
- weekly minimum/target progress;
- shortfall/overage;
- month/year may add weekly counts.

Target:

- category name + scheduled time are primary row;
- goals use the one progress material;
- actual-time facts align in secondary column;
- shortfall/overage uses warning/success text sparingly;
- avoid one card per category unless number of categories is tiny; list/table rhythm scales better.

### A-05 — Objective streaks

Target:

- compact structured list;
- numerals stronger than labels;
- no gamified oversized flames/badges.

### A-06 — Completion distribution

Actual evaluation counts + progress/distribution.

Target:

- one clear visual distribution plus factual table;
- no decorative pie chart unless implementation already uses/supports it;
- labels must make state understandable without color.

### A-07 — Focus Plan activity

Actual summary facts:

- Plans with activity
- Linked scheduled time
- Linked work items
- Evaluated
- Missed
- Reviews
- Recorded actual time

Actual table columns:

- Focus Plan
- State
- Scheduled
- Work items
- Evaluated
- Missed
- Recorded actual time
- Reviews
- Open Plan

Target:

- summary fact band, then horizontally scrollable table when needed;
- Plan title left anchored;
- Open Plan compact action;
- do not synthesize “plan health” or progress percentage.

### A-08 — Month / Year

Same information architecture.

Differences:

- period label changes;
- category weekly counts may appear;
- density must remain readable;
- do not introduce a different dashboard layout merely because period is larger.

---

# Focus Plans

## 15. P-01 — Plans portfolio / no selection

Actual:

- Plans title;
- lede;
- New focus plan input;
- Create;
- portfolio tabs:
  - Active
  - Drafts
  - Paused
  - Completed
  - Archived;
- plan list;
- empty portfolio state;
- detail empty prompt.

Target:

- standard page frame;
- create control is compact, near header but not dominant;
- portfolio tabs low-chrome;
- master/detail:
  - ~240–320 px list rail;
  - flexible detail;
- no card island for empty detail;
- plan list rows separated by hairlines;
- selected plan: tonal fill + accent edge.

### P-02 — Plan list row

Actual content:

- title;
- selected variant label;
- Life area or No Life area;
- active phase count.

Target:

- title strongest;
- variant + Life + phase count condensed into 1–2 metadata lines;
- no invented percentage/progress bar.

### P-03 — Selected plan header

Actual:

- title;
- revision / updated metadata;
- Archive or Restore.

Target:

- object title uses editorial role;
- archival action stays in quiet action rail;
- no fake owner/collaborator system.

### P-04 — Plan details editor

Actual fields:

- Title
- Lifecycle
- Life area
- Start date
- Target date
- Outcome
- Success criteria, one per line
- Tags
- Save plan
- Save recovery draft
- optional Load recovery draft
- optional Discard recovery draft
- recovery conflict/note

Target:

- one editorial/form composition;
- avoid boxed fieldset if whitespace + section rule is sufficient;
- lifecycle/date pair in grid;
- Outcome and criteria get generous reading width;
- recovery draft is a dedicated notice/action band.

### P-05 — Approaches / variants

Actual:

- variant tabs;
- selected variant;
- archive/restore;
- add approach;
- rename;
- approach notes;
- save notes.

Target:

- variants use a low-chrome subtab row;
- add/rename are inline editing operations;
- notes feel document-like;
- archived approach visually subdued but recoverable.

### P-06 — Phases

Actual:

- ordered list;
- editable title;
- Move up;
- Move down;
- Archive/Restore;
- New phase;
- Add phase.

Target:

- ordered rows with stable index/drag-like rhythm even though behavior uses buttons;
- move actions compact;
- no giant milestone cards;
- archived phase remains legible.

### P-07 — Linked work

Actual:

- count summary;
- empty/loading/error;
- list;
- task/series kind;
- group/date;
- click navigates Today.

Target:

- compact related-work table/list;
- title primary;
- date and kind metadata aligned;
- no invented statuses.

### P-08 — Reviews

Actual:

- count/latest;
- review date;
- reflection;
- optional next focus;
- Save review;
- history.

Target:

- review entry form separated from history;
- history reads like a chronological journal, not a card grid.

---

# Life System

## 16. L-01 — Life top-level mode header

Actual modes:

- Browse
- Edit
- Pinned
- Graph

Target:

- Life System page title;
- modes are one low-chrome tab family;
- Graph is a transient mode/workspace, not a separate route;
- no generic “Atlas / Timeline / List” controls unless added by product.

### L-02 — Browse / populated branch

Actual:

- Back;
- breadcrumb;
- optional fallback notice;
- focal node;
- child cards;
- pin controls;
- optional pagination;
- Related tasks.

Focal actual content:

- icon;
- direct child count;
- title;
- short description;
- tags;
- Pin/Unpin focal node.

Child:

- icon;
- title;
- description;
- Leaf — opens Reader OR direct-child count;
- tags;
- Pin/Pinned.

Target:

- treat Browse as a **hierarchical spatial document**, not a radial fantasy graph;
- focal node anchors the top/left-to-center composition;
- children form a bounded readable hierarchy;
- connector lines are quiet;
- child cards may use near-white Life tints but remain mostly neutral;
- focal uses blue family for distinction;
- pin control compact and subordinate.

Forbidden:

- invented health/work/finance metrics;
- arbitrary six-node radial atlas if current hierarchy does not produce it;
- zoom controls;
- timeline mode.

### L-03 — Browse / empty branch

Actual:

- `This branch is ready`
- `No child nodes have been added yet.`

Target:

- keep focal context visible;
- empty child region is small and instructive;
- no full-page empty takeover.

### L-04 — Browse / pagination

Actual:

- Previous children
- Page x of y
- Next children

Target:

- centered/edge-aligned pager beneath child region;
- no numbered pagination unless behavior changes.

### L-05 — Pinned / populated

Actual:

- list of pinned nodes;
- card opens Browse/Reader;
- Unpin.

Target:

- readable vertical list, not centered card island;
- same node DNA as Browse but denser.

### L-06 — Pinned / empty / unavailable

Actual:

- No pinned nodes;
- archived node may be unavailable;
- Unpin still available.

Target:

- unavailable state muted + explicit label;
- no opacity so low that title becomes unreadable.

### L-07 — Life Edit canvas

Actual:

- full tree canvas with positioned node cards;
- hierarchy edges;
- selected node;
- drag/drop;
- local-scroll viewport.

Target:

- the canvas is the hero;
- use a precise neutral drafting-board plane;
- no fake infinite-grid effects required;
- node cards compact;
- selected node blue companion signal;
- hierarchy lines thin;
- viewport owns scroll;
- do not add zoom/pan toolbar.

### L-08 — Life Edit inspector

Actual controls:

- Edit {title};
- protected root/depth/leaf-branch info;
- Title + Save title;
- Short description;
- Local icon select:
  - life-root
  - life-branch
  - life-leaf
  - life-focus
  - life-note;
- Theme variant:
  - neutral
  - blue
  - green
  - amber
  - violet;
- Save details;
- Tags for non-root;
- New child + Create child;
- Move up;
- Move down;
- conditional Move to parent level;
- Move into branch select;
- Move into selected branch;
- Open in Browse;
- Archive subtree;
- branch/tree interchange;
- Undo latest tree change;
- Archived nodes list + Restore.

Target:

- fixed bounded inspector rail;
- form controls grouped:
  1 identity;
  2 classification/tags;
  3 create child;
  4 move/restructure;
  5 interchange;
  6 undo/archive recovery.
- Archive subtree visually separated as destructive.
- Undo remains action, not a toast.

### L-09 — Life Edit drag state

Actual:

- drag overlay `Moving {title}`;
- drop-before and move-into targets;
- status announcements;
- invalid descendants/self.

Target:

- drag overlay is true floating material;
- target indication blue and precise;
- no giant glow;
- invalid targets should not look interactable.

### L-10 — Archived nodes

Actual:

- empty state;
- list;
- Restore.

Target:

- compact recovery region near bottom inspector;
- not an accordion unless behavior changes.

---

# Life Graph

## 17. LG-01 — Graph normal

Actual:

- `Life graph`;
- node/explicit-link count;
- read-only statement;
- Close graph;
- local-scroll canvas;
- hierarchy edges;
- explicit links;
- node marks;
- inspector;
- all explicit links table.

Target:

- preserve Graph as a technical explorer;
- canvas and inspector form a two-region workspace;
- graph drawing remains quiet;
- selected node tonal/blue;
- hierarchy edge solid;
- explicit link dashed/arrow;
- unavailable explicit link dotted;
- labels remain legible at normal density.

### LG-02 — Graph semantic inspector

Actual:

- explanation;
- Life node select;
- title;
- node kind;
- level;
- child/outgoing/backlink counts;
- Open in Reader/Browse;
- Parent;
- Children;
- Outgoing links;
- Backlinks.

Target:

- selector at top;
- selected title + compact metadata;
- open action clear;
- connection groups are structured lists with count headings;
- no cards per relationship.

### LG-03 — All explicit links

Actual table.

Target:

- horizontally local-scrollable if needed;
- one table surface;
- strong column alignment;
- no graph-only information hidden from text table.

### LG-04 — Graph error

Actual:

- Life graph unavailable;
- backend/refusal text;
- Close graph.

Target:

- preserve Life page;
- local notice;
- no full-page crash state.

Forbidden:

- zoom;
- pan toolbar;
- minimap;
- node creation/editing;
- link editing.

---

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

# Portable / Branch / Tree Interchange

## 21. PK-01 — Portable Package controls

Actual:

Document present:
- explanation;
- Export Lifeweave package;
- pending;
- draft-not-included note;
- success/error.

Empty leaf:
- Import Lifeweave package file input;
- validation/errors;
- opens preview.

Target:

- utility region, clearly secondary to document;
- file action styled as a real button/label;
- warning note readable.

### PK-02 — Portable package preview modal

Actual metadata:

- Title
- Type
- Template/version if any
- Visual World if any
- Scenes if any
- Assets + bytes
- Package bytes
- warnings
- Cancel
- Import into this empty leaf / Importing

Target:

- metadata definition list;
- warnings separated;
- import confirm primary;
- no preview thumbnail invented.

### BR-01 — Branch interchange controls

Actual:

- Export branch;
- Import branch here;
- blocked reason;
- status/error.

Blocked cases include:

- root;
- document-holding node;
- no active child.

Target:

- compact utility group inside Life Edit inspector;
- disabled buttons accompanied by reason.

### BR-02 — Branch import preview modal

Actual metadata:

- Branch
- Destination
- Nodes / branch / empty leaf counts
- Documents and kinds
- Depth
- Assets
- Tags
- internal links
- Package
- warnings
- Cancel
- Import branch here

Target:

- wide enough for metadata but not a table dashboard;
- danger is not implied: import appends and is safe/idempotent;
- warnings factual.

### TR-01 — Life Tree controls

Actual:

- Export Life tree only at root;
- Import Life tree here unless destination has document;
- blocked reasons;
- status/error.

### TR-02 — Tree import preview

Actual:

- complete non-root forest explanation;
- fresh local identities;
- never merge/replace/reorder/overwrite;
- cannot be undone;
- destination;
- top-level roots;
- nodes;
- documents;
- depth;
- assets;
- tags;
- internal links;
- package;
- warnings;
- Cancel;
- Import Life tree here, disabled if unsupported.

Target:

- because this is high consequence, hierarchy of explanation is critical;
- “cannot be undone” must be visible;
- confirm primary only when supported;
- no scary red full-dialog treatment unless error.

---

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

# Settings

## 25. S-01 — Settings page

Actual sections in exact order:

1. Category goals
2. Tags
3. Backup & restore
4. Keyboard
5. Foundation tools

Target:

- one continuous editorial settings document;
- sections separated by vertical rhythm + hairline;
- no full-width card per setting section;
- each section title + description tightly paired;
- controls begin after a clear content gap.

### S-02 — Category Goals

Actual per category:

- category name;
- Configure scheduled-time goals checkbox;
- Weekly minimum:
  - Hours
  - Minutes
- Weekly target:
  - Hours
  - Minutes
- Save goals / Saving;
- validation/error.

Target:

- category rows/editor blocks repeat cleanly;
- checkbox state controls field visibility;
- hours/minutes paired within one duration group;
- one save per category remains.

### S-03 — Tags / create and tables

Actual:

- New tag name;
- Create;
- Active tags table:
  - Name
  - Tasks
  - Series
  - Life nodes
  - Actions
- Archived tags table same columns;
- Merged aliases:
  - Alias
  - Canonical tag.

Target:

- tables are the correct primitive;
- no tag-card grid;
- usage counts tabular;
- actions compact.

### S-04 — Tag inline rename

Actual:

- inline input;
- Save/confirm via Enter;
- Cancel/Escape;
- error.

Target:

- same row expands minimally;
- no modal.

### S-05 — Tag merge

Actual:

- source select;
- “into”;
- target select;
- Merge;
- at-least-two state;
- inline confirmation with:
  - source name;
  - task count;
  - series count;
  - Life node count;
  - target;
  - permanent alias;
  - cannot be undone;
- Confirm merge / Retry;
- Cancel;
- error.

Target:

- merge is a dedicated subsection;
- confirmation region visually stronger than normal help, but remains inline;
- destructive/permanent nature is explicit;
- no modal unless behavior changes.

### S-06 — Backup & Restore

Actual:

- title + intro;
- Create backup / Creating;
- retention policy;
- managed backup versions;
- loading/error/empty;
- table:
  - Created
  - App
  - Format
  - Schema
  - DB size
  - Compatibility
  - Restore;
- status/error.

Target:

- backup creation action aligned with heading;
- retention policy readable but subordinate;
- versions table is hero of section;
- incompatible Restore disabled + compatibility text remains.

### S-07 — Restore backup modal

Actual:

- Restore managed backup?
- created time;
- format/schema;
- compatibility;
- optional migration note;
- safety-snapshot note;
- Cancel;
- Restore backup / Restoring.

Target:

- compact confirmation;
- initial focus remains Cancel;
- restore is prominent but visually serious;
- no extra password/check-box confirmation invented.

### S-08 — Keyboard section

Actual:

- explanation;
- Keyboard shortcuts button.

Target:

- one simple button; dialog specified globally.

### S-09 — Foundation tools

Actual:

- Foundation Records;
- create record:
  - New record label
  - Add;
- active list:
  - Edit
  - Archive;
- inline edit:
  - Save
  - Cancel;
- archived list:
  - Restore;
- loading/error/empty.

Target:

- verification/admin utility visual priority is low;
- do not hide/collapse automatically because current authority keeps it visible;
- styling still converges with Settings forms/lists.

---

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

# Part V — Evidence map

## 35. Primary source files traced for this specification

Shell / global:

- `frontend/src/app/App.tsx`
- `frontend/src/app/App.css.ts`
- `frontend/src/app/keyboardShortcuts.ts`
- `frontend/src/app/ShortcutHelpDialog.tsx`
- `frontend/src/app/RouteErrorBoundary.tsx`
- `frontend/src/app/layout/DialogSurface.tsx`
- `frontend/src/app/layout/PageFrame.tsx`
- `frontend/src/app/layout/tokens.css.ts`

Visual system:

- `frontend/src/design-system/visual/lightTheme.css.ts`
- `frontend/src/design-system/visual/theme.css.ts`
- `frontend/src/design-system/visual/typography.css.ts`
- `frontend/src/design-system/visual/motion.css.ts`
- `frontend/src/design-system/visual/atmosphere.css.ts`
- `frontend/src/design-system/primitives/controls.css.ts`

Task:

- `TodayScreen.tsx`
- `TaskInspector.tsx`
- `ActiveTimerStrip.tsx`
- `ActualTimeRowControl.tsx`
- `TaskWorkspaceTabs.tsx`
- `TaskPlanningPanel.tsx`
- `DeadlineQueuePanel.tsx`
- `TaskSavedViewsPanel.tsx`
- `TaskCombobox.tsx`
- `LifeAreaCombobox.tsx`
- `FocusPlanCombobox.tsx`
- `AssessmentControl.tsx`
- `TagPicker.tsx`

Calendar / Analytics:

- `CalendarScreen.tsx`
- `AnalyticsScreen.tsx`
- `FocusPlanAnalyticsSection.tsx`
- `CategoryGoals.tsx`

Plans:

- `FocusPlansScreen.tsx`
- `LinkedWorkPanel.tsx`
- `ReviewsPanel.tsx`

Life / Reader / Narrative:

- `LifeScreen.tsx`
- `LifeEditWorkspace.tsx`
- `LifeGraphWorkspace.tsx`
- `RelatedTasksPanel.tsx`
- `BasicLeafReader.tsx`
- `BasicLeafEditor.tsx`
- `LifeLinksPanel.tsx`
- `PortablePackageControls.tsx`
- `PortablePackageImportDialog.tsx`
- `LifeBranchControls.tsx`
- `LifeBranchImportDialog.tsx`
- `LifeTreeControls.tsx`
- `NarrativeTemplateChooser.tsx`
- `NarrativeCanvasReader.tsx`
- `NarrativeCanvasStudio.tsx`
- `NarrativeMarkdownImportDialog.tsx`
- `NarrativeMarkdownExportButton.tsx`
- `visualWorlds.ts`

Settings:

- `TagSettings.tsx`
- `BackupSettings.tsx`
- `FoundationScreen.tsx`

---

# Part VI — Phase 6 Lock

## 36. Locked decisions

- Quiet Precision Atlas remains the art direction.
- Simple blue infinity mark is the brand mark.
- Light mode is the redesign target.
- Frontend-only boundary remains hard.
- Approved concepts guide art direction only.
- Production source is capability authority.
- Calendar must become a more beautiful hero month board **without** inventing a day inspector/event agenda.
- No separate Reader/Narrative sidebar routes.
- No profile/footer invented from concept art.
- Every material surface is specified independently.
- Agent is an implementation engine, not the product designer.

## 37. Handoff to Phase 7

Phase 7 must convert this specification into:

1. migration dependency DAG;
2. finite surface coverage ledger;
3. primitive convergence work;
4. feature-family migration stages;
5. canonical screenshot states per stage;
6. verification gates;
7. stage-local Definition of Done;
8. bounded stop conditions.

Only after Phase 7 is locked should Phase 8 author the Master Execution Specification and bounded stage `/goal` prompts.


---

# Part VII — Micro-Control Specification

## 38. WeekStrip

**Source:** `frontend/src/features/calendar/WeekStrip.tsx`

Actual controls/content:

- Previous week;
- exactly seven day buttons, Monday-based;
- each day shows:
  - short weekday;
  - numeric day;
  - `Today` marker only on the current local date;
- Next week;
- selected date uses `aria-pressed`;
- today uses `aria-current="date"`.

Target:

- this is navigation, never a miniature calendar card;
- cap the seven-day cluster so it does not stretch absurdly across a wide Today page;
- previous/next are chromeless icon buttons;
- day buttons share equal width;
- selected date gets pale blue fill/blue text or edge;
- today marker is secondary to selected state;
- if today is also selected, merge the two visual signals cleanly;
- weekday is metadata; day numeral is the visual anchor;
- no month label, week number, event dots, or weather is invented here.

## 39. TimeWheel

**Source:** `TodayScreen.tsx`

Despite its name, this is not a rotary/fancy wheel. It is a compact pair of native/select-backed controls.

Actual:

- group label `Start` or `End`;
- hour select;
- literal colon separator;
- minute select;
- Start hour range: 04–23;
- End hour range: 04–24;
- minute range: 00–59.

Target:

- keep as one compact bounded time field;
- hour and minute selects visually read as a single time value;
- do not implement custom scroll wheels, clocks, dial pickers, or 12-hour AM/PM conversion;
- maintain exact 24-hour semantics;
- colon is visual separator, not a separate control.

## 40. Task row metadata order

The implementation may reorganize spacing, but it should preserve a stable hierarchy for existing information.

Recommended visible order:

1. title;
2. description;
3. category;
4. Life area;
5. Focus Plan;
6. deadline status/date;
7. recurring marker;
8. tags;
9. priority / timer / assessment / explicit Edit action in the action rail.

Do not let Life/Plan/tag chips become louder than the task title.

## 41. Today row interaction

Actual:

- single click selects;
- keyboard Space selects;
- double click edits;
- Enter edits;
- explicit Edit button edits;
- nested Life/Plan/timer/assessment controls stop row activation as appropriate.

Target:

- hover may indicate row clickability;
- selected state must be stable;
- do not add an invisible “whole row opens editor on one click” behavior that changes semantics;
- do not remove the explicit Edit affordance.

## 42. Calendar day interaction

Actual:

- each day cell is one button;
- click / Enter / Space activates date;
- activation navigates to Today for that date.

Target:

- whole cell should read as actionable without looking like a raised button;
- hover = faint tonal shift;
- focus = proper ring;
- selection/today state remain different from hover/focus;
- no nested buttons inside the day cell unless backend/frontend interaction model is explicitly changed later.

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

