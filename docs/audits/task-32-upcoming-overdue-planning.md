# Task 32 audit — Upcoming and Overdue Task Planning

## Scope and checkpoints

- Starting HEAD: `2a2d5b18290a82b9099635192b1216c766920b37`.
- Implementation checkpoint: `f64e51a8d61f30e79abb5469b58fcd06413ae780`.
- Branch: `main`; implementation checkpoint was pushed and matched `origin/main` before closure.
- Schema remains 16. No migration, dependency, plugin, broad capability, sidebar destination, or persisted queue status was added.

## Verified behavior

- Today remains the startup and fresh-mount default; Upcoming and Overdue are manual-activation tabs inside the existing Task workspace.
- Upcoming is anchor +1 through +14 local days. Overdue is anchor -30 through -1 and contains only items without a current evaluation.
- Recurring projection keeps `series_id + original_local_date` identity, respects finite rules, cancellation, replacement, moved-in overrides, archived series, occurrence overrides, and inherited Life links.
- The backend derives fixed ranges from the frontend-supplied local anchor, uses six bounded bulk query stages with no SQL in projection loops, sorts deterministically, and fails above 5,000 items without truncation.
- Planning rows navigate to the existing exact-day Today workflow and focus the stable one-off Task or recurring series row. Mutations invalidate the shared `task-planning` prefix without turning refresh failure into mutation failure.
- Selected Today advances across midnight only when the user was viewing the prior anchor; deliberately selected Calendar/Search dates remain unchanged.

## Focused evidence

- Rust: planning 4 passed / 1 ignored evidence test; recurrence 7 passed; Calendar 6 passed; evaluation 8 passed.
- Frontend: TaskPlanning 5 passed; TaskWorkspaceTabs 3 passed; TodayScreen 15 passed; App filter 18 passed across 2 files; rollover 4 passed.
- Manual tab keyboard behavior, exact-item navigation, loading/error/empty states, visible `Needs review`, reduced-motion styling, responsive layout, and axe fixtures are covered by automated tests.

## Ordinary evidence

- `pnpm source:verify`, `pnpm governance:check`, `pnpm index:check`, and `pnpm verify`: passed, including strict security and no-remote checks.
- `pnpm typecheck`: passed.
- `pnpm test`: 33 files, 479 passed, 0 failed.
- `pnpm build`: passed; 826 modules; main JS 517,960 bytes; total JS 1,116,662 bytes; planning lazy chunk 3.34 kB.
- Cargo check, fmt check, and Clippy with `-D warnings`: passed.
- `cargo test --locked`: 449 passed, 0 failed, 4 ignored evidence tests.

## Performance and release evidence

- `pnpm hardening:performance`: passed.
- `pnpm hardening:planning-performance`: Upcoming p95 17.32 ms with 2,662 items; Overdue p95 22.55 ms with 3,250 items. Both are within the 100/150 ms budgets. Peak working-set observation was unavailable.
- Narrative and Portable performance were not rerun because Task 32 changes neither algorithm nor archive/image path.
- `pnpm e2e:windows`: seven isolated phases passed on WebView2/EdgeDriver 150.0.4078.105, including planning navigation, review, fresh-process persistence, and source visibility.
- `pnpm tauri build`: passed. NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe` is 4,810,273 bytes; SHA-256 `1f26da95c02d96072abcd39a9478f0987b46c7d20d874aecce6a20e899086d6f`.
- `pnpm hardening:rc`: passed run `core-rc-a06c238e4641403cb3fed082b5d8e9fa`; two isolated 25-second reopen sessions; document/portable-adjacent 25, backup/restore 142, Narrative 60, Portable 11, and Task 59 tests passed, with performance evidence tests intentionally ignored in ordinary mode.

## Integrity and remaining debt

- Source SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`.
- Scope searches found no migration 17, Task 33 implementation, Tags/Backlinks/Graph code, persistent planning mode, derived queue column, plugin addition, or inline React style literal.
- Generated binaries, profiles, databases, logs, screenshots, and installers remain untracked.
- P0/P1: none known. P2: physical screen-reader and physical alternate-DPI validation remain external manual debt. P3: maximum-fixture peak working-set observation was unavailable.
- Task 33 is not selected. Exact next action is Product Owner gate.
