# ADR 0049 — Granular session navigation snapshots

## Status

Accepted by explicit Product Owner direction on 2026-08-16.

## Context

ADR 0045 Override 5 introduced versioned WebView session history for top-level destinations,
Settings Analytics, and Today's viewed date. Focus Plans still kept portfolio and opened-detail
state only inside the mounted React component. Consequently, `Tasks -> Plans overview -> Plan 1`
created no history boundary between the overview and Plan 1; Back could skip the overview and
return directly to Tasks. Life had the same split-authority defect at a deeper level: Browse,
Reader and Tree transitions used a component-local stack while WebView history knew only `Life`.

The Product Owner defined a meaningful state at screen granularity: revisiting the same destination
does not make two screens equivalent when the visible portfolio or opened entity differs.

## Decision

1. A WebView history entry is a validated, versioned screen snapshot rather than only a top-level
   destination. The snapshot remains window-session-only and contains navigation identity, never
   authored content, form values, search text, or database state.
2. The Focus Plans snapshot contains the selected portfolio and zero or one opened Plan ID.
   `Plans/Active`, `Plans/Paused`, and `Plans/Active/Plan 1` are therefore distinct effective
   snapshots.
3. The Life snapshot contains `Browse | Tree | Reader`, the selected branch/node context, zero or
   one Reader ID, and the bounded child page. Outline disclosure, canvas pan, Tree selection and
   editor state remain transient. A sibling Reader retains its containing branch context so
   `Branch -> Leaf 1 -> Leaf 2` restores Leaf 1 and then Branch.
4. Opening a Plan, activating a different portfolio, opening a Life node/Reader, toggling Tree, or
   changing a Life child page pushes exactly one entry. Restoring an entry
   through `popstate` changes React state without pushing a replacement entry.
5. Search, Analytics, Task and relationship links commit their destination and exact Plan/Life
   identity atomically in the same history entry. A transient pending-navigation envelope is not
   the authority for Plan or Life restoration.
6. History schema version 2 stores both surface snapshots. Valid version 1 entries use safe default
   overview states. Early version 2 entries without Life state hydrate to remembered Life context;
   malformed and future entries remain ignored.
7. Asynchronous Plan and linked-Reader loading is restoration-safe: a response from a screen that
   has been superseded or unmounted cannot overwrite or repush the current snapshot.
8. Editors, dialogs, unsaved form content, selection, focus, outline visibility and canvas position remain transient.
   They are not copied into browser history, avoiding sensitive-data duplication and false recovery
   guarantees.

## Consequences

- `Plans overview -> Plan detail -> Back` restores the exact overview instead of skipping to the
  prior top-level destination.
- `Plan detail -> Life -> Back` restores the Plan detail, including its originating portfolio.
- `Life Branch -> Leaf 1 -> Leaf 2 -> Back -> Back` restores Leaf 1 and then the branch through the
  same WebView stack used by mouse Back/Forward.
- Back and Forward remain native WebView operations and retain directional motion through the
  existing monotonic history index.
- No schema, migration, Rust, IPC, dependency, network service, or persistent preference is added.
