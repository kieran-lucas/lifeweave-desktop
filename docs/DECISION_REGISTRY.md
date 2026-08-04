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
- Task/Life relationships are navigation-only; each one-off Task or recurring Task series links to zero or one Life node.
- Relationship authority is stored on `tasks` and `task_series`; occurrence and evaluation rows do not store it, and recurring projections inherit the series relationship.
- Narrative Canvas supports 1–20 ordered scenes.
- Narrative Canvas has three immutable built-in creation template IDs: `knowledge_dossier`, `project_blueprint`, and `learning_journey`.
- Narrative Canvas has four static document-level Visual World IDs: `paper`, `sakura`, `aurora`, and `nocturne`.
- Visual Worlds are presentation only and remain independent from templates.
- Portable Package v1 represents one committed Basic Leaf or Narrative Canvas leaf document.
- Portable canonical JSON is import authority; Markdown is a human-readable fallback and supported local visual assets are privacy-sanitized, checksummed, and remapped.
- Portable import creates a new document only on a selected empty active Life leaf; it does not import or rename the Life node and excludes tree, Task, draft, history, analytics, and settings state.
- Portable Package is document interchange, not a database backup.
- Today, Upcoming, and Overdue are manual-activation tabs within the existing Today destination; Today remains the startup and fresh-mount default.
- Upcoming covers anchor +1 through +14 local calendar days; Overdue covers anchor -30 through -1 local calendar days.
- Overdue is derived from the absence of any current evaluation; any current evaluation reviews the item, and undo may restore it.
- Planning queue items open their exact displayed date and stable Task or recurring-series identity in Today; queue state is not persisted.

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
- autosave cadence/patch model;
- shared-element exact choreography;
- large-tree virtualization;
- visual-world asset intensity/performance;
- narrow-window and DPI threshold decisions.

## OPEN — Product/UX

- final brand/name/logo;
- final FAB icon and placement;
- actual-time semantics;
- deadline semantics beyond the existing scheduled date and time;
- saved filter AST/view UI;
- final score and hidden mappings;
- final prediction;
- tags;
- backlinks;
- Generic Outline role beyond the Basic Leaf heading navigator;
- Noteboard role;
- Graph;
- whole-tree or multi-document interchange;
- custom export profiles;
- preserve-vs-strip original asset metadata policy beyond the privacy-safe default;
- branch node content semantics;
- shortcut map;
- global application/branch appearance beyond the four locked Narrative Canvas worlds;
- backup retention/version policy;
- multi-monitor details.

## DEFERRED

- prediction and opaque ML;
- custom user-authored Narrative templates;
- custom user-authored Visual Worlds or arbitrary palettes;
- cross-scene block drag;
- scene-level independent layout/atmosphere/motion;
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
