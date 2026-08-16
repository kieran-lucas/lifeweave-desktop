/**
 * The security boundary between a diagram engine's output and this document.
 *
 * Mermaid's output is generated markup, and generated markup is untrusted markup: the whole
 * of it is derived from text an author pasted in. It is therefore never inserted — it is
 * parsed into an inert document, and a new tree is built from only the elements, attributes
 * and values named here. Anything not named is dropped, so a construct this file has never
 * heard of cannot reach the page by default.
 *
 * The engine's own `securityLevel` is not relied on. It is a second lock on the same door,
 * not the door.
 */

/** A structural node the Reader may render. Deliberately not a DOM node and not markup. */
export type SafeSvgNode =
  | { kind: "element"; tag: string; attrs: Record<string, string>; style: Record<string, string>; children: SafeSvgNode[] }
  | { kind: "text"; text: string };

export type SanitizeLimits = {
  maxBytes: number;
  maxNodes: number;
  maxDepth: number;
  maxAttributes: number;
};

export const DEFAULT_LIMITS: SanitizeLimits = {
  maxBytes: 512 * 1024,
  maxNodes: 4000,
  maxDepth: 64,
  maxAttributes: 40,
};

export type SanitizeResult =
  | { ok: true; root: SafeSvgNode; dropped: string[] }
  | { ok: false; reason: string };

/**
 * Elements that describe geometry and nothing else.
 *
 * `foreignObject` is absent on purpose: it reopens arbitrary HTML inside the picture, which
 * is the one thing this boundary exists to prevent. `image` is absent because a diagram has
 * no reason to load a file. `a` is absent because a diagram is not a navigation surface.
 * `script`, `style`, `animate` and friends are absent because they act rather than describe.
 */
const ALLOWED_TAGS = new Set([
  "svg", "g", "defs", "title", "desc",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan",
  "marker", "clipPath", "mask", "pattern",
  "linearGradient", "radialGradient", "stop",
]);

/** Attributes that place, size or colour a shape. Lower case: matching lower-cases first. */
const ALLOWED_ATTRIBUTES = new Set([
  "id", "class", "transform", "viewbox", "preserveaspectratio", "xmlns",
  "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "width", "height", "points", "dx", "dy",
  "fill", "fill-opacity", "fill-rule",
  "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
  "opacity", "visibility",
  "font-size", "font-family", "font-weight", "font-style", "letter-spacing",
  "text-anchor", "dominant-baseline", "alignment-baseline", "white-space",
  "marker-start", "marker-mid", "marker-end", "clip-path", "mask",
  "refx", "refy", "markerwidth", "markerheight", "orient", "markerunits",
  "offset", "stop-color", "stop-opacity", "gradientunits", "gradienttransform",
  "spreadmethod", "patternunits", "clippathunits", "maskunits",
]);

/**
 * The spelling an allowed attribute must be written back with.
 *
 * SVG attribute names are case-sensitive even though the parser reports them lower-cased:
 * `viewbox` is not `viewBox` and a renderer ignores it, which silently scales or hides the
 * whole picture. Matching is done in lower case; emitting uses the name from here.
 */
const CANONICAL_CASE = new Map(Object.entries({
  viewbox: "viewBox",
  preserveaspectratio: "preserveAspectRatio",
  refx: "refX",
  refy: "refY",
  markerwidth: "markerWidth",
  markerheight: "markerHeight",
  markerunits: "markerUnits",
  gradientunits: "gradientUnits",
  gradienttransform: "gradientTransform",
  spreadmethod: "spreadMethod",
  patternunits: "patternUnits",
  clippathunits: "clipPathUnits",
  maskunits: "maskUnits",
  // React owns this one; passing `class` through leaves the element unstyled.
  class: "className",
}));

/** Style properties that may be carried across from a `style` attribute. */
const ALLOWED_STYLE_PROPERTIES = new Set([
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray",
  "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-family", "font-weight",
  "font-style", "letter-spacing", "text-anchor", "dominant-baseline", "visibility",
]);

/** Only a reference to something defined inside this same diagram. */
const LOCAL_REFERENCE = /^url\(['"]?#[A-Za-z0-9_.:-]+['"]?\)$/;
const DANGEROUS_VALUE = /javascript:|vbscript:|data:|expression\s*\(|<|@import|behavior\s*:|url\s*\(/i;

/** Whether an attribute or style value is safe to carry across verbatim. */
function safeValue(value: string): boolean {
  if (value.length > 4096) return false;
  // A functional reference is allowed only when it points inside this diagram; every other
  // `url(` — and every scheme that can execute or fetch — is refused outright.
  if (LOCAL_REFERENCE.test(value.trim())) return true;
  return !DANGEROUS_VALUE.test(value);
}

function sanitizeStyle(raw: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const declaration of raw.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!ALLOWED_STYLE_PROPERTIES.has(property) || !safeValue(value)) continue;
    // React writes these through the CSSOM, which the content security policy allows;
    // an inline style *attribute* would be refused by `style-src 'self'`.
    const camel = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    style[camel] = value;
  }
  return style;
}

/**
 * Rebuild `svg` as a structural tree containing only what is explicitly allowed.
 *
 * Returns a reason instead of a tree when the input is too large or too deep to be worth
 * walking: a bound that is refused is a diagram that falls back to its source, which is a
 * better outcome than a Reader that stops responding.
 */
export function sanitizeSvg(svg: string, limits: SanitizeLimits = DEFAULT_LIMITS): SanitizeResult {
  if (svg.length > limits.maxBytes) return { ok: false, reason: "diagram is too large to display" };

  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.getElementsByTagName("parsererror").length > 0) {
    return { ok: false, reason: "diagram output could not be read" };
  }
  const root = parsed.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    return { ok: false, reason: "diagram output was not an image" };
  }

  const dropped: string[] = [];
  let nodes = 0;

  const walk = (element: Element, depth: number): SafeSvgNode | null => {
    if (depth > limits.maxDepth) { dropped.push("depth"); return null; }
    if ((nodes += 1) > limits.maxNodes) { dropped.push("nodes"); return null; }

    // `localName` is already lower-cased by the parser and, unlike `tagName`, ignores any
    // namespace prefix an attacker could put in front of a name to disguise it.
    const tag = element.localName;
    if (!ALLOWED_TAGS.has(tag)) { dropped.push(tag); return null; }

    const attrs: Record<string, string> = {};
    let style: Record<string, string> = {};
    const attributes = Array.from(element.attributes).slice(0, limits.maxAttributes);
    for (const attribute of attributes) {
      const name = attribute.localName.toLowerCase();
      if (name === "style") { style = sanitizeStyle(attribute.value); continue; }
      // Every event handler, every `href` in any namespace, and anything not named in the
      // allowlist is dropped rather than inspected.
      if (!ALLOWED_ATTRIBUTES.has(name) || !safeValue(attribute.value)) {
        dropped.push(`${tag}@${name}`);
        continue;
      }
      attrs[CANONICAL_CASE.get(name) ?? name] = attribute.value;
    }

    const children: SafeSvgNode[] = [];
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) {
        const text = child.nodeValue ?? "";
        if (text.trim().length > 0) children.push({ kind: "text", text });
        continue;
      }
      if (child.nodeType !== 1) continue;
      const safe = walk(child as Element, depth + 1);
      if (safe) children.push(safe);
    }
    return { kind: "element", tag, attrs, style, children };
  };

  const safe = walk(root, 0);
  if (!safe) return { ok: false, reason: "diagram could not be shown safely" };
  return { ok: true, root: safe, dropped };
}
