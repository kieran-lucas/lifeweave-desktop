export type NarrativeWorldPalette = {
  canvas: string; surface: string; surfaceRaised: string; text: string; muted: string; heading: string;
  accent: string; accentSoft: string; border: string; rule: string; shadow: string;
  patternA: string; patternB: string; patternOpacity: string;
};

const light = (rule: string): NarrativeWorldPalette => ({
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

const dark = (rule: string): NarrativeWorldPalette => ({
  canvas: "#0A0A0A",
  surface: "#101010",
  surfaceRaised: "#101010",
  text: "#FAFAFA",
  muted: "#A3A3A3",
  heading: "#FAFAFA",
  accent: "#FAFAFA",
  accentSoft: "#1C1C1C",
  border: "#303030",
  rule,
  shadow: "none",
  patternA: "#FAFAFA",
  patternB: "#9A9A9A",
  patternOpacity: "0",
});

/**
 * Narrative worlds keep their semantic identities and names, but not separate color themes.
 * Their differentiation is typographic/compositional only so entering Narrative never breaks the
 * application's strict black/white material language.
 */
export const visualWorlds = [
  { id: "paper", name: "Paper", description: "Quiet editorial spacing with restrained rules.", light: light("#777777"), dark: dark("#A3A3A3") },
  { id: "sakura", name: "Sakura", description: "Airier editorial rhythm with fine monochrome rules.", light: light("#555555"), dark: dark("#B8B8B8") },
  { id: "aurora", name: "Aurora", description: "Sharper technical rhythm in pure monochrome.", light: light("#333333"), dark: dark("#D0D0D0") },
  { id: "nocturne", name: "Nocturne", description: "High-contrast editorial rhythm without hue.", light: light("#111111"), dark: dark("#FAFAFA") },
] as const;

export type NarrativeVisualWorldId = typeof visualWorlds[number]["id"];
export const defaultVisualWorldId: NarrativeVisualWorldId = "paper";
export function isNarrativeVisualWorldId(value: unknown): value is NarrativeVisualWorldId { return visualWorlds.some(world => world.id === value); }
