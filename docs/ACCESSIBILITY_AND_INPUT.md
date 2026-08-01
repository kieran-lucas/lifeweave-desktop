# Accessibility and Input

Target: WCAG 2.2 AA for core flows.

## General

- native semantic elements first;
- accessible names for icon-only controls;
- visible focus;
- deterministic focus restoration;
- no information conveyed only by color;
- screen-reader text for time, category, completion, errors;
- text scaling and Windows DPI support;
- keyboard parity for dialogs, calendar, time wheel, radial fan, tree edit, command palette;
- pointer targets remain usable regardless of visual probability emphasis.

## Radial fan keyboard model

Prototype/implement one stable model:
- Enter/Space opens;
- arrows follow logical option order/geometry;
- Enter/Space selects;
- Escape closes;
- focus returns to trigger;
- short instructions, no announcement spam;
- accessible compact alternative may exist without replacing the visual fan.

## Time wheel

- Tab between fields/columns;
- arrows increment one unit;
- Page Up/Down optional acceleration;
- Home/End valid bounds;
- unavailable values skipped and announced;
- save validates again in Rust.

## Calendar

Use a complete grid pattern only if keyboard behavior is implemented correctly:
- arrows navigate;
- Home/End within week;
- Page Up/Down month;
- selection and activation are distinct where needed;
- focus is restored on return.

## Tree edit

- keyboard drag/reparent parity;
- valid parent/drop zones announced;
- invalid target not communicated by red alone;
- preview geometry decorative to screen readers;
- post-drop focus and scroll anchor preserved.

## Reduced Motion

- honor Windows/system preference;
- app may reduce further, never force more motion than system;
- replace large transforms/parallax/loops with fade/color/static state;
- do not set all duration to zero if that creates disorienting jumps;
- test normal and reduced paths.

## Manual checks

Automation does not replace:
- Narrator/other screen reader spot checks;
- keyboard-only task creation/evaluation;
- high contrast/light/dark review;
- multi-DPI;
- motion comfort;
- long text and Vietnamese glyph rendering.
