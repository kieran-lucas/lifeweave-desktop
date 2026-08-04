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

## Remediation 002

- [x] App owns one transient request envelope, memoizes Today/Life projections, and clears only a matching acknowledged request ID.
- [x] manual App destinations, Calendar, Today workspace tabs, Week Strip dates, and Life navigation supersede pending delivery without replay.
- [x] Today success/fallback acknowledge once, query error remains retryable, modal delivery waits without losing draft state, and route remount cannot replay a settled request.
- [x] Life Browse/Reader waits for the matching projection, remote Reader completes, fallback/non-leaf outcomes settle safely, and history is pushed at most once per request ID.
- [x] late A settlement cannot clear B, same target/new ID handles again, and midnight cannot override an exact pending Today date.
- [x] focused/full/axe/performance/native E2E/NSIS/RC evidence passes; schema remains 16, active spec remains null, and Task 33 remains unselected.
