# ADR 0033 — Task Saved Views and Bounded Filter AST

## Status

Accepted and implemented by Task 39 / Slice 029 at product checkpoint
`374abcbae263be18fa785a56d656678f9bfd9c29`.

## Context

ADR 0028 identified Saved Views as the product runner-up after Deadline Semantics. Task 38 has
closed and its cache remediation is applied. The immutable source retained a versioned typed
filter substrate but left Saved View product/UX scope OPEN; Task 39 is the later Product Owner
decision that fixes a deliberately smaller, non-executable Task-only model.

## Decision

A Saved View is a standalone local Task projection configuration in `task_saved_views`. It
selects one existing bounded source, persists predicate version 1 as Rust-validated canonical
JSON rooted at an AND-only `All`, and carries one sort and group mode. It is not a generic query
framework, Search entity, route, dashboard, or shared object.

Rust owns normalization, validation, serialization, persistence, reference and tag-alias
resolution, source execution, filtering, sorting, grouping, bounds, warnings, and errors. React
owns the typed editor, focus, ephemeral drafts, semantic rendering, and query-cache projection.
No predicate creates SQL; the canonical source executes first and the bounded result is filtered
in Rust memory.

References validate as active canonical targets on explicit save but survive later archive.
Merged tag aliases resolve to their canonical target. Missing references warn and make their
clause match nothing. Unsupported stored versions never execute partially and remain visible and
archivable/editable.

## Consequences

- schema 23 adds only `task_saved_views` and an active-order index;
- Today remains startup/default and gains a fifth internal tab only;
- all source horizons, recurrence/evaluation/deadline semantics, identities, and caps survive;
- full database backup/restore covers active and archived views automatically;
- Search, analytics, exports, interchange, routes, and OS capabilities do not expand;
- no dependency, workflow, or workflow-seal change is required.

## Migration and rollback

Migration 23 is append-only and atomic after schema 22. Code rollback is safe before migration.
After schema 23 reaches user data, roll forward: dropping the table destroys user-authored view
configuration and is not data-preserving.

## Reversal conditions

Reopen only if source scopes must change, predicates require nesting/text/custom ranges, Saved
Views become shared or route-level objects, reference lifecycle changes, or a reproducible
P0/P1 migration/data-loss/security defect appears. Each requires a new Product Owner decision.

## Closure

Task 39 is closed with schema 23 active. Await the Product Owner gate; Task 40 remains
prohibited, unstarted, unallocated, and unrecommended.
