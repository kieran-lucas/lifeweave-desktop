# Contributing

This is a Product Owner-led private repository assisted by AI agents.

## Workflow

This is a solo-owner private repository. Changes are committed and pushed directly to `main`; no branch or pull request is required. This is the permanent workflow, not a temporary exception.

## Before work
1. Read `START_HERE.md`.
2. Read `AI_CONSTITUTION.md`.
3. Verify the immutable source.
4. Confirm an approved issue/spec exists.
5. Do not implement OPEN/DEFERRED behavior.

## Development
- Use native Windows for final Tauri validation.
- Keep changes small and coherent — one logical outcome per commit.
- Add tests alongside behavior.
- Add ADR for architecture/toolchain changes.
- Add migration for schema change; never edit a released migration.
- Use synthetic data.
- Record dependency rationale.
- Preserve accessibility and Reduced Motion.

## Before every commit
- Run all governance and integrity checks; attach output as evidence.
- Audit the full diff; list every file in scope.
- Stage only files within scope.
- Report commit SHA and remaining risks.

## Commit style
Use an imperative, concise subject:
- `establish source integrity checks`
- `implement foundation database worker`
- `fix exact-slot conflict validation`
