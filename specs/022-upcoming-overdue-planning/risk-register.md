# Risk register

| Risk | Required control |
|---|---|
| Duplicate Today/Overdue item | Overdue excludes anchor date. |
| Recurrence flood | Fixed windows, expansion cap, and 5,000-item hard failure. |
| Moved occurrence shown twice | Stable identity dedupe by series plus original date. |
| Evaluated item remains overdue | Bulk current-evaluation exclusion and invalidation tests. |
| `Not done` treated as overdue | Any current evaluation counts as reviewed. |
| Archived series creates backlog | Archived series excluded. |
| N+1 category/Life queries | Bulk maps and no SQL in projection loops. |
| Timezone drift | Frontend local ISO anchor; no UTC conversion. |
| Midnight stale Today | Conditional selected-date rollover. |
| Async tab keyboard friction | Manual activation and lazy panel. |
| Task-card regression | Flat grouped rows with no board/elevation. |
| Mutation succeeds but refresh fails | Mutation remains successful; query owns retry state. |
| Ancient backlog hidden | Explicit 30-day policy; Calendar/Analytics retain access. |
| Scope drifts into Tags/saved views | Explicit prohibition. |
