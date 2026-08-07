# ADR 0039 — Global Keyboard Shortcuts and Shortcut Help

## Status

Accepted and activated for Task 45 / Slice 035 from explicit Product Owner activation baseline
`b8ad47d9079246cecf4c30c728bec1d3a4915b41`.

## Context

Every application destination and the Global Search dialog already exist and are already reachable.
What does not exist is a way to reach them from the keyboard without traversing the sidebar.

The repository state is unusually specific about this gap:

- `docs/DECISION_REGISTRY.md` lists **`shortcut map`** under `OPEN — Product/UX`, and has since the
  registry was created. The immutable source lists the same item twice — as open decision 19,
  "Keyboard shortcuts", and in the closing OPEN inventory as "shortcut mapping cụ thể".
- The same registry lists **`keyboard command registry`** and **`accessibility foundation`** under
  *đã khóa nền kỹ thuật* — locked technical ground. The substrate is decided; only the mapping is not.
- Source §22.3 specifies a typed frontend command registry shared by toolbar, menu, context menu,
  command palette, and shortcut, carrying `id`, `localizedLabel`, `iconKey`, `scope`,
  `defaultShortcut`, an availability selector, and `execute(context)`.
- `frontend/src/app/App.tsx` carries a single ad-hoc global listener that fires on
  `(ctrlKey || metaKey) && key === "k"` and calls `preventDefault()` unconditionally — before
  checking whether a text field, an editor, or a modal owns the keyboard.

`AI_CONSTITUTION.md` §10 requires that a materially OPEN decision is not implemented by assumption.
This ADR is that decision. It resolves the concrete mapping and nothing wider.

## Decision

> Lifeweave v1 has **eight global keyboard commands, defined once in a single frontend registry that
> owns both dispatch and every displayed chord**. A global chord never takes precedence over an
> editable surface or an open modal, and no shortcut is customizable or persisted.

### The locked v1 map

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

`Ctrl+1..6` follow the sidebar's existing locked destination order, so the map is learnable from a
surface the user already sees rather than memorised from documentation. `Ctrl+K` is the chord the
product already advertised on the Search control. `Ctrl+/` is the conventional "show me the
shortcuts" chord and is the only new idiom.

**Windows `Control` is the authority.** The product is Windows-first (`AI_CONSTITUTION.md` §2), and
there is no macOS build, so there is no `Meta`/`Cmd` mapping. A chord matches only when `ctrlKey` is
true and `altKey`, `shiftKey`, and `metaKey` are all false. The current handler's `metaKey` branch is
removed rather than carried forward: it mapped a platform the product does not ship.

### One registry, or none

There is exactly one canonical registry. It carries, per command, the id, the action label, the
matching metadata, and the display and `aria-keyshortcuts` metadata. Key dispatch, the sidebar's
advertised chords, and the shortcut-help dialog all read that one structure.

No second mapping may exist in the handler, in the dialog, or in a test fixture. A hard-coded chord
string anywhere outside the registry is a defect, because it is exactly how a help dialog silently
starts lying about what the application does.

### Dispatch invariant

A global shortcut executes only when **all** of the following hold:

```text
not event.defaultPrevented
AND not event.isComposing
AND not event.repeat
AND no open application modal
AND the event target is not an editable surface
AND the chord matches a registry entry exactly
```

`isComposing` is load-bearing, not defensive: during IME composition the keystrokes belong to the
composition, and a global handler that consumes them corrupts text entry in a way the user cannot
see coming. `repeat` is excluded because a held key must not fire a navigation six times.

**Editable authority** is `input`, `textarea`, `select`, `contenteditable`, `role="textbox"`, and the
Tiptap/ProseMirror editor root. **Modal authority** is the `role="dialog"` + `aria-modal="true"`
pairing the product already uses on every modal it has; this decision does not introduce a modal
manager, and deliberately does not invent one, because a second source of modal truth would be
strictly worse than reading the semantics that are already required to be correct for screen readers.

When any guard suppresses the chord the global layer does nothing at all — **including no
`preventDefault()`**. Swallowing the key while declining to act on it is the failure mode that makes
`Ctrl+K` stop inserting a link in the editor, and it is the specific defect the existing ad-hoc
listener would have caused.

When a chord is accepted, the global layer calls `preventDefault()` exactly once and executes exactly
one command.

### Commands reuse existing product transitions

`Ctrl+1..6` call the same `selectDestination` transition the sidebar buttons call, including its
clearing of incompatible pending navigation. `Ctrl+K` sets the same Search state the Search control
sets. Neither is a second implementation, and a shortcut can therefore never diverge from the click
path it mirrors.

### Help is generated, never written

`Ctrl+/` and one trigger inside Settings open the same read-only **Keyboard shortcuts** dialog, whose
rows are produced by mapping over the registry. There is no hand-written list of chords to fall out
of date. The dialog follows the product's established dialog pattern: deterministic initial focus,
modal keyboard ownership, Escape or Close to dismiss, and focus restored to the opener when it is
still in the document — the previously focused element for the shortcut path, the Settings trigger
for the Settings path. While it is open it is itself an open modal, so global chords are suppressed.

### Why no dependency

Source §22.3 suggests `tinykeys` for shortcut parsing and listening. It is not adopted. `tinykeys`
exists to parse arbitrary chord grammars — sequences, multi-modifier combinations, per-scope
bindings — and this decision has eight fixed `Ctrl`+single-key chords with no grammar to parse. The
matching is one boolean expression over four modifier flags and `event.key`. `DEPENDENCY_POLICY`
requires rationale, bundle impact, alternatives, and removal cost for every addition, and none of
those favour importing a parser to avoid writing a comparison. The hard part of this slice is the
suppression matrix, which no library supplies.

`AI_CONSTITUTION.md` §3 states that technical substrate does not constitute product approval; the
same reading applies in reverse here, where a suggested library is substrate guidance rather than a
requirement.

### What this decision does not resolve

**User remapping stays OPEN.** No shortcut is editable, persisted, exported, backed up, or stored in
any form — not in SQLite, not in `localStorage`, not in a preference row. The registry is a frozen
module constant.

Also unresolved and unallocated: a command palette or command search (source §22.3 names one as a
future registry consumer; this slice does not build one), executable rows inside the help dialog,
editor-scoped or screen-scoped command sets, chord sequences, a global OS-level hotkey, macOS
mappings, and any backend involvement in shortcuts.

## Consequences

- Schema stays **26**. No migration, no schema change, no Rust change, no IPC command, no DTO, no
  Tauri capability change.
- Zero dependencies added, removed, or upgraded.
- One new module owns the registry and the dispatch predicate; one new dialog component renders it.
  Both are eager, so the emitted chunk count stays at 22 and Task 45 introduces no lazy boundary.
- The ad-hoc `Ctrl+K` listener in `App.tsx` is deleted. Search behaviour is otherwise untouched:
  the same dialog, the same state, the same invoker-based focus restoration.
- Task 44 performance budget maxima and expected chunk count are unchanged and are not regenerated.
  Task 45 has no budget file of its own.
- `shortcut map` moves from OPEN to DECIDED for the eight-command global case only; custom remapping
  is recorded as still OPEN in the same entry.
- Task 46 is neither allocated, started, nor recommended.

## Reversal conditions

Reopen only for a reproducible defect in the suppression matrix — most seriously, a global chord
reaching a text surface or a modal — for evidence that a chord in the locked map conflicts with a
Windows, WebView2, or assistive-technology binding in physical use, or for an explicit Product Owner
decision to add remapping, a command palette, or a different map. Such a decision does not
retroactively broaden Task 45.
