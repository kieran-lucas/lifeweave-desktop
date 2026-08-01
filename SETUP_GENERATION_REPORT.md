# Setup Generation Report

Generated: 2026-08-01, Asia/Bangkok

## Guarantees provided

- Original specification copied byte-for-byte.
- Original SHA-256 verified: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`.
- Git configured not to normalize that source file.
- All 402 source headings indexed and represented in the coverage matrix.
- Governance, JSON, YAML, and Python scripts validated in the generation environment.
- ZIP content will be re-opened and the original source hash rechecked.
- No lockfile or successful production build is fabricated.

## Environment limitations

The generation environment had no package-registry access and no Rust toolchain. Therefore dependency installation, TypeScript compilation, Cargo resolution, and Tauri Windows build are intentionally deferred to `scripts/bootstrap.ps1`.

## Important setup choices

- TypeScript 6 is preserved despite TypeScript 7 being current because the source marks TS6 as locked.
- React patch pin was updated to the current 19.2.8 line found during trace.
- Heavy libraries such as SQLite, Tiptap, d3, dnd-kit, Motion, search, and Graph are not preinstalled merely because the long-term architecture mentions them. They activate in approved slices.
- A locally generated setup-only placeholder icon exists solely to make packaging bootstrap possible.
- `.setup-phase` prevents absent lockfiles from creating misleading red CI while source/governance checks remain mandatory.

## Next proof required

Run native Windows bootstrap and commit:
- `pnpm-lock.yaml`;
- `src-tauri/Cargo.lock`;
- actual tool versions;
- exact build/test evidence;
- any minimal compatibility correction.
