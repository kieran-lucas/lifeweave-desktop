# Task 32 specification

Today remains the startup and Task-workspace default. The workspace contains
manual-activation `Today`, `Upcoming`, and `Overdue` tabs; no route or sidebar
destination is added.

Upcoming derives the inclusive local-date range anchor +1 through +14. Overdue
derives anchor -30 through -1 and includes only non-cancelled items without a
current evaluation. Any current evaluation counts as reviewed. The frontend
supplies the local ISO anchor and Rust validates and derives both windows.

One-off authority is `tasks`. Recurring authority is active `task_series`, RFC
5545 expansion, occurrence overrides, and current evaluations. Stable recurring
identity is series ID plus original local date; replacement date is display and
navigation only. Moved-in overrides remain authoritative, moved-out originals
and cancellations are absent, archived series are excluded, and finite/split
rules remain recurrence-engine authority.

The projection uses bounded bulk queries for categories, Life areas, Tasks,
series, overrides, and evaluations, performs no SQL in projection loops, and
fails above 5,000 items. Rows navigate to the existing exact-day Today workflow;
they do not duplicate editing or assessment. Schema remains 16 with no migration,
dependency, plugin, persisted queue state, or Task 33 behavior.
