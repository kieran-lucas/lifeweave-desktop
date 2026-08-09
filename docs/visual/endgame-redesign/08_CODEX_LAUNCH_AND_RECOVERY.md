# 08 — Codex CLI Overnight Launch & Recovery

This runbook is optimized for the Product Owner's requested flow: **prepare once → set Goal → sleep**.

## A. Before Codex: make the execution pack a clean baseline

After extracting the Phase 8 ZIP into the repo, preserve your existing:
- `research-archive/` eight reports;
- `references/` six PNGs.

Then commit the planning/context artifacts **before implementation** so Codex stage diffs start clean.

From PowerShell:

```powershell
cd D:\Programming\Github\Other\lifeweave-desktop

git status --short
git add docs/visual/endgame-redesign
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: add endgame redesign execution pack"
```

Inspect the staged file list before committing. Do not stage unrelated files.

A clean committed context baseline is strongly preferred. It prevents Phase 8 documents/reference PNGs from polluting F0/S01 diffs.

## B. Keep the machine awake

In Codex, `/experimental` currently exposes feature toggles and may offer **Prevent sleep while running**. If available, enable it and restart when requested.

If unavailable, use normal Windows power settings so AC sleep/hibernate does not interrupt the run. Keep the laptop plugged in.

## C. Launch with the six visual references attached once

Official Codex CLI supports `-i/--image` on the initial prompt. Use it so the actual PNGs are model-visible in this session.

```powershell
cd D:\Programming\Github\Other\lifeweave-desktop

codex --yolo -m gpt-5.6-sol `
  -i "docs\visual\endgame-redesign\references\01-today-approved-direction.png,docs\visual\endgame-redesign\references\02-calendar-approved-direction.png,docs\visual\endgame-redesign\references\03-analytics-direction.png,docs\visual\endgame-redesign\references\04-focus-plans-direction.png,docs\visual\endgame-redesign\references\05-life-direction.png,docs\visual\endgame-redesign\references\06-reader-direction.png" `
  "Read docs/visual/endgame-redesign/PRELAUNCH_PREFLIGHT_MESSAGE.txt and perform that preflight exactly."
```

`--yolo` removes approvals and sandboxing. This is intentionally chosen by the Product Owner for unattended execution and is dangerous outside an externally trusted workspace. The canonical pack therefore keeps destructive/product-scope boundaries in prose and repository governance.

## D. Reasoning

For the one-session overnight Goal, use:

```text
/reasoning high
```

Rationale: several major stages still require nontrivial composition judgment. Do **not** use xhigh/max by default; the design search space is already heavily specified.

If rate/token economy matters more than maximal judgment, `medium` is an acceptable fallback because the canonical surface packets already resolve most art-direction decisions.

## E. Do NOT enter Plan mode

Do not use `/plan` for this overnight run.

Phase 0–8 already performed the planning. Entering Plan mode would reopen decisions and adds an unnecessary interactive boundary.

## F. Set the one finite Goal

Open `docs/visual/endgame-redesign/BOOT_GOAL.txt`, copy its full contents, then enter:

```text
/goal <paste BOOT_GOAL.txt here>
```

The objective is intentionally far below the current `/goal` 4,000-character limit. Long instructions live in files as Codex recommends.

After setting the Goal, leave the session running.

## G. What the agent should do while you sleep

The active Goal should:
- follow `F0 → S01...S12 → Q1...Q5 → FINAL` in the exact Master order;
- use stage packets as finite transaction boundaries;
- update `state/EXECUTION_LEDGER.md`;
- write verbose logs under `target/codex-stage/`;
- make reversible frontend decisions without asking;
- use safe fallback at higher-risk ambiguity;
- use one review per stage;
- use one final whole-app adversarial pass;
- avoid blind reruns;
- keep all stage/final commits local;
- do **not push** during the unattended run; publication waits for the Product Owner.

## H. If the Goal pauses unexpectedly

When you return:

```text
/status
/goal
```

If Goal is paused:

```text
/goal resume
```

If the TUI session was closed, resume the most recent repo session:

```powershell
codex resume --last
```

Then inspect:

```text
/status
/goal
```

and resume the Goal if needed.

If the session cannot be recovered, start a fresh Codex session and set the same `BOOT_GOAL.txt`. The new session must read `state/EXECUTION_LEDGER.md` and continue from the first incomplete packet; it must not restart completed stages.

## I. Context-pressure recovery

The repo ledger is the durable memory.

If the session becomes context-heavy:
- stop broad exploration;
- write current DONE/CURRENT/NEXT/evidence to the ledger;
- avoid rereading research archive;
- use `/compact` at most as a tactical aid;
- if the session dies, resume/fresh-session from ledger.

Do not solve context pressure by widening the Goal or rereading the 400KB historical reports.

## J. Prompt-input audit before a serious overnight run

Codex exposes `codex debug prompt-input`, which renders model-visible prompt inputs. If you suspect AGENTS/instruction-chain problems, audit before the overnight run rather than guessing.

Also verify from repo root that Codex reports the expected active instructions.

## K. Pre-sleep checklist

- [ ] Phase 8 pack committed cleanly.
- [ ] Eight research reports present under `research-archive/`.
- [ ] Six PNGs present under `references/`.
- [ ] Working tree has no unrelated user changes.
- [ ] Laptop plugged in; sleep prevention configured.
- [ ] Preflight reports PASS.
- [ ] `/reasoning high` (or deliberate medium).
- [ ] `/plan` not enabled.
- [ ] `/goal` set from `BOOT_GOAL.txt`.
- [ ] `/goal` displays the expected objective.
- [ ] `/status` shows expected model/workspace/context.
