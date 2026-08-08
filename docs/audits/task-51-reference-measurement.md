# Task 51 — reference image measurement

Measured from `docs/visual/task-51/lifeweave-visual-baseline-v1.png` by pixel sampling, not by eye.
Where this file and the activation prompt's fallback guidance disagree, this file wins: prompt §4
states the values there "must not override direct measurement from the image".

```text
image           1586 × 992
window frame    x 0–7 and 1578–1585, y 0–7 and 984–991  (desktop drop shadow, not the app)
app content     x 8–1577, y 8–983   →   1570 × 976
```

## 1. Column geometry

```text
sidebar     x    8 →  275     268 px    17.07%
divider     x  275 → 276      1 px hairline
workspace   x  277 → 1092     816 px    51.97%
divider     x 1093 → 1094     1 px hairline
inspector   x 1095 → 1577     483 px    30.76%
```

Reconciled with the real maximized inner viewport of **1536 × 794**:

```text
                 reference   scaled to 1536   adopted   note
sidebar             268           262           260     inside the prompt's 240–260 guidance
workspace           816           799           812     the closest match, and the one that matters
inspector           483           473           464     inside the prompt's 400–470 guidance
```

The workspace is the column the design is actually about, and the adopted split reproduces it to
within 4 px of the reference. The sidebar and inspector absorb the difference, which is why they sit
at the top of the prompt's stated ranges rather than at the measured widths.

## 2. Vertical rhythm

```text
titlebar             y   8 →  60     52 px
nav pill (selected)  y  85 → 129     45 px   (adopted: 44)
task row pitch                       40 px   measured 317→357→397 at the checkbox column
selected row                         41 px
sidebar divider 1    y 390 → 392
sidebar divider 2    y 893 → 894     above the footer
```

## 3. Sampled colours

Dominant colour of each flat region, so text antialiasing does not skew the sample.

| Region | Measured | Adopted role |
|---|---|---|
| workspace canvas | `#FBFAF9` | `canvas` |
| **inspector plane** | `#FBFAF9` | `canvas` — *the same plane* |
| period row band | `#FBFAF9` | `canvas` — *no container exists* |
| Life preview interior | `#FBFAF9` | `canvas` — hairline and radius only, no fill |
| sidebar plane | `#F5F4F3` | `surface` |
| titlebar | `#F5F4F3` | `surface` |
| sidebar selected pill | `#E9E9EE` | `surfaceSelectedNav` |
| selected task row | `#EFEFF4` | `surfaceSelected` |
| active tab rule / checkbox fill | `#3B4D92` | `accent` |

### 3.1 The two findings that changed the design

**The inspector is not a panel.** It samples `#FBFAF9` — byte-identical to the workspace canvas —
and the only thing between them is a 1 px hairline at x 1093–1094. It has no fill of its own, no
shadow, and no radius. This is the single strongest piece of evidence for the continuous-surface
law in the entire reference, and it is the opposite of what a "context panel" is usually built as.

**There is no period container.** The area behind the task rows samples the same `#FBFAF9` as the
canvas beside it. What reads as a soft rounded block is only the rows' shared left edge and their
hairline separators. Building the obvious rounded surface there would have added an enclosure level
the reference does not have.

Both were invisible to inspection and only appeared under sampling.

### 3.2 Life System preview nodes

Every node sits within 1.2:1 of the canvas, which is why the preview reads as a quiet diagram
rather than a colourful mind-map.

```text
Creative Expression    #FAF3EB   lifeCream
Learning & Growth      #EBF0E9   lifeMint
Impact & Contribution  #EDEFF2   lifeBlue
Lifeweave Project      #EBEBF3   lifeLavender   (the focal node)
Health & Energy        #EDF2EE   lifeMint
Relationships          #FAF3EE   lifePeach
```

## 4. Measured contrast, and the four deviations it forced

Every value below is computed, not estimated. Deviations preserve the anchor's hue and chroma and
change only OKLCH lightness, so the role keeps its character.

| Role | Anchor | Measured | Required | Verdict |
|---|---|---|---|---|
| textPrimary `#201F1F` | — | 15.77 | 4.5 | adopted unchanged |
| textSecondary `#424242` | — | 9.64 | 4.5 | adopted unchanged |
| accent `#3B4D92` | `#44579F` (6.48) | **7.57** | 4.5 | measured value adopted; better than the anchor |
| accentMuted `#5D6EAD` | — | 4.69 | 4.5 | adopted unchanged |
| borderStrong / selectionEdge `#7A8EB8` | — | 3.15 | 3.0 | adopted unchanged |
| **textTertiary** | `#7A7979` | 4.16 canvas / 3.79 selected | 4.5 | **DEVIATION 1** → `#6E6D6D`, 5.03 / 4.50 |
| **success text** | `#7BAC84` | 2.49 | 4.5 | **DEVIATION 2** → `#4F7E59`, 4.52 |
| **warning text** | `#DB8A68` | 2.57 | 4.5 | **DEVIATION 3** → `#AC5F3F`, 4.51 |
| **selection fill** | `#EFEFF4` | **1.10** | 3.0 | **DEVIATION 4** — see below |

### Deviation 1 — `textTertiary`

`#7A7979` is used for metadata at 12–13 px. That is body text, so it needs 4.5:1, not the 3:1
large-text allowance, and it fails on both the canvas and the selected fill. Lightness lowered
57.70% → 53.74% at identical hue and chroma. Reversible; the cost of reverting is metadata that
fails AA over a selected row.

### Deviations 2 and 3 — status text

The green and warm-accent anchors are **fill** tones. As text they measure 2.49 and 2.57. The
anchors are kept unchanged as `successSoft` and `warningSoft`, and darker counterparts were derived
for the text roles. Nothing in the reference contradicts this: the reference never sets text in
those colours.

### Deviation 4 — selection cannot rely on the fill

`#EFEFF4` measures **1.10:1** against the canvas and `#E9E9EE` measures 1.16:1. WCAG 2.2 SC 1.4.11
asks 3:1 of a state indicator. The reference's selection is therefore beautiful and, on its own,
not perceivable enough to carry state.

Resolution: **keep the fill exactly as measured, and add a companion signal.** A 2 px
`selectionEdge` rule at 3.15:1 runs down the leading edge of a selected row. Selection is then
carried by two signals, neither of which is a strong border, a saturated fill or a shadow — so
ADR 0045's restraint rule still holds.

This is the one place where matching the reference exactly would have failed an accessibility gate,
and it is resolved by addition rather than by changing what the reference shows.

## 5. Product deviations the reference cannot dictate

These are not visual choices. Each is a place where the reference depicts something Lifeweave does
not have, and spec §11 forbids inventing product semantics to match a picture.

| Reference shows | Lifeweave has | Resolution |
|---|---|---|
| Sidebar: Reader, Narrative Canvas as destinations | Reader and Narrative live inside Life System | Reference *treatment* adopted, product navigation kept. `Ctrl+1..6` bind to the existing six destinations and ADR 0039 forbids changing chord semantics without authorization. |
| Sidebar: no Analytics | Analytics is a top-level destination | Kept. Removing a destination is a product change. |
| Sidebar footer: user avatar, "Maya Chen" | No account, no login, no server | **Not reproduced.** `AI_CONSTITUTION.md` §2. The footer carries the collapse and theme controls instead. |
| Inspector tab: "Subtasks 3/5" | No subtasks | Replaced by **Time**, a real Lifeweave facet (Task 43 actual-time sessions) with no reference equivalent. |
| Inspector tab: "Links 2" | No task-to-task links | Kept, remapped to the real links a Task has — its Life area and its Focus Plan. |
| Metadata: "Energy" | No energy field | Not reproduced. |
| Metadata: Estimate, Focus Block, Project, Status, Created | Duration, schedule, Focus Plan, evaluation, `created_at` | All map to real fields and are kept. |
| Custom in-app titlebar with window controls | Native Tauri decorations | **Open decision — see §6.** |

## 6. Open decision: the titlebar

The reference draws its own titlebar inside the application surface: app mark, product name, and
minimize / maximize / close at 52 px tall in the same `#F5F4F3` as the sidebar. Lifeweave currently
uses the native Windows titlebar, because `tauri.conf.json` does not set `decorations`.

Matching the reference here means `decorations: false`, a custom drag region, and window-control
buttons — which needs `core:window:allow-minimize`, `allow-toggle-maximize` and `allow-close`.
Spec §11 currently excludes "any new Tauri capability", so this cannot be done under the present
contract even though it is presentation.

It is raised as an explicit Product Owner decision rather than assumed in either direction. The
prototype composes the content area only, so the answer changes the top 52 px and nothing else.

## 7. Method

```text
Pillow 12 pixel sampling; dominant colour over flat regions to exclude antialiasing
sRGB → linear → OKLab → OKLCH for every conversion
WCAG 2.x relative luminance and contrast ratio for every measurement
binary search on OKLCH lightness, hue and chroma held, for every derived deviation
```

Scripts are ad hoc and were not committed; every number they produced is recorded above so the
result does not depend on rerunning them.
