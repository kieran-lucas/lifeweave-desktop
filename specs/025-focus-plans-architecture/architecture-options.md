# Focus Plans Architecture Options

## Shared semantic target

All options adapt to the same semantic document:

```text
FocusPlan
  id
  title
  lifecycle: draft | active | paused | completed
  start_date?
  target_date?
  life_node_id?
  outcome
  success_criteria[]
  selected_variant_id
  variants[]
    id
    label
    archived
    body
    phases[]
      id
      title
      archived
  task_ids[]        # Task 37 probe
  series_ids[]      # Task 37 probe
  archived
  revision
  recovery_draft?
```

Archive is orthogonal to lifecycle. Completed means the strategy ended;
archived means hidden from ordinary active projections.

## Option A — Third Life document type

### Shape

```text
life_nodes
  └─ focus_plan_documents (UNIQUE life_node_id)
```

Each Plan requires a Life leaf. An unlinked Plan requires a synthetic
“Unassigned Plans” branch. Multiple Plans under one durable area require
multiple child nodes.

### Advantages

- reuses Life navigation and document ownership;
- stable document identity;
- direct archive/restore precedent;
- editor and Reader patterns are familiar.

### Costs

- temporary strategies become durable tree structure;
- one Plan consumes one Life node;
- Browse/Edit/reparent semantics become Plan-management semantics;
- existing Task→Life relation cannot distinguish several Plans under one area;
- a third document type expands mutual-exclusion triggers;
- Plan portfolio navigation is awkward because Plans are distributed through
  the Life tree.

### Migration sketch

New `focus_plan_documents` plus revisions/drafts and mutual-exclusion triggers.
No rollback can remove synthetic Life nodes without semantic migration.

## Option B — Standalone Focus Plan entity

### Shape

```text
focus_plans
  life_node_id NULLABLE
  selected_variant_id
focus_plan_variants
focus_plan_phases
focus_plan_revisions
focus_plan_drafts
focus_plan_tags
```

Task 37 may later add nullable `focus_plan_id` authority to `tasks` and
`task_series`; occurrences inherit.

### Advantages

- stable identity independent of Life and body;
- zero-or-one optional Life reference;
- multiple Plans may share one Life area without tree mutation;
- lifecycle, variants, phases, revisions, Search, and archive are explicit;
- dedicated Plans portfolio is natural;
- Task links have an unambiguous target;
- Life Browse/Edit remain unchanged.

### Costs

- new product domain, migration, repository, IPC, route, and screen in Task 36;
- planning body must reuse document schema by value without aliasing
  `reader_documents`;
- cross-pillar Search/tags/backup work is required;
- new accessibility and native E2E surface.

### Migration sketch

Task 36 migration 20 creates Plan-owned tables only. Rollback is table-local
before Task 37 adds external references.

## Option C — Basic Leaf template with metadata

### Shape

```text
life_nodes
  └─ reader_documents
       template_id = focus_plan
focus_plan_metadata(document_id ...)
```

### Advantages

- strongest editor and Reader reuse;
- Markdown/document export is familiar;
- smallest initial UI prototype;
- generic document tooling remains available.

### Costs

- still requires one Life leaf per Plan;
- Plan identity is split between document and metadata;
- variants/phases become hidden metadata or body conventions;
- Search must inspect template metadata to distinguish Plans;
- Task links target either a document polymorphically or an ambiguous Life node;
- template behavior silently becomes a domain type;
- ordinary Basic Leaf archive/recovery semantics become coupled to Plan
  lifecycle.

### Migration sketch

New metadata tables and template guards, plus either synthetic Life nodes or a
broader document-ownership redesign. Rollback must translate Plan metadata back
into ordinary documents.

## Prototype structural results

For twelve Plans across shared Life areas:

| Metric | A | B | C |
|---|---:|---:|---:|
| additional Life nodes | 12 | 0 | 12 |
| synthetic unassigned branch | 1 | 0 | 1 |
| direct Plan identity | yes | yes | split |
| first-class variants | yes | yes | metadata-dependent |
| first-class phases | yes | yes | metadata-dependent |
| distinct Search kind | yes | yes | template-dependent |
| existing Task→Life relation ambiguous | yes | no | yes |
| estimated cross-domain coupling points | 8 | 3 | 9 |
| estimated overview joins | 5 | 4 | 6 |

These are architecture-prototype metrics, not production measurements.

## Hard-filter matrix

Legend: PASS / CONDITIONAL / FAIL.

| Filter | A | B | C |
|---|---|---|---|
| F1 unlinked Plan | FAIL | PASS | FAIL |
| F2 many Plans per Life area without nodes | FAIL | PASS | FAIL |
| F3 unchanged Life Browse/Edit | FAIL | PASS | FAIL |
| F4 stable identity | PASS | PASS | CONDITIONAL |
| F5 explicit lifecycle | PASS | PASS | CONDITIONAL |
| F6 first-class variants | PASS | PASS | CONDITIONAL |
| F7 first-class phases | PASS | PASS | CONDITIONAL |
| F8 archive/restore | PASS | PASS | CONDITIONAL |
| F9 unambiguous Task/series target | CONDITIONAL | PASS | FAIL |
| F10 Task remains row | PASS | PASS | PASS |
| F11 distinct Search kind | PASS | PASS | CONDITIONAL |
| F12 backup authority | PASS | PASS | PASS |
| F13 local-first | PASS | PASS | PASS |
| F14 bounded Tasks 36–37 | CONDITIONAL | PASS | CONDITIONAL |
| F15 migration/rollback clarity | CONDITIONAL | PASS | CONDITIONAL |
| F16 non-visual path | PASS | PASS | PASS |
| F17 no fabricated percentage | PASS | PASS | PASS |
| F18 no reminder dependency | PASS | PASS | PASS |

Classification:

```text
A = FAIL
B = PASS
C = FAIL
```

## Option B red-team

Strongest objections:

1. **Third pillar risk:** a Plans destination may dilute Task-first navigation.
   Mitigation: Today remains startup/default; Plans is a coordination surface,
   not a dashboard.
2. **Domain expansion:** six or more tables are possible.
   Mitigation: Task 36 caps variants, phases, revisions, and drafts; Task links
   remain Task 37.
3. **Editor duplication:** Plan body could fork Basic Leaf.
   Mitigation: reuse canonical rich-text value schema and static/editor
   components; do not reuse `reader_documents` rows.
4. **Progress pressure:** linked Tasks invite percentages.
   Mitigation: no automatic completion percentage; show lifecycle, selected
   phase, task counts, and explicit reviews only.
5. **Cross-area Plans:** zero-or-one Life area may be restrictive.
   Mitigation: allow no Life link and shared tags; revisit many-to-many only
   with evidence.
6. **Overplanning:** variants and phases can become elaborate.
   Mitigation: bounded counts and one selected variant; inactive variants stay
   secondary.

No objection requires choosing A or C. They define Task 36 acceptance risks.
