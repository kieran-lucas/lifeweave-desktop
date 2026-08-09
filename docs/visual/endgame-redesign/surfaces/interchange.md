# Surface Authority — Interchange

**Scope:** Portable document, branch and tree interchange controls and preview dialogs.

**Canonical closure IDs:** PK-01, PK-02, BR-01, BR-02, TR-01, TR-02

**Visual references:** none required

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

# Portable / Branch / Tree Interchange

## 21. PK-01 — Portable Package controls

Actual:

Document present:
- explanation;
- Export Lifeweave package;
- pending;
- draft-not-included note;
- success/error.

Empty leaf:
- Import Lifeweave package file input;
- validation/errors;
- opens preview.

Target:

- utility region, clearly secondary to document;
- file action styled as a real button/label;
- warning note readable.

### PK-02 — Portable package preview modal

Actual metadata:

- Title
- Type
- Template/version if any
- Visual World if any
- Scenes if any
- Assets + bytes
- Package bytes
- warnings
- Cancel
- Import into this empty leaf / Importing

Target:

- metadata definition list;
- warnings separated;
- import confirm primary;
- no preview thumbnail invented.

### BR-01 — Branch interchange controls

Actual:

- Export branch;
- Import branch here;
- blocked reason;
- status/error.

Blocked cases include:

- root;
- document-holding node;
- no active child.

Target:

- compact utility group inside Life Edit inspector;
- disabled buttons accompanied by reason.

### BR-02 — Branch import preview modal

Actual metadata:

- Branch
- Destination
- Nodes / branch / empty leaf counts
- Documents and kinds
- Depth
- Assets
- Tags
- internal links
- Package
- warnings
- Cancel
- Import branch here

Target:

- wide enough for metadata but not a table dashboard;
- danger is not implied: import appends and is safe/idempotent;
- warnings factual.

### TR-01 — Life Tree controls

Actual:

- Export Life tree only at root;
- Import Life tree here unless destination has document;
- blocked reasons;
- status/error.

### TR-02 — Tree import preview

Actual:

- complete non-root forest explanation;
- fresh local identities;
- never merge/replace/reorder/overwrite;
- cannot be undone;
- destination;
- top-level roots;
- nodes;
- documents;
- depth;
- assets;
- tags;
- internal links;
- package;
- warnings;
- Cancel;
- Import Life tree here, disabled if unsupported.

Target:

- because this is high consequence, hierarchy of explanation is critical;
- “cannot be undone” must be visible;
- confirm primary only when supported;
- no scary red full-dialog treatment unless error.

---
