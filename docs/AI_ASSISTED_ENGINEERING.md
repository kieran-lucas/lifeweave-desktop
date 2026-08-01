# AI-Assisted Engineering

## Roles

- Product Owner: product truth, scope, UX acceptance.
- ChatGPT: research, specification, architecture, acceptance criteria, contradiction audit.
- Claude Code: primary builder candidate after calibration.
- Codex: independent reviewer/test/security/data-integrity adversary.
- GitHub Actions: objective repeatable gate.
- Git history/ADR/spec: durable memory.

## Calibration tournament

Before assigning a permanent builder, give Claude Code and Codex the same small Foundation task in isolated worktrees.

Score:
- first-pass acceptance;
- human correction time;
- build/test failures;
- data-safety mistakes;
- unnecessary abstraction/dependencies;
- diff clarity;
- test quality;
- quota/iteration cost.

The winner becomes default builder, not universal authority.

## Feature protocol

```text
Product intent
→ spec.md
→ contradiction review
→ approved acceptance
→ test plan
→ implementation worktree
→ automated evidence
→ independent review
→ correction
→ Product Owner UX acceptance
→ merge
```

## Context hygiene

- Start a fresh agent session for a new major feature.
- Load the Constitution, active spec, and relevant files only.
- Persist decisions in Git, not chat memory.
- Do not ask agents to reread the entire repository for every small task.
- Do not use multiple write agents on overlapping code.
- Use subagents primarily for read-heavy exploration, test/log analysis, and risk review.

## Prompt contract

Every implementation prompt should include:
- issue/spec path;
- goal;
- locked invariants;
- out-of-scope;
- files/areas allowed;
- required evidence;
- no-design-by-assumption rule.

## Review separation

The writer may self-check but cannot be the final reviewer. Independent review should inspect the actual diff and acceptance criteria, not only the writer's summary.

## Failure behavior

When blocked:
- preserve the working tree;
- report exact command/error;
- distinguish environment failure from code failure;
- do not disable a check to create a green result;
- do not silently change product behavior.
