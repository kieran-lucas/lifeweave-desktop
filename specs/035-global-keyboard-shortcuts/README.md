# Slice 035 — Global Keyboard Shortcuts and Shortcut Help Core

## Status

```text
Task 45: CLOSED
Slice 035: CLOSED
activation baseline: b8ad47d9079246cecf4c30c728bec1d3a4915b41
Task 44 feature checkpoint: 7e95644dcced19a1a8349706990d20d1df53a2e1
starting schema: 26
final schema: 26
closed spec package: specs/035-global-keyboard-shortcuts
product checkpoint: 3e48ca9292f655543a79724aae674c387bdb2f0a
Task 46: prohibited, unstarted, unallocated, and unrecommended
```

Every destination and Global Search already exist. Only a keyboard route to them is missing, and
`shortcut map` has sat under `OPEN — Product/UX` since the Decision Registry was created. ADR 0039 is
the Product Owner decision that closes it.

Task 45 adds exactly that route and nothing more:

> Lifeweave v1 has **eight global keyboard commands, defined once in a single frontend registry that
> owns both dispatch and every displayed chord**. A global chord never takes precedence over an
> editable surface or an open modal, and no shortcut is customizable or persisted.

```text
Ctrl+1  Today          Ctrl+5  Life System
Ctrl+2  Calendar       Ctrl+6  Settings
Ctrl+3  Analytics      Ctrl+K  Search
Ctrl+4  Plans          Ctrl+/  Keyboard shortcuts
```

There is no migration, no schema change, no Rust or IPC change, and no dependency. Every command
reuses the state transition its existing click path already uses, so a shortcut cannot diverge from
the button it mirrors. The help dialog is generated from the registry, so it cannot drift from
behaviour.

- [Specification](spec.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance](acceptance.md)
- [ADR 0039](../../docs/adr/0039-global-keyboard-shortcuts.md)
