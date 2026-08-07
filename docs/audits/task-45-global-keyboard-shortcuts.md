# Task 45 — Global Keyboard Shortcuts and Shortcut Help Core

## Scope and baseline

Task 45 / Slice 035 adds **eight global keyboard commands, defined once in a single frontend registry
that owns both dispatch and every displayed chord**, under
[ADR 0039](../adr/0039-global-keyboard-shortcuts.md).

```text
activation baseline:        b8ad47d9079246cecf4c30c728bec1d3a4915b41
activation commit:          b320aeb
Task 44 feature checkpoint: 7e95644dcced19a1a8349706990d20d1df53a2e1
starting schema:            26
final schema:               26  (no migration, no schema change, no Rust change)
```

Every destination and Global Search already existed and were already reachable. Only a keyboard
route to them was missing. `shortcut map` had sat under `OPEN — Product/UX` in
`docs/DECISION_REGISTRY.md` since the registry was created, while the same registry listed the
keyboard command registry and accessibility foundation as locked technical ground.

## Authority trace

Read in `AI_CONSTITUTION.md` §1 order.

| Surface | Reading |
|---|---|
| Immutable source, open decision 19 "Keyboard shortcuts" and closing inventory "shortcut mapping cụ thể" | OPEN. A Product Owner decision is required first; ADR 0039 is that decision. |
| Immutable source §22.3, typed command registry shared by toolbar/menu/palette/shortcut | Locked substrate. Implemented as one typed registry. The command-palette consumer is **not** built. |
| Immutable source §22.3, "Dùng `tinykeys`" | Substrate guidance, not product approval (`AI_CONSTITUTION.md` §3). Not adopted; see below. |
| `DECISION_REGISTRY.md` **OPEN — Product/UX**: `shortcut map` | Narrowed to record the eight-command global case as DECIDED; remapping and the rest stay OPEN. |
| `docs/ACCESSIBILITY_AND_INPUT.md`: "keyboard parity for dialogs, calendar, time wheel, radial fan, tree edit, command palette" | Consistent. This slice adds keyboard parity; it does not add a command palette. |
| `AI_CONSTITUTION.md` §6: keyboard parity required, focus restoration deterministic | Directly satisfied by the dispatch and help-dialog invariants. |

No stop condition. No higher authority conflicts with the map.

## The locked map

```text
Ctrl+1  Today          Ctrl+5  Life System
Ctrl+2  Calendar       Ctrl+6  Settings
Ctrl+3  Analytics      Ctrl+K  Search
Ctrl+4  Plans          Ctrl+/  Keyboard shortcuts
```

`Ctrl+1..6` follow the sidebar's existing locked destination order. Windows `Control` is the
authority: a chord matches only when `ctrlKey` is true and `altKey`, `shiftKey`, and `metaKey` are
all false. The previous handler's `metaKey` branch was removed rather than carried forward, because
it mapped a platform the product does not ship.

## One authority

`frontend/src/app/keyboardShortcuts.ts` is the only place a chord exists. It owns the `Destination`
identity, the eight command definitions, and the dispatch predicate. `App.tsx` renders its sidebar
destination buttons from `destinationShortcuts`, takes the Search control's accessible name and
every `aria-keyshortcuts` value from the registry, and `ShortcutHelpDialog.tsx` produces its rows by
mapping over `shortcutCommands`.

The display metadata is itself derived: `chordOf(key)` builds `Ctrl+<KEY>` and `Control+<KEY>` from
the same `key` string that dispatch matches on, so a chord and its label cannot disagree even in
principle.

Verified by grep over `frontend/src/**/*.{ts,tsx}`: the only `Ctrl+` literal in production code is
the single template inside `chordOf`. The remaining matches are test *names* and comments, not
mappings. There is exactly one global `keydown` listener in `App.tsx`; the second listener in the
repository belongs to the help dialog's own Escape/Tab handling, scoped to its mounted lifetime.

## Dispatch invariant

`resolveShortcutCommand(event)` returns a command only when **all** hold:

```text
not event.defaultPrevented
AND not event.isComposing
AND not event.repeat
AND no [role="dialog"][aria-modal="true"] in the document
AND event.target has no editable ancestor
AND the chord matches the registry exactly
```

Returning `null` means the global layer does nothing at all — **including no `preventDefault()`**.
Swallowing a key while declining to act on it is what would stop `Ctrl+K` inserting a link inside the
editor, and the removed ad-hoc listener would have done exactly that.

Editable authority is `input`, `textarea`, `select`, `[contenteditable]` in all three forms,
`[role="textbox"]`, and `.ProseMirror` — resolved with `closest()`, so a control nested inside an
editable surface is protected too.

Modal authority is the `role="dialog"` + `aria-modal="true"` pairing the product already applies to
every modal it has. No modal manager was introduced: a second source of modal truth could disagree
with the semantics screen readers already depend on.

## Command transitions

`selectDestination` is now a `useCallback` and is the single navigation transition. Sidebar clicks
and `Ctrl+1..6` both call it, so both clear incompatible pending navigation identically and there is
no second navigation implementation. `Ctrl+K` sets the same `searchOpen` state the Search control
sets; `GlobalSearchDialog`, its props, and its invoker-based focus restoration are untouched.

## Help and focus

`Ctrl+/` and the Settings **Keyboard shortcuts** trigger open the same dialog. It follows the
`LifeBranchImportDialog` pattern: `role="dialog"` + `aria-modal="true"`, initial focus on the
`tabIndex={-1}` heading, a cycling Tab trap, and Escape or Close to dismiss. Because it is itself an
open modal, the modal clause suppresses every global chord while it is mounted.

Focus restoration belongs to the opener, which is the only layer that knows what opened it:
`shortcutHelpOpenerRef` records `document.activeElement` on the shortcut path and `event.currentTarget`
on the Settings path, and restoration is skipped when the opener is no longer `isConnected`.

## Evidence

| Command | Result |
|---|---|
| `pnpm source:verify` | source sha256 `9c42292…9540a`, 165,171 bytes, 4,637 lines |
| `pnpm governance:check` | repository governance passed; project state verification passed |
| `pnpm index:check` | 402 headings current; full coverage matrix current |
| `pnpm verify` | all six stages green, including `verify_security.py` and `verify_hardening.py` |
| `pnpm typecheck` | clean |
| `pnpm test` | **716 passed / 716, 47 files** (baseline 681 / 46; +30 registry, +5 App) |
| `pnpm build` | 22 chunks emitted |
| `pnpm hardening:performance` | `"violations": []` against the **unchanged** Task 44 budget |
| `cargo fmt -- --check` | clean |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | clean |
| `cargo test --locked -- --test-threads=1` | 732 passed, 0 failed, 4 ignored (unchanged; no Rust touched) |
| `pnpm tauri build` | release binary and NSIS bundle produced |
| `pnpm e2e:windows -- phase16-keyboard-shortcuts.e2e.ts` | 2 passing |
| `pnpm e2e:windows` | **25 spec files, 29 tests, 0 failing** |
| `pnpm hardening:rc` | green; `core-rc-b320aeb`, installer sha256 `cc65226ad78908d9214af05a5375cd35acd1cbc2fce9f14d6cbf0b289d5cb8e7` |
| `git diff --check` | clean |

### Frontend proof

`frontend/src/app/keyboardShortcuts.test.ts` (30 cases) proves the suppression matrix once, against
real dispatched `KeyboardEvent`s rather than a mocked predicate:

- exactly eight commands with unique ids, keys, chords, and labels;
- every displayed chord and `aria-keyshortcuts` derives from the matching key;
- the locked map, asserted behaviourally — `Ctrl+<key>` in, command id and destination out;
- suppression for `defaultPrevented`, `isComposing`, `repeat`, an unmapped chord, an unmapped digit,
  a bare key, and the `Meta`, `Ctrl+Meta`, `Ctrl+Alt`, and `Ctrl+Shift` variants;
- suppression for all six editable surface kinds and for a button nested inside the editor root,
  each additionally asserting `defaultPrevented === false`;
- suppression for an open modal across `Ctrl+1`, `Ctrl+K`, and `Ctrl+/`;
- an accepted chord resolving to exactly one command.

`App.test.tsx` (19 → 24 cases) proves only the wiring, without restating the matrix:

- `Ctrl+1..6` reach every destination, leaving exactly one `aria-current="page"` control carrying the
  registry's `aria-keyshortcuts`, and `Ctrl+3` renders the real Analytics heading;
- a destination chord clears an unsettled pending Today navigation — its companion test, which pins
  the date across a rollover while the request is uncleared, is what makes this non-vacuous;
- `Ctrl+K` opens the existing Search dialog, after which `Ctrl+3` and `Ctrl+/` are both refused and
  return `defaultPrevented === false`;
- `Ctrl+/` opens help with focus on its heading, rows equal to the registry's labels and chords,
  `Ctrl+3` refused while open, zero axe violations on the dialog subtree, and Escape restoring focus
  to the pre-chord element;
- the Settings trigger opens the same dialog and Close restores the trigger.

Accepted chords assert `fireEvent.keyDown(...) === false` and suppressed chords assert `=== true`,
which is the observable form of "preventDefault exactly once, and never when suppressed".

### Native phase 16

`e2e-tests/specs/phase16-keyboard-shortcuts.e2e.ts`, registered in `scripts/run_windows_e2e.ps1`. No
restart companion: Task 45 persists nothing, so there is no state for a restart to preserve.

Chords are real WebDriver key actions (the `U+E009` Control code point plus the key), not
synthetic events. Instrumentation during
bring-up confirmed WebView2 delivers `{key: "3", ctrl: true, alt: false, shift: false, meta: false,
repeat: false, composing: false}` to the page, and the instrumentation was removed before the
recorded runs.

Central scenario, in one session: Today → `Ctrl+3` Analytics → `Ctrl+5` Life System → `Ctrl+K` Search
→ close Search → assert focus landed on the Search invoker → `Ctrl+/` help → assert all eight rows
literally → `Ctrl+1` refused while help is open → Escape → assert help gone, Life System still shown,
focus restored to the Search invoker → `Ctrl+6` Settings → Settings trigger opens the same dialog →
Close restores the trigger.

The second case reaches a real non-modal text field (`New tag name` in Settings), types into it, and
proves `Ctrl+K` does not open Search and `Ctrl+3` does not navigate, with focus and the typed value
both intact.

Phase 16 asserts the locked map literally rather than importing the registry. That is deliberate and
recorded here: the native phase is the outermost acceptance oracle and must fail if the registry
stops agreeing with the Product Owner's decision. Inside the frontend, nothing restates the map.

### Deliberate break

`chordOf("3")` → `chordOf("9")` for `open-analytics`, one line in the central registry.

```text
phase16 line 45  await expect($("h1=Analytics")).toBeDisplayed()   FAILED
                 both phase 16 cases failed; 0 passing
frontend         3 failed / 56  —  "maps Ctrl+3 to open-analytics",
                 "resolves an accepted chord to exactly one command",
                 "reaches every destination through Ctrl+1..6 using the sidebar transition"
```

The native failure is at the destination assertion, as required. After restoring the line: frontend
`src/app` 56 passed, phase 16 2 passing, `git status` shows no residual modification. Phase 16 is
load-bearing.

## Performance

Measured against the **unchanged** `docs/audits/task-44-performance-budgets.json`. No budget file was
created, regenerated, or widened, and `DEFAULT_BUDGET` in `check_performance_budgets.py` still points
at the Task 44 file.

| Metric | Task 44 baseline | Task 45 | Maximum | Headroom left |
|---|---:|---:|---:|---:|
| `index.js` raw | 520,983 | 523,857 | 530,862 | 7,005 |
| total JS raw | 1,214,694 | 1,217,568 | 1,221,217 | 3,649 |
| deterministic gzip | 373,745 | 374,695 | 377,185 | 2,490 |
| chunk count | 22 | 22 | 22 | — |

The pre-change inventory was measured before any product code was written and was byte-identical to
the accepted Task 44 inventory. The registry and the help dialog are eager, so no lazy boundary and
no new chunk were created; the whole feature costs 2,874 raw bytes and 950 deterministic gzip bytes.
No untracked chunk of 10 KiB or more appeared.

## No dependency

`tinykeys`, suggested by immutable source §22.3, was not adopted. It parses arbitrary chord grammars;
this slice has eight fixed `Ctrl`+single-key chords and matches them with one boolean expression over
four modifier flags and `event.key`. The hard part of the slice is the suppression matrix, which no
parser supplies. `pnpm-lock.yaml` and both `package.json` files are untouched.

## Verification debt

The first `pnpm hardening:rc` invocation failed with six `infrastructure::backup` tests reporting
cross-test path contention (`expected MissingBackupFile, got Checksum { expected: "4096", actual:
"389120" }`). Re-running the same selector serially gave 150 passed / 0 failed, and two subsequent
full `hardening:rc` runs were green end to end. Task 45 changes no Rust code at all, so this is a
harness parallelism artifact under `AI_CONSTITUTION.md` §7, not a product defect. It is recorded
rather than hidden.

`e2e-tests/tsconfig.json` cannot be typechecked in this workspace — `@types/node` and
`@wdio/globals/types` do not resolve there. This predates Task 45, affects every phase equally, and
fixing it would require a dependency change that this slice prohibits. Phase 16 is transpiled and
executed by the runner exactly as phases 1–15 are.

## Self-review

| Question | Answer |
|---|---|
| 1. Is there exactly one shortcut authority? | **Yes** — `frontend/src/app/keyboardShortcuts.ts`; the only `Ctrl+` literal in production code is inside `chordOf`. |
| 2. Can a global chord steal editor or modal interaction? | **No** — six editable kinds, nested targets, and any `aria-modal` dialog all suppress, with no `preventDefault()`. |
| 3. Does every command reuse an existing product state transition? | **Yes** — destinations call `selectDestination`, Search sets `searchOpen`; no second implementation exists. |
| 4. Can help text drift from behaviour? | **No** — rows are `shortcutCommands.map(...)`, and chords derive from the key dispatch matches on. |
| 5. Did this task create unnecessary persistence, framework, or dependency? | **No** — zero persistence of any kind, zero dependencies, no schema, Rust, IPC, or capability change. |

## Integrity state

```text
schema:                       26 → 26 (no migration, migrations 1–26 untouched)
Rust / IPC / DTO / bindings:  unchanged
Tauri capabilities:           unchanged
dependencies / lockfiles:     unchanged
workflow files / seal:        unchanged
editor keymaps:               unchanged
Task, Life, Plan, Search,
Graph, backup, interchange:   unchanged
shortcut persistence:         none anywhere
```

## Closure

Task 45 closes the `shortcut map` OPEN decision for the eight-command global case only. Custom
remapping, user-editable chords, shortcut persistence, a command palette, command search, chord
sequences, editor- or screen-scoped command sets, global OS-level hotkeys, and macOS/`Meta` mappings
all remain OPEN, and none is allocated.

Task 46 is neither allocated, started, nor recommended.

```text
product checkpoint: PENDING
closure commit:     PENDING
```
