# Task 51 — feature → UI completeness audit

A Task 51 closure requirement: **is every intended user-facing Lifeweave capability actually
reachable and usable from the UI?**

Traced in both directions, from the repository rather than from memory, at
`4593a35` on `task-51-visual-experience`.

This does not restate the Task 50 census
([`task-50-ui-surface-census.md`](task-50-ui-surface-census.md)), which audited 101 decided
capabilities and closed the three gaps it found. It re-verifies the invariant Task 50 established
and adds the checks Task 50 did not run: orphaned backend capability, unreachable UI, and dead
entry points.

## 1. Method

```text
forward   source of truth → feature spec → ADR → domain → projection → screen → visible control
reverse   registered Tauri handler → frontend IPC wrapper → consuming component → entry point
dead-UI   exported component → any reference → reachable route
```

Both traces are mechanical where possible, so the result does not depend on having remembered the
right file.

## 2. Reverse trace — is any implemented capability orphaned?

The question this catches: a capability that is fully built in Rust, registered, and simply never
wired to anything a user can reach.

```text
handlers registered in src-tauri/src/lib.rs        117
handlers with a frontend consumer                  117
orphaned handlers                                    0
```

The trace initially reported six with no consumer:

```text
create_focus_plan · get_focus_plan · list_focus_plans
mutate_focus_plan · save_focus_plan_draft · discard_focus_plan_draft
```

All six are consumed — through `frontend/src/features/focus-plan/ipc.ts` rather than the central
`frontend/src/ipc/commands.ts`. They are wrapped, not raw, so `AI_CONSTITUTION.md` §4 ("components
never call raw `invoke()` outside the centralized IPC adapter") is satisfied in substance.

**Finding, non-blocking:** there are two IPC adapter locations rather than one. That is an
architecture-tidiness observation, not a completeness gap, and it is out of Task 51's
presentation-only scope. Recorded so it is not rediscovered as a defect later.

### Capability distribution

```text
life        33      task            22      focus_plan   11      narrative     9
foundation   5      restore          5      document      5      portable      5
tag          5      other            7      backup        2      recurring     2
deadline     1      completion       1      category      1      analytics     1
search       1      health           1
```

## 3. Dead-UI trace — does any control point at nothing?

```text
exported components in frontend/src                    all scanned
exported components with no reference anywhere else      2
```

Both are `CanvasEditorA` / `CanvasEditorB` under
`frontend/src/prototypes/narrative-canvas-schema/`. These are the Task 20 schema-strategy
prototypes: deliberately isolated, never routed, and retained as evidence for that closed task.

**Classification: `INTENTIONALLY-NON-UI`.** No dead route, no unreachable production component, no
duplicate entry point found.

## 4. Status summary

| Status | Count | Notes |
|---|---|---|
| `UI-COMPLETE` | 117 handlers / 101 decided capabilities | every registered capability has a consumer; Task 50 verified the visible path |
| `UI-PARTIAL` | 0 confirmed | see §5 for the two candidates and why neither qualifies |
| `UI-MISSING` | 0 | the three Task 50 found (Task edit, delete, recurring-occurrence scope) were fixed in Task 50 |
| `INTENTIONALLY-NON-UI` | 2 components + the internal-choreography set | prototype strategies; health check, catalogue reads, staged-export byte reads, staging-ticket discards |
| `INTERNAL/INFRASTRUCTURE` | per Task 50 | 6 rows covering 11 handlers, plus 4 recovery/safety |
| `DEFERRED-BY-SPEC` | per decision registry | prediction, advanced Graph, Noteboard, command palette, shortcut remapping, sound |

## 5. Candidates examined and rejected as gaps

**`set_life_node_icon` / `set_life_node_theme_variant`** — no consumer, and correctly so. Both edit
fields the Life Edit inspector already edits through `update_life_node_summary`. Surfacing them
would create two controls for one capability, which ADR 0044 §7 forbids. Unchanged from Task 50.

**Focus Plan draft save/discard** — consumed, but only implicitly as part of the create/edit flow
rather than as user-visible commands. That is correct: §11 of the activation brief requires the UI
to represent the *workflow*, not each backend stage.

## 6. What this audit does NOT yet establish

Stated plainly, because a matrix built from code inspection can imply more than it proves:

- **Flows were not exercised end to end for this audit.** The reverse and dead-UI traces are
  mechanical and complete; the forward "can a normal user discover this" judgement is inherited
  from the Task 50 census, which did exercise the flows, and has not been re-walked since the v2
  visual work began.
- **Discoverability under the v2 redesign is unverified for surfaces not yet recomposed.** A control
  that was discoverable in the pre-v2 composition should remain so — the migrations so far changed
  colour and enclosure, not affordance placement — but this has only been confirmed for the shell
  and Today.
- The visual-regression goldens that would catch an affordance silently disappearing during a later
  migration **do not exist yet for v2**.

## 7. Conclusion

**No implemented user-facing Lifeweave capability is orphaned, and no UI control points at removed
functionality.** The completeness invariant Task 50 established still holds at `4593a35`.

The open Task 51 work is therefore **visual convergence, not feature recovery** — which is a
materially better position to be in, and the reason this audit was worth running before continuing
surface reconstruction rather than after.
