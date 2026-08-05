# Task 36 Risk Register

| Risk | Severity | Prevention / evidence |
|---|---:|---|
| Task 37 leaks into migration or DTOs | P1 | No Task/series columns or relations; automated path/SQL scan before every phase gate. |
| Life tree is silently repurposed | P1 | Optional FK context only; active non-root guard; no Life node creation/move/rename from Plans. |
| Selected or last active variant is archived | P1 | DB trigger + service validation + direct-SQL tests. |
| Stale save overwrites committed work | P1 | Expected revision CAS, typed conflict, recovery draft retention. |
| Retry creates duplicate revision | P1 | Unique operation ID and replay returns original result revision. |
| Archive/restore loses nested state | P1 | Soft archive only; exact canonical snapshot tests across restart and backup restore. |
| Tag merge leaves orphan/duplicate joins | P1 | Transactional reassignment, PK dedupe, alias Search test. |
| Search introduces N+1 or stale rows | P1 | One bulk projection, dirty-scope triggers, query-count fixture and rebuild tests. |
| Plans inflate Today startup bundle | P1 | Lazy route, import-boundary test, +12 KiB main budget. |
| Rich-text reuse creates reader rows | P1 | Value-schema reuse only; DB absence test for `reader_documents`. |
| Accessibility relies on drag/visual state | P1 | Native controls, explicit move actions, keyboard/focus/announcement tests. |
| Migration failure leaves partial schema 20 | P0 | One atomic migration transaction and injected-failure recovery fixture. |
| Backup claims exactness without nested data | P1 | Canonical snapshot equality including variants, phases, revisions, draft, tags. |
| Evidence is stale or copied from Task 33 | P1 | Fresh Task 36 test/performance/native/release records; unchanged evidence labeled explicitly. |
