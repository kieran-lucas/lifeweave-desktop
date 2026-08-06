# Decision Registry

The immutable source is authoritative. This registry makes operational status visible without replacing context.

## LOCKED — Product

- Windows local-first/offline application.
- No account, server, collaboration, hidden telemetry, or default cloud dependency.
- Task-first navigation; Today default.
- Task is not a card.
- Continuous Task timeline 04:00–24:00 with required exact-minute start/end.
- Ordinary overlaps rejected; exact-slot groups allowed.
- Retrospective completion selection through a radial fan.
- Reminder, Windows notification, sound, snooze, and app-open streak removed.
- Analytics is a separate destination.
- Life Browse shows selected + direct children; full tree belongs to Life Edit; leaf opens a separate reader.
- Reduced Motion required.
- Data backup/restore/export are first-class and distinct from interchange.
- Task/Life relationships are navigation-only; each one-off Task or recurring Task series links to zero or one Life node. Authority is stored on `tasks` and `task_series`; occurrences/evaluations inherit and do not store it.
- Narrative Canvas supports 1–20 ordered scenes, three immutable built-in template IDs, and four static document-level Visual World IDs. Visual Worlds are presentation only.
- Portable Package v1 represents one committed Basic Leaf or Narrative Canvas leaf document. Import creates a new document on a selected empty active Life leaf and excludes tree, Task, draft, history, analytics, and settings state.
- Today, Upcoming, and Overdue are manual-activation tabs within Today. Upcoming is +1 through +14 local days; Overdue is -30 through -1 and is derived from absence of current evaluation.
- Tags are a flat global vocabulary for Life nodes and Tasks. Normalized name is the deduplication/search key; merges retain aliases.
- **Focus Plan is a standalone entity**, not a Life document or Basic Leaf template.
- Focus Plan has stable identity; explicit `draft | active | paused | completed` lifecycle; archive is orthogonal.
- Focus Plan links to zero or one active non-root Life node; one Life node may contextualize many Plans without new Life nodes.
- Focus Plan owns first-class variants, ordered phases, committed revisions, and one recovery draft. Rich-text bodies reuse the accepted Basic Leaf canonical value schema by value, not `reader_documents` rows.
- Focus Plans use shared tags, a distinct `focus_plan` Search entity kind, and full-database backup authority.
- Focus Plans have no automatic progress percentage and no reminder/notification dependency.
- Task 36 / Slice 026 is complete at feature checkpoint `57bd42d8eed5643d2fee3b04f74bd3c44e738da2`.
- Each one-off Task or recurring Task series links to zero or one Focus Plan. Authority is stored on `tasks` and `task_series`; occurrences, overrides, and evaluations inherit and do not store it. Task/Life and Task/Focus Plan are independent. A new or changed target must be an active non-archived Plan; an existing link survives later Plan archive and projects explicitly as archived.
- Focus Plan reviews are user-authored history with a review date, required reflection, optional next focus, and idempotent creation. Creating a review changes no Plan state. Task 37 authorises creation and reading only; edit, delete, archive, scheduling, and Search indexing remain out of scope.
- The execution roadmap remains a 60-task envelope. Product Owner allocation may reuse unstarted positions without increasing the total.

## LOCKED — Technology direction

- Tauri 2; React UI + Rust application core; TypeScript strict; Vite 8.
- `rusqlite` bundled, dedicated DB worker, forward-only migration.
- typed IPC/DTO generation; vanilla-extract/theme contracts/native CSS.
- TanStack Query + narrow Zustand; dnd-kit and d3-hierarchy where activated.
- Tiptap/ProseMirror direction for editor work when the relevant slice activates.
- FTS5/rrule/testing/release foundations as specified; dependencies install only when activated.
- GitHub Actions is limited to the sealed manual, read-only Windows installer build in `.github/workflows/manual-clean-build.yml`. Routine tasks may not modify the workflow or `.github/WORKFLOW_SEAL.sha256`; a change requires explicit Product Owner workflow authorization or evidence of a platform/toolchain break.
- Task closure is risk-based. Equivalent deterministic evidence may replace a named flaky or nondiagnostic test environment. Tooling failures do not block roadmap progression unless they reproduce a product invariant violation.

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
- deadline semantics beyond scheduled date/time;
- saved filter AST/view UI;
- final score and hidden mappings;
- final prediction;
- backlinks;
- Generic Outline role beyond the Basic Leaf heading navigator;
- Noteboard role;
- Graph;
- whole-tree or multi-document interchange;
- custom export profiles;
- preserve-vs-strip original asset metadata beyond the privacy-safe default;
- branch node content semantics;
- shortcut map;
- global application/branch appearance beyond the four locked Narrative Canvas worlds;
- backup retention/version policy;
- multi-monitor details.

## DEFERRED

- Focus Plan review edit, delete, archive, scheduling, reminders, and Search indexing remain prohibited pending a separate Product Owner decision;
- automatic Plan progress, phase-to-Task relationships, and Plan analytics expansion remain prohibited;
- prediction and opaque ML;
- Deadline Semantics implementation after the Task 34 Product Owner modification;
- custom user-authored Narrative templates and Visual Worlds;
- cross-scene block drag and scene-level independent presentation;
- Graph and generalized knowledge features;
- public updater/store distribution;
- advanced full palette customization;
- sound design.

## REMOVED

- account/login/server; default cloud sync; collaboration/sharing/presence/comments;
- subscription/paywall; reminder/notification/sound/snooze;
- task cards; dashboard startup; month calendar fixed beside timeline;
- full tree in Browse; anime characters/fanart/gacha; video background;
- default freeform pixel canvas.

## Change process

1. Create an Open Decision issue.
2. Cite original source lines and current registry entry.
3. State concrete alternatives and consequences.
4. Prototype if gated.
5. Record accepted result in ADR.
6. Update registry/spec/tests in the same or linked change.
7. Obtain Product Owner acceptance before implementation activation.
