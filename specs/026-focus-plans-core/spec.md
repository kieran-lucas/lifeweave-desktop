# Task 36 Specification — Standalone Focus Plans Core

## 1. Product contract

A Focus Plan is a first-class local entity for a strategy lasting weeks to
months. It is not a Task, Life node, reader document, Narrative Canvas, saved
view, or analytics record.

## 2. Identity and lifecycle

Every Plan has an opaque stable ID. Title changes, Life reassignment, lifecycle
changes, variant changes, archive/restore, and revision recovery never change
that ID.

Allowed lifecycle values:

```text
draft | active | paused | completed
```

Archive is orthogonal to lifecycle. Lifecycle changes are explicit and manual.
Task completion never changes Plan lifecycle.

## 3. Dates

`start_date` and `target_date` are nullable local calendar dates. When both
exist, `start_date <= target_date`. They do not schedule Tasks, trigger
notifications, or introduce deadline semantics.

## 4. Life context

```text
Focus Plan → Life node: zero or one
Life node → Focus Plans: zero to many
```

The target must exist, be active, and not be `life-root`. A Plan may remain
unlinked. Reassignment changes context only and never moves or renames either
entity.

## 5. Variants

- each non-deleted Plan owns 1–5 variants;
- variant IDs are stable;
- exactly one non-archived variant is selected;
- the selected variant cannot be archived;
- the last non-archived variant cannot be archived;
- selecting an archived variant is rejected;
- archive/restore preserves body and phases;
- a variant body stores the accepted Basic Leaf canonical rich-text JSON value
  schema, but creates no `reader_documents` row.

## 6. Phases

- each variant owns 0–20 phases;
- phase IDs are stable;
- ordering is explicit and contiguous in projections;
- create, rename, reorder, archive, and restore are supported;
- archive/restore preserves relative ordering;
- phases contain no Task relation and no computed progress.

## 7. Plan content

A Plan owns:

- title;
- outcome;
- ordered success criteria;
- lifecycle and dates;
- optional Life context;
- selected variant and variant bodies;
- ordered phases;
- shared tags;
- archive state;
- revision metadata.

## 8. Revisions and recovery

- committed Plan saves use `expected_revision` optimistic concurrency;
- a successful semantic mutation advances revision exactly once;
- each operation carries a unique `operation_id` and retries are idempotent;
- immutable bounded revisions preserve prior canonical Plan state;
- one recovery draft per Plan is distinct from committed revisions;
- stale save returns a typed conflict without discarding either committed state
  or the recovery draft;
- archive/restore preserves revisions and draft;
- retention is bounded to the latest 50 committed revisions per Plan.

## 9. Tags

Focus Plans use the existing global `tags` vocabulary through
`focus_plan_tags`. Only active, non-merged tags may be assigned. Assignment cap:
20 tags per Plan. Merge reassigns Plan joins to the surviving tag and aliases
remain searchable under existing tag authority.

## 10. Search

Search adds `entity_kind = focus_plan`. Indexed context includes title, outcome,
success criteria, selected active variant label/body plain text, active phase
titles, optional Life title/path, visible tag names, and tag aliases. Archived
Plans are excluded from ordinary results. Rebuild and query must be bounded and
must not use N+1 SQL or IPC.

## 11. Backup and portability

Full-database backup/reopen/restore is authoritative in Task 36. Backup must
preserve exact Plan, variant, phase, revision, draft, and tag semantics.
Task 36 introduces no Plan-specific Portable Package.

## 12. Frontend

A lazy `Plans` destination is added without changing Today startup/default.
Portfolio projections:

```text
Active | Drafts | Paused | Completed | Archived
```

Required workflows:

- create Plan;
- open exact Plan;
- edit title, dates, lifecycle, Life context, outcome, criteria, and tags;
- add/rename/select/archive/restore variants;
- edit selected variant body;
- add/rename/reorder/archive/restore phases;
- save/recover conflict draft;
- archive/restore Plan.

No automatic percentage is shown.

## 13. Accessibility

- keyboard-complete portfolio and detail navigation;
- native landmarks, headings, form labels, fieldsets, radio semantics, ordered
  phase semantics, and explicit move controls;
- focus returns to the invoker after dialogs/layers;
- validation/conflict errors retain user input and receive announcements;
- no operation depends only on drag, hover, color, animation, or spatial layout;
- Reduced Motion is honored.

## 14. Persistence boundary

Migration 20 may create only Plan-owned tables, indexes, and triggers plus the
minimum Search/tag integration. It must not alter `tasks`, `task_series`,
occurrences, or evaluations.

## 15. Hard exclusions

Task/series links, weekly review, automatic progress, reminders/notifications,
AI generation, cloud/collaboration, many-to-many Life, Plan interchange,
deadline semantics, saved views, scoring, prediction, and Task 37 work are
prohibited.
