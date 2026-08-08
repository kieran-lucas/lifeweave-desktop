# Project Status

## Task 51/60 — Visual Experience Overhaul, "Quiet Luminous Atlas" (active)

- Activation baseline: `43d0d1e822336c97527f85e1ab154fc74a61f058`.
- Active slice: `041-visual-experience-overhaul` under
  [ADR 0045](adr/0045-visual-experience-overhaul.md).
- Local branch `task-51-visual-experience`, created from the activation baseline. **Nothing is
  pushed**, no PR is opened, no remote branch is modified, and the sealed workflow is untouched, per
  explicit Product Owner instruction for this task.
- Task 50 closed with art direction explicitly unallocated and deferred to a later Product Owner
  gate. Task 51 is that gate. Until activation, `START_HERE.md`, this file and Slice 040 recorded
  Task 51 as prohibited; the activation prompt is an explicit later Product Owner decision, which
  `AI_CONSTITUTION.md` §1 ranks above those files. The contradiction is recorded rather than
  silently reconciled — ADR 0045 § "Authorization and the contradiction it resolves".
- Scope: one visual authority under `frontend/src/design-system/visual/` beside Task 50's geometry
  authority; finite radius, elevation, hairline, type, motion and colour vocabularies; an enclosure
  budget replacing nested rectangles; a context inspector column; restrained static art; dark theme
  composed deliberately; reduced motion as a designed state; visual regression; and interaction
  performance instrumentation.
- **Presentation only.** Schema stays 27 with no migration, no Rust product change, no new IPC
  command, no new capability, no broadened permission, no network service, no backup-format change
  and no workflow or seal change. No product semantics change, and no Task facet is invented to
  match the reference image — Lifeweave has no subtasks and no task-to-task links, which the
  reference inspector displays.
- Following the Task 40 and Task 50 precedent, Task 51 does **not** advance `latest_feature_task`,
  which stays 49 at `7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`.

### Phase 0 baseline — measured, complete

Environment: Windows 11 build 26200, Intel i3-1115G4 (2 cores / 4 threads), Intel UHD integrated
graphics, 7.8 GB RAM, WebView2 151.0.4129.72. Screen 1536 × 864 CSS at `devicePixelRatio` 1.25, work
area 1536 × 816, **maximized inner viewport 1536 × 794** — identical to the Task 50 post-closure
record.

Gates at `43d0d1e`, before any Task 51 edit: `pnpm verify` PASS; `pnpm typecheck` PASS; `pnpm test`
PASS at **766 tests across 51 files**; `pnpm build` PASS; `pnpm hardening:performance` PASS with
`violations: []`; the Task 50 maximized layout audit PASS at **24 screens, 0 semantic collisions,
0 document overflow, 0 viewport overflow**. Rust gates are recorded as NOT RUN, because the Rust
tree is out of scope and untouched; they run before closure.

Visual census of the state Task 51 replaces: the whole design system declares **13 CSS custom
properties**, while `frontend/src` contains **31 distinct border radii, 14 distinct box shadows and
29 distinct hardcoded hex colours across 87 occurrences**, with no scale for elevation, hairline,
editorial type, icon or motion. This is structurally the same defect Task 50 fixed one layer down.

`index.js` measures 529,527 bytes against its locked 535,000 ceiling — **5,473 bytes of headroom**,
recorded as the hardest pre-existing constraint on the slice. Raising a ceiling remains a Product
Owner decision supported by measurement, not a response to a red gate.

Baseline evidence: `docs/audits/task-51-visual-baseline.md`.

### Phases 1–4 — complete

- **Governance.** ADR 0045 and Slice 041 recorded; the ledger, status, roadmap and entry document
  updated so they agree with the authorized state.
- **State matrix.** 78 surfaces and states enumerated; 24 already covered by the `task50b` walk,
  **54 to add**. Narrative is reached by nothing today. The four Visual Worlds are recorded as an
  approved per-world palette to *harmonise*, not as stray colour to delete.
- **Dependencies.** Four added, each with a written admission note in
  `docs/audits/task-51-dependency-notes.md`. `@base-ui/react` was evaluated and **not installed** —
  the prototype found no primitive that beats native semantics. **Measured impact on the shipped
  application: 0 bytes**, same `index.js` content hash, same 24 chunks.
- **Visual authority.** `frontend/src/design-system/visual/` — a `createThemeContract` where every
  role is `null`, so a missing role is a build error; light and dark as two `createTheme`
  implementations derived in `oklch()`; a measured type scale; a motion vocabulary; and 22 Fluent
  icons vendored from 20,621 by `scripts/generate_visual_icons.py`. **31 radii → 4, 14 shadows → 3,
  29 hardcoded hex colours → semantic roles.**
- **Prototype.** The whole `Sidebar | Today | Inspector` composition, isolated behind a second Vite
  entry that the production build excludes.

### Reference measurement

The Product Owner supplied `docs/visual/task-51/lifeweave-visual-baseline-v1.png` (1586 × 992).
Measured by pixel sampling, not by eye — full record in `docs/audits/task-51-reference-measurement.md`.

Two findings changed the design and were invisible to inspection: **the inspector is the same plane
as the workspace** (`#FBFAF9`, separated by one hairline, no fill or shadow of its own), and **there
is no period container** — the rows sit directly on the canvas.

A third finding is an accessibility conflict: the reference's `#EFEFF4` selection fill measures
**1.10:1** against the canvas, far below the 3:1 WCAG 2.2 SC 1.4.11 asks of a state indicator. It is
resolved by *addition* — the fill is kept exactly as measured and a 2 px accent edge at 3.15:1
carries the state alongside it.

### Art direction — light blue

Explicit Product Owner direction recorded during activation: the art vibe is **light blue**. It is
scoped to the three ambient roles and reaches no canvas, surface, text, border, accent or state
colour. The scoping is the decision: the content plane stays warm as the reference has it, so a cool
atmosphere reads as air behind the interface rather than as the cool blue-grey system this slice
replaces.

### Measured results at the lock gate

```text
captures                       12    six lock states plus four viewports
semantic spacing collisions     0    Task 50 detector, reused unchanged
document / workspace overflow   0    every state, every viewport
viewports proven               1536×794 · 1440×900 · 1280×720 · 960×640
contrast                       every text role ≥ 4.5:1, every boundary and state ≥ 3:1, both themes
production bundle delta         0 bytes
gates                          verify · typecheck · build · performance budget all PASS
```

Three defects were found only because the whole screen was composed at once: a 464 px dead column
reserved for an absent inspector, default WebView2 scrollbars rendering as a bright bar through the
dark composition, and an ambient field washing across the task titles. None would have surfaced from
restyling components one at a time.

### VISUAL LOCK — approved

`VISUAL LOCK APPROVED` was granted on the composition in `docs/audits/task-51-visual-lock.md`, with
four Product Owner decisions recorded in ADR 0045 § "Product Owner decisions at VISUAL LOCK":

- the **native decorated titlebar is kept** — no `decorations: false`, no custom HTML titlebar, and
  therefore no new window-control capability. Spec §11's capability exclusion stands unamended;
- `@vanilla-extract/recipes` is **kept**, constrained to primitives that genuinely have variants;
- the locked composition stands unchanged — continuous surface, inspector on the workspace canvas,
  periods with no container, `#EFEFF4` selection fill plus the 2 px accent edge;
- the art must **lean further into light blue**, ambient roles only, content plane still
  warm-neutral, with 33° of hue separation between ambient (237) and accent (270.15).

### Phase 5 — motion prototype, complete

Motion was added to the locked composition; nothing was redesigned. Each interaction sits on the
cheapest correct layer: CSS for hover, press, focus and the checkbox microstate; optimistic React
state for completion; Motion layout projection for row settling, removal and inspector geometry;
plain pointer events plus layout projection for drag.

Measured on the target machine at 60 Hz, where one frame is 16.67 ms:

```text
task completion    input → commit  p50 4.0 ms     input → frame  p50 12.0 ms
row selection      input → commit  p50 3.3 ms     input → frame  p50  5.0 ms
layout settle      input → commit  p50 4.4 ms     input → frame  p50  7.7 ms
day change         input → commit  p50 5.0 ms     input → frame  p50 13.3 ms
drag               81 frames over a 24-step gesture, p95 17.5 ms, 0 dropped
idle               121 frames over 2031 ms, 0 dropped
long tasks >50 ms  0 across the entire session
```

Every state change commits inside a single frame; the slowest p50 is 5.0 ms. Reduced motion —
emulated and confirmed active — is steadier still (zero dropped frames across all six completion
runs) and is a designed state with an 80 ms tonal cross-fade, rather than the blanket `0.01 ms`
zeroing the application currently ships.

**View Transitions were prototyped, measured three ways, and not adopted.** Against a direct state
change with a keyed cross-fade at **6.8 ms** commit, `document.startViewTransition` measured
**19.8 ms** and `Element.prototype.startViewTransition` **23.0 ms** — roughly 3×, enough to push the
commit outside one frame, and the document form produced a seven-frame drop cluster. Scoping the
snapshot to a subtree did not make it cheaper. Both remain implemented behind `?vt=` and
feature-detected so a future machine can be re-measured rather than guessed at.

**A measurement was published and retracted.** Earlier passes reported 791 ms and 742 ms for those
two APIs. Those figures were an instrumentation defect — the commit-recording effect did not depend
on `dayOffset`, so the timer ran until the next interaction — and were caught only because the
number survived removing the View Transition entirely. The retraction is recorded in
`docs/audits/task-51-motion-lock.md` §6.1 rather than silently overwritten. The decision it produced
happens to stand; its justification is now correct and far narrower.

Art cannot compete with interaction by construction: the ambient layer is static paint with no
animation, no filter and no timer, `pointer-events: none` and `aria-hidden`, and `will-change` is
applied only to the row actually being dragged.

### Phase 6 — production reconstruction, IN PROGRESS

`VISUAL LOCK V2 APPROVED` and the Motion Lock was revalidated against v2 and preserved
(`docs/audits/task-51-motion-lock.md` §10a). Production reconstruction has begun.

**Migrated to v2 in production:**

- `global.css` — the whole application moved onto the v2 palette in one step by re-pointing the
  legacy custom-property values, so all 30 domain style files adopted it without a 30-file diff;
- the art-direction freeze in `check_layout_authority.py` replaced by a v2 authority check that
  additionally fails on zeroed reduced motion, any `@font-face`, a missing visual-contract role, or
  a reintroduced green completion tone;
- Literata removed — 0 imports confirmed, **106,560 → 0 font bytes**, no `@font-face` anywhere;
- the app shell — 220 → 260 px sidebar, the grey letter tiles replaced by real 20 px outline icons
  that take the accent when current, v2 pill geometry, sans headings;
- Today — the period row group (hairline, 12 px radius, whiter interior, as measured), pale-blue
  selection replacing the 2 px focus-ring outline, tinted metadata chips replacing outlined boxes,
  the date line in the accent;
- completion is blue everywhere: `AssessmentControl` already resolved through `var(--accent)`, so
  no green remains in task state;
- 7 of 22 vendored icons now reach production, because the icon module was rewritten from a
  non-tree-shakeable lookup map to named exports.

- the Today **week strip** — seven bordered 58 px cells and two bordered arrows replaced by a
  chromeless typographic cluster: pale-blue selected day, an accent dot for today, no cell borders,
  and one hairline beneath the whole header;
- the Today **workspace tab strip** — now low-chrome inline navigation with a 2 px accent underline
  instead of a boxed strip stacked above the page's other boxed regions.

**Feature → UI completeness audited** across the whole repository
(`docs/audits/task-51-feature-ui-completeness.md`): **117 registered handlers, 0 orphaned**; 2
unreachable exported components, both Task 20 schema prototypes and intentionally non-UI; no dead
routes and no duplicate entry points. The open Task 51 work is visual convergence, not feature
recovery.

- the **production context inspector** — built from real Lifeweave facets (Note / Details / Time /
  Links), sharing the workspace plane with a single vertical hairline, no card and no shadow, placed
  by the shared `splitWorkspace` primitive. Today moves `STANDARD_PAGE` → `WIDE_WORKSPACE`, a
  deliberate taxonomy change recorded in its contract test. The inspector is lazy-loaded and the
  split collapses when nothing is selected.

**Startup ceiling raised, by Product Owner decision.** The inspector left `index.js` 381 bytes over
the old 535,000 ceiling after three legitimate reclaims (tree-shakeable icons −3,438, lazy inspector
−6,151, co-located inspector styles −426). The ceiling is now **550,000**, recorded in
`docs/audits/task-51-performance-budgets.json` with its rationale in `locked_ceilings.note` and in
`docs/PERFORMANCE_BUDGETS.md`. The gate stayed red while the decision was requested and now passes
**because the governance changed, not because the check was bypassed**.

```text
index.js              535,381 / 550,000   headroom 14,619
total_js_bytes      1,254,564
total_js_gzip         385,429
expected_chunk_count       25   (24 -> 25: the lazy TaskInspector chunk)
lazy inspector         7.34 kB JS + 2.86 kB CSS, loaded only on selection
net eager cost         +2,268 bytes for the whole feature
```

**Not yet migrated** — these inherit the v2 palette through `global.css` but have not had their
composition reworked: Calendar,
Analytics, Focus Plans, Life/Graph, Reader/Editor, Narrative, Search, Settings and the dialog set.
Visual-regression goldens for v2 are not yet established, and the whole-app coherence pass has not
been run.

**Multi-viewport geometry matrix — complete.** The Task 50 audit harness gained an explicit
viewport mode that sizes the outer window from measured chrome, re-applies after the fixture reload
instead of re-maximizing, and **verifies the achieved viewport within 2 px, failing loudly**. No
Task 50 assertion was relaxed. Full record in `docs/audits/task-51-viewport-matrix.md`.

```text
requested    achieved     DPR    screens  collisions  docOv  vpOv
1536x794*    1536x794     1.25      24         0        0      0
1280x800     1279x799     1.25      24         0        0      0
1280x720     1280x720     1.25      24         0        0      0
 960x640      960x640     1.25      24         0        0      0
1440x900     NOT ACHIEVABLE — needs a window taller than the 1536x816 work area
```

960x640 is the `tauri.conf.json` minimum and holds completely: long titles and metadata chips wrap
rather than clip, the conditional split reserves no empty rail, the week strip's 8 px day gap
survives compression, and the tab strip wraps rather than forcing horizontal scroll.

Not covered: the inspector at small viewports — the audit walk selects no task, so every row is the
unselected composition. Physical DPI 125% / 150% remains NOT RUN.

```text
gates    verify · typecheck · build · performance budget    PASS
tests    766 passed across 51 files
geometry 24 production screens, 0 collisions, 0 document overflow, 0 viewport overflow
bundle   index.js 529,527 -> 533,113 (ceiling 535,000; 1,887 bytes headroom)
```

The bundle briefly exceeded its ceiling by 1,551 bytes when the shell adopted icons. It was fixed at
source — the icon module could not tree-shake, so production shipped all 22 icons to draw 7 — rather
than by raising the threshold.

### Process gates

```text
VISUAL LOCK      APPROVED (v1), superseded by VISUAL LOCK V2 APPROVED
MOTION LOCK      revalidated against v2 and preserved
PHASE 6          in progress — see above for what is and is not migrated
```

No production presentation file may be visually overhauled before `VISUAL LOCK APPROVED` is received
in words. Approval is never inferred. `design-system/global.css` is unchanged, so Task 50's
art-direction freeze is still intact and still enforced.

Open decision carried to the gate: the reference draws its own 52 px in-app titlebar, which would
need `decorations: false` and window-control capabilities that spec §11 currently excludes.

Not run and recorded as such: forced colors, Narrator spot checks, physical DPI at 125% / 150%
(inherited debt), and visual-regression goldens, which are deliberately established *after* the lock
rather than before it.

## Task 50/60 — Global Layout System + UI Surface Completeness (complete)

- Activation baseline: `2c4cb188937393103e12b1042779af5ea266acda`.
- Activation commit: `5451fe784fa50cb3fff65cad2f12f8a448349c9b`.
- Product checkpoint: `b4d7d32046f3e3edbff6d734116d3c2bd645d676`.
- Closed slice: `040-global-layout-system` under
  [ADR 0044](adr/0044-global-layout-system-and-ui-surface-completeness.md).
- Schema remains 27; no migration, no Rust product change, no new IPC command, no new Tauri
  capability, no new dependency, no workflow or seal change.
- Scope: one geometry authority under `frontend/src/app/layout/`, a finite page taxonomy
  (`STANDARD_PAGE` 1152 · `WIDE_WORKSPACE` 1440 · `READING_PAGE` 768 · `MODAL_SURFACE` 520/720/960 ·
  `LOCAL_SCROLL_WORKSPACE`), one 4 px-derived spacing ramp, one responsive gutter, real modal and
  form containment, a proven no-horizontal-overflow invariant for ordinary screens, real-browser
  geometry evidence, and a visible path for every already-decided user-facing capability.
- Named baseline defects, all repaired at source: the Task create/edit dialog rendered a bare
  `<form>` inside a backdrop with no surface, width, padding, scroll container or grid; Settings
  produced a measured 15 px document-level horizontal scrollbar from `width: 100vw` shell sizing,
  compounded by a main viewport that was not a containing block so `srOnly` spans escaped its
  `overflow: auto`; Today period headings concatenated as `Morning04:00–12:00`; and the Today
  timeline row declared three grid tracks for up to four rendered children.
- Measured baseline → final across 54 comparable rows: document horizontal overflow 18 rows at
  +15 px → **0**; maximum capped-frame left/right imbalance 15.2 px → **0.00 px**; content roots
  governed by the shared frame 0 → **54 of 54**; distinct standard-page widths at 1920 expanded
  3 → **1**.
- The UI surface census audited 101 decided capabilities against all 117 registered handlers and
  found exactly one `MISSING_USER_SURFACE` group — Task edit, Task delete and recurring-occurrence
  edit were reachable only by double-click or `Enter` on a row that advertised neither. One visible
  row Edit control resolves all three; zero `BLOCKED_SURFACE` items.
- Native phase 21 proves the invariants against the real WebView box model at 1280×720, 1440×900 and
  1920×1080 in both sidebar states: 22 passing, 0 failing. One deliberate break — a known
  overflowing fixed dialog width — failed exactly the containment assertion at all three viewports
  and was restored to 22 passing with no residue.
- Gates: `pnpm verify` (including a new layout-authority governance check), typecheck, 766 frontend
  tests across 51 files, production build, performance with `violations: []` against the
  **unchanged** Task 49 budget, `cargo fmt`, full-target clippy, 790 Rust tests serial (4 ignored),
  release installer, phase 21, bounded native segments, and RC dogfood all pass.
- Disclosed and deliberately not repaired: the pre-existing Phase 14 / Phase 17 cross-phase fixture
  collision Task 49 recorded. The full matrix reaches phase 17 and stops with a byte-identical
  failure; phase 17 passes standalone and phases 18–21 pass as one segment. Weakening it was
  explicitly prohibited without separate Product Owner authorization. Physical Windows DPI evidence
  at 125% / 150% is **NOT RUN**.
- **Task 50 is not a feature checkpoint.** Following the Task 40 precedent, `latest_feature_task`
  stays 49 at `7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`.
- Art direction is explicitly out of scope and remains unallocated: no palette, brand, logo, font
  family, icon language, radius or shadow language, illustration, Visual World art, motion
  personality, or sound change.
- At Task 50 closure the next action was a Product Owner gate, with Task 51 prohibited, unstarted,
  unallocated and unrecommended. That gate has since been taken: Task 51 is activated above under
  ADR 0045. Full Task 50 evidence remains in `docs/audits/task-50-layout-final.md`.

### Task 50 post-closure remediation — maximized-window layout

Task 50 stays closed. A follow-up pass locked the layout for the canonical desktop presentation — a
real Windows window **maximized to the usable work area** — and fixed every defect it surfaced.

Measured environment: screen 1536×864 CSS at `devicePixelRatio` 1.25, work area 1536×816,
**maximized inner viewport 1536×794**. Nothing is hard-coded to that size; the measured viewport is
the authority. This also explains the anomaly the Task 50 baseline recorded but could not attribute:
a requested 1920-wide window exceeds the 1536 CSS screen, which is why one capture read 1536.

A mechanical **semantic-collision detector** was added (`e2e-tests/support/spacingAudit.ts`). Task
50's gate proved containment — nothing overflows or overlaps — but could not prove *separation*:
`Morning04:00–12:00` overlaps nothing and is still a blocking defect. The detector measures the gap
between adjacent semantic units' actual text ink in the real WebView, across every screen.

Across five passes it went from **239 collisions to 0** on 24 screens, with zero document overflow
and zero main-viewport overflow throughout. Confirmed defects, all fixed at source:

- **`Life areaNone` / `Focus PlanNone`** — both comboboxes rendered a bare `<div>` with an inline
  `<label>` and `<input>`, the exact label/control concatenation the contract calls blocking. They
  now use the shared field geometry.
- **Today row metadata was a bare inline flow**, so the category ran into the Life-area chip. Title,
  description, metadata and tags are now four stacked units with a wrapping metadata group; the
  Life-area and Focus-Plan chips are bounded and wrap rather than truncate, so no information is
  lost.
- **`Hours`/`Minutes` in Category goals** sat against each other in inline flow; they are now two
  field units inside one bounded group.
- **Life Browse was badly unbalanced** — a single child card marooned far left under a centred focal
  node. This was a Task 50 regression: `auto-fill` keeps empty tracks. Changed to `auto-fit` with a
  capped track and centred packing.
- **Plans' create form wrapped**, the `width:100%` input consuming the whole flex line and pushing
  Create onto a second row. The header field now flexes from a readable basis.
- **Analytics metrics drifted to the thirds** of a 1152 px frame; the fact grid now caps its track so
  three metrics read as one group.
- **~70 native buttons and every `<select>` rendered at the UA default `padding: 1px 6px`** — cramped
  browser controls on the week strip, the Analytics period controls, tag actions, planning and
  saved-view actions and the plan table. A baseline control geometry was added to the layout
  authority at **element-selector specificity**, so every component that already styles itself still
  wins and nothing gains a colour, border, radius or shadow.

The previously disclosed frontend flake is now **diagnosed and fixed, not carried**: it was not
Testing Library losing a race but vitest's default 5 s per-test budget being exceeded under
full-suite thread contention. `testTimeout`/`hookTimeout` are raised and the Testing Library async
window is set below them so a genuine miss still reports "unable to find" rather than a bare
timeout. Two consecutive clean full-suite runs followed.

Gates: `pnpm verify` including the layout-authority check, typecheck, **766 frontend tests across 51
files**, production build, performance `violations: []` against the unchanged Task 49 budget
(index 529,527 ≤ 535,000; 24 chunks), native phase 21 **22 passing**, and the maximized audit at
**0 collisions**. Regression re-measured at 1280×720 and 1440×900: 54 rows, zero overflow, zero
centring imbalance, and the four standard pages share one frame width at every viewport
(952.8 / 1103.2 / 1152).

Schema stays 27. No migration, Rust, IPC, capability, dependency, workflow or seal change, and no
palette, font, icon, radius, shadow, illustration, Visual World or motion change.

## Task 49/60 — Focus Plan Activity Analytics Core (complete)

- Activation baseline: `86261298ccd99204da503f508b4dfb9ac50cee04`.
- Activation commit: `2d12d76011a73934a0dab4cab8f0977bf0deb99c`.
- Product checkpoint: `7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`.
- Closed slice: `039-focus-plan-activity-analytics` under ADR 0043.
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
  library, workflow/seal change, or Task 50 work was added.
- Next action: Product Owner gate. Task 50 is prohibited, unstarted, unallocated, and
  unrecommended. Full evidence is in
  `docs/audits/task-49-focus-plan-activity-analytics.md`.

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
