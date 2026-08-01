# Security, Privacy, and Logging

## Threat model

Even offline software processes untrusted:
- Markdown/HTML;
- ZIP backups/imports;
- images/SVG;
- links;
- filenames/paths;
- document JSON;
- future-version data.

## Tauri boundary

- capability per window/webview;
- main window receives minimum permissions;
- no general shell execution;
- no broad filesystem capability;
- native file access through scoped command/dialog;
- strict CSP;
- no remote scripts/fonts/images;
- no `unsafe-eval`;
- development exceptions never ship.

## Input validation

- parameterized SQL;
- sanitize embedded HTML/SVG;
- URL scheme allowlist;
- MIME sniff and size limits;
- ZIP entry count/size/path limits;
- reject traversal, absolute paths, symlink escape, zip bombs;
- JSON schema/version validation;
- no executable code blocks/MDX expressions;
- manifest/checksum not trusted until verified.

## Logging

Allowed:
- command category;
- duration/status/error code;
- non-sensitive entity counts;
- app/schema/migration version;
- performance spans.

Forbidden:
- Task/Life/document text;
- raw sensitive search queries;
- full personal paths;
- clipboard;
- attachment bytes;
- hidden completion mapping unless strictly necessary;
- secrets/tokens/certificates.

Diagnostic export is redacted and previewable.

## Runtime network

Core app code makes no network request for core functionality. Test application-originated requests against an allowlist. Do not confuse OS/WebView2 update behavior with an application feature request.

## Supply chain

- lockfiles;
- cargo-deny/audit;
- OSV scan;
- reviewed GitHub Actions;
- small dependency update PRs;
- no automatic major merge;
- checksums/SBOM for public release where activated.
