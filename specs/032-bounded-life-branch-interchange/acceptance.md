# Task 42 Acceptance Mapping

Status: ACTIVE — executable evidence will be recorded in
`docs/audits/task-42-bounded-life-branch-interchange.md`.

## Schema and format

- [ ] Fresh and schema-24 databases reach schema 25 exactly once; too-new databases stay safe.
- [ ] Migration 25 rebuilds only `life_operations`, preserves every existing row, `undone_at` value, and both indexes, and leaves migrations 1–24 and all other tables byte/shape unchanged.
- [ ] `operation_kind` accepts `import_branch` and still rejects an unknown kind.
- [ ] The package declares `format: lifeweave_branch_package` / `format_version: 1` and is distinguishable from Portable Package v1, which is unchanged.

## Export boundary

- [ ] An eligible nested branch exports its complete connected active subtree.
- [ ] Root, archived, missing, leaf, and document-bearing roots are rejected with typed errors.
- [ ] Archived nodes and everything below an archived edge are excluded and counted in warnings.
- [ ] Basic Leaf, Narrative Canvas, and empty active leaves are all included correctly.
- [ ] Hierarchy, sibling order, tags, and internal links are preserved in the package.
- [ ] Export never mutates the source, and bounded batched queries show no per-node N+1.

## Archive security and limits

- [ ] The exact path allowlist is enforced and every other path is rejected.
- [ ] Traversal, absolute, backslash, control-character, duplicate, symlink, directory-entry, encrypted, and non-Stored entries are rejected.
- [ ] Every hard limit rejects overflow, and no limit is raised to make a test pass.
- [ ] Checksum, size, MIME, dimension, Unicode, and malformed canonical JSON mismatches are rejected.
- [ ] Malformed graphs — no root, multiple roots, cycle, orphan, duplicate ID, bad sibling index, excess depth, unresolvable reference, branch-with-document, leaf-with-two-documents — are rejected.

## Identity, import, and atomicity

- [ ] Import creates a fresh subtree at the exact destination, appended as the last active child.
- [ ] Every imported node, document, asset, link, and new tag has a fresh local ID; source and imported copies coexist independently.
- [ ] Canonical document JSON and asset payloads round-trip with full fidelity under remap.
- [ ] Asset exact reuse, new install, and rollback behave correctly; reused files are never removed.
- [ ] Destination and tree-revision checks reject missing, archived, document-bearing, corrupt, and stale targets.
- [ ] Any failure leaves zero rows, joins, links, tags, and zero newly created files, with the source unchanged.
- [ ] Staging retry, discard, and stale cleanup work and never touch committed data.

## Tags, links, and operation authority

- [ ] Tag canonical reuse, merged-alias survivor reuse, new-tag creation, and archived-name omission all behave per ADR 0036, and no existing tag is ever restored, unarchived, unmerged, or renamed.
- [ ] Internal link direction and valid reverse pairs are preserved; self-links and duplicate directed pairs are rejected.
- [ ] The 100 outgoing / 500 incoming caps are enforced against final local state and any breach fails the whole import before commit.
- [ ] Cross-boundary links are absent from the package and counted in warnings.
- [ ] The tree revision increments exactly once; the same successful retry returns the original imported root and revision even after staging cleanup.
- [ ] A different reuse of the operation ID fails; `undo_token` is null; the operation is non-undoable; and no unrelated prior undo becomes available at the new revision.

## Durability, cache, UI, and performance

- [ ] Imported branches survive reopen and full backup/mutation/restore/reopen exactly.
- [ ] Search dirty scopes are queued through existing triggers rather than direct Search rows, and Life/Edit/Browse/Reader/Search/tag/Task-Life/link caches refresh after import.
- [ ] Export eligibility, export, preview counts and warnings, destination, confirm, cancel, retry retention, focus behaviour, pending keyboard rules, success selection, and oversized rejection all pass.
- [ ] The UI is keyboard-complete with deterministic focus and zero applicable axe violations, and adds no route, sidebar item, or destination.
- [ ] Two native Windows phases pass through accessible UI, each proven load-bearing by a deliberate break that was reverted, with zero residue.
- [ ] Frontend deltas stay within 2 KiB startup raw, 24 KiB total raw, and 8 KiB deterministic gzip against the accepted Task 41 inventory.

## Governance

- [ ] No dependency, workflow, or seal change exists, and the only schema change is the authorized migration 25.
- [ ] Portable Package v1 and database backup semantics are unchanged.
- [ ] Task 43 remains unstarted, unallocated, and unrecommended.
- [ ] All gates pass, `HEAD == origin/main`, and the worktree is clean.
