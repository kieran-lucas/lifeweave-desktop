# ADR 0024 — Recurring Related Task Navigation

**Status:** Accepted for Task 30
**Date:** 2026-08-04

## Decision

Related Tasks is a navigation projection. The caller supplies an ISO local anchor date, and a recurring series navigates to its nearest actionable displayed occurrence on or after that anchor. A normal occurrence displays its generated original date; a non-cancelled moved occurrence displays its replacement date. Moved-in overrides remain authoritative even when their original date predates the anchor or is no longer generated after a later split.

An active finite series with no actionable future occurrence is omitted rather than labeled Completed because there is no canonical series-completed state. One-off behavior and evaluation grouping remain unchanged.

Recurrence rules and occurrence overrides remain authoritative. The projected navigation date is not stored. Linked active series and their overrides are loaded in bulk so recurrence projection performs no SQL inside the per-series loop. Expansion remains bounded by the existing cap.

## Consequences

The frontend owns local-date determination and Rust validates the supplied date before querying. The existing Related Tasks command changes parameters but retains its name and permission. Schema remains 16; no migration or dependency is introduced. Task 31 is not activated.
