# Task 45 Acceptance Mapping

Status: ACTIVE — executable evidence will be recorded in
`docs/audits/task-45-global-keyboard-shortcuts.md`.

## The map

- [ ] Exactly eight commands exist, with unique ids, unique chords, and unique labels.
- [ ] The mapping is exactly `Ctrl+1` Today, `Ctrl+2` Calendar, `Ctrl+3` Analytics, `Ctrl+4` Plans,
      `Ctrl+5` Life System, `Ctrl+6` Settings, `Ctrl+K` Search, `Ctrl+/` Keyboard shortcuts.
- [ ] `Control` is the only modifier; no `Meta`, `Alt`, or `Shift` chord matches.

## One authority

- [ ] One registry owns dispatch and every displayed chord and label.
- [ ] The sidebar destination list is derived from the registry, not restated beside it.
- [ ] No hard-coded chord exists in the handler, the dialog, or a test fixture.
- [ ] `aria-keyshortcuts` values are derived from the registry.

## Dispatch invariant

- [ ] An accepted chord executes exactly one command and calls `preventDefault()` exactly once.
- [ ] `event.defaultPrevented` suppresses the command.
- [ ] `event.isComposing` suppresses the command.
- [ ] `event.repeat` suppresses the command.
- [ ] An editable target suppresses the command, including a control nested inside one.
- [ ] `Ctrl+K` inside the rich-text editor root reaches the editor, not Search.
- [ ] An open modal suppresses the command.
- [ ] An unknown chord does nothing.
- [ ] Every suppressed case performs no app action and no `preventDefault()` from the global layer.

## Command transitions

- [ ] `Ctrl+1..6` reach the same destinations as sidebar activation.
- [ ] A destination chord clears incompatible pending navigation through the existing authority.
- [ ] There is no second navigation implementation.
- [ ] `Ctrl+K` opens the existing `GlobalSearchDialog` with unchanged Search state and focus
      restoration.
- [ ] The ad-hoc `Ctrl+K` listener no longer exists.

## Help

- [ ] `Ctrl+/` opens one read-only Keyboard shortcuts dialog.
- [ ] One Settings trigger opens the same dialog.
- [ ] The rendered rows correspond exactly to the registry — same count, same order, same text.
- [ ] The dialog is read-only: no editing, no execution, no persistence, no command search.
- [ ] While the dialog is open, global chords are suppressed.

## Focus and dismissal

- [ ] Initial focus is deterministic.
- [ ] Escape and the Close control both dismiss.
- [ ] Shortcut-open restores the element focused when the chord fired.
- [ ] Settings-open restores the Settings trigger.
- [ ] Restoration is skipped when the opener is no longer in the document.
- [ ] Applicable axe checks report zero violations.

## Persistence and boundaries

- [ ] No shortcut state is persisted in SQLite, `localStorage`, a preference row, backup, or a
      package.
- [ ] No customization, remapping UI, command palette, command search, or executable help row exists.
- [ ] Schema stays 26 with no migration and no Rust, IPC, DTO, binding, or capability change.
- [ ] No dependency or lockfile change; no workflow or seal change; no editor keymap change.
- [ ] Task, Life, Plan, Search, Graph, backup, and interchange semantics are unchanged.

## Performance

- [ ] `pnpm hardening:performance` is green against the unchanged Task 44 budget file.
- [ ] All maxima are unchanged and no budget file was regenerated.
- [ ] The expected chunk count remains 22 and no new chunk of 10 KiB or more appears.

## Native evidence

- [ ] Phase 16 drives the central scenario through real WebView2 key events.
- [ ] Phase 16 proves a global chord is ignored while a real editable surface has focus.
- [ ] Breaking one central registry mapping fails phase 16 at the destination assertion; restoring it
      leaves zero residue.

## Governance

- [ ] Focused and broad gates pass and every claim is backed by recorded evidence.
- [ ] Task 46 remains unstarted, unallocated, and unrecommended.
- [ ] `HEAD == origin/main` on `main` with a clean worktree.
