# Task 45 Specification — Global Keyboard Shortcuts and Shortcut Help Core

Status: ACTIVE from activation baseline `b8ad47d9079246cecf4c30c728bec1d3a4915b41`.

This file records the Product Owner's activated Task 45 contract. Everything not required here is
out of scope. Canonical decision: `docs/adr/0039-global-keyboard-shortcuts.md`.

## 1. Canonical model

> Lifeweave v1 has **eight global keyboard commands, defined once in a single frontend registry that
> owns both dispatch and every displayed chord**. A global chord never takes precedence over an
> editable surface or an open modal, and no shortcut is customizable or persisted.

## 2. The locked v1 map

```text
Ctrl+1   Today
Ctrl+2   Calendar
Ctrl+3   Analytics
Ctrl+4   Plans
Ctrl+5   Life System
Ctrl+6   Settings
Ctrl+K   Search
Ctrl+/   Keyboard shortcuts
```

Exactly eight commands. Ids are unique, chords are unique, and `Ctrl+1..6` follow the sidebar's
existing locked destination order.

**Windows `Control` is the authority.** A chord matches only when `ctrlKey` is true and `altKey`,
`shiftKey`, and `metaKey` are all false. There is no `Meta`/`Cmd` mapping and no macOS map; the
existing handler's `metaKey` branch is removed rather than carried forward.

## 3. Schema and boundaries

**Schema stays 26. There is no migration and no schema change of any kind.** Migrations 1–26 are
untouched. This slice adds no Rust code, no IPC command, no DTO, no generated binding, no Tauri
capability, and no dependency or lockfile change.

No shortcut state is persisted anywhere: not in SQLite, not in `localStorage`, not in a preference
row, not in backup, and not in any package. The registry is a frozen module constant.

## 4. One shortcut authority

Exactly one canonical registry exists. Per command it carries:

```text
id                  stable command identifier
label               action label shown to the user
key / modifiers     matching metadata for KeyboardEvent
chord               display metadata ("Ctrl+1")
ariaKeyShortcuts    aria-keyshortcuts metadata ("Control+1")
```

Key dispatch, the sidebar's advertised chords, and the shortcut-help dialog all derive from that one
structure. A hard-coded chord or label outside the registry — in the handler, the dialog, or a test
fixture — is a defect. Tests assert the map by reading the registry and by asserting the rendered
help against it, never by restating chords in a second literal table.

The registry also owns the `Destination` identity used by `Ctrl+1..6`, so the sidebar's destination
list and the shortcut list cannot disagree about which destinations exist or what they are called.

## 5. Dispatch invariant

A global shortcut executes only when **all** of the following hold:

```text
not event.defaultPrevented
AND not event.isComposing
AND not event.repeat
AND no open application modal
AND the event target is not an editable surface
AND the chord matches a registry entry exactly
```

**Editable authority** is at least `input`, `textarea`, `select`, `contenteditable`,
`role="textbox"`, and the existing Tiptap/ProseMirror editor root, resolved from the event target
upward so a control nested inside an editable surface is also protected.

**Modal authority** is the `role="dialog"` + `aria-modal="true"` pairing already used by every modal
in the product. No modal manager is introduced.

When suppressed, the global layer performs **no app action, no navigation, no Search, no help, and
no `preventDefault()`**. Consuming a key while declining to act on it is the defect this clause
exists to prevent, and it is why `Ctrl+K` must remain available to the editor.

When accepted, the global layer calls `preventDefault()` **exactly once** and executes **exactly
one** command. An unmatched chord does nothing at all.

## 6. Command transitions

**Destinations.** `Ctrl+1..6` call the same `selectDestination` transition the sidebar buttons call,
including its clearing of incompatible pending navigation and its existing heading-focus behaviour.
There is no second navigation implementation.

**Search.** `Ctrl+K` sets the same Search state the sidebar Search control sets and opens the
existing `GlobalSearchDialog`, with its existing invoker-based focus restoration unchanged. The
ad-hoc listener is removed only once the registry path fully owns the chord.

**Help.** `Ctrl+/` opens one read-only **Keyboard shortcuts** dialog generated from the registry, and
one **Keyboard shortcuts** trigger inside existing Settings opens the same dialog. The dialog lists
all eight actions and chords.

Prohibited: a command palette, command search, executable help rows, shortcut editing, persistence,
any backend command, and any new sidebar destination.

## 7. Help-dialog invariant

The dialog follows the product's established accessible dialog pattern:

```text
open
→ deterministic initial focus
→ modal owns keyboard (role=dialog, aria-modal=true, cycling Tab)
→ Escape or Close dismisses
→ restore focus to the opener when it is still in the document
```

Shortcut-open restores the element that was focused when the chord fired; Settings-open restores the
Settings trigger. While the dialog is open it is itself an open modal, so global chords are
suppressed by the same clause in §5 that protects every other modal.

`aria-keyshortcuts` is derived from the registry and applied where it is useful — the six sidebar
destination controls and the Search control.

## 8. Performance

Task 45 fits inside the existing Task 44 budget and does not create a new budget generation:

```text
index.js raw            520,983 / 530,862
total JS raw          1,214,694 / 1,221,217
deterministic gzip      373,745 /   377,185
expected chunk count           22 / 22
```

All maxima and the expected chunk count stay unchanged, no dependency is added, and no new chunk of
10 KiB or more appears. The registry and the dialog are eager, so no lazy boundary is created. If the
feature cannot fit, the slice stops rather than widening the budget.

## 9. Hard exclusions

No migration or schema change; no Rust, IPC, DTO, generated binding, or Tauri capability change; no
dependency or lockfile change; no workflow or seal change; no shortcut persistence, customization,
remapping UI, import, export, or backup participation; no command palette, command search, or
executable help row; no chord sequence, multi-step chord, or `Alt`/`Shift` chord; no macOS or
`Meta` mapping; no global OS-level hotkey; no editor keymap change; no new sidebar destination or
route; no change to Task, Life, Plan, Search, Graph, backup, or interchange semantics; no production
test hook and no weakened assertion; and no Task 46 work.
