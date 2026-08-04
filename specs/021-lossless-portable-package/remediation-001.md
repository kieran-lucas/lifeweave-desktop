# Task 31 Remediation 001 — Portable Package Integrity and Lifecycle Closure

## Scope

This bounded remediation closes four audited Task 31 defects without changing Portable Package format v1, schema 16, command inventory, dependencies, plugins, capabilities, or Task 32 state.

## Locked corrections

1. A checksum-matching local asset row is reusable only after its usable status, checksum, MIME, dimensions, byte size, contained non-symlink backing path, backing checksum, and verified byte length all match. `document::assets::read_verified_original` remains the sole backing-file authority. Invalid matching authority fails closed without creating a duplicate row, document, join, or new asset file.
2. Startup performs best-effort stale portable cleanup before restore/database opening. Export and import cleanup inspect at most 1,024 direct children each, recognize only UUIDv7-owned names, ignore symlinks and unknown entries, and remove only artifacts older than 24 hours.
3. Manifest v1 titles remain non-empty after trimming, contain no control characters, and are limited to 200 Unicode scalar values. Filename sanitization remains limited to 120 characters.
4. Frontend import confirmation is the authoritative commit boundary. Successful confirmation immediately clears staging identity and closes preview; all three cache invalidations use best-effort settled results. Refresh failure produces committed-success warning copy and can never enter the unchanged-leaf failure state.

## Safety invariants

- No repair, replacement, status mutation, or deletion of invalid pre-existing asset authority.
- No broad staging cleanup and no startup failure propagation.
- Retry-safe preview and operation authority remain after backend confirmation failure.
- No discard is issued after successful confirmation.
- No schema, migration, package-format, dependency, IPC, permission, plugin, or product-scope change.

## Acceptance evidence

- Focused asset, portable, portable frontend, and date-rollover suites pass.
- Full source/governance/index/security, frontend, Rust, native E2E, installer, and RC gates pass.
- Task 31 remains the latest closed feature, Task 32 remains unselected, and the next action remains Product Owner gate.
