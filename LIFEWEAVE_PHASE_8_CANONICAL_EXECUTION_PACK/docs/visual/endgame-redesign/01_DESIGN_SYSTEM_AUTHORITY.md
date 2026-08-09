# 01 — Design System Authority

This file contains global visual rules that every stage may reference. It intentionally does not repeat screen-specific composition.

## Brand

- Mark: simple blue infinity symbol rendered through the centralized icon/asset pipeline.
- No lightning, glow, avatar, fake profile, decorative badge, or unrelated shell furniture.
- Lifeweave identity comes from blue + geometry + typography + spatial/product semantics, not decoration.

## Color

Use the current typed Light contract as the base:
- cool near-white canvas/planes;
- strong readable neutral text;
- saturated blue accent;
- blue completion semantics;
- red/destructive only when semantic;
- restrained warning role;
- hairline structural borders.

Do not reintroduce the superseded warm v1 palette globally.

Narrative Visual Worlds are an intentional authored-content exception; see `06_APPROVED_EXCEPTIONS.md`.

## Typography

### Productive register
Segoe UI Variable optical families.
Use for operational UI, navigation, controls, tables, inspectors, data, form chrome, task rows, Calendar, Analytics, Plans, Settings, Search, graph controls.

### Editorial register
Literata.
Use for authored Basic Reader and Narrative content and explicitly specified expressive knowledge identity.

### Role law
Use semantic roles such as:
- productive page/object/section/card title;
- body/bodyStrong/compact/row;
- label/metadata/caption/eyebrow;
- metric/numeric;
- editorial document title/H1/H2/H3/body/caption;
- control button/tab/navigation/field;
- code inline/block.

Do not choose raw feature-local sizes when a role exists.
Do not map HTML heading tags directly to editorial styling.

## Spacing

Keep the existing finite scale:
`4, 8, 12, 16, 24, 32, 48, 64`.

Interpret relationships rather than mechanically applying identical gaps:
- 4: tight internal pairing;
- 8: compact control/metadata relation;
- 12: related row/control structure;
- 16: field/body grouping;
- 24: group separation;
- 32: section separation;
- 48–64: major page rhythm.

Calm density is the target. Empty space must communicate hierarchy, not imitate a marketing landing page.

## Radius

Keep the current coherent scale:
- small 6;
- control 10;
- surface 14;
- floating 18;
- full 999.

Do not invent many near-identical radii.

## Surface/depth

Persistent content:
- opaque/near-opaque;
- low chroma;
- separated first by space, alignment, tone and hairline;
- no decorative blur or oversized shadow.

Floating/transient:
- menus, popovers, modals, detached drag layers may use the floating material grammar.

Conceptual stack:
`canvas → workspace → bounded content → selected → inspector → popover/menu → modal → drag/transient`.

## Borders and shadows

Hairlines are structural punctuation.
Avoid nested border boxes.
Do not combine selected fill + strong border + shadow unless a real state hierarchy requires it.
Keep elevation sparse: none for normal content, soft floating, stronger modal.

## Buttons

Canonical families:
- primary;
- secondary;
- ghost;
- destructive;
- icon;
- compact.

Do not recreate ordinary button padding/font/focus/disabled recipes in feature CSS when shared authority fits.
Destructive actions remain visually semantic rather than aggressively decorative.

## Fields

Shared field grammar should cover input/select/textarea/number/file-trigger where appropriate:
- label;
- control;
- help/description;
- error;
- disabled;
- focus.

Preserve native semantics. Do not turn TimeWheel into a fictional wheel picker; it is two native select controls for hour/minute.

## Tabs and selection

Low-chrome tabs.
Active state should be legible through more than color when required by context.
Selection is not focus.
List selection should not require a card shadow.

## Focus

Default visual grammar:
- clearly visible 2px focus ring;
- 2px offset where geometry allows;
- inset only when clipping requires it;
- forced colors use platform-highlight behavior.

A thicker local ring requires documented perceptual reason.

## States

Every primitive/surface must distinguish applicable:
- default;
- hover;
- active;
- focus-visible;
- selected/current;
- disabled;
- pending/loading;
- empty;
- error;
- success/status;
- destructive;
- drag/transient.

Use text/shape/position/semantics, not color alone.

## Motion

Use the existing state-first motion authority. Motion explains continuity and state; it never gates mutation.

Preserve current timing vocabulary approximately:
- press ~70ms;
- state ~100ms;
- check/popover ~140ms;
- inspector ~170–200ms;
- reorder/route ~220ms;
- traversal ~260ms.

No universal route theatrics.
Reduced Motion removes travel and preserves useful tonal/state feedback.

## Geometry

Preserve a finite page taxonomy only:
- standard;
- wide;
- reading (768).

Do not add page-local max-width variants.
The collapsed sidebar does not automatically justify a new width class.
Narrative Studio may graduate to an existing shared frame only if a populated stress fixture proves the reading frame cannot compose cleanly; fix composition first.

## Tables

Tables remain tables when the information is relational.
Use native semantics, strong column alignment, restrained rules, local horizontal scrolling where necessary.
Do not convert dense factual tables into card grids.

## Inspectors

Inspector is contextual secondary detail, not a dashboard panel.
It should feel attached to the selected object/workspace through alignment and depth, with local scrolling only when needed.

## Accessibility

Pragmatic high-quality floor:
- semantic HTML first;
- keyboard parity;
- deterministic focus restoration;
- visible focus;
- no color-only critical state;
- modal focus containment;
- Reduced Motion;
- forced-colors compatibility;
- Vietnamese typography remains valid.

Accessibility requirements must not be used as a pretext for visually clumsy duplication when a simpler accessible composition exists.

## Anti-generic rules

Do not add:
- fake KPI cards just to fill space;
- gradient hero banners;
- translucent persistent glass panels;
- decorative pills for every metadata field;
- multi-color dashboard confetti;
- invented assistant/profile/meeting widgets;
- arbitrary visual-world theming outside authored Narrative content.
