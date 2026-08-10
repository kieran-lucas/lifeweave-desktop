export type NarrativeWorldPalette = {
  canvas: string; surface: string; surfaceRaised: string; text: string; muted: string; heading: string;
  accent: string; accentSoft: string; border: string; rule: string; shadow: string;
  patternA: string; patternB: string; patternOpacity: string;
};

const palette = (rule: string): NarrativeWorldPalette => ({
  canvas: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  text: "#111111",
  muted: "#666666",
  heading: "#111111",
  accent: "#111111",
  accentSoft: "#F2F2F2",
  border: "#D8D8D8",
  rule,
  shadow: "none",
  patternA: "#111111",
  patternB: "#777777",
  patternOpacity: "0.03",
});

/**
 * Narrative worlds keep semantic identities but share the application's single Light palette.
 * Their differentiation is typographic/compositional only; no alternate color-scheme data exists.
 */
export const visualWorlds = [
  { id: "paper", name: "Paper", description: "Quiet editorial spacing with restrained rules.", palette: palette("#777777") },
  { id: "sakura", name: "Sakura", description: "Airier editorial rhythm with fine monochrome rules.", palette: palette("#555555") },
  { id: "aurora", name: "Aurora", description: "Sharper technical rhythm in pure monochrome.", palette: palette("#333333") },
  { id: "nocturne", name: "Nocturne", description: "High-contrast editorial rhythm without hue.", palette: palette("#111111") },
] as const;

export type NarrativeVisualWorldId = typeof visualWorlds[number]["id"];
export const defaultVisualWorldId: NarrativeVisualWorldId = "paper";
export function isNarrativeVisualWorldId(value: unknown): value is NarrativeVisualWorldId { return visualWorlds.some(world => world.id === value); }
