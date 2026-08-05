# Task 33 Remediation 003 — Unified Tags: Full Product UI Verification Contract

## Scope

Starting HEAD: `f08eb34885776e1df6b66ab60779bbebe57d558d` (Task 33 Remediation 002).
Implementation checkpoint: `4d1b65c816312a9e6ae8aa39f4a565555af9feb9`.
Prior evidence HEAD: `72f34d9ac4e56c59efc6ad0a4bbe03ae2c48f156`.
Schema remains 19. No migration, dependency, or capability changes.
Three commits: Commit A (implementation), Commit B (initial evidence), Commit C (full evidence correction).

## Verified behavior

### Frontend reliability — TagPicker

- Controlled selection (external `selectedIds` + `onChange`) is the only selection authority; no internal state fork.
- Accent-insensitive `normalizeSearch` (NFD + diacritic strip + đ/Đ normalization + lowercase) applied on both query and tag name in filter.
- Successful create: records canonical ID returned by backend, calls `onChange` once, explicitly refetches active-tags query, then focuses the new checkbox — only after both controlled selection and the refreshed list contain the ID. If the checkbox is absent after refresh, focus returns to the search input.
- Tag-load Retry explicitly calls `refetch()` on the active-tags query.
- Search Enter prevents default to guard against ancestor-form submission.
- Escape: preventDefault + stopPropagation on the picker, closes only the picker, returns focus to the toggle — without closing the parent dialog.
- Controlled `onChange` called exactly once per create (StrictMode double-invoke safe).

### Frontend reliability — TagSettings

- Five named sections with accessible `aria-label`: Create tag, Active tags, Archived tags, Merged aliases, Merge tags.
- Load-error Retry explicitly calls `tagsQuery.refetch()`.
- Rename, archive, restore, and merge failures each trigger a `tagsQuery.refetch()` to flush stale state.
- Successful merge: announces once via `aria-live="polite"`, focuses the canonical target row, clears confirmation state.
- Merge confirmation panel remains open on failure with inline error; stale revisions from prior error are re-fetched before retry.

### Frontend reliability — TodayScreen Escape integration

- First Escape while the TagPicker is open: closes the picker only, retains the Task dialog.
- Second Escape: closes the Task dialog.

### Frontend reliability — LifeScreen stale-data reader fix

- `LifeScreen` prepare effect now defers `settleEntryRequest` when `browse.isFetching` is true (stale-while-revalidate). This allows the second settle effect to overwrite the reader with the fresh post-refetch data containing restored tag chips once the background fetch completes.
- Without this fix, a tag archive-then-restore cycle followed by search-→-reader navigation would display the pre-restore reader (empty tags) because the prepare effect settled with stale cache data before fresh data arrived.

### E2E — phase6-planning compatibility

- `e2e-tests/specs/phase6-planning.e2e.ts`: `tag_ids: []` added to all 3 `create_task` and all 3 `create_recurring_task` inputs; `series_tag_ids: null` added to both `update_recurring_occurrence` inputs (scope `only_this_occurrence`).
- No titles, dates, times, recurrence scopes, cancellation/movement behavior, assertions, or selectors changed.

### E2E — phase7-unified-tags (product UI lifecycle)

- `e2e-tests/specs/phase7-unified-tags.e2e.ts`: full product UI lifecycle with no IPC for tag, assignment, archive, or restore operations.
  1. Create "Research" tag via Settings UI.
  2. Create one-off task "E2E Tagged Task" with Research via Create task UI; verify `#Research` chip in Today.
  3. Title-only edit renames task; chip preserved (P1 regression).
  4. Create recurring task with Research via Create task UI; verify chip.
  5. Assign Research to "Portable Source" life node via Life Edit inspector.
  6. Verify `#Research` chip in Browse focal panel, Reader, and Pinned.
  7. Global Search: verify tasks, life, and document results contain Research.
  8. Archive Research via Settings UI; verify chips gone from Today, Pinned; search returns no results.
  9. Restore Research via Settings UI; verify chips restored on Today tasks; Reader shows `#Research`; Pinned shows chip; search results return.
  10. Verify no `role="alert"` errors present.

### E2E — phase7-unified-tags-restart (fresh-process persistence)

- `e2e-tests/specs/phase7-unified-tags-restart.e2e.ts`: fresh Tauri process against same isolated app-data directory; no reseeding or mutation. Verifies tasks, recurring, Life Browse, Reader, Pinned, document search, and tag state survived the restart.

### Windows E2E runner

- `scripts/run_windows_e2e.ps1`: runs phase7-unified-tags and phase7-unified-tags-restart after the phase6-planning-restart spec. Failure artifacts retained on error.

## Test evidence

- `python -m unittest scripts.tests.test_check_project_state`: 14 passed, 0 failed.
- `pnpm source:verify`: passed (165,171 bytes, 4,637 lines, SHA-256 `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`).
- `pnpm governance:check`: passed.
- `pnpm index:check`: passed (402 headings, full coverage matrix current).
- `pnpm verify`: passed (source, governance, index, no remote assets, security, hardening).
- `pnpm typecheck`: passed.
- `pnpm --dir frontend exec vitest run --maxWorkers=4`: 36 files, 561 passed, 0 failed.
- `pnpm build`: main JS `index-VO7KV59P.js` 526,418 bytes; total JS 1,134,505 bytes (+8,458 / +17,843 vs Task 32).
- `pnpm hardening:performance`: passed.
- `cargo check --locked --all-targets`: passed.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `cargo test --locked`: 505 passed, 0 failed, 4 ignored.
- `pnpm tauri build`: NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,866,691 bytes, SHA-256 `8edbd85fb8b4fd4d625a26586072b87374c90adc6b9146746ee44a7c2796c7a8`; release binary 13,294,592 bytes.
- `pnpm hardening:rc`: RC candidate `core-rc-72f34d9`, run ID `core-rc-ccf5b351940543f3bad229abf3775b97`, passed (2 sessions, 25-second liveness each).
- Windows E2E (`pnpm e2e:windows`): 9 specs all passed — phase1-lifecycle, phase2-backup-restore, phase3-restart, phase4-portable-roundtrip, phase4-portable-restart, phase6-planning, phase6-planning-restart, phase7-unified-tags, phase7-unified-tags-restart.

## Ancillary corrections

- `scripts/verify_security.py`: regex negative lookbehind `(?<![.\w])fetch\(` replaces substring `fetch(` check, excluding method calls like `.refetch()`. False positive introduced by Remediation 003's use of `tagsQuery.refetch()` in TagPicker/TagSettings.
- `src-tauri/src/ipc/tag.rs`: rustfmt brace-style correction — single-field struct literal `IpcError::Validation { message: msg }` on one line. Cosmetic formatting only; no behavior change.
