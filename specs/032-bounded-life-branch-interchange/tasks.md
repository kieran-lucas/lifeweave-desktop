# Task 42 Work Breakdown

Unchecked entries are unfinished work and this file is the resumable execution ledger.

## A. Activation

- [x] T42-A01 confirm clean main, baseline `08a76c2`, remote parity, and workflow-seal identity;
- [x] T42-A02 read authority and localize Life/portable/document/narrative/tag/link/asset/backup owners;
- [x] T42-A03 surface the `life_operations` CHECK conflict and obtain an explicit Product Owner decision;
- [x] T42-A04 surface the global `tags.normalized_name` UNIQUE conflict and obtain an explicit decision;
- [x] T42-A05 create Slice 032 and ADR 0036 recording both decisions;
- [x] T42-A06 measure the clean production bundle inventory before any product change
      (17 chunks, 1,190,836 raw, 364,842 deterministic gzip, 514,710 `index.js`, 544,852 startup raw);
- [x] T42-A07 activate Project State and synchronize governance surfaces;
- [x] T42-A08 pass activation governance and commit activation with no product code.

`database_schema_version` stayed 24 at activation because `scripts/check_project_state.py` derives it
from the highest released migration source; it became 25 in the implementation commit that added
`task42_migration.rs`.

T42-D10 note: the *incoming* link cap is structurally unreachable inside one package — 501 distinct
sources would need 503 nodes and the 500-node ceiling binds first — so the reachable outgoing cap is
the one exercised, and the fact is recorded in the test rather than faked.

## B. Schema 25 and package format

- [x] T42-B01 add `task42_migration.rs` rebuilding only `life_operations` for `import_branch`;
- [x] T42-B02 prove fresh/24 upgrade, idempotence, row and index preservation, and too-new safety;
- [x] T42-B03 rewire the migration chain head through startup and backup compatibility;
- [x] T42-B04 add `life_branch` domain limits and typed errors;
- [x] T42-B05 add the strict manifest, checksums, and README with sorted descriptors;
- [x] T42-B06 add strict `content/tree.json` graph authority with derived depth and child state;
- [x] T42-B07 add archive build/validate with the exact allowlist and Stored-only policy;
- [x] T42-B08 prove every archive attack, limit, checksum, and malformed-graph case.

## C. Export

- [x] T42-C01 implement eligible-root validation and rejection matrix;
- [x] T42-C02 implement the connected active subtree walk with archived-edge exclusion;
- [x] T42-C03 implement bounded batched loads for documents, assets, tags, and internal links;
- [x] T42-C04 assemble the package, ticket, warnings, and safe file name;
- [x] T42-C05 implement opaque staging, durable publish, one-shot read, and stale cleanup;
- [x] T42-C06 prove source is unmutated and no per-node N+1 exists.

## D. Preview and atomic import

- [x] T42-D01 implement raw-bytes preview with pre-staging size enforcement and full validation;
- [x] T42-D02 implement destination validation and tree-revision checks;
- [x] T42-D03 implement pre-mutation proof: replay, digest, containment, maps, tag plan, link caps;
- [x] T42-D04 implement the single atomic transaction with one revision increment;
- [x] T42-D05 implement the non-undoable idempotent `import_branch` operation record;
- [x] T42-D06 implement asset receipt reuse and attempt-only file rollback;
- [x] T42-D07 implement the tag plan including archived-name omission;
- [x] T42-D08 implement internal link remap, direction, reverse pairs, and cap enforcement;
- [x] T42-D09 prove zero DB and file residue on every failure path;
- [x] T42-D10 prove staging retry, discard, cleanup, reopen, and full backup/restore durability.

## E. IPC and Life Edit workflow

- [x] T42-E01 register five commands in handler, build manifest, and exact capability permissions;
- [x] T42-E02 export canonical TypeScript bindings without hand-editing generated files;
- [x] T42-E03 add centralized frontend adapters, query keys, and invalidation helper;
- [x] T42-E04 add the Life Edit export control with explicit eligibility reasons;
- [x] T42-E05 add the lazy import file input, size guard, and preview request;
- [x] T42-E06 add the keyboard-complete preview dialog with retained failed state;
- [x] T42-E07 add success selection, imported-root focus, and precise cache invalidation;
- [x] T42-E08 pass focused frontend behaviour, cache, focus, and axe tests.

## F. Native and performance evidence

- [x] T42-F01 add phase 13 workflow and restart phases and register them in the phase list;
- [x] T42-F02 prove both phases load-bearing by a deliberate break, then revert it;
- [x] T42-F03 add a `life_branch` selector to the release-candidate dogfood script;
- [x] T42-F04 record the final bundle inventory and truthful Task 42 versioned budget evidence.

## G. Gates and closure

- [x] T42-G01 run focused Rust, binding, and frontend checks;
- [x] T42-G02 run all broad governance, build, Rust, release, native, and RC gates;
- [x] T42-G03 perform one full baseline diff review and fix confirmed in-scope findings;
- [x] T42-G04 create the Task 42 product checkpoint commit;
- [x] T42-G05 close all authority and evidence surfaces without allocating Task 43;
- [ ] T42-G06 run final governance and diff checks, commit closure, push, and confirm parity.
