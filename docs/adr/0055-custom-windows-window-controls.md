# ADR 0055 — Custom Windows window controls

Status: ACCEPTED by the Product Owner's 2026-09-28 request.

## Context

ADR 0045 kept the native decorated Windows titlebar for the original visual baseline and explicitly allowed a later separate decision. The Product Owner now requests denser, Lifeweave-styled minimize, maximize/restore, and close controls.

## Decision

The main Windows window uses `decorations: false` and a compact in-app drag strip with three native window actions. The controls use ordinary buttons with accessible names, visible keyboard focus, restrained hover/press feedback, and reduced-motion support. The app grants only the Tauri window and event permissions needed for these actions and maximize-state synchronization. The drag strip handles double click to toggle maximize.

The sidebar wordmark continues to use the self-hosted Lexend face from ADR 0054, with a heavier weight for clearer identity. No other application surface or task behavior changes.

## Consequences

The app owns the titlebar's appearance and must keep drag, resize, close, minimize, maximize/restore, keyboard focus, and window-state updates working in the Windows WebView. This supersedes only ADR 0045's native-titlebar choice; its other visual and security constraints remain in force.
