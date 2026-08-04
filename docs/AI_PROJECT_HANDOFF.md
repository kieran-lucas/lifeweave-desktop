# Lifeweave AI Project Handoff

## Metadata

- generated_at: `2026-08-04T17:18:37.4562257+07:00`
- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- Task 32 implementation checkpoint: `f64e51a8d61f30e79abb5469b58fcd06413ae780`
- current handoff-containing HEAD: resolve at read time with `git rev-parse HEAD`
- tracked working tree status at generation: Commit A was clean and matched `origin/main`; only closure/evidence files committed with this handoff were then changed

## Immutable source

- path: `docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`
- SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- bytes: 165,171
- lines: 4,637
- headings: 402

## Product compass

- macro milestone: Post-Core Expansion, Product Owner gate
- latest closed task: Task 32 — Upcoming and Overdue Task Planning
- latest feature task/checkpoint: Task 32 / `f64e51a8d61f30e79abb5469b58fcd06413ae780`
- database schema: 16
- active spec: none
- next allowed action: Product Owner gate
- forbidden jump: any Task 33 feature implementation

## Verified implementation

- Today remains the application and Task-workspace default. Upcoming and Overdue are manual-activation tabs within Today, not sidebar destinations or persisted startup state.
- Upcoming projects anchor +1 through +14 local days. Overdue projects anchor -30 through -1 and excludes every item with a current evaluation, including `Not done`.
- Recurring planning retains series plus original-date identity, applies cancellation/replacement/content overrides, includes authoritative moved-in overrides, omits archived series, and inherits series Life ownership.
- The Rust projection uses fixed backend-derived ranges, bulk categories/Life/tasks/series/overrides/evaluations, no SQL in projection loops, deterministic ordering, and a 5,000-item hard failure without truncation.
- Planning rows navigate to the existing exact-day Today workflow and focus the stable Task or series identity. Existing editing and radial evaluation remain the only mutation surfaces.
- The local-date anchor refreshes planning queries. Selected Today advances at midnight only when it still equals the previous anchor; intentional Calendar/Search dates remain selected.
- Task mutations invalidate the `task-planning` query prefix. Refresh failures cannot change the authoritative success of a completed mutation.
- Task 31 Portable Package and Remediation 001 remain unchanged and accepted.

## Test and release evidence

- Focused Rust: planning 4 passed / 1 ignored evidence; recurrence 7; Calendar 6; evaluation 8.
- Focused frontend: TaskPlanning 5; TaskWorkspaceTabs 3; TodayScreen 15; App filter 18 across 2 files; rollover 4.
- `pnpm source:verify`, `pnpm governance:check`, `pnpm index:check`, `pnpm verify`, and strict security verification passed.
- `pnpm typecheck` and `pnpm build` passed; 826 modules; main JS 517,960 bytes; total JS 1,116,662 bytes; planning lazy chunk 3.34 kB.
- `pnpm test`: 33 files, 479 passed, 0 failed.
- Cargo check, fmt check, and Clippy `-D warnings` passed.
- `cargo test --locked`: 449 passed, 0 failed, 4 ignored evidence tests.
- `pnpm hardening:performance`: passed.
- `pnpm hardening:planning-performance`: Upcoming p95 17.32 ms / 2,662 items; Overdue p95 22.55 ms / 3,250 items.
- Narrative/Portable performance reruns skipped: Task 32 changes neither algorithm nor archive/image path.
- `pnpm e2e:windows`: seven isolated phases passed on WebView2/EdgeDriver 150.0.4078.105, including planning review and fresh-process persistence.
- `pnpm tauri build`: passed; release executable 13,105,152 bytes; NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,810,273 bytes, SHA-256 `1f26da95c02d96072abcd39a9478f0987b46c7d20d874aecce6a20e899086d6f`.
- `pnpm hardening:rc`: passed run `core-rc-a06c238e4641403cb3fed082b5d8e9fa`; two 25-second isolated reopen sessions; document 25, backup 142, Narrative 60, Portable 11, Task 59 tests.
- CI status: not run; the existing workflow is manual-dispatch only and no accepted Task 32 trigger was required.
- External manual debt: physical screen-reader and physical alternate-DPI validation are unclaimed.

## Decisions

- locked: Today/Upcoming/Overdue are internal manual tabs; Today is default; Upcoming is +1…+14; Overdue is -30…-1 and means no current evaluation; queue state is derived; exact queue identity navigates to Today.
- locked carry-forward: Windows/local-first, Task rows not cards, SQLite/Rust authority, safe backup/restore, Task/Life navigation ownership, Narrative schema/templates/worlds, and single-document Portable Package v1.
- open: actual-time semantics; deadline semantics beyond scheduled date/time; saved filter AST/view UI; Tags; Backlinks; Generic Outline beyond Basic Leaf headings; Noteboard; Graph; score; prediction; whole-tree/multi-document interchange.
- recommended but not activated: Unified Tags is a portfolio candidate only; Project State deliberately records no active recommendation.

## Risks/debt

- P0: none known.
- P1: none known.
- P2: physical screen-reader and physical alternate-DPI verification remain external manual debt.
- P3: maximum-fixture peak working-set observation was unavailable; hard limits and performance budgets passed.

## Recent commits

- `f64e51a8d61f30e79abb5469b58fcd06413ae780` — add upcoming and overdue task planning
- `2a2d5b18290a82b9099635192b1216c766920b37` — record task 31 remediation evidence
- `8d4ff9703635e3f671a571d05783a40d327dc295` — harden portable package edge cases
- `962aebb850387bef6f027db8f2e91f4e4b6a35da` — close task 31 portable package evidence
- `a20aac0bf701fa5d7be473e12316ba97637f2958` — add lossless portable document packages
- `a43e867abaa4915cd4fc062e5a4f4b1ee935575f` — refresh project continuity handoff
- `76963fe6300782c56acd849e49f54089dee3818e` — close current state verification gaps
- `7240b7f371ada526ea5a31c0481612574d875fe0` — link tasks to life areas
- `b79a0898ae50962b378174f58fadf3dbffeaae04` — close narrative visual worlds
- `6290f0416d5ee8207d400604839e63ed41f0e936` — complete narrative visual worlds

## Exact next action

Product Owner gate. Task 33 is unselected and this handoff grants no implementation authorization.

## Files next AI must read

1. `AI_CONSTITUTION.md`
2. `docs/source-of-truth/SOURCE_INTEGRITY.md`
3. `docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`
4. `docs/PROJECT_STATE.json`
5. `docs/DECISION_REGISTRY.md`
6. `docs/STATUS.md`
7. `docs/ROADMAP.md`
8. `docs/ARCHITECTURE.md`
9. `docs/DATA_SAFETY_AND_RECOVERY.md`
10. `docs/SECURITY_PRIVACY_LOGGING.md`
11. `specs/022-upcoming-overdue-planning/README.md`
12. `specs/022-upcoming-overdue-planning/spec.md`
13. `specs/022-upcoming-overdue-planning/acceptance.md`
14. `docs/adr/0026-upcoming-overdue-planning.md`
15. `docs/audits/task-32-upcoming-overdue-planning.md`
16. `docs/audits/task-32-release-candidate.json`

## Integrity statement

This handoff reflects Task 32 implementation Commit A `f64e51a8d61f30e79abb5469b58fcd06413ae780`. The implementation and closure are pushed directly to `main` without force push, amend, rebase, reset, restore, stash, broad cleanup, or history rewrite. Author and committer are `Kieran Lucas <kieranlucas.work@gmail.com>`. The final tracked tree must be clean and match `origin/main`; generated binaries, profiles, logs, databases, backups, screenshots, and installers are not tracked.
