# ADR 0030 — Standalone Focus Plan Canonical Model

## Status

Accepted as the Task 35 architecture recommendation. Task 36 remains unapproved.

## Context

Medium-term strategies lasting weeks to months are too temporary to fragment
the durable Life tree, too broad to become Tasks, and too structured to rely on
plain note conventions.

Task 35 compared:

- A — third Life document type;
- B — standalone Focus Plan entity;
- C — Basic Leaf template with metadata.

All options implemented one thirty-operation semantic adapter and were tested
against identical fixtures and workloads.

## Decision

Select **B — standalone Focus Plan entity**.

The Plan has stable identity, explicit lifecycle, optional zero-or-one Life
area, first-class variants and phases, revision/recovery authority, distinct
Search identity, and future Task/series relationship target.

Variant rich-text bodies reuse the accepted Basic Leaf canonical value schema
and editor/static components by value. They do not create `reader_documents`
rows or synthetic Life nodes.

## Cardinalities

```text
Focus Plan → Life node: zero or one
Life node → Focus Plans: zero to many
one-off Task → Focus Plan: zero or one       # Task 37
recurring series → Focus Plan: zero or one   # Task 37
occurrence/evaluation → Focus Plan: none     # inherited projection only
```

## Lifecycle

```text
draft | active | paused | completed
```

Archive is orthogonal. Lifecycle remains manual; linked Task completion never
automatically completes the Plan.

## Evidence

```text
30 operations/option
100,000 applied operations/option
0 uncaught errors
0 invariant errors
same final semantic hash across A/B/C
A score 5.430
B score 8.850
C score 5.685
B hard filters PASS 18/18
A classification FAIL
C classification FAIL
6 canonical profiles × 200,000 samples
3 stress profiles × 200,000 samples
```

The editor-reuse stress profile reduced B/C to approximately 52/48 top-1,
showing that C remains a credible alternative only if editor/template reuse is
prioritized above explicit domain and Life-boundary semantics.

## Consequences

- Task 36 may introduce migration 20 with Plan-owned tables;
- no Task relation is added until Task 37;
- Plans may have a lazy coordination destination while Today remains default;
- Life Browse/Edit remain unchanged;
- global tags and Search gain Plan projections in Task 36;
- database backup is initial portability authority;
- no automatic progress percentage;
- no reminder/notification dependency;
- no cloud/account/collaboration.

## Rejected alternatives

A and C require one Life node per Plan and make multiple Plans under one Life
area semantically awkward. C also splits domain meaning between a document and
metadata.

## Migration and rollback

Task 35 changes no schema. Proposed Task 36 migration 20 is table-local because
Task relations remain deferred. Before Task 37, rollback/export can remove Plan
owned tables without rewriting Tasks, series, Life nodes, or documents.

## Reversal conditions

Reopen if every Plan must be a Life leaf, Life-independent Basic Leaf authority
is accepted, Plan-to-Life becomes many-to-many, the Task 36 slice cannot remain
bounded, or a P0/P1 safety/accessibility blocker appears.

## Next action

Product Owner gate for Task 36 activation. Task 36 and Task 37 are not started.
