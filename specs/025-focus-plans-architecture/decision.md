# Task 35 Canonical Decision

## Verdict

```text
SELECT — Option B: standalone Focus Plan entity
Task 36 candidate: standalone_focus_plan_core
Task 37: reserved, not started
```

Option B is the only option that passes all eighteen hard filters. It preserves
Life as durable structure, gives a Plan stable identity, and creates an
unambiguous future relation target for one-off Tasks and recurring series.

## Evidence summary

### Prototype equivalence

All three adapters implemented the same thirty operations and represented the
same AI Foundations semantic fixture.

```text
applied operations per option: 100,000
uncaught errors:              0
invariant errors:             0
final semantic hash:          f88d4edb54d8b851c32e046c0e1d3ac8edd82009143558670455c90557f18bda
semantic hashes equal:        yes
```

Semantic equivalence means the options were capable of representing the test
fixture. It does not erase their structural costs.

### Structural cost

At 1,000 Plans:

| Metric | A | B | C |
|---|---:|---:|---:|
| Additional Life nodes | 1,000 | 0 | 1,000 |
| Synthetic unassigned branch | 1 | 0 | 1 |
| Cross-domain coupling points | 8 | 3 | 9 |
| Estimated overview joins | 5 | 4 | 6 |
| Existing Task→Life target ambiguous | yes | no | yes |

### Prototype measurements

The Python prototype is an architecture probe, not production performance
evidence. At 1,000 Plans, all options remained bounded. Option B required no
Life-tree mutation and had the smallest canonical export path in the recorded
run. Timing differences are secondary to semantic authority and may vary by
machine.

### Hard filters

```text
A — FAIL
B — PASS
C — FAIL
```

A and C fail unlinked Plan support, many-Plans-per-area without tree nodes, and
unchanged Life Browse/Edit semantics. C additionally lacks an unambiguous
future Task/series target.

### Weighted model

```text
A — 5.430
B — 8.850
C — 5.685
B lead over C — 3.165
```

Six canonical profiles selected B with ROBUST stability under the disclosed
uncertainty model. An extreme editor-reuse profile intentionally challenged B:

```text
B top-1: 51.9370%
C top-1: 48.0600%
```

This stress result is preserved as a reversal condition. If Lifeweave later
chooses document/template reuse over explicit domain semantics, C must be
reconsidered rather than silently folded into B.

Monte Carlo results are sensitivity outputs, not empirical adoption or product
success probabilities.

## Canonical Focus Plan model

### Identity

A Focus Plan has a stable opaque ID independent of title, Life area, variants,
phases, or planning body.

### Lifecycle

```text
draft | active | paused | completed
```

Lifecycle is manual and explicit. Archive is an orthogonal visibility state.
Completing every linked Task must not automatically complete a Plan.

Allowed lifecycle transitions in Task 36:

```text
draft → active
draft → archived
active → paused
active → completed
active → archived
paused → active
paused → completed
paused → archived
completed → active
completed → archived
archived → restored previous lifecycle
```

### Dates

- nullable local date-only `start_date`;
- nullable local date-only `target_date`;
- when both exist, `start_date <= target_date`;
- dates do not schedule Tasks;
- no reminder, notification, or time-of-day authority.

### Life relationship

```text
Focus Plan → Life node: zero or one
Life node → Focus Plans: zero to many
```

Only active, non-root Life nodes are assignable. A Plan may remain unlinked.
Changing or removing the relation does not move, rename, or archive either
entity.

### Task and recurring-series relationship

Deferred to Task 37:

```text
one-off Task → Focus Plan: zero or one
recurring series → Focus Plan: zero or one
Focus Plan → Tasks/series: zero to many
```

Occurrence and evaluation rows never own the relation. Recurring occurrences
inherit the series relation, matching Task/Life relationship authority.

### Variants

- one to five variants per active Plan;
- stable variant IDs;
- exactly one selected active variant;
- non-selected variants are alternative drafts, not simultaneous execution
  branches;
- archive/restore preserves phases and body;
- selecting an archived variant is rejected.

### Phases

- zero to twenty phases per variant;
- stable phase IDs and explicit sort keys;
- phases belong to one variant;
- archive/restore preserves ordering;
- Task 36 does not compute phase completion from Tasks.

### Planning content

The Plan envelope owns typed fields:

```text
title
lifecycle
start_date / target_date
outcome
success criteria
variants
phases
Life relation
tags
archive state
revision
```

Variant bodies reuse the accepted Basic Leaf canonical rich-text value schema
and static/editor components **by value**. They do not create or alias
`reader_documents` rows and do not require Life leaves.

### Revision, draft, and recovery

- committed Plan revisions are immutable history snapshots;
- one recovery draft per Plan is separate from committed revision authority;
- save requires expected revision and idempotent operation ID;
- recovery draft carries base revision and conflict state;
- archive/restore does not discard revisions or drafts;
- bounded retention policy must be specified by Task 36.

### Tags and Search

- Plan tags use the existing global vocabulary through `focus_plan_tags`;
- merged aliases remain searchable through the accepted tag authority;
- Search uses a distinct `entity_kind = focus_plan`;
- indexed context includes title, outcome, criteria, active variant label/body,
  active phase titles, and visible tag names;
- archived Plans are excluded from ordinary Search.

### Backup and interchange

- full database backup/restore is authoritative for Task 36;
- no Plan-specific package format is introduced;
- Portable Package v1 remains one Life document and does not silently absorb
  Focus Plans;
- Plan-specific interchange remains a later open decision.

### Navigation

Task 36 may add a lazy **Plans** destination:

```text
Today remains startup/default
Plans is a coordination workspace
Life remains durable structure/knowledge
Analytics remains separate
```

Plans provides Active, Draft, Paused, Completed, and Archived projections. It
must not become an unbounded dashboard or duplicate Today.

### Progress and review

Task 36 shows no automatic percentage. Allowed signals:

- lifecycle;
- selected variant;
- current phase selected manually if activated;
- dates;
- counts of phases and, only after Task 37, linked Task counts;
- explicit review entries.

Weekly review belongs to Task 37. It is a user-authored reflection/status record,
not a reminder system.

## Rejected options

### A — Third Life document type

Rejected because every Plan becomes a Life node/document concern. Temporary
strategies would fragment durable structure and make existing Task→Life
relations ambiguous when multiple Plans share an area.

### C — Basic Leaf template with metadata

Rejected because it appears cheap only by splitting Plan meaning between a
Life-bound document and hidden metadata. It still creates Life nodes, weakens
type identity, and leaves Task link targets ambiguous.

## Reversal conditions

Reopen this ADR if any of these become true before Task 36 activation:

1. Product Owner decides every Plan must be a durable Life leaf;
2. a measured prototype proves a Life-independent Basic Leaf document authority
   without broader document-ownership redesign;
3. editor reuse is elevated above Life-boundary and relationship semantics;
4. required Plan-to-Life cardinality becomes many-to-many;
5. Task 36 cannot remain within the bounded migration/UI scope below;
6. a P0/P1 data-safety or accessibility blocker appears.

## Task 36 recommendation

Activate only a bounded `standalone_focus_plan_core` slice after Product Owner
approval. Task 37 remains prohibited.
