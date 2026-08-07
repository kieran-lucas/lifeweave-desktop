# Slice 036 — Planned versus Actual Analytics Core

## Status

```text
Task 46: ACTIVE
Slice 036: ACTIVE
activation baseline: b5002c3b05232aa0b8ae74b924764f927cc00f1d
Task 45 feature checkpoint: 3e48ca9292f655543a79724aae674c387bdb2f0a
starting schema: 26
target schema: 26
active spec package: specs/036-planned-vs-actual-analytics
Task 47: prohibited, unstarted, unallocated, and unrecommended
```

Task 43 created trustworthy completed stopwatch segments for one-off Tasks but deliberately left
Analytics unchanged. Task 46 closes exactly that remaining loop:

```text
planned schedule + completed explicit one-off sessions -> retrospective Analytics
```

The projection uses each owning Task's current scheduled date and current category. Running timers
and recurring work contribute nothing. Scheduled goal, streak, completion, and existing scheduled
overview semantics remain unchanged.

- [Specification](spec.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance](acceptance.md)
- [ADR 0040](../../docs/adr/0040-planned-vs-actual-analytics.md)
