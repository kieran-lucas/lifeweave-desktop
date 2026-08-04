# Current-State Closure specification

## Scope

- Record the operational checkpoint in a deterministic, machine-validated `docs/PROJECT_STATE.json` ledger.
- Navigate a linked recurring series to the earliest non-cancelled displayed occurrence on or after a caller-supplied local anchor date.
- Preserve moved-in overrides as authoritative even when the original date predates the anchor or is no longer generated after a split.
- Omit an active finite series when it has no actionable occurrence on or after the anchor.
- Replace the twelve static Narrative Visual World chip inline styles with static CSS selected by semantic data attributes.
- Produce current schema-16 ordinary, native, performance, installer, RC, audit, and continuity evidence.

## Authority and boundaries

- Related Tasks remains a navigation projection. SQLite recurrence and override rows remain authoritative; no derived navigation date is persisted.
- The frontend owns the local `YYYY-MM-DD` anchor. Rust validates it and never infers a wall-clock or timezone date.
- One-off Tasks retain their own `tasks.local_date` and evaluation-derived Active/Completed grouping.
- Recurring projections remain Active; they are omitted rather than relabeled Completed when finite recurrence has ended.
- Recurrence expansion is bounded by `MAX_EXPANSION_OCCURRENCES`; overrides are loaded in bulk before the per-series loop.
- Schema remains 16. No migration, dependency, command, permission, route, destination, or Task 31 feature is added.

## Out of scope

Lossless Portable Package, ZIP import/export, Tags, Backlinks, Generic Outline, Noteboard, Graph, Score, Prediction, new Canvas templates, custom Visual Worlds, and global application appearance remain unimplemented and unactivated.
