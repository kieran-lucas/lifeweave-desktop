# Lifeweave AI Project Handoff

## Metadata

- generated_at: `2026-08-04T15:42:10.2190705+07:00`
- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- Task 31 implementation checkpoint: `a20aac0bf701fa5d7be473e12316ba97637f2958`
- Task 31 Remediation 001 implementation checkpoint: `8d4ff9703635e3f671a571d05783a40d327dc295`
- current handoff-containing HEAD: resolve at read time with `git rev-parse HEAD`
- tracked working tree status at generation: Commit A was clean and matched `origin/main`; only the closure/evidence files committed with this handoff were then changed

## Immutable source

- path: `docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`
- SHA-256: `9c422927c09e26431d71b1ef5ab6306891a3e7c15ece0fc808bedf6f6689540a`
- bytes: 165,171
- lines: 4,637
- headings: 402

## Product compass

- macro milestone: Post-Core Expansion, Product Owner gate
- latest closed task: Task 31 — Lossless Portable Package
- latest feature task/checkpoint: Task 31 / `8d4ff9703635e3f671a571d05783a40d327dc295`
- database schema: 16
- active spec: none (`docs/PROJECT_STATE.json` has `active_spec: null`)
- next allowed action: Product Owner gate
- forbidden jump: any Task 32 feature implementation

## Verified implementation

- Task 29 relationship authority: zero-or-one Life link remains stored only on `tasks` and `task_series`; occurrence/evaluation rows do not store it.
- Task 30 navigation semantics: caller-supplied local anchor selects the nearest actionable displayed recurring occurrence; ended finite series are omitted.
- Task 30 governance ledger: format-v2 validation now derives task, slice, active-spec, and navigation markers generically from `docs/PROJECT_STATE.json`.
- Task 30 security closure: static Visual World chips remain inline-style free; CSP and the strict verifier remain unchanged.
- Task 31 portable packages: Rust owns exact Stored-only ZIP creation/validation, manifest/checksum authority, privacy-sanitized assets, bounded opaque staging, raw IPC, canonical remapping, transactional empty-leaf import, idempotency, and rollback receipts.
- Task 31 Reader UX: Basic Leaf and Narrative Reader share accessible portable import/export controls while retaining Markdown controls; import confirmation is lazy-loaded.
- Midnight debt: `useLocalDateRollover` refreshes at local midnight plus one second and on window focus/visibility restoration without polling.
- Remediation 001 asset authority: checksum dedup verifies status, metadata, contained non-symlink backing bytes, checksum, and byte length through `read_verified_original`; invalid matches fail closed without duplicate rows or partial document state.
- Remediation 001 lifecycle: startup performs best-effort export/import cleanup before restore/database opening, bounded to 1,024 direct UUIDv7-owned children per directory and the existing 24-hour threshold.
- Remediation 001 Unicode/UI truth: manifest titles count Unicode scalar values and reject controls; backend confirmation is the frontend commit boundary and refresh rejection reports committed-success warning copy.

## Test and release evidence

- `python -m unittest scripts.tests.test_check_project_state`: 14 passed.
- `pnpm source:verify`: passed; immutable-source size/line/hash shown above.
- `pnpm governance:check`: passed repository and dynamic Project State validators.
- `pnpm index:check`: passed; 402 headings indexed.
- `pnpm verify`: passed strict no-remote, security, and hardening checks.
- `pnpm typecheck`: passed.
- Remediation focused tests: asset authority 4 passed; portable 29 passed / 2 ignored evidence tests; portable frontend 12 passed; rollover 4 passed.
- `pnpm test`: 31 files, 468 passed, 0 failed.
- `pnpm build`: passed; 822 modules; main JS 515,638 bytes and total JS 1,110,999 bytes.
- `cargo check --manifest-path src-tauri/Cargo.toml --locked --all-targets`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked`: 444 passed, 0 failed, 3 ignored evidence tests.
- `pnpm hardening:performance`: passed.
- `pnpm hardening:narrative-performance`: passed; 5/50/128 block p95 70 µs / 986.3 µs / 2.0078 ms; save p95 489 µs.
- `pnpm hardening:portable-performance`: passed; small export/preview p95 47.28/1.35 ms; medium export/preview/confirm p95 285.44/103.99/1.82 ms; maximum representative package 50,629,896 bytes and 2,134.26 ms export-plus-preview.
- `pnpm e2e:windows`: remediation rerun passed five isolated phases including Basic Leaf image package round trip and fresh-process persistence; WebView2/EdgeDriver `150.0.4078.105`.
- `pnpm tauri build`: remediation rerun passed; unsigned NSIS `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`, 4,783,749 bytes, SHA-256 `d7a9f6a1a41463cf26e5862528e308b08c813734d5c023cd92dcdb0ba79b55a7`.
- `pnpm hardening:rc`: remediation rerun passed `core-rc-ec1f261bad434cce8a6d0d8aaad598d1`; two 25-second isolated reopen sessions; 25 document/portable-adjacent, 142 backup/restore, 60 Narrative, and 11 portable tests passed.
- Portable/Narrative performance reruns were skipped with recorded rationale: archive construction/image processing and Narrative algorithms were unchanged.
- Independent archive inspection: Windows `tar` confirmed exact lexicographic regular-file inventory, Stored/uncompressed method, `0644`, fixed 1980 timestamp, and readable UTF-8 manifest/Markdown/canonical JSON; inspection archive removed.
- CI status: not run; manual-dispatch-only workflow had no accepted Task 31 invocation trigger.
- External manual debt: physical screen-reader and physical alternate-DPI evidence are unclaimed.

## Decisions

- locked: Windows/local-first; Today default; Task is not a card; Life Browse is selected plus direct children; SQLite/Rust authority; safe backup/restore; Task/Life links are navigation-only; Narrative supports 1–20 scenes, three built-in templates, and four static Visual Worlds; Portable Package v1 represents one committed Basic Leaf or Narrative Canvas document with canonical JSON authority, readable Markdown, and privacy-sanitized assets imported only into an empty active leaf.
- open: whole-tree or multi-document interchange; custom export profiles; original asset metadata policy beyond the privacy-safe default; Tags; Backlinks; Generic Outline beyond the Basic Leaf heading navigator; Noteboard; Graph; score; prediction; global appearance beyond the four Canvas worlds.
- recommended but not activated: none; Task 32 is unselected.

## Risks/debt

- P0: none known.
- P1: none known.
- P2: physical screen-reader and alternate-DPI verification remain external manual debt.
- P3: peak working-set observation was unavailable inside the maximum-package Rust harness; hard size and completion limits passed.

## Recent commits

- `8d4ff9703635e3f671a571d05783a40d327dc295` — harden portable package edge cases
- `a20aac0bf701fa5d7be473e12316ba97637f2958` — add lossless portable document packages
- `a43e867abaa4915cd4fc062e5a4f4b1ee935575f` — refresh project continuity handoff
- `76963fe6300782c56acd849e49f54089dee3818e` — close current state verification gaps
- `7240b7f371ada526ea5a31c0481612574d875fe0` — link tasks to life areas
- `b79a0898ae50962b378174f58fadf3dbffeaae04` — close narrative visual worlds
- `6290f0416d5ee8207d400604839e63ed41f0e936` — complete narrative visual worlds
- `6134d602ca8099640d8c01f67c32b6a53fec4091` — add narrative visual worlds
- `b32839ac14e7f0463cd6580caa919642128ef2b1` — close task 27 release evidence
- `a49528403ac119991b14b9f84fbedd01a7ccf6d2` — add narrative template system
- `4e2c4ee347212b9a26949f7c9df2d2ae77dab59a` — refresh native e2e core flow
- `4cf6ca3f7e0492b12d7497705518f5391c76a6b1` — preserve legacy backup asset validation
- `6ee20b09b33ea975a1e92e80f1995b3c0f3d87d6` — harden core release evidence

## Exact next action

Product Owner gate. Task 32 is unselected and this handoff grants no implementation authorization.

## Files next AI must read

1. `AI_CONSTITUTION.md`
2. `docs/source-of-truth/SOURCE_INTEGRITY.md`
3. `docs/source-of-truth/SIEU_DAC_TA_TICH_HOP_SAN_PHAM_CONG_NGHE_TASK_LIFE_SYSTEM(1).md`
4. `docs/PROJECT_STATE.json`
5. `docs/DECISION_REGISTRY.md`
6. `docs/STATUS.md`
7. `docs/ROADMAP.md`
8. `docs/ARCHITECTURE.md`
9. `docs/DATA_SAFETY_AND_RECOVERY.md`
10. `docs/SECURITY_PRIVACY_LOGGING.md`
11. `specs/021-lossless-portable-package/README.md`
12. `specs/021-lossless-portable-package/spec.md`
13. `specs/021-lossless-portable-package/acceptance.md`
14. `docs/adr/0025-lossless-portable-package.md`
15. `docs/audits/task-31-lossless-portable-package.md`
16. `docs/audits/task-31-release-candidate.json`

## Integrity statement

This handoff reflects Task 31 feature Commit A `a20aac0bf701fa5d7be473e12316ba97637f2958` and Remediation 001 implementation commit `8d4ff9703635e3f671a571d05783a40d327dc295`. The implementation and this closure were pushed directly to `main` without force push, amend, rebase, reset, restore, stash, broad cleanup, or history rewrite. Author and committer are `Kieran Lucas <kieranlucas.work@gmail.com>`. The final tracked tree is required to be clean and match `origin/main`; generated binaries, profiles, logs, databases, backups, screenshots, packages, and installers are not tracked.
