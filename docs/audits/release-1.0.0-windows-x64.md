# Lifeweave 1.0.0 Windows x64 release candidate

Date: 2026-08-14

## Release identity and data continuity

- Product version is `1.0.0` in the root package, frontend package, Rust package and Tauri config.
- The stable identifier remains `dev.lifeweave.desktop`. This deliberately keeps the existing
  Tauri app-data directory and avoids making current user data appear to disappear on upgrade.
- Tauri is updated to 2.11.5; `plist`, `quick-xml` and `time` are updated to patched versions.
  `cargo audit --no-fetch` reports no vulnerabilities in the locked graph.

## Startup optimization

- Calendar, Plans and Life remain lazy and prefetch on navigation intent.
- Settings data-heavy sections mount only when approached or explicitly selected.
- Backup discovery stays off the database command worker.
- Portable, Life Branch and Life Tree stale-staging sweeps now run on a named background thread
  after the database worker is ready. Database recovery, database open and migrations remain on
  the mandatory startup path.
- Production main-window creation measured from process start on this Windows host:
  `1933.0 ms` first cold launch, then `156.8 ms` and `168.5 ms` warm launches.
- Startup JavaScript is `277,784` raw bytes and remains below the `278,580` byte ceiling.

## Verification evidence

- Frontend: 50 files / 657 tests passed.
- Rust: 803 passed, 4 intentionally ignored; strict Clippy and formatting passed.
- Repository governance, source integrity, security, remote-resource and hardening checks passed.
- npm production audit/signature policy passed in the readiness review.
- RustSec scan reports zero vulnerabilities after dependency updates.
- Windows native E2E passed lifecycle, backup/restore, restart persistence, keyboard shortcuts,
  managed backup version/schema behavior and daily Settings/scroll flows.
- RC dogfood passed two isolated 25-second reopen sessions plus document recovery, backup/restore,
  Narrative, portable package, Life Branch, actual-time, relationship graph and task fixtures.
- Silent NSIS install and uninstall rehearsal both exited `0`; installed executable reported
  version `1.0.0`, and uninstall removed the rehearsal directory.

## Artifacts

- Installer: `Lifeweave_1.0.0_x64-setup.exe`, 5,598,804 bytes,
  SHA-256 `38d5e3e28e8735a34da7b71b5b040ecb5908e2a1e6cc1bd70f45b6663b63af56`.
- Portable executable: `lifeweave-desktop.exe`, 15,457,280 bytes,
  SHA-256 `b287718feba05088aeaf645d2c5964ffc952f8c98c2576eb9321aa4be358e18e`.
- Both artifacts are unsigned. Public distribution still requires the repository's explicit
  license/publication decision and a valid Authenticode signing certificate.
