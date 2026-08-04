# ADR 0023 — Task/Life Relationships

Status: Accepted for Task 29.

`tasks` and `task_series` are separate canonical Task sources, so schema 16 adds a nullable `life_node_id` foreign key to both. Occurrence rows receive no relationship column; projected occurrences inherit from `task_series`.

New targets must exist and be active and non-root. Existing archived links are preserved while unrelated fields change and may be cleared or replaced. Life titles and breadcrumbs are joined at read time. The relationship is navigation-only and does not affect completion, recurrence evaluation, priority, scoring, streaks, or analytics.
