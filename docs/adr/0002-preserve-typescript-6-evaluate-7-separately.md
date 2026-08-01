# ADR 0002 — Preserve TypeScript 6 and evaluate TypeScript 7 separately

- Status: Proposed
- Date: 2026-08-01
- Decision owner: Product Owner
- Trigger: TypeScript 7 released after the source locked TypeScript 6

## Context

The immutable source locks TypeScript 6 strict. TypeScript 7.0 is now released. Automatically switching to “latest” would violate a locked source decision, while permanently ignoring the current ecosystem may create avoidable technical debt.

## Proposed decision

For Foundation bootstrap:
- depend on `typescript: npm:@typescript/typescript6@6.0.2`;
- invoke `tsc6`;
- preserve all strict flags;
- generate and commit lockfiles after native Windows validation.

Create a separate branch/worktree to evaluate TS7 after Foundation Proof.

## Evaluation matrix

- Vite 8 and React plugin;
- Tauri frontend APIs;
- ts-rs generated bindings;
- vanilla-extract;
- Vitest/RTL;
- editor ecosystem when activated;
- diagnostic quality and compile performance;
- migration/deprecation work;
- agent/code-generation reliability.

## Acceptance threshold

Upgrade only when:
- all baseline checks pass;
- no strictness is weakened;
- generated types remain stable;
- no active dependency is blocked;
- migration cost is documented;
- Product Owner accepts the ADR.

## Consequences

The setup remains faithful to source while making ecosystem drift visible and reversible.
