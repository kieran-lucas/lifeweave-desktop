# GitHub Repository Setup

Recommended repository: **private** `lifeweave-desktop`.

## 1. Create repository

Do not initialize with a generated README because this archive already contains project history/files.

```powershell
gh repo create lifeweave-desktop --private --source . --remote origin --push
```

Alternative: create the empty private repository in GitHub UI, then:

```powershell
git remote add origin https://github.com/<owner>/lifeweave-desktop.git
git push -u origin main
```

## 2. Repository settings

### General
- Default branch: `main`.
- Allow squash merge: yes.
- Default commit message: pull request title.
- Allow merge commits: no.
- Allow rebase merge: optional/no for a simpler history.
- Automatically delete head branches: yes.
- Issues: enabled.
- Projects: enabled.
- Wiki: disabled; documentation remains versioned in Git.

### Visibility
Start private. Reassess public visibility only after:
- real personal data is absent;
- licenses are decided;
- security review passes;
- signing/distribution strategy is intentional.

## 3. Ruleset for `main`

This is a solo-owner private repository operating under the direct-to-main workflow described in `docs/BRANCHING_AND_PR_WORKFLOW.md`. Branch protection rulesets are not enabled.

The five required status checks (`Source integrity`, `Governance`, `Frontend`, `Rust`, `Windows Tauri`) existed and passed at the Task 16 checkpoint. The Product Owner subsequently reduced the standing CI policy to one optional manual clean build (`workflow_dispatch` only). Remote CI is not a task-completion gate; local evidence is authoritative.

## 4. GitHub Project

Statuses:

1. Inbox
2. Needs Spec
3. Spec Review
4. Ready
5. In Progress
6. AI Review
7. Human Acceptance
8. Done

Suggested custom fields:
- Slice/Milestone
- Priority: P0/P1/P2/P3
- Decision status
- Area
- Risk
- Builder
- Reviewer
- Prototype gate

## 5. Milestones

- M0 Project Constitution
- M1 Foundation Proof
- M2 Task Core
- M3 Completion & Objective Analytics
- M4 Life Browse
- M5 Life Edit
- M6 Basic Leaf
- M7 Core Hardening
- M8 Expansion Candidates

## 6. Secrets and environments

No application runtime secret should be required.

Future release environment may hold:
- Windows signing credential/reference;
- GitHub release token if default token is insufficient;
- optional updater signing private key.

Never commit certificates/private keys. Use GitHub Environments with approval for release.

## 7. First pull request

Title:

`Establish source-preserving project setup`

Include:
- this setup pack;
- source checksum evidence;
- generated lockfiles after Windows bootstrap;
- doctor output summary;
- no product feature code.

## 8. GitHub Actions permissions

Use least privilege:
- default `contents: read`;
- elevate only release jobs;
- pin/review third-party actions;
- no pull-request workflow executes untrusted code with write secrets.

## 9. Real data prohibition

Never upload:
- real SQLite databases/WAL/SHM;
- personal backups;
- Task/Life content;
- logs containing personal paths/content;
- signing material;
- private images/attachments.
