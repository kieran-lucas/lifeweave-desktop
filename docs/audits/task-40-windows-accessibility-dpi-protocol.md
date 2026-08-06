# Task 40 — Windows Narrator and DPI Manual Protocol

This protocol is executable without reading the source. It covers what automated tests cannot
prove: spoken screen-reader output and physical Windows display scaling.

## How to record a result

Every check gets exactly one of:

| Result | Meaning |
|---|---|
| `PASS` | The expected behaviour was **observed** on the machine under test. |
| `FAIL` | The expected behaviour was observed to be wrong or absent. |
| `NOT AVAILABLE` | The environment cannot support the check (for example a single-monitor machine for a multi-monitor check, or a scale the display does not offer). |
| `NOT RUN` | The check was not performed. |

**A check that was not observed is `NOT RUN`. It is never `PASS`.** An unrun protocol is a truthful
statement of evidence debt; a protocol full of unobserved passes is a false completion claim.

Record the observed Narrator announcement verbatim in the evidence field, not a paraphrase. If it
differs from the expectation but is still correct and unambiguous, record `PASS` and note the actual
wording.

## Environment capture

Fill this in before the first check. Every value is required.

| Field | How to obtain | Value |
|---|---|---|
| Windows edition and build | `winver` | |
| WebView2 Runtime version | Settings → Apps → *Microsoft Edge WebView2 Runtime* | |
| Installer path | from the release build output | |
| Installer SHA-256 | `Get-FileHash -Algorithm SHA256 <installer>` | |
| Application version | Settings screen / installer name | |
| Monitor count | Settings → System → Display | |
| Per-monitor resolution | Settings → System → Display → Display resolution | |
| Display scale per monitor | Settings → System → Display → Scale | |
| Text scale | Settings → Accessibility → Text size | |
| High contrast theme | Settings → Accessibility → Contrast themes | |
| Narrator version/state | `Ctrl+Win+Enter`; Narrator → Settings → About | |
| Keyboard layout | Settings → Time & language → Language & region | |
| Date of run | | |
| Operator | | |

## Rules of engagement

- Change display and text scale **only** through the Windows Settings UI, deliberately, and restore
  the original values afterwards. Nothing in this protocol authorises a script to change global
  display settings.
- Sign out and back in when Windows asks, so scaling applies fully rather than partially.
- Use a **fresh application profile** for the first pass, then repeat scenario 11 against a profile
  that already contains data.
- Drive every scenario from the keyboard only. Touch the mouse solely for the explicit
  pointer-target checks.
- Where a scenario says "expected Narrator announcement", the wording is the *substance* that must be
  conveyed: name, role, and state. Exact phrasing varies by Narrator verbosity level; run at the
  default level and note the level used.

## Scale matrix

Run the layout checks in §Layout at each combination the machine offers.

| Display scale | Text scale 100% | Text scale 150% | Text scale 200% |
|---|---|---|---|
| 100% | | | |
| 125% | | | |
| 150% | | | |
| 175% | | | |
| 200% | | | |

Mark unavailable combinations `NOT AVAILABLE` and say why (for example, a display that does not
offer 175%).

## Layout checks (apply at every available scale)

For each scale, check every item and record one result per item.

| # | Check | Severity | Result | Evidence |
|---|---|---|---|---|
| L1 | No primary action is clipped or cut off at any window size the app allows | P1 | | |
| L2 | No dialog action is positioned off-screen and unreachable | P1 | | |
| L3 | Horizontal scrolling is never the *only* way to reach content or an action | P1 | | |
| L4 | Body text remains legible; nothing overlaps or truncates without an accessible full value | P2 | | |
| L5 | The focus indicator stays visible and is not clipped by a container edge | P1 | | |
| L6 | Pointer targets hit the control actually drawn under the cursor (no offset) | P1 | | |
| L7 | Every dialog is dismissible with `Esc` and returns focus to its invoker | P1 | | |
| L8 | At the minimum window size the app permits, the layout stays usable and states that honestly rather than silently hiding actions | P2 | | |
| L9 | Any drag-and-drop reordering has a keyboard alternative that produces the same result | P1 | | |
| L10 | On a multi-monitor setup, moving the window between monitors of *different* scale re-renders correctly | P2 | | |

## Scenarios

Each scenario records: keyboard path, expected focus, expected Narrator announcement, expected
name/role/state/value, expected layout, severity, result, evidence.

### 1. Launch and primary navigation

| Field | Expectation |
|---|---|
| Keyboard path | Launch the app. `Tab` from the document start. Then `Tab` through the sidebar. |
| Expected focus | First stop is inside the primary navigation; focus order follows visual order top to bottom. |
| Expected Narrator announcement | The navigation landmark is announced as "Primary navigation"; each item announces its name and the Button role; the current destination announces its current/selected state. |
| Expected name/role/state | Buttons named exactly: Today, Calendar, Analytics, Plans, Life System, Settings, Search (Ctrl+K), Collapse sidebar. No unnamed focusable control. |
| Expected layout | Today is the destination on launch. |
| Severity | P1 |
| Result / evidence | |

### 2. One-off Task create, edit, delete

| Field | Expectation |
|---|---|
| Keyboard path | Reach "Plan task" and activate it. `Tab` through Title, Description, Date, Start, End, Category, Priority, Life area, Focus Plan, Deadline. Save. Reopen the row and edit. |
| Expected focus | Focus enters the dialog on open and returns to the invoking control on close or `Esc`. |
| Expected Narrator announcement | The dialog is announced by its name ("Create task" / "Edit task") and as modal; every field announces its label, role, and current value; the deadline field also announces its help text. |
| Expected name/role/state | Each control has a programmatic label; the deadline input is disabled with a stated reason for recurring drafts. |
| Expected layout | No field or action is clipped at any scale. |
| Severity | P1 |
| Result / evidence | |

### 3. Recurring Task navigation

| Field | Expectation |
|---|---|
| Keyboard path | Create a recurring series, then move between occurrences from the timeline. |
| Expected focus | Focus lands on the exact occurrence opened, not the series head or the first row. |
| Expected Narrator announcement | The occurrence announces its title, time, and that it is recurring. |
| Expected name/role/state | Scope controls announce their current scope selection. |
| Expected layout | Recurrence controls remain reachable at 200% display scale. |
| Severity | P1 |
| Result / evidence | |

### 4. Assessment and undo

| Field | Expectation |
|---|---|
| Keyboard path | Focus a Today row, open its assessment control, choose an option, then activate Undo assessment. |
| Expected focus | The option list receives focus on open; after undo, focus is on a stable, sensible control. |
| Expected Narrator announcement | The listbox announces "Completion assessment" and the chosen option; the saved state is announced through a live region; undo is announced. |
| Expected name/role/state | The assessment control exposes a listbox role with its options; the status message is announced without stealing focus. |
| Expected layout | The option list is fully on-screen at every scale. |
| Severity | P1 |
| Result / evidence | |

### 5. All five Today tabs

| Field | Expectation |
|---|---|
| Keyboard path | `Tab` to the tablist. `Arrow Left`/`Right` to move, `Home`/`End` to jump, `Enter`/`Space` to activate. |
| Expected focus | One tab stop for the whole tablist (roving tabindex). Arrows move focus without activating. |
| Expected Narrator announcement | The tablist announces "Task planning views"; each tab announces its name, the Tab role, its position, and its selected state. |
| Expected name/role/state | Tabs named Today, Upcoming, Overdue, Deadlines, Views. Exactly one is selected at a time. |
| Expected layout | All five tabs remain visible and operable at 200% display and 200% text scale. |
| Severity | P1 |
| Result / evidence | |

### 6. Deadline result navigation

| Field | Expectation |
|---|---|
| Keyboard path | Open the Deadlines tab, reach a queued row, activate its open action. |
| Expected focus | Focus lands on the Task on its **scheduled** day, not the deadline day. |
| Expected Narrator announcement | The open action announces the task title, the scheduled date, and the deadline date. Group headings announce Overdue deadlines / Due today / Upcoming deadlines with counts. |
| Expected name/role/state | "Scheduled after deadline" is announced as text, never conveyed by colour alone. |
| Expected layout | The deadline date, schedule, and status all remain visible without horizontal scrolling. |
| Severity | P1 |
| Result / evidence | |

### 7. Saved View create, edit, archive, restore

| Field | Expectation |
|---|---|
| Keyboard path | Views tab → Create view → Name, Base scope, Sort, Group → Add filter → Add → Save view. Then Edit, Archive, expand Archived views, Restore. |
| Expected focus | Focus enters the editor dialog and returns to the invoking control on save, Cancel, or `Esc`. `Tab` cycles inside the dialog; `Esc` always leaves it. |
| Expected Narrator announcement | The dialog announces "Create Saved View" / "Edit Saved View" and modal state; each filter fieldset announces its legend; a rejected save announces the error through an alert. |
| Expected name/role/state | The active view list is named "Active Saved Views"; the selected view exposes its pressed state; archived views live in a disclosure that announces its expanded state and count. |
| Expected layout | The editor dialog is fully reachable at 200% scale; no action falls off-screen. |
| Severity | P1 |
| Result / evidence | |

### 8. Search navigation

| Field | Expectation |
|---|---|
| Keyboard path | `Ctrl+K`, type a query, arrow through results, `Enter` to navigate, `Esc` to dismiss. |
| Expected focus | The query field receives focus on open; `Esc` restores focus to the Search trigger. |
| Expected Narrator announcement | Result count is announced through a live region as it changes; each result announces its title and kind. |
| Expected name/role/state | The dialog is named and modal; results expose a list structure. |
| Expected layout | The dialog is fully visible at every scale and never exceeds the viewport. |
| Severity | P1 |
| Result / evidence | |

### 9. Focus Plan workflow

| Field | Expectation |
|---|---|
| Keyboard path | Plans → create a plan → edit Title, Outcome, Lifecycle → Save plan → add a phase → add a review. |
| Expected focus | Focus follows the created plan; added phases receive or announce focus predictably. |
| Expected Narrator announcement | Each field announces label, role, and value; Lifecycle announces the selected option. |
| Expected name/role/state | Phase inputs are individually named (for example "Phase 1 title"). |
| Expected layout | The plan editor and phase list stay usable at 200% text scale. |
| Severity | P2 |
| Result / evidence | |

### 10. Life Browse, Edit, and Reader

| Field | Expectation |
|---|---|
| Keyboard path | Life System → browse to a child → open Edit Mode → move a node using the keyboard alternative → open a leaf in Reader. |
| Expected focus | Mode switches move focus to the new region; Reader returns focus on exit. |
| Expected Narrator announcement | The current node and its children are announced; mode buttons announce their pressed state. |
| Expected name/role/state | Browse shows the selected node and direct children only; tree structure exposes level and position. |
| Expected layout | Tree layout and the Reader remain usable at 150% and 200%; **L9 applies here** — reordering must have a keyboard path. |
| Severity | P1 |
| Result / evidence | |

### 11. Backup and restore confirmation

| Field | Expectation |
|---|---|
| Keyboard path | Settings → Backup → select a backup → Restore. |
| Expected focus | Focus stays on a sensible control throughout; the progress state does not strand focus. |
| Expected Narrator announcement | "Restore complete." is announced through the polite live region; a failure is announced as an alert with a recovery instruction. |
| Expected name/role/state | The backup list is a named select exposing its current value; busy state is announced, not only shown. |
| Expected layout | Confirmation and progress text are never clipped. |
| Severity | P1 |
| Result / evidence | |

## Sign-off

| Field | Value |
|---|---|
| Total checks | |
| PASS | |
| FAIL | |
| NOT AVAILABLE | |
| NOT RUN | |
| P1 failures outstanding | |
| Display and text scale restored to original values | |
| Operator signature | |

A run with any `NOT RUN` entry is an **incomplete** run and must be reported as such. Do not
summarise an incomplete run as a pass.
