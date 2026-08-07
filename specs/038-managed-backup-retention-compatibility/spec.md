# Task 48 Specification — Managed Backup Retention and Compatibility Core

Status: ACTIVE. Product Owner authority is ADR 0042 and the Task 48 builder specification.

## Core invariant

Retention may delete only an older, positively identified, currently restorable managed backup,
and only after the fresh backup is verified and durably published. Compatibility inspection never
makes an unsupported package restorable, restore never rewrites the source package, and retention
cleanup failure never invalidates the fresh backup.

## Version and DTO contract

Schema stays 27; backup format stays v2 with supported historical restore formats v1/v2.
Compatibility is `Ready`, `MigrationRequired`, `NewerSchema`, or `NewerFormat`; application version
is informational. Renderer summaries contain opaque ID, format, app version, schema, creation time,
database size, and compatibility—never a path. `backup_database` returns the created summary,
truthful pruned count, and cleanup-pending state. No new create command is added.

## Inventory and retention

`list_backups` is bounded, read-only, and backend-sorted newest first. A separate inventory parse may
surface safely parseable future metadata; strict restore validation is unchanged. Malformed
supported packages are never Ready. Safety, staging, restore, unrelated, malformed, and escaped
artifacts are absent from managed inventory or classified unknown and are never deleted.

`MAX_RESTORABLE_MANAGED_BACKUPS` is 12. Only after staging verification, durable atomic publication,
and final package verification does creation protect the fresh ID, keep it plus the 11 newest other
restorable backups, and prune older eligible backups oldest-first. MigrationRequired counts;
NewerSchema and NewerFormat do not. Cleanup failure keeps creation successful and fresh published,
reports the exact prune count, and sets cleanup pending.

## Restore and Settings

Backend restore accepts Ready and MigrationRequired and rejects NewerSchema/NewerFormat regardless
of frontend state. Candidate migration never rewrites source backup bytes. Existing checksums,
integrity/FK and asset validation, active-timer guard, maintenance lock, safety backup,
marker/candidate/rollback, and future-version rejection remain binding.

Backup & Restore is first-class lazy Settings content and is removed from FoundationScreen. Rows
show every required version field plus textual compatibility. Restore requires an accessible,
focus-contained confirmation; MigrationRequired explains candidate migration and immutable source,
and all confirmations explain the safety snapshot. Create reloads inventory and focuses the fresh
row; restore reuses the global cache-clear callback and reloads inventory.

## Hard boundaries

No format v3, schema 28, migration, manual delete, pin, configurable or scheduled retention,
background worker, cloud/network/external destination, rename/notes, incremental backup,
compression or encryption redesign, restore rewrite, safety-backup redesign, dependency,
capability broadening, workflow/seal change, unrelated UI polish, or Task 49 work.
