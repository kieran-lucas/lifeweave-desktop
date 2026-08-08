# Project Status

## Task 49/60 — Focus Plan Activity Analytics Core (active)

- Activation baseline: `86261298ccd99204da503f508b4dfb9ac50cee04`.
- Active slice: `039-focus-plan-activity-analytics` under ADR 0043.
- Schema remains 27; no migration, no persistent Plan analytics aggregate, no second
  source-revision system.
- Scope: a bounded read-only Focus Plan activity projection over the existing Objective Analytics
  week/month/year periods; current Task/series → Plan attribution with no historical snapshot; one
  work item per one-off Task and per generated non-cancelled occurrence; evaluated/missed parity;
  review aggregation by `reviewed_local_date`; completed one-off actual time under Task 46
  arithmetic; exactly one read-only IPC command; a lazy `Focus Plan activity` section inside the
  single Analytics destination bounded at 500 Plans with rejection rather than truncation.
- Existing Objective Analytics output, recurrence and evaluation authority, ADR 0031 relation
  cardinality, and review creation/read semantics remain binding and unchanged.
- No automatic Plan progress, phase relation, scoring, health, prediction, automatic lifecycle,
  percentage, review content analytics, dependency, capability broadening, destination, chart
  library, workflow/seal change, or Task 50 work is authorized.
- Next action: implement the active specification. Task 50 is prohibited, unstarted, unallocated,
  and unrecommended.

## Task 48/60 — Managed Backup Retention and Compatibility Core (complete)

- Activation baseline: `17a833067cfca5e4c4b11da11dfd987528cb444a`.
- Activation commit: `a0c5dea1e2767c43819923a2bfaa7d16ba207e6b`.
- Product checkpoint: `51e24c54f12f0236ecba1bd81936bc11db59f8ac`.
- Closed slice: `038-managed-backup-retention-compatibility` under ADR 0042.
- Schema remains 27; no migration. Backup format remains v2.
- Scope: explicit Ready/MigrationRequired/NewerSchema/NewerFormat inventory metadata; exactly 12
  currently restorable managed backups; pruning only after verified durable publication; fresh and
  incompatible/artifact protection; successful creation despite cleanup failure; first-class lazy
  Backup Settings with accessible restore confirmation.
- Existing strict restore, candidate migration, immutable source, active-timer guard, safety
  snapshot, maintenance lock, marker/rollback, checksum/integrity/FK/asset validation remain binding.
- No dependency, broad filesystem capability, background worker, network destination,
  workflow/seal change, format/schema change, or Task 49 work was added.
- Next action: Product Owner gate. Task 49 is prohibited, unstarted, unallocated, and
  unrecommended. Full evidence is in
  `docs/audits/task-48-managed-backup-retention-and-compatibility.md`.

## Task 47/60 — Whole-Life Tree Interchange Core (complete)

Activated from baseline `1516b9c68e9e906269e4d4a00e85c508a5cd58b1` under ADR 0041 and
`specs/037-whole-life-tree-interchange`. The approved unit is exactly the complete active non-root
Life forest beneath `life-root`, exported as Life Tree Package v1 and imported append-only beneath
one valid existing destination with fresh IDs and preserved order. Existing content and `life-root`
are never merged, replaced, deleted, overwritten, or reordered.

- Activation baseline: `1516b9c68e9e906269e4d4a00e85c508a5cd58b1`.
- Activation commit: `15e98202ddf4b986377c171cac3f0ef9fc40bb16`.
- Product checkpoint: `1c42ac5358579dc8795e4b7c1b76bc004b0269f1`.
- Schema advances 26 → 27 through one migration rebuilding only `life_operations` to admit
  `import_tree`; all prior rows, kinds, columns, FKs, indexes, constraints, revisions, and undo state
  survive.
- Tree Package v1 is distinct from Branch Package v1, Portable Package v1, and backup. Export is the
  complete active non-root forest only; import appends roots with fresh IDs and preserved order.
- Archive hardening, privacy-safe assets, canonical documents, tags, internal links, atomic rollback,
  replay, backup/restore, accessibility, Phase 18/restart, and unchanged performance ceilings have
  focused deterministic evidence.
- No dependency, generic interchange framework, broad capability, route, workflow/seal change, or
  Task 48 work was added.
- Next action: Product Owner gate. Task 48 is prohibited, unstarted, unallocated, and unrecommended.
  Full evidence is in `docs/audits/task-47-whole-life-tree-interchange.md`.

## Task 46/60 — Planned versus Actual Analytics Core (complete)

- Closed slice: `036-planned-vs-actual-analytics`.
- Activation baseline: `b5002c3b05232aa0b8ae74b924764f927cc00f1d`.
- Activation commit: `b71d6f3711e77511a8edd0f116d5dc27f4c4c1d6`.
- Product checkpoint: `e7454241576f3c7284a3433db8844c0c5f208e52`.
- Schema stays 26. There is no migration, schema change, snapshot column, persistent actual-time
  aggregate, or new index; migrations 1–26 remain immutable.
- Scope: completed Task 43 session segments become a read-only part of the existing Analytics
  projection for existing one-off Tasks only.
- Attribution authority is the owning Task's current `local_date` and current `category_id`.
  Cross-midnight sessions are not split; session wall-clock date and timezone do not select the
  reporting period.
- Running and discarded-active sessions contribute nothing. Deleting a Task removes contribution
  through the existing cascade. Recurring work cannot contribute.
- A tracked Task has at least one completed segment in the requested Task-date period, including a
  zero-duration segment. Its scheduled duration enters the tracked-plan denominator exactly once,
  regardless of segment count. Untracked Tasks remain in established scheduled totals.
- Milliseconds sum per Task before one whole-second floor. Rust checked arithmetic owns overall and
  category summaries, whose actual-second totals must agree.
- The first successful Stop updates `ended_at_ms` and bumps the existing Analytics source revision
  exactly once in one transaction. Start, Discard, replayed Stop, and backwards-clock refusal do not
  bump. Analytics algorithm version advances 1 → 2.
- UI scope is one semantic Recorded actual time section and compact tracked-category lines, with
  five facts, textual variance, explicit empty state, and transparency copy. Scheduled goals,
  streaks, completion, and period navigation remain unchanged.
- Existing `get_analytics_projection` is reused. No new IPC, capability, dependency, route,
  destination, chart library, or generic reporting framework is authorized.
- Next action: Product Owner gate. Task 47 is prohibited, unstarted, unallocated, unrecommended,
  and not activated.

## Task 45/60 — Global Keyboard Shortcuts and Shortcut Help Core (complete)

- Closed slice: `035-global-keyboard-shortcuts`.
- Activation baseline: `b8ad47d9079246cecf4c30c728bec1d3a4915b41`.
- Product checkpoint: `3e48ca9292f655543a79724aae674c387bdb2f0a`.
- Schema stays 26. There is **no migration and no schema change**, and no Rust, IPC, DTO, generated
  binding, or Tauri capability change of any kind; migrations 1–26 are untouched.
- Scope: **eight global keyboard commands, defined once in a single frontend registry that owns both
  dispatch and every displayed chord**. `Ctrl+1..6` for the six destinations in their existing
  sidebar order, `Ctrl+K` for Search, `Ctrl+/` for a read-only Keyboard shortcuts dialog.
- Windows `Control` is the authority: a chord matches only when `ctrlKey` is true and `altKey`,
  `shiftKey`, and `metaKey` are all false. There is no macOS or `Meta` mapping, and the existing
  handler's `metaKey` branch is removed rather than carried forward.
- Dispatch invariant: a chord executes only when it is not `defaultPrevented`, not `isComposing`, not
  `repeat`, no `role=dialog`/`aria-modal` modal is open, the event target is not an editable surface,
  and the chord matches the registry exactly.
- When suppressed the global layer does nothing at all, **including no `preventDefault()`**.
  Swallowing a key while declining to act on it is the defect that would stop `Ctrl+K` inserting a
  link in the editor, and the existing ad-hoc listener would have caused it.
- Editable authority is `input`, `textarea`, `select`, `contenteditable`, `role="textbox"`, and the
  Tiptap/ProseMirror editor root, resolved upward from the event target. Modal authority is the
  `role="dialog"` + `aria-modal="true"` pairing the product already uses; **no modal manager is
  introduced**.
- Every command reuses an existing product state transition: destinations call the same
  `selectDestination` the sidebar buttons call, including its pending-navigation clearing, and Search
  sets the same state the Search control sets. There is no second navigation implementation.
- The help dialog is generated by mapping over the registry, so it cannot drift from behaviour. A
  hard-coded chord anywhere outside the registry — handler, dialog, or test fixture — is a defect.
- **Nothing is persisted.** No SQLite row, no `localStorage` key, no preference, no backup or package
  participation. Custom remapping, a command palette, command search, executable help rows, chord
  sequences, and global OS-level hotkeys all remain prohibited.
- **Zero dependencies added.** `tinykeys`, suggested by source §22.3, is explicitly not adopted:
  eight fixed `Ctrl`+single-key chords have no grammar to parse, and the hard part — the suppression
  matrix — is not something a parser supplies.
- Starting bundle inventory measured before any product change: 22 chunks, 1,214,694 raw, 373,745
  deterministic gzip, 520,983 startup `index.js` — byte-identical to the accepted Task 44 inventory.
  Task 45 fits inside the **unchanged** Task 44 budget and cost 2,874 raw and 950 deterministic gzip
  bytes: final 523,857 startup raw, 1,217,568 total raw, 374,695 gzip, still 22 chunks, all maxima
  and the budget file unchanged. No new budget generation was created.
- Next action: Product Owner gate. Task 46 remains prohibited, unstarted, unallocated, and
  unrecommended. Full evidence is in `docs/audits/task-45-global-keyboard-shortcuts.md`.

## Task 44/60 — Life Relationship Graph Explorer Core (complete)

- Closed slice: `034-life-relationship-graph`.
- Activation baseline: `2d5b5d335137fe2a09f60b585d11a14a839b1e25`.
- Product checkpoint: `7e95644dcced19a1a8349706990d20d1df53a2e1`.
- Schema stays 26. There is **no migration and no schema change**; migrations 1–26 are untouched.
- Scope: a **read-only, transient explorer of the active Life hierarchy plus existing explicit
  directed Life links**. It stores no graph truth, never replaces Browse or Edit, and never creates,
  deletes, infers, or rewrites relationships.
- Edges: hierarchy edges come only from `parent_id` within the connected active tree; link edges come
  only from existing `life_links` rows. Nothing is inferred, derived, typed, or weighted.
- Bounds are 500 nodes, 2,000 links, and 128 levels, and the projection **rejects rather than
  truncates**. A partial graph that silently omits relationships is worse than no graph because the
  user would draw conclusions from a picture that is not the truth.
- A link with an endpoint outside the active tree is absent from the projection by definition, not by
  truncation; the underlying row is never deleted, disabled, or altered and Task 41 semantics are
  unchanged.
- Layout is the existing `d3-hierarchy` tidy tree over parent/child edges, with explicit links drawn
  as a separate pass. No force simulation, physics, worker, canvas, WebGL, persisted coordinate, or
  drag. **Zero dependencies added** — `d3-force`, Cytoscape, Graphology, and vis-network are
  prohibited, including as a way to avoid implementation work.
- Accessibility is load-bearing: the drawn surface is `aria-hidden` and non-interactive, and every
  relationship it draws has a text counterpart through a node selector, a selected-node inspector,
  and a complete semantic connection list.
- Graph is transient by construction. `life_navigation_preferences.last_life_mode` stays constrained
  to `('browse','edit','pinned','reader')`; no route, sidebar destination, or startup restoration is
  added, and a restart returns the user to the persisted mode.
- Starting bundle inventory measured before any product change: 21 chunks, 1,204,073 raw, 370,223
  deterministic gzip, 519,500 startup `index.js` — byte-identical to the accepted Task 43 inventory.
  Authorized Task 44 deltas against it are 2 KiB startup raw, 24 KiB total raw, and 8 KiB
  deterministic gzip.
- Next action: Product Owner gate. Task 45 remains prohibited, unstarted, unallocated, and
  unrecommended. Full evidence is in `docs/audits/task-44-life-relationship-graph.md`.

## Task 43/60 — Explicit Actual Time Sessions Core (complete)

- Closed slice: `033-explicit-actual-time-sessions`.
- Activation baseline: `ec2ae86417d7e65315582c808250b33009ebf1c3`.
- Product checkpoint: `b4510ddbffbd0e8c4d5ae84213973b723df4cbad`.
- Starting schema 25; schema 26 through one append-only migration adding exactly one table.
- Scope: manual, stopwatch-style actual time for **one-off Tasks only**. The user explicitly starts
  work, may stop and later start again, and each completed interval persists as an immutable
  segment. There is one active session globally, enforced by a partial unique index that is the
  authoritative concurrency defense.
- Independence: schedule edits never rewrite recorded time, actual time may be shorter or longer
  than planned, it never changes conflict rules, and it never completes, evaluates, or scores a
  Task.
- Clock: Rust owns UTC epoch-millisecond timestamps from `SystemTime`; `Instant` is never persisted
  or serialized. An active session measures wall-clock elapsed time including app close and reopen,
  backgrounding, and machine sleep, with no idle subtraction. A backwards clock rejects Stop rather
  than clamping or fabricating duration, leaves the session active, and offers Discard.
- Guards: a Task with an active session cannot be evaluated or deleted; an evaluated Task cannot
  Start until its evaluation is undone; full backup creation is blocked while any timer runs so a
  restored snapshot cannot reinterpret backup downtime as worked time.
- Recurring Tasks are deliberately excluded. Occurrence identity is `series_id +
  original_local_date` and a `ThisAndFuture` edit mints a new series identity, so universal timers
  would require inventing a recurrence-history identity model. This is scope control and allocates
  no downstream task.
- Analytics is unchanged. Actual-time aggregation would need separate policy for cross-midnight
  sessions, timezone changes, deleted history, category snapshots, and in-flight sessions; this
  slice captures trustworthy source data only.
- No surveillance: no idle detection, no keyboard, mouse, window, or process monitoring, no
  screenshots, and no automatic start, stop, or task switching.
- Starting bundle inventory measured before any product change: 20 chunks, 1,199,082 raw, 368,463
  deterministic gzip, 515,537 startup `index.js`, 545,679 total startup raw. Authorized Task 43
  deltas against the accepted Task 42 inventory are 4 KiB startup raw, 20 KiB total raw, and 7 KiB
  deterministic gzip.
- Next action: Product Owner gate. Task 44 remains prohibited, unstarted, unallocated, and
  unrecommended. Full evidence is in `docs/audits/task-43-explicit-actual-time-sessions.md`.

## Task 42/60 — Bounded Life Branch Interchange (complete)

- Closed slice: `032-bounded-life-branch-interchange`.
- Activation baseline: `08a76c2827c1d49556c1f255631cbe2b1a4a2437`.
- Product checkpoint: `9c5d0cfb6c5e64ba7a5acfd23464e6a8474954b9`.
- Starting schema 24; schema 25 through one migration that rebuilds only `life_operations`.
- Scope: a distinct Life Branch Package v1 (`format: lifeweave_branch_package`,
  `format_version: 1`, `.lifeweave-branch.zip`) that exports exactly one active connected non-root
  Life branch and imports it as a fresh subtree under a chosen active documentless parent.
- Included: hierarchy and sibling order, node metadata, committed Basic Leaf and Narrative Canvas
  documents, privacy-sanitized image assets, active canonical tags, and explicit links with both
  endpoints inside the branch. Everything else — archived nodes, drafts, history, pins, Tasks,
  Plans, Saved Views, analytics, settings, Search rows, cross-boundary links — is excluded and
  counted in safe omission warnings.
- Identity: fresh local IDs for every imported node, document, asset, link, and newly created tag.
  Source IDs are provenance only. Nothing is merged or overwritten by title, path, breadcrumb,
  description, content, or source ID; duplicate titles are valid.
- Atomicity: one SQLite transaction, exactly one tree-revision increment, one non-undoable
  idempotent `import_branch` operation, durable asset receipts with attempt-only file rollback, and
  zero database or file residue on any failure.
- Two live-schema conflicts were surfaced before implementation and resolved by explicit Product
  Owner decision in ADR 0036. First, `life_operations.operation_kind` has carried a fixed nine-value
  CHECK since migration 8 and SQLite cannot ALTER a CHECK, so storing the contract's
  `import_branch` kind requires a table rebuild; the Product Owner chose the migration over the
  zero-migration alternative, which overrides the activation contract's schema-24 expectation.
  Second, `tags.normalized_name` is globally UNIQUE, so an imported tag whose name is held by an
  unmerged archived tag has that single assignment omitted and warned rather than reviving the tag
  or failing the import.
- Starting bundle inventory measured before any product change: 17 chunks, 1,190,836 raw,
  364,842 deterministic gzip, 514,710 startup `index.js`, 544,852 total startup raw. Authorized
  Task 42 deltas against the accepted Task 41 inventory are 2 KiB startup raw, 24 KiB total raw,
  and 8 KiB deterministic gzip.
- Portable Package v1, database backup/restore semantics, whole-tree interchange, custom export
  profiles, Graph, routes, dependencies, and workflows/seal remain unchanged and prohibited.
- Next action: Product Owner gate. Task 43 remains prohibited, unstarted, unallocated, and
  unrecommended. Full evidence is in `docs/audits/task-42-bounded-life-branch-interchange.md`.

## Task 41/60 — Explicit Life Links + Backlinks Core (complete)

- Closed slice: `031-explicit-life-links`.
- Activation baseline and Task 40 remediation SHA: `6bcffe751458ee37a4cde663e21336a1f484a613`.
- Product checkpoint: `e1fe3675315c04590aabe9c9ca87ede344dafa40`.
- Starting schema 23; target schema 24 through one append-only `life_links` migration.
- Endpoint contract: active non-root document-backed Basic Leaf/Narrative Canvas Life leaf to
  another eligible leaf, directed and untyped, with stable node IDs as authority.
- Reader scope: lazy Links panel, explicit bounded search/add/remove, derived backlinks, exact-ID
  navigation/history, archive/unavailable projection, and full backup/reopen durability.
- Portable Package, Markdown, global Search semantics, Graph, whole-tree interchange, routes,
  dependencies, workflows/seal, and Task 42 remain unchanged and prohibited.
- Schema 24 migration, Rust authority, generated IPC, lazy Reader UI, cache invalidation,
  backup/reopen, accessibility, and 19 native phases are complete. Full evidence is in
  `docs/audits/task-41-explicit-life-links.md`.
- Performance transition: 17 chunks, 1,190,378 raw, 364,685 deterministic gzip, and 544,394
  startup raw; deltas from Task 40 are +9,044 / +3,090 / +1,666 bytes, within the 24/8/2 KiB
  ceilings. Task 40 evidence remains byte-identical and Task 41 owns the active versioned budget.
- Next action: Product Owner gate. Task 42 remains prohibited, unstarted, unallocated, and
  unrecommended.

## Task 40/60 — Release-Candidate Hardening + Evidence Baseline v2 (complete)

- Closed slice: `030-release-candidate-hardening`.
- Execution baseline: `fb2a240920414c05e7fd4235357b952a15611e8f`.
- Full evidence: `docs/audits/task-40-release-candidate-hardening.md`.
- Budget v2 froze against a deterministic build: three production builds from the clean baseline
  produced byte-identical normalized inventories (16 chunks, 1,181,334 raw, 361,595 deterministic
  gzip). Maxima are derived by documented `ceil` formulas and clamped by the locked ceilings; the
  derived per-chunk limit is binding everywhere.
- No safe bundle reduction was admissible. Zero duplicated modules; the one eager-import candidate
  (`LifeEditWorkspace`, sole importer of `d3-hierarchy` and the sortable layer) removes 65,218 bytes
  from the startup chunk but raises total raw by 879 and gzip by 1,898, which the locked baseline
  rule forbids. It is recorded as a measured, rejected candidate and left as an explicit Product
  Owner trade-off.
- Both `clippy::type_complexity` findings were corrected with a named row alias and one shared
  reader. No suppression, no lint-level change, no test exclusion; backup coverage is equivalent.
- Four native phases now cover Task 38 deadlines and Task 39 Saved Views through accessible
  selectors only, including restart persistence and full backup/restore with a restart companion.
  Each was proven to fail on a deliberate break of its central behaviour, and every break was
  reverted.
- Two pre-existing native test-determinism defects were found by the mandated release run: a
  `normalize-space()` label selector in phase 8 restart that stops matching once a textarea holds
  persisted text (corrected), and a structural time-of-day dependency in phase 6 that cannot pass
  before 05:00 local because `validate_range` starts the day at 04:00. Both are now corrected — see
  the post-closure remediation entry below.
- Accessibility: 604 frontend tests pass, including five new cross-cutting contracts covering modal
  keyboard containment, focused error announcement, Deadline queue naming and reachability with zero
  axe violations, colour-independent status, and roving tablist state. Native UIA inspection through
  the Windows SDK client API found zero unnamed focusable elements inside the app document subtree
  and no priority-1 findings.
- P2 manual physical Narrator/DPI execution remains external evidence debt. The protocol and
  machine-verifiable coverage are complete.
- One P2 product defect was recorded and deliberately not fixed within the slice: creating or
  restoring a Saved View drops the result selection, because the panel clears a selected id that is
  absent from the still-stale active list. It was fixed post-closure — see the entry below.
- Task 40 is **not** a feature checkpoint. At Task 40 closure the latest feature task remained 39 at
  `374abcbae263be18fa785a56d656678f9bfd9c29`; Task 41 subsequently closed as the next feature.
- Canonical decision: ADR 0034, taking up the Hardening candidate ADR 0028 scored at 8.055.
- Schema stays 23; no migration was added and no released migration was touched.
- Four debts were reproduced from the clean baseline before any edit: the aggregate JavaScript
  budget failed at `total_js_bytes=1181334` against a `1150000` maximum while tracking four of
  sixteen chunks; the exact all-target/all-feature Clippy command failed on two `type_complexity`
  findings in backup test code; native Windows E2E ended at Focus Plans and covered neither Deadline
  nor Saved Views; and Task 30 physical Narrator/DPI evidence debt was still open.
- Budget v2 is a new versioned file. `docs/audits/task-16-performance-budgets.json` is preserved
  byte-identically as history rather than edited, and no longer feeds the gate.
- Gates: governance, source integrity, index, typecheck, 604 frontend tests, production build,
  performance v2, `cargo fmt`, exact all-target/all-feature clippy, 590 Rust tests serial (4
  ignored), production installer, 13 of 15 native phases, and RC dogfood all pass.
- Installer `Lifeweave_0.0.0_x64-setup.exe`, 5,087,854 bytes, sha256
  `fc7745d596c5684d6100f61d3b985ab67942ac52ac0a2de7d9c693a45f77193c`, release mode, schema 23, with
  the `e2e-test` capability confirmed absent from the release binary.
- Residual debt: physical Narrator/DPI execution; reduced-motion and forced-colors contracts not
  machine-assertable in jsdom; and the recorded startup-size trade-off decision. The phase 6 and
  Saved View selection debts are closed by the remediation below.
- Out of scope and unchanged: product features, schema 24, recurring deadlines, actual time,
  backlinks, interchange, Graph, Noteboard, score, prediction, reminders, notifications, sync,
  sharing, telemetry, updater, signing, store distribution, dependencies, lockfile, workflows, and
  the workflow seal.

### Task 40 post-closure remediation

Task 40 stays closed; two bounded findings it recorded as open were fixed afterwards from baseline
`2cad1c874015c0f60b63dac14ea0c58994d62b98`. Full evidence in §11 of the Task 40 audit.

- **Saved View selection race (P2, fixed).** `TaskSavedViewsPanel` set `selectedId` before awaiting
  the lifecycle refetch, so the stale-selection effect saw the new id against the old active list
  and cleared it. Both mutations now select only after `refreshLifecycle()` resolves; archiving
  still clears its selection before the refetch, because that view is leaving. Three frontend tests
  added — create and restore both fail on the baseline with nothing selected, and a third proves
  legitimate stale-selection cleanup still works. Phase 9 no longer clicks the view it just created
  or restored and asserts `aria-pressed` directly.
- **Phase 6 time-of-day dependency (fixed).** The assessment-fan lifecycle moved from the
  today-scheduled `E2E Today Fan` to the overdue `E2E Past Review`, reached through the Overdue →
  Review navigation the phase already used. An overdue Task is assessable at any hour, so the phase
  no longer depends on the clock. No eligibility rule, `validate_range`, or assertion was weakened;
  every existing assertion is retained.
- Gates: 607 frontend tests (42 files), typecheck, build, verify, governance unit tests, performance
  v2 (violations `[]`), `cargo fmt`, full-target clippy, 590 Rust tests serial (4 ignored), and
  **15/15 native phases** run at 01:19–01:26 local — inside the window that previously made phase 6
  un-runnable. `pnpm tauri build` and `pnpm hardening:rc` were not re-run: no Rust, schema,
  migration, dependency, or IPC surface changed.
- Schema stays 23. No migration, Rust production code, dependency, lockfile, generated binding,
  workflow, or seal change. Performance budget v2 unchanged. Project State unchanged. No Slice 031
  and no Task 41 work.

## Task 39/60 — Task Saved Views + Bounded Typed Filter Core (complete)

Closed through Slice `029-task-saved-views` from baseline
`eed299d950bb43c54540a0466901f651aa60ce4a` at product checkpoint
`374abcbae263be18fa785a56d656678f9bfd9c29`. The bounded Task-only model reuses four canonical
source scopes, applies a versioned Rust-owned typed AND predicate, stable sort/group modes,
local lifecycle and order, and adds a fifth Views tab inside Today. Schema 23 adds only the
standalone `task_saved_views` table and active-order index.

Lifecycle, AST bounds, unsupported persistence, archived/missing/merged references, source
preservation, exact recurring navigation, bulk loading, 5,000-item errors, generated bindings,
full backup/restore/reopen, keyboard behavior, and axe checks have deterministic coverage. The
full baseline diff review found one test-evidence gap in the backup equality tuple; it was fixed
before the checkpoint and the focused test passed. Canonical governance, typecheck, frontend
tests (596), production build, Rust fmt/clippy/tests (587 passed plus 4 designated ignored),
generated drift, and diff checks passed.

No query language, raw SQL/expression path, custom range, route/sidebar/default change, sharing,
Task card/dashboard, recurring deadline, analytics expansion, dependency, or workflow change is
authorised. Task 39 is closed; Task 40 is prohibited, unstarted, unallocated, and unrecommended.

## Task 38/60 — One-Off Task Deadline Semantics + Deadline Queue (complete)

- Closed slice: `028-one-off-deadline-semantics`.
- Feature checkpoint: `cace17bd4225cb8e3d89795c0e833e68ed588ba2`.
- Canonical decision: ADR 0032, taking up the candidate ADR 0028 scored highest and ADR 0029 deferred.
- Schema 22 is active through an append-only migration; migrations 1–21 remain unchanged.
- Deadline authority is `tasks.deadline_local_date` only. Recurring series, occurrences, overrides, and evaluations own no deadline, and no future-ready recurring column was added.
- Schedule and deadline are independent in both directions; `scheduled_date <= deadline_date` is not an invariant and scheduling after a deadline is surfaced as `scheduled_after_deadline`, never repaired.
- Deadline state is computed from an explicitly supplied observed local date, so `list_today_items` and `list_tasks_for_date` gained that parameter rather than mislabelling a Task inspected on a future day.
- The Deadlines tab covers anchor -30 through anchor +14 inclusive, excludes null deadlines, evaluated Tasks, and recurring work, and returns a deterministic error instead of truncating at the 5,000 item cap.
- Existing Overdue keeps its schedule-based meaning and is not renamed; a Task may legitimately appear in both views.
- Search composes deadline context at query time from the observed date, so state can never go stale; no index, `algorithm_version`, or rebuild change was needed.
- Calendar required no change: its month grid delegates day activation to the Today list, and `has_missed`, scheduled minutes, and load ratios remain schedule and evaluation based.
- Rust format/clippy/tests (572 serial), frontend typecheck/tests (585), production frontend build, generated-binding stability, and repository governance passed.
- Migration, close/reopen, and full backup/restore evidence covers deadlines.
- No workflow, seal, dependency, lockfile, or capability-scope drift entered the change.

Task 38 is closed. Reopen only for a reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision.

Post-closure remediation: Task 38 widened the Today query key to `["today-items", localDate, observedLocalDate]` but left the evaluation and undo optimistic-cache paths on the old two-part key, so a successful evaluation could update a different cache entry than the one Today rendered. Repaired with a single canonical `todayItemsKey` helper used by the query, cancel, read, optimistic write, rollback, success, and undo paths, plus `deadline-queue` invalidation on evaluation and undo since a current evaluation controls active queue membership. Frontend-only; no schema, Rust, IPC signature, binding, dependency, or workflow change. Regression coverage proves the rendered row transitions and reverts, and three of the four new tests fail against the pre-fix implementation. Verified with focused Today tests, frontend typecheck, 589 frontend tests, and the production build.

## Task 37/60 — Focus Plan ↔ Task Integration + Manual Review History (complete)

- Closed slice: `027-focus-plan-task-review`.
- Feature checkpoint: `09c393737fd6f096780408a803aea9b6e1355bb8`.
- Canonical decision: ADR 0031.
- Schema 21 is active through an append-only migration; migrations 1–20 remain unchanged.
- Relationship authority is stored on `tasks` and `task_series`; occurrences, overrides, and evaluations inherit and own nothing.
- All three recurring edit scopes hold: occurrence scope cannot change the relation, entire-series owns it absolutely, and a this-and-future split keeps the old series relation while the new series inherits or takes an explicit forward choice.
- An existing link survives Plan archive and unrelated edits, projects explicitly as archived, and returns to ordinary projection on restore.
- Manual reviews are create-and-read only, idempotent by `operation_id`, bounded newest-first, and change no Plan state.
- Rust format/clippy/tests (546 serial), frontend typecheck/tests (573), production frontend build, generated-binding stability, and repository governance passed.
- Migration, close/reopen, and full backup/restore round-trip evidence covers relations and reviews.
- Today remains startup/default, Task rows remain non-card, and Life semantics remain unchanged.
- The separate independent-review agent could not run: its environment hit a session quota. An equivalent structured review was performed directly and is recorded as disclosed verification debt.
- No workflow, seal, dependency, lockfile, or capability-scope drift entered the change.

Task 37 is closed. Reopen only for a reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision.

## Task 36/60 — Focus Plans Core + Draft/Active Lifecycle (complete)

- Closed slice: `026-focus-plans-core`.
- Feature checkpoint: `57bd42d8eed5643d2fee3b04f74bd3c44e738da2`.
- Canonical model: standalone Focus Plan entity.
- Schema 20 is active through an append-only migration; migrations 1–19 remain unchanged.
- Backend core, IPC, tags, Search, backup/restore, generated bindings, Plans UI, recovery-draft loading, and native smoke scenarios are implemented.
- Focused frontend typecheck/tests, Rust migration/core/backup/tag/Search tests, generated-binding stability, diff checks, production frontend build, and repository governance passed during Task 36 stabilization.
- Persisted SQLite artifacts confirmed committed Plan state, lifecycle, outcome, phase ordering, and revision updates.
- Native Windows restart automation is non-blocking tooling coverage. Its harness failures did not demonstrate a reproducible product defect and do not keep Task 36 open.
- Runtime patch scripts and all temporary Task 36 workflows were removed.
- GitHub Actions on `main` contains only the sealed manual, read-only Windows installer build.
- Today remains startup/default; Life semantics remain unchanged.
- No Task 37 relation, review workflow, or automatic progress behavior entered schema 20.

Task 36 is hard-closed. Reopen only for a reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision.

## Historical status

Task 1–33 history remains preserved at [`docs/status-history/STATUS-through-task33.md`](status-history/STATUS-through-task33.md). Task 34–35 evidence remains in accepted ADR and audit records.
