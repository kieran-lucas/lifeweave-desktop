# Core local threat model

Trust boundaries: renderer→typed IPC; SQL parameters→SQLite; user-selected/imported files→contained storage; backup package→restore staging; Markdown/assets→static Reader; build inputs→unsigned installer.

Controls verified:

- exact generated command capability parity and centralized `invoke()`;
- strict CSP without remote origins or `unsafe-eval`; no shell/network/broad filesystem permission;
- backup identities and asset/document references are path-free at IPC;
- traversal, absolute paths, symlinks/special staging files, byte/count/dimension/JSON limits, MIME sniffing, checksums, SQLite integrity and foreign keys fail closed;
- unsafe HTML/MDX/JavaScript links and remote image fetching remain rejected;
- user content and hidden evaluation values are skipped from tracing;
- app-owned file publication now flushes contents and checks Windows parent-directory barriers;
- dependency audit on 2026-08-02 reported no known production vulnerabilities; no telemetry dependency was introduced.

Residual limitations: unsigned internal artifacts provide no publisher authenticity; local malware with the user's filesystem privileges remains outside the app boundary; native WebDriver click-through remains unavailable.
