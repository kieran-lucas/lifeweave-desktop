# Independent CI and release gates

Required check names:

- Source integrity / Source integrity
- Governance / Governance
- Frontend / Frontend
- Rust / Rust
- Windows Tauri / Windows Tauri

All workflows use `contents: read`, superseded-run cancellation, explicit job timeouts, frozen locks and commit-pinned actions. Windows Tauri builds the normal production configuration, checks generated bindings, and retains the unsigned installer for seven days. Branch protection must be enabled by the Product Owner for the five checks; this local run did not claim repository-settings mutation.

Local equivalents are the Task 16 full gate commands plus `pnpm hardening:performance` and `pnpm hardening:rc`. There is no automatic public release, updater or signing step.
