# ADR 0053 — Focus Plan Priority Levels

## Status

Accepted by explicit Product Owner decision on 2026-08-18. Implemented as a narrow Product Owner
amendment on top of Slice 041.

## Context

A Focus Plan already carries `lifecycle` (where the Plan stands) and a manual `score` (ADR 0047, a
retrospective assessment recorded when work finishes). Neither answers the question a person asks
when the Active portfolio holds several Plans at once: *which of these deserves my attention first?*

The portfolio was ordered by date alone, so a Plan that merely starts sooner outranked a Plan the
person considers decisive. The Product Owner requested an explicit, user-authored priority.

## Decision

- A Focus Plan owns a required `priority` drawn from a **Plan-specific four-level scale**:
  `critical | high | normal | low`.
- The column is `NOT NULL DEFAULT 'normal'` and is validated by both SQLite and Rust. `normal` is
  the neutral level, so there is deliberately no separate "unset" state: an absent priority would be
  indistinguishable from `normal` while forcing every ordering query to handle a NULL bucket.
- Priority is the **first sort key** of every portfolio projection, ahead of the existing date
  ordering. Within one level the previously released date ordering is unchanged.
- Priority is edited through the existing `mutate_focus_plan` command as a field of the existing
  `update_plan` action, and is set at creation through `create_focus_plan`. No second write
  authority, no priority-specific IPC command, and no quick-set control on the portfolio row.
- Priority participates in optimistic revision and idempotency semantics, appears in Plan summary
  and detail projections, is carried by committed revision snapshots so recovery restores it, and is
  preserved by full-database backup/restore.
- The portfolio row and the Plan detail header show a priority badge. The badge always prints the
  level name and draws a four-step meter, so tone is redundant reinforcement rather than the sole
  signal.
- Migration 33 appends the checked column. Migrations 1–32 remain immutable.

### Why a Plan-specific scale rather than the Task scale

The immutable source specification defines `low | medium | high` for **Tasks** only, and ties it to
Task behaviour: deterministic sort inside a time-slot group, and a marker that must not shift the
title. A Focus Plan spans weeks to months, so the two vocabularies answer different questions and a
Plan-level `critical` has no Task equivalent. Reusing the Task enum would have made the shared name
imply a shared meaning it does not have.

This is a deliberate, recorded divergence, not a silent reconciliation. Task priority is unchanged;
the two scales stay independent and are never converted into one another.

## Consequences

- Portfolio ordering changes for existing users. Every Plan that existed before migration 33 becomes
  `normal`, so the relative order of untouched Plans is preserved until someone edits a priority.
- The product now holds two priority vocabularies. Any future feature that wants to sort, filter, or
  report across both Tasks and Plans must choose one explicitly rather than assume they align.
- The badge is the second concrete use of the priority-meter visual language (the first is the Task
  row). Extracting a shared design-system component is now justified but is deliberately deferred so
  this change does not reach into the Task surface.

### Supersedes part of ADR 0047

ADR 0047's Product Owner override stated that "Active Plans carry a visible `Active` label with
redundant green emphasis." That label is **removed** from the portfolio row and replaced by the
priority badge in the same position. Lifecycle remains fully visible without it: the portfolio tab
names the lifecycle of every row it shows, completed Plans keep the title strike-through, and the
Plan detail header keeps its explicit lifecycle badge. Every other clause of ADR 0047 stands.

## Still prohibited

Automatic or inferred priority, priority history, priority analytics, priority-driven lifecycle or
scheduling changes, priority-based Task mutation, priority in the search index or portable package,
and portfolio filtering or grouping by priority. Adding any of these requires a new decision.
