# Task 48 — Managed Backup Retention and Compatibility Audit

## Authority and checkpoints

- Repository baseline: `17a833067cfca5e4c4b11da11dfd987528cb444a`.
- Prior feature checkpoint: `1c42ac5358579dc8795e4b7c1b76bc004b0269f1`.
- Activation commit: `a0c5dea1e2767c43819923a2bfaa7d16ba207e6b`.
- Product checkpoint: `51e24c54f12f0236ecba1bd81936bc11db59f8ac`.
- Closure commit: `PENDING_CLOSURE_COMMIT`.
- Governing decision/specification: ADR 0042 and
  `specs/038-managed-backup-retention-compatibility`.
- Activation preflight proved a clean `main` with `HEAD == origin/main ==` the baseline.
- Database schema remains 27; backup format remains v2. No migration or format bump exists.

## What shipped

Managed backup inventory now exposes path-free Rust-owned metadata: opaque backup ID, format,
application version, schema, creation timestamp, database size, and version compatibility. The
separate bounded inventory parser may identify safe future-format metadata without weakening the
strict restore parser. Application version is informational only.

Compatibility is version authority, not a checksum claim: format 1/2 plus schema 27 is `Ready`;
format 1/2 plus an older schema is `MigrationRequired`; a newer schema is `NewerSchema`; and format
greater than 2 is `NewerFormat`. Restore accepts the first two through its existing validation and
candidate migration path and rejects the latter two in the backend.

`backup_database` retains its existing command and exact permission but now returns the generated
`BackupCreateResult`. There is no path-bearing IPC, renderer filesystem access, delete command, new
permission, or capability broadening.

## Publication, retention, and filesystem safety

`MAX_RESTORABLE_MANAGED_BACKUPS` is exactly 12. Managed creation holds maintenance authority through
online snapshot creation, staging verification, durable atomic publication, final published-package
verification, and only then retention. The fresh opaque ID is protected explicitly even if its
wall-clock timestamp sorts behind existing backups.

Retention keeps fresh plus the 11 newest other currently restorable packages. `MigrationRequired`
counts; `NewerSchema`, `NewerFormat`, malformed/unknown packages, safety/staging/restore artifacts,
arbitrary files, links/reparse points, and anything outside the canonical direct-child root do not.
Each proposed deletion is re-resolved, reclassified, strictly parsed, checksummed, integrity/FK and
asset validated before the backend durability helper removes it oldest-first.

Removal failures never invalidate or remove the fresh backup. Creation returns success with a
truthful pruned count and `retention_cleanup_pending=true`; no compensation deletion or retry loop
exists. Listing, rendering, startup, selection, compatibility inspection, and restore do not invoke
retention.

## Restore and source immutability

The established restore authority remains intact: active-timer guard, maintenance lock, strict
format/schema rejection, checksums, integrity/FK and asset checks, immutable copy to candidate,
pre-restore safety snapshot, crash marker, rollback, reopen, and forward candidate/live migration.
The schema-26 restore regression compares source database and manifest bytes before/after and proves
the source package is not rewritten.

## First-class Settings and bindings

Backup & Restore is a lazy first-class Settings feature with retention explanation, backend-sorted
managed versions, all required metadata, textual compatibility, and disabled incompatible restore
actions. FoundationScreen now owns FoundationRecord tooling only.

Create reloads inventory, focuses the fresh row action, announces timestamp and prune count, and
reports partial cleanup without claiming creation failed. Restore requires a bounded accessible
confirmation identifying timestamp, format, schema, compatibility, and the safety snapshot. Older
schema copy explains candidate migration and source immutability. Initial focus, Tab containment,
idle Escape, trigger-focus restoration, and non-cancellable in-flight restore are tested. Successful
restore reuses the existing global query-cache clear callback and reloads inventory.

Rust generated `BackupCompatibility`, `BackupCreateResult`, and the expanded `BackupSummary`
TypeScript bindings. No generated binding was hand-edited.

## Command-level evidence

- `pnpm source:verify`, `pnpm governance:check`, `pnpm index:check`, `pnpm verify` — PASS.
- `pnpm typecheck` — PASS.
- Focused Backup Settings/Foundation/App tests — PASS, 44/44, including applicable axe checks.
- Default parallel `pnpm test` — nondiagnostic host resource contention: 720/734 with 14 scattered
  preexisting timeout/loading failures; no Task 48 test failed.
- Deterministic substitute `pnpm --dir frontend exec vitest run --maxWorkers=1 --reporter=dot` —
  PASS, 49 files and 734/734 tests.
- `pnpm build` — PASS, 870 modules and 23 JavaScript chunks.
- `cargo fmt -- --check` from `src-tauri` — PASS.
- `cargo clippy --locked --all-targets --all-features -- -D warnings` — PASS.
- `cargo test --locked -- --test-threads=1` — PASS, 774 passed, 4 ignored, 0 failed.
- Focused backup engine tests — PASS, 22/22; active-timer and schema-26 source-immutability restore
  regressions — PASS; generated backup binding export — PASS.
- `pnpm tauri build` — PASS; optimized Windows application and NSIS installer built.
- `pnpm e2e:windows -- phase19-managed-backup-versions.e2e.ts` — PASS, 1/1 in 13.9s.
- Exact Phase 9 establish/restart pair — PASS after the first full-run driver failure.
- Exact Phase 9→10 backup/restore/restart sequence — PASS.
- Exact Phase 11→12 link backup/restore/restart sequence — PASS.
- `pnpm hardening:rc` — PASS; two-session schema reopen, liveness, and 5,402,336-byte installer
  SHA-256 `0cec121b87cc2fffea8a697ed94c2913b2c13c8453860d032b8c4df015c14c35`.
- `python -m unittest scripts.tests.test_check_performance_budgets` — PASS, 18/18.
- `pnpm hardening:performance` — PASS, zero violations.
- `git diff --check` and staged activation→product diff check — PASS.

## Deliberate load-bearing break

Before commit, `MAX_RESTORABLE_MANAGED_BACKUPS` was temporarily changed from 12 to 13. The focused
retention test failed meaningfully at the assertion that publishing the thirteenth package prunes
exactly one oldest eligible backup (`left: 0`, `right: 1`). The constant was restored to 12 with
`apply_patch`; the focused Rust suite, Backup Settings tests, and Phase 19 returned green. Search and
staged-diff inspection confirmed zero break residue. The break was never committed.

## Performance

Evidence files are `task-48-performance-baseline.json` and `task-48-performance-budgets.json`.
Three clean activation builds were byte-identical. Final production, native, and RC builds
reproduced the same final inventory. ADR 0034 v2 formulas version only the aggregate maxima; all
locked ceilings remain unchanged.

| Metric | Activation | Final | Maximum |
|---|---:|---:|---:|
| startup `index.js` raw | 526,020 | 524,181 | 534,665 (locked ceiling 535,000) |
| total JavaScript raw | 1,226,352 | 1,231,159 | 1,240,393 |
| total deterministic gzip | 375,977 | 377,912 | 382,008 |
| chunks | 22 | 23 | 23 |

The new lazy Backup Settings chunk is 6,645 raw bytes, below the 10 KiB tracking threshold. Locked
`BasicLeafEditor.js <= 490,000` and `markdown.js <= 129,000` ceilings are unchanged. No dependency
or unbudgeted chunk at or above 10 KiB was introduced.

## Verification debt

Two bounded host-instability items are disclosed under `AI_CONSTITUTION.md` §7:

1. The default parallel frontend suite produced scattered timeouts under host contention. The full
   suite passed 734/734 with one worker; no timeout or product behavior was weakened.
2. Two full native-matrix attempts stopped after WebDriver stale-element/session instability in the
   Phase 9/10 segment. Artifacts were retained at `fb8891eb1aee43e2a4d0c00668dee479` and
   `9caf95cb8ef34ddf9b097a6a877ee2bc`. The first failure localized to Phase 9 restart; that exact
   establish/restart pair passed in a fresh profile. The second reached Phase 10; the exact Phase
   9→10 sequence passed, as did Phase 11→12, and focused Phase 19 passed independently. Per the
   bounded-rerun rule, no third full matrix was attempted and no product semantics were changed for
   the driver.

No confirmed product defect remains. Rust, frontend/a11y, focused native/restart, production build,
RC, and performance authorities all have deterministic green evidence.

## Activation-to-product self-review

1. **Any pruning before final verification/publication?** No; retention follows final verification.
2. **Can the fresh backup be pruned?** No; its opaque ID is unconditionally protected.
3. **Can future-format/newer-schema backup be pruned?** No; both are non-restorable/exempt.
4. **Can retention touch safety/staging/outside-root artifacts?** No; validated canonical direct
   managed children only.
5. **Can list/render mutate storage?** No; inventory is read-only and renderer receives no path.
6. **Is retention exactly 12 restorable backups?** Yes; fresh plus 11 newest others.
7. **Does cleanup failure preserve creation?** Yes; success plus truthful pending/count result.
8. **Backup format still 2?** Yes; the new-manifest regression proves it.
9. **Schema still 27?** Yes; no migration or schema edit exists.
10. **Does older-schema migration leave source unchanged?** Yes; exact package bytes are asserted.
11. **Does backend reject future format/schema?** Yes; strict restore tests remain green.
12. **Is UI presentation non-authoritative?** Yes; incompatible controls disable while backend owns
    rejection.
13. **Is Backup first-class and separated from Foundation?** Yes; lazy Settings owns it exclusively.
14. **Any dependency/capability/network/background worker?** No.
15. **Locked performance ceilings unchanged?** Yes.
16. **Task 49 touched?** No; prohibited, unstarted, unallocated, and unrecommended.

## Exclusions

No Backup v3, schema 28, migration, delete/pin/rename/notes, configurable or scheduled retention,
background worker, cloud/network/external destination, incremental/compression/encryption redesign,
restore rewrite, safety redesign, dependency, workflow/seal change, or Task 49 work was added.
