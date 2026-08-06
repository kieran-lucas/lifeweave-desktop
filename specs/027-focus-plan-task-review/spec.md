# Task 37 Specification — Focus Plan ↔ Task Integration and Manual Review History

## 1. Product contract

A Focus Plan may be associated with concrete work, and a Focus Plan may accumulate a
user-authored history of manual reviews. Neither capability introduces automation,
inference, computed progress, or scheduling.

## 2. Relationship cardinality

```text
one-off Task     → Focus Plan : zero or one
recurring series → Focus Plan : zero or one
Focus Plan       → one-off Tasks and recurring series : zero to many

occurrence          → owns no Focus Plan relation
occurrence override → owns no Focus Plan relation
evaluation          → owns no Focus Plan relation
```

Authority is stored on `tasks` and `task_series`. A recurring occurrence inherits its Plan
projection from its authoritative series. Task-to-Life and Task-to-Focus-Plan are
independent; the two targets need not reference the same Life node.

## 3. Target validity

A new or changed target must exist and must not be archived. Validation belongs to Rust at
commit time and the mutation is transactional. A Focus Plan is never inferred from tags,
category, Life relation, title, phase, date, or text.

## 4. Historical integrity

When a linked Plan is archived afterwards, the stored relationship is preserved, unrelated
edits to the Task or series continue to succeed, and the relation is projected explicitly as
archived. Restoring the Plan restores ordinary projection and navigation without rebuilding
links. Work is never silently unlinked and never cascade-deleted.

## 5. Recurrence authority

| Operation | Behaviour |
|---|---|
| Create recurring series | the optional relationship is stored on the series |
| Edit `OnlyThisOccurrence` | the relationship is not editable at occurrence scope and no override is written |
| Edit `EntireSeries` | assigning, changing, and removing the series relationship are allowed; every occurrence projects the new value |
| Edit `ThisAndFuture` | the old series retains its previous relationship; the new future series inherits it by default and an explicitly chosen valid Plan applies only to the new series |
| Cancel or move an occurrence | inherited projection is preserved and no occurrence-owned authority is created |

Existing overrides continue to inherit from their authoritative series. Plan identifiers are
never materialised into override rows.

## 6. Lifecycle isolation

Completing, evaluating, deleting, rescheduling, cancelling, moving, linking, or unlinking
work never activates, pauses, completes, archives, or restores a Focus Plan, never selects or
advances a phase, never alters a variant, never creates a review, never infers progress, and
never changes Plan dates or success criteria. Focus Plan lifecycle remains explicit and
manual.

## 7. Manual reviews

Each review owns a stable opaque ID, an owning Plan, a user-selected
`reviewed_local_date` using existing local date-only rules, a required user-authored
`reflection`, an optional user-authored `next_focus`, a unique `operation_id`, and a
deterministic creation timestamp.

- a review is a historical reflection record, not an evaluation, reminder, event, Task,
  document, or Reader row;
- creating a review changes no Plan field, lifecycle, variant, phase, tag, revision,
  recovery draft, or linked work;
- multiple reviews may share one review date and any valid local date is accepted;
- an empty or whitespace-only reflection is rejected;
- `reflection` is bounded to 4000 characters and `next_focus` to 2000 characters;
- history is ordered newest first with a stable tie-breaker and every query is bounded;
- retrying creation with the same `operation_id` returns the existing review and creates no
  duplicate.

Task 37 authorises creation and reading only. Review edit, delete, archive, revision,
recovery draft, rich text, attachments, templates, comments, generated summaries, and Search
indexing are prohibited.

## 8. Task workflows

The existing Task editor gains one optional Focus Plan control. No second editor is created.
The control supports an unlinked state, lists eligible non-archived Plans through a bounded
query, preserves and identifies an archived current target, never creates Plans inline, never
auto-selects, and preserves user input when validation or persistence fails. Under
`OnlyThisOccurrence` the control is inoperable and carries an accessible explanation that the
Plan belongs to the series.

## 9. Task projections

Today, Upcoming, and Overdue project enough Focus Plan context to identify a linked Plan,
identify archived state without relying on colour alone, and navigate to the exact Plan. The
affordance is a compact row-level control consistent with current Task-row UI. Task rows
remain non-card, Today remains startup and default, no new destination is added, and no
automatic progress appears.

## 10. Focus Plan detail

A bounded Linked work region lists linked one-off Tasks and recurring series with the factual
type, state, and date context required for navigation, in deterministic order, without N+1
SQL or IPC, and shows factual counts for one-off Tasks and recurring series. A one-off Task
navigates to its existing Task destination and date; a recurring series navigates using the
existing authoritative appropriate-occurrence behaviour.

A bounded Reviews region presents an accessible creation form for review date, reflection, and
next focus, announces validation and persistence errors, retains entered text on failure,
prevents duplicate submission while pending, displays history newest first using semantic
heading, list, article, and time structures, supports complete keyboard operation, restores
focus deterministically after submission, and shows review count and latest review date as
factual metadata.

Phase-to-Task grouping, drag linking, boards, inferred ratios, custom filters, saved views, and
a generic relationship browser are prohibited.

## 11. Navigation

```text
Today / Upcoming / Overdue Task row  → exact Focus Plan
Focus Plan / Linked work item        → existing Task destination at an appropriate date
```

Navigation uses the application's existing entry-request pattern. No URL routing and no second
global state authority are introduced.

## 12. Persistence boundary

Migration 21 is forward-only and appends to the released set. It adds a nullable
`focus_plan_id` foreign key to `tasks` and `task_series`, supporting indexes, and the
`focus_plan_reviews` table with a bounded newest-first history index. Occurrence, override, and
evaluation tables receive no column. Migrations 1 through 20 are never edited. Foreign keys
remain enabled and verified. Multi-write changes remain transactional.

## 13. Backup and portability

Full-database backup, integrity verification, restore, and reopen preserve exact relationship
and review semantics. Task 37 introduces no Plan-specific interchange format and does not
change Portable Package v1.

## 14. Accessibility

Keyboard parity covers plan selection, row navigation, linked-work navigation, and review
authoring. Native semantics precede ARIA. Errors are announced and retain input. Focus
restoration is deterministic. No state depends on colour, hover, drag, animation, or spatial
layout alone. Reduced Motion is honoured.

## 15. Hard exclusions

Automatic Plan or phase progress, automatic completion, automatic lifecycle transitions,
Task-to-phase relationships, generating Tasks from phases or reviews or criteria or outcomes,
review reminders and notifications and schedulers, automatic weekly review creation, review or
Plan analytics expansion, scoring and health indicators and prediction and generated content,
deadline semantics, many-to-many Task-to-Plan relations, occurrence-owned relations, Life-tree
and Life Browse changes, Plan-specific interchange packages, Search indexing of review bodies,
new top-level destinations, new generic relationship infrastructure, dependency changes,
workflow and seal changes, and Task 38 activation are all prohibited.
