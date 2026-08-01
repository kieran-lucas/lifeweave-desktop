# Branching and Pull Request Workflow

## Branch naming

- `docs/<issue>-<description>`
- `feature/<issue>-<description>`
- `fix/<issue>-<description>`
- `prototype/<issue>-<description>`
- `test/<issue>-<description>`
- AI-created local branches may use `agent/<description>`.

## One branch, one coherent outcome

Avoid:
- feature + broad refactor;
- schema + unrelated visual polish;
- two agents writing the same files;
- “cleanup” with no acceptance criteria.

## Pull request lifecycle

1. Approved issue/spec.
2. Create branch/worktree.
3. Open Draft PR early.
4. Implement minimal vertical behavior.
5. Run checks and attach evidence.
6. Independent model reviews.
7. Writer fixes findings.
8. Re-run checks.
9. Product Owner performs UX acceptance.
10. Squash merge.
11. Issue closes and status updates.

## Required PR evidence

- linked issue and active spec;
- explicit out-of-scope;
- files/areas changed;
- data/migration impact;
- dependencies added/removed;
- exact commands and outcomes;
- screenshots for UI states;
- keyboard/accessibility evidence;
- performance trace if critical;
- reviewer identity/model and findings;
- Product Owner acceptance notes;
- rollback/recovery note for risky changes.

## Worktrees

Use separate worktrees for write-heavy agents:

```powershell
git worktree add ../lifeweave-feature-12 -b feature/12-conflict-engine main
git worktree add ../lifeweave-review-12 -b review/12-conflict-review main
```

Do not point two agents at the same working directory.

## Merge policy

- squash merge;
- PR title becomes commit subject;
- no force-push after review unless reviewers are notified;
- release/migration commits remain easy to audit;
- never bypass failing data-integrity checks.
