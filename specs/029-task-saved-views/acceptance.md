# Task 39 Acceptance Mapping

Status: ACCEPTED by deterministic implementation evidence at product checkpoint
`374abcbae263be18fa785a56d656678f9bfd9c29`. The baseline diff review found no remaining P0/P1
issue. Task 40 stays absent and unrecommended.

## Migration and lifecycle

- Migration tests: fresh schema 23 once, schema 22 upgrade, idempotence, enum/check/index shape,
  unchanged existing data, no Saved View columns elsewhere, and schema-too-new rejection.
- Repository tests: canonical/normalized names, duplicates across archive state, 50 active views,
  create/get/update, revisions, stale writes, compact archive/restore positions, restore append,
  exact-set atomic reorder, and absence of hard delete.

## Predicate and references

- Unit tests: every clause canonical round trip, AND/set-OR behaviour, zero-clause rule,
  duplicate/empty/unknown/nested/malformed/unsupported/limit rejection.
- Integration tests: only active new targets, archived survival with labels, alias-to-canonical tag
  matching, missing warning plus zero-match clause, and explicit repair/removal.

## Source, sort, group, and navigation

- Projection tests compare unfiltered source membership for Today, Upcoming, Overdue, and
  Deadlines; cover evaluation and exact-slot behaviour, window edges, moved/cancelled recurring
  identity, deadline metadata, and source caps.
- Predicate tests cover kind, priority, category, one-off/series tags, exact Life/Plan, deadline
  presence/state, scheduled-after-deadline, and representative AND combinations.
- Ordering/grouping tests cover every mode, stable tie-breakers, group labels/order, archived and
  unlinked groups, exact one-off navigation, and exact recurring/moved navigation.

## Query shape, UI, and durability

- Deterministic query inspection proves bulk tag/metadata loads, alias resolution, no generated
  predicate SQL, and 5,000 errors rather than truncation.
- Frontend tests cover the fifth tab/default/roving keyboard, typed create/edit, retained failure
  draft, archive/restore/reorder, unsupported/unresolved states, semantic lists/groups, exact
  navigation, invalidation after all relevant writers, and axe for panel/editor.
- Reopen and full backup→mutate→restore→reopen tests preserve exact predicate/modes/revision/state/
  order and executable results; Search rebuild remains unchanged.

## Final gates

Canonical governance/integrity, typecheck, 596 frontend tests, production frontend build, Rust
fmt/clippy and full serial tests (587 passed, 4 designated ignored), generated-artifact, diff,
workflow-seal, lockfile, and released-migration checks pass. The optional historical aggregate
JavaScript budget check remains a non-blocking pre-existing tooling debt: even removing the
entire 16,063-byte Saved View chunk leaves the prior bundle above its 1,150,000-byte threshold.
One full baseline diff review found a backup equality-test coverage gap, corrected before the
checkpoint; no confirmed P0/P1 issue remains. Task 40 stays absent and unrecommended.
