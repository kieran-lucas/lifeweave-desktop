# AI Constitution

This file governs every AI-assisted change. It is deliberately concise enough to remain salient and strict enough to prevent scope drift.

## 1. Authority

Read in this order:

1. Immutable original specification in `docs/source-of-truth/`.
2. Explicit later Product Owner decisions recorded in approved ADRs/decision log.
3. Approved Core Product Spec.
4. Active feature spec and acceptance criteria.
5. Architecture and implementation guidance.

Never silently “reconcile” a contradiction. Report it and stop the conflicting implementation path.

## 2. Product invariants

- The product is Windows-first and local-first.
- Core runtime features must work without internet access.
- No account, login, server, default cloud sync, collaboration, workspace sharing, subscription, or paywall.
- Today is the default destination.
- Task is an independent domain entity, not a card and not a document block.
- Task UI is a continuous timeline/row system, not a card board.
- Life Browse shows the selected node and direct children, not the full tree.
- Full-tree structure editing belongs only in Life Edit Mode.
- Reminder, Windows notification, sound, snooze, and app-open streak are REMOVED.
- Reduced Motion is mandatory.
- User data must remain recoverable through transaction, migration, backup, restore, archive/Trash, and export policies.

## 3. Scope discipline

- `OPEN` means clarification is required before implementation.
- `PROTOTYPE-GATED` means build an isolated measurable prototype; do not merge production behavior before the gate is decided.
- `DEFERRED` means do not add navigation, schema requirements, dependencies, or placeholders that constrain Core.
- `REMOVED` means do not reintroduce the behavior indirectly through a library or convenience feature.
- Technical substrate does not constitute product approval.
- Do not add a feature merely because Supernotes, Notion, a framework, or a dependency supports it.

## 4. Architecture invariants

- React owns rendering, focus, selection, ephemeral UI state, optimistic projection, and motion choreography.
- Rust owns domain validation, transactions, persistence, migrations, recurrence/conflict authority, filesystem, backup/restore, search execution, aggregate authority, and security-sensitive paths.
- Tauri IPC handlers remain thin.
- Components never call raw `invoke()` outside the centralized IPC adapter.
- Rust DTOs generate TypeScript bindings; generated files are never hand-edited.
- SQLite is the persistent source of truth.
- Zustand must not mirror the database.
- TanStack Query is a projection cache, not a second authority.
- No raw SQL in React.
- No released migration may be edited.
- No dependency is added without rationale, security/bundle impact, alternatives, and removal cost.

## 5. Data safety

- Use parameterized SQL.
- Enable foreign keys on every SQLite connection.
- Write mutations transactionally.
- Validate complex invariants again in Rust at commit time.
- Never copy an open SQLite database as a backup.
- Restore only through staging, checksums, integrity checks, database closure, and atomic replacement.
- Archive entities with history instead of destructive cascade deletion.
- Never log task, card, document content, raw personal paths, attachments, or sensitive search text.

## 6. UX and accessibility

- Native semantics before ARIA.
- Keyboard parity is required for every core flow.
- Focus restoration must be deterministic.
- Do not rely on color alone.
- Do not animate every element.
- Motion must preserve input responsiveness and respect system Reduced Motion.
- Do not use screenshots as the sole completion evidence.
- Visual fidelity must be tested on Windows DPI scales.

## 7. Completion evidence

An agent may not say “done”, “fixed”, or “all tests pass” without reporting exact evidence:

- commands run;
- pass/fail result;
- relevant test names or counts;
- production build result where applicable;
- migration/round-trip evidence where applicable;
- screenshots or visual-diff review for UI;
- accessibility checks;
- performance measurement for critical interactions;
- independent reviewer findings;
- unresolved risks.

Closure is risk-based, not command-based:

- A named test or environment is not an absolute gate when equivalent deterministic evidence covers the same product risk.
- Infrastructure, driver, timing, or harness failures are not product defects unless they reproduce a product invariant violation.
- After two failed reruns without new diagnostic evidence, stop retrying. Record the harness issue as non-blocking verification debt and use the smallest deterministic substitute.
- A task may close with disclosed residual verification debt when core behavior, persistence, migration, and safety invariants have deterministic evidence and no confirmed P0/P1 product defect remains.
- A flaky or nondiagnostic end-to-end test must never hold the roadmap indefinitely or trigger speculative product changes.
- Reopen a closed task only for a reproducible product defect, violated invariant, migration/data-loss risk, or explicit Product Owner decision—not merely because an optional smoke test is red.

## 8. Git behavior

This is a solo-owner private repository. The Product Owner has authorized agents to commit and push directly to `main`. This is the permanent repository workflow, not an agent-inferred exception or temporary shortcut.

Authorized:
- Commit and push directly to `main` after completing all checks and diff review.

Required before every commit:
- Run all relevant governance and integrity checks; report pass/fail.
- Audit the full diff; list every file staged and confirm each is in scope.
- Stage only files within the stated scope of the commit.
- Report the commit SHA and any remaining risks after push.

Prohibited in all cases:
- Force-push or rewrite published history without explicit Product Owner instruction.
- Commit files outside the stated scope of a change.
- Commit real user databases, backups, logs, secrets, certificates, or personal assets.
- Merge from another branch without Product Owner direction.

## 9. Workflow seal

`.github/workflows/` and `.github/WORKFLOW_SEAL.sha256` are sealed infrastructure.

- Feature, bug-fix, refactor, test, documentation, and routine maintenance tasks MUST NOT modify, replace, add, rename, or delete workflow files or update the seal.
- A workflow change is allowed only when the Product Owner explicitly authorizes workflow maintenance, or when evidence shows the sealed workflow cannot perform its sole build function because of a platform or toolchain break.
- An authorized workflow change must be isolated from product changes, remain manual-only and read-only unless the Product Owner explicitly decides otherwise, update the seal, and pass `python scripts/check_repository.py`.
- Agents must not add automatic push, pull-request, schedule, or recursive triggers; repository write permissions; source mutation; generated-code mutation; commits; pushes; or self-rewriting behavior to a workflow without a new explicit Product Owner decision.
- Never update the seal merely to bypass a governance failure.

## 10. Required response to ambiguity

When a decision is materially OPEN:
1. identify the exact missing decision;
2. cite its source location;
3. describe the minimum viable options and consequences;
4. do not implement one by assumption.

Minor implementation details may use the simplest reversible option consistent with the source and active spec.
