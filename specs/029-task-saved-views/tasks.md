# Task 39 Work Breakdown

Unchecked entries are unfinished work and this file is the resumable execution ledger.

## A. Activation

- [x] T39-A01 confirm clean main, baseline, and remote parity;
- [x] T39-A02 read authority and localize source owners;
- [x] T39-A03 create Slice 029 and ADR 0033;
- [x] T39-A04 activate Project State and governance surfaces;
- [x] T39-A05 pass activation governance.

## B. Persistence and lifecycle

- [ ] T39-B01 append atomic schema 23 migration and indexes/checks;
- [ ] T39-B02 prove fresh/22-upgrade/idempotent/too-new behaviour;
- [ ] T39-B03 implement name and typed AST validation/canonical JSON;
- [ ] T39-B04 implement create/list/detail/update/archive/restore;
- [ ] T39-B05 implement 50-active limit and exact-set reorder;
- [ ] T39-B06 prove stale revisions, compact positions, and no hard delete.

## C. Projection and references

- [ ] T39-C01 reuse all four canonical sources before filtering;
- [ ] T39-C02 normalize exact one-off/recurring/moved identities;
- [ ] T39-C03 batch categories/tags/Life/Plan without per-row SQL;
- [ ] T39-C04 resolve archive, tag merge, and missing reference states;
- [ ] T39-C05 implement every predicate, sort, group, and tie-breaker;
- [ ] T39-C06 preserve source/result caps and error above 5,000.

## D. IPC and frontend

- [ ] T39-D01 add thin lifecycle/options/projection commands;
- [ ] T39-D02 generate bindings and permissions through canonical tools;
- [ ] T39-D03 add query adapters, keys, and complete invalidation;
- [ ] T39-D04 add Views tab/panel and active/archive management;
- [ ] T39-D05 add typed editor with retained draft and Escape cancellation;
- [ ] T39-D06 add semantic groups/rows and exact navigation;
- [ ] T39-D07 cover keyboard reorder, tab behaviour, and axe.

## E. Persistence/regression evidence

- [ ] T39-E01 prove reopen and full backup/restore round trip;
- [ ] T39-E02 prove Search rebuild and existing scopes unchanged;
- [ ] T39-E03 run focused Rust and frontend tests;
- [ ] T39-E04 run broad governance, build, format, clippy, and tests;
- [ ] T39-E05 inspect generated drift, workflows, locks, dependencies, and diff.

## F. Closure

- [ ] T39-F01 perform one full baseline diff review;
- [ ] T39-F02 create Task 39 product checkpoint commit;
- [ ] T39-F03 close Project State and all authority surfaces;
- [ ] T39-F04 run final governance and diff checks;
- [ ] T39-F05 commit closure, push main, and confirm remote parity.
