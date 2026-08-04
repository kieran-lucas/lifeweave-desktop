# Task 32 Remediation 002 audit — Application Navigation Request Delivery Closure

## Findings and root cause

- App owned `pendingNav` but retained terminal requests. Today and Life received inline projections, so unrelated App renders changed object identity, while route remounts reset consumer refs and could replay the same request ID.
- Today's Remediation 001 guards were component-local. The external-arrival effect could react again to a reallocated object, focus behind an editor, or override a later workspace/date choice before delivery completed.
- Life prepared from persistent object identity and remote Reader delivery stopped after selecting the remote browse target because no terminal effect observed the resulting projection.

Remediation 001's fan and component-local focus corrections remain valid. Its application-lifetime external one-shot claim is superseded by this App-owned acknowledgment protocol.

## Changed files

- App product/test: `frontend/src/app/App.tsx`, `frontend/src/app/App.test.tsx`.
- Today product/test: `frontend/src/features/task/today/TodayScreen.tsx`, `frontend/src/features/task/today/TodayScreen.test.tsx`.
- Life product/test: `frontend/src/features/life/LifeScreen.tsx`, `frontend/src/features/life/LifeScreen.test.tsx`.
- Native coverage: `e2e-tests/specs/phase6-planning.e2e.ts`.
- Specification/evidence: Remediation 002 spec, Task 32 acceptance/status, Project State, Remediation 001 correction, this audit, and project handoff.

No Rust product code, migration/schema, dependency, generated DTO, IPC/capability/plugin, immutable source, Task planning semantics, recurrence/evaluation behavior, Life hierarchy semantics, persistent request state, routing framework/store/context, or Task 33 behavior changed.

## Transition and race evidence

- App holds at most one `{ requestId, target }` envelope and memoizes stable Today/Life projections. Every Search, Related Task, and Today-Life issue path creates a fresh UUID and replaces any older request.
- Consumer settlement is an ID-guarded functional update. `settle(A)` is idempotent and cannot clear pending B. Manual sidebar and Calendar actions clear the current envelope before navigation.
- A pending exact Today request blocks automatic midnight date advancement while the anchor ref still advances immediately. Settlement does not retroactively advance the intentional requested date.
- Today keys preparation by `focusRequest?.requestId`, retains independent internal/external constant-size refs, waits for Today, closed editor, successful data, and no fetch, then focuses the validated Task/series row or heading fallback once and acknowledges. Query errors stay retryable.
- Today workspace tabs and Week Strip dates acknowledge/cancel the exposed external request and clear internal focus before the user's action. Planning internal B terminally settles exposed external A; new external C cancels pending internal B. Editor-open delivery preserves the draft and waits until close.
- Life prepares history once per request ID. Browse settles only after a matching projection or backend fallback. Direct Reader settles immediately only for a reachable leaf; remote Reader waits for the target projection and then enters Reader. Non-leaf/fallback Reader remains safely in Browse and settles; query errors remain retryable.
- Life Browse/Edit/Pinned, node, breadcrumb, Back/Reader back, edit-to-Browse, and paging actions cancel before acting. Settled/cancelled A cannot later mutate mode/history when an old query completes, and a new B remains authoritative.
- Same object/same ID and reallocated object/same ID do not redeliver. Same target/new ID does. StrictMode effects do not duplicate focus, history, Reader transition, or settlement.
- App integration proves handled Today → Calendar → Today and handled Life → Settings → Life do not replay. Sidebar collapse/expand does not force a handled Today request back from Upcoming.

## Focused verification

- `pnpm --dir frontend test -- App`: 2 files, 21 passed.
- `pnpm --dir frontend test -- TodayScreen`: 1 file, 25 passed.
- `pnpm --dir frontend test -- LifeScreen`: 1 file, 19 passed.
- `pnpm --dir frontend test -- GlobalSearchDialog`: 1 file, 18 passed.
- `pnpm --dir frontend test -- RelatedTasksPanel`: 1 file, 5 passed.
- `pnpm --dir frontend test -- TaskPlanning`: 1 file, 5 passed.
- `pnpm --dir frontend test -- TaskWorkspaceTabs`: 1 file, 3 passed.
- `pnpm --dir frontend test -- AssessmentControl`: 1 file, 9 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked task::planning`: 4 passed, 1 designated release-evidence test ignored, 448 filtered out.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked task::recurrence`: 7 passed, 446 filtered out.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked life`: the substring filter selected 91 tests across Life plus matching lifecycle/migration/search/task names; 91 passed and 362 were filtered out. This is recorded as actual filter behavior, not as a Life-module-only count.

## Full verification

- Project State standard-library tests: 14 passed.
- Source/governance/index/security/hardening: `pnpm source:verify`, `pnpm governance:check`, `pnpm index:check`, and `pnpm verify` passed. The immutable source remained 165,171 bytes, 4,637 lines, SHA-256 `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`.
- `pnpm typecheck` and `pnpm build` passed; Vite transformed 826 modules.
- Two unbounded full-suite attempts each reached 497/498 but timed out in different unchanged tests that passed focused, demonstrating worker contention rather than one repeatable failure. The supported bounded equivalent `pnpm --dir frontend exec vitest run --maxWorkers=4` then passed all 33 files and 498 tests. The failed attempts are not claimed as passes.
- Cargo check, fmt check, and Clippy with `-D warnings` passed. `cargo test --locked` passed 449 with 4 designated evidence tests ignored.
- `pnpm hardening:performance` passed: main JS 519,815 bytes and total JS 1,118,517 bytes. Main JS increased 1,465 bytes from Remediation 001's 518,350-byte baseline, within the 2 KiB target.
- Planning, Narrative, and Portable algorithm-specific performance suites were skipped because no Rust projection, SQL, recurrence, archive/image, IPC, or package algorithm changed; no skipped suite is claimed as passed.

## Native E2E and release

- `pnpm e2e:windows` passed all seven isolated Windows specs on WebView2/EdgeDriver 150.0.4078.105. Strengthened Phase 6 proves exact recurring-row delivery, Upcoming surviving sidebar collapse/expand, Calendar/remount/manual Today return, and no stale fan/tab restoration. Unit/integration tests remain focus-count and remote Life Reader authority because native active-element and bounded remote-Reader fixture inspection were not relied upon.
- `pnpm tauri build` passed. NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` is 4,810,490 bytes with SHA-256 `675e0d7dbea9f237baee1e6d54683070775eb50743801888ad56cf823f7b1e69`.
- `pnpm hardening:rc` passed candidate `core-rc-8d2475d`, run `core-rc-95a4c33721e74aa2a0a19b74161ba11f`: two isolated 25-second reopen sessions, schema reopened twice, document 25, backup 142, Narrative 60/1 ignored, Portable 11/1 ignored, and Task 59/1 ignored; sentinel containment and process cleanup were validated.

## Remaining debt

- P0: none.
- P1: none.
- P2: physical screen-reader and physical alternate-DPI validation.
- P3: maximum-fixture peak working-set observation unavailable.

Closed debt: App Today/Life requests surviving acknowledgment, new object/same ID retrigger, route-remount replay, late A clearing B, manual action losing to a pending request, midnight overriding an exact Today date, remote Life Reader stopping in Browse, and duplicate Life history.

## Commits and authorized deviation

- Implementation A1: `712de9873422f80c34df0cd06a673783cf8a60e0` — `close application navigation request lifecycle`; product code, tests, and E2E.
- Implementation A2 / final implementation checkpoint: `8d2475daac724b1b9aa8a0f5120f43974f5c6fd6` — `close application navigation request lifecycle`; remediation specification.
- Evidence closure: this evidence-only commit — `record task 32 navigation remediation evidence`; final SHA is reported after creation.

The three-commit sequence deviates from the original two-commit protocol. The Product Owner explicitly authorized preserving A1 and A2 after both implementation commits had already been created locally, prohibited any rewrite/squash/amend/reset/rebase, designated A2 as the feature checkpoint, and authorized exactly one evidence-only closure commit. No history rewrite or force push occurred.

Task 32 Remediation 002: PASS. Task 32 remains accepted. Task 33 is not started. Schema remains 16, active spec remains null, and the exact next action is Product Owner gate.
