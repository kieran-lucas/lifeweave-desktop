import { describe, expect, it } from "vitest";
import { visualWorlds } from "./visualWorlds";

function luminance(hex: string) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
}
function contrast(a: string, b: string) { const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a); return (x! + .05) / (y! + .05); }
describe("visual worlds", () => {
  it("has the exact complete catalog with accessible text contrast", () => {
    expect(visualWorlds.map(w => w.id)).toEqual(["paper", "sakura", "aurora", "nocturne"]);
    for (const world of visualWorlds) for (const palette of [world.light, world.dark]) {
      expect(Object.values(palette).every(Boolean)).toBe(true);
      expect(contrast(palette.text, palette.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.text, palette.canvas)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.muted, palette.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.accent, palette.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(palette.rule, palette.surface)).toBeGreaterThanOrEqual(3);
    }
  });
});
