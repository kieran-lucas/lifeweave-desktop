export const visualWorlds = [
  { id: "paper", name: "Paper", description: "Quiet editorial surfaces with warm neutral depth.", light: ["#FAF8F4", "#FFFFFF", "#2E2924"], dark: ["#1E1C1A", "#262321", "#F4EFE8"] },
  { id: "sakura", name: "Sakura", description: "Soft rose surfaces inspired by petals and stationery.", light: ["#FFF7FA", "#FFFFFF", "#3B2430"], dark: ["#21171C", "#2B1D24", "#FFEAF2"] },
  { id: "aurora", name: "Aurora", description: "Cool cyan and violet light with restrained luminosity.", light: ["#F4FBFF", "#FFFFFF", "#17323A"], dark: ["#101B22", "#16252E", "#EAF8FC"] },
  { id: "nocturne", name: "Nocturne", description: "Deep indigo atmosphere with subtle celestial contrast.", light: ["#F7F5FF", "#FFFFFF", "#28233E"], dark: ["#11121F", "#191B2C", "#F1F0FF"] },
] as const;
export type NarrativeVisualWorldId = typeof visualWorlds[number]["id"];
export const defaultVisualWorldId: NarrativeVisualWorldId = "paper";
export function isNarrativeVisualWorldId(value: unknown): value is NarrativeVisualWorldId {
  return visualWorlds.some(world => world.id === value);
}
