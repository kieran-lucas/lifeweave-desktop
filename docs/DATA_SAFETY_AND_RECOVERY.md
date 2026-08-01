# Data Safety and Recovery

## Failure model

Protect against:
- app/process crash;
- power loss during write;
- failed migration;
- interrupted backup/restore/import/export;
- malformed or hostile import;
- missing/corrupt asset;
- stale editor write;
- accidental delete;
- derived-index corruption;
- incompatible future version.

## SQLite rules

- bundled SQLite;
- WAL;
- foreign keys enabled and asserted;
- explicit busy timeout;
- one authoritative write worker;
- transaction per domain command;
- no direct file copy while DB is open;
- critical query plans inspected;
- integrity checks during restore/diagnostics, not every startup.

## Migrations

- forward-only and immutable after release;
- schema version stored;
- backup before migration;
- migration fixtures from every supported version;
- restart/interruption recovery;
- no destructive rewrite without capacity estimate and rollback/staging design.

## Archive, Trash, undo

- user-visible delete defaults to archive/Trash where history matters;
- rich text uses editor history;
- domain operations use inverse commands;
- Trash provides longer recovery;
- undo does not cross incompatible later mutations silently;
- recurring and subtree operations expose clear scope.

## Backup package

Contains:
- consistent SQLite snapshot;
- asset originals according to scope;
- manifest with app/schema/export versions;
- checksums;
- metadata required for compatibility;
- optional human-readable export.

Procedure:
1. validate destination;
2. create staging;
3. SQLite Online Backup;
4. copy assets;
5. write manifest/checksums;
6. fsync/close;
7. atomic rename where supported;
8. report path, size, timestamp, checksum status.

## Restore

1. inspect manifest/version without mutation;
2. create automatic pre-restore backup;
3. extract into staging with path/size/count limits;
4. verify checksums;
5. run SQLite integrity and foreign-key checks;
6. close current DB;
7. atomic swap;
8. reopen;
9. rebuild derived indexes/aggregates;
10. emit global restored event;
11. preserve old failed state until success is confirmed.

## Corruption policy

Stop writes. Do not automatically “repair” by deleting data. Offer:
- diagnostic preview/export;
- backup of current files;
- restore selection;
- safe read-only access where possible.

## Required tests

- close/reopen persistence;
- crash between staging steps;
- backup while DB has recent writes;
- restore wrong checksum;
- restore unsupported version;
- missing asset;
- foreign-key violation;
- migration interruption;
- Unicode Vietnamese round trip;
- large but bounded archive;
- no real personal data.
