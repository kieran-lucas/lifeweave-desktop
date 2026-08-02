# ADR 0005 — Basic Leaf canonical document

- Status: Accepted for Core
- Date: 2026-08-02
- Decision owner: Product Owner
- Scope: Task 15 / Slice 005 only

## Context

Basic Leaf needs structural fidelity for tables, callouts, safe links, images, revision validation and later schema migration. Plain Markdown cannot preserve all of those contracts as canonical authority without lossy conventions and has no inherent schema/revision envelope.

## Decision

The Core canonical model is a versioned `BasicLeafDocument` wrapper whose content is compile-time-whitelisted ProseMirror/Tiptap JSON. SQLite stores the schema version, document revision, deterministic JSON and extracted plain text. Markdown is a human-readable interoperability format through dedicated import/export adapters, never the source of truth.

The Core registry contains only paragraph/text, headings 1–3, bold/italic, lists, blockquote/callout, inert code block, hard break, safe link, stable-ID local image, and bounded simple table. It contains no scene, template, world, motion, executable HTML, MDX or arbitrary styling field.

## Consequences

- Static Read mode can render validated JSON without instantiating Tiptap.
- Focused Edit lazy-loads the editor and its whitelisted extensions.
- Optimistic revisions and bounded committed history are explicit.
- Markdown round trips the supported Core subset semantically; unsupported or executable input fails before commit.
- A future separately approved Narrative Canvas migration may wrap or transform this document, but Task 15 does not activate or pre-build that expansion.

## Rejected alternative

Plain Markdown canonical storage was rejected because it cannot reliably retain table/callout/asset identity and schema migration semantics while preserving deterministic revision authority.
