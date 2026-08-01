# Technology Baseline — verified 2026-08-01

This file separates three things:

1. **Source-locked direction** — what the Product Owner specification requires.
2. **Observed current ecosystem** — what official/current registries report on the verification date.
3. **Bootstrap pin** — what this setup skeleton proposes until lockfiles are generated and tested.

Patch versions remain provisional until the Windows bootstrap creates `pnpm-lock.yaml` and `Cargo.lock`.

## Baseline table

| Area | Source direction | Verified ecosystem | Setup decision |
|---|---|---|---|
| Desktop | Tauri 2.x | Tauri 2 current | Tauri 2.11 line skeleton |
| Frontend | React 19.2 | React 19.2 current; patch line available | React 19.2.8 proposal |
| Language | TypeScript 6 strict | TypeScript 7.0 released 2026-07-08; TS6 compatibility package exists | Preserve TS6 via compatibility package pending ADR |
| Build | Vite 8.x supported branch | Vite 8 stable; current patch must be registry-verified during bootstrap | Vite 8.1.5 proposal |
| Node | supported LTS | Node 24 LTS; Node 26 Current | Node 24.18.0 proposal |
| Package manager | pnpm committed lockfile | pnpm 11 current line | pnpm 11.17.0 proposal |
| Rust | stable compatible with Tauri | Rust 1.97.1 stable point release | `stable` channel, lock through generated Cargo.lock |
| Styling | vanilla-extract | current 1.x | skeleton dependency |
| Testing | Vitest/RTL/Rust/nextest/proptest | current major lines | activate incrementally by slice |

## TypeScript 6 versus TypeScript 7

The immutable source explicitly locks TypeScript 6. Since TypeScript 7 is now released, blindly following “latest” would contradict the source.

Decision for setup:

- use `typescript: npm:@typescript/typescript6@6.0.2`;
- compile with `tsc6`;
- record TS7 as a proposed ADR, not an automatic upgrade;
- evaluate Tauri/Vite/plugin/editor/type-generation compatibility on a separate branch;
- upgrade only with Product Owner acceptance and evidence.

## Pinning policy

- Never write `latest` in production manifests.
- Commit `pnpm-lock.yaml` and `Cargo.lock`.
- Pin GitHub Actions by reviewed major or SHA according to repository policy.
- Upgrade dependencies in small batches.
- Every major/minor upgrade requires changelog review, build/tests, screenshots for UI, and performance comparison where relevant.
- A dependency that exists only for an OPEN/DEFERRED feature must not be installed.

## Registry limitation of this archive

The generation environment could not access package registries and did not have the Rust toolchain. Therefore:

- no lockfile has been fabricated;
- no claim is made that the proposed patch combination has built;
- `.setup-phase` keeps implementation workflows non-blocking;
- `scripts/bootstrap.ps1` performs the actual install/build validation on the Product Owner's Windows machine;
- the lockfiles produced there become authoritative after review.

## Official references

- React versions: https://react.dev/versions
- TypeScript 6 compatibility package: https://www.npmjs.com/package/@typescript/typescript6
- TypeScript 7 release: https://devblogs.microsoft.com/typescript/announcing-typescript-7/
- Vite releases: https://vite.dev/releases
- Tauri security/capabilities: https://v2.tauri.app/security/capabilities/
- Node releases: https://nodejs.org/en/about/previous-releases
- Rust releases: https://blog.rust-lang.org/releases/
