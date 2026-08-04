# Task 32 Remediation 001 — Planning Interaction Lifecycle Closure

## Findings and root causes

- Finding A: `openFan` survived a Task-workspace tab change because tabs received the raw workspace state setter. Re-entering Today could therefore render the previously open assessment fan.
- Finding B: planning focus state remained live and the focus effect reran whenever Today query data changed. A handled external request could also become active again after a temporary internal request cleared.

## Locked lifecycle

- The Today screen is the only Task-workspace activation authority. Activating Upcoming or Overdue clears only `openFan`; editor-open tab disabling and all unrelated Today state remain unchanged.
- Planning and external Task navigation both clear `openFan` before entering Today.
- Internal and external focus requests retain `requestId` identity and have independent handled identities.
- A request is handled only after the exact-date Today query resolves while Today is active. Success scrolls and focuses the backend-identified Task/series row once. Absence focuses `today-heading` once and completes the request.
- Internal requests are consumed after success or fallback. A handled external request cannot revive when an internal request clears. A new request ID remains eligible.

## Tests

- TodayScreen integration coverage exercises fan round trips, editor disabling, undo preservation, internal one-off/recurring navigation, external one-shot behavior, new request IDs, query refresh focus preservation, fallback timing, and external-after-internal protection.
- Existing TaskWorkspaceTabs tests remain the authority for manual activation, roving `tabIndex`, arrow/Home/End focus movement, and Enter/Space activation.
- Phase 6 native E2E visibly opens a Today assessment fan, leaves for Upcoming, returns with the fan closed, and retains exact recurring-row planning navigation and overdue review.
- Automated axe coverage includes Upcoming after leaving an open fan and Today after returning with the fan consumed.

## Out of scope

No Task 33 behavior, planning range or overdue semantic change, recurrence/evaluation persistence change, database/migration, Rust behavior, IPC/capability, dependency/plugin, global navigation framework, persistent workspace mode, editor behavior, Task layout, or assessment visual design is introduced.

## Implementation commit

The implementation commit is Commit A, `harden task planning focus lifecycle`; its immutable SHA is recorded in Project State and the remediation audit after Commit A is created.

## Acceptance

Acceptance requires the focused and full command evidence, Windows E2E, NSIS build, release-candidate dogfood, diff/scope audit, and clean pushed two-commit history specified by the remediation authorization. Task and slice remain 32 and 22, schema remains 16, active spec remains null, and Task 33 remains unselected.
