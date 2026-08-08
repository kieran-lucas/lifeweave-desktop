# Task 51 — Visual Experience Overhaul: Phase 0 baseline

Recorded before any Task 51 change. Nothing in this file is a claim about the target design; it is
the measured state Task 51 starts from, so that every later assertion has something to be compared
against.

## 1. Git state

```text
activation baseline (authored)  43d0d1e822336c97527f85e1ab154fc74a61f058
HEAD at Phase 0                 43d0d1e822336c97527f85e1ab154fc74a61f058   (identical)
working tree                    clean
local branch                    task-51-visual-experience  (created from 43d0d1e, not pushed)
schema                          27
```

HEAD matches the authored baseline exactly, so no delta reconciliation was required.

## 2. Runtime environment

Measured on the Product Owner's Windows machine, not assumed.

```text
OS                Windows 11 Home Single Language 10.0.26200 (build 26200)
CPU               Intel Core i3-1115G4 @ 3.00 GHz — 2 cores / 4 threads
GPU               Intel UHD Graphics (integrated), driver 31.0.101.5522
RAM               7.8 GB
Display mode      1920 × 1080 physical
Node              v24.15.0
rustc             1.95.0
pnpm              11.17.0
WebView2 Runtime  151.0.4129.72
Edge WebDriver    151.0.4129.72
```

### Measured WebView geometry, window maximized

```text
screen (CSS px)          1536 × 864
devicePixelRatio         1.25
usable work area         1536 × 816
outer window             1522 × 779
maximized inner viewport 1536 × 794
```

Identical to the environment Task 50's post-closure remediation recorded. `tauri.conf.json` declares
`minWidth: 960`, `minHeight: 640`, `transparent: false`.

**Hardware note carried into every later decision.** Two physical cores and an integrated GPU are
the target, not a workstation. Task 51's P0/P1 priorities — immediate acknowledgement and
compositor-friendly motion — are constraints this machine will actually enforce. It also makes the
prompt's prohibition on blur, glass and continuous decorative work a performance requirement rather
than only a taste one.

## 3. Baseline gate results

Every gate run at `43d0d1e` before any Task 51 edit.

| Gate | Command | Result |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | PASS — already up to date, 3 workspace projects |
| Governance | `pnpm verify` | PASS — source integrity, repository, project state, spec index, coverage matrix, no-remote-assets, security, hardening, layout authority |
| Types | `pnpm typecheck` | PASS — no diagnostics |
| Unit | `pnpm test` | PASS — **766 tests across 51 files**, 108.67 s |
| Build | `pnpm build` | PASS — 881 modules, 24 JS chunks |
| Bundle budget | `pnpm hardening:performance` | PASS — `violations: []` |
| Layout audit | `pnpm e2e:windows -- task50b-maximized-audit.e2e.ts` | PASS — 24 screens, **0 collisions**, 0 overflow |

Rust gates were not re-run at Phase 0: Task 51 is frontend-presentation scope and the Rust tree is
untouched. They are recorded as NOT RUN rather than assumed passing, and will be run before closure.

### 3.1 Bundle baseline

```text
main_js_bytes         529,527      locked ceiling  535,000     headroom  5,473
total_js_bytes      1,241,349
total_js_gzip_bytes   380,846
expected_chunk_count       24
BasicLeafEditor.js     52,350      locked ceiling  490,000
markdown.js           116,540      locked ceiling  129,000
```

**`index.js` has 5,473 bytes of headroom against its locked ceiling.** This is the single hardest
pre-existing constraint on Task 51 and is raised as an open item in §6, not silently absorbed.

### 3.2 Layout invariants at the canonical maximized viewport

```text
screens walked                 24
semantic spacing collisions     0
document horizontal overflow    0 on every screen
main viewport overflow          0 on every screen
```

Frame utilisation, sidebar expanded:

```text
standard pages   frame 1152 / viewport content box 1224   ratio 0.941
wide workspaces  frame 1193–1345 / 1224–1376             ratio 0.975–0.978
```

Frame utilisation, sidebar collapsed:

```text
today            frame 1152 / 1376   ratio 0.837
analytics        frame 1152 / 1376   ratio 0.837
```

Collapsing the sidebar therefore does not give the page more usable width — it converts 152 px of
sidebar into 152 px of empty gutter. That is a composition observation for Task 51, not a Task 50
defect: the invariants Task 50 owns all hold.

Artifacts: `target/e2e-artifacts/task-50b/pass1/` — 24 PNGs plus `audit.json` (not committed).

## 4. Visual-system baseline

This is the state Task 51 exists to replace. Measured by static extraction across all 30
`*.css.ts` files.

### 4.1 There is no visual token authority

`frontend/src/design-system/global.css` is 99 lines and declares **13 CSS custom properties** — one
accent, one surface, two text tones, one border, one active background, one icon background, one
focus ring, two layer indices, and light/dark/forced-colors variants of the same. There is no scale
for radius, elevation, hairline, editorial type, or motion.

Consequently every feature invents its own. Counted across `frontend/src`:

```text
distinct borderRadius values           31
distinct boxShadow values              14
hardcoded hex colours in features/*    29 distinct, 87 occurrences
border declarations                   141
background declarations               186
```

The 31 radii include `4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 24, 999, 50%` alongside
`0.4rem, 0.5rem, 0.55rem, 0.6rem` and the same numbers respelled as `px`. The hardcoded colours
include `#666` (18×), `#ddd` (15×), `#888` (8×) and `#c00`, none of which participate in the dark
theme or in forced colors.

This is structurally the same finding Task 50 made about page width — seven private answers to one
question — one layer up. Task 51's token architecture is the equivalent remedy.

### 4.2 Frozen art direction

`scripts/check_layout_authority.py` currently **fails the build** if any of these change:

```text
global.css must contain   font-family: Inter,
global.css must contain   --accent: #476dd6;
global.css must contain   --surface: #ffffff;
global.css must contain   --focus-ring: #476dd6;
tokens.css.ts must not declare any non-geometry --lw-* token
```

That freeze was correct for Task 50, whose ADR states art direction "remains unallocated and is
deferred to a later Product Owner gate". Task 51 **is** that gate. The freeze must therefore be
replaced by a Task 51 art-direction *authority* check rather than deleted — recorded as an intended
authority update under prompt §32, and not performed before VISUAL LOCK.

Note that the non-geometry-token rule only inspects `app/layout/tokens.css.ts`. A separate visual
contract under `design-system/visual/` does not collide with it, which is the architecture prompt
§11 already recommends.

### 4.3 Current shell composition

```text
sidebar          220 px expanded / 68 px collapsed, hard-switched, no inspector anywhere
nav item         42 px row, 24 × 24 grey rounded tile containing the destination's first letter
main viewport    one scroll container, gutter clamp(24px, 3vw, 48px), scrollbar-gutter both-edges
Today            tab strip → page header → week strip → period sections → rows
```

Observed anti-patterns against the Task 51 continuous-surface law, from the baseline captures:

1. **Letter tiles as icons.** Every destination renders its initial in a filled grey square. There
   is no icon vocabulary at all.
2. **A boxed segmented control inside a page.** Life renders Browse / Edit / Pinned / Graph as a
   filled rounded container holding four buttons, floated top-right — the exact
   "box → boxed navigation strip → box" shape prompt §4.4 prohibits.
3. **Card-on-card in Life Browse.** The focal node is a white card with a 24 px radius and a large
   soft shadow; each child is a second card with its own shadow, inside the page, inside the frame.
4. **Bordered metadata chips inside task rows.** Life-area and Focus-Plan chips are outlined boxes
   sitting inside a row that already has a bottom hairline, so a populated row reads as boxes in a
   box.
5. **The week strip is seven large bordered boxes** with a bordered arrow button at each end.
6. **Tabs above the H1.** The Today workspace tab strip renders above the page header, so the
   page title is not the first thing in its own page.
7. **Cool-grey palette.** Canvas `#f5f7fa`, surface `#ffffff`, accent `#476dd6` — a cool blue-grey
   system, where the reference target is a warm neutral canvas with a blue-violet accent.

None of these is a Task 50 defect. Task 50 deliberately delivered correct geometry with unallocated
art direction, and said so.

### 4.4 What already helps

```text
zero inline style={{}} in the entire frontend        — CSP style-src 'self' stays satisfiable
Motion 12.43 already proven under this CSP           — layout / layoutId in Life Edit and Life
one geometry authority with a 4 px ramp              — Task 51 adds visual tokens beside it, not over it
one main scroll container and one gutter             — a third column is a shell change, not a rewrite
spacingAudit.ts semantic-collision detector          — reusable as a Task 51 regression gate
task50b walk covering 24 screens                     — the seed of the Task 51 visual state matrix
```

## 5. Reference image

`docs/visual/task-51/lifeweave-visual-baseline-v1.png` **does not exist**; `docs/visual/` does not
exist. Under prompt §3, Phase 0–3 work may proceed, and **VISUAL LOCK cannot be completed or
claimed** until the Product Owner supplies the exact image. No approximation was generated.

## 6. Open items raised at Phase 0

1. **`index.js` headroom is 5,473 bytes.** Literata Variable is a font asset rather than JS, and a
   curated icon subset can be assets too, but a visual token contract, recipes and an inspector will
   add JS. Prompt §7/§33 states the 535,000 ceiling is not the highest objective for the final local
   build; `docs/PERFORMANCE_BUDGETS.md` states raising a maximum is a Product Owner decision
   supported by measurement. Both are satisfied by measuring at each lock gate and presenting the
   number, which is what Task 51 will do. No ceiling is changed unilaterally.
2. **The art-direction freeze in `check_layout_authority.py` must be intentionally replaced**, not
   bypassed. Deferred to production implementation; see §4.2.
3. **Governance contradiction.** `START_HERE.md`, `docs/STATUS.md` and
   `specs/040-global-layout-system/README.md` all record "Task 51: prohibited, unstarted,
   unallocated, and unrecommended". The Task 51 activation prompt is an explicit later Product Owner
   authorization, which `AI_CONSTITUTION.md` §1 ranks above those files. Reported rather than
   silently reconciled, and resolved by the Phase 1 governance packet.
4. **The reference inspector's facets may not all map to Lifeweave semantics.** The reference shows
   Note / Details / Subtasks / Links. A Lifeweave Task has a description, a category, a priority, a
   schedule, a deadline, tags, an optional Life area, an optional Focus Plan, optional recurrence
   and optional actual time — but no subtasks and no task-to-task links. Under prompt §37 no product
   semantics will be invented to match the picture; the deviation is recorded and carried into the
   VISUAL LOCK report.
5. **Physical Windows DPI evidence at 125% / 150% remains NOT RUN**, as it was at Task 50 closure.
