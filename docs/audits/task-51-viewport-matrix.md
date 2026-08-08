# Task 51 — multi-viewport geometry matrix

Post-inspector evidence for the V2 production application, measured at `8da800a` + the audit-harness
extension in this commit.

## 1. Harness change

`e2e-tests/support/spacingAudit.ts` gained an **explicit viewport mode** beside the existing
canonical one. Nothing about Task 50's geometry policy changed: the collision definitions, the 8 px
inline semantic floor, the scroll-owner rules and the overflow rules are untouched, and no assertion
was relaxed to make a smaller viewport pass.

```text
canonical         no LIFEWEAVE_AUDIT_VIEWPORT  -> maximize and measure   (Task 50 authority)
explicit viewport LIFEWEAVE_AUDIT_VIEWPORT=WxH -> size, verify, measure
```

Three things the explicit mode does that the reverted first attempt did not:

1. **It sizes the outer window from measured chrome.** `setWindowRect` sizes the frame, not the
   viewport, so the chrome delta is read from the live window and added, then corrected once for DPI
   rounding.
2. **It re-applies after the fixture reload instead of re-maximizing.** The walk reloads and
   re-asserts its presentation; the previous attempt re-maximized there unconditionally, which
   silently discarded the requested size and measured a maximized window while reporting a small
   one.
3. **It verifies and fails loudly.** The achieved `innerWidth × innerHeight` must be within 2 px of
   the request — enough for DPI rounding at 1.25 and nothing more. A viewport that does not fit the
   desktop is rejected *before* the resize is attempted, because asking for one killed the WebView
   mid-run and produced `no such window: target window already closed`, which reads like a product
   crash and is not one.

Every row below therefore reports what the WebView actually measured, not what was asked for.

## 2. Results

```text
requested    achieved     DPR    screens  collisions  docOverflow  vpOverflow
1536x794*    1536x794     1.25      24         0           0            0
1280x800     1279x799     1.25      24         0           0            0
1280x720     1280x720     1.25      24         0           0            0
 960x640      960x640     1.25      24         0           0            0
1440x900     NOT ACHIEVABLE — see §3
```

`*` canonical maximized mode; the measured viewport is the authority and nothing is hard-coded to it.

Today frame utilisation across the matrix, with Today now `WIDE_WORKSPACE`:

```text
1536x794   frame 1163 / 1184   ratio 0.982
1280x800   frame  922 /  942   ratio 0.978
1280x720   frame  922 /  943   ratio 0.978
 960x640   frame  622 /  642   ratio 0.968
```

## 3. 1440 × 900 is not achievable on this display

The measured work area is **1536 × 816**. A 900 px-tall viewport needs a window taller than the
desktop, so Windows cannot present it. The harness now refuses it with an explicit message rather
than attempting a resize that destroys the WebView.

This is an environment limit, not a layout defect, and it is the same class of anomaly Task 50
recorded when a requested 1920-wide window measured 1536. 1280 × 800 exercises the same breakpoints
1440 × 900 would have, and it passes.

Recorded as **NOT ACHIEVABLE**, not as passed and not as skipped.

## 4. Surface behaviour at the small end

Inspected in the rendered captures rather than inferred:

- **960 × 640**, the `tauri.conf.json` minimum, holds completely. Sidebar, workspace tabs, week
  strip, page header and the row group all remain legible; long task titles, the Life-area chip and
  the Focus-Plan chip **wrap rather than truncate or clip**, which is the behaviour Task 50 chose
  deliberately so an ellipsis never removes meaning from sighted users.
- **The conditional split holds.** With nothing selected Today renders a single column at every
  viewport, so no empty inspector rail is reserved — the defect that appeared twice earlier in this
  task does not recur at any size.
- **The week strip's 8 px day gap survives compression.** It was the source of five semantic
  collisions when it was 2 px; at 960 px wide the cells narrow but the gap holds and the detector
  stays at zero.
- **The workspace tab strip wraps** rather than forcing horizontal scroll, which is what keeps the
  document-overflow invariant true at the narrow end.

## 5. Selected state — the production inspector

The walk now selects a real seeded task and exercises the production inspector and all four of its
facets. Selection is semantic: it clicks the row **title**, because the row's Life-area and
Focus-Plan chips are buttons that correctly `stopPropagation`, and on this fixture a long
Focus-Plan chip sits across the row's centre — a naive centre-click selected nothing and the first
run failed on exactly that. The wait is on `aside[aria-label^="Details for"]`, which exists only in
`features/task/today/TaskInspector.tsx`, so the evidence cannot accidentally pass against the
isolated prototype.

### State coverage — explicit, not inferred

| Viewport | achieved | Today unselected | Today selected + inspector | facets | Result |
|---|---|---:|---:|---:|---|
| 1536×794 | 1536×794 | YES | YES | Note · Details · Time · Links | PASS |
| 1280×800 | 1279×800 | YES | YES | Note · Details · Time · Links | PASS |
| 1280×720 | 1280×720 | YES | YES | Note · Details · Time · Links | PASS |
| 960×640 | 959×639 | YES | YES | Note · Details · Time · Links | PASS |
| 1440×900 | — | NOT TESTED | NOT TESTED | — | NOT ACHIEVABLE |

28 screens per run, **0 semantic collisions, 0 document overflow, 0 workspace overflow** at every
achievable viewport.

### One real defect, found by rendering it

At 960 × 640 the row highlighted and **nothing else appeared**. `splitWorkspace` drops to a single
column below 900 px of container width, so the inspector was stacking beneath the entire timeline:
real, correctly ordered, and completely off-screen. Selecting a task looked like it had failed.

The geometry numbers were clean throughout — stacking is perfectly valid layout — so this was only
visible by looking at the capture. It is the clearest argument in this task for rendering evidence
rather than reading CSS.

Fixed with two changes, neither of which reorders anything:

1. **The inspector scrolls itself into view when it opens stacked.** Task 50 stacks in DOM order
   precisely so reading and focus order survive narrow widths, so CSS `order` was rejected. The
   scroll uses `block: "nearest"`, a no-op in the side-by-side layout, and the default instant
   behaviour needs no reduced-motion branch.
2. **The separator follows the layout.** A leading vertical hairline on a full-width stacked block
   reads as a stray line; the same container query the split uses switches it to a top rule, and
   drops `position: sticky`, which is only meaningful beside the timeline.

Re-audited at 960 × 640 after the fix: inspector visible with its title, close control, all four
facet tabs and its body; 28 screens, 0 collisions, 0 overflow.

## 6. What this does not yet cover

- Physical Windows DPI scaling at 125% / 150% remains **NOT RUN**; every row above is at the
  system's own 1.25 device pixel ratio, which is not the same test.
- Keyboard focus order through the inspector, and focus restoration on close, have not been
  measured — only the close control's presence and accessible name.
