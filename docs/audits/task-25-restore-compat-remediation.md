# Task 25 Restore Compatibility Remediation

`6ee20b09` is the initial Task 25 implementation candidate. The single commit containing this audit is the accepted Task 25 checkpoint.

## Root cause and repair

Restore candidate validation prepared a query containing `narrative_document_assets` for every schema version from 9 onward. That table was added only in migration 11, so valid schema 9/10 backups failed before validation could compare the manifest.

`required_asset_paths` now selects only tables guaranteed by the candidate's original schema:

- below 9: no asset authority; required paths are empty and any manifest asset is rejected;
- 9–10: usable `document_assets` paths only;
- 11+: distinct, ordered union of Basic Leaf and Narrative Canvas asset paths.

Manifest equality, size/checksum/path validation, limits, integrity/FK checks, and restore stages are unchanged. Backup creation remains current-schema and packages both authorities.

## Direct evidence

- Real schema-9 fixture: Basic Leaf asset validates; full production restore succeeds and migrates to schema 14 with the usable asset retained.
- Real schema-10 fixture: validation succeeds without preparing the Narrative table.
- Current-schema fixture: a Canvas-only asset is required.
- Negative assertions reject schema-9/10 missing Basic Leaf manifest entries, schema-11+ missing Narrative entries, and unrelated extra manifest paths.

Full gates: `cargo check`, format, clippy and `cargo test` passed (**398 passed, 1 ignored**); `pnpm verify`, typecheck, test (**429 passed**) and build passed.

No migration, dependency, IPC, backup format, workflow, or feature behavior changed.

Remaining non-blocking debt: stale native E2E selector; manual screen-reader/physical-DPI evidence; file-backed coverage remains composed from focused authorities rather than one monolithic smoke.
