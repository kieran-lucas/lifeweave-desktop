# ADR 0056 — Full-day Task scheduling

- Status: Accepted
- Date: 2026-10-13
- Decision owner: Product Owner
- Related issue: Product Owner request in the implementation session to let Plan Task select the whole day instead of starting at 04:00.
- Source lines: immutable source 637–638, 651–654, 907–914, 4494–4495; Decision Registry Task time bounds; ADR 0048 decision 2.

## Context

The original source explicitly excludes 00:00–04:00. The Product Owner now explicitly requests
full-day time selection in Plan Task. This is a bounded override of that lower scheduling limit;
the immutable source stays unchanged.

## Decision

- Plan Task and Edit Task share exact-minute hour options from 00 through 23. End additionally
  offers 24:00, with minutes restricted to 00.
- Rust accepts `00:00 <= start < end <= 24:00` for one-off Tasks, recurring series, and occurrence
  edits. 24:00 remains an end boundary on the scheduled local date.
- Existing date ownership, recurrence rules, ordinary-overlap rejection, exact-slot grouping,
  and keyboard/dismissal/focus behavior remain authoritative.
- This request changes selectable and persistable Task times only. Calendar's existing
  Morning/Afternoon/Evening load bands remain 04:00–12:00 / 12:00–18:00 / 18:00–24:00;
  early Tasks still enter ordinary Task counts and scheduled totals.

## Alternatives

Changing only the picker would expose times rejected by Rust. Treating 24:00 as a start or
allowing a range to wrap across midnight would change date ownership beyond this request.

## Consequences

### Data/migration

No migration is required: the existing Tasks CHECK accepts start 0–1439 and end 1–1440.
No stored schedule is rewritten. Recurring and occurrence writes retain transaction validation.
Schema, generated bindings, IPC commands, dependencies, and backup format are unchanged.

### Security/accessibility/performance

No security boundary changes. The existing spinbuttons retain keyboard support, minute precision,
and focus restoration, with their minimum hour updated to 0. Four hour options are added.

## Prototype/evidence

Existing picker and Today component tests cover early selection, create/edit submission, midnight,
last-minute boundaries, and accessibility. Rust domain and repository tests cover persistence,
recurring overrides, and conflict rules. Command results are reported in the implementation session.

## Rollback

Reverting the lower limit after users store early Tasks would make those schedules uneditable.
Any rollback must preserve their readability and recoverability and requires a new owner decision;
never delete or silently move early Tasks.

## Acceptance

The Product Owner's explicit 2026-10-13 request authorizes this bounded implementation.
