# ADR 0042 — Managed Backup Retention and Compatibility

## Status

Accepted and activated for Task 48 / Slice 038 from explicit Product Owner activation baseline
`17a833067cfca5e4c4b11da11dfd987528cb444a`.

## Context

Lifeweave already creates durable SQLite Online Backup snapshots, verifies database and asset
checksums, publishes atomically, restores through an immutable candidate plus safety snapshot, and
migrates supported older schemas while rejecting future schemas and formats. Managed backup
packages nevertheless accumulate without bound, expose too little version information, and remain
embedded in Foundation Records as a development control. The immutable source leaves backup
retention and version policy OPEN.

Backup format, database schema, and application version are independent authorities. The current
format is v2 and schema is 27; application version is informational only. Retention must not turn a
safe new backup into a failed creation, nor allow an older binary to erase data it cannot interpret.

## Decision

> **Lifeweave keeps at most 12 recent managed backups that the current binary can restore. A newly
> created backup is fully verified and durably published before retention cleanup may remove an
> older backup. Backup format v2 remains unchanged. Supported older-schema backups remain
> restorable by candidate migration; future-format or newer-schema backups are surfaced as
> incompatible and are never automatically deleted by an older binary.**

Compatibility is version-only metadata:

```text
supported format + schema 27    Ready
supported format + schema < 27 MigrationRequired
supported format + schema > 27 NewerSchema
format > 2                     NewerFormat
```

The strict restore parser remains authoritative and continues rejecting unsupported versions. A
separate bounded read-only inventory path may safely surface future-format metadata without making
it restorable. `app_version` never decides compatibility.

After staging verification, atomic publication, and verification of the published package,
retention protects the fresh backup and keeps the 11 newest other currently restorable packages.
It prunes older restorable packages oldest-first. Migration-required packages count toward 12;
newer-schema, newer-format, malformed, unrecognized, staging, safety, restore, outside-root, and
path-escape artifacts never do and are never automatically deleted. Inventory is read-only.

Cleanup is secondary. A partial or complete deletion failure preserves successful creation,
reports the truthful pruned count and pending cleanup, and leaves the fresh backup published.
There is no background retry worker; the next successful user-created backup re-evaluates policy.

Backup & Restore becomes first-class lazy Settings content. Every managed row presents timestamp,
application version, backup format, schema, database size, and textual compatibility. Restore is
allowed only for Ready and MigrationRequired rows, remains backend-authorized, and requires an
accessible confirmation that explains the safety snapshot and, when applicable, forward migration
without rewriting the source backup. Foundation Records returns to Foundation-only tooling.

## Consequences

- schema remains 27 and no migration is added;
- backup format remains v2 and historical supported v1/v2 restore behavior remains;
- the existing `backup_database`, `list_backups`, and `restore_database` commands and narrow
  permissions remain, with only the creation return DTO extended;
- no renderer path, filesystem delete authority, dependency, network destination, scheduled worker,
  configurable policy, manual delete, pin, encryption redesign, workflow change, or Task 49 work is
  introduced;
- configurable retention, pin/protect, manual delete, scheduled/automatic backup, offsite/cloud,
  and advanced encryption remain OPEN.

## Reversal conditions

Reopen only for a reproducible data-loss, containment, publication-order, compatibility,
source-mutation, restore-authority, or performance defect, or an explicit Product Owner decision.
Do not reinterpret this decision as Backup v3 or as authority for automatic or user-configurable
backup management.
