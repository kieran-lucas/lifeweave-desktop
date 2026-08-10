import { assignVars, createThemeContract, style } from "@vanilla-extract/css";
import { visualWorlds, type NarrativeWorldPalette } from "./visualWorlds";
import { text } from "../../../design-system/visual/typography.css";

export const worldTokens = createThemeContract({ canvas: null, surface: null, surfaceRaised: null, text: null, muted: null, heading: null, accent: null, accentSoft: null, border: null, rule: null, shadow: null, patternA: null, patternB: null, patternOpacity: null });
const vars = (palette: NarrativeWorldPalette) => ({ ...assignVars(worldTokens, palette), "--surface": worldTokens.surface, "--app-background": worldTokens.canvas, "--text-primary": worldTokens.text, "--text-muted": worldTokens.muted, "--active-background": worldTokens.accentSoft, "--border-subtle": worldTokens.border, "--world-rule": worldTokens.rule, "--world-shadow": worldTokens.shadow } as Record<string, string>);
export const world = style({});

/**
 * Narrative worlds are painted editorial sheets. Pattern color behaves like pigment and dry-brush
 * variation on an opaque page; no world relies on transparency/backdrop blur for its identity.
 */
const worldStyle = (light: NarrativeWorldPalette, dark: NarrativeWorldPalette) => style({
  vars: vars(light) as any,
  position: "relative",
  border: `1px solid ${worldTokens.border}`,
  borderRadius: "var(--radius-surface)",
  padding: 24,
  color: worldTokens.text,
  backgroundColor: worldTokens.canvas,
  backgroundImage: `
    repeating-linear-gradient(92deg, transparent 0 13px, color-mix(in srgb, ${worldTokens.text} 2%, transparent) 13px 14px, transparent 14px 29px),
    radial-gradient(720px 360px at 92% -6%, color-mix(in srgb, ${worldTokens.patternA} 22%, transparent), transparent 66%),
    radial-gradient(580px 320px at -8% 104%, color-mix(in srgb, ${worldTokens.patternB} 18%, transparent), transparent 69%)
  `,
  boxShadow: "var(--glow-hero)",
  "@media": {
    "(prefers-color-scheme: dark)": { vars: vars(dark) },
    "(forced-colors: active)": {
      vars: { ...vars({ ...light, canvas: "Canvas", surface: "Canvas", surfaceRaised: "Canvas", text: "CanvasText", muted: "CanvasText", heading: "CanvasText", accent: "CanvasText", accentSoft: "Canvas", border: "CanvasText", rule: "CanvasText", shadow: "none", patternA: "Canvas", patternB: "Canvas", patternOpacity: "0" }) },
      background: "Canvas",
      backgroundImage: "none",
      color: "CanvasText",
      boxShadow: "none",
    },
  },
});

export const paper = worldStyle(visualWorlds[0].light, visualWorlds[0].dark);
export const sakura = worldStyle(visualWorlds[1].light, visualWorlds[1].dark);
export const aurora = worldStyle(visualWorlds[2].light, visualWorlds[2].dark);
export const nocturne = worldStyle(visualWorlds[3].light, visualWorlds[3].dark);

export const selector = style({ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", padding: 4, margin: "6px 0 10px", backgroundColor: "var(--paint-board)", backgroundImage: "var(--paint-grain-fine)", boxShadow: "var(--glow-compact)", overflow: "hidden", "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "repeat(2,minmax(0,1fr))" } } });
export const option = style({
  display: "grid", gridTemplateColumns: "auto 1fr", alignContent: "start", gap: "5px 7px", minWidth: 0, padding: "10px 11px", border: "1px solid transparent", borderRadius: "var(--radius-small)", background: "transparent", ...text.metadata,
  selectors: {
    "&:has(input:checked)": { borderColor: "var(--paint-edge-strong)", boxShadow: "var(--glow-selected)", backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine)" },
    "&:focus-within": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
});
export const chips = style({ display: "flex", gap: 4, gridColumn: "2" });
export const chip = style({
  width: 14, height: 14, borderRadius: "var(--radius-full)", border: "1px solid color-mix(in srgb, var(--text-primary) 12%, transparent)",
  selectors: {
    '&[data-world="paper"][data-chip="canvas"]': { background: "#FAF8F4" }, '&[data-world="paper"][data-chip="accent"]': { background: "#6B5B4B" }, '&[data-world="paper"][data-chip="rule"]': { background: "#9A8977" },
    '&[data-world="sakura"][data-chip="canvas"]': { background: "#FFF7FA" }, '&[data-world="sakura"][data-chip="accent"]': { background: "#A63D68" }, '&[data-world="sakura"][data-chip="rule"]': { background: "#C56B8F" },
    '&[data-world="aurora"][data-chip="canvas"]': { background: "#F4FBFF" }, '&[data-world="aurora"][data-chip="accent"]': { background: "#0F738A" }, '&[data-world="aurora"][data-chip="rule"]': { background: "#2D7F91" },
    '&[data-world="nocturne"][data-chip="canvas"]': { background: "#F7F5FF" }, '&[data-world="nocturne"][data-chip="accent"]': { background: "#5746A6" }, '&[data-world="nocturne"][data-chip="rule"]': { background: "#7A68BD" },
  },
  "@media": { "(forced-colors: active)": { background: "ButtonText", border: "1px solid Canvas" } },
});
