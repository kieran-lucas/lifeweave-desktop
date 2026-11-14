# Milestones amendment

Authority: Product Owner implementation request of 2026-11-14; ADR 0058.

The later 2026-11-14 Product Owner refinement below supersedes the initial presentation rules in
this package: twelve visible months, quiet lower page, refined native motion and X-only wheel.

- Navigation: Today, Milestones, Calendar, Plans, Life System; separated Settings. Today remains
  startup. Existing global shortcuts remain unchanged. History/reload recognizes Milestones.
- Identity: Milestones / Pin milestone. Reuse Today
  masthead, wide PageFrame, shared tokens, controls, empty state and accessible dialogs.
- Persistence: independent schema-35 SQLite table, Rust validation and transactions; generated
  DTOs; centralized adapters; Query as projection only. Title 1–200 Unicode characters; plain
  description 0–4000; valid local calendar date; pin/unpin; revision checks; recoverable confirmed
  deletion and durable Restore. No production sample data, Task creation, scheduling or completion.
- Geometry: twelve visible months starting at month -2, with a 36-month scroll buffer; one uniform
  day scale derived from available width; correct month lengths, leap
  days, past dates and years; baseline, elapsed segment, ticks, month labels and local Today.
- Native horizontal trackpad/touch; vertical and diagonal wheel constrained to X inside the timeline;
  empty-space mouse drag; month buttons; date jump and all milestones in the shared dialog; Today;
  focused timeline arrows/Home; no forced snapping or custom inertia.
  No raw scroll-frame state updates, marker measurements or automatic extension during a gesture.
  The compact visible-period label updates after gestures settle. Range
  updates occur only on explicit navigation or resize. Resize preserves the calendar-day fraction
  and waits for active gestures; rollover never recenters.
- Pinned labels/connectors share the scroll canvas. Deterministic nonoverlapping lanes retain
  duplicate dates; overflow joins selectable groups with +N counts within three lanes. No vertical
  timeline scroll. Complete long titles remain accessible in details. The library includes unpinned,
  deleted and distant dates.
- Details only after selection: title/date/countdown/description, edit/pin/unpin/delete/close. There
  is no reserved empty panel, help paragraph, generic subtitle or permanent Find/Trash section. Past dates
  say days ago and never imply completion. Create/edit dialog traps/restores focus, Escape/cancel,
  pending guard and retained draft on failure. Reduced motion disables spatial detail motion and
  smooth scrolling. Timeline remains navigable when empty or loading.
- Verify: synthetic SPhO 2026-12-17 and App Paper 2027-01-01, same-day/dense/long Unicode,
  current/past/month/year/leap/DST dates, local rollover and gesture contracts; actual browser
  containment, connected movement, resize and keyboard; file reopen, migration 34→35, full backup
  restore; existing test suites, governance, production frontend and Windows build. Record physical
  trackpad, touch hardware, Narrator and physical DPI separately if not observed.
