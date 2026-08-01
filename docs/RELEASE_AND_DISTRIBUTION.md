# Release and Distribution

Status: Core preparation; public release hardening is not active.

## Initial internal distribution

- Windows x64;
- Tauri NSIS installer;
- manual signed/unsigned internal artifacts according to trust context;
- no background update check;
- upgrades never delete user data by default;
- backup before migration.

## WebView2

Use Evergreen by default. Provide an offline-compatible installer path/fallback when the release goal requires installation without internet. Test supported Stable WebView2 and record environment in release metadata.

## Signing

For public release:
- Authenticode signing required;
- EV preferred if feasible;
- OV acceptable with realistic SmartScreen expectations;
- secrets in protected CI/signing service;
- verify signature before publish.

## Release flow

1. Freeze active release scope.
2. Migration and backup rehearsal.
3. Full Windows CI/E2E/visual/accessibility/performance.
4. Build draft artifacts.
5. Install/upgrade/uninstall test.
6. Sign and verify if public.
7. Checksum and optional SBOM.
8. Product Owner acceptance.
9. GitHub Release draft → publish.
10. Monitor only user-reported/opt-in diagnostics; no hidden telemetry.

## Update policy

Core V1 uses manually downloaded installer. Any future explicit “Check for updates” requires:
- Product Owner approval;
- opt-in/no silent install;
- signed metadata/artifacts;
- pre-update backup;
- migration recovery;
- no background polling unless explicitly approved.
