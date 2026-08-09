# Surface Authority — Today Task

**Scope:** Today, inspector, timer/assessment, Task create/edit, planning and Saved Views.

**Canonical closure IDs:** T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, MC-01, T-11, T-12, T-13, T-14, T-15, T-16, T-17, MC-02, MC-03, T-18, T-19, T-20, T-21, T-22

**Visual references:** `references/01-today-approved-direction.png`

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

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


# Canonical Micro-Control Appendix

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
