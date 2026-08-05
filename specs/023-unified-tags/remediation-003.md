# Spec 023 — Unified Tags: Remediation 003

> Status: **verified** — implementation checkpoint `4d1b65c`; evidence commit follows.

## Purpose

This final narrow remediation closes only the remaining Task 33 test, native E2E, focus/retry, and release-evidence gaps. It does not redesign Unified Tags, change schema 19, add a dependency or capability, or activate Task 34.

## Frontend reliability contract

- `TagPicker` retains controlled selection and accent-insensitive filtering.
- A successful create records the canonical tag ID, calls `onChange` once, explicitly refreshes the active tags query, and focuses the checkbox only after both the controlled selection and refreshed list contain that ID. If the refreshed UI has no checkbox, focus returns to search.
- Tag load Retry explicitly invokes the active query's `refetch()`.
- Search Enter cannot submit an ancestor form. Escape prevents default and propagation, closes only the picker, and restores its toggle focus.
- `TagSettings` exposes five accessible named sections: Create tag, Active tags, Archived tags, Merged aliases, and Merge tags.
- Tag Settings load Retry explicitly refetches. Rename, archive, restore, and merge failures retain useful local context and refetch authoritative tags.
- Successful merge preserves the existing cross-projection invalidation contract, announces once, and focuses the canonical target row.

## Automated component evidence contract

- TagPicker covers Vietnamese accent normalization, load error/retry, empty-state exclusion during error, parent-form Enter safety, layered Escape, controlled post-create focus and fallback, query preservation on create error, StrictMode mutation safety, accessibility, the 12-tag limit, read-only behavior, checkboxes, and focus restoration.
- Today covers first-Escape picker closure with the Task dialog retained and second-Escape Task-dialog closure, while existing title-only preservation and recurrence-scope coverage remain green.
- TagSettings covers all five sections, load error/retry, archived-versus-merged actions, exact merge counts, retained failure/retry state, authoritative refetch after stale failures, successful focus/announcement, StrictMode mutation safety, and accessibility.
- Life covers Reader's twelve visible tags, available Pinned tags, suppression on unavailable Pinned cards, and Reader/Pinned accessibility without regressing Task 32 request/remount behavior.

## Native E2E contract

- `phase7-unified-tags.e2e.ts` performs tag creation, one-off and recurring Task creation/assignment, title-only edit, Life assignment, Browse/Reader/Pinned verification, Task/Life/document Search navigation, archive, restore, and restored-state verification through product UI.
- The phase may rely on the deterministic `Portable Source` leaf/document established by the earlier official phase sequence; it does not use IPC for any prohibited tag, Task, recurrence, assignment, archive, or restore action.
- `phase7-unified-tags-restart.e2e.ts` runs in a fresh Tauri process against the same isolated app-data directory and performs no reseeding or mutation.
- `scripts/run_windows_e2e.ps1` runs both phase7 specs after the phase6 restart spec and retains its existing failure artifacts.

## Invariants

- Database schema remains 19.
- Migration changes: 0.
- Dependency changes: 0.
- Capability changes: 0.
- Task 34 remains not started.
- Only physical screen-reader and alternate-DPI validation may remain external P2 debt.
- Final next action is Product Owner gate.
