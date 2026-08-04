# Acceptance

Status: **ACCEPTED**

- [x] Today remains startup/default and Upcoming/Overdue remain internal tabs.
- [x] Upcoming is exactly +1…+14 and Overdue exactly -30…-1.
- [x] Any current evaluation removes an item from Overdue; undo may restore it.
- [x] recurring moves, cancellations, finite rules, splits, and stable identity pass.
- [x] the backend uses bulk queries, deterministic sorting, and a 5,000-item cap.
- [x] planning rows open exact Today date and Task/series identity.
- [x] manual tabs, empty/loading/error/retry, keyboard, axe, and rollover pass.
- [x] schema 16, no migration/dependency/plugin/new route/persisted queue state.
- [x] focused, ordinary, performance, native E2E, NSIS, and RC evidence pass.
- [x] Task 33 remains unselected and Project State returns to Product Owner gate.

## Remediation 001

- [x] leaving Today closes an open assessment fan without changing editor, undo, selection, date, error, or query state.
- [x] internal and external Task focus requests use separate one-shot `requestId` handling; success and missing-target fallback complete once.
- [x] handled external A cannot revive after internal B clears; a new external request ID remains eligible.
- [x] query/date updates preserve later user focus, and handling waits for resolved exact-date Today data.
- [x] focused, ordinary, axe, performance, seven-phase Windows E2E, NSIS, and RC evidence pass; schema remains 16 and Task 33 remains unselected.
