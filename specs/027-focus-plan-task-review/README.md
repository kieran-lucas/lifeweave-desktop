# Slice 027 — Focus Plan ↔ Task Integration + Manual Review History

## Status

```text
Task 37: ACTIVE
Slice 027: ACTIVE
activation baseline: 82b055fe15d4997daf083bf777e9ef78c1f92bb6
schema: 20 → 21
active spec: specs/027-focus-plan-task-review
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

## Authority

- `spec.md` — normative product and domain contract;
- `plan.md` — phased execution order and gates;
- `tasks.md` — work breakdown;
- `acceptance.md` — risk-based closure checks;
- ADR 0030 — standalone Focus Plan canonical model;
- ADR 0031 — Task relationship ownership and the manual review model.

Task 36 remains closed. Task 38 remains unstarted and unrecommended.
