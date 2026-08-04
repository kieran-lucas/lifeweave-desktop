# Task/Life relationship specification

- A Task source links to zero or one active, non-root Life node.
- `tasks` and `task_series` are distinct canonical sources and each stores nullable `life_node_id`.
- Occurrence, override, evaluation, and completion rows store no relationship.
- Recurring occurrences inherit the current series relationship.
- Rename, reparent, and archive preserve links; archived links may be kept, cleared, or replaced.
- The relationship affects navigation and organization only.
