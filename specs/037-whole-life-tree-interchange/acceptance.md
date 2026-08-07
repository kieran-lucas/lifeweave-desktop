# Task 47 Acceptance Mapping

Status: ACTIVE — evidence will be recorded in
`docs/audits/task-47-whole-life-tree-interchange.md`.

## Scope and forest

- [ ] exactly the complete active non-root forest is exported from one snapshot;
- [ ] `life-root` is never packaged, imported, replaced, or mutated;
- [ ] archived edges prune descendants and produce count-only warnings;
- [ ] empty active forest rejects;
- [ ] ordered multi-root structure and all internal order are preserved;
- [ ] orphan, cycle, duplicate, extra null parent, external parent, and bad root order reject;
- [ ] depth is derived from one virtual root and never trusted.

## Package and security

- [ ] distinct `lifeweave_tree_package` v1 and `.lifeweave-tree.zip` identity;
- [ ] Tree, Branch, and Portable validators reject one another;
- [ ] all Task 42 archive/checksum/path/size/image limits remain exact;
- [ ] canonical document JSON, Markdown, assets, tags, and links retain existing authority;
- [ ] Branch Package v1 canonical regression is byte/behavior stable;
- [ ] warnings/logs/IPC expose no content, path, title, or ID beyond approved aggregates.

## Import, identity, and atomicity

- [ ] root and non-root documentless destinations work; invalid destinations reject;
- [ ] existing children remain unchanged before appended roots;
- [ ] nodes/documents/created assets/links/created tags receive fresh IDs;
- [ ] duplicate titles never merge and source/preexisting data remain unchanged;
- [ ] final-state link caps are enforced atomically;
- [ ] injected DB/file failures remove only attempt-created authority/files;
- [ ] replay succeeds after staging cleanup, mismatched operation ID reuse rejects;
- [ ] exactly one tree revision increment and one non-undoable `import_tree` operation occur.

## Migration and durability

- [ ] fresh and schema-26 databases reach 27 exactly once;
- [ ] every existing operation/kind/column/FK/index/constraint/revision/`undone_at` survives;
- [ ] `import_branch` and `import_tree` are valid and unrelated kinds remain rejected;
- [ ] too-new schema rejection is write-free;
- [ ] schema-26 backup restores and migrates; schema-27 backup preserves imported forest;
- [ ] restart preserves both source and imported copies with distinct identities.

## Frontend and native evidence

- [ ] Tree export is root-only with empty-tree reason;
- [ ] import eligibility, extension, and pre-IPC 64 MiB limit are enforced;
- [ ] preview states identity, aggregates, destination, fresh IDs, append-only, no overwrite,
      warnings, and non-undoable status;
- [ ] Cancel discards and restores trigger focus; safe failure retains retryable preview;
- [ ] success invalidates relevant caches and focuses/announces the first imported root;
- [ ] Branch regression and applicable axe checks pass;
- [ ] standalone Phase 18 and restart prove real product flow and persistence;
- [ ] deliberate forest/remap break fails meaningfully, then focused proof returns green.

## Governance and performance

- [ ] no dependency, generic interchange framework, broad capability, route, workflow, or seal drift;
- [ ] locked main/raw/gzip/chunk ceilings and 10 KiB rule remain unchanged;
- [ ] full gates and activation-to-product diff review are recorded;
- [ ] closure records Task 47/Slice 037, schema 27, null active spec, product-owner gate, and Task 48
      prohibited/unstarted/unallocated/unrecommended;
- [ ] final main is clean with `HEAD == origin/main`.
