import { assignVars, createThemeContract, style } from "@vanilla-extract/css";
import { visualWorlds, type NarrativeWorldPalette } from "./visualWorlds";

export const worldTokens = createThemeContract({ canvas: null, surface: null, surfaceRaised: null, text: null, muted: null, heading: null, accent: null, accentSoft: null, border: null, rule: null, shadow: null, patternA: null, patternB: null, patternOpacity: null });
const vars = (palette: NarrativeWorldPalette) => ({ ...assignVars(worldTokens, palette), "--surface": worldTokens.surface, "--app-background": worldTokens.canvas, "--text-primary": worldTokens.text, "--text-muted": worldTokens.muted, "--active-background": worldTokens.accentSoft, "--border-subtle": worldTokens.border, "--world-rule": worldTokens.rule, "--world-shadow": worldTokens.shadow } as Record<string, string>);
export const world = style({});
const worldStyle = (light: NarrativeWorldPalette, dark: NarrativeWorldPalette) => style({
  vars: vars(light) as any, borderRadius: "var(--radius-surface)", padding: 20, color: worldTokens.text, background: `linear-gradient(135deg, ${worldTokens.patternA}, transparent 42%), linear-gradient(315deg, ${worldTokens.patternB}, transparent 45%), ${worldTokens.canvas}`,
  "@media": { "(prefers-color-scheme: dark)": { vars: vars(dark) }, "(forced-colors: active)": { vars: { ...vars({ ...light, canvas:"Canvas", surface:"Canvas", surfaceRaised:"Canvas", text:"CanvasText", muted:"CanvasText", heading:"CanvasText", accent:"CanvasText", accentSoft:"Canvas", border:"CanvasText", rule:"CanvasText", shadow:"none", patternA:"Canvas", patternB:"Canvas", patternOpacity:"0" }) }, background: "Canvas", color: "CanvasText", boxShadow: "none" } },
});
export const paper = worldStyle(visualWorlds[0].light, visualWorlds[0].dark);
export const sakura = worldStyle(visualWorlds[1].light, visualWorlds[1].dark);
export const aurora = worldStyle(visualWorlds[2].light, visualWorlds[2].dark);
export const nocturne = worldStyle(visualWorlds[3].light, visualWorlds[3].dark);
export const selector = style({ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(13rem,1fr))", gap:8, border:0, padding:0, margin:"12px 0" });
export const option = style({ display:"grid", gridTemplateColumns:"auto 1fr", gap:8, padding:10, border:"1px solid var(--border-subtle)", borderRadius:"var(--radius-control)", background:"var(--surface)", selectors:{ "&:has(input:checked)": { borderColor: worldTokens.accent, background: worldTokens.accentSoft, fontWeight: 700 } } });
export const chips = style({ display:"flex", gap:3, gridColumn:"2" });
export const chip = style({
  width: 14,
  height: 14,
  borderRadius: "var(--radius-full)",
  selectors: {
    '&[data-world="paper"][data-chip="canvas"]': { background: "#FAF8F4" },
    '&[data-world="paper"][data-chip="accent"]': { background: "#6B5B4B" },
    '&[data-world="paper"][data-chip="rule"]': { background: "#9A8977" },
    '&[data-world="sakura"][data-chip="canvas"]': { background: "#FFF7FA" },
    '&[data-world="sakura"][data-chip="accent"]': { background: "#A63D68" },
    '&[data-world="sakura"][data-chip="rule"]': { background: "#C56B8F" },
    '&[data-world="aurora"][data-chip="canvas"]': { background: "#F4FBFF" },
    '&[data-world="aurora"][data-chip="accent"]': { background: "#0F738A" },
    '&[data-world="aurora"][data-chip="rule"]': { background: "#2D7F91" },
    '&[data-world="nocturne"][data-chip="canvas"]': { background: "#F7F5FF" },
    '&[data-world="nocturne"][data-chip="accent"]': { background: "#5746A6" },
    '&[data-world="nocturne"][data-chip="rule"]': { background: "#7A68BD" },
  },
  "@media": {
    "(forced-colors: active)": {
      background: "ButtonText",
      border: "1px solid Canvas",
    },
  },
});
