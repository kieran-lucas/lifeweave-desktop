# Decision Registry

The immutable source is authoritative. This registry makes operational status visible without replacing context.

## LOCKED — Product

- Windows local-first/offline application.
- No account, server, collaboration, hidden telemetry, or default cloud dependency.
- Task-first navigation; Today default.
- Task is not a card.
- Continuous Task timeline 04:00–24:00 with required exact-minute start/end.
- Ordinary overlaps rejected; exact-slot groups allowed.
- Retrospective completion selection through a radial fan.
- Reminder, Windows notification, sound, snooze, and app-open streak removed.
- Analytics is a separate destination.
- Life Browse shows selected + direct children; full tree belongs to Life Edit; leaf opens a separate reader.
- Reduced Motion required.
- Data backup/restore/export are first-class and distinct from interchange.
- Task/Life relationships are navigation-only; each one-off Task or recurring Task series links to zero or one Life node. Authority is stored on `tasks` and `task_series`; occurrences/evaluations inherit and do not store it.
- Narrative Canvas supports 1–20 ordered scenes, three immutable built-in template IDs, and four static document-level Visual World IDs. Visual Worlds are presentation only.
- Portable Package v1 represents one committed Basic Leaf or Narrative Canvas leaf document. Import creates a new document on a selected empty active Life leaf and excludes tree, Task, draft, history, analytics, and settings state.
- Actual time is manual and explicit: a user starts a stopwatch on a **one-off** Task, may stop and start again, and each completed interval persists as an immutable segment. One session is active globally. Rust owns wall-clock epoch-millisecond timestamps; app close and machine sleep count as elapsed and there is no idle subtraction or surveillance of any kind. Actual time never rewrites the schedule, changes conflict rules, or completes/evaluates/scores a Task. A running timer blocks evaluation, deletion, and full backup creation. Recurring occurrences have no actual time. ADR 0037's session feature does not itself change Analytics; the completed-session Analytics projection is separately DECIDED by ADR 0040.
- Planned-versus-actual Analytics is a read-only projection of completed explicit one-off Task
  sessions. Reporting uses the owning existing Task's current scheduled local date and current
  category; cross-midnight sessions are not split, running sessions contribute zero, deleted Tasks
  retain no snapshot, and each tracked Task's scheduled duration enters the comparison denominator
  exactly once. Existing scheduled totals, goals, streaks, completion, evaluation, recurrence, and
  scoring semantics are unchanged. Schema stays 26 and the existing Analytics IPC is reused. See
  ADR 0040.
- Life Branch Package v1 (`format: lifeweave_branch_package`, `.lifeweave-branch.zip`) represents exactly one active connected non-root Life branch: hierarchy and sibling order, node metadata, committed Basic Leaf and Narrative Canvas documents, privacy-sanitized image assets, active canonical tags, and explicit links with both endpoints inside the branch. Import appends a fresh subtree as the last active child of a chosen active documentless node, assigns fresh local IDs to everything, never merges or overwrites by title/path/content/source ID, and is atomic with one tree-revision increment and one non-undoable operation. See ADR 0036.
- Life Tree Package v1 (`format: lifeweave_tree_package`, `.lifeweave-tree.zip`) represents exactly the complete active non-root forest beneath `life-root` at one snapshot. `life-root` is never package content. Import appends the ordered roots beneath one existing active documentless destination with fresh identities, preserves all relative order, and never merges, replaces, deletes, overwrites, or reorders existing Life content. This decides the whole-tree active-forest / whole-tree multi-root case only; arbitrary selected multi-branch export and custom profiles remain OPEN. See ADR 0041.
- Managed backup retention keeps at most 12 currently restorable managed backups. Cleanup runs only
  after the fresh format-v2 package is verified, durably published, and verified again; the fresh
  backup is always protected. Supported older schemas count and migrate only in the restore
  candidate, without rewriting the source package. Future format/schema and unknown artifacts are
  incompatible and retention-exempt. Backup & Restore is first-class Settings content. Configurable
  retention, pin/protect, manual delete, scheduled/automatic backup, offsite/cloud, and advanced
  encryption remain OPEN. See ADR 0042.
- Today, Upcoming, and Overdue are manual-activation tabs within Today. Upcoming is +1 through +14 local days; Overdue is -30 through -1 and is derived from absence of current evaluation.
- Tags are a flat global vocabulary for Life nodes and Tasks. Normalized name is the deduplication/search key; merges retain aliases.
- **Focus Plan is a standalone entity**, not a Life document or Basic Leaf template.
- Focus Plan has stable identity; explicit `draft | active | paused | completed` lifecycle; archive is orthogonal.
- Focus Plan links to zero or one active non-root Life node; one Life node may contextualize many Plans without new Life nodes.
- Focus Plan owns first-class variants, ordered phases, committed revisions, and one recovery draft. Rich-text bodies reuse the accepted Basic Leaf canonical value schema by value, not `reader_documents` rows.
- Focus Plans use shared tags, a distinct `focus_plan` Search entity kind, and full-database backup authority.
- Focus Plans have no automatic progress percentage and no reminder/notification dependency.
- Focus Plan activity Analytics is a bounded read-only projection of existing authority over the
  Objective Analytics week/month/year periods. One-off Tasks and recurring occurrences are
  attributed through their **current** `tasks.focus_plan_id` / `task_series.focus_plan_id`, manual
  reviews through `reviewed_local_date`, and completed actual time only through linked one-off
  Tasks under Task 46 semantics. No historical Plan-link snapshot, occurrence-owned relation,
  persistent Plan aggregate, percentage, score, health signal, phase inference, or lifecycle
  automation exists. Schema stays 27 and exactly one read-only IPC command is added. See ADR 0043.
- Task 36 / Slice 026 is complete at feature checkpoint `57bd42d8eed5643d2fee3b04f74bd3c44e738da2`.
- Each one-off Task or recurring Task series links to zero or one Focus Plan. Authority is stored on `tasks` and `task_series`; occurrences, overrides, and evaluations inherit and do not store it. Task/Life and Task/Focus Plan are independent. A new or changed target must be an active non-archived Plan; an existing link survives later Plan archive and projects explicitly as archived.
- A one-off Task links to zero or one date-only deadline stored on `tasks`. Schedule and deadline are independent; `scheduled_date <= deadline_date` is not an invariant and scheduling after a deadline is surfaced, never repaired. Recurring series, occurrences, overrides, and evaluations own no deadline.
- Deadline state is computed against an explicitly supplied observed local date. The deadline date itself is `due_today`, not overdue. An evaluated Task leaves the active deadline queue but keeps its stored deadline.
- Deadlines is a fourth manual tab inside the Today workspace covering anchor -30 through anchor +14 inclusive. Existing Overdue keeps its schedule-based meaning and is not renamed.
- Task Saved Views are standalone local configurations over exactly one existing Today, Upcoming, Overdue, or Deadlines projection. Predicate v1 is a bounded Rust-validated AND-only typed AST persisted as canonical JSON; no predicate SQL or executable expression exists. Views add a fifth internal Today tab while Today remains startup/default. Task 39 / Slice 029 is complete under ADR 0033 at product checkpoint `374abcbae263be18fa785a56d656678f9bfd9c29`.
- Focus Plan reviews are user-authored history with a review date, required reflection, optional next focus, and idempotent creation. Creating a review changes no Plan state. Task 37 authorises creation and reading only; edit, delete, archive, scheduling, and Search indexing remain out of scope.
- Release-candidate hardening is an allocatable roadmap candidate in its own right. Task 40 / Slice 030 activates the Hardening candidate ADR 0028 scored at 8.055 under ADR 0034, changes no product behavior, adds no migration, and is explicitly **not** a feature checkpoint: the latest feature task remained 39 until Task 41 closed.
- The JavaScript performance gate is versioned. Task 16 and Task 40 budgets are preserved as history and superseded by a Task 41 budget v2 that tracks main, total raw, total gzip, expected chunk count, the named lazy chunks, and every chunk of at least 10,000 raw bytes under a hash-independent identity. Maxima are derived from the final observed build by documented formulas and clamped by locked ceilings; a missing critical chunk, a new unbudgeted chunk at or above 10,000 bytes, and a duplicate normalized identity are failures. Arbitrary budget inflation is not an accepted response to a red gate.
- Quality-gate findings are corrected, never suppressed. `#[allow]`, lint-level reduction, and test exclusion are not accepted responses to a failing lint gate.
- Machine-verifiable accessibility coverage and physical Narrator/DPI observation are distinct evidence classes. Automated DOM tests never substitute for spoken screen-reader output or physical Windows scaling, and an unobserved manual result is recorded as `NOT RUN`, never PASS.
- The execution roadmap remains a 60-task envelope. Product Owner allocation may reuse unstarted positions without increasing the total.
- Task 41 / Slice 031 completes Explicit Life Links + Backlinks Core under ADR 0035 at product checkpoint `e1fe3675315c04590aabe9c9ca87ede344dafa40`. A link is one
  directed, untyped relation from an active non-root committed supported Life leaf to another such
  leaf, with Life node IDs as sole authority. Backlinks are derived. Rename/reparent never rewrite
  edges; archive/document unavailability preserves and disables them; restore re-enables them.
  Schema 24 adds only `life_links` with restrictive endpoint FKs and 100 outgoing / 500 incoming
  caps. Portable Package/Markdown/global Search remain unchanged and Graph, whole-tree interchange,
  inferred/inline/title-parsed links, branches, non-Life endpoints, dependencies, and Task 42 remain
  prohibited.

- Task 44 / Slice 034 completes the Life Relationship Graph Explorer Core under ADR 0038 at product
  checkpoint `7e95644dcced19a1a8349706990d20d1df53a2e1`. Graph is a read-only, transient explorer of the active Life hierarchy
  plus existing explicit directed Life links. It stores no graph truth, never replaces Browse or
  Edit, and never creates, deletes, infers, or rewrites relationships. Schema stays 26 with no
  migration and no dependency: the layout is the existing `d3-hierarchy` tidy tree with explicit
  links drawn as a second pass. Bounds are 500 nodes, 2,000 links, and 128 levels, and the
  projection rejects rather than truncates. `graph` is never a persisted Life mode, route, or
  sidebar destination. Persisted graph truth, graph editing, inferred/derived/typed/weighted edges,
  clustering, pathfinding, centrality, ranking, generalized knowledge features, and Task 45 remain
  prohibited.

- Task 45 / Slice 035 completes the Global Keyboard Shortcuts and Shortcut Help Core under ADR 0039
  at product checkpoint `3e48ca9292f655543a79724aae674c387bdb2f0a`. There are exactly eight global
  commands — `Ctrl+1..6` for the six destinations in sidebar order, `Ctrl+K` Search, `Ctrl+/`
  Keyboard shortcuts — defined once in `frontend/src/app/keyboardShortcuts.ts`, which owns dispatch
  and every displayed chord; the help dialog is generated from it and cannot drift. Windows
  `Control` is the authority and there is no macOS or `Meta` mapping. A chord executes only when it
  is not `defaultPrevented`, not composing, not a key repeat, no `aria-modal` dialog is open, the
  target has no editable ancestor, and the chord matches exactly; when suppressed the global layer
  does nothing, including no `preventDefault()`. Every command reuses the existing click-path state
  transition. Schema stays 26 with no migration, no Rust, IPC, DTO, capability, or dependency
  change, and nothing is persisted. Custom remapping, user-editable chords, shortcut persistence, a
  command palette, command search, executable help rows, chord sequences, editor- or screen-scoped
  command sets, global OS-level hotkeys, and macOS mappings remain prohibited. Task 46 remained
  prohibited at Task 45 closure and later closed separately under ADR 0040.

- Task 46 / Slice 036 completes Planned versus Actual Analytics Core under ADR 0040 at product
  checkpoint `e7454241576f3c7284a3433db8844c0c5f208e52`. Completed explicit sessions contribute only
  through their owning existing one-off Task, attributed by that Task's current scheduled local
  date and current category. Milliseconds sum per Task before flooring; each tracked Task enters the
  tracked-plan denominator once; active sessions and recurring work contribute zero. The first
  successful Stop bumps the existing Analytics source revision once in the same transaction.
  Schema stays 26; no migration, snapshot, persistent aggregate, dependency, capability, route, or
  second Analytics IPC is added. Recurring actual time, manual entry, editing completed segments,
  and every other actual-time extension remain OPEN and unallocated. Task 47 remains prohibited,
  unstarted, unallocated, and unrecommended.

- Task 49 / Slice 039 completes Focus Plan Activity Analytics Core under ADR 0043 at product
  checkpoint `7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`. DECIDED: factual Focus Plan activity
  analytics; current Task/series → Plan attribution; review-date aggregation; completed one-off
  actual-time aggregation. One-off Tasks and generated non-cancelled recurring occurrences are
  attributed through their current `tasks.focus_plan_id` / `task_series.focus_plan_id`, so
  relinking moves retrospective attribution and no historical Plan-link snapshot exists. Reviews
  aggregate by `reviewed_local_date` into counts and the latest date only — never content.
  Completed actual time comes only from linked one-off Tasks under unchanged Task 46 arithmetic,
  and recurring work never enters the denominator. Overall fields are exact sums of the Plan rows,
  ordering is deterministic, and more than 500 qualifying Plans is rejected rather than truncated.
  Schema stays 27 with no migration, no persistent Plan aggregate, and exactly one read-only IPC
  command feeding a lazy section inside the single Analytics destination. STILL DEFERRED: automatic
  progress and phase relations; scoring, health, and prediction; automatic lifecycle; and review
  edit, delete, archive, scheduling, and search. Task 50 is prohibited, unstarted, unallocated, and
  unrecommended.

## LOCKED — Technology direction

- Tauri 2; React UI + Rust application core; TypeScript strict; Vite 8.
- `rusqlite` bundled, dedicated DB worker, forward-only migration.
- typed IPC/DTO generation; vanilla-extract/theme contracts/native CSS.
- TanStack Query + narrow Zustand; dnd-kit and d3-hierarchy where activated.
- Tiptap/ProseMirror direction for editor work when the relevant slice activates.
- FTS5/rrule/testing/release foundations as specified; dependencies install only when activated.
- GitHub Actions is limited to the sealed manual, read-only Windows installer build in `.github/workflows/manual-clean-build.yml`. Routine tasks may not modify the workflow or `.github/WORKFLOW_SEAL.sha256`; a change requires explicit Product Owner workflow authorization or evidence of a platform/toolchain break.
- Task closure is risk-based. Equivalent deterministic evidence may replace a named flaky or nondiagnostic test environment. Tooling failures do not block roadmap progression unless they reproduce a product invariant violation.

## PROTOTYPE-GATED

- radial fan geometry and probability emphasis;
- completion prediction algorithm;
- global scoring formula;
- autosave cadence/patch model;
- shared-element exact choreography;
- large-tree virtualization;
- visual-world asset intensity/performance;
- narrow-window and DPI threshold decisions.

## OPEN — Product/UX

- final brand/name/logo;
- final FAB icon and placement;
- actual-time semantics beyond explicit one-off sessions and planned-versus-actual Analytics
  (recurring actual time, manual time entry, editing completed segments, and every other extension
  remain OPEN — the explicit one-off session case is DECIDED by ADR 0037 and the bounded Analytics
  aggregation case is DECIDED by ADR 0040);
- final score and hidden mappings;
- final prediction;
- Generic Outline role beyond the Basic Leaf heading navigator;
- Noteboard role;
- Graph beyond the read-only transient explorer of the active Life hierarchy plus existing explicit
  directed Life links (persisted graph truth, graph as a navigation destination, graph editing,
  inferred/derived/typed/weighted edges, non-Life endpoints, clustering, pathfinding, centrality, and
  ranking all remain OPEN — the read-only transient explorer case is now DECIDED, see ADR 0038);
- arbitrary user-selected multi-branch export (single-branch and complete active-forest cases are DECIDED — see ADR 0036 and ADR 0041);
- custom export profiles;
- preserve-vs-strip original asset metadata beyond the privacy-safe default;
- branch node content semantics;
- shortcut map beyond the eight locked global commands (custom remapping, user-editable chords,
  shortcut persistence, a command palette, command search, chord sequences, editor- or screen-scoped
  command sets, global OS-level hotkeys, and macOS/`Meta` mappings all remain OPEN — the global
  eight-command case is now DECIDED, see ADR 0039);
- global application/branch appearance beyond the four locked Narrative Canvas worlds;
- configurable backup retention, pin/protect, manual delete, scheduled/automatic backup,
  offsite/cloud backup, and advanced encryption;
- multi-monitor details.

## DEFERRED

- Focus Plan review edit, delete, archive, scheduling, reminders, and Search indexing remain prohibited pending a separate Product Owner decision;
- recurring, occurrence, and override deadlines, deadline time-of-day, deadline reminders and scheduling, and deadline or lateness analytics remain prohibited pending a separate Product Owner decision;
- automatic Plan progress, phase-to-Task relationships, Plan scoring/health/prediction, automatic
  Plan lifecycle, and Plan analytics beyond the ADR 0043 factual activity projection remain
  prohibited (factual Focus Plan activity analytics is DECIDED — see ADR 0043);
- prediction and opaque ML;
- custom user-authored Narrative templates and Visual Worlds;
- cross-scene block drag and scene-level independent presentation;
- generalized knowledge features, and Graph beyond the ADR 0038 read-only transient explorer;
- public updater/store distribution;
- advanced full palette customization;
- sound design.

## REMOVED

- account/login/server; default cloud sync; collaboration/sharing/presence/comments;
- subscription/paywall; reminder/notification/sound/snooze;
- task cards; dashboard startup; month calendar fixed beside timeline;
- full tree in Browse; anime characters/fanart/gacha; video background;
- default freeform pixel canvas.

## Change process

1. Create an Open Decision issue.
2. Cite original source lines and current registry entry.
3. State concrete alternatives and consequences.
4. Prototype if gated.
5. Record accepted result in ADR.
6. Update registry/spec/tests in the same or linked change.
7. Obtain Product Owner acceptance before implementation activation.
