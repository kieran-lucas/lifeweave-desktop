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

- Latest closed task: **42/60**
- Latest closed slice: **032 — Bounded Life Branch Interchange**
- Active task: **43 — Explicit Actual Time Sessions**
- Active implementation specification: **`specs/033-explicit-actual-time-sessions`**
- Latest feature checkpoint: **Task 42 — Bounded Life Branch Interchange** (`9c5d0cfb6c5e64ba7a5acfd23464e6a8474954b9`)
- Database schema: **26**
- Next action: **Implement active spec**
- Task 44: **prohibited, unstarted, unallocated, and unrecommended**

## Task 43 activation

Task 43 is active from baseline `ec2ae86417d7e65315582c808250b33009ebf1c3`. It adds **manual,
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
[ADR 0037](docs/adr/0037-explicit-actual-time-sessions.md).

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
