# Task 51 — VISUAL LOCK evidence

Presented for Product Owner approval. **No production presentation file has been modified.**

## 1. Baseline

```text
activation baseline   43d0d1e822336c97527f85e1ab154fc74a61f058
branch                task-51-visual-experience   (local only, never pushed)
checkpoints           d28cbb1  activate the slice and record the baseline
                      834a6f3  record the visual state matrix
                      3d2e728  add the visual design system and full-screen Today prototype
schema                27 → 27, no migration
OS                    Windows 11 build 26200
hardware              Intel i3-1115G4, 2 cores / 4 threads, Intel UHD, 7.8 GB RAM
WebView2              151.0.4129.72
display               1536 × 864 CSS at devicePixelRatio 1.25, work area 1536 × 816
inner viewport        1536 × 794 maximized
```

## 2. What changed

A visual authority was added beside Task 50's geometry authority, and the entire Today composition
was rebuilt in an isolated prototype.

```text
frontend/src/design-system/visual/
  contract.css.ts     createThemeContract — every role null, so a missing role is a type error
  lightTheme.css.ts   oklch(), measured from the reference
  darkTheme.css.ts    oklch(), composed rather than inverted
  typography.css.ts   two families, one measured scale, three self-hosted Literata subsets
  motion.css.ts       named durations, two easings, two springs, a designed reduced-motion state
  icons.tsx           GENERATED — 22 icons vendored from 20,621

frontend/src/prototypes/task51/   the isolated full-screen composition
frontend/prototype.html            a second Vite entry, excluded from the production build
scripts/generate_visual_icons.py   reproducible icon vendoring
e2e-tests/specs/task51-visual-lock-capture.e2e.ts
```

Vocabulary replaced: **31 border radii → 4**, **14 box shadows → 3**, **29 hardcoded hex colours →
semantic roles**, and a type, motion and icon scale where there had been none.

## 3. Fidelity to the reference

Measured, not eyeballed — full method and numbers in `task-51-reference-measurement.md`.

```text                 reference   adopted   note
sidebar                    268       260     inside the prompt's 240–260 range
workspace                  816       812     the column the design is about; 4 px from reference
inspector                  483       464     inside the prompt's 400–470 range
task row pitch              40        40     exact
nav pill height             45        44
canvas                 #FBFAF9   #FBFAF9     exact
sidebar plane          #F5F4F3   #F5F4F3     exact
selected task row      #EFEFF4   #EFEFF4     exact
selected nav pill      #E9E9EE   #E9E9EE     exact
accent                 #3B4D92   #3B4D92     exact
```

Two measurements changed the design and would not have been found by inspection:

1. **The inspector is not a panel.** It samples the same `#FBFAF9` as the workspace, with a 1 px
   hairline between them and no fill, shadow or radius of its own.
2. **There is no period container.** The area behind the task rows is the same canvas as beside
   them. What reads as a rounded block is only the rows' shared edge and their hairline separators.

## 4. Enclosure

The composition's only bordered box is the Life System preview, and it earns its border by being a
different kind of thing from the metadata above it — a spatial diagram, not a list of facts.

The automated detector reports a **deepest chain of 3**, counting every element that changes
background tone. Those three are `plane → sidebar region → selected nav fill`. None is a rectangle
inside a rectangle: a tonal zone and a selection fill are explicitly what ADR 0045 asks hierarchy to
be built from. Counting only bordered or shadowed boxes, the deepest chain is **1**.

Reported both ways rather than tuning the detector to produce the flattering number.

## 5. Measured results

Final pass, label `lock`:

```text
captures                                    12
semantic spacing collisions                  0    (Task 50 detector, reused unchanged)
document horizontal overflow                 0    every state, every viewport
workspace overflow                           0    every state, every viewport
viewports measured   1536×794 · 1280×800 · 1280×720 · 960×640
```

960 × 640 is the `tauri.conf.json` minimum window, and it holds.

**A requested 1440 × 900 is not reliably reachable on this machine.** The work area is 1536 × 816,
so a 900 px-tall window does not fit; Windows clamps it and the window falls back to its configured
1280 × 800 default. Two of the four capture passes measured a true 1440 × 900 and two measured
1280 × 800, which is the same class of anomaly Task 50 recorded when a requested 1920-wide window
measured 1536.

Recorded as measured rather than as requested. The composition holds at every width that was
actually achieved, and 1280 × 800 exercises the same breakpoints 1440 × 900 would.

## 6. Contrast

Every value computed from the actual tokens.

```text
textPrimary       15.77:1     textSecondary     9.64:1     accent      7.57:1
accentMuted        4.69:1     textTertiary      5.03:1 canvas / 4.50:1 selected
borderStrong       3.15:1     selectionEdge     3.15:1
dark theme         all text roles 4.97:1 – 16.39:1 over canvas, surface and selected
```

Four roles had to deviate from the reference anchors, each by lowering OKLCH lightness at identical
hue and chroma. The fourth is the important one:

> **`#EFEFF4` selection measures 1.10:1 against the canvas** — far below the 3:1 WCAG 2.2 SC 1.4.11
> asks of a state indicator. The reference's selection is beautiful and, alone, not perceivable
> enough to carry state.
>
> Resolved by **addition, not substitution**: the fill stays exactly as measured, and a 2 px
> `selectionEdge` rule at 3.15:1 runs down the row's leading edge. Two signals, neither of which is
> a strong border, a saturated fill or a shadow — so ADR 0045's restraint rule still holds.

## 7. Deviations from the reference

Visual, and reversible:

| What | Why |
|---|---|
| `textTertiary` darkened `#7A7979` → `#6E6D6D` | anchor fails 4.5:1 at metadata sizes on both canvas and selected fill |
| status text darkened | the green and warm anchors are fill tones; as text they measure 2.49 and 2.57 |
| selection gains a 2 px accent edge | see §6 |
| ambient art is light blue | explicit Product Owner direction, scoped to the three ambient roles only |
| rows may wrap to two lines | Lifeweave rows carry real metadata the reference's rows do not; truncating would destroy meaning, which §37 forbids |

Product, and **not** reversible without a semantics decision:

| Reference shows | Resolution |
|---|---|
| Reader and Narrative Canvas as sidebar destinations | treatment adopted, product navigation kept — `Ctrl+1..6` bind to the existing six |
| no Analytics | kept; removing a destination is a product change |
| a user avatar and name | **not reproduced** — no account, no login, no server |
| "Subtasks 3/5" | replaced by **Time**, a real Lifeweave facet with no reference equivalent |
| "Links 2" | kept, remapped to the real links a Task has — Life area and Focus Plan |
| "Energy" | not reproduced; no such field |

## 8. Cost

```text
production bundle delta                     0 bytes
index.js                              529,527   unchanged, same content hash
chunk count                                24   unchanged
hardening:performance                violations: []
Literata assets (prototype only)      106,560   3 subsets; 4 unused subsets not imported
icons.tsx source                        9,064   22 of 20,621 icons, vendored
```

The prototype is a separate Vite entry, so the shipped application is byte-identical. Production
cost will be measured during reconstruction, not estimated now.

## 9. Gates

```text
pnpm verify         PASS   including the layout authority check
pnpm typecheck      PASS
pnpm build          PASS   byte-identical output
hardening:performance PASS violations: []
capture spec        PASS   12 captures, 0 collisions, 0 overflow
global.css          UNCHANGED — the Task 50 art-direction freeze is not touched before lock
```

Two gates caught real problems during this phase and neither was weakened to pass: the remote-asset
check rejected a URL in an attribution comment, and the security check rejected React inline-style
props, which the CSP's `style-src 'self'` is the reason for. Both were fixed at source.

## 10. Defects found by composing the whole screen

Recorded because they are the argument for the full-screen-first rule:

1. **The inspector column was reserved when nothing was selected** — a dead 464 px band down the
   right third, with the ambient field stopping at an invisible edge. Only visible when the empty
   and populated states were rendered at full size.
2. **Default WebView2 scrollbars** rendered as a bright vertical bar through the middle of the dark
   composition.
3. **The ambient field washed across the task titles** before its centres were pulled to the edges.

None would have been caught by restyling a sidebar, then buttons, then Today.

## 11. Open decision — the titlebar

The reference draws its own 52 px titlebar inside the application surface. Lifeweave uses the native
Windows titlebar. Matching it needs `decorations: false` plus window-control capabilities, and
spec §11 currently excludes any new Tauri capability.

Raised for decision rather than assumed either way. It changes the top 52 px and nothing else.

## 12. Not yet done

```text
forced-colors             NOT RUN
Narrator spot checks      NOT RUN
physical DPI 125% / 150%  NOT RUN   (inherited debt, also NOT RUN at Task 50 closure)
Vietnamese rendering      rendered in the dense fixture; not yet reviewed by a reader
visual regression goldens NOT ESTABLISHED — deliberate; goldens are set after the lock, not before
```

Recorded honestly rather than claimed.

## 13. Next action

**Wait for Product Owner `VISUAL LOCK APPROVED`.**

Production visual reconstruction does not begin before that phrase is received. Approval is not
inferred.
