# Task 50 Acceptance

Task 50 closes only when all of the following are evidenced.

## Geometry

- schema remains 27, with no migration, Rust product change, IPC command, capability, or dependency;
- one layout authority exists under `frontend/src/app/layout/`, and no domain CSS file declares a
  page maximum width, page gutter, dialog width, or page-level section gap after the slice;
- every top-level surface declares exactly one page type from the finite taxonomy;
- at 1280×720, 1440×900 and 1920×1080, with the sidebar expanded and collapsed, and in both empty
  and populated states, `scrollWidth <= clientWidth + 1` holds at the document root, the main
  viewport, and the page frame for every ordinary screen;
- a capped page frame is centred within the main viewport content box to within 2 CSS px;
- the four standard pages share the same frame geometry at the same viewport;
- no ordinary overflow is concealed: no global `overflow-x: hidden`, negative-margin clipping,
  `translateX` compensation, or `scale()` to fit appears in the diff;
- Life graph and Life Edit own their horizontal scroll locally, and the main viewport stays
  horizontally stable while they do;
- the long-string stress set forces no page-level horizontal overflow.

## Dialogs and forms

- the Task create/edit dialog is a real contained surface with heading, status, body and footer;
- every Task dialog field remains present, with unchanged semantics and unchanged validation;
- no two visible sibling controls inside the Task dialog intersect, in empty Create, in Create with
  recurrence enabled, and in Edit of a recurring occurrence with scope controls;
- every tested dialog stays inside the visual viewport, or its bounded scrollable rectangle does,
  and its heading, first and last controls, and action footer remain reachable at 1280×720;
- Escape behaviour, focus containment and focus restoration are unchanged.

## Named baseline defects

- the Settings document-level horizontal scrollbar is removed at source and does not reappear at any
  tested viewport in either sidebar state;
- Today period headings render name and time range as separated layout, not concatenated text;
- the Today timeline row declares a track for every child it renders.

## Surface completeness

- every DECIDED, implemented, user-facing capability is audited in the census with one of the seven
  classifications and exact totals;
- every `MISSING_USER_SURFACE` is either surfaced using existing IPC or recorded as
  `BLOCKED_SURFACE` with the exact missing authority;
- the visible Task row Edit control exists, opens the same editor the row gestures open, and a
  frontend test fails without it;
- double-click and `Enter` on a Task row still open the editor;
- no internal choreography command gains a user control, and no duplicate backend path gains a
  second button.

## Preserved semantics

- Task rows remain non-card; Today remains task-first, startup and default;
- the sidebar keeps its order and Life auto-collapse is unchanged;
- no OPEN, DEFERRED or PROHIBITED feature is activated;
- no palette, brand, logo, font family, icon language, radius, shadow, illustration, Visual World,
  motion or sound change appears in the diff.

## Evidence

- frontend tests and axe checks pass, with structural contracts only — no jsdom bounding-box claim;
- native phase 21 passes at all three viewports in both sidebar states;
- one deliberate geometry break produced a meaningful failure of the expected invariant, was
  restored, and left zero residue;
- baseline and final screenshot matrices exist and were reviewed on the eight research rubric
  dimensions with `PASS` / `NEEDS_FIX` / `INTENTIONAL_EXCEPTION` and one sentence of evidence each;
- production build, performance budgets, and the full validation sequence pass, with Task 49's hard
  ceilings unchanged;
- physical Windows DPI scaling evidence is recorded honestly, as `NOT RUN` if it was not run;
- pre-existing native verification debt is disclosed rather than weakened;
- the full diff against the activation SHA answers all nineteen closure questions with no confirmed
  violation;
- worktree clean, `HEAD == origin/main`, PROJECT_STATE back to `product_owner_gate`, Task 51
  unstarted.
