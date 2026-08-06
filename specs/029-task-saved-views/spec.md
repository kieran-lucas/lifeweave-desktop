# Task 39 Specification — Task Saved Views + Bounded Typed Filter Core
expansion; new dependencies; unrelated upgrades; workflows or workflow seal changes.
## 1. Product contract

A Saved View is a durable local configuration over one canonical Task projection. It stores a
name, base scope, v1 predicate, sort mode, group mode, active position, revision, and archive
metadata. It never stores SQL or executable text and never changes source membership rules.

## 2. Base scopes

Exactly one of `today | upcoming | overdue | deadlines` is required. Today reuses the selected
anchor day and current evaluation visibility; Upcoming is scheduled anchor +1…+14; Overdue is
scheduled anchor -30…-1 without a current evaluation; Deadlines is active one-off deadline
anchor -30…+14 inclusive. Source caps, recurrence/override identity, evaluation rules, and
deadline meaning are inherited unchanged.

## 3. Predicate v1

The root is `All(clauses)`. Clauses combine with AND; values inside one set clause combine with
OR. Clause order has no meaning and canonical serialization uses a deterministic kind order and
sorted unique values. Each kind occurs at most once.

Supported clauses are `task_kind_in`, `priority_in`, `category_id_in`, `tag_id_any`,
`life_area_id_in`, `focus_plan_id_in`, `has_deadline_is`, `deadline_state_in`, and
`scheduled_after_deadline_is`. Set clauses cannot be empty or contain duplicates. There are at
most 9 clauses, 12 IDs in an ID clause, and 48 referenced IDs total. Zero clauses is valid only
when sort or group is non-default; a view identical to its source is rejected.

No nesting, OR group, NOT, text query, regex, date/custom range expression, natural-language
filter, executable content, raw SQL, arbitrary JSON input, or unknown clause/version executes.
Malformed or unsupported persisted predicates leave the view visible and manageable with an
explicit unsupported state.

## 4. References

New or changed IDs must name active canonical categories, tags, non-root Life nodes, and Focus
Plans. Existing references survive later archive and display archived context. A tag alias is
resolved through `merged_into_tag_id`, matches canonical assignments, and may be rewritten to
the canonical target on an explicit save. A missing reference produces a warning and makes its
whole clause match nothing; it is never ignored or allowed to crash execution.

## 5. Sort and group

Sort is exactly one of `base_default | scheduled_ascending | priority_then_scheduled |
title_ascending`. Group is exactly one of `base_default | none | category | life_area |
focus_plan`. Stable identity finishes every ordering. Base-default grouping preserves Today
period/exact-slot presentation context, planning scheduled dates, or deadline state. Missing
Life/Plan relations use explicit `No Life area` / `No Focus Plan` groups; archived labels are
textual. There is no nested grouping, manual group ordering, or multi-sort.

## 6. Lifecycle

Create, active list, detail, update, archive, archived list, restore, and active reorder are
supported; hard delete is not. Names canonicalize to 1–80 control-free characters and their
normalized form is unique across active and archived rows. At most 50 views are active.
Revision protects update/archive/restore from stale writes. Active positions remain compact;
restore appends. Reorder is one transaction and accepts exactly the active ID set.

## 7. Projection and navigation

Rust executes the canonical base projection first, normalizes rows, batch-loads Task/series
tags and referenced metadata, resolves aliases, evaluates predicates, sorts, and groups. More
than 5,000 source or result items is an error, never truncation. One-off identity carries
`task_id`; recurring identity carries `series_id` and `original_local_date`; moved occurrences
navigate to the displayed scheduled date while preserving original identity.

Rows expose factual title/description, schedule, category, priority, tags, Life, Focus Plan,
evaluation where available, deadline metadata where applicable, and source context. Rows remain
semantic rows, not cards, and open through the existing pending-navigation envelope.

## 8. UI and accessibility

The Today tablist becomes `Today | Upcoming | Overdue | Deadlines | Views`, retaining roving
keyboard behaviour, Home/End, focus, and editor-open disabling. The Views panel provides active
selection, create/edit/archive, keyboard move buttons, archived restore, and explicit
loading/error/empty/unsupported states. Its editor uses only typed controls, announces errors,
retains failed drafts and focus, and cancels on Escape without persistence. Semantic groups and
lists, complete keyboard operation, text state, Reduced Motion, and axe coverage are required.

## 9. Persistence and integration

Migration 23 adds only `task_saved_views`; migrations 1–22 are immutable. Full-database backup,
restore, and reopen preserve active and archived views, canonical predicates, lifecycle,
revision, and order. Search, Calendar aggregation, Analytics, Portable Package, export, sidebar,
startup, and existing Task/Tag/Life/Plan authorities are unchanged.

## 10. Hard exclusions

Task 40; new routes/sidebar/defaults; query languages; raw SQL; executable expressions; regex;
AI filters; custom/unbounded horizons; cards, boards, dashboards; sharing/sync/subscriptions;
notifications; actual time; recurring deadlines; deadline analytics; score/prediction; Graph,
Noteboard, backlinks, Generic Outline, interchange expansion; Focus Plan progress/phases/review
expansion; new dependencies; unrelated upgrades; workflows or workflow seal changes.
