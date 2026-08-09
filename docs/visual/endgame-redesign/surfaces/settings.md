# Surface Authority — Settings

**Scope:** Settings, Category Goals, Tags, Backup/Restore, Keyboard and Foundation tools.

**Canonical closure IDs:** S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08

**Visual references:** none required

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

# Settings

## 25. S-01 — Settings page

Actual sections in exact order:

1. Category goals
2. Tags
3. Backup & restore
4. Keyboard
5. Foundation tools

Target:

- one continuous editorial settings document;
- sections separated by vertical rhythm + hairline;
- no full-width card per setting section;
- each section title + description tightly paired;
- controls begin after a clear content gap.

### S-02 — Category Goals

Actual per category:

- category name;
- Configure scheduled-time goals checkbox;
- Weekly minimum:
  - Hours
  - Minutes
- Weekly target:
  - Hours
  - Minutes
- Save goals / Saving;
- validation/error.

Target:

- category rows/editor blocks repeat cleanly;
- checkbox state controls field visibility;
- hours/minutes paired within one duration group;
- one save per category remains.

### S-03 — Tags / create and tables

Actual:

- New tag name;
- Create;
- Active tags table:
  - Name
  - Tasks
  - Series
  - Life nodes
  - Actions
- Archived tags table same columns;
- Merged aliases:
  - Alias
  - Canonical tag.

Target:

- tables are the correct primitive;
- no tag-card grid;
- usage counts tabular;
- actions compact.

### S-04 — Tag inline rename

Actual:

- inline input;
- Save/confirm via Enter;
- Cancel/Escape;
- error.

Target:

- same row expands minimally;
- no modal.

### S-05 — Tag merge

Actual:

- source select;
- “into”;
- target select;
- Merge;
- at-least-two state;
- inline confirmation with:
  - source name;
  - task count;
  - series count;
  - Life node count;
  - target;
  - permanent alias;
  - cannot be undone;
- Confirm merge / Retry;
- Cancel;
- error.

Target:

- merge is a dedicated subsection;
- confirmation region visually stronger than normal help, but remains inline;
- destructive/permanent nature is explicit;
- no modal unless behavior changes.

### S-06 — Backup & Restore

Actual:

- title + intro;
- Create backup / Creating;
- retention policy;
- managed backup versions;
- loading/error/empty;
- table:
  - Created
  - App
  - Format
  - Schema
  - DB size
  - Compatibility
  - Restore;
- status/error.

Target:

- backup creation action aligned with heading;
- retention policy readable but subordinate;
- versions table is hero of section;
- incompatible Restore disabled + compatibility text remains.

### S-07 — Restore backup modal

Actual:

- Restore managed backup?
- created time;
- format/schema;
- compatibility;
- optional migration note;
- safety-snapshot note;
- Cancel;
- Restore backup / Restoring.

Target:

- compact confirmation;
- initial focus remains Cancel;
- restore is prominent but visually serious;
- no extra password/check-box confirmation invented.

### S-08 — Keyboard section

Actual:

- explanation;
- Keyboard shortcuts button.

Target:

- one simple button; dialog specified globally.

### S-09 — Foundation tools

Actual:

- Foundation Records;
- create record:
  - New record label
  - Add;
- active list:
  - Edit
  - Archive;
- inline edit:
  - Save
  - Cancel;
- archived list:
  - Restore;
- loading/error/empty.

Target:

- verification/admin utility visual priority is low;
- do not hide/collapse automatically because current authority keeps it visible;
- styling still converges with Settings forms/lists.

---
