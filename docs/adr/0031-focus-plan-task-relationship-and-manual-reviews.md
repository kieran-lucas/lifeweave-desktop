# ADR 0031 — Focus Plan Task Relationship and Manual Reviews

## Status

Accepted and implemented through Task 37 / Slice 027. Supplements ADR 0030, which fixed the
cardinality but decided nothing about reviews.

## Context

Task 36 delivered the standalone Focus Plan as an isolated layer. Plans could not be reached
from the work they organise, work could not name the strategy it served, and a user had no
place to record how a medium-term strategy was actually going.

Two decisions were required: how a Task references a Plan, and what a Plan review is.

## Decision — relationship

`tasks` and `task_series` are the two canonical Task authorities, so migration 21 adds a
nullable `focus_plan_id` foreign key to both, exactly as migration 16 did for `life_node_id`.
Occurrence, override, and evaluation rows receive no column; a recurring occurrence inherits
its Plan projection from its authoritative series.

```text
one-off Task     → Focus Plan: zero or one
recurring series → Focus Plan: zero or one
Focus Plan       → linked work: zero to many
occurrence/override/evaluation → inherited projection only
```

A new or changed target must exist and must not be archived; validation lives in Rust at
commit time rather than in a trigger, so an existing link to a later-archived Plan survives
unrelated edits and continues to project truthfully as archived. Restoring the Plan restores
ordinary projection without rebuilding links. Task-to-Life and Task-to-Plan are independent.

Recurring edit scopes follow the established Life precedent: the relation cannot change at
`OnlyThisOccurrence` scope, `EntireSeries` sets it absolutely, and a `ThisAndFuture` split
leaves the old series relation untouched while the new future series takes the supplied
value — inherited by default, or explicitly chosen for the future segment alone.

Linked work reuses the Related Tasks navigation projection from ADR 0024 through one
owner-parameterised core, so a recurring series resolves to its appropriate occurrence and
overrides are still loaded in bulk.

## Decision — manual reviews

A review is a user-authored historical reflection owned by a Focus Plan, stored in
`focus_plan_reviews`. It carries a stable ID, the owning plan, a user-selected local review
date, a required reflection, an optional next focus, a unique `operation_id`, and a creation
timestamp.

Reviews are deliberately **not** modelled as `FocusPlanMutationAction` variants. That path
advances `focus_plans.revision` and writes a `focus_plan_revisions` snapshot, which would
contradict the rule that creating a review changes nothing about the Plan, and would grow
every later snapshot against the 2 MiB canonical-JSON bound. Idempotency instead comes from a
UNIQUE `operation_id`: a retried creation resolves to the stored review. For the same reason
reviews are not embedded in `FocusPlanDetailView`; they are read through their own bounded,
newest-first command ordered by `(reviewed_local_date, created_at, id)` descending.

Task 37 authorises creation and reading only. Edit, delete, archive, revision, recovery
draft, attachments, templates, generated summaries, scheduling, and Search indexing are out
of scope. This is a Task 37 boundary, not a permanent prohibition.

## Consequences

- migration 21 owns the relationship columns, their indexes, and `focus_plan_reviews`;
- reviews are not Search-indexed and carry no dirty-scope trigger;
- Plan lifecycle stays manual — no Task operation moves a Plan through its lifecycle;
- no automatic progress, percentage, or completion inference is introduced;
- Today remains startup/default and Task rows remain non-card;
- full-database backup remains the portability authority; Portable Package v1 is unchanged;
- no dependency, capability expansion, or workflow change was required.

## Migration and rollback

Migration 21 is append-only and applied in one transaction after schema 20. Code rollback is
safe before the migration reaches user data. After schema 21 has been applied, roll forward:
dropping the columns and the review table would destroy user-authored relations and review
history, so it is not a safe user-data rollback.

## Reversal conditions

Reopen only if the relationship must become many-to-many, if occurrences must own a Plan
relation, if reviews must become mutable or scheduled, if a reproducible P0/P1 safety or
data-loss defect appears, or if the Product Owner explicitly reverses the decision.

## Next action

No active spec. Tasks 38–60 remain available for later Product Owner allocation.
