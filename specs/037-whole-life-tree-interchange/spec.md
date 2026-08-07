# Task 47 Specification — Whole-Life Tree Interchange Core

Status: ACTIVE from baseline `1516b9c68e9e906269e4d4a00e85c508a5cd58b1`.

This file records the Product Owner's activated Task 47 contract. Everything not required here is
out of scope. Canonical decision: `docs/adr/0041-whole-life-tree-interchange.md`.

## 1. Core invariant and package identity

A Life Tree Package transfers exactly the complete active non-root forest beneath `life-root` at
one consistent snapshot. Import recreates that forest beneath one valid destination with fresh IDs
and preserved relative order; existing local content and `life-root` are never replaced, merged,
deleted, reordered, or mutated.

```text
format: lifeweave_tree_package
format_version: 1
extension: .lifeweave-tree.zip
```

Life Branch Package v1, Portable Package v1, and full database backup remain distinct and
unchanged. Each validator rejects the other package identities.

## 2. Export scope

Export starts at `life-root`, but the root is never package content. Include every active non-root
node reachable through active parent-child edges. Include all active top-level children in source
sibling order and all active descendants in relative sibling order. An archived node terminates
reachability across that edge; it and everything below it are omitted and counted. Reject an empty
active forest.

Included authority is exactly Task 42: hierarchy and order; title, description, icon, and theme;
committed Basic Leaf and Narrative Canvas documents; privacy-sanitized referenced images; active
canonical node tags; explicit links whose endpoints are included active committed leaves; and empty
active leaves. A branch with any committed document or a leaf with both document kinds rejects
export.

Exclude `life-root`, archived subtrees, drafts and recovery, revisions and operation/undo history,
pins and navigation state, all Task/series/occurrence/evaluation/deadline/Saved View authority,
Focus Plans and reviews, Analytics, Settings, backup metadata, Search and Foundation rows,
cross-boundary links, and archived/superseded tag assignments. Warnings contain counts only.

## 3. Forest authority

`content/tree.json` uses a Tree-only type:

```json
{"format_version":1,"root_keys":["<package-key>"],"nodes":[],"tags":[],"links":[]}
```

Verification proves non-empty roots; each root resolves exactly once and has `parent_key = null`;
every non-root has one included parent; root sibling indexes are contiguous `0..N-1`; `root_keys`
equals verified root order; every node is reachable from exactly one root; and there is no cycle,
orphan, duplicate, external parent, or extra null parent. Internal sibling indexes are canonical
and contiguous after exclusions while preserving relative active order. Depth is derived, never
trusted; top-level depth is one relative to virtual `life-root`; serialized arrays are deterministic.

## 4. Limits and archive security

Task 42's complete threat envelope is unchanged:

```text
package/uncompressed bytes <= 64 MiB   nodes/documents <= 500
assets/tags <= 256                    internal links <= 5,000
maximum depth <= 128                  canonical JSON/Markdown per doc <= 1 MiB
tree.json <= 4 MiB                    manifest/checksums <= 256 KiB
README.md <= 64 KiB                   ZIP entries <= 1,260
```

Only Stored regular entries are accepted. Encryption, comments, directories, symlinks, duplicate
or unsafe paths, extra paths, bounded-expansion violations, checksum mismatches, unsupported images,
and invalid dimensions are rejected. No arbitrary extraction path exists. The strict manifest
carries package/producer/export/schema provenance, tree and asset policy, top-level and aggregate
counts, maximum depth, omission counts, and sorted document and asset descriptors. Canonical JSON
remains document authority and Markdown the existing fallback.

## 5. Tags, links, assets, and identity

Tag resolution is exactly Task 42: normalize through current authority; reuse the active canonical
name; follow a merged alias to its active survivor; otherwise create a fresh active canonical tag;
never revive, unarchive, unmerge, rename, or preserve a source tag ID. An archived non-merged name
omits only that assignment and warns.

Only links with two included active committed leaves travel. Preserve direction and reverse pairs,
mint fresh link IDs, reject self-links and duplicate directed pairs, and enforce final-state 100
outgoing / 500 incoming caps. Any cap breach rolls back the whole import.

Assets retain Task 42 privacy sanitization and exact reuse rules. New asset rows receive fresh IDs;
reuse requires an exact usable checksum/MIME/dimension match. Track attempt-created files and remove
only those files on rollback.

## 6. Import and atomicity

A destination is `life-root` or an existing active documentless Life node. Reject missing,
archived, document-bearing, or corrupt destinations. An active empty leaf may become a branch.
Existing children stay first and unchanged. If the destination has K active children, verified
roots R0..Rn append at K..K+n in root order; every internal order is preserved.

Fresh local IDs are mandatory for imported nodes, documents, created assets, links, and created
tags. No title, path, breadcrumb, content, description, or source ID causes a merge. Duplicate
titles are valid. Source bytes and all preexisting content and metadata remain unchanged.

One confirm transaction covers tags, nodes, documents, assets and joins, node-tag joins, links,
Search dirty scopes, exactly one tree revision increment, and exactly one `import_tree` operation.
No database commit occurs while validation or file feasibility is unresolved. Any failure leaves
zero attempt-created persistent authority and the prior tree revision.

`import_tree` is non-undoable and idempotent: operation target is the destination, `undo_token` is
null, and a replay fingerprint binds operation ID, package digest, destination, and semantic
confirmation input. An identical successful retry returns the prior result after staging cleanup;
a mismatched reuse fails; an unrelated prior undo never becomes available.

## 7. Schema 27, commands, and frontend

Add exactly one append-only 26→27 migration rebuilding only `life_operations` to admit
`import_tree`. Preserve every column, row/kind including `import_branch`, foreign key, index,
constraint, revision, and `undone_at`. Update startup and backup/restore schema authority.

Add exactly five commands and their narrow generated permissions:

```text
prepare_life_tree_export
read_life_tree_export
preview_life_tree_import
confirm_life_tree_import
discard_life_tree_import
```

Use Rust-owned generated DTOs, raw binary IPC, opaque staging, no path-bearing IPC/logging, and no
broad filesystem capability. Preview and result expose only digest/bytes, top-level and aggregate
counts, depth, assets/bytes, tags, links, warnings, support state, and one deterministic first
imported top-level node ID for focus.

Life Edit alone gains `Export Life tree` when `life-root` is selected and `Import Life tree here`
for a selected valid documentless destination. Reject files over 64 MiB before IPC, preview before
confirm, state fresh-ID/append-only/non-overwrite/non-undoable behavior, restore trigger focus on
Cancel, retain retryable preview after safe failure, invalidate the Task 42 cache set on success,
and focus the first imported root. Branch controls remain behaviorally unchanged.

## 8. Evidence, performance, and exclusions

Rust proof covers migration preservation, schema-26 restore migration, schema-27 durability,
forest validation, Branch↔Tree confusion, canonical Branch regression, export bounds, fresh identity,
append ordering, destination/revision validation, atomic DB/file/link-cap failure, replay, non-undo,
restart, and backup. Frontend proof covers eligibility, precheck, preview wording, focus restoration,
retry identity, safe failure, cache invalidation, Branch regression, and axe. Native Phase 18 covers
real export bytes, destination creation after export, cancel, confirm, structure/doc/link identity,
and restart. A central forest/remap deliberate break must fail Phase 18 and leave no residue.

Locked ceilings stay `index.js <= 535000`, total raw `<= 1228591`, gzip `<= 379107`, and 22
chunks, with no unbudgeted >=10 KiB chunk. No dependency is added.

Hard exclusions: arbitrary selected multi-branch export, custom profiles, archived/draft/history/
pin/navigation transfer, Task/Plan/Analytics/Settings transfer, cross-boundary links, tag revival,
source-ID preservation, merge/replace/conflict resolution, workspace packages, backup replacement,
sync/cloud/collaboration, Graph/Outline/Noteboard/Score/Prediction expansion, routes/sidebar, generic
interchange framework, dependencies, workflows/seal changes, and Task 48.
