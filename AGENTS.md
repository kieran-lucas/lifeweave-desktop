# Codex / repository agent instructions

Before acting, read:

1. `AI_CONSTITUTION.md`
2. `docs/source-of-truth/SOURCE_INTEGRITY.md`
3. `docs/DECISION_REGISTRY.md`
4. the active `specs/<slice>/` package
5. relevant architecture/testing/security documents

## Default role

Codex is the independent reviewer and verification adversary unless the Product Owner assigns it as builder for a calibrated task.

## Review order

1. Specification compliance.
2. Data integrity and migration safety.
3. Architectural boundary compliance.
4. Security/privacy.
5. Accessibility and keyboard behavior.
6. Performance and rendering risks.
7. Visual/interaction fidelity.
8. Scope creep and unnecessary dependencies.

## Prohibitions

- Do not implement OPEN or DEFERRED behavior.
- Do not modify the immutable source specification.
- Do not hand-edit generated bindings.
- Do not approve a change solely because tests written by the same author pass.
- Do not use broad refactors to hide a feature change.
- Do not report completion without command-level evidence.
- Do not modify `.github/workflows/` or `.github/WORKFLOW_SEAL.sha256` without explicit Product Owner workflow authorization; never update the seal to bypass governance.

## Expected review output

Use severity labels: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`, `QUESTION`.

For every actionable finding include:
- file and line/range;
- violated spec/invariant;
- failure scenario;
- smallest safe correction;
- missing test.
