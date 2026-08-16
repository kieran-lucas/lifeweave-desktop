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

/* -------------------------------------------------------------------------------------- *
 * Values are judged by what they are, not by what they are not.
 *
 * A denial list of dangerous spellings is a losing position: CSS lets an identifier be
 * written with escapes (`u\72l(…)`), split by a comment (`u/**\/rl(…)`) or quoted, so the
 * same functional reference has unbounded spellings while the list has finitely many. Every
 * value below is therefore matched against the grammar of the property it belongs to — a
 * colour, a length, a bounded number, a transform, a reference to this diagram's own defs —
 * and anything that is not recognised is dropped. An attack that has not been invented yet
 * still has to be a well-formed colour to get through.
 * -------------------------------------------------------------------------------------- */

const MAX_VALUE_LENGTH = 4096;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_MAGNITUDE = 1e6;
const MAX_LIST_ITEMS = 2048;
const MAX_TRANSFORMS = 16;

/**
 * The only characters any allowed value may contain.
 *
 * This is what makes the grammars below sufficient rather than merely typical. A backslash
 * is how CSS writes an escape, and an asterisk is half of how it opens a comment; neither
 * appears in a colour, a length, a path or a transform, so both are refused here and the
 * grammars never have to reason about a value that means something other than it reads.
 * Semicolons, braces, angle brackets, quotes and `@` are refused for the same reason.
 */
const VALUE_CHARSET = /^[A-Za-z0-9_.,:%#()+\-/ \t\r\n]+$/;

/** The XML namespace name, which a parser compares as a string and never dereferences. */
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type Validator = (value: string) => boolean;

const NUMBER_PATTERN = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
const NUMBER = new RegExp(`^${NUMBER_PATTERN}$`);
const LENGTH = new RegExp(`^(${NUMBER_PATTERN})(?:px|pt|pc|mm|cm|in|em|rem|ex|ch|%)?$`);
const ANGLE = new RegExp(`^${NUMBER_PATTERN}(?:deg|grad|rad|turn)?$`);
/** Every command letter SVG defines for path data, and the characters its numbers use. */
const PATH_DATA = /^[MmZzLlHhVvCcSsQqTtAa0-9eE.,+\-\s]+$/;
const HEX_COLOUR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const COLOUR_FUNCTION = /^(?:rgb|rgba|hsl|hsla)\(([^()]*)\)$/;
const COLOUR_COMPONENT = new RegExp(`^${NUMBER_PATTERN}(?:%|deg)?$`);
const IDENTIFIER = /^[A-Za-z0-9_][A-Za-z0-9_.:-]*$/;
const CLASS_LIST = /^[A-Za-z0-9_ .:-]+$/;
/** A reference to something defined inside this same diagram, and nothing else. */
const LOCAL_REFERENCE = /^url\(\s*#[A-Za-z0-9_][A-Za-z0-9_.:-]*\s*\)$/;

/** A number is only a number if it is finite and small enough to be a coordinate. */
function withinMagnitude(text: string): boolean {
  const parsed = Number(text);
  return Number.isFinite(parsed) && Math.abs(parsed) <= MAX_MAGNITUDE;
}

function isNumber(value: string): boolean {
  return NUMBER.test(value) && withinMagnitude(value);
}

/** A finite number carrying at most one unit from the set a diagram actually needs. */
function isLength(value: string): boolean {
  const match = LENGTH.exec(value);
  return match !== null && withinMagnitude(match[1] ?? "");
}

function parts(value: string): string[] {
  return value.split(/[\s,]+/).filter(part => part.length > 0);
}

function isList(check: Validator, value: string, exactly?: number): boolean {
  const items = parts(value);
  if (items.length === 0 || items.length > MAX_LIST_ITEMS) return false;
  if (exactly !== undefined && items.length !== exactly) return false;
  return items.every(check);
}

function bounded(low: number, high: number): Validator {
  return value => isNumber(value) && Number(value) >= low && Number(value) <= high;
}

/** A fraction of full strength, written either as a number or as a percentage. */
function isOpacity(value: string): boolean {
  if (value.endsWith("%")) {
    const magnitude = value.slice(0, -1);
    return isNumber(magnitude) && Number(magnitude) >= 0 && Number(magnitude) <= 100;
  }
  return bounded(0, 1)(value);
}

function keywords(...names: string[]): Validator {
  const allowed = new Set(names);
  // SVG enumerations are case-sensitive (`strokeWidth`), CSS keywords are not (`NONE`).
  return value => allowed.has(value) || allowed.has(value.toLowerCase());
}

/**
 * The colour names a diagram theme reaches for, spelled out rather than pattern-matched.
 *
 * A pattern would accept any bare word, and a bare word is exactly what an obfuscated
 * function name looks like once its punctuation has been escaped away.
 */
const NAMED_COLOURS = new Set([
  "black", "silver", "gray", "grey", "white", "maroon", "red", "purple", "fuchsia", "magenta",
  "green", "lime", "olive", "yellow", "navy", "blue", "teal", "aqua", "cyan", "orange",
  "pink", "brown", "beige", "gold", "indigo", "violet", "tan", "salmon", "coral", "crimson",
  "khaki", "lavender", "plum", "turquoise", "azure", "ivory", "linen", "snow", "wheat",
  "darkgray", "darkgrey", "darkblue", "darkgreen", "darkred", "darkorange", "darkviolet",
  "lightgray", "lightgrey", "lightblue", "lightgreen", "lightyellow", "lightpink",
  "whitesmoke", "gainsboro", "dimgray", "dimgrey", "slategray", "slategrey", "steelblue",
  "skyblue", "seagreen", "forestgreen", "royalblue", "midnightblue", "firebrick", "chocolate",
  "goldenrod", "hotpink", "orchid", "peru", "sienna", "thistle", "tomato",
]);

function isColourFunction(value: string): boolean {
  const match = COLOUR_FUNCTION.exec(value.toLowerCase());
  if (match === null) return false;
  // Both the comma form and the space-and-slash form, with no nested function possible:
  // the grammar above cannot match a value containing another parenthesis.
  const components = (match[1] ?? "").split(/[\s,/]+/).filter(part => part.length > 0);
  if (components.length < 3 || components.length > 4) return false;
  return components.every(component => COLOUR_COMPONENT.test(component) && withinMagnitude(component.replace(/%|deg/g, "")));
}

/** A colour, `none`, or the colour the surrounding page already decided on. */
function isColour(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower === "none" || lower === "transparent" || lower === "currentcolor" || lower === "inherit") return true;
  if (NAMED_COLOURS.has(lower)) return true;
  if (HEX_COLOUR.test(lower)) return true;
  return isColourFunction(lower);
}

/** Paint may additionally name a gradient or pattern defined inside this same diagram. */
function isPaint(value: string): boolean {
  return LOCAL_REFERENCE.test(value) || isColour(value);
}

/** Markers, clip paths and masks may only ever point inside this diagram. */
function isLocalReferenceOrNone(value: string): boolean {
  return value.toLowerCase() === "none" || value.toLowerCase() === "inherit" || LOCAL_REFERENCE.test(value);
}

const TRANSFORM_ARITY = new Map(Object.entries({
  translate: [1, 2], scale: [1, 2], rotate: [1, 3], skewX: [1, 1], skewY: [1, 1], matrix: [6, 6],
}));

/**
 * A bounded transform list: only the six functions SVG defines, each with the number of
 * plain numeric arguments it takes, and no nesting — `[^()]*` cannot match another call.
 */
function isTransform(value: string): boolean {
  const pattern = /\s*([A-Za-z]+)\s*\(([^()]*)\)\s*,?\s*/y;
  let cursor = 0;
  let seen = 0;
  while (cursor < value.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(value);
    if (match === null || pattern.lastIndex === cursor) return false;
    const arity = TRANSFORM_ARITY.get(match[1] ?? "");
    if (arity === undefined) return false;
    const args = parts(match[2] ?? "");
    if (args.length < (arity[0] ?? 0) || args.length > (arity[1] ?? 0)) return false;
    if (!args.every(isNumber)) return false;
    if ((seen += 1) > MAX_TRANSFORMS) return false;
    cursor = pattern.lastIndex;
  }
  return seen > 0;
}

const ASPECT_ALIGNMENTS = new Set([
  "none", "xMinYMin", "xMidYMin", "xMaxYMin", "xMinYMid", "xMidYMid", "xMaxYMid",
  "xMinYMax", "xMidYMax", "xMaxYMax",
]);

function isPreserveAspectRatio(value: string): boolean {
  const words = parts(value);
  let index = 0;
  if (words[index] === "defer") index += 1;
  const alignment = words[index];
  if (alignment === undefined || !ASPECT_ALIGNMENTS.has(alignment)) return false;
  index += 1;
  const meetOrSlice = words[index];
  if (meetOrSlice !== undefined && meetOrSlice !== "meet" && meetOrSlice !== "slice") return false;
  return words.length <= index + 1;
}

function isIdentifier(value: string): boolean {
  return value.length <= MAX_IDENTIFIER_LENGTH && IDENTIFIER.test(value);
}

const BASELINES = keywords(
  "auto", "baseline", "before-edge", "text-before-edge", "middle", "central", "after-edge",
  "text-after-edge", "ideographic", "alphabetic", "hanging", "mathematical", "top", "center",
  "bottom", "text-top", "text-bottom", "inherit",
);

/**
 * Every attribute that may be carried across, with the grammar its value must satisfy.
 *
 * Lower case: matching lower-cases first. `font-family` is deliberately absent — a font name
 * is a free-form string with quoting rules of its own, and the diagram's typography is owned
 * by this product's stylesheet rather than by the engine's output.
 */
const ALLOWED_ATTRIBUTES = new Map<string, Validator>([
  ["id", isIdentifier],
  ["class", value => value.length <= MAX_IDENTIFIER_LENGTH && CLASS_LIST.test(value)],
  ["xmlns", value => value === SVG_NAMESPACE],
  ["viewbox", value => isList(isNumber, value, 4)],
  ["preserveaspectratio", isPreserveAspectRatio],
  ["transform", isTransform],
  ["gradienttransform", isTransform],
  ["d", value => PATH_DATA.test(value)],
  ["points", value => isList(isNumber, value)],

  ["x", isLength], ["y", isLength], ["x1", isLength], ["y1", isLength],
  ["x2", isLength], ["y2", isLength], ["cx", isLength], ["cy", isLength],
  ["r", isLength], ["width", isLength], ["height", isLength],
  ["rx", value => value.toLowerCase() === "auto" || isLength(value)],
  ["ry", value => value.toLowerCase() === "auto" || isLength(value)],
  ["dx", value => isList(isLength, value)],
  ["dy", value => isList(isLength, value)],
  ["refx", isLength], ["refy", isLength],
  ["markerwidth", isLength], ["markerheight", isLength],
  ["offset", isOpacity],

  ["fill", isPaint],
  ["stroke", isPaint],
  ["stop-color", isColour],
  ["fill-opacity", isOpacity],
  ["stroke-opacity", isOpacity],
  ["stop-opacity", isOpacity],
  ["opacity", isOpacity],
  ["fill-rule", keywords("nonzero", "evenodd", "inherit")],
  ["stroke-width", isLength],
  ["stroke-dashoffset", isLength],
  ["stroke-dasharray", value => value.toLowerCase() === "none" || isList(isLength, value)],
  ["stroke-linecap", keywords("butt", "round", "square", "inherit")],
  ["stroke-linejoin", keywords("miter", "miter-clip", "round", "bevel", "arcs", "inherit")],
  ["stroke-miterlimit", bounded(1, MAX_MAGNITUDE)],
  ["visibility", keywords("visible", "hidden", "collapse", "inherit")],
  ["font-size", isLength],
  ["font-weight", keywords("normal", "bold", "bolder", "lighter", "inherit", "100", "200", "300", "400", "500", "600", "700", "800", "900")],
  ["font-style", keywords("normal", "italic", "oblique", "inherit")],
  ["letter-spacing", value => value.toLowerCase() === "normal" || isLength(value)],
  ["text-anchor", keywords("start", "middle", "end", "inherit")],
  ["dominant-baseline", BASELINES],
  ["alignment-baseline", BASELINES],
  ["white-space", keywords("normal", "pre", "nowrap", "pre-wrap", "pre-line", "break-spaces")],

  ["marker-start", isLocalReferenceOrNone],
  ["marker-mid", isLocalReferenceOrNone],
  ["marker-end", isLocalReferenceOrNone],
  ["clip-path", isLocalReferenceOrNone],
  ["mask", isLocalReferenceOrNone],

  ["orient", value => value === "auto" || value === "auto-start-reverse" || (ANGLE.test(value) && withinMagnitude(value.replace(/deg|grad|rad|turn/g, "")))],
  ["markerunits", keywords("strokeWidth", "userSpaceOnUse")],
  ["gradientunits", keywords("userSpaceOnUse", "objectBoundingBox")],
  ["patternunits", keywords("userSpaceOnUse", "objectBoundingBox")],
  ["clippathunits", keywords("userSpaceOnUse", "objectBoundingBox")],
  ["maskunits", keywords("userSpaceOnUse", "objectBoundingBox")],
  ["spreadmethod", keywords("pad", "reflect", "repeat")],
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

/**
 * Style properties that may be carried across from a `style` attribute.
 *
 * Each is also an attribute name above and is validated by the same grammar, so a value has
 * one meaning whichever way the engine chose to write it.
 */
const ALLOWED_STYLE_PROPERTIES = new Set([
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray",
  "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-weight",
  "font-style", "letter-spacing", "text-anchor", "dominant-baseline", "visibility",
]);

/**
 * Whether `value` is a recognised value for `name`.
 *
 * The character gate runs first so that no grammar below ever sees an escape or a comment;
 * the grammar then has to positively recognise what remains.
 */
function isAllowedValue(name: string, value: string): boolean {
  const check = ALLOWED_ATTRIBUTES.get(name);
  if (check === undefined) return false;
  if (value.length === 0 || value.length > MAX_VALUE_LENGTH) return false;
  if (!VALUE_CHARSET.test(value)) return false;
  return check(value);
}

function sanitizeStyle(raw: string, dropped: string[], tag: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const declaration of raw.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!ALLOWED_STYLE_PROPERTIES.has(property) || !isAllowedValue(property, value)) {
      if (property.length > 0) dropped.push(`${tag}{${property}}`);
      continue;
    }
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
 * Every hard bound fails closed. Exceeding one returns a reason and no tree, because a
 * truncated picture is a picture that quietly says something other than what its author
 * wrote — the Reader shows the authored source instead, which is always true.
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
  // A bound that is exceeded is recorded here and abandons the whole walk; the first entry
  // is the reason the caller is given.
  const refused: string[] = [];
  let nodes = 0;

  const walk = (element: Element, depth: number): SafeSvgNode | null => {
    if (refused.length > 0) return null;
    if (depth > limits.maxDepth) { refused.push("diagram is nested too deeply to display"); return null; }
    if ((nodes += 1) > limits.maxNodes) { refused.push("diagram has too many parts to display"); return null; }

    // `localName` is already lower-cased by the parser and, unlike `tagName`, ignores any
    // namespace prefix an attacker could put in front of a name to disguise it.
    const tag = element.localName;
    if (!ALLOWED_TAGS.has(tag)) { dropped.push(tag); return null; }
    if (element.attributes.length > limits.maxAttributes) {
      refused.push("diagram carries more attributes than this Reader accepts");
      return null;
    }

    const attrs: Record<string, string> = {};
    let style: Record<string, string> = {};
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase();
      if (name === "style") { style = sanitizeStyle(attribute.value, dropped, tag); continue; }
      // Every event handler, every `href` in any namespace, and anything whose value is not
      // a recognised value for its own property is dropped rather than repaired.
      if (!isAllowedValue(name, attribute.value.trim())) {
        dropped.push(`${tag}@${name}`);
        continue;
      }
      attrs[CANONICAL_CASE.get(name) ?? name] = attribute.value.trim();
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
      if (refused.length > 0) return null;
      if (safe) children.push(safe);
    }
    return { kind: "element", tag, attrs, style, children };
  };

  const safe = walk(root, 0);
  const refusal = refused[0];
  if (refusal !== undefined) return { ok: false, reason: refusal };
  if (!safe) return { ok: false, reason: "diagram could not be shown safely" };
  return { ok: true, root: safe, dropped };
}
