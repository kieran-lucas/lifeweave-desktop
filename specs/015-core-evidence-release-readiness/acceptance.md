# Acceptance

- ordinary tests contain no wall-clock failure;
- release evidence preserves the 50 ms p95 target;
- preview is read-only and reports unavailable local assets;
- Confirm rejects a post-preview asset disappearance transactionally;
- tabs implement roving focus, arrows, Home/End, valid relationships, and preserve island content;
- schema 14, dependencies, migrations and IPC remain unchanged.
- restore validates asset authority by the backup's original schema: empty before 9, Basic Leaf joins for 9–10, and Basic Leaf plus Narrative joins from 11 onward.
