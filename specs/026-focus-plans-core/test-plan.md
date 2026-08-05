# Task 36 Test Plan

## Migration and DB guards

- fresh database reaches schema 20 exactly once;
- schema 19 file migrates to 20 and reopens;
- injected migration failure leaves schema 19 recoverable;
- direct SQL rejects invalid lifecycle/date/Life target/tag assignment;
- direct SQL rejects selected/last-active variant archive and invalid restore;
- direct SQL preserves phase ordering and revision monotonicity.

## Repository and service

- create/get/list across five portfolio projections;
- nullable Life context and reassignment;
- create/select/archive/restore variants at 1/5 boundaries;
- create/reorder/archive/restore phases at 0/20 boundaries;
- canonical body validation without reader rows;
- expected-revision conflict;
- operation retry idempotency;
- 50-revision retention;
- recovery draft conflict/recover/discard;
- Plan archive/restore exact nested state.

## Tags, Search, backup

- 20-tag cap and active-tag guards;
- merge dedupe and alias Search;
- dirty-scope lifecycle;
- `focus_plan` result context and archived exclusion;
- 1,000-Plan bounded query counts;
- full backup/reopen/restore canonical equality.

## IPC and frontend

- DTO serialization and typed errors;
- command authorization and input limits;
- lazy route and Today startup import boundary;
- all create/edit/variant/phase/lifecycle/archive workflows;
- stale-save and recovery input retention;
- keyboard-only portfolio/detail/dialog operation;
- semantic labels/landmarks/fieldset/radio/ordered list/live region;
- focus restoration, narrow width, Reduced Motion;
- no progress percentage and no Task 37 surface.

## Native and release

- fresh profile create/edit;
- restart exact persistence;
- archive/restore;
- backup/restore into fresh profile;
- all prior official native phases;
- 1,000-Plan performance fixture;
- production build, Tauri release, NSIS, and RC run.
