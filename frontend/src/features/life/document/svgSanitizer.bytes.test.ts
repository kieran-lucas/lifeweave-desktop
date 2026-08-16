import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, sanitizeSvg } from "./svgSanitizer";

const wrap = (text: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text x="1" y="5">${text}</text></svg>`;

describe("the Mermaid SVG size bound is measured in UTF-8 bytes", () => {
  it("refuses multibyte output once its encoded size crosses maxBytes", () => {
    const unicodeSvg = wrap("中".repeat(20));
    const asciiSvg = wrap("a".repeat(20));
    const encoder = new TextEncoder();

    const unicodeBytes = encoder.encode(unicodeSvg).byteLength;
    const unicodeCodeUnits = unicodeSvg.length;
    expect(unicodeBytes).toBeGreaterThan(unicodeCodeUnits);

    const limit = Math.floor((unicodeBytes + unicodeCodeUnits) / 2);
    expect(encoder.encode(asciiSvg).byteLength).toBeLessThanOrEqual(limit);

    const unicodeResult = sanitizeSvg(unicodeSvg, { ...DEFAULT_LIMITS, maxBytes: limit });
    expect(unicodeResult.ok).toBe(false);
    expect(unicodeResult.ok ? "" : unicodeResult.reason).toContain("too large");

    expect(sanitizeSvg(asciiSvg, { ...DEFAULT_LIMITS, maxBytes: limit }).ok).toBe(true);
  });
});
