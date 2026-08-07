# Task 47 — Whole-Life Tree Interchange Audit

## Authority and checkpoints

- Repository baseline: `1516b9c68e9e906269e4d4a00e85c508a5cd58b1`.
- Prior feature checkpoint: `e7454241576f3c7284a3433db8844c0c5f208e52`.
- Activation commit: `15e98202ddf4b986377c171cac3f0ef9fc40bb16`.
- Product checkpoint: `1c42ac5358579dc8795e4b7c1b76bc004b0269f1`.
- Closure commit: `PENDING_CLOSURE_COMMIT`.
- Governing decision/specification: ADR 0041 and `specs/037-whole-life-tree-interchange`.
- Activation preflight proved clean `main`, with `HEAD == origin/main ==` the repository baseline.

## What shipped

Life Tree Package v1 is a distinct checksummed interchange format:

```text
format          lifeweave_tree_package
format_version  1
extension       .lifeweave-tree.zip
```

Export takes one consistent snapshot of every active non-root node reachable below `life-root`.
`life-root` is represented only by the package's virtual forest boundary and is never serialized as
an importable node. Empty active forests reject. Archived edges prune the archived node and every
descendant; excluded domains produce count-only warnings.

`content/tree.json` uses a Tree-specific forest structure with ordered `root_keys`. Verification
proves non-empty roots, exactly one null parent per root, canonical contiguous sibling indexes,
root-list/order equality, exactly-one-root reachability, no cycle/orphan/duplicate/external parent,
derived one-based depth, and deterministic serialization.

Included authority is exactly hierarchy/order; node title, description, icon, and theme; committed
Basic Leaf and Narrative Canvas documents; privacy-sanitized referenced images; active canonical
tags; internal explicit links whose endpoints are included committed leaves; and empty leaves.
Drafts, revisions, history, pins/navigation, Tasks, Plans, Analytics, Settings, Search/Foundation
rows, backup metadata, cross-boundary links, and archived/superseded tag assignments do not travel.

## Package and security proof

- Package, uncompressed data, entry, node/document/asset/tag/link/depth, JSON, Markdown, manifest,
  checksum, README, and ZIP-entry limits stay exactly at Task 42 values.
- Entries are Stored, commentless, non-encrypted, non-directory, non-symlink, unique, allowlisted,
  safely enclosed, size-bounded, and SHA-256 verified before semantic use.
- Manifest and tree JSON deny unknown fields; asset MIME, dimensions, checksum, and payload authority
  are validated before feasibility is resolved.
- Tree, Branch, and Portable validators reject one another. Branch Package v1 and Portable Package
  v1 contracts were not reinterpreted.
- Staging is opaque and owned. No renderer path, raw filesystem access, content/title/path/ID log,
  arbitrary extraction location, dependency, or broad capability was added.

## Schema 27 and backup proof

Migration 27 rebuilds only `life_operations`, adding `import_tree` to the existing operation-kind
constraint. It preserves every column, existing row/kind (including `import_branch`), FK, index,
constraint, revision, and `undone_at`; migrations 1–26 are unchanged. Tests prove fresh creation and
26→27 upgrade reach 27 once, old/new kinds behave correctly, and a too-new schema rejects without a
write.

Backup tests prove a schema-26 package restores and migrates once with `import_branch` authority
intact, and a schema-27 database containing an imported forest survives backup, restore, reopen,
identity, hierarchy, and operation inspection.

## Import, identity, order, and atomicity

Valid destinations are `life-root` or an active documentless Life node. Missing, archived,
document-bearing, or corrupt destinations reject. An active empty leaf may become a branch.
Existing children remain in place; package roots append at `K..K+n` in package order and internal
relative order is preserved. Duplicate titles are accepted and never cause a merge.

All imported nodes and documents, every newly required asset row, every link, and every newly
required tag receive fresh local IDs. Tag reuse/merged-alias/archive-collision behavior and explicit
directed link limits remain Task 42/41 authority. Source package bytes and all preexisting local
metadata, documents, links, tags, and nodes remain unchanged.

One confirm transaction covers tags, nodes/documents, asset rows/joins, node-tag joins, internal
links, Search dirtiness, one tree-revision increment, and one non-undoable `import_tree` operation.
Link-cap, stale/destination, injected late-DB, and asset-publication failures commit no attempt
authority; cleanup removes only attempt-created files. Replay binds operation ID, package digest,
destination, expected revision, and semantic input. An exact retry after staging cleanup returns the
stored result without another revision; mismatched reuse rejects.

## IPC and Life Edit

Exactly five narrow commands and exact permissions were added:

```text
prepare_life_tree_export
read_life_tree_export
preview_life_tree_import
confirm_life_tree_import
discard_life_tree_import
```

Rust DTOs generated the TypeScript bindings. Life Edit exposes root-only export and import for an
eligible documentless destination, rejects files above 64 MiB before IPC, accepts the exact Tree
extension, and presents aggregate-only preview identity/counts/warnings plus fresh-ID,
append-only/non-overwrite, and non-undoable statements. Cancel discards staging and restores trigger
focus. Failure retains a retryable preview where safe and reuses one operation ID. Success
invalidates the established Life/Search/tag/Task-Life/link cache set, announces success, and focuses
the first imported top-level root. Branch controls and their existing dialog behavior remain intact.

## Command-level evidence

- `pnpm source:verify` — PASS; immutable source hash
  `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`.
- `pnpm governance:check`, `pnpm index:check`, `pnpm verify` — PASS.
- `pnpm typecheck` — PASS.
- Focused frontend Tree/Branch/IPC — PASS, 27/27.
- Full frontend deterministic substitute:
  `pnpm --dir frontend test -- --maxWorkers=1` — PASS, 48 files and 732/732 tests.
- `pnpm build` — PASS; 867 modules and 22 JavaScript chunks.
- `cargo fmt --all -- --check` — PASS.
- `cargo clippy --locked --all-targets --all-features -- -D warnings` — PASS.
- `cargo test --locked -- --test-threads=1` — PASS, 764 passed, 4 ignored, 0 failed.
- Focused Tree suite — PASS, 22/22; focused migration suite — PASS, 4/4.
- Generated bindings: `cargo test --locked export_ipc_bindings -- --test-threads=1` — PASS.
- `pnpm tauri build` — PASS; optimized application and NSIS installer built in 13m47s.
- `pnpm hardening:rc` — PASS; isolated two-session schema reopen, 5,392,428-byte installer,
  SHA-256 `ba76a984ff3bc14607c15eb99669d8e22b50ee9e037f178325a00b904c87eadc`.
- `pnpm e2e:windows -- phase18-life-tree-interchange.e2e.ts
  phase18-life-tree-interchange-restart.e2e.ts` — PASS. Actual Blob-captured export bytes were
  previewed, cancelled without mutation/focus loss, reopened, confirmed, and persisted across
  restart with two top-level roots, six nodes, documents/link, and distinct source/import IDs.
- `pnpm e2e:windows -- phase17-planned-vs-actual-analytics.e2e.ts` — PASS as the deterministic
  substitute for the full-matrix terminal driver failure.
- `python -m unittest scripts.tests.test_check_performance_budgets` — PASS, 18/18.
- `pnpm hardening:performance` — PASS, zero violations.
- `git diff --check` and staged activation→product diff check — PASS.

## Deliberate load-bearing break

Before commit, the null-parent import rule was temporarily changed so the second package root became
a child of the first imported root. Focused Phase 18 failed meaningfully at
`phase18-life-tree-interchange.e2e.ts:41`: the destination forest lookup returned `found: false`
because both expected roots were no longer direct destination children. The rule was restored with
`apply_patch`; the conditional was confirmed absent; Tree/migration/frontend focused suites and the
Phase 18/restart pair returned green. No break residue was staged or committed.

## Performance

Evidence files are `task-47-performance-baseline.json` and
`task-47-performance-budgets.json`. All Task 46 ceilings remain unchanged.

| Metric | Activation | Final | Maximum |
|---|---:|---:|---:|
| startup `index.js` raw | 525,734 | 526,020 | 535,000 |
| total JavaScript raw | 1,219,445 | 1,226,352 | 1,228,591 |
| total deterministic gzip | 375,011 | 375,977 | 379,107 |
| chunks | 22 | 22 | 22 |

The Tree UI stays inside existing Life Edit lazy boundaries. New/changed Tree-bearing chunks are
8,217 and 5,525 raw bytes, both below the 10 KiB unknown-chunk threshold. No unbudgeted chunk at or
above 10 KiB and no dependency was introduced.

## Verification debt

Two resource-contention issues are disclosed under `AI_CONSTITUTION.md` §7:

1. Default parallel `pnpm test` runs timed out in changing preexisting loading-state tests while the
   host had about 1 GiB free RAM (731/732, then 727/732). Each named failure passed in isolation; the
   same complete suite passed 732/732 with one worker. No product semantics or legacy timeouts were
   changed.
2. A full native matrix attempt passed Phases 1–2, then could not create the Phase 3 WebDriver
   session (`chrome not reachable`). The rerun progressed through the earlier matrix and stopped
   during Phase 17 amid WebDriver session/stale-element warnings before Phase 18. Phase 17 passed
   alone, and Phase 18 plus restart passed together. After the prescribed retries, no third full
   matrix was attempted and no product change was made for driver instability.

Core behavior, migration, backup, atomicity, replay, focused native flow, restart persistence,
release build, RC, accessibility tests, and performance all have deterministic green evidence. No
confirmed product defect remains.

## Activation-to-product self-review

1. **Complete active non-root forest only?** Yes; empty rejects and archived edges prune/count.
2. **`life-root` never imported/replaced?** Yes; it is only the virtual forest boundary.
3. **Fresh IDs where required?** Yes; nodes, documents, created assets/tags, and links.
4. **Existing destination untouched and roots append-only?** Yes; existing order/authority remains.
5. **Top-level/internal order preserved?** Yes; verifier and import assertions cover both.
6. **Exclusions only omitted and safely counted?** Yes; warnings are aggregate counts only.
7. **Branch v1 and Portable v1 unchanged?** Yes; distinct validators and regressions pass.
8. **DB/file/link-cap failure atomic?** Yes; zero rows/owned-file residue and unchanged revision.
9. **Replay idempotent and revision +1 once?** Yes; exact replay returns stored aggregates.
10. **Migration exact?** Yes; only `life_operations` is rebuilt to add `import_tree`.
11. **No generic interchange framework?** Yes; `life_tree` is a private bounded product module.
12. **Bundle ceilings unchanged?** Yes; all four aggregate ceilings and chunk rules are unchanged.
13. **Task 48 untouched?** Yes; prohibited, unstarted, unallocated, and unrecommended.

## Exclusions and debt disposition

No arbitrary selected multi-branch/profile, archived-node transfer, workspace package, backup
replacement, merge/replace/conflict mode, source-ID preservation, cross-boundary link recreation,
tag revival, new route/sidebar, dependency, broad filesystem authority, workflow/seal change, or
Task 48 implementation was added. The only residual verification debt is the disclosed harness
resource/driver instability; it is non-blocking under the repository constitution and has
deterministic substitutes.
