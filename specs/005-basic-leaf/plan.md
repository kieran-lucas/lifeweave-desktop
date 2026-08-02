# Slice 005 implementation plan

1. Add immutable schema 9 for documents, revisions, drafts, operations and assets.
2. Validate whitelisted Core JSON and local assets in Rust through the DB worker.
3. Add typed commands/DTOs/exact ACL, static Reader and lazy focused editor.
4. Add safe Markdown import/export and asset-aware backup/restore.
5. Verify deterministic tests, security, release build and sentinel native relaunch.
