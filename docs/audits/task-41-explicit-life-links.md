# Task 41 — Explicit Life Links + Backlinks Core audit

## Closure identity

- Activation baseline and Task 40 remediation: `6bcffe751458ee37a4cde663e21336a1f484a613`.
- Activation commit: `cfa968a`.
- Initial product implementation: `bd4d5e87f55508db419ad145347d430d0ffc5fc8`.
- Final product checkpoint after broad-gate correction: `e1fe3675315c04590aabe9c9ca87ede344dafa40`.
- Schema: 23 to 24. Slice: `031-explicit-life-links`. ADR: 0035.
- Closure commit: the commit containing this audit and the synchronized closure surfaces.

## Shipped authority

`life_links` stores only `id`, `source_node_id`, `target_node_id`, and `created_at`. It has a
self-link check, a unique directed pair, `ON DELETE RESTRICT` foreign keys to `life_nodes`, and
covering source and target indexes. Backlinks are derived from the target index; there is no copied
metadata or backlinks table. Released migrations 1–23 are unchanged.

Rust validates that both endpoints are active, non-root Life leaves with one active committed Basic
Leaf or Narrative Canvas document. It owns self/duplicate errors, the 100 outgoing and 500 incoming
caps, atomic create/remove-by-link-ID, live panel projection, deterministic Vietnamese-normalized
ordering, and typed failures. Reverse edges remain distinct. The panel obtains endpoint metadata in
one bounded query rather than issuing a query per row; repository tests also inspect the query plan.

The bounded target command reuses the existing Life FTS and normalization authority. It requires a
normalized 1–120-character query, excludes the source, existing targets, root/branch/archived/
documentless nodes, returns at most 20 stable-ID results, and applies deterministic ordering. It
adds no global Search entity, query syntax, or second FTS index.

The four generated commands are `get_life_link_panel`, `search_life_link_targets`,
`create_life_link`, and `remove_life_link`. Canonical Rust DTO export generated the TypeScript and
permission artifacts; the main window gained exactly those four permissions and no OS capability.

## Reader workflow, lifecycle, and cache

The lazily loaded Reader panel appears after document content and before Related Tasks. It provides
semantic counts, explicit empty/loading/error/ineligible states, outgoing links, read-only
backlinks, archived/unavailable labels, and outgoing-only removal. The Add link dialog supports
keyboard search, explicit selection/confirmation, Escape/cancel, contained focus with restoration,
and retained query/selection on save failure. Panel and dialog axe coverage has zero violations in
empty, populated, archived, dialog, and ineligible states.

Navigation always passes the endpoint Life node ID. Reader-only navigation appends Reader history,
so A → B → C → Back → B → Back → A works and focuses the Reader heading. External Search/Pinned/
Browse entry preserves the established return-to-Browse contract. The latter was caught by the
full native suite and corrected at `e1fe367`.

Rename/reparent project current title and breadcrumb without rewriting an edge. Archive or later
document unavailability preserves the edge, labels it unavailable, and disables navigation;
restore makes it navigable again. Query keys include node ID and target-search parameters. Link,
tree, document, and database-restore writers invalidate the precise link panel and target options.

Full-database backup/reopen preserves exact link ID, direction, endpoint IDs, and timestamp.
Restore integrity rejects dangling endpoints. Portable Package v1, Markdown, global Search,
document JSON, and Search rebuild behavior are unchanged.

## Native evidence and deliberate breaks

The registered Windows sequence contains 19 phases and passed in 277.7 seconds:

- `phase11-life-links.e2e.ts` — accessible add, outgoing, exact navigation, backlink, back, remove,
  and recreate;
- `phase11-life-links-restart.e2e.ts` — close/reopen persistence and navigation;
- `phase12-life-links-backup-restore.e2e.ts` — backup, mutate/remove/archive, restore, exact relation
  and live metadata;
- `phase12-life-links-backup-restore-restart.e2e.ts` — restored relation after another reopen.

Each phase was made load-bearing against a temporary central production break and then restored:

| Break | Expected failing phase | Observed |
| --- | --- | --- |
| Disable `Add link` | phase 11 | dialog could not open |
| Delete schema-24 links during reopen | phase 11 restart | Beta outgoing relation missing |
| Make database restore a no-op | phase 12 | restored Beta relation missing |
| Retain the mutation marker through the final reopen | phase 12 restart | Beta relation missing |

After every break was reverted and retained E2E artifacts were removed, the four-phase sequence
passed 4/4 in 127.3 seconds. A full tracked-code diff check confirmed zero break residue.

## Performance and release evidence

Task 40 started at 16 chunks, 1,181,334 raw bytes, 361,595 deterministic gzip bytes, and 542,728
startup raw bytes. Three final normalized inventories were identical at 17 chunks, 1,190,378 raw,
364,685 gzip, and 544,394 startup. Deltas are +9,044 raw, +3,090 gzip, and +1,666 startup, within
the authorized 24 KiB / 8 KiB / 2 KiB ceilings. `LifeLinksPanel-ddwrAJio.js` is a non-startup lazy
chunk of 7,383 raw / 2,607 gzip bytes.

Because Task 41 intentionally adds a seventeenth chunk and crosses Task 40's narrow total-raw
maximum, the active aggregate budget is truthfully versioned in
`task-41-performance-budgets.json`. Task 40 evidence is byte-identical:

- baseline SHA-256: `B428220BA0D9B36CE5F2893C79BDFD2600152BE1A1444D61232C1A335A391489`;
- budget SHA-256: `16F08C722AB57D88FDA78BC6E02D6E8A84CA76E9C2FF38CAC052B8B9B2F3B7E5`.

`pnpm tauri build` passed. `pnpm hardening:rc` passed in 151 seconds with release installer
`Lifeweave_0.0.0_x64-setup.exe`, 5,117,319 bytes, SHA-256
`38cd6f1488d3710063fad7e1d0d718118eb2ffdc9ed1a6d49cfc507e47fdc240`, candidate
`core-rc-e1fe367`.

## Command evidence

Preflight and integrity:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
git fetch origin
git rev-parse origin/main
Get-FileHash .github/WORKFLOW_SEAL.sha256 -Algorithm SHA256
```

Focused evidence:

```text
cargo test --manifest-path src-tauri/Cargo.toml task41_migration -- --test-threads=1
  5 passed
cargo test --manifest-path src-tauri/Cargo.toml life_link -- --test-threads=1
  11 passed
cargo test --manifest-path src-tauri/Cargo.toml infrastructure::backup -- --test-threads=1
  147 passed
cargo test --manifest-path src-tauri/Cargo.toml export_ipc_bindings -- --test-threads=1
  1 passed
pnpm test -- src/features/foundation/FoundationScreen.test.tsx src/features/life/LifeEditWorkspace.test.tsx src/features/life/LifeScreen.test.tsx src/features/life/links/LifeLinksPanel.test.tsx src/features/life/portable/PortablePackage.test.tsx src/ipc/commands.test.ts
  final focused rerun: 78 passed in 6 files
pnpm test src/features/life/LifeScreen.test.tsx
  23 passed
pnpm e2e:windows -- phase11-life-links.e2e.ts
pnpm e2e:windows -- phase11-life-links-restart.e2e.ts
pnpm e2e:windows -- phase12-life-links-backup-restore.e2e.ts
pnpm e2e:windows -- phase12-life-links-backup-restore-restart.e2e.ts
  restored sequence: 4/4 passed in 127.3 seconds
```

Broad evidence:

```text
pnpm source:verify
pnpm governance:check
pnpm index:check
pnpm verify
python -m unittest scripts.tests.test_check_project_state
  15 passed
pnpm typecheck
pnpm test
  final rerun: 615 passed in 43 files
pnpm build
pnpm hardening:performance
  17 chunks; violations []
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked -- --test-threads=1
  final rerun: 606 passed, 4 ignored
pnpm tauri build
pnpm e2e:windows
  19/19 phases passed in 277.7 seconds
pnpm hardening:rc
git diff --check
```

An exploratory `cargo test --manifest-path src-tauri/Cargo.toml export_bindings --
--test-threads=1` matched zero tests; the exact `export_ipc_bindings` command above passed. The first
full Rust run found one stale schema-23 assertion in a Narrative backup test; the test was
updated to the live schema-24 authority and the full rerun passed. The first full native run found
the external Search-to-Reader history regression described above; production and regression test
were corrected, then the full 19-phase run passed. A standalone `pnpm --dir e2e-tests exec tsc
--noEmit` could not resolve the harness-provided `@wdio/globals/types`/Node types outside WDIO; the
native WDIO compilation and executions passed, so this is classified as a standalone harness
environment limitation rather than product evidence.

## Boundaries and review

No dependency or lockfile, workflow, workflow seal, migrations 1–23, Portable Package, Markdown
payload, Graph, whole-tree interchange, route/sidebar destination, generic relation framework, or
Task 42 work changed. Final review order was specification, migration/data integrity, architecture,
security/privacy, accessibility/keyboard behavior, performance, interaction fidelity, and scope.
The broad gates exposed the two regressions above; both received the smallest safe correction and
regression evidence. No P0/P1 or actionable `BLOCKER`, `HIGH`, `MEDIUM`, or `LOW` finding remains.

## Post-closure remediation — stale linked-Reader navigation

### Finding, reproduction, and correction

Post-closure review confirmed a `MEDIUM` / P2 navigation race in
`frontend/src/features/life/LifeScreen.tsx`. From Reader A, activating A -> B started an awaited
target projection without invalidating it when Back or another explicit navigation ran. The stale
completion could therefore reopen B and append A after the user had already returned to Browse.
The same missing ownership rule allowed the old request's `finally` path to retain or release busy
state without knowing whether it still owned that state.

A controlled deferred-promise regression reproduced the original implementation. Before the fix,
Back reached Browse but Browse controls remained disabled while B was pending. With the central
post-await guard deliberately disabled after implementation, resolving B then replaced Browse with
the `Remote Leaf` Reader, proving that the test is load-bearing. The deliberate break was restored
before any commit and a tracked-code search confirmed zero residue.

Commit `04aa2c9dda6f30ba87672cbb71b6e69ef51e995b` adds a component-local monotonic
generation, linked-navigation busy owner, and current Reader identity ref. Every explicit
navigation boundary calls one named invalidation helper before changing destination: external
entry requests; Browse/Pinned card navigation; breadcrumb navigation; Back; Browse, Edit, and
Pinned mode changes; the Edit workspace's return to Browse; and previous/next child paging.
Invalidation releases only the linked request's busy ownership immediately. A successful request
may commit only while its generation and initiating Reader remain current; stale success and stale
failure return silently. `finally` clears busy only when that request still owns it, so an old
completion cannot disturb a newer attempt. Valid navigation retains exact stable-node-ID
validation, source history, target-heading focus, and sequential A -> B -> C -> Back -> B -> Back
-> A behavior.

Three deterministic tests now cover Back over stale success, a newer Browse destination over stale
success, and silent stale rejection. They use no sleeps, fake timers, backend delay command, or
production test hook. The existing sequential Reader history and external Search-to-Reader tests
remain passing.

### Remediation verification

Focused and frontend evidence:

```text
pnpm test -- src/features/life/LifeScreen.test.tsx -t "keeps Back authoritative when a linked Reader projection resolves late"
  before fix: failed 1/1 because invalidated busy ownership was not released
  deliberate central guard break: failed 1/1 because stale B reopened Remote Leaf
  restored guard: passed
pnpm test -- src/features/life/LifeScreen.test.tsx
  26 passed in 1 file; no React act warning or unhandled rejection
pnpm typecheck
  passed
pnpm test
  618 passed in 43 files
pnpm build
  passed; 851 modules transformed
pnpm hardening:performance
  17 chunks; main/startup raw 514,710; total raw 1,190,836; deterministic gzip 364,842;
  violations []
```

The remediation delta against the Task 41 closure inventory is +458 main/startup raw bytes, +458
total raw bytes, and +157 deterministic gzip bytes. The existing Task 41 budget remains green and
unchanged.

Repository, Rust, native, and release evidence:

```text
pnpm source:verify
pnpm governance:check
pnpm index:check
  402 indexed headings; full coverage
pnpm verify
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets --all-features -- -D warnings
  passed
cargo test --manifest-path src-tauri/Cargo.toml --locked -- --test-threads=1
  606 passed, 4 ignored
pnpm tauri build
  passed; release installer built
pnpm e2e:windows -- phase11-life-links.e2e.ts
  1/1 passed in 72.7 seconds
pnpm e2e:windows
  19/19 phases passed in 262.4 seconds
$env:RUST_TEST_THREADS='1'; pnpm hardening:rc
  passed in 136.5 seconds as core-rc-04aa2c9; two 25-second schema-reopen sessions;
  installer 5,115,829 bytes; SHA-256
  5b2d06a42b548d8b6fd38ad53e19a0444e2e3c1dc6a1ddf9bfec7284ad31bb09
git diff --check
  passed
```

One default-parallel `pnpm hardening:rc` capture failed because four unrelated backup
failure-injection tests collided inside the selector; a preceding detached attempt left the same
sentinel-marked RC-profile class. Both exact generated profiles were containment- and
sentinel-validated, then removed. The full single-thread Rust suite had already passed, and the
smallest deterministic substitute above passed without changing code, assertions, or the RC
script. No native race backdoor was added; the controlled frontend deferred promise remains the
authoritative interleaving proof.

### Scope and project state

This remediation consumes zero numbered tasks. Task 41 remains the latest closed task and feature,
Slice 031 remains closed, schema remains 24, `active_spec` remains null, `next_action` remains
`product_owner_gate`, and `recommended_next_candidate` remains null. Task 42 remains prohibited,
unstarted, unallocated, and unrecommended.

Schema, migrations 1-24, dependencies, lockfiles, generated bindings, IPC, workflows,
`.github/WORKFLOW_SEAL.sha256`, Portable Package, Markdown interchange, Graph, whole-tree
interchange, and all excluded product semantics are unchanged. Production scope is confined to
`LifeScreen.tsx`; regression scope is confined to `LifeScreen.test.tsx`; this chronological audit
addendum is the only evidence-file change.
