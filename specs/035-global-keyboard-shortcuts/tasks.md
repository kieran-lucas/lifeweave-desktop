# Task 45 Work Breakdown

Unchecked entries are unfinished work and this file is the resumable execution ledger.

## A. Activation

- [x] T45-A01 confirm clean main, baseline `b8ad47d`, remote parity, and workflow-seal identity;
- [x] T45-A02 read authority and localize the ad-hoc `Ctrl+K` listener, `selectDestination`, the
      Search state, and the established dialog pattern;
- [x] T45-A03 trace every `shortcut`/`keyboard` mention across the immutable source, the Decision
      Registry, `ACCESSIBILITY_AND_INPUT.md`, and `CLAUDE.md`, and confirm no stop condition;
- [x] T45-A04 create Slice 035 and ADR 0039;
- [x] T45-A05 measure the clean production bundle inventory before any product change;
- [x] T45-A06 activate Project State with schema unchanged at 26 and synchronize governance surfaces;
- [x] T45-A07 pass activation governance and commit activation with no product code.

`database_schema_version` stays 26 throughout: this slice adds no migration and no Rust change.

## B. Registry

- [x] T45-B01 add `frontend/src/app/keyboardShortcuts.ts` owning the `Destination` identity and the
      eight command definitions;
- [x] T45-B02 carry id, label, matching metadata, chord, and `aria-keyshortcuts` on every command;
- [x] T45-B03 derive the sidebar destination list from the registry so the two cannot disagree;
- [x] T45-B04 add the editable-surface predicate covering `input`, `textarea`, `select`,
      `contenteditable`, `role="textbox"`, and the ProseMirror editor root, resolved upward;
- [x] T45-B05 add the open-modal predicate reading the existing `role=dialog` + `aria-modal` pairing;
- [x] T45-B06 add the exact chord matcher requiring `ctrlKey` and rejecting `alt`, `shift`, `meta`;
- [x] T45-B07 compose the single dispatch predicate over `defaultPrevented`, `isComposing`,
      `repeat`, modal, editable, and chord.

## C. Registry proof

- [x] T45-C01 prove exactly eight commands with unique ids, chords, and labels;
- [x] T45-C02 prove the exact locked mapping against a table read from the registry;
- [x] T45-C03 prove an accepted chord resolves to exactly one command;
- [x] T45-C04 prove `defaultPrevented`, `isComposing`, and `repeat` each suppress;
- [x] T45-C05 prove every editable surface kind suppresses, including `Ctrl+K` in the editor root;
- [x] T45-C06 prove an open modal suppresses;
- [x] T45-C07 prove an unknown chord and every wrong-modifier variant resolve to nothing.

## D. Help dialog

- [x] T45-D01 add `ShortcutHelpDialog.tsx` rendering rows by mapping over the registry only;
- [x] T45-D02 apply the established dialog pattern: `role=dialog`, `aria-modal`, deterministic
      initial focus, Tab cycling, Escape and Close dismissal;
- [x] T45-D03 keep styles in the existing `App.css.ts` so no new style file or chunk appears.

## E. Application integration

- [x] T45-E01 replace the ad-hoc `Ctrl+K` listener with one registry-driven handler;
- [x] T45-E02 call `preventDefault()` exactly once and execute exactly one command on acceptance;
- [x] T45-E03 route `Ctrl+1..6` through the existing `selectDestination`;
- [x] T45-E04 route `Ctrl+K` through the existing Search state with unchanged focus restoration;
- [x] T45-E05 render the sidebar destination buttons from the registry-derived list;
- [x] T45-E06 apply `aria-keyshortcuts` from the registry to the destination and Search controls;
- [x] T45-E07 add the Settings **Keyboard shortcuts** trigger opening the same dialog;
- [x] T45-E08 track the opener so shortcut-open restores the previously focused element and
      Settings-open restores the trigger, in both cases only when still in the document.

## F. Application proof

- [x] T45-F01 prove `Ctrl+1..6` reach the same destinations as sidebar activation;
- [x] T45-F02 prove a destination chord clears incompatible pending navigation;
- [x] T45-F03 prove `Ctrl+K` opens the existing Search dialog;
- [x] T45-F04 prove `Ctrl+/` opens help and Escape closes it;
- [x] T45-F05 prove an open modal blocks navigation, Search, and help;
- [x] T45-F06 prove the Settings trigger opens the same dialog;
- [x] T45-F07 prove the rendered help rows correspond exactly to the registry;
- [x] T45-F08 prove focus restoration from both open paths;
- [x] T45-F09 prove zero applicable axe violations on the help surface.

## G. Native Windows E2E

- [x] T45-G01 add `phase16-keyboard-shortcuts.e2e.ts` and register it in `run_windows_e2e.ps1`;
- [x] T45-G02 drive Today → `Ctrl+3` → `Ctrl+5` → `Ctrl+K` → close → `Ctrl+/` → verify the locked map
      → close and verify focus restoration → `Ctrl+6` → open the same help from Settings;
- [x] T45-G03 prove a global chord is ignored while a real editable surface has focus;
- [x] T45-G04 deliberately break one central registry mapping, prove phase 16 fails at the
      destination assertion, restore, and prove zero residue.

## H. Verification and closure

- [x] T45-H01 focused frontend tests, then `pnpm test`, `pnpm typecheck`, `pnpm build`;
- [x] T45-H02 `pnpm verify`, `source:verify`, `governance:check`, `index:check`;
- [x] T45-H03 `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`;
- [x] T45-H04 `pnpm hardening:performance` green against the **unchanged** Task 44 budget with the
      chunk count still 22 and no budget file regenerated;
- [x] T45-H05 `pnpm tauri build`, `pnpm e2e:windows` (phase 16 alone, then the full suite),
      `pnpm hardening:rc`;
- [x] T45-H06 answer the five review questions and write
      `docs/audits/task-45-global-keyboard-shortcuts.md`;
- [ ] T45-H07 close Project State and every governance surface, leaving Task 46 unstarted,
      unallocated, and unrecommended;
- [ ] T45-H08 leave `main` clean with `HEAD == origin/main`.
