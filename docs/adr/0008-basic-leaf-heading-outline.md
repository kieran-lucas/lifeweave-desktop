# ADR 0008 — Basic Leaf Heading Outline Architecture

**Status:** Accepted (Task 19, 2026-08-03)

## Context

Task 17 (Expansion Decision) evaluated Outline as a candidate feature. The evaluation held Outline as "HOLD / NOT_NOW" — it was not selected for activation as a standalone expansion feature. However, the Basic Leaf document reader lacks in-document navigation for long documents with multiple headings.

Task 19 activates a bounded Outline projection scoped strictly to the Basic Leaf Reader: an ephemeral heading navigator derived on-the-fly from the committed canonical JSON document.

## Decision

**Outline is activated only as a bounded Basic Leaf Reader heading projection.**

Key design choices:
- **Ephemeral**: The outline is derived from committed canonical JSON on every render. It is never persisted anywhere — not in SQLite, not in IPC state, not in local storage.
- **Top-level only**: Only `heading` nodes at the root of `document.content` are included. Headings inside blockquotes, callouts, or other containers are ignored.
- **Positional IDs**: Heading IDs are `leaf-heading-{sourceIndex}` where `sourceIndex` is the 0-based index of the node in `document.content`. IDs are never text-derived.
- **Native semantics**: `<nav>/<ol>/<li>/<button>` elements. No `role="tree"`, no `dangerouslySetInnerHTML`.
- **256-entry cap**: The outline shows at most 256 entries; a truncation note appears when the document has more than 256 top-level headings.
- **Reader-only**: The outline is hidden in Editor mode. It appears only on the static Reader render path.
- **No new dependencies**: Uses `useReducedMotion` from the existing `motion` package. No new npm packages.

## Rationale

- **No feature creep**: This activation does not make Outline a first-class Life tree concept, a navigation destination, a Studio feature, a Noteboard, or a Graph node. It is strictly an in-document navigation aid.
- **Derived read model**: Like the Global Search index (ADR 0007), the outline is a derived read model. Unlike search, it is not persisted — it is computed on render.
- **Accessibility**: Keyboard-navigable list of heading anchors with `scrollIntoView` + `focus` semantics satisfies WCAG 2.4.1 (Bypass Blocks) and supports screen reader navigation.
- **Container queries**: `containerType: "inline-size"` gives a responsive two-column layout without needing viewport media queries. This is the correct approach for embedded components.

## Rejected Alternatives

**Text-derived IDs** (e.g., slugifying heading text): Fragile under duplicate headings, whitespace changes, special characters, and internationalization. Positional IDs are more stable and simpler.

**Persistent heading index**: Storing heading anchors in SQLite would require a migration, IPC changes, and sync logic. The ephemeral derived approach has identical user-visible behavior with zero persistence cost.

**`role="tree"` semantics**: The ARIA tree pattern is complex and poorly supported across AT combinations. A simple ordered list of buttons is semantically correct and universally supported.

## Consequences

- Heading IDs shift if paragraphs are inserted before headings. This is accepted behavior for a positional navigation aid (not a bookmarking system).
- The outline column is sticky in wide layout without its own scrollbar. Long outlines (up to 256 entries) scroll with the page. This is intentional.
- The outline does not activate Generic Outline, Life tree duplication, Studio, Noteboard or Graph. Those remain unevaluated or deferred per the expansion decision matrix.
