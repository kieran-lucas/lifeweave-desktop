# Task 42 / Slice 032 — Bounded Life Branch Interchange closure evidence

## Baseline and commits

```text
activation baseline           08a76c2827c1d49556c1f255631cbe2b1a4a2437
activation commit             b2c24c490f33b90365b13bc6b46ddc3b9ae1193a
implementation                801baaf04ecd4c21c541c23c7917d678656b71f5
tag-dedupe fix                4485c83c18dd9160d1ec49845fa6079321258a40
product checkpoint            9c5d0cfb6c5e64ba7a5acfd23464e6a8474954b9
closure commit                <recorded at closure>
Task 41 feature checkpoint    e1fe3675315c04590aabe9c9ca87ede344dafa40
schema                        24 → 25

The product checkpoint is the first commit whose tree passes every gate, including the full
21-phase native suite. Product code was last changed at `4485c83`; `9c5d0cf` adds only the native
evidence and the pagination-safe test fixtures needed to run it.
```

The activation commit contains only ADR 0036, the Slice 032 package, and governance surfaces — no
product code.

## Delivered semantics

A distinct **Life Branch Package v1** transfers exactly one active connected non-root Life branch:

```text
format          lifeweave_branch_package
format_version  1
extension       .lifeweave-branch.zip
```

- **Export root** must be an active non-root branch with at least one active direct child and no
  committed document. Root, archived, missing, leaf, and document-bearing roots are rejected.
- **Included**: the connected active subtree, hierarchy and canonical contiguous sibling order,
  title/description/icon/theme, committed Basic Leaf and Narrative Canvas documents,
  privacy-sanitized image assets, active canonical tags, and links whose *both* endpoints lie
  inside the branch.
- **Excluded and counted**: archived nodes and everything below an archived edge, drafts, pins,
  Task/series references, Focus Plan references, cross-boundary links in both directions, and
  archived or superseded tag assignments. Omission warnings are counts only — no title, content,
  identifier, or filesystem path appears in any warning, ticket, preview, or log.
- **Destination** is `life-root` or another active documentless node; the imported root is appended
  as its **last** active child and all internal sibling order is preserved.
- **Identity**: every imported node, document, asset, link, and newly created tag receives a fresh
  UUIDv7. Source IDs are provenance only. Nothing is merged or overwritten by title, path,
  breadcrumb, description, content, or source ID.

`content/tree.json` is the structural authority. Depth, child state, and preorder are **derived and
verified**, never trusted: a package that claims a shape it does not have is rejected, not corrected.

## Limits enforced

```text
package bytes          <= 64 MiB      nodes        <= 500     documents <= 500
uncompressed bytes     <= 64 MiB      assets       <= 256     tags      <= 256
internal links         <= 5,000       depth        <= 128     ZIP entries <= 1,260
canonical JSON / doc   <= 1 MiB       Markdown/doc <= 1 MiB   tree.json <= 4 MiB
manifest.json          <= 256 KiB     checksums    <= 256 KiB README    <= 64 KiB
```

`1,260 = 4 fixed + 2 × 500 documents + 256 assets`, asserted directly in
`life_branch::domain::tests::entry_ceiling_matches_the_documented_arithmetic`. No limit was raised
to make a test pass.

Archive policy: Stored entries only, fixed header timestamp, no encryption, comment, directory
entry, symlink, duplicate path, or unenclosed path, and an exact path allowlist derived from the
manifest. Traversal, absolute, backslash, control-character, over-long, Deflate, encrypted,
symlink, directory, duplicate-name, and entry-count-overflow archives are all rejected. A Portable
Package v1 archive is rejected as a branch package and vice versa
(`a_portable_package_is_not_accepted_as_a_branch_package`).

## Two Product Owner decisions

Both conflicts were surfaced before implementation and resolved explicitly; ADR 0036 records them.

1. **Schema 24 → 25.** `life_operations.operation_kind` has carried a fixed nine-value `CHECK`
   since migration 8 and SQLite cannot `ALTER` a `CHECK`, so storing the contract's
   `import_branch` kind required a table rebuild. A zero-migration alternative (kind `create` with
   an expired non-undoable payload) was presented and satisfied every behavioural clause; the
   Product Owner chose the migration so the ledger stores the truthful kind. This overrides the
   activation contract's "schema before and after: 24" line and its no-migration expectation.
2. **Archived tag names.** `tags.normalized_name` is globally `UNIQUE`, so an imported tag whose
   name is held by an archived tag not merged into an active survivor cannot be created and must
   not be revived. That single assignment is omitted and warned; everything else imports normally.

## Migration 25

`src-tauri/src/infrastructure/sqlite/task42_migration.rs` rebuilds **only** `life_operations`:
create replacement → `INSERT … SELECT` → `DROP` → `RENAME` → recreate both indexes. Columns,
constraints, foreign key, and indexes are identical apart from the added kind. Migrations 1–24 are
untouched.

Proven by 4 tests: fresh and schema-24 databases reach 25 exactly once and idempotently; every
existing row — including `undone_at` and every one of the nine original kinds — survives byte-identically;
the rebuilt table keeps its exact columns, `life_nodes` foreign key, both index definitions, and its
`tree_revision_after = before + 1` check; the temporary rebuild table does not survive;
`PRAGMA foreign_key_check` is clean; `import_branch` is accepted while `""`, `IMPORT_BRANCH`,
`import`, `export_branch`, and `restore_all` stay rejected; and a too-new database is refused
without writes, leaving the schema-24 CHECK in force.

The chain head moved to `task42_migration` in application startup (`src-tauri/src/lib.rs`) and in
backup compatibility (`infrastructure/backup/lifecycle.rs`, `restore.rs`), so restore reports and
migrates to schema 25.

## Test evidence

All figures are executed results.

```text
cargo test --locked -- --test-threads=1      683 passed, 0 failed, 4 ignored (687 total)
  life_branch::                                72 passed  (the new module)
  task42_migration::                            4 passed  (migration 25)
  infrastructure::backup::                    148 passed  (147 before, +1 branch durability)
                                               --------
  Task 42 adds                                 77 tests
cargo fmt -- --check                          clean
cargo clippy --all-targets --all-features     clean, -D warnings, no suppression added
pnpm test                                    633 passed, 44 files
pnpm typecheck                                clean
pnpm build                                    success
pnpm verify                                   all six gates pass
pnpm hardening:performance                    violations: []
pnpm tauri build                              installer produced
RUST_TEST_THREADS=1 pnpm hardening:rc         candidate core-rc-9c5d0cf
  document                                     35 passed
  infrastructure::backup                      148 passed
  narrative                                    62 passed
  portable::service::tests::                   11 passed
  life_branch::                                72 passed   (selector added by Task 42)
  task::                                      100 passed
  schema reopen sessions                        2 x 25s, no panic/CSP/ACL/corruption
  installer sha256    d2039b7c2665da62eabb9ee1335deeee9c2c903fcea99e57ae812ca85927b649
```

The 72 `life_branch` module tests cover: the 1,260-entry arithmetic and key/path safety; strict
`tree.json` verification (missing/multiple/unresolvable roots, cycles, orphans, duplicates,
non-contiguous sibling indexes, excess depth, branch-with-document, two-documents-per-leaf,
unresolvable tag/link references, unordered arrays, Vietnamese tag identity); manifest and checksum
strictness including count cross-checks against the shipped tree; the archive attack matrix; eligible
nested export and every rejection; archived-edge exclusion; omission counts proven not to leak
titles, content, or identifiers; a byte-level fingerprint proving export never mutates the source;
export at the 500-node bound; fresh-ID remap with source and import coexisting; asset exact-reuse,
new install, and rollback; tag canonical reuse, merged-alias survivor, archived-name omission, and
creation; link direction, reverse pairs, and cap enforcement; destination and tree-revision checks;
one revision increment with idempotent replay; operation-ID misuse refusal; non-undoable proof via
both `latest_undo` and `undo_life_operation`; zero database and file residue on failure with a
successful retry afterwards; staging discard and bounded stale cleanup; and Search dirty scopes
queued through existing triggers rather than direct Search rows.

**One defect was found by self-review and fixed before closure.** Two packaged tags with distinct
normalized names can legitimately resolve to a single local tag — for example when both were merged
into the same local survivor — which would have attempted a duplicate `life_node_tags` primary key
and aborted the entire import. The resolved tag set is now deduplicated per node. The regression
test `two_packaged_tags_collapsing_onto_one_local_survivor_import_cleanly` was proven load-bearing
by reintroducing the duplicate insert (test failed) and then restoring the fix (test passed).

**Structural finding recorded rather than faked:** the *incoming* link cap (500) is unreachable
inside one package, because 501 distinct sources would require 503 nodes and the 500-node ceiling
binds first. The reachable **outgoing** cap (100) is the one exercised, and the reason is documented
in the test.

**No N+1**: every export query is built from one shared recursive-CTE constant, so the statement
count is fixed regardless of node count. `EXPLAIN QUERY PLAN` proves the subtree recursion uses an
index `SEARCH` and never a `SCAN life_nodes`, and export at the 500-node / 499-document bound
succeeds.

**Durability**: `an_imported_life_branch_survives_backup_mutation_restore_and_reopen_exactly`
exports a branch, imports it, backs up, mutates the imported branch, restores, and reopens, then
asserts the imported subtree returns byte-exactly, both link rows return, the `import_branch` ledger
row survives, both document copies survive, and `PRAGMA foreign_key_check` is clean.

## Frontend

Integration is Life Edit only — no route, sidebar item, dashboard, or plugin. `Export branch` and
`Import branch here` live in the node inspector; export is disabled with an explicit visible reason
(`exportBlockedReason`). The whole surface sits behind its own `lazy()` boundary because
`LifeEditWorkspace` is imported eagerly.

13 focused tests cover eligibility reasons, Blob download with object-URL revocation, export
failure messaging, 64 MiB rejection before any IPC call, preview counts/destination/warnings,
single-commit confirmation with the previewed digest, full cache invalidation, retry that reuses the
same `operation_id`, Escape-cancel with staging discard and focus restoration, Escape ignored while
a commit is pending, Tab containment, rejected-package handling, and the refresh-failure path that
warns instead of claiming success. **axe: zero violations.**

## Native Windows E2E

```text
e2e-tests/specs/phase13-life-branch-interchange.e2e.ts
e2e-tests/specs/phase13-life-branch-interchange-restart.e2e.ts
e2e-tests/support/lifeBranch.ts
```

Both are registered in `$allPhases` in `scripts/run_windows_e2e.ps1` (19 → 21 phases). The scenario
builds a nested branch with a Basic Leaf, a Narrative Canvas, an empty leaf, a shared and a new tag,
one internal directed link, and one link leaving the branch. Preview, destination selection,
cancellation, confirmation, and post-import navigation all run through the UI; fixture construction
uses the established `__TAURI_INTERNALS__.invoke` pattern. Export runs through the product's own
`Export branch` button — only the resulting Blob is captured in-test, because a WebView download
cannot be read back under WebDriver. **No production backdoor was added and preview/confirm is never
bypassed.**

```text
pnpm e2e:windows -- phase13-life-branch-interchange.e2e.ts    1 passing
pnpm e2e:windows                                             21 passed, 0 failed (all phases)
```

**Deliberate break.** With the internal-link insert in `confirm_import` disabled, phase 13 failed on
its outgoing-links assertion (`expect(received).toEqual(expected)`). The break was reverted and
`git diff` confirmed the file byte-identical to its committed state, after which the phase passed
again. The phase is therefore load-bearing rather than decorative.

**Two harness defects were found in the Task 42 scaffolding and fixed** — both in test code, not in
the product:

1. The fixture called `set_life_node_tags` with `life_node_id`; the command takes `node_id` and
   `expected_node_revision`.
2. The helpers read only child page 0, but Life Browse pages children eight at a time and the
   earlier phases leave the Life root well past one page. `establishBranchFixture` and
   `readBranchState` now walk every page. This would have failed only in the full ordered run, never
   standalone.

**One nondiagnostic failure is disclosed.** The first full-suite run failed at
`phase12-life-links-backup-restore` — a pre-existing Task 41 phase — on a backlink assertion in the
lazily-loaded Links panel after restore. It passed on the very next full run with no product change
between them, and Task 42 changes **no** Reader, links, document, narrative, or `LifeScreen` code
(the only `life_link` edit is a test-module migration alias), so no product path connects this slice
to that panel. Task 41 previously shipped two timing fixes in the same area (`04aa2c9`, `e1fe367`).
Recorded as pre-existing harness timing debt under `AI_CONSTITUTION.md` §7, not as a Task 42 defect
and not as a reason to weaken the Task 41 assertion.

## Performance

Measured over three independent builds with byte-identical normalized inventories.

```text
                     start (08a76c2)   Task 41 accepted   Task 42 final   delta   ceiling
chunks                       17                17               20          +3        —
total raw JS          1,190,836         1,190,378        1,199,082      +8,704   24,576
deterministic gzip      364,842           364,685          368,463      +3,778    8,192
startup raw JS          544,852           544,394          545,679      +1,285    2,048
index.js                514,710           514,252          515,537          —   535,000 (locked)
```

All three authorized deltas hold. The three new chunks — `LifeBranchControls.js` (4,350),
`LifeBranchImportDialog.js` (2,766), `LifeBranch.css.js` (300) — are all below the 10,000-byte
tracking threshold and appear as `untracked_small_chunks`, exactly as `LifeLinksPanel.js` did for
Task 41.

`docs/audits/task-42-performance-budgets.json` and `task-42-performance-baseline.json` supersede the
Task 41 files, which remain byte-identical historical evidence, and
`scripts/check_performance_budgets.py` `DEFAULT_BUDGET` was repointed. Maxima are derived by the
documented `ceil` formulas and clamped by the unchanged locked ceilings. **No budget was inflated.**

## Security review

Conducted in the main session against the `portable` precedent. (A read-only subagent was launched
for an independent pass and terminated early on an API session limit; the review below was completed
directly and is the one that stands.)

- **Path traversal — clean.** No package-supplied string ever reaches a filesystem path. `inspect`
  rejects any entry failing `safe_archive_path` or `enclosed_name` before anything else. Document
  and asset paths are *derived* from UUID-validated keys (`document_canonical_path`, `asset_path`)
  and the archive is then required to match the manifest inventory exactly, so a near-miss path such
  as `content/documents/x.json/y.md` is rejected by the equality check even though it satisfies the
  extension gate. All writes go to opaque-ID paths under app data: exports to
  `exports/life-branch/<uuid>`, staging to `imports/life-branch/<uuid>`, and asset payloads through
  the existing `install_prepared_asset_in_tx`, which generates its own name and canonicalizes to
  prove containment.
- **Resource exhaustion — clean.** Entry count is bounded before reading; each declared size is
  checked against a per-path ceiling; the cumulative total uses `checked_add` and is capped at
  64 MiB; each entry is read with `take(limit + 1)` and its actual length re-verified against the
  declared one, so a lying header cannot over-read. `Vec::with_capacity` is therefore bounded by the
  per-path limit, not by an attacker number. The tree walk is iterative with an explicit stack,
  depth-capped at 128 and node-capped at 500.
- **SQL injection — clean.** Every production `format!` that builds SQL interpolates only
  `SUBTREE_CTE` (a module constant) and `join`/`table` names drawn from a hardcoded literal array.
  A scripted scan of all production `format!` sites found no other interpolation; every value —
  node IDs, keys, titles, timestamps — is bound through `params![]`.
- **Atomicity and file residue — clean.** Every fallible step inside the import runs in one closure
  whose `Err` and commit-failure paths both call `cleanup_receipts`, which removes only
  `receipt.created_file` — populated exclusively for newly written payloads, never for a reused one.
  Proven by `a_failed_import_leaves_zero_database_rows_and_zero_new_files` and
  `a_reused_asset_file_is_never_removed_when_a_later_step_fails`.
- **Replay abuse — clean.** `confirm_life_branch_import` re-reads the staged bytes and re-verifies
  `sha256` against the caller's `package_sha256` before any mutation, then re-validates the archive.
  The fingerprint binds operation ID, package digest, parent, and expected revision, so reusing an
  operation ID with different bytes, a different destination, or a different revision fails rather
  than replaying.
- **Information disclosure — clean.** All five commands carry `#[tracing::instrument]` with the
  input, request, and export ID in the skip list. Every error is a `&'static str` with no
  interpolated content or path. Omission warnings are counts only, asserted by a test that fails if
  a node ID, document text, task title, or node title appears.
- **Symlink / TOCTOU — clean.** `discard_life_branch_import` uses `symlink_metadata` and refuses a
  non-directory or symlink; both stale-cleanup passes require the matching file/directory type, a
  non-symlink, and a valid opaque UUIDv7 name, so an unowned or planted entry is skipped. A test
  asserts unowned files and non-UUID directories survive cleanup untouched.

## Integrity state

```text
schema                     24 → 25 (one migration, rebuilding only life_operations)
released migrations 1–24   unedited
dependencies               unchanged (Cargo.toml, Cargo.lock, package.json, pnpm-lock.yaml)
.github/workflows/         unchanged
.github/WORKFLOW_SEAL      unchanged
Tauri capabilities         +5 allow-* command permissions, no OS or plugin authority
generated bindings         regenerated by cargo test, never hand-edited
Portable Package v1        unchanged
routes / sidebar           unchanged
Task 43                    unstarted, unallocated, unrecommended
```

New IPC surface, registered identically and in the same order across `lib.rs` `generate_handler!`,
`build.rs`, and `capabilities/main.json`:

```text
prepare_life_branch_export    read_life_branch_export      preview_life_branch_import
confirm_life_branch_import    discard_life_branch_import
```

## Residual risk

- Native Windows E2E remains the least deterministic surface in this repository. Per
  `AI_CONSTITUTION.md` §7, a harness failure that does not reproduce a product invariant violation
  is disclosed verification debt rather than a product defect.
- `e2e-tests` reports two pre-existing `TS2688` type-library resolution errors
  (`@wdio/globals/types`, `node`) in this checkout. They reproduce with all Task 42 files removed,
  are unrelated to this slice, and are not part of any gate.
