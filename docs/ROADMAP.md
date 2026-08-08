# Roadmap

## Slice 040 — Global Layout System + UI Surface Completeness (active)

Task 50 activates ADR 0044. Forty-nine closed tasks each added a screen and, with it, a private
answer to "how wide is a page?" — seven maximum widths, three centring rules and three page-local
paddings stacked on the one shared viewport gutter. Slice 040 replaces that with a single geometry
authority and a finite page taxonomy: `STANDARD_PAGE` 1152, `WIDE_WORKSPACE` 1440, `READING_PAGE`
768, `MODAL_SURFACE` 520/720/960, and `LOCAL_SCROLL_WORKSPACE` for the graph canvas, the tree canvas
and wide tables.

Three defects are structural rather than cosmetic and are repaired at source. The Task create/edit
dialog renders a bare `<form>` inside a fixed backdrop with no surface, width, padding, scroll
container or grid, and is rebuilt as a real contained dialog with a deterministic field grid.
Settings produces a measured 15 px document-level horizontal scrollbar because the application root
is sized `width: 100vw`, which by definition includes the classic scrollbar gutter. The Today
timeline row declares three grid tracks while rendering up to four children.

Ordinary screens must satisfy `scrollWidth <= clientWidth + 1` at the document root, the main
viewport and the page frame, at 1280×720, 1440×900 and 1920×1080, in both sidebar states and in both
empty and populated states. Concealment is prohibited: no global `overflow-x: hidden`, no
negative-margin clipping, no `translateX` compensation and no `scale()` to fit. Invariants are proven
by real WebView measurement in native phase 21, never by jsdom.

The slice also completes UI surface coverage: every already-decided, implemented user-facing
capability must have a visible path in its valid context, using existing IPC only. The census found
one missing surface — Task edit, Task delete and recurring-occurrence edit were reachable only by an
invisible double-click or `Enter` gesture — and zero blocked surfaces.

Task 50 is a **layout and evidence slice, not a feature slice**; following the Task 40 precedent it
does not advance `latest_feature_task`. Schema stays 27 with no migration, no Rust product change,
no new IPC command, no new capability and no new dependency. Art direction — palette, brand, font
family, icon language, radius and shadow language, illustration, Visual World art, motion and sound
— is explicitly excluded and remains unallocated for a later Product Owner gate.

## Slice 039 — Focus Plan Activity Analytics Core (complete)

Task 49 activates ADR 0043. Task 37 linked work to Plans and added manual reviews but deliberately
prohibited Plan analytics because no decision existed about what a Plan number would mean. ADR 0043
answers only the factual case: Analytics may report Focus Plan activity over the same
week/month/year periods Objective Analytics already owns.

Reporting attributes one-off Tasks and generated non-cancelled recurring occurrences through their
**current** authoritative Task/series → Plan relationship, manual reviews through
`reviewed_local_date`, and completed actual time only through linked one-off Tasks under Task 46
arithmetic. Relinking moves retrospective attribution because the relationship, not a stored copy
of it, is the authority.

Schema stays 27 with no migration, no historical Plan-link snapshot, no occurrence-owned relation,
and no persistent Plan aggregate. Exactly one read-only IPC command feeds a lazy `Focus Plan
activity` section inside the single Analytics destination, bounded at 500 qualifying Plans with
rejection rather than truncation.

Hard boundary: no automatic Plan progress, phase relationships, scoring, health, prediction,
automatic lifecycle, completion percentage, target-date lateness analytics, review content
analytics, review edit/delete/archive/scheduling/search, many-to-many Task→Plan, schema 28,
dependency, destination, chart library, workflow/seal change, or Task 50 work. Task 49 closed at
product checkpoint `7622db3d8b2b42d69c8f497b6899c5be82e9f9a9` with schema 27. Task 50 is
prohibited, unstarted, unallocated, and unrecommended.

## Slice 038 — Managed Backup Retention and Compatibility Core (complete)

Task 48 activates ADR 0042 to bound existing managed backups without creating Backup v3. Lifeweave
keeps the fresh backup and up to 11 other recent packages the current binary can restore. Cleanup
runs only after staging verification, durable atomic publication, and final-package verification;
fresh, newer-format, newer-schema, malformed, safety, staging, restore, and outside-root artifacts
are never automatically removed. Cleanup failure preserves successful creation.

Schema stays 27 and backup format stays v2. Supported older schemas remain restorable through the
existing candidate migration without source rewrite; future versions remain backend-rejected.
Backup & Restore moves from Foundation tooling into lazy first-class Settings content with explicit
compatibility metadata and accessible confirmation.

Hard boundary: no configurable/manual/scheduled/cloud backup management, format or schema change,
dependency, capability broadening, background worker, workflow/seal change, or Task 49 work.
Task 48 closed at product checkpoint `51e24c54f12f0236ecba1bd81936bc11db59f8ac` with schema 27
and backup format v2. Task 49 is prohibited, unstarted, unallocated, and unrecommended.

## Slice 037 — Whole-Life Tree Interchange Core (complete)

Task 42 shipped exactly one active connected non-root branch and left the complete active forest
OPEN. ADR 0041 is the Product Owner decision that closes only that complete active non-root case.

Task 47 exports every active non-root node reachable beneath `life-root` at one snapshot as one
distinct Life Tree Package v1. `life-root` itself never travels. Import appends the verified ordered
forest beneath one existing active documentless destination with fresh identities and zero merge,
replace, delete, overwrite, or reorder of existing content. Task 42 document, privacy-safe asset,
tag, link, archive-hardening, staging, and atomicity authority remains binding where identical.

Schema advances 26→27 only to admit truthful `import_tree` operation rows by rebuilding
`life_operations` without losing columns, rows, kinds, constraints, foreign keys, indexes,
revisions, or `undone_at`. Branch Package v1, Portable Package v1, and backup remain distinct and
unchanged. Locked performance ceilings remain unchanged.

Hard boundary: no arbitrary selected multi-branch export, custom profile, archived transfer,
workspace package, backup replacement, merge/replace/conflict mode, dependency, generic interchange
framework, route/sidebar, workflow/seal change, or Task 48 work.

Task 47 closed at product checkpoint `1c42ac5358579dc8795e4b7c1b76bc004b0269f1` with schema 27.
Task 48 remains prohibited, unstarted, unallocated, unrecommended, and is not the next candidate.

## Slice 036 — Planned versus Actual Analytics Core (complete)

Task 43 created trustworthy explicit actual-time segments for one-off Tasks but deliberately left
Analytics unchanged because attribution and comparison policy were OPEN. ADR 0040 is the Product
Owner decision that closes only that loop.

Task 46 extends the existing Analytics projection with a **completed-only, read-only
planned-versus-actual summary**. Reporting uses each owning Task's current scheduled local date and
current category. Cross-midnight sessions are not split; running and discarded-active sessions
contribute nothing; deleting a Task removes its session contribution through the existing cascade.

The comparison denominator is the scheduled duration once per tracked Task. Untracked Tasks remain
in existing scheduled totals but do not dilute the tracked plan. Segment milliseconds sum per Task
before flooring to whole seconds, and checked Rust arithmetic owns overall and category totals.

Schema stays 26 with no migration, snapshot, persistent actual-time aggregate, dependency, new IPC,
or capability. The existing Analytics algorithm advances to version 2, and the first successful
Stop closes its segment and bumps the existing Analytics source revision exactly once in the same
transaction. All Task 12 scheduled totals, completion distribution, category goal/streak, and
evaluation semantics remain unchanged.

Hard boundary: no recurring actual time, manual entry, completed-segment editing/deletion, automatic
tracking, surveillance, billing, export, actual time outside Analytics, deadline or Plan analytics,
score, prediction, new route/destination, chart library, dependency, schema 27, workflow/seal change,
generic reporting framework, deep visual polish, or Task 47 work.

Task 46 closed at product checkpoint `e7454241576f3c7284a3433db8844c0c5f208e52` with schema 26.
Task 47 remains prohibited, unstarted, unallocated, unrecommended, and is not the next candidate.

## Slice 035 — Global Keyboard Shortcuts and Shortcut Help Core (complete)

Every destination and Global Search already exist and are already reachable — with the mouse. What
is missing is a keyboard route to them. `shortcut map` has sat under `OPEN — Product/UX` in
`docs/DECISION_REGISTRY.md` since the registry was created, while the same registry lists the
keyboard command registry and accessibility foundation as locked technical ground: the substrate was
decided and only the mapping was not. ADR 0039 is the Product Owner decision that closes it.

Task 45 adds **eight global keyboard commands, defined once in a single frontend registry that owns
both dispatch and every displayed chord**: `Ctrl+1..6` for the six destinations in their existing
sidebar order, `Ctrl+K` for Search, and `Ctrl+/` for a read-only Keyboard shortcuts dialog that is
generated from the registry and therefore cannot drift from behaviour.

Windows `Control` is the authority; there is no macOS map. Schema stays 26 with no migration and no
Rust, IPC, DTO, or capability change, and no dependency is added — `tinykeys` is explicitly not
adopted, because eight fixed `Ctrl`+single-key chords have no grammar to parse.

The hard part is suppression, not dispatch. A chord executes only when it is not `defaultPrevented`,
not composing, not a key repeat, no modal is open, focus is not in an editable surface, and the chord
matches exactly. When suppressed the global layer does nothing at all, **including no
`preventDefault()`** — swallowing a key while declining to act on it is what would stop `Ctrl+K`
inserting a link in the editor. Every command reuses the state transition its existing click path
already uses, so a shortcut cannot diverge from the button it mirrors.

Hard boundary: no shortcut persistence, customization, remapping UI, import, export, or backup
participation, no command palette, command search, or executable help row, no chord sequences or
`Alt`/`Shift` chords, no macOS or `Meta` mapping, no global OS-level hotkey, no editor keymap change,
no new route or sidebar destination, no schema, Rust, IPC, dependency, capability, workflow, or seal
change, no new performance-budget generation, and no Task 46 work is authorized.

## Slice 034 — Life Relationship Graph Explorer Core (complete)

Life can already show structure two ways and relationships one way, never both at once. Browse shows
one node and its direct children. Edit shows the whole active tree but knows nothing about links. The
Links panel shows one leaf's outgoing links and backlinks, one source at a time. `Graph` has sat under
`OPEN — Product/UX` in `docs/DECISION_REGISTRY.md` since the registry was created; ADR 0038 is the
Product Owner decision that resolves the narrow case.

Task 44 adds a **read-only, transient explorer of the active Life hierarchy plus existing explicit
directed Life links**. The relationships already exist and are already authoritative — only the view
is new. It stores no graph truth, never replaces Browse or Edit, and never creates, deletes, infers,
or rewrites relationships.

Schema stays 26 with no migration and no schema change, and no dependency is added: the layout is the
`d3-hierarchy` tidy tree Life Edit already computes, with explicit links drawn as a second pass over
those positions.

The explorer is bounded at 500 nodes, 2,000 links, and 128 levels and **rejects rather than
truncates**. Graph is transient by construction: it is never a persisted Life mode, route, or sidebar
destination, and a restart returns the user to the persisted mode. The drawn surface is `aria-hidden`
and every relationship it draws has a required text counterpart.

Hard boundary: no persisted graph truth of any kind, no editing from the Graph, no inferred, derived,
typed, or weighted edges, no clustering, pathfinding, centrality, or ranking, no non-Life endpoints,
no graph in Search, Analytics, Calendar, Today, Saved Views, Focus Plan, backup, or packages, no
force simulation, physics, worker, canvas, or WebGL, no new dependency, capability beyond one command
permission, workflow or seal change, and no Task 45 work is authorized.

## Slice 033 — Explicit Actual Time Sessions Core (complete)

Task 43 activates the last unshipped candidate from the ADR 0028 PASS portfolio. Deadline (38),
Saved Views (39), Hardening (40), Links (41), and Interchange (42) have all landed; Actual Time
scored 7.405 and `docs/DECISION_REGISTRY.md` still lists "actual-time semantics" as OPEN. ADR 0037
is the Product Owner decision resolving that entry.

Lifeweave records what was **planned** and, retrospectively, **how it went**. It has never recorded
how long work actually took. Task 43 adds manual stopwatch-style actual time for **one-off Tasks
only**: explicit user-started sessions, one active timer globally, persisted immutable segments, and
no surveillance of any kind.

Schema advances 25 to 26 through one append-only migration adding a single
`task_actual_time_sessions` table whose partial unique index is the authoritative single-active
defense. Rust owns wall-clock epoch-millisecond timestamps; `Instant` is never persisted. A
backwards clock rejects Stop rather than fabricating duration. Full backup creation is blocked while
a timer runs so a restored snapshot cannot reinterpret downtime as worked time.

Hard boundary: recurring actual time is excluded because occurrence identity changes under
`ThisAndFuture`, and Analytics semantics are unchanged because actual-time aggregation needs
separate policy. No manual time entry, editing of completed segments, auto start/stop/switching,
idle detection, monitoring or screenshots, Pomodoro, billing, export, per-project reporting, Actual
Time in Calendar/Search/Saved Views/Focus Plan/Life, scoring, prediction, notifications, new route,
sidebar item, dependency, capability, workflow/seal change, or Task 44 work is authorized.

## Slice 032 — Bounded Life Branch Interchange (complete)

Task 42 activates the Interchange candidate ADR 0028 scored at 7.610, narrowed by the explicit
Product Owner decision in ADR 0036 to exactly one branch. Lifeweave already moves the whole
workspace (database backup/restore) and one document (Portable Package v1). The remaining gap is the
unit users actually think in: one connected Life branch with its structure, documents, images, tags,
and the links its own leaves make to each other.

A distinct **Life Branch Package v1** (`format: lifeweave_branch_package`, `format_version: 1`,
`.lifeweave-branch.zip`) exports one active connected non-root branch and imports it as a fresh
subtree under a chosen active documentless parent. Every imported node, document, asset, link, and
newly created tag receives a fresh local ID; nothing is merged or overwritten by title, path, or
source ID. Import is atomic — one transaction, exactly one tree-revision increment, one non-undoable
idempotent operation — and any failure leaves zero rows and zero new files with the source
unchanged.

Schema advances 24 to 25 through one migration that rebuilds only `life_operations` so the ledger
can store the truthful `import_branch` kind. This deviates from the activation contract's
no-migration expectation and was decided explicitly by the Product Owner after the conflict was
surfaced; ADR 0036 records it, together with the decision to omit and warn a tag assignment whose
normalized name is held by an unmerged archived tag.

Hard boundary: Portable Package v1 and database backup semantics are unchanged, and no whole-tree or
multi-branch interchange, custom export profile, cross-boundary link transfer, archived-node
transfer, Graph, prediction, Noteboard, tags or backlink expansion, new route, sidebar item,
dependency, workflow/seal change, generic interchange framework, or Task 43 work is authorized.

## Slice 031 — Explicit Life Links + Backlinks Core (complete)

Task 41 activates the bounded Links/Backlinks candidate from ADR 0028 through the explicit Product
Owner decision in ADR 0035. The historical 0.060 score lead for Whole-tree Interchange is not
permanent allocation authority: stable Life IDs, committed Basic/Narrative documents, Reader
navigation, Vietnamese Search normalization, archive/restore, and full backup now make explicit
links the smaller composable slice, while workspace interchange still requires broader identity
collision/remap policy.

Schema 24 adds exactly one directed `life_links` table. Both endpoints are active non-root Life
leaves with exactly one supported committed document at creation; IDs, not titles or content, are
authority. Backlinks are derived, archive preserves edges, restore re-enables navigation, and full
backup/restore preserves exact identity and direction. A lazy Reader panel provides explicit
add/outgoing/backlink/remove workflows and exact-ID history-preserving navigation.

Hard boundary: no inline/title-parsed/inferred links, anchors, labels/types, branch or non-Life
endpoints, Graph, Search entity, Portable Package/Markdown expansion, whole-tree interchange, new
route/dependency/workflow/seal change, or Task 42 work.

Task 41 closed at product checkpoint `e1fe3675315c04590aabe9c9ca87ede344dafa40` with schema 24,
all 19 native phases, release-candidate hardening, and the versioned Task 41 performance budget
green. Closure evidence is in `docs/audits/task-41-explicit-life-links.md`. No next candidate is
allocated or recommended.

## Slice 030 — Release-Candidate Hardening + Evidence Baseline v2 (complete)

Task 40 activates the Hardening candidate ADR 0028 scored at 8.055 — the highest-ranked remaining
eligible candidate now that Deadline (8.420) and Saved Views (8.095) have shipped as Tasks 38 and
39. Unlike the remaining product candidates it is backed by reproduced debt rather than a product
hypothesis, and it is explicitly a release-quality investment rather than a feature.

Four bounded workstreams: a truthful versioned performance budget v2 that replaces the obsolete
aggregate JavaScript gate while preserving Task 16 history byte-identically; a green
all-target/all-feature Rust Clippy gate achieved by correction rather than suppression; native
Windows E2E evidence for Deadline and Saved Views including restart and full backup/restore; and
expanded machine-verifiable accessibility coverage plus an executable Windows Narrator/DPI protocol
that never reports an unobserved manual result as PASS.

Hard boundary held: product behavior unchanged, schema stays 23, no migration, no route/destination/
sidebar/card/dashboard/startup change, no dependency or lockfile churn, no workflow or seal change,
no lint suppression, test weakening, source-map removal, or arbitrary budget inflation. Task 40 is
not a feature checkpoint — the latest feature task remained 39 until Task 41 closed.

Closure evidence is in `docs/audits/task-40-release-candidate-hardening.md`. Residual debt is
disclosed rather than implied: physical Narrator/DPI execution was not performed, native phases 6
and 6-restart are structurally un-runnable before 05:00 local time and were not executed, and two
findings — a rejected startup-size trade-off worth 65,218 startup bytes, and a P2 Saved View
selection defect surfaced by the new native evidence — are recorded for a Product Owner decision
rather than actioned inside this slice.

## Slice 029 — Task Saved Views + Bounded Typed Filter Core (complete)

Task 39 implements the Saved Views product runner-up recorded by ADR 0028 using the explicit
Product Owner model in ADR 0033. A Saved View filters exactly one existing bounded Today,
Upcoming, Overdue, or Deadlines projection through Rust-owned typed predicate v1, then applies
one stable sort and group mode. It is managed in a fifth internal Today tab; Today remains the
startup/default tab.

Schema 23 adds only standalone `task_saved_views`. Closure is supported by deterministic
migration, lifecycle, predicate, source-preservation, reference, navigation, query-shape,
accessibility, backup/reopen, generated-artifact, build, regression, and full-diff evidence.
No query language, generic
saved-query framework, unbounded/custom horizon, Search entity, sidebar route, dashboard/card,
sharing/sync, recurring deadline, analytics expansion, or Task 40 work is authorised.

## Slice 028 — One-Off Task Deadline Semantics + Deadline Queue (complete)

Task 38 activates the deferred Deadline Semantics candidate from ADR 0028 as the one-off-only
first slice that decision already framed.

```text
schedule = when the user plans to perform the work
deadline = the latest local date the work should be completed by

one-off Task → deadline: zero or one
recurring series/occurrence/override/evaluation → no deadline authority
```

Schema moves from 21 to 22 through an append-only migration. The slice adds an optional
deadline to the existing Task editor, deadline context on Today/Upcoming/Overdue/Search, and a
bounded Deadlines tab covering anchor -30 through anchor +14 inside the Today workspace.

Hard boundary preserved: existing Overdue kept its schedule-based meaning, recurring deadline
policy stays open, and no reminders, notifications, scheduling, deadline analytics, prediction,
Saved Views, or new destination entered migration 22, the DTOs, or the UI. Task 39 was not
activated.

Closure is based on deterministic migration, mutation, deadline-state, queue, Search, and
backup/restore evidence, generated-binding stability, production build success, and a full diff
audit against the activation baseline.

## Slice 027 — Focus Plan ↔ Task Integration + Manual Review History (complete)

Task 37 connects the existing product layers and completes the reserved Focus Plans program.

```text
one-off Task     → Focus Plan: zero or one
recurring series → Focus Plan: zero or one
occurrence/override/evaluation → inherited projection only
```

Schema moves from 20 to 21 through an append-only migration. The slice adds optional Plan
association in the existing Task editor, Plan context and navigation on Today/Upcoming/Overdue
rows, bounded Linked work and Reviews regions on Focus Plan detail, and create-and-read manual
review history.

Hard boundary preserved: no automatic progress, lifecycle automation, review scheduling,
analytics expansion, deadline semantics, or new destination entered migration 21, the DTOs,
or the UI. Task 38 was not activated.

Closure is based on deterministic migration, recurrence-authority, projection, review, and
backup/restore evidence, generated-binding stability, production build success, and a full
diff audit against the activation baseline.

Task 36 implemented ADR 0030 as a standalone local entity with schema 20, lifecycle, variants/phases, revisions/recovery, shared tags, Search, full-database backup authority, generated IPC bindings, and a lazy Plans workspace.

Closure is based on deterministic migration/domain/frontend/backup/Search evidence, generated-binding stability, production build success, inspected persisted SQLite state, and Product Owner acceptance. Native Windows restart automation remains optional smoke coverage and is not a roadmap gate unless it exposes a reproducible product defect.

Hard boundary preserved: Task 37 did not enter Slice 026. No Task/series relation, review workflow, or automatic progress entered migration 20, DTOs, Search, or UI.

## Slice 025 — Focus Plans Architecture Prototype + Canonical Model Decision (complete)

Task 35 selected the standalone Focus Plan entity. ADR 0030 is canonical.

## Reserved positions within the 60-task roadmap

- **Task 36:** complete and hard-closed.
- **Task 37:** complete and closed. The reserved Focus Plans program is finished.
- **Task 38:** complete and closed.
- **Task 39:** complete and closed at product checkpoint `374abcbae263be18fa785a56d656678f9bfd9c29`.
- **Tasks 40–49:** complete. **Tasks 50–60:** available only for later Product Owner decisions; none
  is activated or recommended. Task 50 is prohibited, unstarted, unallocated, and unrecommended.
- **Recurring deadline policy:** open; deliberately excluded from Slice 028.

## Closure policy

Roadmap progression is blocked only by confirmed product risk, not by a flaky or nondiagnostic harness. Equivalent deterministic evidence may replace a named E2E command. After two reruns without new diagnostic evidence, tooling failure becomes non-blocking debt unless it reproduces a product invariant violation.
