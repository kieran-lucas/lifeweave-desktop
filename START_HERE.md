# Start here — Lifeweave Desktop

## Authority

1. [Immutable source](docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md)
2. [Source integrity](docs/source-of-truth/SOURCE_INTEGRITY.md)
3. [AI Constitution](AI_CONSTITUTION.md)
4. [Project State](docs/PROJECT_STATE.json)
5. [Decision Registry](docs/DECISION_REGISTRY.md)
6. [Status](docs/STATUS.md) and [Roadmap](docs/ROADMAP.md)
7. [Architecture](docs/ARCHITECTURE.md)

## Current state

- Latest closed task: **46/60**
- Latest closed slice: **036 — Planned versus Actual Analytics Core**
- Active task: **none**
- Active implementation specification: **none**
- Latest feature checkpoint: **Task 46 — Planned versus Actual Analytics Core** (`e7454241576f3c7284a3433db8844c0c5f208e52`)
- Database schema: **26**
- Next action: **Product Owner gate**
- Task 47: **prohibited, unstarted, unallocated, and unrecommended**

## Task 46 closure

Task 46 / Slice 036 is closed at product checkpoint
`e7454241576f3c7284a3433db8844c0c5f208e52` from baseline
`b5002c3b05232aa0b8ae74b924764f927cc00f1d`.
It closes exactly the remaining planned-schedule → completed-session → retrospective-Analytics
loop for existing one-off Tasks.

Completed Task 43 session segments are folded into the existing Analytics projection using the
owning Task's **current scheduled local date and current category**. Running timers and recurring
work contribute nothing. Each tracked Task contributes its scheduled duration once to the tracked
plan, while untracked Tasks remain in the existing scheduled overview.

Schema stays **26**: no migration, snapshot, persistent actual-time aggregate, dependency,
capability, route, destination, or second Analytics IPC. Existing scheduled totals, category goals,
streaks, completion distribution, and evaluation semantics remain unchanged. Canonical decision:
[ADR 0040](docs/adr/0040-planned-vs-actual-analytics.md).
Closure evidence is in
`docs/audits/task-46-planned-vs-actual-analytics.md`.

## Task 45 closure

Task 45 is closed at product checkpoint `3e48ca9292f655543a79724aae674c387bdb2f0a` from baseline
`b8ad47d9079246cecf4c30c728bec1d3a4915b41`. It adds **eight global
keyboard commands, defined once in a single frontend registry that owns both dispatch and every
displayed chord**. A global chord never takes precedence over an editable surface or an open modal,
and no shortcut is customizable or persisted.

```text
Ctrl+1  Today          Ctrl+5  Life System
Ctrl+2  Calendar       Ctrl+6  Settings
Ctrl+3  Analytics      Ctrl+K  Search
Ctrl+4  Plans          Ctrl+/  Keyboard shortcuts
```

Schema stays **26**: there is no migration, no schema change, and no Rust, IPC, DTO, or capability
change. No dependency is added — `tinykeys` is explicitly not adopted, because eight fixed
`Ctrl`+single-key chords have no grammar to parse.

A chord executes only when it is not `defaultPrevented`, not composing, not a key repeat, no modal is
open, focus is not in an editable surface, and the chord matches the registry exactly. When
suppressed the global layer does nothing — including no `preventDefault()` — so `Ctrl+K` stays
available to the editor. Every command reuses the state transition its existing click path already
uses, and the Keyboard shortcuts dialog is generated from the registry so it cannot drift.

Custom remapping, a command palette, command search, executable help rows, chord sequences, and
macOS mappings all remain prohibited. Canonical decision:
[ADR 0039](docs/adr/0039-global-keyboard-shortcuts.md); closure evidence is in
`docs/audits/task-45-global-keyboard-shortcuts.md`.

## Task 44 closure

Task 44 is closed at product checkpoint `7e95644dcced19a1a8349706990d20d1df53a2e1` from baseline
`2d5b5d335137fe2a09f60b585d11a14a839b1e25`. It adds a **read-only,
transient explorer of the active Life hierarchy plus existing explicit directed Life links**. It
stores no graph truth, never replaces Browse or Edit, and never creates, deletes, infers, or rewrites
relationships.

Schema stays **26**: there is no migration and no schema change. No dependency is added — the layout
is the `d3-hierarchy` tidy tree Life Edit already computes, with explicit links drawn as a second
pass. `d3-force`, Cytoscape, Graphology, vis-network, physics engines, and canvas/WebGL graph
renderers are prohibited.

The explorer is bounded at 500 nodes, 2,000 links, and 128 levels, and **rejects rather than
truncates**, because a partial graph that silently omits relationships is worse than no graph.

Graph is transient by construction. `life_navigation_preferences.last_life_mode` stays constrained to
`('browse','edit','pinned','reader')`; there is no new route, sidebar destination, or startup
restoration, and a restart returns the user to the persisted mode. Persisted graph truth, graph
editing, inferred or typed edges, and generalized knowledge features remain prohibited. Canonical
decision: [ADR 0038](docs/adr/0038-life-relationship-graph-explorer.md); closure evidence is in
`docs/audits/task-44-life-relationship-graph.md`.

## Task 43 closure

Task 43 is closed at product checkpoint `b4510ddbffbd0e8c4d5ae84213973b723df4cbad` from baseline
`ec2ae86417d7e65315582c808250b33009ebf1c3`. It adds **manual,
stopwatch-style actual time for one-off Tasks only**: the user explicitly starts work, may stop and
later start again, and each completed interval persists as an immutable segment. There is one active
session globally, enforced by a partial unique index.

Actual time is independent of the planned schedule — schedule edits never rewrite recorded time, it
never changes conflict rules, and it never completes, evaluates, or scores a Task. An active session
measures wall-clock elapsed time including app close and machine sleep, with no idle subtraction.

There is **no surveillance**: no idle detection, no keyboard, mouse, window, or process monitoring,
no screenshots, and no automatic start, stop, or task switching.

Recurring Tasks are deliberately excluded because occurrence identity is
`series_id + original_local_date` and a `ThisAndFuture` edit mints a new series identity. Analytics
is untouched. Recurring actual time, manual entry, editing completed segments, Pomodoro, billing,
export, Analytics aggregation, and Task 44 remain prohibited. Canonical decision:
[ADR 0037](docs/adr/0037-explicit-actual-time-sessions.md); closure evidence is in
`docs/audits/task-43-explicit-actual-time-sessions.md`.

## Task 42 closure

Task 42 is closed at product checkpoint `9c5d0cfb6c5e64ba7a5acfd23464e6a8474954b9` from baseline
`08a76c2827c1d49556c1f255631cbe2b1a4a2437`. It adds a distinct
**Life Branch Package v1** (`.lifeweave-branch.zip`) that exports and imports exactly one active
connected non-root Life branch — hierarchy and sibling order, committed Basic Leaf and Narrative
Canvas documents, privacy-sanitized image assets, active canonical tags, and the explicit links
whose endpoints both lie inside the branch. Imported data receives fresh local IDs, nothing is
merged or overwritten, and import is atomic with exactly one tree-revision increment and one
non-undoable operation.

Two live-schema conflicts were surfaced during activation and resolved by explicit Product Owner
decision in [ADR 0036](docs/adr/0036-bounded-life-branch-interchange.md): schema advanced to **25**
so the Life operation ledger can store `import_branch`, and an imported tag whose normalized name is
held by an unmerged archived tag has that single assignment omitted and warned.

Portable Package v1, database backup/restore semantics, whole-tree interchange, Graph, routes,
dependencies, workflows/seal, and Task 43 remain unchanged and prohibited. Closure evidence is in
`docs/audits/task-42-bounded-life-branch-interchange.md`.

Task 41 is closed at product checkpoint `e1fe3675315c04590aabe9c9ca87ede344dafa40` from baseline
`6bcffe751458ee37a4cde663e21336a1f484a613`. It adds directed stable-ID links between committed Basic Leaf and Narrative Canvas Life leaves,
derived backlinks, exact Reader navigation, archive/restore preservation, and full backup authority.
Schema 24 is active through the append-only migration. Graph, whole-tree
interchange, inline/title-parsed links, package changes, dependencies, and Task 42 remain prohibited.
Closure evidence is in `docs/audits/task-41-explicit-life-links.md`.

Task 40 was a hardening and evidence slice. It changed no product behavior, added no migration, and
was **not** a feature checkpoint: the latest feature task remained 39 until Task 41 closed.

## Task 36 closure

Task 36 is closed and must not be reopened merely because a native E2E smoke test or Windows driver harness is red. Closure is supported by implemented schema/domain/UI behavior, focused frontend coverage, Rust migration/core/backup/tag/Search tests, generated-binding stability, production frontend build, inspected persisted SQLite artifacts, and explicit Product Owner acceptance.

A future reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision may reopen the task. Tooling-only failures remain non-blocking verification debt.

## Sealed workflow

GitHub Actions contains one manual, read-only Windows installer build. Normal feature, fix, refactor, test, documentation, and maintenance tasks must not modify `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256`. Workflow changes require explicit Product Owner authorization and must pass `python scripts/check_repository.py`.
