# Task 45 Execution Plan

Status: COMPLETE. All stages passed; see
`docs/audits/task-45-global-keyboard-shortcuts.md`.

## Stage 0 — Activation and baseline

Confirm clean `main` and remote parity at `b8ad47d9079246cecf4c30c728bec1d3a4915b41`, record the
Task 44 feature checkpoint, and read the authority surfaces in `AI_CONSTITUTION.md` §1 order. Trace
every `shortcut` and `keyboard` mention across the immutable source, the Decision Registry,
`ACCESSIBILITY_AND_INPUT.md`, and `CLAUDE.md`, and confirm the mapping is OPEN while the registry
substrate is locked. Localize the existing ad-hoc `Ctrl+K` listener, the sidebar `selectDestination`
transition, the Search state, and the established dialog pattern. Measure the clean production
bundle inventory before any product change. Create Slice 035 and ADR 0039, activate Project State
with schema unchanged at 26, synchronize governance surfaces, and pass activation governance with no
product code in the commit.

## Stage 1 — The registry

Add `frontend/src/app/keyboardShortcuts.ts` as the single canonical authority: the `Destination`
identity, the eight command definitions with id, label, matching metadata, chord, and
`aria-keyshortcuts`, and the derived destination list the sidebar renders. Freeze the structure. Add
the dispatch predicate — `defaultPrevented`, `isComposing`, `repeat`, open-modal, editable-target,
and exact chord matching — as a pure function over a `KeyboardEvent` so the whole suppression matrix
is provable without mounting the application.

## Stage 2 — Registry proof

Prove the map before anything consumes it: exactly eight commands, unique ids and chords, the exact
locked mapping, and unique labels. Prove the suppression matrix directly — accepted chord resolves,
`defaultPrevented`/`isComposing`/`repeat`/editable target/open modal each resolve to nothing, an
unknown chord resolves to nothing, and every wrong-modifier variant of a real chord resolves to
nothing. Include the `Ctrl+K`-inside-an-editor case explicitly, because it is the regression the
existing ad-hoc listener would have caused.

## Stage 3 — Help dialog

Add `frontend/src/app/ShortcutHelpDialog.tsx` rendering rows by mapping over the registry, with no
literal chord of its own. Apply the established dialog pattern already used by
`LifeBranchImportDialog`: `role="dialog"`, `aria-modal="true"`, focus the heading on open, cycle Tab
inside the dialog, Escape or Close to dismiss, and hand the opener back to the caller for
restoration. Keep the styles in the existing `App.css.ts` so no new style file or chunk appears.

## Stage 4 — Application integration

Replace the ad-hoc listener in `App.tsx` with one registry-driven `keydown` handler that calls
`preventDefault()` once and executes exactly one command. Destination commands call the existing
`selectDestination`; Search sets the existing `searchOpen` state. Render the sidebar destination
buttons from the registry-derived destination list and add `aria-keyshortcuts` from the registry.
Add the Settings **Keyboard shortcuts** trigger. Track the opener in a ref so shortcut-open restores
the previously focused element and Settings-open restores the trigger.

## Stage 5 — Application proof

Extend `App.test.tsx`: `Ctrl+1..6` reach the same destinations as sidebar activation; a destination
chord clears incompatible pending navigation through the existing authority; `Ctrl+K` opens the
existing Search; `Ctrl+/` opens help; an open modal blocks navigation, Search, and help; the Settings
trigger opens the same dialog; help rows correspond exactly to the registry; Escape closes; focus
restores deterministically from both open paths; and axe reports zero violations on the help
surface. Do not restate an invariant already proven at the registry layer.

## Stage 6 — Native Windows E2E

Add exactly `e2e-tests/specs/phase16-keyboard-shortcuts.e2e.ts` and register it in
`scripts/run_windows_e2e.ps1`. No restart companion: nothing is persisted, so there is no state for a
restart to preserve. Drive the central scenario end to end through real WebView2 key events, and
prove a global chord is ignored while a real editable surface has focus. Then deliberately break one
central registry mapping, prove phase 16 fails at the destination assertion, restore, and prove zero
residue.

## Stage 7 — Verification and closure

Run focused tests, then the full frontend, Rust, governance, build, and performance gates, plus the
native suite and the RC dogfood. Confirm the Task 44 budget maxima and the 22-chunk count are
unchanged and that no budget file was regenerated. Answer the five review questions, write
`docs/audits/task-45-global-keyboard-shortcuts.md`, close Project State and every governance surface,
and leave `main` clean at `origin/main` with Task 46 unstarted, unallocated, and unrecommended.
