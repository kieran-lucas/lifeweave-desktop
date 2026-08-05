# Task 35 Specification — Focus Plans Architecture Prototype

## 1. Problem statement

Lifeweave currently has two durable product authorities:

```text
Life = durable areas, identity, knowledge, and long-lived direction
Task = concrete scheduled or actionable work
```

A medium-term concentration such as “AI Foundations, August–December” has a
different semantic lifetime:

- too temporary and operational to become a Life subtree;
- too broad to become one Task;
- too structured to remain an untyped note;
- expected to contain alternative drafts, ordered phases, outcome criteria,
  dates, risks, and eventually linked Tasks.

Task 35 determines the canonical representation before production work begins.

## 2. Product vocabulary

The prototype uses the following provisional terms:

```text
Focus Plan
Plan Variant
Plan Phase
Plan Outcome
Success Criterion
Plan Lifecycle
Plan Review
```

These terms are not production UI authorization until the ADR is accepted.

## 3. Required alternatives

### Option A — Third Life document type

A Focus Plan is a document attached to a Life leaf alongside Basic Leaf and
Narrative Canvas semantics.

Questions:

- does each temporary plan require a new Life node?
- can a plan exist without a Life area?
- can multiple plans belong to one area without fragmenting the tree?
- how does document mutual exclusion work?
- what is the stable target of Task links?

### Option B — Standalone Focus Plan entity

A Focus Plan has its own stable identity and optionally references one Life
area. Variants, phases, lifecycle, revisions, and future Task links are
plan-owned.

Questions:

- what is the minimum envelope?
- which content schema is reused?
- what remains deferred to Tasks 36 and 37?
- can the model stay bounded and local-first?

### Option C — Basic Leaf template with metadata

A Basic Leaf document becomes a Focus Plan through a template and structured
metadata.

Questions:

- is plan lifecycle explicit or inferred?
- is plan identity the document identity?
- can variants and phases remain first-class?
- can Search, archive, and Task links distinguish plans from ordinary notes?
- does a template silently become a new domain type?

## 4. Shared semantic fixture

All options must represent the same sample:

```text
AI Foundations
2026-08-15 → 2026-12-20
Life area: Computer Science / AI
Lifecycle: Draft → Active → Paused → Active → Completed

Outcome:
Build a rigorous foundation in mathematics, classical machine learning,
neural networks, and one capstone project.

Success criteria:
- finish the selected mathematics path;
- implement three classical ML algorithms;
- train and evaluate one small neural network;
- publish one local-first capstone dossier.

Variants:
- textbook-first;
- course-first;
- project-first.

Selected variant phases:
1. Mathematics foundation
2. Classical machine learning
3. Neural networks
4. Capstone

Future links:
- one-off Tasks;
- recurring Task series;
- weekly review entries.
```

## 5. Shared adapter contract

Every prototype option must implement at least these operations:

1. create plan;
2. rename plan;
3. set lifecycle;
4. set start and target dates;
5. link Life area;
6. unlink Life area;
7. add variant;
8. rename variant;
9. select variant;
10. archive variant;
11. restore variant;
12. add phase;
13. rename phase;
14. reorder phase;
15. archive phase;
16. restore phase;
17. update outcome;
18. replace success criteria;
19. save recovery draft;
20. recover draft;
21. link one-off Task;
22. unlink one-off Task;
23. link recurring series;
24. unlink recurring series;
25. archive plan;
26. restore plan;
27. produce Search projection;
28. export canonical semantic JSON;
29. validate invariants;
30. clone plan as a new draft.

Task and series links are prototype probes for Task 37 readiness, not production
authorization.

## 6. Hard filters

An option is directly eligible only if every filter passes.

| ID | Filter |
|---|---|
| F1 | Plan may exist without a Life link. |
| F2 | Multiple plans may reference one Life area without adding Life nodes. |
| F3 | Life Browse/Edit semantics remain unchanged. |
| F4 | Plan has stable identity independent of title and body. |
| F5 | Lifecycle is explicit, typed, and not inferred from text. |
| F6 | Multiple draft variants are first-class and recoverable. |
| F7 | Ordered phases are first-class and stable under reorder. |
| F8 | Archive/restore preserves meaning and relations. |
| F9 | Future Task and series links have an unambiguous target. |
| F10 | Task remains a row/timeline entity, never a card. |
| F11 | Search can distinguish Plans from ordinary documents. |
| F12 | Backup and full-database restore remain authoritative. |
| F13 | No hidden cloud/account/collaboration requirement. |
| F14 | Minimum production slice is bounded to Tasks 36–37. |
| F15 | Migration and rollback can be stated explicitly. |
| F16 | Keyboard and screen-reader architecture has a complete non-visual path. |
| F17 | No fabricated progress percentage is required. |
| F18 | No reminder/notification/sound dependency is required. |

Classification:

```text
PASS        all filters pass
CONDITIONAL one or more filters need a bounded prerequisite
FAIL        one or more filters conflict with locked product semantics
```

## 7. Decision criteria

Scores are 0–10; higher is better. Weights sum to 100.

| Criterion | Weight |
|---|---:|
| Domain semantic clarity | 15 |
| Preservation of Life boundaries | 12 |
| Task integration readiness | 11 |
| Variant/draft modeling | 10 |
| Lifecycle correctness | 9 |
| Data safety and recovery | 9 |
| Navigation/workflow fit | 8 |
| Search/tag/backup interoperability | 7 |
| Implementation boundedness | 6 |
| Migration/rollback clarity | 4 |
| Accessibility architecture | 3 |
| Performance/query boundedness | 2 |
| Editor/content reuse locality | 2 |
| Testability/observability | 2 |

## 8. Quantitative evidence

Required:

- identical semantic fixture and operation sequence for A/B/C;
- deterministic randomized simulation;
- final semantic hash comparison;
- zero uncaught prototype errors;
- small, medium, and large fixtures;
- measured list/open/search/export projections;
- structural-cost report;
- decision matrix arithmetic checks;
- uncertainty/sensitivity analysis;
- reproducible `--check` mode.

Minimum final simulation:

```text
seed: 20260805
applied operations: >= 100,000 per option
canonical profiles: >= 6
sensitivity samples: >= 200,000 per profile
```

## 9. Canonical model decision

The ADR must decide:

- selected option;
- stable Plan identity;
- Plan-to-Life cardinality;
- future Plan-to-Task and Plan-to-series cardinality;
- lifecycle vocabulary;
- variant and phase ownership;
- planning body authority;
- draft/revision/recovery boundary;
- Search and tag projection;
- archive/restore;
- backup/export boundary;
- navigation placement;
- exact Task 36 minimum slice;
- exact Task 37 integration slice;
- rollback conditions.

## 10. Task boundaries

### Task 35

Prototype, measure, decide, and close.

### Task 36 reservation

Focus Plans Core + Draft/Active Lifecycle.

### Task 37 reservation

Focus Plan ↔ Task Integration + Review Workflow.

Task 36 and Task 37 remain prohibited until separately activated.

## 11. Acceptance

Task 35 passes only when:

```text
P0 = none
P1 = none
three options implemented under one adapter contract
30 operations covered
hard-filter matrix = 3 × 18 complete
simulation >= 100,000 applied operations per option
semantic final hashes equal or differences explained
benchmark evidence complete
decision weights = 100
sensitivity analysis reproducible
canonical model selected without hardcoding
Task 36 activation packet bounded
Task 37 remains unstarted
schema = 19
product code changed = 0
ten review rounds = PASS
next action = Product Owner gate
```
