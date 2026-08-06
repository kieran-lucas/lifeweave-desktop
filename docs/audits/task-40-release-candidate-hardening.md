# Task 40 — Release-Candidate Hardening Audit

```text
slice: 030-release-candidate-hardening
activation baseline: fb2a240920414c05e7fd4235357b952a15611e8f
schema: 23 (unchanged, no migration added)
latest feature task: 39 (unchanged; Task 40 is not a feature checkpoint)
product behaviour: unchanged
```

## 1. Debt reproduction

All four debts were reproduced from the clean baseline before any edit.

### 1.1 Aggregate JavaScript budget

```text
$ pnpm hardening:performance
performance regression: total_js_bytes=1181334 exceeds 1150000
```

The budget was also untruthful in shape, not merely exceeded. It tracked four metrics against
sixteen emitted chunks; its `editor_lazy_bytes` entry carried a `442791` baseline and `490000`
maximum for a chunk that now emits **52,355** bytes, because the Markdown pipeline split out long
ago; a **390,833**-byte ProseMirror/TipTap vendor chunk was entirely unbudgeted; and gzip was not
tracked at all. The gate was simultaneously 90% dead slack on one metric and red on another.

### 1.2 Full-target Clippy

```text
$ cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets --all-features -- -D warnings
error: very complex type used. Consider factoring parts into `type` definitions
    --> src\infrastructure\backup\restore.rs:1702:31
error: very complex type used. Consider factoring parts into `type` definitions
    --> src\infrastructure\backup\restore.rs:1749:20
error: could not compile `lifeweave-desktop` (lib test) due to 2 previous errors
```

Both are the same ten-field `task_saved_views` row tuple
`(String, String, String, i32, String, String, String, i32, i32, Option<String>)`, taken once
before backup and once after restore inside
`active_and_archived_saved_views_survive_backup_restore_reopen_exactly`.

### 1.3 Native E2E gap

`scripts/run_windows_e2e.ps1` ended at `phase8-focus-plans-restart.e2e.ts`. No native phase
exercised Task 38 deadlines or Task 39 Saved Views.

### 1.4 Accessibility evidence debt

Task 30 recorded P2 physical screen-reader and alternate-DPI evidence debt with no protocol a
non-author could execute.

## 2. Workstream A — performance budget v2

### 2.1 Three starting inventories

Three production builds from the clean baseline, deleting only generated `frontend/dist` between
runs. **All three normalized inventories were byte-identical, including content hashes.** The build
is deterministic, so budgets can be frozen safely.

```text
chunk_count          16
total_js_bytes       1,181,334
total_js_gzip_bytes    361,595   (gzip level 9, mtime=0)
```

| chunk | raw | gzip | class | owner |
|---|---:|---:|---|---|
| index.js | 512,586 | 155,874 | startup | app shell + motion choreography + d3-hierarchy |
| dist.js | 390,833 | 120,572 | lazy | ProseMirror / @tiptap/core vendor core |
| markdown.js | 116,541 | 32,939 | lazy | Markdown interoperability pipeline |
| BasicLeafEditor.js | 52,355 | 17,088 | lazy | Basic Leaf editor |
| useQuery.js | 20,834 | 6,883 | startup | TanStack Query cache |
| NarrativeCanvasStudio.js | 20,071 | 5,931 | lazy | Narrative Canvas |
| FocusPlansScreen.js | 18,396 | 5,087 | lazy | Focus Plans |
| TaskSavedViewsPanel.js | 16,544 | 4,953 | lazy | Task Saved Views (Task 39) |
| TagSettings.js | 9,450 | 2,517 | lazy | Unified tags |
| jsx-runtime.js | 7,948 | 3,045 | startup | React JSX runtime |
| TaskPlanningPanel.js | 4,450 | 1,705 | lazy | Upcoming/Overdue planning |
| GlobalSearchDialog.js | 4,142 | 1,776 | lazy | Global Search |
| DeadlineQueuePanel.js | 3,096 | 1,236 | lazy | Deadline queue (Task 38) |
| PortablePackageImportDialog.js | 2,728 | 1,149 | lazy | Portable package import |
| rolldown-runtime.js | 879 | 505 | startup | Rolldown module runtime |
| QueryClientProvider.js | 481 | 335 | startup | Query client provider |

Attribution is measured from each chunk's sourcemap `sources` list, not inferred from names.

### 2.2 Optimization findings

| Candidate | Result | Evidence |
|---|---|---|
| Duplicated modules across chunks | none found | 0 source paths appear in more than one chunk sourcemap |
| Eager import of `LifeEditWorkspace` (sole importer of `d3-hierarchy` and the sortable layer) | **rejected** | startup `index.js` 512,586 → 447,368 (**−65,218**), but total raw 1,181,334 → 1,182,213 (**+879**) and total gzip 361,595 → 363,493 (**+1,898**) |
| Other accidental eager imports | none found | every other route, mode, dialog, and panel already sits behind an approved `lazy()` boundary |
| Unused feature imports | none found | every emitted chunk maps to a live route, mode, or panel |

The lazy-boundary candidate is a genuine startup improvement and was still rejected: spec §5.1 locks
the final observed total raw and gzip at or below the measured starting baseline, and module-split
overhead raises both totals. It is recorded in `task-40-performance-baseline.json` as a measured,
rejected candidate rather than silently discarded.

**Open trade-off for the Product Owner** (not taken by Task 40): 65,218 bytes off the startup path
in exchange for +879 raw / +1,898 gzip on the aggregate. Chrome guidance weights startup cost far
more heavily than total bytes, so this may be worth an explicit decision to relax the aggregate rule.
Task 40 had no authority to make that trade.

No safe reduction was admissible, so the approved growth is attributed honestly rather than
engineered away.

### 2.3 Final inventory and frozen budgets

The final build is byte-identical to the starting baseline (no reduction applied).

Derivation, documented in the budget file and reproducible with integer `ceil`:

```text
total_raw_maximum   = final + max(8192, ceil(final * 0.0075))
total_gzip_maximum  = final + max(4096, ceil(final * 0.0100))
chunk_maximum       = final + max(1024, ceil(final * 0.0200))
```

each clamped by its locked ceiling.

| metric | observed | maximum | derivation |
|---|---:|---:|---|
| main_js_bytes | 512,586 | 522,838 | `min(512586 + max(1024, ceil(512586 × 0.02)), 535000)` |
| total_js_bytes | 1,181,334 | 1,190,195 | `1181334 + max(8192, ceil(1181334 × 0.0075))` |
| total_js_gzip_bytes | 361,595 | 365,691 | `361595 + max(4096, ceil(361595 × 0.01))` |
| expected_chunk_count | 16 | exact | mismatch fails |

Per-chunk maxima: `index.js` 522,838 · `dist.js` 398,650 · `markdown.js` 118,872 ·
`BasicLeafEditor.js` 53,403 · `useQuery.js` 21,858 · `NarrativeCanvasStudio.js` 21,095 ·
`FocusPlansScreen.js` 19,420 · `TaskSavedViewsPanel.js` 17,568.

The derived per-chunk formula is the **binding** constraint everywhere; the locked ceilings (535,000
/ 490,000 / 129,000) are upper bounds the derivation never approaches. That is the point: v2 removes
the dead headroom that made v1 unfalsifiable.

### 2.4 Task 16 preservation

`docs/audits/task-16-performance-budgets.json` is **byte-identical** — it does not appear in the
Task 40 diff at all. It is preserved as history and is no longer read by the gate.

### 2.5 Checker and tests

`scripts/check_performance_budgets.py` was rewritten (Python standard library only) to validate the
v2 schema, require a current build, scan deterministically, compute raw plus `mtime=0` gzip,
normalize identities, emit stable JSON, and explain the exact violation.

```text
$ python -m unittest scripts.tests.test_check_performance_budgets
Ran 17 tests — OK
```

Covering: exact limit passes · one byte over fails · missing expected chunk fails · unknown ≥10 KB
chunk fails · unknown <10 KB reported but not failing · duplicate normalized identity fails ·
malformed budget fails (bad JSON, wrong version, non-object, bad field shapes) · missing build fails
with an actionable message · empty build directory fails · hash change preserves normalized identity
· normalization strips only a terminal hash · gzip determinism · chunk-count mismatch fails · gzip
aggregate enforced · Windows separators and a non-ASCII path segment · report stability across runs.

```text
$ pnpm build && pnpm hardening:performance
chunk_count 16 · main_js_bytes 512586 · total_js_bytes 1181334 · total_js_gzip_bytes 361595
violations: []
```

## 3. Workstream B — full-target Rust lint

A named `SavedViewRow` type alias plus one shared `saved_view_rows(conn) -> rusqlite::Result<Vec<…>>`
reader replaced both inline tuple bindings. Both call sites already issued the identical
`SELECT … ORDER BY id`; the `Result`-returning helper serves the `?`-propagating and `.unwrap()`
paths without changing either.

Preserved exactly: the same statement, the same column order, the same `assert_eq!(after, before)`
whole-row equality, and the same fault coverage. **No `#[allow]`, no lint-level reduction, no test
exclusion, no backup behaviour change, no unrelated refactor.** No additional warnings appeared, so
no baseline/introduced/drift classification was required beyond the two known findings.

```text
$ cargo fmt --manifest-path src-tauri/Cargo.toml -- --check          # clean
$ cargo clippy … --locked --all-targets --all-features -- -D warnings # exit 0
$ cargo test … infrastructure::backup -- --test-threads=1             # 145 passed, 0 failed
$ cargo test … --locked -- --test-threads=1                           # 590 passed, 0 failed, 4 ignored
```

## 4. Workstream C — native Windows E2E for Tasks 38–39

### 4.1 New phases

```text
phase9-deadline-saved-views.e2e.ts
phase9-deadline-saved-views-restart.e2e.ts
phase10-saved-views-backup-restore.e2e.ts
phase10-saved-views-backup-restore-restart.e2e.ts
```

registered in the `$allPhases` allowlist. The fourth phase is the restart companion required by
spec §8.2 steps 5–6 (restore, **restart**, verify) and mirrors the existing phase2/phase3 pattern.
Shared fixture vocabulary lives in `e2e-tests/support/deadlineSavedViews.ts`, outside `specs/`, so
importing it does not re-register a `describe` block.

### 4.2 Covered behaviour

Driven **only** through accessible selectors — roles, accessible names, and stable ids. No raw IPC,
no direct database writes, no production test backdoor, no generated CSS selectors, no arbitrary
sleeps.

- deterministic high-priority one-off Task with schedule and date-only deadline, created through the
  Task editor;
- a control Task sharing the schedule but with neither deadline nor priority, proving the Saved View
  clauses actually exclude work;
- Deadlines queue membership, state grouping, machine-readable deadline `time`, priority as text;
- evaluation removes a Task from the active queue and undo restores it;
- opening a deadline result lands on the **scheduled** day, verified by the visible day label *and*
  by reading `document.activeElement`;
- typed Saved View over `upcoming` with two clauses including a deadline clause, results, exact
  navigation, edit, second view, archive, restore, ordering and selection coherence;
- restart: deadline persists, view name/base scope/sort/group/clauses persist, the view executes,
  navigation still works, Today remains startup and default;
- backup → mutate three independent ways → restore → restart, verifying pre-backup **field values**
  (deadline date, view name, group mode, archived lifecycle), not counts.

### 4.3 Deliberate-break proof

Each phase was proven load-bearing, then the break was fully reverted.

| Break | Phase run | Result |
|---|---|---|
| `DeadlineQueuePanel` navigates to `deadline_local_date` instead of `scheduled_local_date` | phase 9 | **FAIL** — `Selected day · 2026-08-08` not displayed |
| `draftFrom` drops the stored `sort_mode` | phase 9 → phase 9 restart | phase 9 **PASS**, restart **FAIL** on the Sort round-trip |
| Restore reports success without invoking `restoreDatabase` | phase 9 → phase 10 | phase 9 **PASS**, phase 10 **FAIL** — cleared deadline never returns |
| `draftFrom` drops the stored `sort_mode` | phase 9 → 10 → 10 restart | first two **PASS**, restart **FAIL** on the Sort round-trip |

`git status` after restoration showed no modified file under `frontend/src`, confirming zero
residue.

### 4.4 Two pre-existing native defects found and fixed

The mandated full-suite run reproduced two failures that predate Task 40 and are unrelated to it.
Both were diagnosed to the exact code and are **test-determinism defects, not product defects**.

**phase 8 restart** — `//label[normalize-space()='Outcome']/textarea` never matched after a restart.
`normalize-space()` on a wrapping label takes the element's whole string-value, so once the textarea
carried its persisted content the label read `"OutcomePersistent plan outcome"`. Reproduced on a
clean profile running only phases 8 and 8-restart, so it is independent of every other phase.
Corrected to `normalize-space(text())` — the same form the file already used for its `Lifecycle`
select. The identical latent selector in `phase8-focus-plans.e2e.ts` was corrected too.

**phase 6** — the fixture `E2E Today Fan` is scheduled today at 04:00–05:00, and assessment
eligibility is `local_date < today || (local_date === today && end_minute <= clockMinute)`. The phase
therefore cannot pass before 05:00 local time. `validate_range` requires `start >= 240`, so 04:00 is
the earliest legal window and **no today-scheduled Task can be assessable before then**. Left
unchanged in this session.

> **Superseded — see §11.2.** The conclusion drawn here, that no bounded fix existed, was wrong. It
> reasoned only about making a *today*-scheduled fixture assessable. The phase already created an
> overdue Task and already navigated Overdue → Review, so the fan lifecycle could simply be driven
> from a subject that satisfies the `local_date < today` branch — the identical correction this same
> section describes for phase 9 one paragraph below. Fixed post-closure.

This same latent flaw was present in the first draft of the new phase 9 and was corrected there: its
evaluated Task is now scheduled *yesterday* and reached through Overdue → Review, which satisfies the
`local_date < today` branch unconditionally and makes the phase independent of the wall clock.

## 5. Workstream D — accessibility and DPI evidence

### 5.1 Machine-verifiable coverage

`frontend/src/testing/accessibilityContracts.test.tsx` adds five focused tests for the invariants
that live between components:

- the Saved View modal is named and `aria-modal`, `Tab` cycles forward and backward inside it, and
  `Escape` always leaves and restores focus to the invoker — WCAG 2.1.2 satisfied by a cycle that is
  not a trap;
- a rejected save announces through a `role="alert"` that **receives focus**, and the draft survives;
- every Deadline queue control has a unique self-describing accessible name, no `tabindex`, no
  disabled trap, and `axe.run` reports zero violations;
- deadline status is conveyed in text and machine-readable `time`, never colour alone;
- the Today tablist exposes exactly one selected tab and exactly one roving tab stop.

Full suite: **604 frontend tests pass across 42 files**; typecheck clean. No accessibility violation
of accepted behaviour was found, so no production fix was required.

**Honest limitation:** the reduced-motion and forced-colors contracts were *not* asserted at this
layer. jsdom does not evaluate `@media`, and Vitest stubs CSS so a `?raw` import returns an empty
string — an assertion there would have passed vacuously against nothing. Rather than fake it, those
two contracts remain in the manual protocol, where High Contrast and Reduced Motion are physically
observable. The contracts themselves are unchanged in `frontend/src/design-system/global.css`.

### 5.2 Native UIA inspection

Detection, without installing anything:

| Tool | Result |
|---|---|
| Accessibility Insights for Windows | **NOT INSTALLED** (no executable, no APPX package) |
| `Inspect.exe` | **AVAILABLE** — Windows Kits 10 bin 10.0.26100.0 (arm64/x64/x86) |
| UIAVerify | **AVAILABLE** — Windows Kits 10 bin 10.0.26100.0 |
| Narrator | present (`System32\Narrator.exe`) |

`Inspect.exe` is interactive and not scriptable, so the contained app was inspected through the same
UI Automation client API those tools use (`System.Windows.Automation`), against an isolated profile
under `target/e2e-data` with the standard sentinel, and the owned process was stopped afterwards.
WebView2 only materialises its renderer UIA tree for an assistive client, so the host-side
`--force-renderer-accessibility` switch was set for the inspection run only; it changes nothing about
the product build.

Sanitized results — startup shell and, after activating the Deadlines tab **through UIA itself**
(proving the tab is operable by an assistive client, not only by mouse):

```text
elements 49 · focusable 15 · unnamed focusable inside the app document subtree: 0
control types: Pane 18 · Text 13 · Button 8 · TabItem 5 · Group 3 · Document 1 · Tab 1
```

| Element | ControlType | Name | Focusable | State |
|---|---|---|---|---|
| navigation landmark | Group | Primary navigation | – | – |
| destinations | Button ×6 | Today, Calendar, Analytics, Plans, Life System, Settings | yes | – |
| search | Button | Search (Ctrl+K) | yes | – |
| sidebar toggle | Button | Collapse sidebar | yes | – |
| tablist | Tab | Task planning views | – | – |
| tabs | TabItem ×5 | Today, Upcoming, Overdue, Deadlines, Views | yes | exactly one `IsSelected=true` (Deadlines) |
| empty queue | Text | bounded window dates 2026-07-07 … 2026-08-20 | – | – |

**Priority-1 findings: none.** One focusable `Pane` carries no accessible name, at tree depth 4 —
WebView2 host chrome, above the app `Document` at depth 11. Zero unnamed focusable elements exist
inside the application's own subtree. Raw output stays ignored under `target/e2e-artifacts/uia`;
only this summary is committed.

### 5.3 Manual protocol

`docs/audits/task-40-windows-accessibility-dpi-protocol.md` is executable without source knowledge,
uses `PASS | FAIL | NOT AVAILABLE | NOT RUN`, captures the required environment fields, defines the
5 display × 3 text scale matrix, ten per-scale layout checks, and all eleven required scenarios with
keyboard path, expected focus, expected Narrator announcement, expected name/role/state/value,
expected layout, severity, and an evidence field. It forbids programmatic changes to global display
settings.

**Physical execution status: NOT RUN.**

```text
P2 manual physical Narrator/DPI execution remains external evidence debt.
The protocol and machine-verifiable coverage are complete.
```

## 6. Workstream E — release-candidate evidence

### 6.1 Installer

```text
path   src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe
bytes  5,087,854
sha256 fc7745d596c5684d6100f61d3b985ab67942ac52ac0a2de7d9c693a45f77193c
mode   release profile, optimized
schema 23
```

The `e2e-test` capability is **absent** from the release binary: a byte scan of
`lifeweave-desktop.exe` (14,032,896 bytes) for `LIFEWEAVE_E2E_APP_DATA_DIR` returned no match.
No installer or generated profile is committed.

### 6.2 Native E2E

Executed at 00:07–00:26 local time.

| Phase | Result |
|---|---|
| phase1-lifecycle | PASS |
| phase2-backup-restore | PASS |
| phase3-restart | PASS |
| phase4-portable-roundtrip | PASS |
| phase4-portable-restart | PASS |
| phase6-planning | **NOT RUN — blocked by time of day** (see §4.4) |
| phase6-planning-restart | **NOT RUN — depends on phase 6** |
| phase7-unified-tags | PASS |
| phase7-unified-tags-restart | PASS |
| phase8-focus-plans | PASS |
| phase8-focus-plans-restart | PASS (fixed, see §4.4) |
| phase9-deadline-saved-views | PASS |
| phase9-deadline-saved-views-restart | PASS |
| phase10-saved-views-backup-restore | PASS |
| phase10-saved-views-backup-restore-restart | PASS |

The 13-phase ordered run excluding phase 6 exited **0**. `pnpm e2e:windows` with the complete phase
list fails only at phase 6, for the reason established in §4.4: it is structurally un-runnable
between 00:00 and 05:00 local time and the session ran at 00:26. This is an environment/timing
constraint of a pre-existing phase, not a product defect and not a Task 40 regression.

**Residual verification debt:** phases 6 and 6-restart were not executed in this session. They
should pass unchanged when the suite is run after 05:00 local time.

> **Superseded — see §11.2 and §11.3.** This debt is closed. The complete 15-phase
> `pnpm e2e:windows` now exits **0** with all 15 phases PASS, executed at 01:19–01:26 local time —
> inside the window that previously made phase 6 un-runnable.

### 6.3 RC dogfood

```text
$ pnpm hardening:rc     # exit 0
candidate            core-rc-b0b9e13
isolated_profile     target/e2e-data/core-rc-452192e7cefa47d297aec292e0d70f0c
schema_reopen_sessions 2 · liveness_seconds_each 25
document      26 passed
backup       145 passed
narrative     60 passed, 1 ignored
portable      11 passed, 1 ignored
task::       100 passed, 1 ignored
installer_sha256 fc7745d596c5684d6100f61d3b985ab67942ac52ac0a2de7d9c693a45f77193c
cleanup       validated sentinel containment; owned processes stopped
```

The harness was inspected rather than rewritten. Its coverage and command selection are truthful:
`task::` covers evaluation, planning, Task 38 deadlines, and the Task 39 Saved View domain;
`infrastructure::backup` covers backup/restore; two 25-second contained sessions prove schema 23
reopen. One materially stale description was corrected — the `task::` failure message named only
"Upcoming/Overdue planning and evaluation" and now names deadlines and Saved Views as well. Nothing
else was changed.

## 7. Product finding recorded, not fixed

**P2 — creating or restoring a Saved View drops the selection.**
`TaskSavedViewsPanel.tsx` clears `selectedId` whenever the id is absent from `active.data`. After a
create or restore, `onSuccess` sets the new id while `active.data` still holds the pre-refetch list,
so the effect fires first and resets the selection to `null`. The result pane shows "Select or create
a Saved View." instead of the view just created.

Discovered by the new native phase 9 — exactly the class of defect this workstream exists to surface.
The view is created and persisted correctly, so this is a UX defect, not data loss. Fixing it is a
product behaviour change Task 40 does not authorize, so phase 9 asserts what the product actually
does and clicks the view explicitly, with a comment pointing here. **Recommended for a future
Product Owner decision.**

> **Superseded — see §11.1.** The decision was taken and the defect is fixed post-closure. Phase 9
> no longer contains the explicit click and now asserts the selection directly.

## 8. Safety and scope

| Check | Result |
|---|---|
| Migrations / schema | unchanged, schema 23, no migration added |
| Product behaviour | unchanged |
| `latest_feature_task` | remains 39 |
| Dependencies / lockfile | unchanged |
| Generated bindings / DTOs | unchanged (no DTO or IPC file touched) |
| Workflow files | unchanged |
| Workflow seal | `b4f0179e714a7473954aca157eff06e715d6d79cfe3da998fea403a6dd16addd`, identical before and after |
| Lint suppression | none added |
| Tests weakened or deleted | none |
| Source maps | still enabled |
| Task 41 | absent, unallocated, unrecommended |
| Generated output committed | none |

## 9. Gate results

```text
pnpm source:verify                        PASS
pnpm governance:check                     PASS
pnpm index:check                          PASS
pnpm verify                               PASS
python -m unittest test_check_project_state + test_check_performance_budgets   32 tests OK
pnpm typecheck                            PASS
pnpm test                                 604 passed, 42 files
pnpm build                                PASS
pnpm hardening:performance                PASS, violations []
cargo fmt --check                         PASS
cargo clippy --all-targets --all-features -D warnings   PASS
cargo test --locked -- --test-threads=1   590 passed, 0 failed, 4 ignored
pnpm tauri build                          PASS
pnpm e2e:windows                          13/15 phases PASS; phases 6 and 6-restart NOT RUN (§6.2)
                                          — superseded: 15/15 PASS after §11.2
pnpm hardening:rc                         PASS
git diff --check                          clean
```

## 10. Residual debt

1. **P2 manual physical Narrator/DPI execution remains external evidence debt. The protocol and
   machine-verifiable coverage are complete.**
2. ~~Native phases 6 and 6-restart were not executed in this session~~ — **closed by §11.2**; both
   now run and pass at any local time, and the full 15-phase suite exits 0.
3. Reduced-motion and forced-colors contracts are not machine-asserted (jsdom cannot evaluate
   `@media`); they remain physically verifiable through the manual protocol.
4. The rejected startup-size trade-off in §2.2 awaits a Product Owner decision.
5. ~~The P2 Saved View selection defect in §7 awaits a Product Owner decision~~ — **closed by
   §11.1**; the decision was taken and the defect is fixed.

No confirmed P0/P1 product defect remains.

## 11. Post-closure remediation

```text
authorized: Task 40 post-closure remediation (two bounded findings only)
baseline:   2cad1c874015c0f60b63dac14ea0c58994d62b98
schema:     23 (unchanged)
scope:      TaskSavedViewsPanel.tsx + its test, phase 6 spec, phase 9 spec, this audit, STATUS.md
```

Task 40 stays closed. Sections 4.4, 6.2, 7 and 10 above record the state at closure and are left as
written; the block quotes added there mark exactly what this section supersedes. No Slice 031 was
created and no Task 41 work was started.

### 11.1 Saved View selection race — §7 P2 fixed

**The race.** `TaskSavedViewsPanel` set `selectedId` *before* awaiting the lifecycle invalidation:

```ts
onSuccess: async (detail) => {
  setSelectedId(detail.view.id);   // active.data is still the pre-mutation list
  ...
  await refreshLifecycle();
}
```

The panel also clears any selected id that is absent from `active.data`. Between those two
statements React re-rendered with the new id and the old list, so the cleanup effect fired and reset
the selection to `null` before the refetch could land. The user saw "Select or create a Saved View."
immediately after creating or restoring one.

**The correction — ordering only.** No cache surgery, no timers, no suppression flag:

- create/update `onSuccess` closes the editor, clears the save error, `await refreshLifecycle()`,
  and *then* selects the returned view;
- lifecycle `onSuccess` still clears an archived view's selection *before* the refetch — that view
  is leaving, so clearing it early is correct — and selects a restored view only *after* it.

`await invalidateQueries` resolves once the active observers have refetched, so the list provably
contains the id by the time the selection is set. The stale-selection effect is untouched.

**Frontend evidence** — `TaskSavedViewsPanel.test.tsx`, three tests added, file now 11 tests:

| Test | Baseline | Fixed |
|---|---|---|
| create stays selected, projects, no second click | **FAIL** — nothing selected, `aria-pressed="false"` | PASS |
| restore stays selected, projects, no second click | **FAIL** — nothing selected, `aria-pressed="false"` | PASS |
| a selection whose view leaves the refreshed list is still cleared | PASS | PASS |

The two new tests hold the active-list refetch open on a hand-resolved promise. That is what makes
them fail on the baseline: with an instantly resolved mock the refetch wins the race and the bug is
invisible, which is precisely why unit coverage missed it originally. The third test is the guard
that the repair did not simply disable legitimate cleanup — it passes both before and after, and it
fails if the effect is removed.

One latent test-isolation defect was fixed alongside: `beforeEach` used `vi.clearAllMocks()`, which
leaves an unconsumed `mockResolvedValueOnce` queued. A one-shot left over from the rejected-draft
test outranked a later test's own mock. Now `vi.resetAllMocks()`.

**Native evidence.** `phase9-deadline-saved-views.e2e.ts` no longer clicks the view it just created
or restored; it asserts `aria-pressed='true'` and the projected result directly. Run against the
baseline panel with the workaround removed:

```text
$ pnpm e2e:windows -Phases phase9-deadline-saved-views.e2e.ts   # baseline panel
Error in "Phase 9 — deadline semantics and Saved Views"
Expected: "displayed"   Received: "not displayed"
  at phase9-deadline-saved-views.e2e.ts:170     # the create-selection assertion
Spec Files: 0 passed, 1 failed
```

With the fix the phase passes as part of the full suite below. No assertion was weakened and the
phase was not made to tolerate either behaviour.

### 11.2 Phase 6 clock dependency — fixed

**The old dependency.** Phase 6 opened the assessment fan on `E2E Today Fan`, scheduled *today*
04:00–05:00, so `button[aria-label^='Assess task']` does not exist before 05:00 local. Reproduced
live at 01:00 local from the untouched baseline spec:

```text
$ pnpm e2e:windows -Phases phase6-planning.e2e.ts       # baseline spec, 01:00 local
Error: Can't call click on element with selector "button[aria-label^='Assess task']"
       because element wasn't found
  at phase6-planning.e2e.ts:26
Spec Files: 0 passed, 1 failed
```

**The new path.** The fan lifecycle now runs on `E2E Past Review`, the overdue fixture the phase
already created, reached through the Overdue → Review navigation the phase already exercised. That
subject satisfies the `local_date < today` branch of the eligibility rule unconditionally, so the
phase is independent of the wall clock. The now-unused `E2E Today Fan` fixture was removed; its only
purpose was the fan.

Nothing was weakened to achieve this. `validate_range` is unchanged, the eligibility rule is
unchanged, no clock was faked, no phase is skipped or conditional, and no raw database write was
added — the fixture still uses the phase's existing test-only IPC setup. Phase 6 retains every
assertion it had: Upcoming one-off, Upcoming recurring occurrence, moved occurrence, cancelled
occurrence exclusion, exact recurring navigation, sidebar collapse/expand, Calendar round-trip,
fan-closes-on-tab-switch, overdue evaluation removal, and the restart persistence expectation.

**Time-independence proof.** No branch in the spec reads a clock; the only date arithmetic is the
fixture's `shift()` helper, anchored at midday. The assessment subject is `shift(-1)`, strictly
earlier than today. Both phases were executed inside the previously fatal 00:00–05:00 window:

```text
$ pnpm e2e:windows -Phases phase6-planning.e2e.ts phase6-planning-restart.e2e.ts   # 01:13–01:15
phase6-planning.e2e.ts           PASSED
phase6-planning-restart.e2e.ts   PASSED
exit 0
```

### 11.3 Remediation gate results

```text
pnpm test                                 607 passed, 42 files (604 + 3 new)
pnpm test src/features/task/saved-views    11 passed
pnpm typecheck                            PASS
pnpm build                                PASS
pnpm verify                               PASS
python -m unittest scripts.tests.test_check_project_state   15 tests OK
pnpm hardening:performance                PASS, violations []
cargo fmt --check                         PASS
cargo clippy --all-targets --all-features -D warnings   PASS
cargo test --locked -- --test-threads=1   590 passed, 0 failed, 4 ignored
pnpm e2e:windows                          15/15 phases PASS, exit 0, run at 01:19–01:26 local
git diff --check                          clean
```

`pnpm tauri build` and `pnpm hardening:rc` were **not** re-run. This remediation changed no Rust,
no schema, no migration, no dependency, and no IPC or DTO surface; the release installer and RC
dogfood evidence in §6.1 and §6.3 are unaffected by a React ordering change and two test specs. The
`--debug --features e2e-test` binary was rebuilt and exercised by all 15 native phases.

**Safety.** Schema stays 23. No migration, Rust production code, backend Saved View semantics,
dependency, lockfile, generated binding, workflow, or workflow seal was touched. Performance budget
v2 is unchanged and still passes. Project State is unchanged: `latest_closed_task` 40,
`latest_closed_slice` 30, `latest_feature_task` 39, schema 23, `next_action` `product_owner_gate`.
Task 41 remains absent, unallocated, and unrecommended.
