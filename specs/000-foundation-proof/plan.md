# Slice 000 — Implementation Plan

## Stage A — Bootstrap proof

1. Run Windows doctor.
2. Install dependencies and create lockfiles.
3. Validate minimal React and Tauri build.
4. Record exact tool versions.
5. Remove incompatible speculative dependency rather than weakening strictness.

Gate: frontend test/build and Rust test/Tauri build pass.

## Stage B — Layer skeleton

Create:
- frontend IPC adapter boundary;
- Rust domain/application/infrastructure/ipc modules;
- typed error vocabulary;
- tracing setup;
- test helpers.

Gate: dependency direction documented and compile-tested.

## Stage C — Database worker

Implement:
- bundled rusqlite;
- worker lifecycle and bounded queue;
- connection PRAGMAs/assertions;
- initial migration;
- temporary DB fixture;
- clean shutdown.

Gate: migration/reopen tests pass; writes do not block renderer thread.

## Stage D — FoundationRecord vertical path

Implement:
- domain value validation;
- create/list/update/archive/restore commands;
- projections;
- generated TypeScript DTO;
- minimal UI;
- stale revision;
- optimistic reconcile if used.

Gate: desktop create/close/reopen persistence smoke passes.

## Stage E — Backup and restore

Implement:
- snapshot staging;
- manifest/checksum;
- restore inspection;
- integrity/foreign-key checks;
- close/swap/reopen;
- projection invalidation;
- interrupted/failure fixtures.

Gate: round-trip and corruption tests pass.

## Stage F — Quality closure

- CSP/capabilities review;
- no-remote check;
- keyboard/focus;
- Reduced Motion baseline;
- performance/tracing output;
- independent reviewer;
- Product Owner acceptance;
- update Status/ADR/lessons.

## Branch strategy

Prefer one feature branch for Foundation only if changes remain reviewable. Otherwise use sequential PRs:
1. bootstrap/toolchain;
2. Rust/SQLite worker;
3. FoundationRecord path;
4. backup/restore;
5. hardening.

No Task feature PR may merge before Foundation gate.
