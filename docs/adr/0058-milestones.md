# ADR 0058 — Milestones

Status: Accepted by the Product Owner's explicit implementation request, 2026-11-14.

The Product Owner assigns Codex as builder for a standalone timeline of meaningful life moments.
This is a bounded amendment to active Slice 041: it supersedes its presentation-only, schema-34,
no-new-IPC and no-new-navigation restrictions only for Milestones. It does not activate other
OPEN/DEFERRED features. The immutable source, Today startup, scheduling, Plans, Calendar,
shortcuts, local-first architecture, backup format and workflow seal remain binding.

Milestones appears directly below Today, before Calendar, Plans, Life System and separated
Settings. It has no new global accelerator; existing chords keep their meaning. Session history
recognizes the destination, and reload reopens it through the existing history envelope.

Schema 35 appends an independent `milestones` table, with calendar date, plain Unicode title and
description, explicit pin state, UTC creation/update instants, revision and recoverable deletion.
Rust validates dates (years 0100–9999), titles (1–200 characters), descriptions (0–4000) and stale
writes inside the existing worker. Three scoped commands list, save and mutate milestones.
Client-created stable UUIDs prevent duplicate inserts on retry. Deletion requires confirmation,
retains the row and offers durable restoration. There is no automatic completion or association
with Tasks, Calendar or Plans. Backup/restore and startup share the schema-35 authority. No
released migration or generated binding is edited by hand; no dependency or network is added.

The page consumes the existing wide PageFrame, Today masthead styles, shared controls, Fluent
flag, empty state, dialog shell/focus trap, visual tokens and local-date rollover hook. A day is
eight CSS pixels, including across leap days and DST. The default window contains month -2
through +10. Explicit month/date/Today navigation can extend or replace this window; no automatic
edge loading changes geometry mid-gesture. Native overflow moves all geometry together. Mouse
dragging applies only to empty space; touch/trackpad stay native; only Shift-wheel is converted.
No scroll-driven React state or custom inertia exists. Today recenters once on mount and on
explicit request, never on midnight, resize or query updates. Reduced motion uses instant scroll.

Fixed 200×44 labels are packed into nonintersecting 56px lanes. Arbitrarily dense dates retain
all labels in a locally vertically scrollable timeline, with a visible instruction. Same-day
markers announce a count and print it when nearby counts have room; each callout and the detail
date group remains individually accessible.
Long titles ellipsize in the compact label, with complete title/date in the accessible name and
detail. A sorted Find control also reaches unpinned and out-of-window milestones.

Alternative browser persistence bypasses recovery, backup and Rust validation; a separate database
would split authority. Fixed-width months distort day distances. Custom inertia competes with
native scrolling. Automatic range extension requires mid-gesture anchoring and is unnecessary
for this small strategic timeline. Rollback uses a pre-migration backup and the previous build;
never drop authored data or reverse schema 35 in place.

Verification: date arithmetic/packing, UI workflows and keyboard/focus, migration/idempotence,
stale writes and invalid input, reopen, backup/restore, real-browser geometry/scrolling and build.
Evidence and unobserved manual interactions are recorded in the dated audit.

## Later Product Owner refinement — 2026-11-14

The Product Owner explicitly requests removing redundant lower-page detail/instructions, fitting
twelve months into one viewport, more polished motion matching Lifeweave, and horizontal-only
mouse-wheel movement. This supersedes the earlier fixed eight-pixel day scale, persistent detail
space/Find/Trash controls, default thirteen-month presentation and Shift-only wheel conversion.

The quiet page shows its title, Pin milestone, compact month/Today controls, and the timeline.
Descriptions, dates and actions appear only on selection. All milestones, unpinned items, date
jump and recoverable deletions remain reachable through one All milestones control and the shared
dialog shell. Empty-page instructions, duplicate actions, generic captions and reserved blank
detail space are removed. Persistence and domain semantics remain unchanged at schema 35.

A ResizeObserver derives one uniform pixels-per-day scale from the available width and the
actual length of twelve calendar months. Initial view starts two months before Today; a bounded
36-month backing canvas permits free horizontal travel. Explicit navigation can extend/rebase
that buffer. Resize preserves the visible calendar-day fraction and is deferred during active
gestures. Months remain proportional to actual day counts. No rigid month snapping is added.

Wheel input inside the timeline moves only along X, including at its boundaries. Native pure
horizontal input retains browser momentum; diagonal input drops Y; vertical input maps to X.
Discrete wheel ticks accumulate one target and coalesce through rAF into browser-native smooth
scrolling, with direct manipulation and reduced motion using immediate movement. Ctrl/Meta-wheel
remains available for zoom. Outside the timeline, ordinary application scrolling is unchanged.

Compact callouts occupy at most three nonintersecting lanes. Overflow joins the nearest callout
with an explicit +N count and all constituent identities retained; selecting it exposes all
related moments, and each original date keeps its marker/connector. No vertical timeline scroll
or hidden inaccessible milestone is introduced. Entrance, dot selection and detail motion use
the existing motion vocabulary, with an 80ms nonspatial fade under Reduced Motion.
