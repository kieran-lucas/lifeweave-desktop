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
});

/**
 * A value is accepted because it is a recognised colour, length, transform or local
 * reference — never because it failed to look dangerous. These cases are the ones a denial
 * list gets wrong: the same functional reference written with a CSS escape, split by a
 * comment, quoted, or cased differently is a different string every time and the same
 * request every time.
 */
describe("the diagram boundary accepts known-safe values rather than unrecognised ones", () => {
  it.each([
    // An escaped identifier: CSS reads `u\72l(` as `url(`, so a denial list never sees it.
    [String.raw`u\72l(https://example.com/x.svg)`],
    // A comment splitting the identifier, which CSS discards before tokenizing.
    ["u/**/rl(https://example.com/x.svg)"],
    [`url("https://example.com/x.svg")`],
    ["url('https://example.com/x.svg')"],
    ["URL(https://example.com/x.svg)"],
    ["url(//example.com/x.svg)"],
    ["url(#a) url(#b)"],
    ["url(#a"],
    ["\\75 rl(https://example.com/x.svg)"],
  ])("refuses the paint value %s", value => {
    const result = ok(wrap(`<rect x="1" fill="${value.replace(/"/g, "&quot;")}"/>`));
    expect(attrsOf(result.root, "rect")).toEqual({ x: "1" });
    expect(JSON.stringify(result.root)).not.toContain("example.com");
  });

  it("keeps a local fragment reference, which is the one functional form a diagram needs", () => {
    const result = ok(wrap(`<rect x="1" fill="url(#safe-local-id)" clip-path="url(#safe-local-id)"/>`));
    expect(attrsOf(result.root, "rect")).toEqual({
      x: "1", fill: "url(#safe-local-id)", "clip-path": "url(#safe-local-id)",
    });
  });

  it.each(["#eee", "#AABBCCDD", "none", "currentColor", "rgb(1, 2, 3)", "rgba(1,2,3,0.5)", "hsl(120, 50%, 50%)", "steelblue", "transparent"])(
    "keeps the colour %s", value => {
      const result = ok(wrap(`<rect fill="${value}"/>`));
      expect(attrsOf(result.root, "rect")).toEqual({ fill: value });
    },
  );

  it.each(["#eeeee", "notacolour", "rgb(1,2)", "rgb(1,2,3,4,5)", "rgb(url(#x))", "green;stroke:red", "var(--x)", "#e/*x*/ee"])(
    "refuses the colour %s", value => {
      const result = ok(wrap(`<rect x="1" fill="${value}"/>`));
      expect(attrsOf(result.root, "rect")).toEqual({ x: "1" });
    },
  );

  it.each(["none", "url(#m)"])("keeps %s as a marker, clip path and mask", value => {
    const result = ok(wrap(`<path d="M0 0" marker-start="${value}" marker-mid="${value}" marker-end="${value}" clip-path="${value}" mask="${value}"/>`));
    const path = attrsOf(result.root, "path") ?? {};
    expect(path["marker-end"]).toBe(value);
    expect(path.mask).toBe(value);
  });

  it.each(["url(https://example.com/m.svg#m)", "currentColor", "#fff", "inherit url(#m)"])(
    "refuses %s where only a local reference or none is meaningful", value => {
      const result = ok(wrap(`<path d="M0 0" marker-end="${value}" clip-path="${value}" mask="${value}"/>`));
      expect(attrsOf(result.root, "path")).toEqual({ d: "M0 0" });
    },
  );

  it("bounds an opacity to the fraction it is meant to be", () => {
    expect(attrsOf(ok(wrap(`<rect opacity="0.25" fill-opacity="50%"/>`)).root, "rect"))
      .toEqual({ opacity: "0.25", "fill-opacity": "50%" });
    for (const value of ["5", "-1", "NaN", "Infinity", "1e400", "0.5px", "120%"]) {
      const result = ok(wrap(`<rect x="1" opacity="${value}"/>`));
      expect(attrsOf(result.root, "rect"), value).toEqual({ x: "1" });
    }
  });

  it("bounds a dimension to a finite number with a unit it knows", () => {
    expect(attrsOf(ok(wrap(`<rect stroke-width="2px" width="10" height="2.5em"/>`)).root, "rect"))
      .toEqual({ "stroke-width": "2px", width: "10", height: "2.5em" });
    for (const value of ["1e9", "-1e9", "2fr", "calc(1px + 2px)", "10 px", "Infinity", "expression(1)"]) {
      const result = ok(wrap(`<rect x="1" stroke-width="${value}"/>`));
      expect(attrsOf(result.root, "rect"), value).toEqual({ x: "1" });
    }
  });

  it.each([
    "translate(8, 8)",
    "translate(8)",
    "scale(2, 3) rotate(45)",
    "rotate(45, 1, 2)",
    "skewX(10) skewY(-10)",
    "matrix(1, 0, 0, 1, 5, 5)",
  ])("keeps the transform %s", value => {
    const result = ok(wrap(`<g transform="${value}"><rect x="1"/></g>`));
    expect(attrsOf(result.root, "g")).toEqual({ transform: value });
  });

  it.each([
    "translate(1, 2, 3)",
    "skewX(1, 2)",
    "matrix(1, 2, 3)",
    "unknown(1)",
    "translate(url(#x))",
    "translate(1px, 2px)",
    "translate(1, 2) junk",
    "translate(1e400, 0)",
  ])("refuses the transform %s", value => {
    const result = ok(wrap(`<g class="node" transform="${value}"><rect x="1"/></g>`));
    expect(attrsOf(result.root, "g")).toEqual({ className: "node" });
  });

  it("never carries a font family across, so the document owns its own typography", () => {
    const result = ok(wrap(`<text x="1" font-family="Segoe UI" style="font-family:Segoe UI;fill:#333"><tspan>a</tspan></text>`));
    const text = attrsOf(result.root, "text");
    expect(text).toEqual({ x: "1" });
    expect(JSON.stringify(result.root)).not.toContain("Segoe");
  });

  it("checks a style declaration by the same grammar as the attribute of that name", () => {
    const result = ok(wrap(`<rect style="fill:url(#m);stroke:u\\72l(https://example.com/x.svg);stroke-width:2px;opacity:9"/>`));
    const rect = result.root.kind === "element" ? result.root.children[0] : undefined;
    expect(rect?.kind === "element" ? rect.style : {}).toEqual({ fill: "url(#m)", strokeWidth: "2px" });
  });

  it("refuses a value carrying a CSS escape or comment whatever property it is on", () => {
    const result = ok(wrap(`<rect x="1" d="M0\\30 0" class="a\\2f b" id="i/*x*/d"/>`));
    expect(attrsOf(result.root, "rect")).toEqual({ x: "1" });
  });

  it("keeps only the exact namespace name on the root, not any other absolute value", () => {
    const swapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/2000/svg"><rect x="1"/></svg>`;
    expect(attrsOf(ok(swapped).root, "svg")?.xmlns).toBe("http://www.w3.org/2000/svg");
  });

  it("checks the enumerated attributes against their own vocabularies", () => {
    const good = ok(wrap(`<defs><marker orient="auto" markerUnits="strokeWidth" refX="5"><path d="M0 0"/></marker><linearGradient gradientUnits="userSpaceOnUse" spreadMethod="pad"><stop offset="0.5" stop-color="#fff" stop-opacity="1"/></linearGradient></defs>`));
    expect(attrsOf(good.root, "marker")).toEqual({ orient: "auto", markerUnits: "strokeWidth", refX: "5" });
    expect(attrsOf(good.root, "stop")).toEqual({ offset: "0.5", "stop-color": "#fff", "stop-opacity": "1" });

    const bad = ok(wrap(`<defs><marker orient="sideways" markerUnits="whatever"><path d="M0 0"/></marker></defs>`));
    expect(attrsOf(bad.root, "marker")).toEqual({});
  });
});

describe("the diagram boundary rebuilds the structure it does allow", () => {
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

/**
 * Every hard bound refuses rather than truncates. A half-walked tree still renders, and a
 * picture drawn from half of what its author wrote says something they did not write; the
 * Reader shows the authored source instead, which is the outcome the contract promises.
 */
describe("the diagram boundary fails closed at every hard bound", () => {
  const refused = (result: ReturnType<typeof sanitizeSvg>) => {
    expect(result.ok).toBe(false);
    return result.ok ? "" : result.reason;
  };

  it("refuses a diagram larger than the byte bound", () => {
    const huge = wrap(`<rect x="1"/>`.repeat(50_000));
    expect(huge.length).toBeGreaterThan(DEFAULT_LIMITS.maxBytes);
    expect(refused(sanitizeSvg(huge))).toContain("too large");
  });

  it("refuses a diagram with more nodes than the node bound", () => {
    const many = wrap(`<rect x="1"/>`.repeat(300));
    expect(refused(sanitizeSvg(many, { ...DEFAULT_LIMITS, maxNodes: 10 }))).toContain("too many parts");
    // The same diagram is drawn in full when it fits, so the bound is a bound and not a rule.
    expect(tags(ok(many).root)).toHaveLength(301);
  });

  it("refuses a diagram nested deeper than the depth bound", () => {
    const deep = wrap("<g>".repeat(200) + "<rect x='1'/>" + "</g>".repeat(200));
    expect(refused(sanitizeSvg(deep))).toContain("nested too deeply");
    const shallow = wrap("<g>".repeat(4) + "<rect x='1'/>" + "</g>".repeat(4));
    expect(ok(shallow).root.kind).toBe("element");
  });

  it("refuses an element carrying more attributes than the attribute bound", () => {
    const attributes = Array.from({ length: 200 }, (_, index) => `data-x${index}="1"`).join(" ");
    expect(refused(sanitizeSvg(wrap(`<rect x="1" ${attributes}/>`)))).toContain("attributes");
    // Counted before the allowlist, so padding with names that would be dropped anyway is
    // not a way to make the walk expensive.
    expect(refused(sanitizeSvg(wrap(`<rect x="1" y="2" fill="none"/>`), { ...DEFAULT_LIMITS, maxAttributes: 2 })))
      .toContain("attributes");
    expect(ok(wrap(`<rect x="1" y="2" fill="none"/>`)).root.kind).toBe("element");
  });

  it("refuses the whole diagram, never a partial one, when a bound is exceeded deep inside", () => {
    const nested = wrap(`<g><g><rect x="1"/>${`<rect x="2"/>`.repeat(50)}</g></g>`);
    const result = sanitizeSvg(nested, { ...DEFAULT_LIMITS, maxNodes: 12 });
    expect(result.ok).toBe(false);
    expect("root" in result).toBe(false);
  });
});
