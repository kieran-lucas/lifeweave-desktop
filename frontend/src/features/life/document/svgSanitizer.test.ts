import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, sanitizeSvg } from "./svgSanitizer";
import type { SafeSvgNode } from "./svgSanitizer";

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${inner}</svg>`;

function tags(node: SafeSvgNode, found: string[] = []): string[] {
  if (node.kind === "text") return found;
  found.push(node.tag);
  node.children.forEach(child => tags(child, found));
  return found;
}

function attrsOf(node: SafeSvgNode, tag: string): Record<string, string> | undefined {
  if (node.kind === "text") return undefined;
  if (node.tag === tag) return node.attrs;
  for (const child of node.children) {
    const found = attrsOf(child, tag);
    if (found) return found;
  }
  return undefined;
}

function ok(svg: string) {
  const result = sanitizeSvg(svg);
  expect(result.ok, `expected sanitizable: ${"reason" in result ? result.reason : ""}`).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  return result;
}

describe("the diagram boundary rebuilds only what it explicitly allows", () => {
  it("keeps the geometry a diagram is made of", () => {
    const result = ok(wrap(`<g class="node"><rect x="1" y="2" width="3" height="4"/><path d="M0 0L1 1"/><text x="1" y="2"><tspan>label</tspan></text></g>`));
    expect(tags(result.root)).toEqual(["svg", "g", "rect", "path", "text", "tspan"]);
    expect(attrsOf(result.root, "rect")).toEqual({ x: "1", y: "2", width: "3", height: "4" });
  });

  it("drops a script element and everything in it", () => {
    const result = ok(wrap(`<script>alert(1)</script><rect x="1"/>`));
    expect(tags(result.root)).toEqual(["svg", "rect"]);
    expect(JSON.stringify(result.root)).not.toContain("alert");
    expect(result.dropped).toContain("script");
  });

  it("drops a style element rather than trusting a stylesheet", () => {
    const result = ok(wrap(`<style>rect{fill:red}</style><rect x="1"/>`));
    expect(tags(result.root)).not.toContain("style");
    expect(JSON.stringify(result.root)).not.toContain("fill:red");
  });

  it.each(["foreignObject", "iframe", "object", "embed", "image", "a", "animate", "set", "use", "handler"])(
    "drops the %s element", tag => {
      const result = ok(wrap(`<${tag}></${tag}><rect x="1"/>`));
      expect(tags(result.root)).toEqual(["svg", "rect"]);
    },
  );

  it("drops every event-handler attribute", () => {
    const result = ok(wrap(`<rect x="1" onclick="alert(1)" onload="alert(2)" onmouseover="alert(3)"/>`));
    expect(attrsOf(result.root, "rect")).toEqual({ x: "1" });
    expect(JSON.stringify(result.root)).not.toContain("alert");
  });

  it("drops href in every namespace, so a diagram is never a link", () => {
    const result = ok(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect x="1" href="javascript:alert(1)" xlink:href="https://example.com/x.png"/></svg>`,
    );
    expect(attrsOf(result.root, "rect")).toEqual({ x: "1" });
  });

  it.each([
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    ["vbscript:x"],
    ["data:text/html,alert"],
    ["url(https://example.com/x.png)"],
    ["expression(alert(1))"],
  ])("refuses the attribute value %s", value => {
    const result = ok(wrap(`<rect x="1" fill="${value.replace(/"/g, "&quot;")}"/>`));
    expect(attrsOf(result.root, "rect")).toEqual({ x: "1" });
  });

  it("keeps a reference that points inside the same diagram", () => {
    const result = ok(wrap(`<defs><marker id="m"><path d="M0 0"/></marker></defs><line x1="0" y1="0" x2="1" y2="1" marker-end="url(#m)" fill="url(#m)"/>`));
    const line = attrsOf(result.root, "line");
    expect(line?.["marker-end"]).toBe("url(#m)");
    expect(line?.fill).toBe("url(#m)");
  });

  it("keeps only safe declarations from a style attribute, as CSSOM properties", () => {
    const result = ok(wrap(`<rect style="fill:#eee;stroke-width:2;background:url(https://example.com/x.png);behavior:url(#x)"/>`));
    const rect = result.root.kind === "element" ? result.root.children[0] : undefined;
    expect(rect?.kind === "element" ? rect.style : {}).toEqual({ fill: "#eee", strokeWidth: "2" });
  });

  it("does not carry a style attribute through as an attribute", () => {
    // An inline style attribute would be refused by `style-src 'self'`; the properties are
    // handed to React instead, which writes them through the CSSOM.
    const result = ok(wrap(`<rect style="fill:#eee"/>`));
    expect(attrsOf(result.root, "rect")).toEqual({});
  });

  it("ignores a namespace prefix used to disguise a name", () => {
    const result = ok(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/2000/svg"><x:script>alert(1)</x:script><rect x="1"/></svg>`);
    expect(JSON.stringify(result.root)).not.toContain("alert");
  });

  it("refuses output that is not an image at all", () => {
    expect(sanitizeSvg(`<html><body>hi</body></html>`).ok).toBe(false);
    expect(sanitizeSvg(`<svg><unclosed>`).ok).toBe(false);
    expect(sanitizeSvg("").ok).toBe(false);
  });

  it("refuses a diagram larger than the byte bound", () => {
    const huge = wrap(`<rect x="1"/>`.repeat(50_000));
    const result = sanitizeSvg(huge);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("too large");
  });

  it("stops at the node bound rather than walking a hostile tree", () => {
    const many = wrap(`<rect x="1"/>`.repeat(300));
    const result = ok(many);
    expect(tags(result.root).length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxNodes + 1);
    const bounded = sanitizeSvg(many, { ...DEFAULT_LIMITS, maxNodes: 10 });
    expect(bounded.ok && tags(bounded.root).length).toBeLessThanOrEqual(11);
  });

  it("stops at the depth bound rather than recursing without end", () => {
    const deep = wrap("<g>".repeat(200) + "<rect x='1'/>" + "</g>".repeat(200));
    const result = sanitizeSvg(deep);
    // Either the parse is refused or the walk stops; neither may overflow the stack.
    if (result.ok) expect(tags(result.root).length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxDepth + 2);
  });

  it("caps how many attributes one element can carry", () => {
    const attributes = Array.from({ length: 200 }, (_, index) => `data-x${index}="1"`).join(" ");
    const result = ok(wrap(`<rect x="1" ${attributes}/>`));
    expect(Object.keys(attrsOf(result.root, "rect") ?? {}).length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxAttributes);
  });

  it("keeps the text of a label but never its markup", () => {
    const result = ok(wrap(`<text><tspan>&lt;script&gt;alert(1)&lt;/script&gt;</tspan></text>`));
    // The label reads as the characters the author typed, and there is no element for them.
    expect(JSON.stringify(result.root)).toContain("script");
    expect(tags(result.root)).toEqual(["svg", "text", "tspan"]);
  });

  it("writes case-sensitive SVG attribute names back with their real spelling", () => {
    // The parser reports names lower-cased, but SVG is case-sensitive: `viewbox` is not
    // `viewBox` and a renderer ignores it, which silently rescales or hides the picture.
    const result = ok(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="xMidYMid meet"><defs><marker refX="5" refY="2" markerWidth="6" markerHeight="4" markerUnits="strokeWidth"><path d="M0 0"/></marker></defs></svg>`);
    const root = result.root.kind === "element" ? result.root.attrs : {};
    expect(root.viewBox).toBe("0 0 10 10");
    expect(root.preserveAspectRatio).toBe("xMidYMid meet");
    expect(Object.keys(root)).not.toContain("viewbox");

    const marker = attrsOf(result.root, "marker") ?? {};
    expect(marker).toMatchObject({ refX: "5", refY: "2", markerWidth: "6", markerHeight: "4", markerUnits: "strokeWidth" });
  });

  it("hands a class through as the property React actually applies", () => {
    const result = ok(wrap(`<g class="node"><rect x="1"/></g>`));
    expect(attrsOf(result.root, "g")).toEqual({ className: "node" });
  });
});
