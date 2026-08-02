# Task 16 recovery state machine

| Marker | Durable filesystem authority | Restart action |
|---|---|---|
| prepared | live is authoritative; candidate may exist | remove candidate, retain/reopen live |
| live moved aside | old is authoritative | restore old to live, validate, clean candidate |
| candidate installed | live candidate + old rollback | validate live; otherwise restore old |
| reopened/validated | live is authoritative | retry old/candidate/marker cleanup |

All content syncs precede checked sibling publication; marker and cleanup removal now also publish a parent-directory barrier. Cleanup or sharing failure retains the marker and maps to `RecoveryPending`; malformed/corrupt authority remains distinct. Existing failpoints cover marker writes, each swap stage, WAL/SHM sharing violations, candidate/old cleanup and repeated recovery. Re-running recovery converges idempotently without creating a blank database or consuming the only good copy.
