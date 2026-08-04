# Task 28: Narrative Visual Worlds

Initial implementation candidate: 6134d602ca8099640d8c01f67c32b6a53fec4091. The acceptance-remediation commit is the Task 28 checkpoint. Database schema remains 15 and Narrative schemaVersion remains 1.

The canonical optional visualWorldId accepts Paper, Sakura, Aurora, and Nocturne; absence remains Paper until a real write normalizes it. Seeds and Markdown import explicitly use Paper. Reader and Studio apply a local static CSS scope, and Studio uses native radios plus existing materialized structural history for undoable changes. No migration, dependency, new IPC, global appearance setting, template coupling, asset, layout, or motion behavior was added.

Manual screen-reader and physical alternate-DPI evidence remain external debt.

The remediation completed the type-safe semantic local token contract (canvas, surfaces, text, muted, heading, accent, border, rule, shadow, patterns) with all four approved light/dark palettes and static forced-colors system mappings. The Canvas scope maps only local Narrative aliases and keeps the global focus/status authorities intact. The Studio selector now renders native radios with descriptions and aria-hidden three-color chips rather than printed hexadecimal values.

Evidence: TypeScript check passed; catalog contrast test passed; focused legacy/strict Rust validation passed; serial Rust suite passed 402 tests with one designated isolated performance test ignored. Full release performance, current NSIS, RC dogfood, and physical screen-reader/DPI evidence remain pending.
