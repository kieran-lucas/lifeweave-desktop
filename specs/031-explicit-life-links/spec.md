# Task 41 Specification — Explicit Life Links + Backlinks Core

Status: CLOSED at product checkpoint `e1fe3675315c04590aabe9c9ca87ede344dafa40`.

This file records the Product Owner's activated Task 41 contract. Everything not required here is
out of scope.

## 1. Canonical model

One explicit directed edge connects a source Life leaf to a target Life leaf. `life_links` stores
exactly `id`, `source_node_id`, `target_node_id`, and `created_at`. Life node IDs are the only
endpoint authority. Backlinks are derived by `target_node_id`; there is no backlink table.

At creation both endpoints must exist, be active non-root leaves, and own exactly one active
committed supported Reader document: Basic Leaf or Narrative Canvas. Self-links and duplicate
directions are rejected. The reverse direction is distinct and allowed. Removal is by link ID and
physically deletes only that edge.

## 2. Persistence and lifecycle

Migration 24 is append-only and atomic after schema 23. Both foreign keys use `ON DELETE RESTRICT`;
the live Life product has archive/restore and exposes no permanent node delete. Source and target
indexes cover both directions.

Rename and reparent do not rewrite an edge. Archive preserves it and projects the endpoint as
`Archived`; navigation is disabled while unavailable. Restore makes the same edge navigable again.
A later missing, conflicting, archived, or unsupported document preserves the edge and projects an
unavailable endpoint without retargeting or crashing.

Full database backup/restore preserves exact link IDs, direction, endpoints, and timestamps.
Foreign-key validation rejects invalid backup references. Code rollback is safe only before schema
24 reaches user data; afterwards the repository must roll forward because dropping `life_links`
would destroy user-authored data.

## 3. Bounds and deterministic order

- maximum outgoing links per source: 100;
- maximum incoming links per target: 500;
- normalized target query length: 1–120 characters;
- target results: at most 20.

Stored relations are never truncated. Panel rows sort active before archived/unavailable, then by
repository Vietnamese-normalized endpoint title, endpoint ID, and link ID. Target results reuse the
existing Search/FTS normalization and ranking through a bounded typed command, then use stable
normalization and ID tie-breakers. No second search index or global Search syntax is added.

## 4. Commands and projection

Rust owns validation, caps, transactions, target eligibility, live metadata, ordering, and errors.
The complete command surface is:

```text
get_life_link_panel
search_life_link_targets
create_life_link
remove_life_link
```

The panel returns source eligibility plus outgoing links and backlinks. Rows carry link ID,
endpoint Life node ID, title, short description, icon, document kind, breadcrumb, availability,
and creation time, all projected live rather than copied into `life_links`. Queries batch metadata
and never issue one metadata query per row.

## 5. Reader UX and navigation

The lazy Links panel is inside Life Reader after document content and before Related Tasks. It has
semantic headings/counts, loading/error/empty/ineligible states, textual archive/unavailable state,
outgoing-only removal, and read-only backlinks.

The Add link dialog provides a bounded query, semantic result list, explicit selection and
confirmation, Escape/cancel, deterministic focus restoration, and retained query/selection after a
failed save. It is fully keyboard-operable and unresolved search cannot submit.

Outgoing links open the target Reader and backlinks open the source Reader by exact stable ID.
Unavailable rows never open. Reader history preserves `A → B → C → Back → B → Back → A`, and focus
moves to the opened Reader heading.

## 6. Cache and integration

Panel keys include node ID; target keys include source ID and normalized query. Create/remove
refresh both endpoint panels and target options. Life rename/reparent/archive/restore, committed
document lifecycle, and database restore invalidate link projections/options. Search rebuild is
not a link mutation and link edges never become Search entities.

Portable Package v1 and Markdown formats remain one-document-only and contain no link authority.
No package version, inventory, canonical document JSON, or import behavior changes.

## 7. Hard exclusions

No inline/Tiptap/wiki/title-parsed links, headings/blocks/anchors, embeds, URLs, files, assets,
Tasks, Plans, tags, branches, link labels/types/weights, inferred links, unlinked mentions, Graph,
analytics, Search link entities, whole-tree interchange, package/Markdown payload expansion, route,
sidebar item, dependency, workflow/seal change, generic relationship framework, or Task 42 work.
