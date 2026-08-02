import { describe, expect, it } from "vitest";
import { EMPTY_DOCUMENT, parseDocument, safeLink } from "./schema";
import { normalizeMarkdown } from "./markdown";

describe("Basic Leaf adapters", () => {
  it("parses the versioned Core root", () => expect(parseDocument(JSON.stringify(EMPTY_DOCUMENT)).type).toBe("doc"));
  it("rejects a non-document root", () => expect(() => parseDocument('{"type":"scene"}')).toThrow(/root/));
  it("permits only safe external link schemes", () => { expect(safeLink("https://example.com")).toBeTruthy(); expect(safeLink("mailto:a@example.com")).toBeTruthy(); expect(safeLink("javascript:alert(1)")).toBeUndefined(); });
  it("normalizes GFM tables and lists", async () => { const value = await normalizeMarkdown("| A | B |\n| - | - |\n| 1 | 2 |\n\n* item"); expect(value).toContain("| A"); expect(value).toContain("- item"); });
  it("keeps code fenced and inert", async () => expect(await normalizeMarkdown("```js\nalert(1)\n```\n")).toContain("```js"));
  it("rejects embedded HTML and MDX imports", async () => { await expect(normalizeMarkdown("<script>x</script>")).rejects.toThrow(/not supported/); await expect(normalizeMarkdown('export x from "y"')).rejects.toThrow(/not supported/); });
});
