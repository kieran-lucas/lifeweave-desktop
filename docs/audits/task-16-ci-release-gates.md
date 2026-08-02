# Independent CI and release gates

## Task 16 checkpoint (historical)

At the Task 16 checkpoint, five independent CI workflows passed:

- Source integrity / Source integrity
- Governance / Governance
- Frontend / Frontend
- Rust / Rust
- Windows Tauri / Windows Tauri

All five used `contents: read`, superseded-run cancellation, explicit job timeouts, frozen locks and commit-pinned actions. Windows Tauri built the normal production configuration, checked generated bindings, and retained the unsigned installer for seven days. Branch protection was not enabled (GitHub Pro required for private repositories).

Local equivalents were the Task 16 full gate commands plus `pnpm hardening:performance` and `pnpm hardening:rc`. There is no automatic public release, updater or signing step.

## Post–Task 16 Product Owner correction (standing policy)

The Product Owner subsequently reduced the standing CI policy. The five workflows above have been removed. One optional `workflow_dispatch`-only manual clean Windows build (`manual-clean-build.yml`) remains. Remote CI is not a task-completion gate. Local evidence is authoritative for normal development. No polling is permitted.
