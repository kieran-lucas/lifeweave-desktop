# Task 4 — Security, CSP and Capabilities

## Scope and threat boundary

This review covers untrusted WebView JavaScript crossing the Tauri IPC boundary into Rust command validation and the local database/filesystem. It does not claim protection from compromised Rust code, an administrator/kernel, or post-operation tampering by a privileged local actor.

## Controls

- `main-capability` is the only capability, restricted to the `main` window on Windows, with no remote URLs and only generated permissions for the ten registered commands.
- `core:default` and unused plugin permissions are absent. `build.rs` uses an explicit `AppManifest` command inventory; `scripts/verify_security.py` checks it against `generate_handler!`.
- Production CSP uses explicit self-only script/style sources, restrictive object/base/frame/form directives, and only Tauri's pinned `http://ipc.localhost` transport. No eval, wildcard, or remote assets are allowed.
- Foundation UI has no inline styles, dynamic HTML, raw `invoke`, fetch, WebSocket, iframe, or filesystem path boundary. IPC tracing skips state, handles and user DTOs; operation IDs are not logged.

## Verification and debt

`python scripts/verify_security.py` is integrated into `pnpm verify` and inspects the real config, capability, command handler, build manifest and frontend source. Full Rust/frontend/Tauri and governance evidence was run on the final pushed HEAD.

F-04 Windows directory durability, F-05 backup publication barriers, and lack of independent GitHub CI remain deferred. Formal security certification is not claimed. Task 5 native Windows Foundation E2E is the next roadmap action.
