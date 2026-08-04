# Task 32 Remediation 002 — Application Navigation Request Delivery Closure

## Findings and root causes

- App retained a settled Search/Related/Task navigation envelope, so a route remount could deliver the same request again. Inline destination projections also changed object identity on unrelated App renders.
- Today's component-local handled refs protected only one mount. External arrival used object identity, and pending delivery could override a later workspace-tab or Week Strip choice.
- Life used the same persistent App request and did not wait for a remote Reader target's resulting browse projection. Manual Life actions could also lose to a pending projection.

## Locked lifecycle

- App owns one transient `{ requestId, target }` envelope. Every producer creates a fresh UUID, consumers settle the exact ID, and App clears only a matching current request.
- Today and Life receive memoized destination projections plus one stable settlement callback. Manual App destinations and Calendar activation cancel the current envelope.
- Today prepares external arrival by primitive request ID, preserves an open editor, waits for a successful non-fetching exact-date query, then focuses the validated Task/series row or the Today heading once and acknowledges. Query errors remain retryable. Workspace tabs and Week Strip choices terminally supersede pending external and internal focus.
- Life prepares history at most once per request ID. Browse and remote Reader requests settle only from the matching successful projection or a safe backend fallback. Query errors remain retryable, and manual Life navigation terminally supersedes pending entry delivery.
- A newer request replaces an older request. A late settlement for the older ID cannot clear or mutate the newer authority. No request state is persisted.
- While an exact Today request is pending, automatic midnight rollover cannot replace its requested date; the rollover anchor still advances immediately.

## Tests

- App integration coverage proves ID-guarded settlement, Today and Life route-remount non-replay, unrelated sidebar rerenders, manual navigation cancellation, and the midnight exact-date race.
- TodayScreen coverage proves same-ID object stability, success/fallback acknowledgment, query-error retry, modal delay with draft preservation, tab/date supersession, internal/external ordering, StrictMode safety, one-off/recurring focus, and the Remediation 001 fan lifecycle.
- LifeScreen coverage proves local and remote Browse/Reader settlement, fallback and invalid Reader behavior, query-error retry, manual supersession, same-ID object stability, new-ID delivery, single history insertion, StrictMode safety, and axe cleanliness.
- Windows Phase 6 E2E covers exact recurring-row delivery followed by sidebar rerenders, Calendar/Today remount, and absence of stale workspace or fan restoration. Unit/integration tests remain focus-count and remote Reader authority where native active-element/fixture inspection is not reliable.

## Out of scope

No Task 33 behavior, database/schema/migration, Rust Task/Life semantics, IPC/DTO/capability/plugin, planning/recurrence/evaluation semantics, Life hierarchy semantics, Reader format, routing framework/store/context/event bus, URL routing, dependency, or persistence is introduced.

## Implementation commit

Commit A is the bounded product-code, test, E2E, and remediation-spec commit. Its SHA is recorded in the final remediation audit and Project State evidence after the commit exists.

## Acceptance

Acceptance requires focused and full verification, Windows native E2E, NSIS packaging, release-candidate dogfood, independent diff/scope audit, and a clean pushed two-commit history. Task and slice remain 32 and 22, schema remains 16, active spec remains null, and Task 33 remains unselected.
