# ADR 0035 — Explicit Life Links and Backlinks

## Status

Accepted and completed for Task 41 / Slice 031 at product checkpoint
`e1fe3675315c04590aabe9c9ca87ede344dafa40` from explicit Product Owner activation baseline
`6bcffe751458ee37a4cde663e21336a1f484a613`. Closure evidence is in
`docs/audits/task-41-explicit-life-links.md`.

## Context

ADR 0028 historically scored Whole-tree Interchange at 7.610 and Links/Backlinks at 7.550. The
0.060 difference was analytical history, not permanent allocation authority. Since then Focus
Plans, deadlines, Saved Views, schema 23, broader backup evidence, stable Life IDs, committed Basic
Leaf/Narrative documents, Vietnamese Search, Reader navigation, and archive/restore have shipped.
Portable Package v1 remains intentionally one-document-only, while workspace interchange would
require broader collision/remap policy. The Product Owner therefore selects the smaller explicit
link slice. This is a repository-informed Product Owner judgment, not an empirical user study.

## Decision

Schema 24 adds a local directed `life_links` relation containing only link ID, source Life node ID,
target Life node ID, and creation time. At creation both endpoints are active non-root leaves with
exactly one active committed supported document. Life node IDs are authority. Backlinks are the
reverse projection of the same rows.

Self and duplicate direction are rejected; reverse direction is allowed. Outgoing and incoming
caps are 100 and 500. Both foreign keys use `ON DELETE RESTRICT`; live Life authority exposes
archive/restore rather than permanent node deletion. Archive or later document unavailability
preserves the edge and disables navigation until the endpoint is available again. Rename/reparent
never rewrites an edge. Removal deletes one identified edge only.

Rust owns validation, transactions, caps, existing-FTS target discovery, live projection, ordering,
and errors through four thin commands. A lazy Links panel lives in Reader after document content,
supports explicit add/remove and read-only backlinks, and navigates exact IDs with Reader history.

Full database backup/restore preserves link rows and rejects broken foreign keys. Portable Package
v1, Markdown, global Search entities, and document canonical JSON carry no link authority.

## Migration and rollback

Migration 24 is append-only and atomic after schema 23. Code rollback is safe before schema 24.
Once user links exist, roll forward: dropping `life_links` is data loss. Migrations 1–23 remain
immutable.

## Consequences and exclusions

Task 41 creates a bounded explicit relationship corpus that may be a future Graph prerequisite but
does not activate Graph. No title parsing, inline link AST, anchors, labels/types, branches,
Task/Plan/tag/URL endpoints, unlinked mentions, Search link entity, whole-tree interchange,
Portable Package/Markdown expansion, route, dependency, workflow/seal change, or Task 42 work is
authorized.

## Reversal conditions

Reopen only for a reproducible migration/data-loss/referential-integrity/security defect, a Product
Owner change to endpoint or deletion authority, or a future separately activated portability or
Graph decision. Those decisions do not retroactively broaden Task 41.
