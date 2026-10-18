# ADR 0057 — Task overdue emphasis and progress notes

Status: Accepted by the Product Owner request of 2026-10-18.

## Authority and scope

The Product Owner requests red emphasis when a Task's scheduled end passes without a completion
assessment, plus a fifth `+` entry alongside the four assessment choices for an authored progress
note displayed below that Task (for example, planned 50 exercises, completed 20).
This narrowly extends Slice 041's presentation-only boundary. The immutable source §§7.1–7.3
continues to govern the four assessment values; `+` is an authoring action, with no hidden score.

## Decision

- A past scheduled end and absence of any current assessment produce red emphasis across the
  entire timeline row (background, boundary, time and task copy), and an
  explicit Overdue label. Choosing any assessment resolves this unassessed state; undo restores it.
  Eligibility and emphasis refresh at minute boundaries and after window focus/visibility changes.
  The Product Owner's follow-up clarifies that red applies to the whole Task, rather than its
  title alone. The tint persists on hover and an explicit boundary remains in forced colors.
- The anchored assessment menu contains its four existing choices and `+ / Note` as the fifth
  entry, available after the scheduled end under the same UI availability rules.
- Notes are optional plain text, at most 2,000 Unicode characters, rendered as escaped React text
  below the corresponding Task. The editor supports multiline text, Save, Cancel, Escape, focus
  trapping/restoration, and error retry. A new note starts empty, without sample text or a placeholder.
  Saving blank text removes the current note.
- A note neither creates nor changes an assessment. Existing assessment labels, Analytics,
  missed/Overdue queues, actual time, and undo authority keep their current meaning.
- One-off note identity is Task ID; recurring note identity is series ID plus original local date,
  including moved occurrences. A series edit follows the existing evaluation identity policy:
  notes remain with their original series/occurrence and are not copied to a newly split series.
- SQLite schema 34 adds a separate checked, foreign-keyed note table. Existing fields and released
  migrations remain untouched. One narrow typed IPC command validates subject, text and scheduled
  end again in Rust and writes transactionally. A single batched query projects the day's notes.
- Full-database backup/restore preserves notes; portable Life packages continue to exclude Tasks.
  Runtime, backup and restore use the same new maximum supported schema.

## Alternatives and rollback

Storing notes in Description conflates the original goal with its retrospective result. Adding an
assessment value invents a numerical mapping and changes Analytics without authorization. Browser
storage makes user notes bypass backup. A separate current note avoids those changes and adds no
dependency. Rollback requires restoring a pre-upgrade backup; do not open schema 34 with a build
supporting only 33 or drop authored notes through a reverse migration.

## Verification

Cover end-minute/day boundaries, current assessment and undo, keyboard selection of the fifth
entry, edit/cancel/failure/clear, Unicode limits, invalid and future subjects, recurring isolation,
file reopen, migration from 33, and full-database backup round-trip. Record commands and remaining
native visual/DPI verification in the change audit.
