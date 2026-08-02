# Task 7 — First App Shell Milestone

## Scope and design

- Starting HEAD: `646399502ff72ae218df6561d75e33b33944e075`.
- Implemented a CSS Grid shell with a fixed semantic navigation rail and one scrolling destination viewport.
- Today is the default destination. Calendar, Analytics, Life System and Settings are typed internal destinations with explicit placeholders; no domain behavior was added.
- FoundationRecord and backup tools now live inside a labeled Settings foundation-tools section.
- The task sidebar preference is persisted as versioned local storage (`lifeweave.task-sidebar-mode.v1`). Life System auto-collapses while preserving the normal Task preference and restores it on return.
- Collapsed rail is 68px nominal; expanded rail is 220px nominal. Focus-visible controls, `aria-current`, heading focus restoration, reduced-motion global behavior and light/dark tokens are preserved.

## Evidence

- Frontend tests: 22 passed across 2 files; typecheck and Vite build passed.
- Rust: 195 tests passed; focused backup suite 127 passed; check/fmt/clippy passed.
- `pnpm verify` passed; generated IPC bindings had no drift.
- Production Tauri build passed and produced `src-tauri/target/release/bundle/nsis/Lifeweave_0.0.0_x64-setup.exe`.
- Native smoke used a synthetic sentinel-contained profile under `target/e2e-data/task7-smoke-<id>`: Vite ready, native process alive for 22 seconds, shell startup without panic/startup/IPC fatal output, and exact owned process cleanup.

## Boundaries and debt

Task System, Calendar behavior, Analytics calculations, Life tree, final Settings architecture and visual branding remain out of scope. F-04/F-05 durability debt, lack of independent GitHub CI and the Task 5 WebDriver attachment limitation remain non-blocking. Task 8/60 is the only next action.
