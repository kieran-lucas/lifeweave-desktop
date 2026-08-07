# Roadmap

## Slice 034 — Life Relationship Graph Explorer Core (active)

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
- **Tasks 40–60:** available for later decisions; none is activated or recommended. Task 40 is
  explicitly prohibited and unrecommended after Slice 029 closure.
- **Recurring deadline policy:** open; deliberately excluded from Slice 028.

## Closure policy

Roadmap progression is blocked only by confirmed product risk, not by a flaky or nondiagnostic harness. Equivalent deterministic evidence may replace a named E2E command. After two reruns without new diagnostic evidence, tooling failure becomes non-blocking debt unless it reproduces a product invariant violation.
