import { assignVars, createThemeContract, style } from "@vanilla-extract/css";
import { visualWorlds, type NarrativeWorldPalette } from "./visualWorlds";
import { text } from "../../../design-system/visual/typography.css";

export const worldTokens = createThemeContract({ canvas: null, surface: null, surfaceRaised: null, text: null, muted: null, heading: null, accent: null, accentSoft: null, border: null, rule: null, shadow: null, patternA: null, patternB: null, patternOpacity: null });

const vars = (palette: NarrativeWorldPalette) => ({
  ...assignVars(worldTokens, palette),
  "--surface": worldTokens.surface,
  "--app-background": worldTokens.canvas,
  "--text-primary": worldTokens.text,
  "--text-muted": worldTokens.muted,
  "--active-background": worldTokens.accentSoft,
  "--border-subtle": worldTokens.border,
  "--world-rule": worldTokens.rule,
  "--world-shadow": worldTokens.shadow,
} as Record<string, string>);

export const world = style({});

/** Narrative world names remain selectable; all render through the single Light palette. */
const worldStyle = (palette: NarrativeWorldPalette) => style({
  vars: vars(palette) as any,
  position: "relative",
  border: `1px solid ${worldTokens.border}`,
  borderRadius: "var(--radius-surface)",
  padding: 24,
  color: worldTokens.text,
  backgroundColor: worldTokens.canvas,
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  "@media": {
    "(forced-colors: active)": {
      vars: { ...vars({ ...palette, canvas: "Canvas", surface: "Canvas", surfaceRaised: "Canvas", text: "CanvasText", muted: "CanvasText", heading: "CanvasText", accent: "CanvasText", accentSoft: "Canvas", border: "CanvasText", rule: "CanvasText", shadow: "none", patternA: "Canvas", patternB: "Canvas", patternOpacity: "0" }) },
      background: "Canvas",
      backgroundImage: "none",
      color: "CanvasText",
      boxShadow: "none",
    },
  },
});

export const paper = worldStyle(visualWorlds[0].palette);
export const sakura = worldStyle(visualWorlds[1].palette);
export const aurora = worldStyle(visualWorlds[2].palette);
export const nocturne = worldStyle(visualWorlds[3].palette);

export const selector = style({
  display: "grid",
  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
  gap: 4,
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-control)",
  padding: 4,
  margin: "6px 0 10px",
  backgroundColor: "var(--surface-raised)",
  backgroundImage: "var(--paint-grain-fine)",
  boxShadow: "none",
  overflow: "hidden",
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "repeat(2,minmax(0,1fr))" } },
});

export const option = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignContent: "start",
  gap: "5px 7px",
  minWidth: 0,
  padding: "10px 11px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-small)",
  background: "transparent",
  ...text.metadata,
  selectors: {
    "&:has(input:checked)": { borderColor: "var(--text-primary)", boxShadow: "inset 3px 0 0 var(--text-primary)", backgroundColor: "var(--surface-selected)" },
    "&:focus-within": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
});

export const chips = style({ display: "flex", gap: 4, gridColumn: "2" });
export const chip = style({
  width: 14,
  height: 14,
  borderRadius: "var(--radius-full)",
  border: "1px solid var(--border-strong)",
  background: "var(--surface-raised)",
  selectors: {
    '&[data-chip="accent"]': { background: "var(--text-primary)", borderColor: "var(--text-primary)" },
    '&[data-chip="rule"]': { background: "var(--text-muted)", borderColor: "var(--text-muted)" },
  },
  "@media": { "(forced-colors: active)": { background: "ButtonText", border: "1px solid Canvas" } },
});
