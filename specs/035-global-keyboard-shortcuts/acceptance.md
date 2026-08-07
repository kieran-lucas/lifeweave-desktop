# Task 45 Acceptance Mapping

Status: CLOSED — executable evidence is recorded in
`docs/audits/task-45-global-keyboard-shortcuts.md`.

## The map

- [x] Exactly eight commands exist, with unique ids, unique chords, and unique labels.
- [x] The mapping is exactly `Ctrl+1` Today, `Ctrl+2` Calendar, `Ctrl+3` Analytics, `Ctrl+4` Plans,
      `Ctrl+5` Life System, `Ctrl+6` Settings, `Ctrl+K` Search, `Ctrl+/` Keyboard shortcuts.
- [x] `Control` is the only modifier; no `Meta`, `Alt`, or `Shift` chord matches.

## One authority

- [x] One registry owns dispatch and every displayed chord and label.
- [x] The sidebar destination list is derived from the registry, not restated beside it.
- [x] No hard-coded chord exists in the handler, the dialog, or a test fixture.
- [x] `aria-keyshortcuts` values are derived from the registry.

## Dispatch invariant

- [x] An accepted chord executes exactly one command and calls `preventDefault()` exactly once.
- [x] `event.defaultPrevented` suppresses the command.
- [x] `event.isComposing` suppresses the command.
- [x] `event.repeat` suppresses the command.
- [x] An editable target suppresses the command, including a control nested inside one.
- [x] `Ctrl+K` inside the rich-text editor root reaches the editor, not Search.
- [x] An open modal suppresses the command.
- [x] An unknown chord does nothing.
- [x] Every suppressed case performs no app action and no `preventDefault()` from the global layer.

## Command transitions

- [x] `Ctrl+1..6` reach the same destinations as sidebar activation.
- [x] A destination chord clears incompatible pending navigation through the existing authority.
- [x] There is no second navigation implementation.
- [x] `Ctrl+K` opens the existing `GlobalSearchDialog` with unchanged Search state and focus
      restoration.
- [x] The ad-hoc `Ctrl+K` listener no longer exists.

## Help

- [x] `Ctrl+/` opens one read-only Keyboard shortcuts dialog.
- [x] One Settings trigger opens the same dialog.
- [x] The rendered rows correspond exactly to the registry — same count, same order, same text.
- [x] The dialog is read-only: no editing, no execution, no persistence, no command search.
- [x] While the dialog is open, global chords are suppressed.

## Focus and dismissal

- [x] Initial focus is deterministic.
- [x] Escape and the Close control both dismiss.
- [x] Shortcut-open restores the element focused when the chord fired.
- [x] Settings-open restores the Settings trigger.
- [x] Restoration is skipped when the opener is no longer in the document.
- [x] Applicable axe checks report zero violations.

## Persistence and boundaries

- [x] No shortcut state is persisted in SQLite, `localStorage`, a preference row, backup, or a
      package.
- [x] No customization, remapping UI, command palette, command search, or executable help row exists.
- [x] Schema stays 26 with no migration and no Rust, IPC, DTO, binding, or capability change.
- [x] No dependency or lockfile change; no workflow or seal change; no editor keymap change.
- [x] Task, Life, Plan, Search, Graph, backup, and interchange semantics are unchanged.

## Performance

- [x] `pnpm hardening:performance` is green against the unchanged Task 44 budget file.
- [x] All maxima are unchanged and no budget file was regenerated.
- [x] The expected chunk count remains 22 and no new chunk of 10 KiB or more appears.

## Native evidence

- [x] Phase 16 drives the central scenario through real WebView2 key events.
- [x] Phase 16 proves a global chord is ignored while a real editable surface has focus.
- [x] Breaking one central registry mapping fails phase 16 at the destination assertion; restoring it
      leaves zero residue.

## Governance

- [x] Focused and broad gates pass and every claim is backed by recorded evidence.
- [x] Task 46 remains unstarted, unallocated, and unrecommended.
- [x] `HEAD == origin/main` on `main` with a clean worktree.
