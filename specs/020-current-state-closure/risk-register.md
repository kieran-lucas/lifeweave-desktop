# Risk register

| Risk | Required control |
|---|---|
| recurrence expansion becomes unbounded | existing expansion cap |
| cancelled/moved overrides choose wrong date | explicit identity/date tests |
| N+1 query regression | bulk series and override queries |
| local/UTC date drift | frontend-supplied ISO local date |
| stale ledger becomes another stale document | governance validator |
| validator becomes self-referential | no current-HEAD field |
| security gate is weakened to pass | product code fix; verifier unchanged |
| release evidence mutates user data | isolated profiles only |
| scope drifts into Portable Package | explicit prohibition |
