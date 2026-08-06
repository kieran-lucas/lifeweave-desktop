# Task 39 Execution Plan

Status: COMPLETE at product checkpoint `374abcbae263be18fa785a56d656678f9bfd9c29`.

## Phase 0 — Activation

Confirm clean `main` at remote parity, record baseline and workflow identity, create Slice 029
and ADR 0033, activate Project State, and run governance.

## Phase 1 — Persistence and typed authority

Append migration 23 with the Saved View table, storage checks, unique normalized name, and
active-order index. Add Rust enums, v1 predicate DTOs, canonicalization, bounds, name
normalization, lifecycle transactions, stale revision handling, archive/restore, and exact-set
reorder.

## Phase 2 — Canonical source execution

Execute Today, planning, or deadline source authority first. Normalize truthful one-off and
recurring identities, batch tags/metadata, resolve references and aliases, then evaluate, sort,
group, and enforce the 5,000 cap without dynamic SQL.

## Phase 3 — Contract and UI

Add thin lifecycle/options/projection commands, register them, generate TypeScript and Tauri
permissions, add frontend adapters/query keys/invalidation, and implement the fifth tab,
management panel, typed editor, archive/restore/reorder, semantic results, and exact navigation.

## Phase 4 — Evidence and closure

Run focused fail-to-pass tests for migration, AST, lifecycle, sources, references, query shape,
backup/reopen, UI, navigation, and axe. Run all broad gates, inspect the full baseline diff once,
fix confirmed findings, create the product checkpoint, close authority, run governance again,
commit closure, push main, and confirm `HEAD == origin/main`. Task 40 remains prohibited.

## Rollback

Before schema 23 reaches user data, code rollback is safe. After schema 23, roll forward: a
table drop would destroy user-authored views and is not data-preserving. Archiving views is the
recoverable product operation; no hard-delete rollback exists.
