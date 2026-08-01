# Core Product Specification

Status: **Approved setup baseline; feature details remain governed by the immutable source and active specs.**

## 1. Purpose

Core Product must deliver a genuinely useful personal Windows application before expansion systems are allowed to consume architecture, schema, bundle size, or implementation attention.

Core succeeds when:

- Task opens quickly and supports daily planning/review with minimal friction.
- Life System provides navigable long-term structure without becoming a generic workspace platform.
- Data remains local, durable, portable, and recoverable.
- Motion and visual quality are distinctive but bounded.
- Every completed feature has measurable evidence.

## 2. Core boundaries

### Included

#### Foundation
- Tauri/React application shell.
- Typed IPC.
- Rust domain/application/infrastructure layering.
- SQLite worker, forward-only migrations, transaction discipline.
- Source-integrity, CI, tests, tracing, diagnostics skeleton.
- Backup/restore smoke path.

#### Task
- Today as default destination.
- Continuous vertical day timeline from 04:00 to 24:00.
- Morning, afternoon, evening regions without tabs or columns.
- Week strip and date navigation.
- Task create/edit/archive/restore.
- Required start/end time with one-minute precision.
- Time conflict validation and exact-slot groups.
- Category, icon/color, priority.
- Recurrence with occurrence scope.
- Missed history.
- Current-time indicator.
- Completion ring and radial fan, initially without prediction.

#### Calendar
- Dedicated month destination.
- Day projection: task count, scheduled duration, category icons, three period-load indicators, missed marker.
- Open a day before creating a task.

#### Objective analytics
- Scheduled minutes.
- Category minimum and target attainment.
- Completion distribution.
- Missed counts.
- Week/month/year projections.
- Minimum/target streaks.
- No mandatory global 0–100 score until its formula is approved.

#### Life System
- Two-level Browse: selected node plus direct children.
- Breadcrumb, back/history, last-node restoration, pinned view.
- Full-tree Edit Mode.
- Node create/rename/archive/restore/reorder/reparent.
- Cycle prevention in Rust.
- Basic leaf document with static Read and focused Edit modes.
- Basic Markdown interoperability.

#### Quality
- Keyboard parity and deterministic focus.
- Reduced Motion.
- Windows DPI verification.
- No hidden runtime network.
- Backup/restore and export/import round trips.
- Crash/recovery behavior.

### Explicitly excluded from Core critical path

- Completion prediction.
- Global 0–100 scoring formula and score-based streak.
- Anime Narrative Canvas scene/block composition platform.
- Seven-template system.
- Multiple cinematic visual worlds.
- Graph, Noteboard, backlinks, tags, generalized saved-view filter language.
- Public marketplace/plugins.
- Cloud sync, collaboration, accounts, reminders, notifications, sounds.

These remain retained in `EXPANSION_VISION.md` only where the original source retains them.

## 3. Navigation

Initial Core destinations:

1. Today
2. Calendar
3. Analytics
4. separator
5. Life System
6. separator
7. Settings

Backup/restore is a first-class Settings section. Category names are Task data, not top-level destinations.

## 4. Task contracts

### 4.1 Entity identity
Task is an independent aggregate. Creating a task never creates a Life node, card, or editor document.

### 4.2 Scheduling
- Local calendar date is stored independently from UTC instants.
- Valid scheduling range: 04:00 ≤ start < end ≤ 24:00.
- 24:00 is an end boundary only.
- Boundary-touching intervals are valid.
- Ordinary overlap is rejected.
- Exact identical intervals may share a time-slot group.
- Save revalidates in Rust transaction even if UI already filtered invalid values.

### 4.3 Display
Task rows share aligned time/content/assessment columns. They use dividers and subtle selection surfaces, not card shadows. Content may grow vertically rather than being aggressively truncated.

### 4.4 Interaction
- Single click selects without mutation.
- Double click or keyboard command opens the edit dialog.
- Create uses a focused central dialog.
- Destructive actions prefer archive/undo and use confirmation only for broad or difficult-to-reverse effects.
- No inline rich-text editor in Task rows.

### 4.5 Completion
Completion is retrospective evaluation, not workflow state and not live progress. The default labels are configurable and map to hidden normalized values. Historical evaluation snapshots must not change silently when mappings are edited.

The Core radial fan:
- has stable logical order;
- presents equal-sized targets initially;
- opens in a fan around the trigger;
- flips/shifts near viewport edges;
- supports keyboard and screen readers;
- closes and updates optimistically after selection;
- uses undo instead of confirmation.

## 5. Life contracts

### 5.1 Browse
Render only the selected node, direct children, breadcrumb, and essential metadata. Do not load/render the entire tree or editor.

### 5.2 Edit
The full tree is a dedicated structural editor. Geometry is derived, not persisted as pixels. The frontend previews changes, but Rust validates parenthood, cycle, and transaction.

### 5.3 Basic leaf
The first useful document surface supports readable, portable content:
- headings and paragraphs;
- emphasis;
- lists;
- quote/callout;
- links;
- code;
- image;
- simple table.

The canonical model is chosen through a later active spec; Core must not accidentally inherit the entire Narrative Canvas model.

## 6. Data and portability

- SQLite stores relational domain data.
- Filesystem stores assets by stable ID.
- Derived indexes/aggregates are rebuildable.
- Backup contains a consistent database snapshot, assets, manifest, checksums, and version metadata.
- Restore performs compatibility, checksum, SQLite integrity, foreign-key, and staging checks.
- Markdown provides human-readable interoperability; canonical JSON may accompany it when required for lossless app-specific structure.
- No user content is committed to this repository.

## 7. Definition of Core done

Core is not done until the Product Owner can dogfood it with real personal data and:

- restart without data loss;
- recover from backup;
- use all core flows by keyboard;
- use Reduced Motion;
- observe no hidden runtime network requests from the application;
- obtain stable behavior at common Windows DPI scales;
- pass migration and round-trip tests;
- pass independent review;
- accept the UX personally.
