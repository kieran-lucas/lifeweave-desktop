# Task 27: Narrative Template System

Starting checkpoint: 4e2c4ee347212b9a26949f7c9df2d2ae77dab59a (accepted Task 26). Final checkpoint is recorded after the single Task 27 commit.

Migration 15 is append-only and replaces only the migration-12 template guards. A real schema-14 Knowledge Dossier row upgrades unchanged; the new guard accepts exactly the three supported IDs and keeps template_id immutable. The Rust catalog seeds the exact ordered scenes with fresh IDs and one empty rich-text block per scene. Creation is template-aware and row/canonical identity is checked before committed or draft mutation.

The empty-leaf chooser is inline, native-radio based, explicit-confirmation only, cancel-safe, and invalidates only the Narrative query. Generated IPC bindings were exported through the Rust authority. No new command, dependency, backup format, custom template, conversion, or Visual Worlds capability was added. Schema 9/10 restore compatibility remains covered by its focused tests.

Remaining non-blocking debt: manual screen-reader and physical alternate-DPI evidence.
