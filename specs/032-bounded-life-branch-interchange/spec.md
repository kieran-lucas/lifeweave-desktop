# Task 42 Specification — Bounded Life Branch Interchange

Status: ACTIVE from activation baseline `08a76c2827c1d49556c1f255631cbe2b1a4a2437`.

This file records the Product Owner's activated Task 42 contract. Everything not required here is
out of scope. Authority for the two schema/tag deviations is `docs/adr/0036-bounded-life-branch-interchange.md`.

## 1. Canonical model

One package represents exactly **one active connected non-root Life branch**.

```text
format: lifeweave_branch_package
format_version: 1
extension: .lifeweave-branch.zip
```

Portable Package v1 remains one-document-only and unchanged. Full-workspace recovery remains
database backup. The two formats are distinguishable by `format` and by extension.

`content/tree.json` is the structural authority. Canonical document JSON is document authority and
Markdown is a human-readable fallback that must match the current Rust exporter exactly.

## 2. Export and destination boundaries

**Export root** must be an existing active non-root branch with at least one active direct child
and no committed Basic Leaf or Narrative Canvas document. Root, archived or missing nodes, leaves,
and document-bearing branches are rejected.

The exported subtree is the connected active set reachable only through active parent-child edges.
Archived nodes, and every descendant below an archived edge, are excluded and counted in warnings.

**Import destination** must be `life-root` or another existing active node with no committed
document. An active documentless leaf may become a branch. Missing, archived, document-bearing, and
corrupt destinations are rejected. The imported root is appended as the **last active child**, and
all internal sibling order is preserved.

**Identity.** Imported nodes, documents, new assets, links, and newly created tags receive fresh
local IDs. Source IDs are package-local provenance only and never become local authority. Life
nodes are never merged or overwritten by title, path, breadcrumb, description, content, or source
ID; duplicate titles are valid.

## 3. Included and excluded data

Included: active subtree nodes; hierarchy and sibling order; title, short description, icon, theme;
committed Basic Leaf documents; committed Narrative Canvas documents; privacy-sanitized referenced
image assets; active canonical Life-node tags; explicit links with **both** endpoints inside the
subtree; empty active leaves.

Invariants: an included branch has no document; an included leaf has exactly one supported committed
document or none; both document kinds on one leaf rejects the export; a document on a branch rejects
the export. Canonical JSON, Markdown, templates, visual worlds, asset joins and reference counts,
and asset usability all use the existing Rust authorities.

Excluded: the global Life root; archived nodes and descendants; drafts and recovery state; source
revisions and timestamps; operation and undo history; pins, navigation preferences and history;
Tasks, series, occurrences, evaluations, deadlines, Saved Views; Focus Plans and reviews; analytics,
settings, backup metadata, Search rows, Foundation records; cross-boundary links; archived and
superseded tag assignments.

No dangling or retargeted reference is ever created. Safe omission counts are returned for archived
nodes, drafts, pins, Task/series references, Focus Plan references, cross-boundary outgoing and
incoming links, and archived/superseded tag assignments. Warnings and logs never expose document
content or filesystem paths.

## 4. Tag policy

Each included active canonical tag is packaged as source key + display name + normalized name.
Inside the authoritative import transaction: normalize and validate through the existing tag
authority; reuse an active canonical local tag with the same normalized name; if a merged alias
resolves to an active canonical survivor, reuse the survivor; otherwise create one new active
canonical tag; then apply assignments to remapped nodes.

An existing tag is never restored, unarchived, unmerged, or renamed, and source tag IDs are never
preserved. Where the normalized name is held by an **archived tag that is not merged into an active
survivor**, that single assignment is omitted and counted in the omission warnings (ADR 0036).
Concurrent conflicts resolve under current authority or roll back the whole import.

## 5. Link policy

Only links whose source and target are both included active committed leaves are packaged. Import
remaps both endpoints, preserves direction and valid reverse pairs, creates fresh link IDs and
import-time `created_at`, rejects self-links and duplicate directed pairs, and enforces the existing
100 outgoing / 500 incoming caps against **final local state**. Any cap breach fails the entire
import before commit.

Cross-boundary links are omitted and warned. Source link IDs and timestamps are never retained, no
link points back to a source node, links are never inferred from content or title, and Task 41
validation is never bypassed.

## 6. Archive, paths, and hard limits

Only Stored entries; no encryption, comment, directory entry, or symlink; no duplicate path;
enclosed safe relative paths only; exact allowlist; bounded entry count and cumulative uncompressed
bytes. No arbitrary path is ever extracted.

```text
manifest.json
checksums.json
README.md
content/tree.json
content/documents/<source-document-id>.json
content/documents/<source-document-id>.md
assets/<source-asset-id>.<safe-extension>
```

Every other path is rejected.

```text
package bytes                  <= 64 MiB
uncompressed bytes             <= 64 MiB
nodes                          <= 500
documents                      <= 500
assets                         <= 256
active canonical tags          <= 256
internal links                 <= 5,000
relative depth                 <= 128
canonical JSON / document      <= 1 MiB
Markdown / document            <= 1 MiB
tree.json                      <= 4 MiB
manifest.json                  <= 256 KiB
checksums.json                 <= 256 KiB
README.md                      <= 64 KiB
ZIP entries                    <= 1,260
```

`1,260 = 4 fixed + 2 x 500 documents + 256 assets`. Overflow, duplicates, size or checksum
mismatch, unsupported MIME or dimensions, controls or invalid Unicode, malformed canonical JSON,
and exceeded limits are all rejected. Limits are never raised to make a test pass.

`manifest.json` uses strict `deny_unknown_fields` and carries format and version, producer and app
version, export timestamp, informational source schema, source root key and title, tree path and
asset policy, counts for nodes/documents/assets/tags/internal links, maximum relative depth,
omission counts, and sorted document and asset descriptors. Compatibility is controlled by the
branch-package format and supported document schemas, not by local SQLite schema equality.

`content/tree.json` is strict and deterministically ordered, and validates exactly one root with no
package parent, exactly one included parent for every other node, no cycle, orphan, or duplicate ID,
valid sibling indexes with canonical contiguous ordering, bounded depth, resolvable
document/tag/link references, and the branch/leaf/document invariants. Depth and child state are
derived and verified, never trusted from stored counts.

`checksums.json` uses SHA-256 over every payload except itself, in stable path order. `README.md`
states that this is one branch and not a backup, that IDs are remapped, that canonical JSON is
authority and Markdown a fallback, and that excluded data is not transferred.

## 7. Commands

```text
prepare_life_branch_export
read_life_branch_export
preview_life_branch_import
confirm_life_branch_import
discard_life_branch_import
```

Export uses one consistent SQLite read snapshot and bounded batched queries with no per-node N+1,
validates the complete source before publishing a ticket, reuses the existing document exporters
and privacy-safe asset bytes, preserves hierarchy and order, emits stable sorted inventories under
the existing fixed ZIP header conventions, never mutates the source, stages opaquely in app data
with cleanup, and returns raw binary only by opaque export ID. No path-bearing IPC and no content or
path logging.

Preview accepts raw bytes, enforces 64 MiB before staging, validates the complete archive,
checksums, tree, documents, assets, tags, and links, stages under an opaque import ID, and returns
import ID, package SHA-256, root title, node/branch/Basic/Narrative/empty-leaf counts, maximum
depth, asset count and bytes, tag and internal-link counts, omission warnings, and supported status.
Preview is read-only and exposes no local path.

Confirm takes `import_id`, `package_sha256`, `parent_node_id`, `expected_tree_revision`, and
`operation_id`; the digest binds confirmation to the previewed bytes. Before any mutation it
resolves a valid prior successful operation replay, re-authenticates staged bytes, digest, and
containment, validates destination and tree revision, allocates the full node/document/asset/link
maps, resolves the final tag plan, calculates final link caps, and proves every reference and file
operation satisfiable. No row is created while validation is unresolved.

Rust DTOs are canonical and generated TypeScript is never hand-edited.

## 8. Atomic import and operation authority

One SQLite transaction covers new tags, nodes, Basic and Narrative documents, asset joins, node-tag
joins, internal links, Search dirty scopes, exactly one tree-revision increment, and one import
operation record.

Durable asset receipts are reused: exact reuse only on usable checksum, MIME, and dimension match;
every newly created file is tracked; only attempt-created files are removed on rollback and reused
files never are. Failure leaves zero imported rows, joins, links, tags, or new files; the source is
unchanged; staging stays retryable or cancellable.

Imported rows use fresh UUIDv7 IDs, local import timestamps, revision zero, preserved internal
sibling order, remapped canonical IDs, and Search dirty scopes rather than direct Search rows.

One non-undoable idempotent Life operation is recorded with `operation_kind: import_branch`,
available from schema 25 (ADR 0036). Its fingerprint binds operation ID, package digest, parent, and
semantic input. The same successful retry returns the original imported root and tree revision even
after staging cleanup; a different reuse of the operation ID fails; the tree revision increments
exactly once; `undo_token` is null; the before payload is expired and non-undoable; and a previous
unrelated undo is not falsely available at the new revision.

## 9. Frontend

Integration is **only** into Life Edit. No new route, sidebar item, dashboard, or plugin.

For a selected node, `Export branch` is offered and disabled with an explicit eligibility reason,
with pending, error, and success states, downloading a safe `.lifeweave-branch.zip` through a Blob
with the object URL revoked.

Import runs under the selected destination parent through a hidden file input accepting
`.lifeweave-branch.zip`, rejecting anything over 64 MiB before IPC, sending raw bytes to preview,
showing an explicit preview dialog, and offering confirm, cancel, and discard. The dialog shows
source root, destination, all counts and warnings, fresh-ID behaviour, non-undoable status, and the
non-overwrite guarantee. A safe failure retains preview and destination. Success closes the dialog,
refreshes only the relevant Life/Edit/Browse/Reader/Search/tag/Task-Life/link caches, selects and
focuses the imported root, and announces success.

Accessibility: semantic modal, initial focus, Tab trap, Escape only when commit is not pending,
trigger-focus restoration on cancel, imported-node focus on success, accessible live and alert
states, no colour-only warning, no nested controls, and zero applicable axe violations.

## 10. Lifecycle, IPC, and performance

All five commands are registered in the Rust service, the Tauri handler, binding generation,
generated TypeScript, and the frontend wrappers. No new Tauri capability, broad filesystem command,
path-bearing IPC, dependency, workflow, or seal change is introduced. The only schema change is
migration 25 rebuilding `life_operations` (ADR 0036).

Full database backup/restore preserves imported branches. Startup and reopen never require branch
staging. Stale cleanup never touches committed data.

Frontend delta against the accepted Task 41 inventory:

```text
startup raw JS       <= 2 KiB
total raw JS         <= 24 KiB
deterministic gzip   <= 8 KiB
```

Lazy loading is truthful, budgets are not inflated, and the backend stays bounded, checked, batched,
and idle at startup.

## 11. Hard exclusions

No whole-tree or multi-branch interchange, custom export profiles, cross-boundary link transfer,
archived-node transfer, draft/revision/history transfer, Task/series/Plan/Saved View/analytics
transfer, tag revival or rename, Graph, prediction, Noteboard, backlink expansion, Portable Package
v1 or Markdown format change, new route, sidebar item, dashboard, plugin, dependency, broad
capability, workflow or seal change, generic interchange framework, or Task 43 work.
