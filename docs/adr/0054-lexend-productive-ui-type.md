# ADR 0054 — Lexend for Productive UI

- Status: Accepted by Product Owner request on 2026-09-25
- Decision owner: Product Owner
- Source lines: immutable source §23.3, lines 3912–3923; Decision Registry typography entry; ADR 0045 Override 6

## Context

The Product Owner requested a change to Lexend. ADR 0045 Override 6 had selected Be Vietnam Pro
for productive application chrome while retaining Literata for authored Reader/editor content. The
font replacement is an explicit later presentation decision; the editorial distinction remains.

## Decision

- Use self-hosted Lexend Variable for navigation, controls, Task rows, metadata, operational titles,
  and display numerals. The existing UI type roles and sizes remain the styling authority.
- Bundle only the Latin and Vietnamese normal variable WOFF2 subsets. Their 100–900 weight range
  covers the existing UI weights. Keep Segoe UI and system sans-serif as local fallbacks.
- Keep Literata for authored Reader/editor content and the existing monospace stack for code.
- Remove the Be Vietnam Pro dependency and its font assets from the production bundle.

## Alternatives

- Keep Be Vietnam Pro: conflicts with the new Product Owner direction.
- Load Lexend from Google Fonts: violates the offline, local-first font requirement.
- Replace Literata too: broadens a UI font request into authored content and changes the established
  long-form reading contract without an explicit editorial decision.

## Consequences

The selected Lexend assets total 53,520 bytes before compression (39,680 Latin + 13,840 Vietnamese).
This replaces eight Be Vietnam Pro assets previously recorded at 135,592 bytes in ADR 0045. The
Fontsource package is OFL-1.1 licensed and adds no runtime JavaScript or network dependency. A
variable font changes glyph widths, so dense controls, Vietnamese diacritics, and Windows DPI
layouts need visual review.

### Data/migration

No schema, persistent data, import/export, IPC, or migration change.

### Security/accessibility/performance

Font files are local. The two subset declarations retain Vietnamese glyph coverage and use
`font-display: swap`. Existing fallback, keyboard, focus, contrast, and reduced-motion behavior
remain in force. Bundle size and production build are checked with the normal project gates.

## Rollback

Restore the Be Vietnam Pro package and font-face declarations, then revert the productive family
alias and the Decision Registry entry. No data rollback is required.

## Acceptance

The production build emits Lexend Latin and Vietnamese assets, productive UI resolves to Lexend,
authored Reader/editor content resolves to Literata, and governance and build checks pass.
