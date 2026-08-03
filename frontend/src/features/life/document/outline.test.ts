import { describe, expect, it } from "vitest";
import { buildDocumentOutline, extractHeadingText, headingIdForSourceIndex, MAX_OUTLINE_ENTRIES } from "./outline";
import type { BasicLeafNode } from "./schema";

function makeDoc(content: BasicLeafNode[]): BasicLeafNode {
  return { type: "doc", content };
}

function heading(level: number, text: string): BasicLeafNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function para(text: string): BasicLeafNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("headingIdForSourceIndex", () => {
  it("produces positional IDs", () => {
    expect(headingIdForSourceIndex(0)).toBe("leaf-heading-0");
    expect(headingIdForSourceIndex(5)).toBe("leaf-heading-5");
    expect(headingIdForSourceIndex(255)).toBe("leaf-heading-255");
  });
});

describe("extractHeadingText", () => {
  it("concatenates text nodes", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hello " }, { type: "text", text: "World" }] };
    expect(extractHeadingText(node)).toBe("Hello World");
  });

  it("normalizes hardBreak to space", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Line" }, { type: "hardBreak" }, { type: "text", text: "Two" }] };
    expect(extractHeadingText(node)).toBe("Line Two");
  });

  it("collapses whitespace", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "  lots   of   space  " }] };
    expect(extractHeadingText(node)).toBe("lots of space");
  });

  it("strips marks but retains text content (bold)", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Bold text", marks: [{ type: "bold" }] }] };
    expect(extractHeadingText(node)).toBe("Bold text");
  });

  it("strips marks but retains text content (italic)", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Italic", marks: [{ type: "italic" }] }] };
    expect(extractHeadingText(node)).toBe("Italic");
  });

  it("strips marks but retains text content (link)", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Click here", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] };
    expect(extractHeadingText(node)).toBe("Click here");
  });

  it("returns Untitled section for empty heading", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [] };
    expect(extractHeadingText(node)).toBe("Untitled section");
  });

  it("returns Untitled section for whitespace-only heading", () => {
    const node: BasicLeafNode = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "   " }] };
    expect(extractHeadingText(node)).toBe("Untitled section");
  });
});

describe("buildDocumentOutline", () => {
  it("returns empty result for doc with no headings", () => {
    const result = buildDocumentOutline(makeDoc([para("Hello")]));
    expect(result.entries).toHaveLength(0);
    expect(result.totalHeadingCount).toBe(0);
    expect(result.truncated).toBe(false);
  });

  it("returns one entry for one heading (still shows data even if UI hides it)", () => {
    const result = buildDocumentOutline(makeDoc([heading(2, "Only heading")]));
    expect(result.entries).toHaveLength(1);
    expect(result.totalHeadingCount).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it("returns two entries for two headings", () => {
    const result = buildDocumentOutline(makeDoc([heading(2, "First"), heading(2, "Second")]));
    expect(result.entries).toHaveLength(2);
    expect(result.totalHeadingCount).toBe(2);
    expect(result.truncated).toBe(false);
  });

  it("preserves h1 level", () => {
    const result = buildDocumentOutline(makeDoc([heading(1, "Top"), heading(2, "Sub")]));
    expect(result.entries[0]!.level).toBe(1);
  });

  it("preserves h2 level", () => {
    const result = buildDocumentOutline(makeDoc([heading(2, "Sub"), heading(3, "Sub-sub")]));
    expect(result.entries[0]!.level).toBe(2);
  });

  it("preserves h3 level", () => {
    const result = buildDocumentOutline(makeDoc([heading(2, "Sub"), heading(3, "Sub-sub")]));
    expect(result.entries[1]!.level).toBe(3);
  });

  it("normalizes level 4+ to 2", () => {
    const result = buildDocumentOutline(makeDoc([heading(4, "Deep"), heading(5, "Deeper"), heading(6, "Deepest")]));
    for (const entry of result.entries) {
      expect(entry.level).toBe(2);
    }
  });

  it("uses positional IDs that match headingIdForSourceIndex", () => {
    const result = buildDocumentOutline(makeDoc([para("intro"), heading(2, "First"), heading(2, "Second")]));
    // First heading is at sourceIndex 1, second at sourceIndex 2
    expect(result.entries[0]!.id).toBe(headingIdForSourceIndex(1));
    expect(result.entries[0]!.sourceIndex).toBe(1);
    expect(result.entries[1]!.id).toBe(headingIdForSourceIndex(2));
    expect(result.entries[1]!.sourceIndex).toBe(2);
  });

  it("duplicate heading labels get different IDs (structural)", () => {
    const result = buildDocumentOutline(makeDoc([heading(2, "Same"), heading(2, "Same")]));
    expect(result.entries[0]!.label).toBe("Same");
    expect(result.entries[1]!.label).toBe("Same");
    expect(result.entries[0]!.id).not.toBe(result.entries[1]!.id);
  });

  it("empty heading produces Untitled section label", () => {
    const result = buildDocumentOutline(makeDoc([heading(2, ""), heading(2, "Real")]));
    expect(result.entries[0]!.label).toBe("Untitled section");
  });

  it("only processes top-level headings; headings inside blockquote are ignored", () => {
    const blockquoteWithHeading: BasicLeafNode = {
      type: "blockquote",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Nested heading" }] }],
    };
    const result = buildDocumentOutline(makeDoc([heading(2, "Top level"), blockquoteWithHeading]));
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.label).toBe("Top level");
    expect(result.totalHeadingCount).toBe(1);
  });

  it("caps at 256 entries with 300 headings; sets truncated=true and totalHeadingCount=300", () => {
    const nodes: BasicLeafNode[] = Array.from({ length: 300 }, (_, i) => heading(2, `Heading ${i}`));
    const result = buildDocumentOutline(makeDoc(nodes));
    expect(result.entries).toHaveLength(MAX_OUTLINE_ENTRIES);
    expect(result.totalHeadingCount).toBe(300);
    expect(result.truncated).toBe(true);
  });

  it("does not truncate at exactly 256 headings", () => {
    const nodes: BasicLeafNode[] = Array.from({ length: 256 }, (_, i) => heading(2, `Heading ${i}`));
    const result = buildDocumentOutline(makeDoc(nodes));
    expect(result.entries).toHaveLength(256);
    expect(result.totalHeadingCount).toBe(256);
    expect(result.truncated).toBe(false);
  });

  it("sourceIndex is the original top-level array index (not just heading index)", () => {
    const nodes: BasicLeafNode[] = [
      para("intro"),
      heading(2, "A"),
      para("text"),
      heading(2, "B"),
    ];
    const result = buildDocumentOutline(makeDoc(nodes));
    expect(result.entries[0]!.sourceIndex).toBe(1);
    expect(result.entries[1]!.sourceIndex).toBe(3);
  });

  it("10k-node linear fixture: O(n) performance — 300 headings among 10000 nodes", () => {
    const nodes: BasicLeafNode[] = [];
    for (let i = 0; i < 10000; i++) {
      if (i % 33 === 0 && nodes.filter(n => n.type === "heading").length < 300) {
        nodes.push(heading(2, `Section ${i}`));
      } else {
        nodes.push(para(`Content paragraph ${i}`));
      }
    }
    const t0 = performance.now();
    const result = buildDocumentOutline(makeDoc(nodes));
    const elapsed = performance.now() - t0;
    console.log(`buildDocumentOutline 10k nodes: ${elapsed.toFixed(2)}ms`);
    expect(result.entries).toHaveLength(MAX_OUTLINE_ENTRIES);
    expect(result.truncated).toBe(true);
    // No strict timing assertion (hardware-dependent), but algorithm must complete
    expect(elapsed).toBeLessThan(5000);
  });
});
