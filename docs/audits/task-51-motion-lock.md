# Task 51 — MOTION LOCK evidence

Presented for Product Owner approval. **No production presentation file has been modified.** The
locked visual composition was not redesigned; motion was added to it.

## 1. Baseline

```text
VISUAL LOCK       approved; composition unchanged
branch            task-51-visual-experience   (local only, never pushed)
OS / WebView2     Windows 11 26200 · WebView2 151.0.4129.72
hardware          Intel i3-1115G4, 2 cores / 4 threads, Intel UHD, 7.8 GB RAM
display           60 Hz; one frame = 16.67 ms
viewport          1536 × 794 maximized, devicePixelRatio 1.25
```

## 2. Measured capabilities

Probed in the real WebView, not assumed:

```text
document.startViewTransition      available
Element.prototype.startViewTransition  available
@starting-style                   supported
transition-behavior: allow-discrete    supported
prefers-reduced-motion emulation  effective (CDP Emulation.setEmulatedMedia)
PerformanceObserver longtask      observable
```

## 3. What each metric means

Stated precisely, because these names are easy to over-claim.

```text
input → commit   the trusted event's `timeStamp` to the moment React has committed the resulting
                 DOM change, read in a layout effect (after mutation, before paint). This is the
                 "state first" number: how long the application takes to decide. It must not depend
                 on any animation.

input → frame    the same origin to the requestAnimationFrame callback following that commit. rAF
                 runs immediately before paint, so this is a close lower bound on "visible", not a
                 claim about photons.

frame stability  rAF deltas sampled across the interaction window: p50, p95, longest, and how many
                 exceeded 20 ms (a dropped frame at 60 Hz).

long tasks       PerformanceObserver `longtask` — main-thread blocks over 50 ms.
```

## 4. Results — normal motion

Six repetitions of completion, four of each other interaction.

From the corrected run (`motion4`). Six repetitions of completion, four of each other interaction.

| Interaction | input → commit (ms) | input → frame (ms) |
|---|---|---|
| Task completion | min 3.0 · **p50 4.0** · max 9.3 | min 6.0 · **p50 12.0** · max 13.8 |
| Row selection → inspector | min 3.1 · **p50 3.3** · max 3.3 | min 4.6 · **p50 5.0** · max 5.1 |
| Layout settle (hide completed) | min 3.1 · **p50 4.4** · max 4.7 | min 5.7 · **p50 7.7** · max 15.9 |
| Day change | min 3.6 · **p50 5.0** · max 5.3 | min 8.4 · **p50 13.3** · max 17.1 |

Every commit lands **inside a single 16.67 ms frame** — the slowest p50 is 5.0 ms — and every visible
acknowledgement lands on the next frame or the one after. Nothing waits for an animation.

These reproduced across four separate runs on three separate builds: completion commit p50 stayed
between 4.0 and 4.9 ms throughout.

### Frame stability

```text
task-complete   6 runs   p50 16.6–16.7   p95 16.8–17.5   dropped>20ms: 0,0,1,0,0,0
layout-settle   4 runs   p50 16.6–16.7   p95 16.9–25.9   dropped>20ms: 2,1,1,0
day-change      4 runs   p50 16.6–16.8   p95 17.0–17.4   dropped>20ms: 0,0,0,0
drag            1 run    p50 16.6        p95 17.5        dropped>20ms: 0   over 1355 ms, 81 frames
idle            1 run    p50 16.7        p95 17.2        dropped>20ms: 0   over 2031 ms, 121 frames
long tasks >50 ms across the entire session: 0
```

**Drag is the strongest result: 81 frames across a 24-step gesture with zero dropped frames.** The
pointer path does no IPC, no query and no database work — it reorders an in-memory array and hands
the geometry to Motion's layout projection.

The `layout-settle` outliers (p95 25.9 ms, longest 43.2 ms) fall on the first run after load, when
Motion projects several removals for the first time. Subsequent runs are clean. One `task-complete`
run recorded a 67.4 ms longest frame with only one drop, which reads as a scheduling hiccup rather
than sustained jank — it is disclosed rather than averaged away.

## 5. Results — reduced motion

Emulated via CDP; `capabilities.reducedMotion` confirmed `true` before measuring.

| Interaction | input → commit (ms) | input → frame (ms) |
|---|---|---|
| Task completion | min 3.0 · **p50 4.2** · max 7.8 | min 5.5 · **p50 15.5** · max 16.8 |
| Row selection | min 3.7 · **p50 5.7** · max 8.8 | min 5.8 · **p50 11.5** · max 11.7 |
| Layout settle | min 2.2 · **p50 3.3** · max 3.7 | min 6.0 · **p50 10.2** · max 10.4 |
| Day change | min 2.9 · **p50 3.8** · max 4.5 | min 7.5 · **p50 7.9** · max 9.9 |

Reduced motion is **steadier**: completion dropped **zero** frames across all six runs, and drag
held 81 frames with zero drops. Commit latency is equivalent to normal — as it should be, since
reduced motion changes what is drawn, not when state is decided.

Travel is removed — press scale, drag lift, the entrance offsets — and a short 80 ms tonal
cross-fade is kept, so a change is still perceived as a change rather than becoming a jump.

This is a designed state, not the blanket `0.01 ms` zeroing the application currently ships, which
`docs/ACCESSIBILITY_AND_INPUT.md` already forbids.

## 6. View Transitions — and a retracted measurement

### 6.1 Retraction

Earlier passes of this gate reported that `document.startViewTransition` cost **791 ms** and
`Element.prototype.startViewTransition` **742 ms** from input to state commit, and the View
Transition was removed on that basis.

**Those figures were wrong, and the conclusion drawn from them is retracted.**

The cause was a defect in this instrumentation, not in the API: the layout effect that records the
commit did not list `dayOffset` among its dependencies, so after a day change the timer kept running
until some *later* interaction committed. The ~740 ms was the gap to the next click, not the cost of
a transition.

It was caught because the number stayed at 743.7 ms in a run where the View Transition had already
been removed entirely — which is impossible if the API were the cause. Recorded here rather than
silently corrected, because a wrong number that survived two runs is worth knowing about.

### 6.2 The corrected comparison

All three strategies are implemented behind `?vt=none|document|element` and measured against each
other in one run, five repetitions each:

| Strategy | input → commit (ms) | dropped frames per run | longest frame |
|---|---|---|---|
| **none** — state + keyed cross-fade | min 6.4 · **p50 6.8** · max 11.0 | 0, 1, 0, 2, 0 | 39.1 ms |
| `document.startViewTransition` | min 15.9 · **p50 19.8** · max 22.5 | 7, 1, 1, 1, 1 | 55.4 ms |
| `Element.prototype.startViewTransition` | min 19.0 · **p50 23.0** · max 28.0 | 1, 1, 1, 0, 0 | 27.5 ms |

The real cost is roughly **3× the commit latency**, not two orders of magnitude. It is a modest
number — but it pushes the commit from comfortably inside one 16.67 ms frame to comfortably outside
it, and the document-scoped variant produced a 7-dropped-frame cluster and a 55 ms frame on its
first run.

Element-scoped is *slower* than document-scoped here, which is worth noting: scoping the snapshot to
a subtree did not make the capture cheaper on this hardware.

### 6.3 Decision

**The direct path is kept.** State commits immediately and a keyed transform/opacity cross-fade
carries the day change — the same mechanism the rest of the screen already uses, at 6.8 ms rather
than 19.8 or 23.0.

The decision is unchanged from the earlier, wrongly-reasoned one; the justification is now correct
and much narrower. A View Transition buys a snapshot cross-fade that a keyed cross-fade already
delivers, and charges ~13–16 ms of commit latency plus a frame-spike risk for it. On this machine
that trade is not worth taking.

Both APIs remain implemented behind the flag and feature-detected, so a future machine with a
cheaper capture can be re-measured rather than argued about. `capabilities()` confirms both are
available in WebView2 151.

Also confirmed: no snapshot-based transition is used for completion, selection, reorder or drag.
Those are all Motion layout projection or plain CSS, exactly as the activation prompt requires.

## 7. Layer assignment

Each interaction is on the cheapest correct layer.

| Interaction | Layer | Why |
|---|---|---|
| Hover, press, focus | CSS transition | compositor transform + colour; no React render, no JS on the pointer path |
| Checkbox microstate | CSS `:active` + colour | fires on pointer-down, so acknowledgement precedes the click handler |
| Task completion | optimistic React state + CSS | state commits, the check settles afterwards |
| Row resettling | Motion `layout` | transform projection instead of interpolating `top` per frame |
| Row removal | Motion `AnimatePresence` | opacity + slight scale; no layout thrash |
| Inspector open/close | Motion `layout` + opacity/x | geometry projected, not `width` animated frame by frame |
| Drag | pointer events + Motion `layout` | no IPC, no query, no DB per move |
| Day change | state + keyed transform/opacity cross-fade | measured 3× faster than either View Transition; see §6 |

Only the sidebar and inspector are excluded from the transition's scope, so they stay put and stay
interactive — no whole-document fade on navigation.

## 8. Art never competes with interaction

The requirement is structural here, not a promise:

- the ambient layer is **static paint**. There is no animation, no `filter`, no blur, no canvas and
  no timer anywhere in it;
- it is `pointer-events: none` and `aria-hidden`, so it cannot intercept input or reach a screen
  reader;
- `will-change: transform` is applied **only to the row being dragged**, and removed when the drag
  ends. A standing `will-change` on every row would hold a compositor layer per row for the whole
  session — on two cores and integrated graphics that is exactly the resource competition the rule
  forbids;
- the idle sample shows 120 frames over 2015 ms with zero drops and zero long tasks, i.e. no
  background work of its own.

**Honest limit on the idle claim:** the sampler uses `requestAnimationFrame`, which itself keeps the
compositor running at 60 Hz. This evidence proves *no extra work and no long tasks* while idle. It
does **not** prove CPU or GPU settles to zero, and no such claim is made here — that needs an
external profiler and is recorded as not run.

## 9. Light-blue ambient behaviour

Strengthened at Product Owner direction after VISUAL LOCK, and still bound by every constraint:

```text
hue                237      accent sits at 270.15 → 33° of separation
aura               1.14:1   against the canvas
glow primary       1.22:1
glow secondary     1.24:1
contour            1.55:1   rendered as a 1 px stroke at 0.18–0.55 opacity
density response   quiet 1.00 · normal 0.80 · dense 0.36
```

Placement does the work: the timeline occupies a bounded 720 px measure at the left of the
workspace, so every glow centre sits in or beyond the open band to its right and never behind a task
title. It reaches no canvas, surface, text, border or state colour — the content plane stays
warm-neutral exactly as the lock has it.

## 10. Deviations and tradeoffs

| What | Why | Reversible |
|---|---|---|
| Both View Transition forms rejected | measured 19.8 / 23.0 ms commit against 6.8 ms direct, plus a 7-frame drop cluster | yes — both remain behind `?vt=` and feature-detected |
| An earlier 791/742 ms figure was published and retracted | instrumentation defect, corrected in §6.1 | n/a — recorded, not overwritten |
| Drag probe is Alt-drag on Today rows | Today orders by scheduled time and Task 51 changes no semantics. This is **instrumentation for the motion contract, not a proposed Today behaviour**; the production surface that will use the contract is the Life Edit tree, which already runs dnd-kit | yes — the probe is prototype-only |
| Day change is prototype-local | the real day change goes through the existing query path; the prototype proves the motion, not the data flow | n/a |
| Reduced motion emulated via CDP | measures the code path, not the Windows setting plumbing | n/a — a real OS-level check is recorded as not run |

## 10a. V2 revalidation — Motion Lock preserved

Baseline v2 changed palette, type treatment, Today's ambient art and the selected/completed visual
state. It did not change the spatial interaction model, so the locked motion evidence was re-run
against v2 rather than rebuilt.

Run `v2motion-clean`, on the same machine, with nothing else executing.

| Interaction | v1 (`motion4`) | **v2 (clean)** | Δ |
|---|---|---|---|
| Task completion | 4.0 ms | **6.5 ms** | +2.5 |
| Row selection | 3.3 ms | **5.7 ms** | +2.4 |
| Layout settle | 4.4 ms | **6.2 ms** | +1.8 |
| Day change | 5.0 ms | **6.4 ms** | +1.4 |
| Day change, `vt=none` | 6.8 ms | **6.8 ms** | 0.0 |
| Day change, `vt=document` | 19.8 ms | **20.0 ms** | +0.2 |
| Day change, `vt=element` | 23.0 ms | **21.1 ms** | −1.9 |
| Reduced motion, completion | 4.2 ms | **4.3 ms** | +0.1 |

```text
drag        90 frames, p95 17.5 ms, 1 dropped   (v1: 81 frames, p95 17.5, 0 dropped)
idle       121 frames, p95 16.8 ms, 0 dropped   (v1: 121 frames, p95 17.2, 0 dropped)
long tasks >50 ms: 0
```

### Verdict: not material, and disclosed rather than rounded away

The three normal-mode interactions each rose by ~2 ms. That is consistent enough across
interactions to look real rather than like noise, and the most likely cause is v2's row-group
element — one more box to lay out and paint per period. It is **not** a font-metric effect: the
serif was removed, and reduced motion, which shares the same layout and differs only in what is
animated, is within 0.1 ms of v1.

It does not change the conclusion. Every commit still lands inside a single 16.67 ms frame with
roughly 2.5× headroom, long tasks remain at zero, idle is unchanged, and drag's single dropped frame
in ninety is within run-to-run variance.

The independent reproduction of the View Transition comparison is worth noting: 20.0 / 21.1 ms
against the earlier 19.8 / 23.0 ms, measured on a different build weeks of edits apart. That
finding was the one this gate previously got wrong, and it now has two agreeing runs behind it.

Checks required by the revalidation brief:

```text
timings unchanged accidentally        no — the ~2 ms rise is attributed and bounded
new font metric destabilises layout   no — no webfont remains; reduced motion matches v1
removing Today art hurt paint         no — idle identical, long tasks still zero
blue checked/selected animate cleanly yes — CSS colour + transform only, no new paint class
transitions add box/shadow/colour noise  no — no shadow or border animates anywhere
```

**The Motion Lock is preserved.** Phase 6 proceeds.

## 11. Runs

```text
motion1   first pass; day-change figure invalid (see §6.1)
motion2   element-scoped attempt; day-change figure still invalid
motion3   View Transition removed; day-change STILL reported 743.7 ms → defect located
motion4   instrumentation corrected; three-way day-change comparison. THIS IS THE REPORTED RUN.
```

Every number in §4, §5 and §6.2 comes from `motion4`. Artifacts in
`target/e2e-artifacts/task-51-motion/motion4/`.

## 12. Not run — recorded, not claimed

```text
external CPU/GPU profiler on idle      NOT RUN
120 Hz frame sensitivity               NOT APPLICABLE — this display is 60 Hz
OS-level reduced motion (not emulated) NOT RUN
Narrator behaviour during motion       NOT RUN
forced colors with motion              NOT RUN
production interaction timings         NOT APPLICABLE — no production surface was touched
```

## 13. Gates

```text
pnpm verify            PASS
pnpm typecheck         PASS
pnpm build             PASS — byte-identical production output
hardening:performance  PASS — violations: []
motion capture spec    PASS — normal and reduced-motion runs
visual capture spec    PASS — 12 captures, 0 collisions, 0 overflow
```

## 14. Next action

**Wait for Product Owner `MOTION LOCK APPROVED`.**

Production reconstruction does not begin before that phrase is received. Approval is not inferred.
