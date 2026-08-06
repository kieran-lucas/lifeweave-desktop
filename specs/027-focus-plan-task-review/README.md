# Slice 027 — Focus Plan ↔ Task Integration + Manual Review History

## Status

```text
Task 37: COMPLETE
Slice 027: COMPLETE
activation baseline: 82b055fe15d4997daf083bf777e9ef78c1f92bb6
feature checkpoint: 09c393737fd6f096780408a803aea9b6e1355bb8
schema: 21
active spec: none
Task 38: not started
```

## Outcome

Focus Plans stop being an isolated layer. A one-off Task or a recurring Task series may
carry an optional Focus Plan, work becomes reachable from the Plan it serves, and a Plan
accumulates a user-authored history of manual reviews.

```text
Life       = durable direction and context
Focus Plan = medium-term strategy
Task       = concrete scheduled or actionable work
```

## Included

- migration 21 adding a nullable `focus_plan_id` to `tasks` and `task_series` plus a
  `focus_plan_reviews` table;
- Rust target validation at commit time and transactional mutation;
- exact recurring edit-scope authority across `OnlyThisOccurrence`, `ThisAndFuture`, and
  `EntireSeries`;
- inherited Plan projection on occurrences without occurrence-owned authority;
- optional Focus Plan selection inside the existing Task editor;
- Focus Plan context on Today, Upcoming, and Overdue rows;
- bounded Linked work and Reviews regions on Focus Plan detail;
- bidirectional Task ↔ Plan navigation;
- create-and-read manual review history with idempotent creation.

## Excluded

Automatic progress, phase-to-Task relations, lifecycle automation, review reminders or
schedulers, review edit/delete/archive, analytics or scoring, many-to-many relations,
occurrence-owned relations, Life-tree changes, Search indexing of reviews, new navigation
destinations, generic relationship infrastructure, and every Task 38 candidate.

## Closure basis

Task 37 closed with deterministic migration, one-off and recurring relationship, recurrence
edit-scope, linked-work projection, review, and backup/restore evidence; generated-binding
stability; Rust format, clippy, and test success; frontend typecheck, tests, and production
build success; repository governance; and a full diff audit against the activation baseline.
The separate independent-review agent could not run because its environment hit a session
quota; an equivalent structured review was performed directly and recorded as disclosed,
non-blocking verification debt.

## Authority

- `spec.md` — normative product and domain contract;
- `plan.md` — phased execution order and gates;
- `tasks.md` — work breakdown;
- `acceptance.md` — risk-based closure checks;
- ADR 0030 — standalone Focus Plan canonical model;
- ADR 0031 — Task relationship ownership and the manual review model.

Task 36 remains closed. Task 38 remains unstarted and unrecommended.
