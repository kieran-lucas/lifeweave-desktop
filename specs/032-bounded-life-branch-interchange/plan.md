# Task 42 Execution Plan

Status: ACTIVE.

## Stage 0 — Activation and baseline

Confirm clean `main` and remote parity at `08a76c2827c1d49556c1f255631cbe2b1a4a2437`, record the
Task 41 feature checkpoint, read the authority surfaces, localize the Life/portable/document/
narrative/tag/link/asset/backup owners, surface the two live schema conflicts, obtain explicit
Product Owner decisions, create Slice 032 and ADR 0036, activate Project State, synchronize
governance surfaces, and pass activation governance with no product code in the commit.

## Stage 1 — Schema 25 and format freeze

Add `task42_migration.rs` rebuilding only `life_operations` so `operation_kind` admits
`import_branch`, without editing migrations 1–24, and rewire the chain head through startup and
backup compatibility. Then freeze the package format: limits, strict manifest, strict
`content/tree.json` graph authority, checksums, README, and the exact path allowlist. Archive
security lands before any export path exists, reusing the proven `portable` helpers and the same
`zip` dependency.

## Stage 2 — Export

Implement the eligible-root query, the connected active subtree walk, and bounded batched loads for
nodes, both document kinds, asset joins, tag assignments, and internal links with no per-node N+1.
Validate the complete source before publishing a ticket, reuse the existing document exporters and
privacy-safe asset bytes, and stage opaquely in app data with durable publish, read-back
verification, one-shot ticket reads, and bounded stale cleanup. The source is never mutated.

## Stage 3 — Preview and atomic import

Implement raw-bytes preview with pre-staging size enforcement and full archive/graph/document/
asset/tag/link validation. Then implement confirm as pre-mutation proof followed by one transaction:
tags, nodes, documents, asset joins, node-tag joins, internal links, exactly one tree-revision
increment, and one non-undoable `import_branch` operation. Reuse durable asset receipts so only
attempt-created files are removed on rollback. Prove zero DB and file residue on every failure path.

## Stage 4 — IPC, bindings, and Life Edit UI

Register five commands across the handler, the build manifest, and the exact capability
permissions, export canonical TypeScript bindings through the accepted test-driven generator, and
add centralized frontend adapters and query keys. Build the Life Edit export control and a lazy,
keyboard-complete preview dialog with deterministic focus, retained failed state, and precise cache
invalidation. No new route or destination.

## Stage 5 — Evidence, performance, review, and closure

Prove the full Rust matrix, focused frontend behaviour and axe, and two native Windows phases driven
through accessible UI, each shown load-bearing by a deliberate break that is then reverted. Measure
the final bundle against the accepted Task 41 inventory and record truthful Task 42 versioned
budget evidence within the authorized delta. Run focused and broad gates, review the full baseline
diff once, fix confirmed in-scope findings, create the product checkpoint, close every governance
surface without allocating Task 43, commit, push, and confirm clean parity.

## Stop conditions

Stop before broadening scope if atomic database and file import proves impossible with the current
receipt architecture; if safe replay needs schema beyond the authorized migration 25; if deletion
semantics make canonical references unsafe; if tag authority or link caps cannot be resolved
atomically; if the performance envelope remains exceeded after reasonable reuse and lazy loading;
if newer valid allocation conflicts appear on `origin/main`; or if higher repository authority
materially contradicts the locked product decision.

Helper, file, DTO, dialog, and index names, and focused refactoring, are not stop conditions.
