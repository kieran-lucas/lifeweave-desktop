# Task 48 Acceptance

Task 48 closes only when all of the following are evidenced:

- schema remains 27 and backup format remains v2;
- strict restore parsing and every existing safety authority remain intact;
- generated compatibility authority distinguishes Ready, MigrationRequired, NewerSchema, and
  NewerFormat without using application version;
- list is read-only, bounded, path-free, artifact-safe, and backend-sorted newest first;
- creation verifies and durably publishes the fresh package before pruning;
- the fresh package can never be pruned, including timestamp rollback;
- exactly 12 currently restorable managed backups remain; migration-required counts and
  incompatible/unknown artifacts remain untouched;
- cleanup failure keeps fresh creation successful with truthful prune/pending metadata;
- containment prevents deletion of safety, staging, restore, symlink/reparse, unrelated, malformed,
  and outside-root artifacts;
- candidate migration leaves source backup bytes/checksum unchanged and backend rejects future
  format/schema;
- Backup & Restore is lazy first-class Settings content and Foundation owns no backup logic;
- restore confirmation, focus containment/restoration, busy-state locking, cache invalidation,
  announcements, disabled incompatible rows, and zero applicable axe violations are proven;
- focused Rust/frontend tests, Phase 19, full gates, native/RC/build, performance, and deliberate
  break evidence are recorded under `AI_CONSTITUTION.md` §7;
- dependencies, capabilities, workflow/seal, locked performance ceilings, and Task 49 are unchanged;
- final worktree is clean and `HEAD == origin/main` with `product_owner_gate` closure state.
