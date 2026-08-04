# Task 32 Remediation 001 audit — Planning Interaction Lifecycle Closure

## Findings and root cause

- Finding A: the assessment fan state survived Today panel unmount because Task-workspace tabs received raw `setWorkspaceMode`. Returning to Today could render the prior fan without a new user action.
- Finding B: internal planning focus state was never consumed, and no independent external handled identity existed. Later Today data changes could reapply old focus; clearing an internal request could expose and revive external A.

## Changed files

Commit A changes only `TodayScreen.tsx`, its focused test, Phase 6 planning E2E, and the remediation specification. Commit B changes only Project State, Task 32 status/acceptance/remediation evidence, this audit, and the project handoff. No Rust, migration, schema, generated binding, dependency, IPC, capability, plugin, or immutable source file changed.

## Transition evidence

- One local activation authority clears only `openFan` when leaving Today. Returning leaves it closed, switching remains allowed while a fan is open, and editor-open inactive tabs remain disabled.
- Planning and external Task navigation clear stale fan state before forcing Today.
- Internal and external requests have separate handled `requestId` refs. The focus effect runs only while Today is active and the exact-date query is resolved and not fetching.
- Success scrolls/focuses the backend-identified `data-task-id` or `data-series-id` row once. Missing target focuses `today-heading` once. Internal requests are consumed in both paths.
- Handled external A remains suppressed after internal B clears. A new request ID focuses again. Query/cache/date updates do not move later user focus.
- Tab activation leaves focus on the activated tab in browser behavior; no evaluation change is announced and latest undo state is preserved. Existing manual Left/Right/Home/End and Enter/Space behavior is unchanged.

## Focused tests

- `pnpm --dir frontend test -- TodayScreen`: 1 file, 21 passed.
- `pnpm --dir frontend test -- TaskWorkspaceTabs`: 1 file, 3 passed.
- `pnpm --dir frontend test -- TaskPlanning`: 1 file, 5 passed.
- `pnpm --dir frontend test -- App`: 2 files, 18 passed.
- `pnpm --dir frontend test -- AssessmentControl`: 1 file, 9 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked task::planning`: 4 passed, 1 ignored evidence test, 448 filtered out.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked task::recurrence`: 7 passed, 446 filtered out.

## Full verification

- `pnpm source:verify`, `pnpm governance:check`, `pnpm index:check`, and `pnpm verify`: passed; immutable source is 165,171 bytes / 4,637 lines / SHA-256 `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`; no-remote, security, and hardening checks passed.
- `pnpm typecheck`: passed. `pnpm test`: 33 files, 485 passed. `pnpm build`: passed, 826 modules; main JS 518,350 bytes; total JS 1,117,052 bytes; planning lazy chunk 3.34 kB.
- Cargo check, fmt check, and Clippy with `-D warnings`: passed. `cargo test --locked`: 449 passed, 0 failed, 4 ignored evidence tests.
- Project State standard-library tests: 14 passed.
- `pnpm hardening:performance`: passed. Planning backend performance was skipped because remediation changes no Rust projection, SQL, recurrence, or IPC behavior; a skipped suite is not claimed as passed.

## E2E and release

- `pnpm e2e:windows`: seven isolated phases passed on WebView2/EdgeDriver 150.0.4078.105. Phase 6 visibly opens a Today fan, leaves for Upcoming, returns with no stale fan, navigates to the exact recurring Today row, reviews Overdue, and verifies fresh-process persistence. Unit/integration tests are focus authority because reliable native `activeElement` inspection was not used.
- `pnpm tauri build`: passed. NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` is 4,810,700 bytes with SHA-256 `b9c01a547bd659e0362741905965d34b92d9b311975344f2d62aaf413dea970f`.
- `pnpm hardening:rc`: passed run `core-rc-77ca3cab93f64c158debe6f08cae23a0`; two isolated 25-second reopen sessions; document 25, backup 142, Narrative 60, Portable 11, and Task 59 tests.

## Remaining debt

- P0: none.
- P1: none.
- P2: physical screen-reader and physical alternate-DPI verification.
- P3: maximum-fixture peak working-set observation unavailable.

Closed debt: fan restoration after tab round trip, live internal focus request, external revival after internal clear, and query-update focus theft.

## Commits

- Commit A: `940e70a871544e7d65b6555a819f1da22164e4d3` — `harden task planning focus lifecycle`.
- Commit B: this evidence-only commit — `record task 32 remediation evidence`; its SHA is reported by the final Git evidence after creation.

Task 32 Remediation 001: PASS. Task 32 remains accepted. Task 33 is not started. Schema remains 16, active spec remains null, and the exact next action is Product Owner gate.

## Historical correction

Remediation 001 correctly closed component-local fan and focus replay, but its application-lifetime external one-shot claim was incomplete. Remediation 002 supersedes that narrow claim with App-owned acknowledgment. The component-local duplicate guards remain valid as short-interval protection while App processes exact-ID settlement.
