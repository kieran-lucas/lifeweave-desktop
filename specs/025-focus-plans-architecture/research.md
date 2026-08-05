# Task 35 Research Trace

## 1. Evidence classes

This document separates:

1. **repository authority** — current code, migrations, accepted ADRs, and audits;
2. **Product Owner direction** — issue #1 and ADR 0029;
3. **external workflow analogies** — current official product documentation;
4. **Task 35 inference** — conclusions drawn from the first three classes.

External products do not establish Lifeweave user demand.

## 2. Repository authority

### 2.1 Product and state boundaries

`docs/ARCHITECTURE.md` defines SQLite through Rust as persistent domain
authority, TanStack Query as projection cache, and React as ephemeral
interaction state. A Focus Plan with lifecycle, dates, variants, and phases
therefore cannot rely on UI state or document text parsing.

The architecture also locks:

- Life as an adjacency-list tree;
- coordinates as derived, never canonical;
- forward-only migrations;
- explicit repository projections;
- no N+1 IPC/SQL;
- static Reader paths;
- local-first security;
- architecture changes through measured prototype + ADR.

### 2.2 Life storage

Migration 7 creates `life_nodes` with stable parent/sibling authority and a
protected root. Migration 8 adds bounded Life operations and undo authority.

A temporary medium-term Plan represented as a Life node would therefore become
part of the same durable tree, participate in Browse/Edit/archive/reparent
semantics, and consume sibling positions. That is not a cosmetic choice.

### 2.3 Basic Leaf ownership

Migration 9 creates `reader_documents` with:

```text
life_node_id NOT NULL
UNIQUE(life_node_id)
revisioned committed JSON
recovery draft
archive state
```

Basic Leaf identity is consequently bound to one Life leaf. A “template only”
Focus Plan cannot exist independently without changing this authority or
creating a synthetic Life leaf.

### 2.4 Narrative ownership

Tasks 20–28 establish Narrative Canvas as another canonical document type tied
to a Life leaf, with mutual-exclusion guards against Basic Leaf and children.
Task 20 also establishes the quality bar for prototype slices:

- equal adapter contract;
- fair alternatives;
- deterministic fixtures;
- operation simulation;
- benchmarks;
- weighted matrix;
- production-bundle isolation;
- accepted ADR.

### 2.5 Task authority

Migrations 3–6 establish one-off Tasks, recurring series, occurrence overrides,
evaluation history, and objective analytics. Task remains an independent
row/timeline entity.

Migration 16 adds zero-or-one `life_node_id` authority directly to `tasks` and
`task_series`; recurring occurrences inherit the series relationship. Task 29
explicitly keeps occurrence/evaluation storage unchanged.

A future Focus Plan relation should follow the same source-identity principle:
one-off Task and recurring series are relation owners; occurrences inherit.

### 2.6 Tags and Search

Migrations 17–19 establish a flat shared tag vocabulary and join tables for
Tasks, series, and Life nodes. Search projects tags and merged aliases into
visible normalized context.

A Focus Plan must have its own Search entity kind. Treating a Plan as an
ordinary Basic Leaf would make type discrimination dependent on template
metadata rather than stable domain identity.

### 2.7 Backup and interchange

Full database backup/restore is already authoritative. Portable Package v1 is
explicitly one-document interchange and excludes the Life tree, Tasks,
analytics, and settings.

Task 36 does not need a new interchange format. A future Plan package is a
separate decision. Database backup must include Plans automatically once their
tables exist.

### 2.8 Product Owner direction

Issue #1 and ADR 0029 reserve:

```text
Task 35 — architecture prototype and decision
Task 36 — Focus Plans Core
Task 37 — Task integration and review
```

The Product Owner prefers a standalone entity but requires evidence.

## 3. External workflow analogies

### 3.1 Linear projects, milestones, and updates

Current Linear documentation models Projects as explicit entities with status,
start date, target date, overview text, resources/documents, milestones, and
structured updates. Its Timeline intentionally surfaces Projects rather than
granular issues. Project status is manually changed instead of inferred from
issue completion.

Relevant official sources:

- Linear Docs — Project overview;
- Linear Docs — Project milestones;
- Linear Docs — Initiative and Project updates;
- Linear Docs — Project status;
- Linear Docs — Timeline.

**Inference for Lifeweave:** medium-term strategy benefits from explicit
identity, manual lifecycle, phases, and reviews while granular Tasks remain
separate. Automatic percentage is not required.

### 3.2 Sunsama objectives and planning rituals

Sunsama distinguishes weekly Objectives from daily Tasks. Tasks align to an
Objective; weekly planning selects objectives; weekly review reflects on them.
Its documentation explicitly warns that objectives are not a general goal list
and should not be treated as individual tasks.

Relevant official sources:

- Sunsama User Manual — Weekly Objectives;
- Sunsama User Manual — Weekly Planning;
- Sunsama User Manual — Weekly Review;
- Sunsama User Manual — Daily Planning.

**Inference for Lifeweave:** a separate coordination layer and an explicit
review ritual are coherent. Lifeweave's horizon is longer, so weekly objectives
are an analogy, not the target model.

### 3.3 Notion relations and generic metadata

Notion Relations connect Project and Task databases, and Rollups aggregate
related values. This demonstrates that a generic database/template model can
represent project/task relationships quickly.

Relevant official source:

- Notion Help — Using relation and rollup properties.

**Inference for Lifeweave:** Option C is implementation-attractive, but generic
metadata does not by itself supply locked lifecycle, archive, recovery,
cardinality, or search-type semantics.

### 3.4 NotePlan project notes

NotePlan's official documentation uses Project Notes for current projects and
allows tasks in those notes to be scheduled into Daily Notes.

Relevant official sources:

- NotePlan Knowledge Base — Project Notes and Backlinks;
- NotePlan Knowledge Base — Project Notes Best Practices.

**Inference for Lifeweave:** a note-centric model can connect planning context
to daily execution, but its semantics are text/document-centered. This is a
useful fair prototype for Option C, not proof that C fits Lifeweave.

### 3.5 Amazing Marvin goals and phases

Amazing Marvin documents Goals/Objectives, phases for breaking large goals
into smaller chunks, and planning Tasks/Projects for weeks or months.

Relevant official sources:

- Amazing Marvin Help — Goals & Objectives;
- Amazing Marvin Help — What are phases;
- Amazing Marvin Help — Planning Ahead.

**Inference for Lifeweave:** ordered phases and a medium-term date horizon are
coherent product concepts. Progress must remain explicit and explainable.

## 4. Consolidated requirements

The evidence supports these requirements:

- stable Plan identity independent of Life node and document body;
- zero-or-one optional Life area;
- many Plans may reference one Life area;
- explicit manual lifecycle;
- date-only start and target dates;
- first-class variants and ordered phases;
- recovery draft distinct from committed revision;
- Plan-specific Search entity kind;
- optional shared tags;
- full database backup as initial portability authority;
- dedicated Plans navigation in Task 36;
- zero-or-one Plan relation per one-off Task or recurring series in Task 37;
- no occurrence-owned relation;
- no automatic progress percentage;
- no reminder/notification dependency;
- no temporary Life-node creation.

## 5. Evidence limitations

- No Lifeweave-specific usability study exists.
- External products are predominantly team or cloud tools.
- The prototype measures semantic and structural costs, not production Rust or
  SQLite performance.
- Task 36 must revalidate all migration, accessibility, and native behavior.
