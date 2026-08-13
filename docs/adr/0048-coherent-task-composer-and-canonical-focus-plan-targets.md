# ADR 0048 — Coherent Task composer and canonical Focus Plan targets

## Status

Accepted by explicit Product Owner direction on 2026-08-13 and implemented as a narrow amendment
to active Slice 041.

## Context

The Task create and edit paths shared persistence but not a coherent presentation: schedule date
used a browser-native calendar, time used a custom wheel, Category was available only while
creating, and Priority, Deadline, and Repeat retained unrelated native controls. The category
catalog also contained only General on a fresh database. Separately, the Task Focus Plan picker
read the correct non-archived projection but could retain stale TanStack Query data after mutations
made by the canonical Plans screen.

## Decision

1. Plan Task and Edit Task render the same schedule, Category, Priority, Deadline, Life Area, and
   Focus Plan components. Existing recurring-scope restrictions remain visible and unchanged.
2. Schedule date and optional Deadline use one local date-grid component with six stable weeks,
   previous/next month and Today actions, Arrow/Home/End/Page navigation, Enter/Space selection,
   outside dismissal, Escape dismissal, and deterministic focus restoration. Exact Start/End time
   remains the existing 04:00–24:00 one-minute wheel authority, with the same dismissal contract.
3. Category is a visual workstream picker with icon, colour, selected text, keyboard navigation,
   and no color-only meaning. Schema 31 inserts the ten Product Owner workstreams missing from the
   original General-only catalog using `INSERT OR IGNORE`; existing rows, category goals, Task
   links, and user edits are never overwritten.
4. Priority and Repeat use the same labelled choice-control language in create and edit surfaces.
   This changes presentation only; values and recurrence authority are unchanged.
5. Task Focus Plan options remain exactly ADR 0031's bounded non-archived Plan projection across
   all lifecycles. The picker owns one shared query key, refetches on mount, and the canonical Plans
   screen invalidates that key after create, update, lifecycle, score, archive, and restore success.
   Existing links to later-archived Plans continue to project explicitly as archived.
6. A selected Life Tree leaf opens its Add child / Edit node action surface above the node so dense
   sibling rows do not conceal the action. Branch actions retain their below-node placement.
7. The Task composer is one focused matte instrument rather than a collection of unrelated controls:
   a compact black identity header leads three ruled semantic regions (Essentials, Schedule, and
   Context), every field uses the same label/control rhythm, and selection uses monochrome inversion.
   Create and edit share this exact composition. Category diversity remains in its names and governed
   icon vocabulary; chromatic category and Priority treatments do not leak into the dialog.
8. Task-composer motion is restrained but weighty: the surface settles over the shared route
   duration, while floating pickers use the shared inspector duration and layered matte elevation.
   Time-wheel rows have one fixed 40 px geometry and one fixed 15 px numeral size in every state.
   Selection may change contrast and weight, never font size or scale. Discrete wheel and keyboard
   changes scroll one row smoothly; direct drag remains bounded by mandatory row snapping.
9. Edit Plan retains its document-first identity but uses the same form grammar as Edit Task. Title
   and Outcome are explicit aligned fields; Start date, Target date, Life Area, and Status form a
   two-column 52 px control grid inside one bounded editing instrument. This is presentation only
   and does not merge Task and Plan domain semantics. Read-mode fact-row alignment rules are scoped
   away from edit mode, and the Content toolbar normalizes every button to one optical center without
   inheriting italic/skew styling from the shared Leaf toolbar's positional selectors.
10. The Task composer uses one six-column form authority rather than a section rail plus unrelated
    local grids. Date, Start, and End each span two columns; paired Context fields each span three;
    Tags spans all six. Section identity is a compact heading above its fields, and every ordinary
    control uses the same 52 px geometry. Native `fieldset`/`legend` layout is not used for the
    Priority and Repeat visual groups because it creates a different baseline box; accessible group
    naming is retained with `role="group"` and `aria-labelledby`.
11. A Task exposes Title and Description, never a Notes field. Life Area selection is a staged
    Domain → Section → Area walk with global search as an escape hatch; selected fields show only
    their concise title rather than a long breadcrumb. Focus Plan remains the canonical flat target
    projection and shows lifecycle only as quiet secondary metadata. Both pickers use a compact
    in-control clear action, one-line truncation, and the same keyboard and dismissal contract.

## Consequences

- schema 31 adds no table or column and is forward-only and idempotent;
- no Category is renamed or deleted, and no Task/recurrence/Plan relationship meaning changes;
- no new IPC command, dependency, permission, capability, network path, or reminder behavior is
  introduced;
- the visual refinement changes no Task field, recurrence value, relationship, query, or persistence
  behavior and restores the canonical standard dialog width with internal scrolling;
- the `description` authority and stored values are unchanged; only the incorrect Notes copy is
  removed;
- staged Life navigation changes only how the existing canonical target list is presented and does
  not create, reorder, flatten, or rewrite Life nodes;
- time selection no longer produces layout-shifting numeral growth during a wheel transition, and
  Reduced Motion still removes authored entrance motion;
- automated tests cover migration preservation, create/edit component parity, calendar/time
  keyboard and dismissal behavior, Focus Plan cache invalidation, and leaf action placement;
- native WebView visual evidence remains a separate proof layer and must not be inferred from
  jsdom.
