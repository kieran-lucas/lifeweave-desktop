# Task 47 Acceptance Mapping

Status: COMPLETE — evidence is recorded in
`docs/audits/task-47-whole-life-tree-interchange.md`.

## Scope and forest

- [x] exactly the complete active non-root forest is exported from one snapshot;
- [x] `life-root` is never packaged, imported, replaced, or mutated;
- [x] archived edges prune descendants and produce count-only warnings;
- [x] empty active forest rejects;
- [x] ordered multi-root structure and all internal order are preserved;
- [x] orphan, cycle, duplicate, extra null parent, external parent, and bad root order reject;
- [x] depth is derived from one virtual root and never trusted.

## Package and security

- [x] distinct `lifeweave_tree_package` v1 and `.lifeweave-tree.zip` identity;
- [x] Tree, Branch, and Portable validators reject one another;
- [x] all Task 42 archive/checksum/path/size/image limits remain exact;
- [x] canonical document JSON, Markdown, assets, tags, and links retain existing authority;
- [x] Branch Package v1 canonical regression is byte/behavior stable;
- [x] warnings/logs/IPC expose no content, path, title, or ID beyond approved aggregates.

## Import, identity, and atomicity

- [x] root and non-root documentless destinations work; invalid destinations reject;
- [x] existing children remain unchanged before appended roots;
- [x] nodes/documents/created assets/links/created tags receive fresh IDs;
- [x] duplicate titles never merge and source/preexisting data remain unchanged;
- [x] final-state link caps are enforced atomically;
- [x] injected DB/file failures remove only attempt-created authority/files;
- [x] replay succeeds after staging cleanup, mismatched operation ID reuse rejects;
- [x] exactly one tree revision increment and one non-undoable `import_tree` operation occur.

## Migration and durability

- [x] fresh and schema-26 databases reach 27 exactly once;
- [x] every existing operation/kind/column/FK/index/constraint/revision/`undone_at` survives;
- [x] `import_branch` and `import_tree` are valid and unrelated kinds remain rejected;
- [x] too-new schema rejection is write-free;
- [x] schema-26 backup restores and migrates; schema-27 backup preserves imported forest;
- [x] restart preserves both source and imported copies with distinct identities.

## Frontend and native evidence

- [x] Tree export is root-only with empty-tree reason;
- [x] import eligibility, extension, and pre-IPC 64 MiB limit are enforced;
- [x] preview states identity, aggregates, destination, fresh IDs, append-only, no overwrite,
      warnings, and non-undoable status;
- [x] Cancel discards and restores trigger focus; safe failure retains retryable preview;
- [x] success invalidates relevant caches and focuses/announces the first imported root;
- [x] Branch regression and applicable axe checks pass;
- [x] standalone Phase 18 and restart prove real product flow and persistence;
- [x] deliberate forest/remap break fails meaningfully, then focused proof returns green.

## Governance and performance

- [x] no dependency, generic interchange framework, broad capability, route, workflow, or seal drift;
- [x] locked main/raw/gzip/chunk ceilings and 10 KiB rule remain unchanged;
- [x] full gates and activation-to-product diff review are recorded;
- [x] closure records Task 47/Slice 037, schema 27, null active spec, product-owner gate, and Task 48
      prohibited/unstarted/unallocated/unrecommended;
- [x] final main is clean with `HEAD == origin/main`.
