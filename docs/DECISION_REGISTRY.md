# Decision Registry

The immutable source is authoritative. This registry makes operational status visible without replacing context.

## LOCKED — Product

- Windows local-first/offline application.
- No account, server, collaboration, hidden telemetry, or default cloud dependency.
- Task-first navigation; Today default.
- Task is not a card.
- Continuous Task timeline 04:00–24:00.
- Required exact-minute start/end.
- Ordinary overlaps rejected; exact-slot groups allowed.
- Retrospective completion selection through a radial fan.
- Reminder, Windows notification, sound, and app-open streak removed.
- Analytics is a separate destination.
- Life Browse shows selected + direct children.
- Full tree belongs to Life Edit.
- Leaf opens a separate reader.
- Reduced Motion required.
- Data backup/restore/export are first-class.

## LOCKED — Technology direction

- Tauri 2.
- React UI + Rust application core.
- TypeScript strict.
- Vite 8.
- `rusqlite` bundled, dedicated DB worker, forward-only migration.
- typed IPC/DTO generation.
- vanilla-extract/theme contracts/native CSS.
- TanStack Query + narrow Zustand.
- dnd-kit and d3-hierarchy where activated.
- Tiptap/ProseMirror direction for editor work when the relevant slice activates.
- FTS5/rrule/testing/release foundations as specified, but dependencies install only when their feature activates.

## PROTOTYPE-GATED

- radial fan geometry and probability emphasis;
- completion prediction algorithm;
- global scoring formula;
- Narrative canonical schema;
- autosave cadence/patch model;
- shared-element exact choreography;
- large-tree virtualization;
- visual-world asset intensity/performance;
- narrow-window and DPI threshold decisions.

## OPEN — Product/UX

- final brand/name/logo;
- final FAB icon and placement;
- Upcoming/Overdue information architecture;
- actual-time semantics;
- final score and hidden mappings;
- final prediction;
- role of Outline, Noteboard, tags, backlinks, Graph;
- final Canvas export scope;
- branch node content semantics;
- shortcut map;
- final light/dark palettes and world count;
- backup retention/version policy;
- multi-monitor details.

## DEFERRED

- prediction and opaque ML;
- advanced Narrative Canvas;
- multiple visual worlds;
- Graph;
- generalized knowledge features;
- public updater/store distribution;
- advanced full palette customization;
- sound design.

## REMOVED

- account/login/server;
- default cloud sync;
- collaboration/sharing/presence/comments;
- subscription/paywall;
- reminder/notification/sound/snooze;
- task cards;
- dashboard startup;
- month calendar fixed beside timeline;
- full tree in Browse;
- anime characters/fanart/gacha;
- video background;
- default freeform pixel canvas.

## Change process

1. Create an Open Decision issue.
2. Cite original source lines and current registry entry.
3. State concrete alternatives and consequences.
4. Prototype if gated.
5. Record accepted result in ADR.
6. Update registry/spec/tests in the same or linked PR.
7. Obtain Product Owner acceptance.
