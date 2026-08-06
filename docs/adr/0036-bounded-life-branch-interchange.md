# ADR 0036 — Bounded Life Branch Interchange

## Status

Accepted and activated for Task 42 / Slice 032 from explicit Product Owner activation baseline
`08a76c2827c1d49556c1f255631cbe2b1a4a2437`.

## Context

Lifeweave can already move exactly two units of user data. Full database backup/restore moves the
whole workspace. Portable Package v1 (ADR 0025) moves one committed Basic Leaf or Narrative Canvas
document onto an empty active leaf. Nothing moves the unit users actually think in: one meaningful
connected branch of the Life tree, with its structure, its documents, its images, its tags, and the
links its own leaves make to each other.

`docs/DECISION_REGISTRY.md` records "whole-tree or multi-document interchange" under
**OPEN — Product/UX**. ADR 0028 scored Interchange at 7.610 and ADR 0035 deliberately took the
smaller link slice first. Since then stable Life IDs, committed Basic Leaf and Narrative documents,
privacy-safe assets, global tags, and explicit stable-ID links have all shipped, which is precisely
the substrate a branch package needs.

The two alternatives the Product Owner weighed and rejected for this slice:

- **Actual Time** still requires timer, overlap, crash recovery, editing, recurrence, and analytics
  policy before any of it can be specified.
- **Generic Outline** remains conditional and overlaps existing Basic Leaf behaviour.

## Decision

Lifeweave v1 may export and import **exactly one active connected non-root Life branch** through a
distinct **Life Branch Package v1**:

```text
format: lifeweave_branch_package
format_version: 1
extension: .lifeweave-branch.zip
```

Full-workspace recovery remains database backup. One-document transfer remains Portable Package v1,
byte-for-byte unchanged.

The export root must be an existing active non-root branch with at least one active direct child
and no committed document. Only the connected active subtree reachable through active parent-child
edges is exported; archived nodes and everything below an archived edge are excluded and counted in
warnings. The import destination is `life-root` or another existing active documentless node, and
the imported root is appended as its last active child with all internal sibling order preserved.

Every imported node, document, asset, link, and newly created tag receives a **fresh local ID**.
Source IDs are package-local provenance and never become local authority. Nothing is ever merged or
overwritten by title, path, breadcrumb, description, content, or source ID; duplicate titles are
valid. The archive admits only Stored entries on an exact path allowlist, under hard limits, with
SHA-256 checksums over every payload. `content/tree.json` is the structural authority and its depth
and child state are derived and verified rather than trusted.

Import is atomic: one SQLite transaction covers new tags, nodes, both document kinds, asset joins,
node-tag joins, internal links, exactly one tree-revision increment, and one non-undoable
idempotent Life operation. Failure leaves zero rows, joins, links, tags, or newly created files, and
the source is never mutated.

This closes one high-leverage workflow. It does **not** create a generic interchange framework.

## Two conflicts resolved by explicit Product Owner decision

Both arose because the activated contract contradicted the live schema. Both were surfaced before
implementation rather than reconciled silently, per `AI_CONSTITUTION.md` §1 and §10.

### 1. Schema advances 24 → 25

The contract requires the import to record `operation_kind: import_branch`. Migration 8 created:

```sql
operation_kind TEXT NOT NULL CHECK(operation_kind IN (
  'create','rename','summary','icon','theme','archive','restore','reorder','reparent'))
```

and no later migration has ever rebuilt `life_operations`. SQLite cannot `ALTER` a `CHECK`
constraint, so storing the literal value requires a table rebuild — a new migration.

A zero-migration alternative existed and was presented: record kind `create` with an expired,
non-undoable before-payload and carry `import_branch` inside the after-payload. It satisfies every
behavioural clause of the contract but stores a coarser label than the contract names.

**The Product Owner chose the migration.** Schema therefore advances to 25 and the ledger stores the
truthful kind. This overrides the "schema before and after: 24" line of the activation contract and
its no-migration expectation. Migrations 1–24 remain immutable; migration 25 rebuilds
`life_operations` with `'import_branch'` added to the allowed set and is otherwise column- and
index-identical.

### 2. An archived tag name omits only that assignment

`tags.normalized_name` carries a **global** `UNIQUE` constraint, not one partial on active state.
The tag policy forbids ever restoring, unarchiving, unmerging, or renaming an existing tag, so when
an imported tag's normalized name is held by an archived tag that was not merged into an active
survivor, no active tag can be created for it and none may be revived.

**The Product Owner chose to omit that single tag assignment and count it in the omission
warnings**, importing everything else normally. This is consistent with the contract already
excluding and warning about archived and superseded tag assignments, and it keeps one unrelated
archived name from blocking an otherwise valid branch transfer.

## Consequences

- Schema advances to 25 through one append-only migration step that rebuilds only
  `life_operations`; migrations 1–24 remain immutable and no other table changes.
- Portable Package v1, its manifest, its inventory, and its import behaviour are unchanged, and the
  two formats are distinguishable by `format` and extension.
- Database backup/restore continues to carry imported branches with no format knowledge.
- The Life operation ledger gains one non-undoable kind; `undo_token` is always null for it and no
  unrelated prior undo becomes falsely available at the new revision.
- One new Rust module, five commands, and a Life Edit-only UI are added. No new route, sidebar
  destination, Tauri capability beyond the five command permissions, dependency, workflow, or seal
  change is introduced.
- Whole-tree interchange, custom export profiles, and multi-branch transfer remain **OPEN**. Graph,
  prediction, Noteboard, tags expansion, and backlink expansion remain prohibited.
- Task 43 is neither allocated, started, nor recommended.

## Reversal conditions

Reopen only for a reproducible migration, data-loss, referential-integrity, atomicity, or archive
security defect; for a Product Owner change to export/destination eligibility, identity, or
omission policy; or for a separately activated broader portability decision. Such a decision does
not retroactively broaden Task 42.
