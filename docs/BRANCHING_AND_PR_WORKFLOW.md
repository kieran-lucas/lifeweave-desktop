# Commit and Push Workflow

This is a solo-owner private repository. The Product Owner has authorized direct commits and pushes to `main`. No branch or pull request is required. This is the permanent repository workflow.

## Commit discipline

Each commit must represent one coherent, in-scope outcome. Avoid combining:
- feature implementation + broad refactor;
- schema change + unrelated visual polish;
- two independent features in one commit.

## Required pre-commit sequence

1. Run all relevant governance and integrity checks.
2. Run `git diff --check` to catch whitespace issues.
3. Audit the full diff; confirm every changed file is in scope.
4. Stage only in-scope files (`git add <specific-files>`).
5. Commit with an imperative subject.
6. Push to `main`.
7. Report commit SHA, files changed, checks run, and remaining risks.

## Prohibited in all cases

- Force-push or history rewrite without explicit Product Owner instruction.
- Staging files outside the stated scope.
- Committing user databases, backups, logs, secrets, certificates, or personal assets.
- Merging from another branch without Product Owner direction.

## Worktrees for isolated experiments

Worktrees remain useful for PROTOTYPE-GATED work that must not touch `main` until a prototype gate passes:

```powershell
git worktree add ../lifeweave-proto-12 -b prototype/12-radial-fan main
```

A prototype worktree is cleaned up or merged only after the gate decision is recorded in an ADR.

## Commit style

Imperative subject, present tense, lowercase:
- `establish source integrity checks`
- `implement foundation database worker`
- `fix exact-slot conflict validation`
- `harden project setup`

## Evidence

Because there is no PR template to fill, the agent must report inline after each push:
- exact commands run and their output;
- commit SHA;
- files changed;
- unresolved risks.
