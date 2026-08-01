# Slice 000 — Test Plan

## Unit
- Foundation label validation.
- Revision transitions.
- Typed error mapping.
- Manifest/checksum generation.

## Property
- arbitrary Unicode label within bounds round trips;
- invalid lengths rejected;
- revisions monotonically increase;
- checksum changes on data mutation.

## SQLite integration
- migration fresh DB;
- reopen existing DB;
- foreign key enabled;
- WAL enabled;
- transaction rollback;
- busy/queue behavior;
- archive/restore;
- stale revision;
- concurrent command ordering.

## Backup/restore integration
- snapshot after recent writes;
- restore exact snapshot;
- checksum failure;
- unsupported version;
- malformed manifest;
- SQLite corruption;
- interrupted staging;
- destination failure;
- pre-restore backup.

## Frontend
- empty/loading/error/success;
- keyboard create;
- validation focus;
- optimistic rollback if used;
- no raw invoke outside adapter.

## Desktop E2E
- launch/create/close/relaunch;
- backup/change/restore;
- log review;
- network disconnected;
- Windows DPI basic smoke.

## Performance
Instrument:
- UI command start;
- IPC receive/complete;
- DB queue wait;
- transaction duration;
- projection render/ready.

No numeric target is accepted before baseline measurement; regressions become explicit after baseline.
