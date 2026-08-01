# GitHub Labels and Milestones

## Labels

### Type
- `type:feature`
- `type:bug`
- `type:decision`
- `type:prototype`
- `type:architecture`
- `type:documentation`
- `type:security`
- `type:performance`
- `type:accessibility`
- `type:testing`

### Area
- `area:foundation`
- `area:task`
- `area:calendar`
- `area:analytics`
- `area:life`
- `area:document`
- `area:backup`
- `area:design-system`
- `area:release`

### Priority
- `priority:P0`
- `priority:P1`
- `priority:P2`
- `priority:P3`

### Decision state
- `decision:locked`
- `decision:prototype-gated`
- `decision:open`
- `decision:deferred`
- `decision:removed`

### Workflow
- `needs-spec`
- `ready`
- `blocked`
- `needs-ai-review`
- `needs-human-acceptance`
- `data-risk`
- `breaking-change`

Use `scripts/create-github-labels.ps1` after authentication.

## Milestone gates

### M0 Project Constitution
- source preserved;
- governance scripts pass;
- GitHub templates/workflows present;
- Windows bootstrap lockfiles reviewed.

### M1 Foundation Proof
- typed React→Tauri→Rust→SQLite path;
- restart persistence;
- migration;
- backup/restore smoke;
- Windows production build.

### M2 Task Core
- Today timeline;
- Task CRUD/archive;
- time wheel/conflict/groups;
- category/priority;
- recurrence;
- Calendar projection.

### M3 Completion & Objective Analytics
- radial fan without prediction;
- evaluation history;
- objective period aggregates;
- minimum/target streaks.

### M4 Life Browse
- two-level scene;
- breadcrumb/history;
- pinned;
- leaf opening shell.

### M5 Life Edit
- full tree;
- reparent/reorder;
- cycle prevention;
- undo;
- performance fixtures.

### M6 Basic Leaf
- static Read;
- focused Edit;
- autosave/recovery;
- Markdown round trip;
- asset backup.

### M7 Core Hardening
- accessibility;
- DPI;
- performance;
- crash/recovery;
- security;
- release candidate dogfooding.

### M8 Expansion Candidates
No item enters without separate Product Owner activation.
