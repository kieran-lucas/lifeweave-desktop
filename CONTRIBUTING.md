# Contributing

This is a Product Owner-led private repository assisted by AI agents.

## Before work
1. Read `START_HERE.md`.
2. Read `AI_CONSTITUTION.md`.
3. Verify the immutable source.
4. Confirm an approved issue/spec exists.
5. Create a branch/worktree.
6. Do not implement OPEN/DEFERRED behavior.

## Development
- Use native Windows for final Tauri validation.
- Keep changes small and coherent.
- Add tests alongside behavior.
- Add ADR for architecture/toolchain changes.
- Add migration for schema change; never edit a released migration.
- Use synthetic data.
- Record dependency rationale.
- Preserve accessibility and Reduced Motion.

## Pull requests
Use the template completely. Attach exact command evidence, screenshots for UI, data/recovery impact, independent review, and Product Owner acceptance.

## Commit style
Use an imperative, concise subject:
- `establish source integrity checks`
- `implement foundation database worker`
- `fix exact-slot conflict validation`

Squash merge to `main`.
