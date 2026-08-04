# ADR 0026 — Upcoming and Overdue Task Planning

**Status:** Accepted for Task 32
**Date:** 2026-08-04

## Decision

Today remains the default and only Task sidebar destination. Today, Upcoming,
and Overdue are horizontal manual-activation tabs inside the existing Task
workspace. Upcoming covers tomorrow through anchor +14 local calendar days;
Overdue covers anchor -30 through yesterday and means no current evaluation.
Any current evaluation reviews the item, while undo may restore it. Missed and
Overdue remain derived and are not persisted.

Recurring occurrence identity remains series ID plus original local date.
Cancellation, replacement, moved-in, finite-rule, and split semantics remain
owned by the recurrence and override authorities. Archived series are omitted
from active planning queues. Queue rows navigate to the exact displayed date
and identity in the existing Today editor/evaluator; those workflows are not
duplicated.

The tabs use manual activation because the non-Today panels are lazy and
asynchronous. Rust receives a caller-supplied local anchor, derives fixed
windows, bulk-loads projection authorities, and fails rather than truncates
above 5,000 items.

## Consequences

Exactly one query command is added. No migration, dependency, new route,
sidebar destination, persistent queue state, plugin, broad capability, or
Task 33 behavior is introduced. Schema remains 16 and the next action after
acceptance is the Product Owner gate.
