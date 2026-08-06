# Task 40 Execution Plan

Dependency-aware order. Later stages consume evidence produced by earlier ones, so the sequence is
not interchangeable.

## Stage 0 — Activation (no product surface)

Create Slice 030 and ADR 0034, activate Project State, and synchronize STATUS, ROADMAP, START_HERE,
the Decision Registry, and the generated indexes. Run governance. Documentation-only activation is
not completion.

## Stage 1 — Reproduce every debt from the clean baseline

Performed before any edit so the record is a measurement rather than an inference:

- `pnpm build` then `pnpm hardening:performance` — capture the exact failure;
- the canonical all-target Clippy command — capture the exact findings, files, and ranges;
- enumerate `scripts/run_windows_e2e.ps1` phases and confirm the Deadline/Saved Views gap;
- read the Task 30 audit and confirm the physical accessibility debt is still open.

## Stage 2 — Performance inventory

Three production builds, deleting only generated `frontend/dist` between runs. Normalized identity,
raw bytes, deterministic `mtime=0` gzip bytes, startup/lazy class, and owning feature per asset.
Nondeterminism is diagnosed before anything is frozen.

Sourcemap `sources` attribution identifies which package owns each chunk, which is what makes the
"likely owning approved feature" column a measurement rather than a guess.

## Stage 3 — Optimization inspection, then freeze

Depends on Stage 2 because a reduction is only accepted with a measured before/after.

Inspect duplicated modules, accidental eager imports, unused feature imports, approved lazy
boundaries, and repeated code with measurable cost. Apply only safe, evidence-backed reductions,
re-measure, and freeze budgets against the **final** observed build. If no safe reduction exists,
attribute the approved growth honestly.

## Stage 4 — Checker and its tests

Depends on Stage 3 for the frozen numbers, but the checker's own unit tests depend only on synthetic
temporary directories, so they are written against fixtures and never against the live `dist`.

## Stage 5 — Clippy

Independent of Stages 2–4 and therefore safe to run in parallel with the frontend work, but its
focused backup tests must pass before the broad Rust gate in Stage 8.

## Stage 6 — Native phases

Depends on nothing earlier except a working build, but is scheduled after the cheap workstreams
because each phase costs a full contained Tauri debug build plus driver lifecycle. Deliberate-break
proof happens per phase, immediately, while the phase is fresh.

## Stage 7 — Accessibility and protocol

Machine-verifiable expansion first, because a violation found there may require a bounded production
fix that must land before the broad gates. UIA detection and the manual protocol follow.

## Stage 8 — Gates and release evidence

Focused checks, then broad gates, then `pnpm tauri build`, then full `pnpm e2e:windows`, then
`pnpm hardening:rc`. The installer must exist before RC dogfood, which reads and hashes it.

## Stage 9 — One final review, audit, closure

One full diff review against `fb2a240920414c05e7fd4235357b952a15611e8f`. Closure documents are
written after the hardest native and release evidence runs, never before. Then commit and push.

## Commit shape

```text
1. activation/contract
2. hardening implementation
3. evidence/closure
```

No branch, worktree, amend, rebase, force-push, stash, or history rewrite. `main` only.

## Stop conditions

Stop and report exact evidence, minimum options, consequences, and a narrow recommendation before
broadening scope if a truthful budget needs a new Product Owner trade-off; a dependency, schema,
workflow change, or production test backdoor becomes necessary; physical accessibility exposes a
redesign rather than a bounded fix; or an OPEN/DEFERRED product decision or Task 41 scope is
required.
